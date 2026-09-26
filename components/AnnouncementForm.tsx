'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { ActionState, postAnnouncementAction } from '@/app/actions'
import Notice from './Notice'
import { inputStyle } from './PersonFields'

const IDLE: ActionState<{ message?: string }> = { status: 'idle', message: '' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send to registered students'}
    </button>
  )
}

/** Organizer-only: post an announcement that notifies everyone registered. */
export default function AnnouncementForm({ eventId }: { eventId: string }) {
  const [state, formAction] = useFormState(postAnnouncementAction, IDLE)
  const [message, setMessage] = useState('')
  const lastState = useRef(state)

  // Clear the box once an announcement has gone out.
  useEffect(() => {
    if (state !== lastState.current && state.status === 'success')
      setMessage('')
    lastState.current = state
  }, [state])

  const error =
    state.status === 'error' ? state.fieldErrors?.message : undefined

  return (
    <form action={formAction} noValidate style={{ display: 'grid', gap: 10 }}>
      <input type="hidden" name="eventId" value={eventId} />
      {state.status !== 'idle' && (
        <Notice tone={state.status}>{state.message}</Notice>
      )}
      <label htmlFor="announcement" style={{ fontSize: 13.5, fontWeight: 600 }}>
        New announcement
      </label>
      <textarea
        id="announcement"
        name="message"
        rows={3}
        maxLength={500}
        placeholder="e.g. Please bring your college ID card. Doors open 30 minutes early."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'announcement-error' : undefined}
        style={{
          ...inputStyle,
          borderColor: error ? 'var(--rust)' : 'var(--line)',
        }}
      />
      {error && (
        <span
          id="announcement-error"
          style={{ fontSize: 13, color: 'var(--rust)' }}
        >
          {error}
        </span>
      )}
      <div>
        <SubmitButton />
      </div>
    </form>
  )
}
