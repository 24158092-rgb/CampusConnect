import { cookies } from 'next/headers'
import { AppUser, SESSION_COOKIE, resolveSessionUser } from '@/data/auth'

/** The account picked in the navbar, or null when signed out. Server only. */
export function getSessionUser(): AppUser | null {
  return resolveSessionUser(cookies().get(SESSION_COOKIE)?.value)
}
