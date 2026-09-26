'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { ActionState, signUpAction } from '@/app/actions'
import { PersonErrors } from '@/data/people'
import Notice from './Notice'
import PersonFields, { EMPTY_PERSON, PersonDraft } from './PersonFields'

const IDLE: ActionState<PersonErrors> = { status: 'idle', message: '' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  )
}

export default function SignUpForm() {
  const [state, formAction] = useFormState(signUpAction, IDLE)
  const [values, setValues] = useState<PersonDraft>({ ...EMPTY_PERSON })

  return (
    <form
      action={formAction}
      noValidate
      className="card-surface"
      style={{ padding: 24, display: 'grid', gap: 18, maxWidth: 720 }}
    >
      {state.status === 'error' && (
        <Notice tone="error">{state.message}</Notice>
      )}
      <PersonFields
        idPrefix=""
        namePrefix=""
        values={values}
        errors={state.status === 'error' ? state.fieldErrors : undefined}
        onChange={(field, value) =>
          setValues((v) => ({ ...v, [field]: value }))
        }
      />
      <div>
        <SubmitButton />
      </div>
    </form>
  )
}
