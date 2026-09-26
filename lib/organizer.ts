// Server-only: the shared organizer access code and the guard against
// guessing it. Never import this from a client component.

import { createHash, timingSafeEqual } from 'crypto'

const DEFAULT_CODE = 'KIIT-ORG-2026'

/**
 * The code every organizer must enter to sign in as an organizer. Set
 * ORGANIZER_ACCESS_CODE in the deployment; the default is for local use.
 */
export function getOrganizerCode(): string {
  return (process.env.ORGANIZER_ACCESS_CODE || DEFAULT_CODE).trim()
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/** Constant-time comparison, so response timing leaks nothing about the code. */
export function isCorrectOrganizerCode(input: string): boolean {
  return timingSafeEqual(digest(input.trim()), digest(getOrganizerCode()))
}

// Simple lockout: 5 wrong codes from one client locks it out for 10 minutes.
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 10 * 60 * 1000

const shared = globalThis as typeof globalThis & {
  __campusCodeAttempts?: Map<string, { failures: number; lockedUntil: number }>
}
const attempts = (shared.__campusCodeAttempts ??= new Map())

/** Minutes left on a lockout for this client, or 0 when it may try. */
export function lockoutMinutesLeft(client: string, now = Date.now()): number {
  const entry = attempts.get(client)
  if (!entry || entry.lockedUntil <= now) return 0
  return Math.ceil((entry.lockedUntil - now) / 60000)
}

/** Records a wrong code; returns how many tries are left before a lockout. */
export function recordFailedAttempt(client: string, now = Date.now()): number {
  const entry = attempts.get(client)
  // A lockout that has run out starts the count again.
  const failures = (entry && entry.lockedUntil === 0 ? entry.failures : 0) + 1
  if (failures >= MAX_ATTEMPTS) {
    attempts.set(client, { failures: 0, lockedUntil: now + LOCKOUT_MS })
    return 0
  }
  attempts.set(client, { failures, lockedUntil: 0 })
  return MAX_ATTEMPTS - failures
}

export function clearAttempts(client: string) {
  attempts.delete(client)
}
