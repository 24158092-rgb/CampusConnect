'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { ActionState } from '@/app/actions'
import Notice from './Notice'

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>

const IDLE: ActionState = { status: 'idle', message: '' }

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn btn-secondary" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  )
}

/**
 * A one-button form that asks for confirmation, then calls a server action.
 * Success redirects with a notice; errors are shown next to the button.
 */
export default function ConfirmActionButton({
  action,
  fields,
  label,
  pendingLabel,
  confirmMessage,
}: {
  action: Action
  fields: Record<string, string>
  label: string
  pendingLabel: string
  confirmMessage: string
}) {
  const [state, formAction] = useFormState(action, IDLE)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault()
      }}
      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.status === 'error' && <Notice tone="error">{state.message}</Notice>}
      <Submit label={label} pendingLabel={pendingLabel} />
    </form>
  )
}
