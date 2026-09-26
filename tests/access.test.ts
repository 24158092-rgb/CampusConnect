import { describe, it, expect, beforeEach, vi } from 'vitest'

// lib/session imports next/headers; only the pure helpers are tested here.
vi.mock('next/headers', () => ({ cookies: () => ({}), headers: () => new Map() }))

describe('organizer access code', () => {
  beforeEach(() => {
    vi.resetModules()
    delete (globalThis as Record<string, unknown>).__campusCodeAttempts
    delete process.env.ORGANIZER_ACCESS_CODE
  })

  it('uses the default code unless ORGANIZER_ACCESS_CODE is set', async () => {
    const org = await import('@/lib/organizer')
    expect(org.getOrganizerCode()).toBe('KIIT-ORG-2026')
    expect(org.isCorrectOrganizerCode('KIIT-ORG-2026')).toBe(true)
    expect(org.isCorrectOrganizerCode('  KIIT-ORG-2026 ')).toBe(true)
    expect(org.isCorrectOrganizerCode('kiit-org-2026')).toBe(false)
    expect(org.isCorrectOrganizerCode('')).toBe(false)
    process.env.ORGANIZER_ACCESS_CODE = 'SECRET-123'
    expect(org.isCorrectOrganizerCode('KIIT-ORG-2026')).toBe(false)
    expect(org.isCorrectOrganizerCode('SECRET-123')).toBe(true)
  })

  it('locks a client out for 10 minutes after 5 wrong codes', async () => {
    const org = await import('@/lib/organizer')
    const now = 1_000_000
    expect([1, 2, 3, 4].map(() => org.recordFailedAttempt('ip', now))).toEqual([4, 3, 2, 1])
    expect(org.lockoutMinutesLeft('ip', now)).toBe(0)
    expect(org.recordFailedAttempt('ip', now)).toBe(0)
    expect(org.lockoutMinutesLeft('ip', now)).toBe(10)
    expect(org.lockoutMinutesLeft('other-ip', now)).toBe(0)
    // after the lockout the count starts again
    const later = now + 10 * 60 * 1000 + 1
    expect(org.lockoutMinutesLeft('ip', later)).toBe(0)
    expect(org.recordFailedAttempt('ip', later)).toBe(4)
    org.clearAttempts('ip')
    expect(org.recordFailedAttempt('ip', later)).toBe(4)
  })
})

describe('signed session cookie', () => {
  it('round-trips and rejects tampering', async () => {
    vi.resetModules()
    const session = await import('@/lib/session')
    const value = session.encodeSession('stu-1')
    expect(session.decodeSession(value)).toBe('stu-1')
    // a student can't turn their cookie into an organizer's
    const forged = value.replace('stu-1', 'org-1')
    expect(session.decodeSession(forged)).toBeNull()
    expect(session.decodeSession('org-1')).toBeNull()
    expect(session.decodeSession('org-1.')).toBeNull()
    expect(session.decodeSession(undefined)).toBeNull()
  })
})
