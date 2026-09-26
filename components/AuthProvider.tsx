'use client'

import { createContext, useContext, useTransition, ReactNode } from 'react'
import type { AppUser } from '@/data/auth'
import { switchUser } from '@/app/actions'

interface AuthContextValue {
  /** null when signed out. */
  currentUser: AppUser | null
  setCurrentUserId: (id: string) => void
  allUsers: AppUser[]
  switching: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// The signed-in account lives in a cookie so server pages and actions can
// see it too; the layout reads it and hands it down as `user`, along with
// the current account list (which grows as students sign up).
export function AuthProvider({
  user,
  users,
  children,
}: {
  user: AppUser | null
  users: AppUser[]
  children: ReactNode
}) {
  const [switching, startTransition] = useTransition()

  function setCurrentUserId(id: string) {
    startTransition(() => switchUser(id))
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        setCurrentUserId,
        allUsers: users,
        switching,
      }}
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
