// In-app notifications for every account, and the announcements organizers
// post to an event. Pinned to globalThis like the other stores.

export type NotificationType =
  | 'registration' // you registered (or were added to a team)
  | 'registration-cancelled' // you cancelled a registration
  | 'reminder' // an event you're registered for is coming up
  | 'cancellation' // the organizer cancelled an event you were registered for
  | 'reschedule' // the organizer changed the date, time or venue
  | 'announcement' // the organizer posted an announcement
  | 'new-registration' // (organizers) someone registered for your event

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  eventId?: string
  createdAt: string // ISO date string
  read: boolean
  /** Stops the same automatic notification (e.g. a reminder) being sent twice. */
  key?: string
}

export interface Announcement {
  id: string
  eventId: string
  organizerId: string
  message: string
  createdAt: string
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  registration: 'Registration',
  'registration-cancelled': 'Cancelled by you',
  reminder: 'Reminder',
  cancellation: 'Event cancelled',
  reschedule: 'Event changed',
  announcement: 'Announcement',
  'new-registration': 'New registration',
}

const shared = globalThis as typeof globalThis & {
  __campusNotifications?: AppNotification[]
  __campusAnnouncements?: Announcement[]
  __campusNotificationSeq?: { ntf: number; ann: number }
}

export const notifications: AppNotification[] =
  (shared.__campusNotifications ??= [])
export const announcements: Announcement[] = (shared.__campusAnnouncements ??=
  [])
const seq = (shared.__campusNotificationSeq ??= { ntf: 0, ann: 0 })

/**
 * Sends a notification. With a `key`, a second call with the same key for
 * the same user is ignored and returns undefined.
 */
export function notify(
  userId: string,
  input: Pick<AppNotification, 'type' | 'title' | 'message'> &
    Partial<Pick<AppNotification, 'eventId' | 'key'>>,
): AppNotification | undefined {
  if (
    input.key &&
    notifications.some((n) => n.userId === userId && n.key === input.key)
  ) {
    return undefined
  }
  const notification: AppNotification = {
    id: `ntf-${++seq.ntf}`,
    userId,
    createdAt: new Date().toISOString(),
    read: false,
    ...input,
  }
  notifications.push(notification)
  return notification
}

/** Newest first. */
export function listNotifications(userId: string): AppNotification[] {
  return notifications
    .filter((n) => n.userId === userId)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id, undefined, { numeric: true }),
    )
}

export function countUnread(userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.read).length
}

/** Marks one notification read. Returns false if it isn't the user's. */
export function markRead(userId: string, notificationId: string): boolean {
  const notification = notifications.find(
    (n) => n.id === notificationId && n.userId === userId,
  )
  if (!notification) return false
  notification.read = true
  return true
}

export function markAllRead(userId: string): number {
  let count = 0
  for (const n of notifications) {
    if (n.userId === userId && !n.read) {
      n.read = true
      count++
    }
  }
  return count
}

export function addAnnouncement(
  eventId: string,
  organizerId: string,
  message: string,
): Announcement {
  const announcement: Announcement = {
    id: `ann-${++seq.ann}`,
    eventId,
    organizerId,
    message,
    createdAt: new Date().toISOString(),
  }
  announcements.push(announcement)
  return announcement
}

/** Newest first. */
export function listAnnouncements(eventId: string): Announcement[] {
  return announcements
    .filter((a) => a.eventId === eventId)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        b.id.localeCompare(a.id, undefined, { numeric: true }),
    )
}
