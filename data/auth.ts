import type { PersonDetails } from './people'

export type UserRole = 'student' | 'organizer'

/** A student's details from sign-up; used to pre-fill event registrations. */
export type StudentProfile = Omit<PersonDetails, 'name'>

export interface AppUser {
  id: string
  name: string
  role: UserRole
  profile?: StudentProfile
}

// Pinned to globalThis for the same reason as the events array: students
// who sign up must be visible to every server module that reads this.
const shared = globalThis as typeof globalThis & { __campusUsers?: AppUser[] }

export const users: AppUser[] = (shared.__campusUsers ??= [
  {
    id: 'stu-1',
    name: 'Aditi Rao',
    role: 'student',
    profile: {
      rollNumber: '22051001',
      yearOfStudy: 3,
      contactNumber: '9876500001',
      kiitEmail: '22051001@kiit.ac.in',
      personalEmail: 'aditi.rao@gmail.com',
    },
  },
  { id: 'org-1', name: 'Rohan Verma', role: 'organizer' },
  // Seeded events are owned by org-1 through org-4, so each owner gets an
  // account — otherwise nobody could manage the org-2/3/4 events.
  { id: 'org-2', name: 'Meera Iyer', role: 'organizer' },
  { id: 'org-3', name: 'Kabir Shah', role: 'organizer' },
  { id: 'org-4', name: 'Ananya Das', role: 'organizer' },
])

export function getUserById(id: string): AppUser | undefined {
  return users.find((user) => user.id === id)
}

/** Cookie that holds the id of the account picked in the navbar. */
export const SESSION_COOKIE = 'cc_user'

/** Resolves a session cookie value to a user. No cookie means signed out. */
export function resolveSessionUser(
  userId: string | undefined | null,
): AppUser | null {
  if (!userId) return null
  return getUserById(userId) ?? null
}
