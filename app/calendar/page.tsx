import Link from 'next/link'
import { CampusEvent, TODAY, events, isPastEvent } from '@/data/events'
import { getStudentRegistrations } from '@/data/store'
import { googleCalendarUrl } from '@/lib/calendar'
import { getSessionUser } from '@/lib/session'
import { getSiteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10" → { year: 2026, month: 10 }, falling back to TODAY's month. */
function parseMonth(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
      return { year, month }
    }
  }
  return { year: TODAY.getFullYear(), month: TODAY.getMonth() + 1 }
}

function shiftMonth(year: number, month: number, by: number) {
  const index = year * 12 + (month - 1) + by
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; view?: string }
}) {
  const user = getSessionUser()
  const isStudent = user?.role === 'student'
  const { year, month } = parseMonth(searchParams.month)
  const monthKey = `${year}-${pad(month)}`
  const mineOnly = isStudent && searchParams.view === 'mine'

  const registeredIds = new Set<string>()
  if (isStudent) {
    const { upcoming, past } = getStudentRegistrations(user.id)
    for (const entry of [...upcoming, ...past])
      registeredIds.add(entry.event.id)
  }

  const inMonth = events
    .filter((e) => !e.cancelled && e.date.startsWith(monthKey))
    .filter((e) => !mineOnly || registeredIds.has(e.id))
    .sort((a, b) => a.date.localeCompare(b.date))
  const byDay = new Map<string, CampusEvent[]>()
  for (const event of inMonth) {
    const day = event.date.slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), event])
  }

  // Grid cells from the Monday on or before the 1st to fill whole weeks.
  const firstWeekday =
    (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayKey = `${TODAY.getFullYear()}-${pad(TODAY.getMonth() + 1)}-${pad(TODAY.getDate())}`
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    'en-IN',
    {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    },
  )
  const viewParam = mineOnly ? '&view=mine' : ''
  const siteUrl = getSiteUrl()

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 20 }}>
        <span className="eyebrow-tag">calendar</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>Event calendar</h1>
        <p style={{ marginTop: 8 }}>
          {isStudent
            ? 'Events you’re registered for are highlighted in green. Add them to Google Calendar or download them for any calendar app — each comes with reminders one day and one hour before.'
            : 'Every event on the board, by date.'}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href={`/calendar?month=${shiftMonth(year, month, -1)}${viewParam}`}
            className="btn btn-secondary"
            style={{ padding: '6px 12px' }}
            aria-label="Previous month"
          >
            ←
          </Link>
          <h2 style={{ fontSize: 20, minWidth: 170, textAlign: 'center' }}>
            {monthLabel}
          </h2>
          <Link
            href={`/calendar?month=${shiftMonth(year, month, 1)}${viewParam}`}
            className="btn btn-secondary"
            style={{ padding: '6px 12px' }}
            aria-label="Next month"
          >
            →
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isStudent && (
            <>
              <Link
                href={`/calendar?month=${monthKey}${mineOnly ? '' : '&view=mine'}`}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 13.5 }}
              >
                {mineOnly ? 'Show all events' : 'Only my registrations'}
              </Link>
              <a
                href="/registrations/ics"
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: 13.5 }}
              >
                Download my events (.ics)
              </a>
            </>
          )}
        </div>
      </div>

      <div
        className="card-surface calendar-grid"
        role="grid"
        aria-label={`Events in ${monthLabel}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        }}
      >
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            role="columnheader"
            style={{
              padding: '8px 6px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-soft)',
              borderBottom: '1.5px solid var(--line)',
              textAlign: 'center',
            }}
          >
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          const key = day ? `${monthKey}-${pad(day)}` : `blank-${index}`
          const dayEvents = day ? (byDay.get(key) ?? []) : []
          const isToday = key === todayKey
          return (
            <div
              key={key}
              role="gridcell"
              data-day={day ? key : undefined}
              style={{
                minHeight: 96,
                padding: 6,
                borderRight: index % 7 === 6 ? 'none' : '1px solid var(--line)',
                borderBottom:
                  index < cells.length - 7 ? '1px solid var(--line)' : 'none',
                background: day ? 'var(--paper-raised)' : 'var(--paper)',
                outline: isToday ? '2px solid var(--amber)' : undefined,
                outlineOffset: -2,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {day && (
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--amber-ink)' : 'var(--ink-soft)',
                  }}
                >
                  {day}
                  {isToday && ' · today'}
                </span>
              )}
              {dayEvents.map((event) => {
                const mine = registeredIds.has(event.id)
                const past = isPastEvent(event)
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    title={`${event.name} · ${formatTime(event.date)} · ${event.venue}`}
                    className="calendar-chip"
                    data-registered={mine ? 'true' : undefined}
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      lineHeight: 1.3,
                      padding: '3px 5px',
                      borderRadius: 'var(--radius)',
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      background: mine ? 'var(--green-bg)' : 'var(--slate-bg)',
                      color: mine ? 'var(--green)' : 'var(--ink)',
                      fontWeight: mine ? 600 : 500,
                      opacity: past ? 0.55 : 1,
                    }}
                  >
                    {formatTime(event.date)} {event.name}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      <h2 style={{ fontSize: 20, margin: '32px 0 14px' }}>
        {mineOnly ? 'Your events' : 'Events'} in {monthLabel} ({inMonth.length})
      </h2>
      {inMonth.length === 0 ? (
        <p style={{ fontSize: 14 }}>
          {mineOnly
            ? 'You have no registrations this month.'
            : 'Nothing scheduled this month.'}
        </p>
      ) : (
        <ul style={{ display: 'grid', gap: 10 }}>
          {inMonth.map((event) => {
            const mine = registeredIds.has(event.id)
            const past = isPastEvent(event)
            return (
              <li
                key={event.id}
                className="card-surface"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  opacity: past ? 0.7 : 1,
                }}
              >
                <div>
                  <Link
                    href={`/events/${event.id}`}
                    style={{
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {event.name}
                  </Link>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                    {new Date(event.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    , {formatTime(event.date)} · {event.venue}
                    {mine && (
                      <strong style={{ color: 'var(--green)' }}>
                        {' '}
                        · Registered
                      </strong>
                    )}
                    {past && ' · Past'}
                  </div>
                </div>
                {mine && !past && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a
                      href={googleCalendarUrl(event, siteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 13 }}
                    >
                      Add to Google Calendar
                    </a>
                    <a
                      href={`/events/${event.id}/ics`}
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 13 }}
                    >
                      .ics
                    </a>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
