'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { AppUser } from '@/data/auth'
import { SwitchResult, switchUser } from '@/app/actions'

interface AuthContextValue {
  /** null when signed out. */
  currentUser: AppUser | null
  /** Organizer accounts need the organizer access code. */
  switchAccount: (id: string, organizerCode?: string) => Promise<SwitchResult>
  allUsers: AppUser[]
  switching: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// The signed-in account lives in a signed cookie so server pages and
// actions can see it too; the layout reads it and hands it down as `user`,
// along with the current account list (which grows as students sign up).
export function AuthProvider({
  user,
  users,
  children,
}: {
  user: AppUser | null
  users: AppUser[]
  children: ReactNode
}) {
  const [switching, setSwitching] = useState(false)

  async function switchAccount(id: string, organizerCode?: string) {
    setSwitching(true)
    try {
      return await switchUser(id, organizerCode)
    } catch {
      return {
        ok: false as const,
        error: 'Something went wrong. Please try again.',
      }
    } finally {
      setSwitching(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{ currentUser: user, switchAccount, allUsers: users, switching }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
