'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  getNotificationStatusAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions'
import type { NotificationStatus } from '@/data/store'

interface NotificationsContextValue {
  status: NotificationStatus
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const EMPTY: NotificationStatus = { unread: 0, alerts: [] }
const NotificationsContext = createContext<NotificationsContextValue>({
  status: EMPTY,
  markRead: async () => {},
  markAllRead: async () => {},
})

/**
 * Keeps the bell count and alert banner current. The layout supplies the
 * status when it renders; after that it is re-fetched on every page change,
 * because the root layout isn't re-rendered on client-side navigation.
 */
export function NotificationsProvider({
  initial,
  signedIn,
  children,
}: {
  initial: NotificationStatus
  signedIn: boolean
  children: ReactNode
}) {
  const [status, setStatus] = useState(initial)
  const pathname = usePathname()
  const initialKey = JSON.stringify(initial)

  // A fresh server render (e.g. after switching account) wins.
  useEffect(() => {
    setStatus(JSON.parse(initialKey) as NotificationStatus)
  }, [initialKey])

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    getNotificationStatusAction()
      .then((next) => {
        if (!cancelled) setStatus(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname, signedIn])

  async function markRead(id: string) {
    try {
      setStatus(await markNotificationReadAction(id))
    } catch {}
  }

  async function markAllRead() {
    try {
      setStatus(await markAllNotificationsReadAction())
    } catch {}
  }

  return (
    <NotificationsContext.Provider value={{ status, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
