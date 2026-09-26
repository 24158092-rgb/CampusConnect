// Seed data for registrations, so the "My Registrations" and Organizer
// pages have something real to display before participants build the
// actual registration flow (Task 2 and Task 3).

export type RegistrationStatus = 'confirmed' | 'cancelled'

export interface Registration {
  id: string
  eventId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string // ISO date string
}

// NOTE FOR PARTICIPANTS: this array is the "database" of registrations.
// Task 2 (Registration) means pushing new items into this array when a
// student registers. Task 3 (Cancellation) means updating an item's
// status here. Keep using this same array — don't create a second store.
// Next.js can load this module more than once on the server (server
// actions and server components are bundled separately), so the array is
// pinned to globalThis to make every copy share the same store.
const shared = globalThis as typeof globalThis & { __campusRegistrations?: Registration[] }

export const registrations: Registration[] = (shared.__campusRegistrations ??= [
  {
    id: 'reg-01',
    eventId: 'evt-01',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-10T10:15:00',
  },
  {
    id: 'reg-02',
    eventId: 'evt-04',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-08-20T09:00:00',
  },
  {
    id: 'reg-03',
    eventId: 'evt-09',
    studentId: 'stu-1',
    status: 'confirmed',
    registeredAt: '2026-09-12T18:40:00',
  },
])

/**
 * A student's registrations. Cancelled registrations stay in the store (they
 * are marked, not removed) but are left out unless explicitly requested, so
 * they never show up as if they were still active.
 */
export function getRegistrationsForStudent(
  studentId: string,
  { includeCancelled = false }: { includeCancelled?: boolean } = {},
): Registration[] {
  return registrations.filter(
    (reg) =>
      reg.studentId === studentId &&
      (includeCancelled || reg.status !== 'cancelled'),
  )
}

/** The student's confirmed registration for an event, if any. */
export function findActiveRegistration(
  studentId: string,
  eventId: string,
): Registration | undefined {
  return registrations.find(
    (reg) =>
      reg.studentId === studentId &&
      reg.eventId === eventId &&
      reg.status === 'confirmed',
  )
}

/** Number of confirmed registrations for an event. */
export function countActiveRegistrations(eventId: string): number {
  return registrations.filter(
    (reg) => reg.eventId === eventId && reg.status === 'confirmed',
  ).length
}
