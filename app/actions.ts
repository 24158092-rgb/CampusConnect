'use server'

// Server actions run inside the page's own server instance, so a write and
// the re-render that follows it always see the same in-memory store.

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getUserById } from '@/data/auth'
import { getEventById } from '@/data/events'
import { markAllRead, markRead } from '@/data/notifications'
import {
  EventFieldErrors,
  EventInput,
  MAX_GROUP_SIZE,
  RegistrationErrors,
  cancelEvent,
  cancelRegistration,
  checkGroupName,
  createEvent,
  deleteEvent,
  NotificationStatus,
  getNotificationStatus,
  postAnnouncement,
  registerForEvent,
  signUpStudent,
  updateEvent,
} from '@/data/store'
import { PERSON_FIELDS, PersonErrors } from '@/data/people'
import {
  clearSessionCookie,
  getSessionUser,
  setSessionCookie,
} from '@/lib/session'
import {
  clearAttempts,
  isCorrectOrganizerCode,
  lockoutMinutesLeft,
  recordFailedAttempt,
} from '@/lib/organizer'

export interface ActionState<E = EventFieldErrors> {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors?: E
}

function refreshEverything() {
  revalidatePath('/', 'layout')
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/** Identifies the caller for the organizer-code lockout. */
function clientKey(): string {
  const forwarded = headers().get('x-forwarded-for')
  return (
    forwarded?.split(',')[0].trim() || headers().get('x-real-ip') || 'local'
  )
}

export type SwitchResult = { ok: true } | { ok: false; error: string }

/**
 * Mock login: switch to the picked account, or sign out when id is empty.
 * Organizer accounts also need the shared organizer access code, so a
 * student can't give themselves organizer privileges.
 */
export async function switchUser(
  userId: string,
  organizerCode = '',
): Promise<SwitchResult> {
  if (!userId) {
    clearSessionCookie()
    refreshEverything()
    return { ok: true }
  }
  const target = getUserById(userId)
  if (!target) return { ok: false, error: 'That account no longer exists.' }

  if (target.role === 'organizer') {
    const client = clientKey()
    const wait = lockoutMinutesLeft(client)
    if (wait > 0) {
      return {
        ok: false,
        error: `Too many incorrect codes. Try again in ${wait} minute${wait === 1 ? '' : 's'}.`,
      }
    }
    if (!organizerCode.trim()) {
      return { ok: false, error: 'Enter the organizer access code.' }
    }
    if (!isCorrectOrganizerCode(organizerCode)) {
      const left = recordFailedAttempt(client)
      return {
        ok: false,
        error:
          left > 0
            ? `Incorrect organizer code. You can't sign in as an organizer without it. ${left} attempt${left === 1 ? '' : 's'} left.`
            : 'Incorrect organizer code. Too many attempts — try again in 10 minutes.',
      }
    }
    clearAttempts(client)
  }

  setSessionCookie(target.id)
  refreshEverything()
  return { ok: true }
}

/** Reads the registration form: fields are named `members.<index>.<field>`. */
export async function registerAction(
  _prev: ActionState<RegistrationErrors>,
  formData: FormData,
): Promise<ActionState<RegistrationErrors>> {
  const members = Array.from({ length: MAX_GROUP_SIZE }, (_, index) =>
    Object.fromEntries(
      PERSON_FIELDS.map((name) => [
        name,
        field(formData, `members.${index}.${name}`),
      ]),
    ),
  )
  const result = registerForEvent(
    getSessionUser(),
    field(formData, 'eventId'),
    {
      mode: field(formData, 'mode'),
      groupName: field(formData, 'groupName'),
      memberCount: field(formData, 'memberCount'),
      leaderIndex: field(formData, 'leaderIndex'),
      members,
    },
  )
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
      fieldErrors: result.fieldErrors,
    }
  }
  refreshEverything()
  return { status: 'success', message: result.message }
}

/** Live group-name availability check used while the student types. */
export async function checkGroupNameAction(
  eventId: string,
  name: string,
): Promise<{ available: boolean; message: string }> {
  const error = checkGroupName(eventId, name)
  return error
    ? { available: false, message: error }
    : { available: true, message: `"${name.trim()}" is available.` }
}

/** Unread count and alert banner contents, refreshed on every navigation. */
export async function getNotificationStatusAction(): Promise<NotificationStatus> {
  return getNotificationStatus(getSessionUser())
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationStatus> {
  const user = getSessionUser()
  if (user) markRead(user.id, notificationId)
  refreshEverything()
  return getNotificationStatus(user)
}

export async function markAllNotificationsReadAction(): Promise<NotificationStatus> {
  const user = getSessionUser()
  if (user) markAllRead(user.id)
  refreshEverything()
  return getNotificationStatus(user)
}

export async function postAnnouncementAction(
  _prev: ActionState<{ message?: string }>,
  formData: FormData,
): Promise<ActionState<{ message?: string }>> {
  const result = postAnnouncement(
    getSessionUser(),
    field(formData, 'eventId'),
    field(formData, 'message'),
  )
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
      fieldErrors: result.fieldErrors,
    }
  }
  refreshEverything()
  return { status: 'success', message: result.message }
}

/** Creates a student account and signs the new student in. */
export async function signUpAction(
  _prev: ActionState<PersonErrors>,
  formData: FormData,
): Promise<ActionState<PersonErrors>> {
  const result = signUpStudent(
    Object.fromEntries(
      PERSON_FIELDS.map((name) => [name, field(formData, name)]),
    ),
  )
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
      fieldErrors: result.fieldErrors,
    }
  }
  setSessionCookie(result.data.id)
  refreshEverything()
  redirect('/events?welcome=1')
}

export async function cancelRegistrationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const registrationId = field(formData, 'registrationId')
  const result = cancelRegistration(getSessionUser(), registrationId)
  if (!result.ok) return { status: 'error', message: result.error }
  refreshEverything()
  redirect(`/registrations?cancelled=${encodeURIComponent(registrationId)}`)
}

const EVENT_FIELDS: (keyof EventInput)[] = [
  'name',
  'description',
  'date',
  'venue',
  'category',
  'capacity',
]

export async function saveEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(
    EVENT_FIELDS.map((name) => [name, field(formData, name)]),
  )
  const eventId = field(formData, 'eventId')
  const user = getSessionUser()
  const previous = eventId ? getEventById(eventId) : undefined
  const before = previous && { date: previous.date, venue: previous.venue }
  const result = eventId
    ? updateEvent(user, eventId, raw)
    : createEvent(user, raw)
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
      fieldErrors: result.fieldErrors,
    }
  }
  refreshEverything()
  const changed =
    !!before &&
    (before.date !== result.data.date || before.venue !== result.data.venue)
  redirect(
    `/organizer?done=${eventId ? (changed ? 'rescheduled' : 'updated') : 'created'}&event=${result.data.id}`,
  )
}

export async function cancelEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const eventId = field(formData, 'eventId')
  const result = cancelEvent(getSessionUser(), eventId)
  if (!result.ok) return { status: 'error', message: result.error }
  refreshEverything()
  redirect(`/organizer?done=cancelled&event=${eventId}`)
}

export async function deleteEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = deleteEvent(getSessionUser(), field(formData, 'eventId'))
  if (!result.ok) return { status: 'error', message: result.error }
  refreshEverything()
  redirect('/organizer?done=deleted')
}
