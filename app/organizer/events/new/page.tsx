import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import EventForm from '@/components/EventForm'
import { OrganizerOnly, dateFieldProps } from '../../OrganizerGate'

export const dynamic = 'force-dynamic'

export default function NewEventPage() {
  const user = getSessionUser()
  if (user?.role !== 'organizer') return <OrganizerOnly user={user} />

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <Link
        href="/organizer"
        style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
      >
        ← Organizer console
      </Link>
      <h1 style={{ fontSize: 30, margin: '16px 0 24px' }}>Post a new event</h1>
      <EventForm
        initial={{
          name: '',
          description: '',
          date: '',
          venue: '',
          category: '',
          capacity: '',
        }}
        {...dateFieldProps()}
      />
    </section>
  )
}
