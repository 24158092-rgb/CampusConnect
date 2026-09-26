'use client'

import Link from 'next/link'
import { useState, CSSProperties, ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { ActionState, saveEventAction } from '@/app/actions'
import { EVENT_CATEGORIES } from '@/data/events'
import type { EventFieldErrors, EventInput } from '@/data/store'
import Notice from './Notice'

export interface EventFormValues {
  name: string
  description: string
  date: string
  venue: string
  category: string
  capacity: string
}

const IDLE: ActionState = { status: 'idle', message: '' }

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius)',
  fontSize: 14.5,
  fontFamily: 'inherit',
  background: 'var(--paper-raised)',
  color: 'var(--ink)',
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: keyof EventInput
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label htmlFor={name} style={{ fontSize: 13.5, fontWeight: 600 }}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${name}-error`} style={{ fontSize: 13, color: 'var(--rust)' }}>
          {error}
        </span>
      ) : (
        hint && <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{hint}</span>
      )}
    </div>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  )
}

/** Create / edit form. All validation runs on the server in saveEventAction. */
export default function EventForm({
  eventId,
  initial,
  minDate,
  todayLabel,
}: {
  eventId?: string
  initial: EventFormValues
  minDate: string
  todayLabel: string
}) {
  const [state, formAction] = useFormState(saveEventAction, IDLE)
  const [values, setValues] = useState(initial)
  const errors: EventFieldErrors = state.fieldErrors ?? {}

  function bind(name: keyof EventFormValues) {
    return {
      id: name,
      name,
      value: values[name],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      ) => setValues((v) => ({ ...v, [name]: e.target.value })),
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? `${name}-error` : undefined,
      style: {
        ...inputStyle,
        borderColor: errors[name] ? 'var(--rust)' : 'var(--line)',
      },
    }
  }

  return (
    <form
      action={formAction}
      noValidate
      className="card-surface"
      style={{ padding: 24, display: 'grid', gap: 18, maxWidth: 640 }}
    >
      {eventId && <input type="hidden" name="eventId" value={eventId} />}
      {state.status === 'error' && <Notice tone="error">{state.message}</Notice>}

      <Field name="name" label="Event name" error={errors.name}>
        <input type="text" maxLength={100} required {...bind('name')} />
      </Field>

      <Field name="description" label="Description" hint="Optional." error={errors.description}>
        <textarea rows={4} maxLength={1000} {...bind('description')} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
        <Field
          name="date"
          label="Date and time"
          hint={`Must be after ${todayLabel}.`}
          error={errors.date}
        >
          <input type="datetime-local" min={minDate} required {...bind('date')} />
        </Field>
        <Field name="category" label="Category" error={errors.category}>
          <select required {...bind('category')}>
            <option value="" disabled>
              Pick one…
            </option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
        <Field name="venue" label="Venue" error={errors.venue}>
          <input type="text" maxLength={120} required {...bind('venue')} />
        </Field>
        <Field
          name="capacity"
          label="Capacity"
          hint={eventId ? "Can't go below the seats already taken." : undefined}
          error={errors.capacity}
        >
          <input type="number" min={1} step={1} inputMode="numeric" required {...bind('capacity')} />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <SubmitButton label={eventId ? 'Save changes' : 'Create event'} />
        <Link href="/organizer" className="btn btn-secondary">
          Back
        </Link>
      </div>
    </form>
  )
}
