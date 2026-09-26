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
  cancelEvent,
  cancelRegistration,
  createEvent,
  deleteEvent,
  registerForEvent,
  updateEvent,
} from '@/data/store'
import { getSessionUser } from '@/lib/session'

export interface ActionState {
  status: 'idle' | 'success' | 'error'
  message: string
  fieldErrors?: EventFieldErrors
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

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = registerForEvent(getSessionUser(), field(formData, 'eventId'))
  if (!result.ok) return { status: 'error', message: result.error }
  refreshEverything()
  return { status: 'success', message: result.message }
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
