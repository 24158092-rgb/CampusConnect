// Calendar export: "Add to Google Calendar" links and .ics files that work
// with Google Calendar, Apple Calendar and Outlook.
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

/** Escapes a value for an iCalendar TEXT property (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Folds a content line to at most 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = Buffer.byteLength(char)
    const limit = parts.length === 0 ? 75 : 74 // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export interface IcsOptions {
  /** Used for the event URL and the calendar's name. */
  siteUrl?: string
  calendarName?: string
  /** Fixed "now" for DTSTAMP, so output is testable. */
  now?: Date
}

/**
 * An iCalendar file with one VEVENT per event. Each event carries two
 * alarms, so the calendar app reminds the student automatically: one day
 * before and one hour before.
 */
export function buildIcs(
  events: CampusEvent[],
  options: IcsOptions = {},
): string {
  const stamp = utcStamp((options.now ?? new Date()).getTime())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Connect//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.calendarName ?? 'Campus Connect')}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ]
  for (const event of events) {
    const { start, end } = eventTimes(event)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@campus-connect`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(event.name)}`,
      `DESCRIPTION:${escapeText(event.description || event.name)}`,
      `LOCATION:${escapeText(event.venue)}`,
      `CATEGORIES:${escapeText(event.category)}`,
      `STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    )
    if (options.siteUrl) lines.push(`URL:${options.siteUrl}/events/${event.id}`)
    for (const [trigger, label] of [
      ['-P1D', 'tomorrow'],
      ['-PT1H', 'in 1 hour'],
    ]) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `TRIGGER:${trigger}`,
        `DESCRIPTION:${escapeText(`${event.name} starts ${label}`)}`,
        'END:VALARM',
      )
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** A safe file name for a download. */
export function icsFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'event'}.ics`
}
