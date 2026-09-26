// Calendar export: "Add to Google Calendar" links.
//
// Event dates in the store have no time zone ("2026-10-04T18:00:00"); they
// are campus times, i.e. India Standard Time (UTC+5:30, no daylight saving).

import type { CampusEvent } from '@/data/events'

const IST_OFFSET_MINUTES = 330
/** Events have no end time in the store, so calendars get a 2-hour slot. */
export const EVENT_DURATION_MINUTES = 120

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** "2026-10-04T18:00:00" (IST) → epoch ms. */
function istToEpoch(localIso: string): number {
  const [datePart, timePart = '00:00:00'] = localIso.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm, ss = 0] = timePart.split(':').map(Number)
  return Date.UTC(y, m - 1, d, hh, mm, ss) - IST_OFFSET_MINUTES * 60 * 1000
}

/** Epoch ms → "20261004T123000Z". */
function utcStamp(epoch: number): string {
  const d = new Date(epoch)
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

export function eventTimes(event: Pick<CampusEvent, 'date'>) {
  const start = istToEpoch(event.date)
  const end = start + EVENT_DURATION_MINUTES * 60 * 1000
  return { start: utcStamp(start), end: utcStamp(end) }
}

export function googleCalendarUrl(
  event: Pick<CampusEvent, 'id' | 'name' | 'description' | 'date' | 'venue'>,
  siteUrl?: string,
): string {
  const { start, end } = eventTimes(event)
  const details = [
    event.description,
    siteUrl ? `Event page: ${siteUrl}/events/${event.id}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${start}/${end}`,
    details,
    location: event.venue,
    ctz: 'Asia/Kolkata',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
