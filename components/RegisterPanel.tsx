'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  ActionState,
  checkGroupNameAction,
  registerAction,
} from '@/app/actions'
import { EventStatus } from '@/data/events'
import type { StudentProfile, UserRole } from '@/data/auth'
import { PersonField } from '@/data/people'
import type { RegistrationErrors } from '@/data/store'
import Notice from './Notice'
import PersonFields, {
  EMPTY_PERSON,
  FieldShell,
  PersonDraft,
  inputStyle,
} from './PersonFields'

const MIN_GROUP = 2
const MAX_GROUP = 4

export interface RegistrationSummary {
  /** Links for adding the event to a personal calendar. */
  calendar?: { google: string; ics: string }
  mode: 'individual' | 'group'
  groupName?: string
  members: { name: string; rollNumber: string; isLeader: boolean }[]
}

type Mode = 'individual' | 'group'
type NameCheck = {
  state: 'idle' | 'checking' | 'available' | 'taken'
  message: string
}

const IDLE: ActionState<RegistrationErrors> = { status: 'idle', message: '' }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Registering…' : label}
    </button>
  )
}

function profileDraft(name: string, profile?: StudentProfile): PersonDraft {
  if (!profile) return { ...EMPTY_PERSON, name }
  return {
    name,
    rollNumber: profile.rollNumber,
    yearOfStudy: String(profile.yearOfStudy),
    contactNumber: profile.contactNumber,
    kiitEmail: profile.kiitEmail,
    personalEmail: profile.personalEmail,
  }
}

export default function RegisterPanel({
  eventId,
  status,
  seatsAvailable,
  registration,
  viewer,
}: {
  eventId: string
  status: EventStatus
  seatsAvailable: number
  registration: RegistrationSummary | null
  viewer: { name: string; role: UserRole; profile?: StudentProfile } | null
}) {
  const [state, formAction] = useFormState(registerAction, IDLE)
  const [mode, setMode] = useState<Mode>('individual')
  const [memberCount, setMemberCount] = useState(MIN_GROUP)
  const [groupName, setGroupName] = useState('')
  const [nameCheck, setNameCheck] = useState<NameCheck>({
    state: 'idle',
    message: '',
  })
  const [leaderIndex, setLeaderIndex] = useState(0)
  const [members, setMembers] = useState<PersonDraft[]>(() => [
    profileDraft(viewer?.name ?? '', viewer?.profile),
    { ...EMPTY_PERSON },
    { ...EMPTY_PERSON },
    { ...EMPTY_PERSON },
  ])
  const checkId = useRef(0)

  // Live availability check for the group name, debounced while typing.
  useEffect(() => {
    if (mode !== 'group' || !groupName.trim()) {
      setNameCheck({ state: 'idle', message: '' })
      return
    }
    const id = ++checkId.current
    setNameCheck({ state: 'checking', message: 'Checking availability…' })
    const timer = setTimeout(async () => {
      try {
        const result = await checkGroupNameAction(eventId, groupName)
        if (id !== checkId.current) return
        setNameCheck({
          state: result.available ? 'available' : 'taken',
          message: result.message,
        })
      } catch {
        if (id === checkId.current) setNameCheck({ state: 'idle', message: '' })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [eventId, groupName, mode])

  function updateMember(index: number, field: PersonField, value: string) {
    setMembers((list) =>
      list.map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      ),
    )
  }

  const count = mode === 'group' ? memberCount : 1
  const errors: RegistrationErrors =
    state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  const feedback = state.status !== 'idle' && (
    <Notice tone={state.status}>{state.message}</Notice>
  )

  // ---- states where no form is shown ----
  if (registration) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {feedback}
        <div
          className="card-surface"
          style={{ padding: 20, display: 'grid', gap: 10 }}
        >
          <h2 style={{ fontSize: 18 }}>
            {registration.mode === 'group'
              ? `You're registered as team "${registration.groupName}"`
              : "You're registered"}
          </h2>
          <ul style={{ display: 'grid', gap: 6 }}>
            {registration.members.map((member) => (
              <li key={member.rollNumber} style={{ fontSize: 14 }}>
                {member.name} · {member.rollNumber}
                {registration.mode === 'group' && member.isLeader && (
                  <strong style={{ color: 'var(--green)' }}>
                    {' '}
                    · Team leader
                  </strong>
                )}
              </li>
            ))}
          </ul>
          {registration.calendar && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={registration.calendar.google}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 13.5 }}
              >
                Add to Google Calendar
              </a>
              <a
                href={registration.calendar.ics}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 13.5 }}
              >
                Download .ics (Apple / Outlook)
              </a>
            </div>
          )}
          <Link href="/registrations" style={{ fontWeight: 600, fontSize: 14 }}>
            Manage in My registrations →
          </Link>
        </div>
      </div>
    )
  }

  let blocked: string | null = null
  if (status === 'cancelled') {
    blocked =
      'This event has been cancelled. Registration is no longer possible.'
  } else if (status === 'past') {
    blocked = 'This event has already taken place, so registration is closed.'
  } else if (status === 'full') {
    blocked = 'This event is full. Registration is closed.'
  } else if (!viewer) {
    blocked = '' // empty: show the sign-up prompt instead of a reason
  } else if (viewer.role !== 'student') {
    blocked =
      'Organizer accounts can’t register. Switch to a student account to sign up.'
  }

  if (blocked !== null) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {feedback}
        <div
          className="card-surface"
          style={{ padding: 20, display: 'grid', gap: 12 }}
        >
          {blocked ? (
            <p style={{ fontSize: 14.5 }}>{blocked}</p>
          ) : (
            <>
              <p style={{ fontSize: 14.5 }}>
                You need a student account to register. New here? Create one in
                under a minute. Already have one? Pick it from the account menu
                at the top right.
              </p>
              <Link
                href="/signup"
                className="btn btn-primary"
                style={{ width: 'fit-content' }}
              >
                Sign up to register
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  // ---- the registration form ----
  const radioCard = (value: Mode, title: string, text: string) => (
    <label
      style={{
        flex: '1 1 200px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '12px 14px',
        border: `1.5px solid ${mode === value ? 'var(--ink)' : 'var(--line)'}`,
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        background: 'var(--paper-raised)',
      }}
    >
      <input
        type="radio"
        name="mode"
        value={value}
        checked={mode === value}
        onChange={() => setMode(value)}
        style={{ marginTop: 4 }}
      />
      <span>
        <strong style={{ display: 'block', fontSize: 14.5 }}>{title}</strong>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{text}</span>
      </span>
    </label>
  )

  return (
    <form
      action={formAction}
      noValidate
      className="card-surface"
      style={{ padding: 20, display: 'grid', gap: 18 }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <h2 style={{ fontSize: 20 }}>Register for this event</h2>
        <p style={{ fontSize: 13.5, marginTop: 4 }}>
          Signed in as {viewer!.name}. {seatsAvailable} seat
          {seatsAvailable === 1 ? '' : 's'} left; every member takes one seat.
        </p>
      </div>
      {feedback}

      <fieldset
        style={{
          border: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 8,
        }}
      >
        <legend style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
          Are you registering as an individual or as a group?
        </legend>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {radioCard('individual', 'Individual', 'Just you — one seat.')}
          {radioCard(
            'group',
            'Group',
            `A team of ${MIN_GROUP}–${MAX_GROUP} members.`,
          )}
        </div>
        {errors.mode && (
          <span style={{ fontSize: 13, color: 'var(--rust)' }}>
            {errors.mode}
          </span>
        )}
      </fieldset>

      {mode === 'group' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
          }}
        >
          <FieldShell
            id="memberCount"
            label="Number of members"
            error={errors.memberCount}
            hint={`Maximum ${MAX_GROUP} per group, including you.`}
          >
            <select
              id="memberCount"
              name="memberCount"
              value={memberCount}
              onChange={(e) => {
                const next = Number(e.target.value)
                setMemberCount(next)
                if (leaderIndex >= next) setLeaderIndex(0)
              }}
              style={{
                ...inputStyle,
                borderColor: errors.memberCount ? 'var(--rust)' : 'var(--line)',
              }}
            >
              {Array.from(
                { length: MAX_GROUP - MIN_GROUP + 1 },
                (_, i) => MIN_GROUP + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} members
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell
            id="groupName"
            label="Group name"
            error={
              errors.groupName ??
              (nameCheck.state === 'taken' ? nameCheck.message : undefined)
            }
            hint={
              nameCheck.state === 'idle'
                ? 'Must be unique for this event.'
                : nameCheck.message
            }
          >
            <input
              id="groupName"
              name="groupName"
              type="text"
              maxLength={30}
              placeholder="e.g. Byte Busters"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              aria-invalid={
                errors.groupName || nameCheck.state === 'taken'
                  ? true
                  : undefined
              }
              aria-describedby={
                errors.groupName || nameCheck.state === 'taken'
                  ? 'groupName-error'
                  : 'groupName-hint'
              }
              style={{
                ...inputStyle,
                borderColor:
                  errors.groupName || nameCheck.state === 'taken'
                    ? 'var(--rust)'
                    : nameCheck.state === 'available'
                      ? 'var(--green)'
                      : 'var(--line)',
              }}
            />
          </FieldShell>
          <input type="hidden" name="leaderIndex" value={leaderIndex} />
        </div>
      )}

      {errors.leader && <Notice tone="error">{errors.leader}</Notice>}

      {members.slice(0, count).map((member, index) => (
        <fieldset
          key={index}
          style={{
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: 16,
            margin: 0,
            display: 'grid',
            gap: 12,
          }}
        >
          <legend style={{ padding: '0 6px', fontWeight: 600, fontSize: 14.5 }}>
            {mode === 'group' ? `Member ${index + 1}` : 'Your details'}
            {index === 0 && mode === 'group' && ' (you)'}
          </legend>
          {mode === 'group' && (
            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                name="leaderChoice"
                checked={leaderIndex === index}
                onChange={() => setLeaderIndex(index)}
              />
              Team leader
            </label>
          )}
          <PersonFields
            idPrefix={`m${index}-`}
            namePrefix={`members.${index}.`}
            values={member}
            errors={errors.members?.[index]}
            onChange={(field, value) => updateMember(index, field, value)}
          />
        </fieldset>
      ))}

      <SubmitButton
        label={
          mode === 'group'
            ? `Register team of ${memberCount}`
            : 'Confirm registration'
        }
      />
    </form>
  )
}
