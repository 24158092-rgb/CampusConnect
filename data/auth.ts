// A deliberately simple authentication skeleton.
//
// There is no real login form, password, or session cookie here — just
// enough structure so participants know who the "current user" is and
// what role they have. Real auth (checking a password, protecting API
// routes) is intentionally left as part of the participant tasks
// (Task 4 mentions rejecting non-organizer requests at the API level).

export type UserRole = 'student' | 'organizer'

export interface AppUser {
  id: string
  name: string
  role: UserRole
}

export const users: AppUser[] = [
  { id: 'stu-1', name: 'Aditi Rao', role: 'student' },
  { id: 'org-1', name: 'Rohan Verma', role: 'organizer' },
]

export function getUserById(id: string): AppUser | undefined {
  return users.find((user) => user.id === id)
}
