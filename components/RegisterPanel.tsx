'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { ActionState, registerAction } from '@/app/actions'
import { EventStatus } from '@/data/events'
import { UserRole } from '@/data/auth'
import Notice from './Notice'

const IDLE: ActionState = { status: 'idle', message: '' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Registering…' : 'Confirm registration'}
    </button>
  )
}

export default function RegisterPanel({
  eventId,
  status,
  registered,
  viewer,
}: {
  eventId: string
  status: EventStatus
  registered: boolean
  viewer: { name: string; role: UserRole } | null
}) {
  const [state, formAction] = useFormState(registerAction, IDLE)

  let body
  if (registered) {
    body = (
      <p style={{ fontSize: 14 }}>
        You have a seat.{' '}
        <Link href="/registrations" style={{ fontWeight: 600 }}>
          See my registrations
        </Link>
      </p>
    )
  } else if (status !== 'open') {
    body = (
      <button className="btn btn-primary" disabled>
        {status === 'full' ? 'Event full' : 'Registration closed'}
      </button>
    )
  } else if (!viewer) {
    body = (
      <>
        <button className="btn btn-primary" disabled>
          Register
        </button>
        <p style={{ fontSize: 13.5 }}>
          Sign in as a student from the account menu (top right) to register.
        </p>
      </>
    )
  } else if (viewer.role !== 'student') {
    body = (
      <p style={{ fontSize: 13.5 }}>
        Organizer accounts can’t register. Switch to a student account to sign
        up.
      </p>
    )
  } else {
    body = (
      <form action={formAction} style={{ display: 'grid', gap: 10 }}>
        <input type="hidden" name="eventId" value={eventId} />
        <p style={{ fontSize: 13.5 }}>
          Registering as <strong>{viewer.name}</strong>. One seat per student.
        </p>
        <SubmitButton />
      </form>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
      {state.status !== 'idle' && (
        <Notice tone={state.status}>{state.message}</Notice>
      )}
      {body}
    </div>
  )
}
