import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import EmptyState from '@/components/EmptyState'
import SignUpForm from '@/components/SignUpForm'

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  const user = getSessionUser()

  if (user) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title={`You're signed in as ${user.name}`}
          description="Choose “Signed out” in the account menu at the top right to create another student account."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          }
        />
      </section>
    )
  }

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <span className="eyebrow-tag">new student</span>
      <h1 style={{ fontSize: 30, margin: '10px 0 8px' }}>
        Create your account
      </h1>
      <p style={{ marginBottom: 24 }}>
        Your details fill in automatically when you register for events. Each
        roll number, contact number and KIIT email can only belong to one
        account.
      </p>
      <SignUpForm />
    </section>
  )
}
