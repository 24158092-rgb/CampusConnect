// All reads and writes that touch more than one seed array live here, so the
// rules (who may do what, and how seat counts move) are enforced in one
// place. Pages and server actions call these; they never mutate the arrays
// directly.

import { AppUser } from './auth'
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
  Registration,
  findActiveRegistration,
  registrations,
} from './registrations'

export type Result<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: EventFieldErrors }

function fail(error: string, fieldErrors?: EventFieldErrors) {
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
    const n = Number(id.slice(prefix.length + 1))
    return Number.isInteger(n) && n > max ? n : max
  }, 0)
}
const shared = globalThis as typeof globalThis & {
  __campusIdSeq?: { evt: number; reg: number }
}
const idSeq = (shared.__campusIdSeq ??= {
  evt: highestSeq('evt', events.map((e) => e.id)),
  reg: highestSeq('reg', registrations.map((r) => r.id)),
})

function nextId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** Events on the public board: not past and not cancelled. */
export function listUpcomingEvents(): CampusEvent[] {
  return events.filter(isUpcomingEvent)
}

/** Cancelled events are hidden from everyone except organizers. */
export function canViewEvent(user: AppUser | null, event: CampusEvent): boolean {
  return !event.cancelled || user?.role === 'organizer'
}

export function listEventsForOrganizer(organizerId: string): CampusEvent[] {
  return events.filter((e) => e.organizerId === organizerId)
}

export interface StudentRegistration {
  registration: Registration
  event: CampusEvent
}

/**
 * The student's active registrations, split into upcoming and past.
 * Cancelled registrations, and registrations for cancelled or deleted
 * events, are left out.
 */
export function getStudentRegistrations(studentId: string): {
  upcoming: StudentRegistration[]
  past: StudentRegistration[]
} {
  const entries: StudentRegistration[] = []
  for (const registration of registrations) {
    if (registration.studentId !== studentId) continue
    if (registration.status !== 'confirmed') continue
    const event = getEventById(registration.eventId)
    if (!event || event.cancelled) continue
    entries.push({ registration, event })
  }
  const time = (entry: StudentRegistration) =>
    new Date(entry.event.date).getTime()
  return {
    upcoming: entries
      .filter((entry) => !isPastEvent(entry.event))
      .sort((a, b) => time(a) - time(b)),
    past: entries
      .filter((entry) => isPastEvent(entry.event))
      .sort((a, b) => time(b) - time(a)),
  }
}

/* ------------------------------------------------------------------ */
/* Registration (Task 2) and cancellation (Task 3)                     */
/* ------------------------------------------------------------------ */

export function registerForEvent(
  user: AppUser | null,
  eventId: string,
): Result<Registration> {
  if (!user) return fail('Please sign in to register for events.')
  if (user.role !== 'student') {
    return fail('Only student accounts can register for events.')
  }

  const event = getEventById(eventId)
  if (!event) return fail("This event doesn't exist.")
  if (event.cancelled) return fail('This event has been cancelled.')
  if (isPastEvent(event)) return fail('This event has already taken place.')
  if (findActiveRegistration(user.id, event.id)) {
    return fail("You're already registered for this event.")
  }
  if (isFullEvent(event)) return fail('Sorry, this event is full.')

  // A student who cancelled earlier gets their old record back rather than
  // a second one, so there is never more than one registration per
  // student per event.
  let registration = registrations.find(
    (reg) => reg.studentId === user.id && reg.eventId === event.id,
  )
  if (registration) {
    registration.status = 'confirmed'
    registration.registeredAt = new Date().toISOString()
  } else {
    registration = {
      id: nextId('reg', ++idSeq.reg),
      eventId: event.id,
      studentId: user.id,
      status: 'confirmed',
      registeredAt: new Date().toISOString(),
    }
    registrations.push(registration)
  }
  event.seatsAvailable -= 1

  return succeed(registration, `You're registered for ${event.name}.`)
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
  if (event) releaseSeat(event)

  return succeed(
    registration,
    event
      ? `Your registration for ${event.name} was cancelled.`
      : 'Your registration was cancelled.',
  )
}

function releaseSeat(event: CampusEvent) {
  event.seatsAvailable = Math.min(event.capacity, event.seatsAvailable + 1)
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
): { ok: true; value: EventInput } | { ok: false; fieldErrors: EventFieldErrors } {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const fieldErrors: EventFieldErrors = {}

  const name = text(raw.name)
  if (!name) fieldErrors.name = 'Give the event a name.'
  else if (name.length < 3) fieldErrors.name = 'Name must be at least 3 characters.'
  else if (name.length > 100) fieldErrors.name = 'Name must be 100 characters or fewer.'

  const description = text(raw.description)
  if (description.length > 1000) {
    fieldErrors.description = 'Description must be 1000 characters or fewer.'
  }

  let date = text(raw.date)
  if (!date) {
    fieldErrors.date = 'Pick a date and time.'
  } else if (!DATE_PATTERN.test(date) || Number.isNaN(new Date(date).getTime())) {
    fieldErrors.date = "That date isn't valid."
  } else {
    if (date.length === 16) date += ':00'
    if (new Date(date).getTime() <= TODAY.getTime()) {
      fieldErrors.date = 'The event must be scheduled in the future.'
    }
  }

  const venue = text(raw.venue)
  if (!venue) fieldErrors.venue = 'Tell students where it is.'
  else if (venue.length < 2) fieldErrors.venue = 'Venue must be at least 2 characters.'
  else if (venue.length > 120) fieldErrors.venue = 'Venue must be 120 characters or fewer.'

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
  if (user.role !== 'organizer') return fail('Only organizers can manage events.')
  const event = getEventById(eventId)
  if (!event) return fail("This event doesn't exist.")
  if (event.organizerId !== user.id) {
    return fail('You can only manage events you organize.')
  }
  return succeed(event, '')
}

const INVALID_FORM = 'Please fix the highlighted fields.'

export function createEvent(
  user: AppUser | null,
  raw: Partial<Record<keyof EventInput, unknown>>,
): Result<CampusEvent> {
  if (!user) return fail('Please sign in as an organizer.')
  if (user.role !== 'organizer') return fail('Only organizers can create events.')

  const input = validateEventInput(raw)
  if (!input.ok) return fail(INVALID_FORM, input.fieldErrors)

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

  // Keep the seats that are already taken; only the free seats move.
  const taken = getSeatsTaken(event)
  if (input.value.capacity < taken) {
    return fail(INVALID_FORM, {
      capacity: `${taken} seats are already taken, so capacity can't be lower than that.`,
    })
  }

  Object.assign(event, input.value)
  event.seatsAvailable = input.value.capacity - taken
  return succeed(event, `${event.name} was updated.`)
}

/**
 * Marks the event cancelled and cancels its registrations, which frees
 * their seats. The event stays in the store so the organizer keeps a record.
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
  for (const registration of registrations) {
    if (registration.eventId === event.id && registration.status === 'confirmed') {
      registration.status = 'cancelled'
      releaseSeat(event)
    }
  }
  return succeed(event, `${event.name} was cancelled.`)
}

/** Removes the event and all of its registrations from the store. */
export function deleteEvent(
  user: AppUser | null,
  eventId: string,
): Result<CampusEvent> {
  const owned = getOwnedEvent(user, eventId)
  if (!owned.ok) return owned
  const event = owned.data

  events.splice(events.indexOf(event), 1)
  for (let i = registrations.length - 1; i >= 0; i--) {
    if (registrations[i].eventId === event.id) registrations.splice(i, 1)
  }
  return succeed(event, `${event.name} was deleted.`)
}
