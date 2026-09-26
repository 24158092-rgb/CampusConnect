import EmptyState from '@/components/EmptyState'
import { AppUser } from '@/data/auth'
import { TODAY } from '@/data/events'

/** Shown instead of organizer-only pages to students and signed-out visitors. */
export function OrganizerOnly({ user }: { user: AppUser | null }) {
  return (
    <section className="shell" style={{ padding: '56px 0' }}>
      <EmptyState
        title={user ? 'This page is for organizers' : 'Sign in as an organizer'}
        description="Switch to an organizer account from the top-right menu to manage events."
      />
    </section>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Bounds for the event form's date field, based on the seed data's TODAY. */
export function dateFieldProps() {
  const d = TODAY
  return {
    minDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    todayLabel: d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }
}
