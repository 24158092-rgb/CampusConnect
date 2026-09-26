'use server'

// Server actions run inside the page's own server instance, so a write and
// the re-render that follows it always see the same in-memory store.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { SESSION_COOKIE, getUserById } from '@/data/auth'
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
  dismissNotice,
  registerForEvent,
  signUpStudent,
  updateEvent,
} from '@/data/store'
import { PERSON_FIELDS, PersonErrors } from '@/data/people'
import { getSessionUser } from '@/lib/session'

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

/** Mock login: remember the picked account, or sign out when id is empty. */
export async function switchUser(userId: string): Promise<void> {
  if (userId && getUserById(userId)) {
    cookies().set(SESSION_COOKIE, userId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
  } else {
    cookies().delete(SESSION_COOKIE)
  }
  refreshEverything()
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

export async function dismissNoticeAction(formData: FormData): Promise<void> {
  dismissNotice(getSessionUser(), field(formData, 'registrationId'))
  refreshEverything()
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
  cookies().set(SESSION_COOKIE, result.data.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
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
  redirect(
    `/organizer?done=${eventId ? 'updated' : 'created'}&event=${result.data.id}`,
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
