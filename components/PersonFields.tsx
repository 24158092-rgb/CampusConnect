'use client'

import { CSSProperties, ReactNode } from 'react'
import {
  PERSON_LABELS,
  PersonErrors,
  PersonField,
  YEARS_OF_STUDY,
} from '@/data/people'

export type PersonDraft = Record<PersonField, string>

export const EMPTY_PERSON: PersonDraft = {
  name: '',
  rollNumber: '',
  yearOfStudy: '',
  contactNumber: '',
  kiitEmail: '',
  personalEmail: '',
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius)',
  fontSize: 14.5,
  fontFamily: 'inherit',
  background: 'var(--paper-raised)',
  color: 'var(--ink)',
}

export function FieldShell({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
      <label htmlFor={id} style={{ fontSize: 13.5, fontWeight: 600 }}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} style={{ fontSize: 13, color: 'var(--rust)' }}>
          {error}
        </span>
      ) : (
        hint && (
          <span
            id={`${id}-hint`}
            style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}
          >
            {hint}
          </span>
        )
      )}
    </div>
  )
}

const INPUTS: Record<
  Exclude<PersonField, 'yearOfStudy'>,
  {
    type: string
    placeholder: string
    autoComplete: string
    inputMode?: 'numeric' | 'tel' | 'email'
  }
> = {
  name: { type: 'text', placeholder: 'e.g. Aditi Rao', autoComplete: 'name' },
  rollNumber: {
    type: 'text',
    placeholder: 'e.g. 22051001',
    autoComplete: 'off',
    inputMode: 'numeric',
  },
  contactNumber: {
    type: 'tel',
    placeholder: '10-digit mobile number',
    autoComplete: 'tel',
    inputMode: 'tel',
  },
  kiitEmail: {
    type: 'email',
    placeholder: 'roll@kiit.ac.in',
    autoComplete: 'off',
    inputMode: 'email',
  },
  personalEmail: {
    type: 'email',
    placeholder: 'name@gmail.com',
    autoComplete: 'email',
    inputMode: 'email',
  },
}

/**
 * The six personal-detail fields. Inputs are named `${namePrefix}${field}`
 * so the same block works for sign-up and for each registration member.
 */
export default function PersonFields({
  idPrefix,
  namePrefix,
  values,
  errors = {},
  onChange,
}: {
  idPrefix: string
  namePrefix: string
  values: PersonDraft
  errors?: PersonErrors
  onChange: (field: PersonField, value: string) => void
}) {
  const common = (field: PersonField) => {
    const id = `${idPrefix}${field}`
    return {
      id,
      name: `${namePrefix}${field}`,
      value: values[field],
      required: true,
      'aria-invalid': errors[field] ? true : undefined,
      'aria-describedby': errors[field] ? `${id}-error` : undefined,
      style: {
        ...inputStyle,
        borderColor: errors[field] ? 'var(--rust)' : 'var(--line)',
      },
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14,
      }}
    >
      {(['name', 'rollNumber'] as const).map((field) => (
        <FieldShell
          key={field}
          id={`${idPrefix}${field}`}
          label={PERSON_LABELS[field]}
          error={errors[field]}
        >
          <input
            {...common(field)}
            {...INPUTS[field]}
            onChange={(e) => onChange(field, e.target.value)}
          />
        </FieldShell>
      ))}
      <FieldShell
        id={`${idPrefix}yearOfStudy`}
        label={PERSON_LABELS.yearOfStudy}
        error={errors.yearOfStudy}
      >
        <select
          {...common('yearOfStudy')}
          onChange={(e) => onChange('yearOfStudy', e.target.value)}
        >
          <option value="" disabled>
            Pick one…
          </option>
          {YEARS_OF_STUDY.map((year) => (
            <option key={year} value={year}>
              Year {year}
            </option>
          ))}
        </select>
      </FieldShell>
      {(['contactNumber', 'kiitEmail', 'personalEmail'] as const).map(
        (field) => (
          <FieldShell
            key={field}
            id={`${idPrefix}${field}`}
            label={PERSON_LABELS[field]}
            error={errors[field]}
          >
            <input
              {...common(field)}
              {...INPUTS[field]}
              onChange={(e) => onChange(field, e.target.value)}
            />
          </FieldShell>
        ),
      )}
    </div>
  )
}
