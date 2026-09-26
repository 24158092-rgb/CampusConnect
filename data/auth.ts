export type UserRole = 'student' | 'organizer'

export interface AppUser {
  id: string
  name: string
  role: UserRole
}

export const users: AppUser[] = [
  { id: 'stu-1', name: 'Aditi Rao', role: 'student' },
  { id: 'org-1', name: 'Rohan Verma', role: 'organizer' },
  // Seeded events are owned by org-1 through org-4, so each owner gets an
  // account — otherwise nobody could manage the org-2/3/4 events.
  { id: 'org-2', name: 'Meera Iyer', role: 'organizer' },
  { id: 'org-3', name: 'Kabir Shah', role: 'organizer' },
  { id: 'org-4', name: 'Ananya Das', role: 'organizer' },
]

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
