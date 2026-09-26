'use client'

import { createContext, useContext, useTransition, ReactNode } from 'react'
import { users, AppUser } from '@/data/auth'
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
// see it too; the layout reads it and hands it down as `user`.
export function AuthProvider({
  user,
  children,
}: {
  user: AppUser | null
  children: ReactNode
}) {
  const [switching, startTransition] = useTransition()

  function setCurrentUserId(id: string) {
    startTransition(() => switchUser(id))
  }

  return (
    <AuthContext.Provider
      value={{ currentUser: user, setCurrentUserId, allUsers: users, switching }}
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
