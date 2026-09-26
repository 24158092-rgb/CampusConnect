// All reads and writes that touch more than one seed array live here, so the
// rules (who may do what, and how seat counts move) are enforced in one
// place. Pages and server actions call these; they never mutate the arrays
// directly.

import { AppUser, users } from './auth'
import {
  CampusEvent,
  EVENT_CATEGORIES,
  EventCategory,
  TODAY,
  events,
  getEventById,
  getSeatsTaken,
  isFullEvent,
  isPastEvent,
  isUpcomingEvent,
} from './events'
import {
  Participant,
  Registration,
  RegistrationMode,
  findActiveRegistration,
  registrations,
  seatCount,
} from './registrations'
import {
  IDENTITY_FIELDS,
  IDENTITY_LABELS,
  PersonErrors,
  PersonField,
  sharedIdentity,
  validatePerson,
} from './people'
import {
  AppNotification,
  addAnnouncement,
  countUnread,
  listNotifications,
  notify,
} from './notifications'

export type Result<T, E = EventFieldErrors> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: E }

function fail<E = EventFieldErrors>(error: string, fieldErrors?: E) {
  return { ok: false as const, error, fieldErrors }
}

function succeed<T>(data: T, message: string) {
  return { ok: true as const, data, message }
}

// Ids keep counting up from the highest id ever issued, so an id is never
// reused after something is deleted. Shared via globalThis for the same
// reason as the seed arrays.
function highestSeq(prefix: string, ids: string[]): number {
  return ids.reduce((max, id) => {
    if (!id.startsWith(`${prefix}-`)) return max
    const n = Number(id.slice(prefix.length + 1))
    return Number.isInteger(n) && n > max ? n : max
  }, 0)
}
const shared = globalThis as typeof globalThis & {
  __campusIdSeq?: { evt: number; reg: number; stu?: number }
}
const idSeq = (shared.__campusIdSeq ??= {
  evt: highestSeq(
    'evt',
    events.map((e) => e.id),
  ),
  reg: highestSeq(
    'reg',
    registrations.map((r) => r.id),
  ),
})
idSeq.stu ??= highestSeq(
  'stu',
  users.map((u) => u.id),
)

function nextId(prefix: string, seq: number, pad = 2): string {
  return `${prefix}-${String(seq).padStart(pad, '0')}`
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Events on the public board: not past and not cancelled. */
export function listUpcomingEvents(): CampusEvent[] {
  return events.filter(isUpcomingEvent)
}

/** Cancelled events are hidden from everyone except organizers. */
export function canViewEvent(
  user: AppUser | null,
  event: CampusEvent,
): boolean {
  return !event.cancelled || user?.role === 'organizer'
}

export function listEventsForOrganizer(organizerId: string): CampusEvent[] {
  return events.filter((e) => e.organizerId === organizerId)
}

export interface StudentRegistration {
  registration: Registration
  event: CampusEvent
}

export interface CancelledRegistration extends StudentRegistration {
  /** True when the event is still open, so the student can sign up again. */
  canRegisterAgain: boolean
}

/**
 * Everything My Registrations shows for a student:
 * - upcoming / past: active registrations for events that still run
 * - cancelled: registrations the student cancelled themselves
 * - cancelledByOrganizer: registrations ended because the organizer
 *   cancelled the event, with the notice the student was sent
 */
export function getStudentRegistrations(studentId: string): {
  upcoming: StudentRegistration[]
  past: StudentRegistration[]
  cancelled: CancelledRegistration[]
  cancelledByOrganizer: Registration[]
} {
  const active: StudentRegistration[] = []
  const cancelled: CancelledRegistration[] = []
  const cancelledByOrganizer: Registration[] = []
  for (const registration of registrations) {
    if (registration.studentId !== studentId) continue
    if (
      registration.status === 'cancelled' &&
      registration.cancelledBy === 'organizer'
    ) {
      cancelledByOrganizer.push(registration)
      continue
    }
    const event = getEventById(registration.eventId)
    if (!event || event.cancelled) continue
    if (registration.status === 'confirmed') {
      active.push({ registration, event })
    } else {
      cancelled.push({
        registration,
        event,
        canRegisterAgain: isUpcomingEvent(event),
      })
    }
  }
  const time = (entry: StudentRegistration) =>
    new Date(entry.event.date).getTime()
  const newest = (a?: string, b?: string) =>
    new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime()
  return {
    upcoming: active
      .filter((entry) => !isPastEvent(entry.event))
      .sort((a, b) => time(a) - time(b)),
    past: active
      .filter((entry) => isPastEvent(entry.event))
      .sort((a, b) => time(b) - time(a)),
    cancelled: cancelled.sort((a, b) =>
      newest(a.registration.cancelledAt, b.registration.cancelledAt),
    ),
    cancelledByOrganizer: cancelledByOrganizer.sort((a, b) =>
      newest(a.cancelledAt, b.cancelledAt),
    ),
  }
}

/** The student's registration that ended because the organizer cancelled. */
export function findOrganizerCancelledRegistration(
  studentId: string,
  eventId: string,
): Registration | undefined {
  return registrations.find(
    (reg) =>
      reg.studentId === studentId &&
      reg.eventId === eventId &&
      reg.cancelledBy === 'organizer',
  )
}

/** Active registrations for an event, for the organizer who owns it. */
export function listEventRegistrations(
  user: AppUser | null,
  eventId: string,
): Registration[] {
  const owned = getOwnedEvent(user, eventId)
  if (!owned.ok) return []
  return registrations.filter(
    (reg) => reg.eventId === eventId && reg.status === 'confirmed',
  )
}

/* ------------------------------------------------------------------ */
/* Registration (Task 2) and cancellation (Task 3)                     */
/* ------------------------------------------------------------------ */

export const MIN_GROUP_SIZE = 2
export const MAX_GROUP_SIZE = 4

export interface RegistrationInput {
  mode?: unknown
  groupName?: unknown
  memberCount?: unknown
  leaderIndex?: unknown
  members?: Partial<Record<PersonField, unknown>>[]
}

export interface RegistrationErrors {
  mode?: string
  groupName?: string
  memberCount?: string
  leader?: string
  /** Index-aligned with the submitted members. */
  members?: PersonErrors[]
}

const GROUP_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]*$/

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function validateGroupName(raw: unknown): { name: string; error?: string } {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''
  if (!name) return { name, error: 'Choose a group name.' }
  if (name.length < 3 || name.length > 30) {
    return { name, error: 'Group name must be 3–30 characters.' }
  }
  if (!GROUP_NAME_PATTERN.test(name)) {
    return {
      name,
      error: 'Use letters, numbers, spaces, hyphens or underscores.',
    }
  }
  return { name }
}

/** The active group on this event already using `name`, if any. */
function findGroupByName(
  eventId: string,
  name: string,
): Registration | undefined {
  const key = normalizeKey(name)
  return registrations.find(
    (reg) =>
      reg.eventId === eventId &&
      reg.status === 'confirmed' &&
      reg.mode === 'group' &&
      !!reg.groupName &&
      normalizeKey(reg.groupName) === key,
  )
}

/**
 * Live check for the registration form. Returns an error message, or null
 * when the name is valid and free on this event.
 */
export function checkGroupName(eventId: string, raw: unknown): string | null {
  const { name, error } = validateGroupName(raw)
  if (error) return error
  if (findGroupByName(eventId, name)) {
    return `"${name}" is already taken for this event. Try another name.`
  }
  return null
}

function hasErrors(errors: RegistrationErrors): boolean {
  return (
    Object.entries(errors).some(([key, value]) => key !== 'members' && value) ||
    !!errors.members?.some((m) => m && Object.keys(m).length > 0)
  )
}

function memberError(
  errors: RegistrationErrors,
  index: number,
  field: PersonField,
  message: string,
) {
  errors.members ??= []
  errors.members[index] ??= {}
  errors.members[index][field] ??= message
}

export function registerForEvent(
  user: AppUser | null,
  eventId: string,
  input: RegistrationInput,
): Result<Registration, RegistrationErrors> {
  if (!user) return fail('Please sign in to register for events.')
  if (user.role !== 'student') {
    return fail('Only student accounts can register for events.')
  }

  const event = getEventById(eventId)
  if (!event) return fail("This event doesn't exist.")
  if (event.cancelled) {
    return fail(
      'This event has been cancelled by the organizer. Registration is no longer possible.',
    )
  }
  if (isPastEvent(event)) return fail('This event has already taken place.')
  if (findActiveRegistration(user.id, event.id)) {
    return fail("You're already registered for this event.")
  }
  if (isFullEvent(event)) return fail('Sorry, this event is full.')

  // --- shape of the form ---
  const errors: RegistrationErrors = {}
  const mode = input.mode
  if (mode !== 'individual' && mode !== 'group') {
    return fail(
      'Choose whether you are registering as an individual or a group.',
      {
        mode: 'Pick individual or group.',
      },
    )
  }

  let count = 1
  let groupName: string | undefined
  if (mode === 'group') {
    count = Number(input.memberCount)
    if (
      !Number.isInteger(count) ||
      count < MIN_GROUP_SIZE ||
      count > MAX_GROUP_SIZE
    ) {
      return fail(INVALID_FORM, {
        memberCount: `A group has ${MIN_GROUP_SIZE} to ${MAX_GROUP_SIZE} members.`,
      })
    }
    const group = validateGroupName(input.groupName)
    groupName = group.name
    if (group.error) errors.groupName = group.error
  }

  // An empty or missing value is "no leader chosen", not index 0.
  const leaderRaw = input.leaderIndex
  const leaderIndex =
    mode !== 'group'
      ? 0
      : typeof leaderRaw === 'number'
        ? leaderRaw
        : typeof leaderRaw === 'string' && leaderRaw.trim() !== ''
          ? Number(leaderRaw)
          : NaN
  if (
    mode === 'group' &&
    !(Number.isInteger(leaderIndex) && leaderIndex >= 0 && leaderIndex < count)
  ) {
    errors.leader = 'Choose a team leader.'
  }

  // --- each member's details ---
  const members: Participant[] = []
  for (let i = 0; i < count; i++) {
    const result = validatePerson(input.members?.[i] ?? {})
    if (result.ok) {
      members.push({ ...result.value, isLeader: i === leaderIndex })
    } else {
      errors.members ??= []
      errors.members[i] = result.errors
    }
  }
  if (hasErrors(errors)) return fail(INVALID_FORM, errors)

  // --- nobody may appear twice in one registration ---
  for (let j = 1; j < members.length; j++) {
    for (let i = 0; i < j; i++) {
      const field = sharedIdentity(members[i], members[j])
      if (field) {
        memberError(
          errors,
          j,
          field,
          `Same ${IDENTITY_LABELS[field]} as member ${i + 1}.`,
        )
      }
    }
  }
  if (hasErrors(errors)) return fail(INVALID_FORM, errors)

  // --- the account holder must be one of the people registering ---
  const ownRoll = user.profile?.rollNumber
  if (ownRoll && !members.some((m) => m.rollNumber === ownRoll)) {
    return fail(
      `Your own roll number (${ownRoll}) must be one of the members.`,
      {
        members: [{ rollNumber: `Should be your roll number, ${ownRoll}.` }],
      },
    )
  }

  // --- the group name must be free on this event ---
  if (groupName && findGroupByName(event.id, groupName)) {
    return fail(INVALID_FORM, {
      groupName: `"${groupName}" is already taken for this event. Try another name.`,
    })
  }

  // --- nobody may already be registered for this event by someone else ---
  for (const other of registrations) {
    if (other.eventId !== event.id || other.status !== 'confirmed') continue
    for (const existing of other.members ?? []) {
      members.forEach((member, index) => {
        const field = sharedIdentity(member, existing)
        if (field) {
          memberError(
            errors,
            index,
            field,
            `This ${IDENTITY_LABELS[field]} is already registered for this event.`,
          )
        }
      })
    }
  }
  if (hasErrors(errors)) {
    return fail('Some members are already registered for this event.', errors)
  }

  // --- enough seats for everyone ---
  if (count > event.seatsAvailable) {
    const left = event.seatsAvailable
    return fail(
      `Only ${left} seat${left === 1 ? '' : 's'} left, but this registration needs ${count}.`,
      { memberCount: `Only ${left} seat${left === 1 ? '' : 's'} left.` },
    )
  }

  // A student who cancelled earlier gets their old record back rather than
  // a second one, so there is never more than one registration per
  // student per event.
  let registration = registrations.find(
    (reg) => reg.studentId === user.id && reg.eventId === event.id,
  )
  const details = {
    status: 'confirmed' as const,
    registeredAt: new Date().toISOString(),
    mode: mode as RegistrationMode,
    groupName,
    members,
    cancelledBy: undefined,
    cancelledAt: undefined,
    notice: undefined,
  }
  if (registration) {
    Object.assign(registration, details)
  } else {
    registration = {
      id: nextId('reg', ++idSeq.reg),
      eventId: event.id,
      studentId: user.id,
      ...details,
    }
    registrations.push(registration)
  }
  event.seatsAvailable -= count
  notifyRegistered(registration, event, user)

  return succeed(
    registration,
    mode === 'group'
      ? `Team "${groupName}" (${count} members) is registered for ${event.name}.`
      : `You're registered for ${event.name}.`,
  )
}

export function cancelRegistration(
  user: AppUser | null,
  registrationId: string,
): Result<Registration> {
  if (!user) return fail('Please sign in to manage your registrations.')

  const registration = registrations.find((reg) => reg.id === registrationId)
  if (!registration || registration.studentId !== user.id) {
    return fail("We couldn't find that registration.")
  }
  // Without this check a second click would hand the seat back twice.
  if (registration.status === 'cancelled') {
    return fail('This registration is already cancelled.')
  }

  const event = getEventById(registration.eventId)
  if (event && isPastEvent(event)) {
    return fail("This event has already happened, so it can't be cancelled.")
  }

  registration.status = 'cancelled'
  registration.cancelledBy = 'student'
  registration.cancelledAt = new Date().toISOString()
  if (event) {
    releaseSeats(event, seatCount(registration))
    for (const userId of recipientsFor(registration)) {
      notify(userId, {
        type: 'registration-cancelled',
        title: 'Registration cancelled',
        message:
          registration.mode === 'group'
            ? `Team "${registration.groupName}" is no longer registered for ${event.name}. You can register again while the event is open.`
            : `You cancelled your registration for ${event.name}. You can register again while the event is open.`,
        eventId: event.id,
      })
    }
  }

  return succeed(
    registration,
    event
      ? `Your registration for ${event.name} was cancelled.`
      : 'Your registration was cancelled.',
  )
}

function releaseSeats(event: CampusEvent, count: number) {
  event.seatsAvailable = Math.min(event.capacity, event.seatsAvailable + count)
}

/* ------------------------------------------------------------------ */
/* Organizer management (Task 4)                                       */
/* ------------------------------------------------------------------ */

export interface EventInput {
  name: string
  description: string
  date: string
  venue: string
  category: EventCategory
  capacity: number
}

export type EventFieldErrors = Partial<Record<keyof EventInput, string>>

export const MAX_CAPACITY = 10000

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

/**
 * Validates raw form values. Dates use the same local "YYYY-MM-DDTHH:mm"
 * format as the seed data and must be after TODAY.
 */
export function validateEventInput(
  raw: Partial<Record<keyof EventInput, unknown>>,
):
  | { ok: true; value: EventInput }
  | { ok: false; fieldErrors: EventFieldErrors } {
  const text = (value: unknown) =>
    typeof value === 'string' ? value.trim() : ''
  const fieldErrors: EventFieldErrors = {}

  const name = text(raw.name)
  if (!name) fieldErrors.name = 'Give the event a name.'
  else if (name.length < 3)
    fieldErrors.name = 'Name must be at least 3 characters.'
  else if (name.length > 100)
    fieldErrors.name = 'Name must be 100 characters or fewer.'

  const description = text(raw.description)
  if (description.length > 1000) {
    fieldErrors.description = 'Description must be 1000 characters or fewer.'
  }

  let date = text(raw.date)
  if (!date) {
    fieldErrors.date = 'Pick a date and time.'
  } else if (
    !DATE_PATTERN.test(date) ||
    Number.isNaN(new Date(date).getTime())
  ) {
    fieldErrors.date = "That date isn't valid."
  } else {
    if (date.length === 16) date += ':00'
    if (new Date(date).getTime() <= TODAY.getTime()) {
      fieldErrors.date = 'The event must be scheduled in the future.'
    }
  }

  const venue = text(raw.venue)
  if (!venue) fieldErrors.venue = 'Tell students where it is.'
  else if (venue.length < 2)
    fieldErrors.venue = 'Venue must be at least 2 characters.'
  else if (venue.length > 120)
    fieldErrors.venue = 'Venue must be 120 characters or fewer.'

  const category = text(raw.category)
  if (!(EVENT_CATEGORIES as readonly string[]).includes(category)) {
    fieldErrors.category = 'Pick a category.'
  }

  const capacityText =
    typeof raw.capacity === 'number' ? String(raw.capacity) : text(raw.capacity)
  const capacity = Number(capacityText)
  if (!capacityText) fieldErrors.capacity = 'Set a capacity.'
  else if (!Number.isInteger(capacity) || capacity < 1) {
    fieldErrors.capacity = 'Capacity must be a whole number of at least 1.'
  } else if (capacity > MAX_CAPACITY) {
    fieldErrors.capacity = `Capacity can't be more than ${MAX_CAPACITY}.`
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  return {
    ok: true,
    value: {
      name,
      description,
      date,
      venue,
      category: category as EventCategory,
      capacity,
    },
  }
}

/** The event, if `user` is an organizer who owns it. */
export function getOwnedEvent(
  user: AppUser | null,
  eventId: string,
): Result<CampusEvent> {
  if (!user) return fail('Please sign in as an organizer.')
  if (user.role !== 'organizer')
    return fail('Only organizers can manage events.')
  const event = getEventById(eventId)
  if (!event) return fail("This event doesn't exist.")
  if (event.organizerId !== user.id) {
    return fail('You can only manage events you organize.')
  }
  return succeed(event, '')
}

const INVALID_FORM = 'Please fix the highlighted fields.'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  return `${formatDay(iso)}, ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * An upcoming, non-cancelled event with the same name (ignoring case and
 * extra spaces), from any organizer. Past editions don't count, so next
 * year's "Hack the Campus" can still be posted.
 */
export function findDuplicateEvent(
  name: string,
  excludeId?: string,
): CampusEvent | undefined {
  const key = normalizeKey(name)
  return events.find(
    (event) =>
      event.id !== excludeId &&
      isUpcomingEvent(event) &&
      normalizeKey(event.name) === key,
  )
}

function duplicateEventError(existing: CampusEvent) {
  const message = `"${existing.name}" is already listed for ${formatDay(existing.date)}. Edit that event instead of posting it again.`
  return fail(message, { name: 'An event with this name is already listed.' })
}

export function createEvent(
  user: AppUser | null,
  raw: Partial<Record<keyof EventInput, unknown>>,
): Result<CampusEvent> {
  if (!user) return fail('Please sign in as an organizer.')
  if (user.role !== 'organizer')
    return fail('Only organizers can create events.')

  const input = validateEventInput(raw)
  if (!input.ok) return fail(INVALID_FORM, input.fieldErrors)

  const duplicate = findDuplicateEvent(input.value.name)
  if (duplicate) return duplicateEventError(duplicate)

  const event: CampusEvent = {
    id: nextId('evt', ++idSeq.evt),
    ...input.value,
    seatsAvailable: input.value.capacity,
    organizerId: user.id,
    cancelled: false,
  }
  events.push(event)
  return succeed(event, `${event.name} is now on the board.`)
}

export function updateEvent(
  user: AppUser | null,
  eventId: string,
  raw: Partial<Record<keyof EventInput, unknown>>,
): Result<CampusEvent> {
  const owned = getOwnedEvent(user, eventId)
  if (!owned.ok) return owned
  const event = owned.data
  if (event.cancelled) return fail("Cancelled events can't be edited.")

  const input = validateEventInput(raw)
  if (!input.ok) return fail(INVALID_FORM, input.fieldErrors)

  const duplicate = findDuplicateEvent(input.value.name, event.id)
  if (duplicate) return duplicateEventError(duplicate)

  // Keep the seats that are already taken; only the free seats move.
  const taken = getSeatsTaken(event)
  if (input.value.capacity < taken) {
    return fail(INVALID_FORM, {
      capacity: `${taken} seats are already taken, so capacity can't be lower than that.`,
    })
  }

  const before = { date: event.date, venue: event.venue }
  Object.assign(event, input.value)
  event.seatsAvailable = input.value.capacity - taken

  const changes: string[] = []
  if (before.date !== event.date) {
    changes.push(
      `now on ${formatWhen(event.date)} (was ${formatWhen(before.date)})`,
    )
  }
  if (before.venue !== event.venue) {
    changes.push(`now at ${event.venue} (was ${before.venue})`)
  }
  let notified = 0
  if (changes.length > 0) {
    notified = notifyRegistrants(event, {
      type: 'reschedule',
      title: before.date !== event.date ? 'Event rescheduled' : 'Venue changed',
      message: `${event.name} is ${changes.join(' and ')}. Your registration still stands.`,
    })
  }
  return succeed(
    event,
    notified > 0
      ? `${event.name} was updated. ${notified} registered ${notified === 1 ? 'person was' : 'people were'} notified of the change.`
      : `${event.name} was updated.`,
  )
}

/**
 * Ends every active registration for an event the organizer is cancelling
 * or deleting, frees the seats, and leaves each student a notice.
 */
function cancelRegistrationsForEvent(event: CampusEvent) {
  const now = new Date().toISOString()
  for (const registration of registrations) {
    if (
      registration.eventId !== event.id ||
      registration.status !== 'confirmed'
    ) {
      continue
    }
    registration.status = 'cancelled'
    registration.cancelledBy = 'organizer'
    registration.cancelledAt = now
    registration.notice = `${event.name} (${formatDay(event.date)}, ${event.venue}) has been cancelled by the organizer. Your registration has been cancelled and registration is no longer possible.`
    releaseSeats(event, seatCount(registration))
    for (const userId of recipientsFor(registration)) {
      notify(userId, {
        type: 'cancellation',
        title: 'Event cancelled',
        message: registration.notice,
        eventId: event.id,
      })
    }
  }
}

/**
 * Marks the event cancelled and cancels its registrations, notifying each
 * registered student. The event stays in the store so the organizer keeps
 * a record.
 */
export function cancelEvent(
  user: AppUser | null,
  eventId: string,
): Result<CampusEvent> {
  const owned = getOwnedEvent(user, eventId)
  if (!owned.ok) return owned
  const event = owned.data
  if (event.cancelled) return fail('This event is already cancelled.')
  if (isPastEvent(event)) {
    return fail("This event has already happened, so it can't be cancelled.")
  }

  event.cancelled = true
  cancelRegistrationsForEvent(event)
  return succeed(event, `${event.name} was cancelled.`)
}

/**
 * Removes the event. Students still registered for it are notified first,
 * and those notices are kept; every other registration for it is removed.
 */
export function deleteEvent(
  user: AppUser | null,
  eventId: string,
): Result<CampusEvent> {
  const owned = getOwnedEvent(user, eventId)
  if (!owned.ok) return owned
  const event = owned.data

  if (!isPastEvent(event)) cancelRegistrationsForEvent(event)
  events.splice(events.indexOf(event), 1)
  for (let i = registrations.length - 1; i >= 0; i--) {
    const reg = registrations[i]
    if (reg.eventId === event.id && reg.cancelledBy !== 'organizer') {
      registrations.splice(i, 1)
    }
  }
  return succeed(event, `${event.name} was deleted.`)
}

/* ------------------------------------------------------------------ */
/* Student sign-up                                                     */
/* ------------------------------------------------------------------ */

/**
 * Creates a student account. Roll number, contact number and KIIT email
 * must each be unused by every existing account.
 */
export function signUpStudent(
  raw: Partial<Record<PersonField, unknown>>,
): Result<AppUser, PersonErrors> {
  const input = validatePerson(raw)
  if (!input.ok) return fail(INVALID_FORM, input.errors)
  const { name, ...profile } = input.value

  const errors: PersonErrors = {}
  let existing: AppUser | undefined
  for (const user of users) {
    if (!user.profile) continue
    for (const field of IDENTITY_FIELDS) {
      if (user.profile[field] === profile[field]) {
        errors[field] = `Already used by an existing account.`
        existing ??= user
      }
    }
  }
  if (existing) {
    const fields = IDENTITY_FIELDS.filter((f) => errors[f]).map(
      (f) => IDENTITY_LABELS[f],
    )
    return fail(
      `User already signed in: an account with this ${fields.join(', ')} already exists (${existing.name}). Pick it from the account menu at the top right.`,
      errors,
    )
  }

  const user: AppUser = {
    // Seeded students are "stu-1", so new ones follow as "stu-2", "stu-3"…
    id: nextId('stu', (idSeq.stu = (idSeq.stu ?? 0) + 1), 1),
    name,
    role: 'student',
    profile,
  }
  users.push(user)
  return succeed(
    user,
    `Welcome, ${name}! Your account is ready and you're signed in.`,
  )
}

/* ------------------------------------------------------------------ */
/* Notifications, reminders and announcements                          */
/* ------------------------------------------------------------------ */

/**
 * Accounts to notify about a registration: whoever submitted it, plus any
 * team member who has their own account (matched by roll number).
 */
export function recipientsFor(registration: Registration): string[] {
  const ids = new Set([registration.studentId])
  const rolls = new Set((registration.members ?? []).map((m) => m.rollNumber))
  for (const user of users) {
    if (user.profile && rolls.has(user.profile.rollNumber)) ids.add(user.id)
  }
  return [...ids]
}

/** Notifies everyone on the event's active registrations; returns how many. */
function notifyRegistrants(
  event: CampusEvent,
  input: Pick<AppNotification, 'type' | 'title' | 'message'>,
): number {
  const recipients = new Set<string>()
  for (const registration of registrations) {
    if (
      registration.eventId !== event.id ||
      registration.status !== 'confirmed'
    )
      continue
    for (const id of recipientsFor(registration)) recipients.add(id)
  }
  for (const userId of recipients)
    notify(userId, { ...input, eventId: event.id })
  return recipients.size
}

function notifyRegistered(
  registration: Registration,
  event: CampusEvent,
  submitter: AppUser,
) {
  const when = `${formatWhen(event.date)} at ${event.venue}`
  for (const userId of recipientsFor(registration)) {
    const isSubmitter = userId === submitter.id
    notify(userId, {
      type: 'registration',
      title: 'Registration confirmed',
      message:
        registration.mode === 'group'
          ? isSubmitter
            ? `Team "${registration.groupName}" (${seatCount(registration)} members) is registered for ${event.name} on ${when}.`
            : `${submitter.name} added you to team "${registration.groupName}" for ${event.name} on ${when}.`
          : `You're registered for ${event.name} on ${when}.`,
      eventId: event.id,
    })
  }
  notify(event.organizerId, {
    type: 'new-registration',
    title: 'New registration',
    message:
      registration.mode === 'group'
        ? `Team "${registration.groupName}" (${seatCount(registration)} seats) registered for ${event.name}. ${event.seatsAvailable} seats left.`
        : `${submitter.name} registered for ${event.name}. ${event.seatsAvailable} seats left.`,
    eventId: event.id,
  })
}

/** Reminders go out automatically for events starting within this many days. */
export const REMINDER_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days from TODAY until the event (0 = later today, 1 = tomorrow). */
export function daysUntil(event: CampusEvent): number {
  const start = new Date(event.date)
  const today = new Date(TODAY)
  const startDay = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  )
  const todayDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  return Math.round((startDay - todayDay) / DAY_MS)
}

/**
 * Sends a reminder for each upcoming registration (the user's own or a
 * team they're in) that starts within REMINDER_WINDOW_DAYS. Each
 * registration gets one reminder per scheduled date, so a rescheduled
 * event is reminded again.
 */
export function sendDueReminders(userId: string): number {
  const user = users.find((u) => u.id === userId)
  if (!user || user.role !== 'student') return 0
  let sent = 0
  for (const registration of registrations) {
    if (registration.status !== 'confirmed') continue
    if (!recipientsFor(registration).includes(userId)) continue
    const event = getEventById(registration.eventId)
    if (!event || !isUpcomingEvent(event)) continue
    const days = daysUntil(event)
    if (days < 0 || days > REMINDER_WINDOW_DAYS) continue
    const when =
      days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
    const created = notify(userId, {
      type: 'reminder',
      title: `Starts ${when}`,
      message: `Reminder: ${event.name} starts ${when}, ${formatWhen(event.date)} at ${event.venue}.`,
      eventId: event.id,
      key: `reminder:${registration.id}:${event.date}`,
    })
    if (created) sent++
  }
  return sent
}

/** The user's notifications, newest first, after sending any due reminders. */
export function getNotificationsFor(user: AppUser | null): AppNotification[] {
  if (!user) return []
  sendDueReminders(user.id)
  return listNotifications(user.id)
}

export interface NotificationStatus {
  unread: number
  /** Unread cancellations and changes, shown as a banner on every page. */
  alerts: Pick<AppNotification, 'id' | 'title' | 'message' | 'eventId'>[]
}

export function getNotificationStatus(
  user: AppUser | null,
): NotificationStatus {
  if (!user) return { unread: 0, alerts: [] }
  const all = getNotificationsFor(user)
  return {
    unread: countUnread(user.id),
    alerts: all
      .filter(
        (n) =>
          !n.read && (n.type === 'cancellation' || n.type === 'reschedule'),
      )
      .map(({ id, title, message, eventId }) => ({
        id,
        title,
        message,
        eventId,
      })),
  }
}

/** Posts an announcement on an event and notifies everyone registered. */
export function postAnnouncement(
  user: AppUser | null,
  eventId: string,
  raw: unknown,
): Result<{ notified: number }, { message?: string }> {
  const owned = getOwnedEvent(user, eventId)
  if (!owned.ok) return fail(owned.error)
  const event = owned.data
  if (event.cancelled)
    return fail("You can't post announcements on a cancelled event.")
  if (isPastEvent(event)) return fail('This event has already happened.')

  const message = typeof raw === 'string' ? raw.trim() : ''
  if (message.length < 5) {
    return fail(INVALID_FORM, { message: 'Write at least 5 characters.' })
  }
  if (message.length > 500) {
    return fail(INVALID_FORM, {
      message: 'Keep it to 500 characters or fewer.',
    })
  }

  addAnnouncement(event.id, event.organizerId, message)
  const notified = notifyRegistrants(event, {
    type: 'announcement',
    title: `Announcement: ${event.name}`,
    message,
  })
  return succeed(
    { notified },
    notified > 0
      ? `Announcement posted. ${notified} registered ${notified === 1 ? 'person was' : 'people were'} notified.`
      : 'Announcement posted. Nobody is registered yet, so no one was notified.',
  )
}
