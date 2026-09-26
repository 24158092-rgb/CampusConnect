'use client'

import { useState } from 'react'
import { useNotifications } from './NotificationsProvider'

export function MarkReadButton({ id }: { id: string }) {
  const { markRead } = useNotifications()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ padding: '5px 12px', fontSize: 13 }}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await markRead(id)
        setBusy(false)
      }}
    >
      {busy ? 'Saving…' : 'Mark as read'}
    </button>
  )
}

export function MarkAllReadButton() {
  const { markAllRead } = useNotifications()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await markAllRead()
        setBusy(false)
      }}
    >
      {busy ? 'Saving…' : 'Mark all as read'}
    </button>
  )
}
