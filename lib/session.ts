// Server-only session handling. The cookie holds "<userId>.<signature>" so
// nobody can make themselves an organizer (or anyone else) by editing it.

import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { AppUser, SESSION_COOKIE, resolveSessionUser } from '@/data/auth'
import { getOrganizerCode } from './organizer'

function secret(): string {
  return (
    process.env.SESSION_SECRET || `campus-connect-session:${getOrganizerCode()}`
  )
}

function sign(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('base64url')
}

export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`
}

/** The user id in a session cookie value, or null if it was tampered with. */
export function decodeSession(value: string | undefined): string | null {
  if (!value) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const userId = value.slice(0, dot)
  const given = Buffer.from(value.slice(dot + 1))
  const expected = Buffer.from(sign(userId))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null
  }
  return userId
}

/** The signed-in account, or null when signed out or the cookie is invalid. */
export function getSessionUser(): AppUser | null {
  return resolveSessionUser(decodeSession(cookies().get(SESSION_COOKIE)?.value))
}

export function setSessionCookie(userId: string) {
  cookies().set(SESSION_COOKIE, encodeSession(userId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE)
}
