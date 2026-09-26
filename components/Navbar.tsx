'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useNotifications } from './NotificationsProvider'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/registrations', label: 'My Registrations' },
  { href: '/organizer', label: 'Organizer' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { currentUser, switchAccount, allUsers, switching } = useAuth()
  const { status } = useNotifications()
  // The organizer account waiting for its access code, if any.
  const [pendingOrganizer, setPendingOrganizer] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const pendingName = allUsers.find((u) => u.id === pendingOrganizer)?.name

  async function pickAccount(id: string) {
    setError('')
    const target = allUsers.find((u) => u.id === id)
    if (target?.role === 'organizer') {
      setCode('')
      setPendingOrganizer(id)
      return
    }
    setPendingOrganizer(null)
    const result = await switchAccount(id)
    if (!result.ok) setError(result.error)
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault()
    if (!pendingOrganizer) return
    const result = await switchAccount(pendingOrganizer, code)
    if (result.ok) {
      setPendingOrganizer(null)
      setCode('')
      setError('')
    } else {
      setError(result.error)
    }
  }

  return (
    <header
      style={{
        borderBottom: '1.5px solid var(--line)',
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        className="shell site-header__bar"
        style={{
          // The organizer-code prompt is positioned against the whole bar,
          // so it never runs off the edge of a narrow screen.
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          height: 68,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--amber)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--ink)',
            }}
          >
            Campus Connect
          </span>
        </Link>

        <nav aria-label="Primary" className="site-header__nav">
          <ul style={{ display: 'flex', gap: 4 }}>
            {[
              ...LINKS.filter(
                (link) =>
                  link.href !== '/organizer' ||
                  currentUser?.role === 'organizer',
              ),
              ...(currentUser ? [] : [{ href: '/signup', label: 'Sign up' }]),
            ].map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius)',
                      fontSize: 14.5,
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: active ? 'var(--ink)' : 'var(--ink-soft)',
                      background: active ? 'var(--slate-bg)' : 'transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {currentUser && (
            <Link
              href="/notifications"
              aria-label={`Notifications${status.unread ? `, ${status.unread} unread` : ''}`}
              title="Notifications"
              style={{
                position: 'relative',
                display: 'inline-flex',
                padding: 6,
                borderRadius: 'var(--radius)',
                background: pathname.startsWith('/notifications')
                  ? 'var(--slate-bg)'
                  : 'transparent',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
                  stroke="var(--ink)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 20a2 2 0 0 0 4 0"
                  stroke="var(--ink)"
                  strokeWidth="1.6"
                />
              </svg>
              {status.unread > 0 && (
                <span
                  data-testid="unread-count"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: 'var(--rust)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: '18px',
                    textAlign: 'center',
                  }}
                >
                  {status.unread > 99 ? '99+' : status.unread}
                </span>
              )}
            </Link>
          )}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--ink-soft)',
            }}
          >
            <span className="eyebrow-tag" style={{ whiteSpace: 'nowrap' }}>
              {currentUser?.role ?? 'guest'}
            </span>
            <select
              aria-label="Switch current user"
              value={currentUser?.id ?? ''}
              disabled={switching}
              onChange={(e) => pickAccount(e.target.value)}
              style={{
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '6px 8px',
                fontSize: 13.5,
                background: 'var(--paper-raised)',
                color: 'var(--ink)',
              }}
            >
              <option value="">Signed out</option>
              {(['student', 'organizer'] as const).map((role) => (
                <optgroup
                  key={role}
                  label={role === 'student' ? 'Students' : 'Organizers'}
                >
                  {allUsers
                    .filter((user) => user.role === role)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>

          {(pendingOrganizer || error) && (
            <div
              className="card-surface"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 16,
                width: 'min(320px, calc(100vw - 32px))',
                padding: 16,
                zIndex: 20,
                boxShadow: '3px 3px 0 var(--ink)',
                display: 'grid',
                gap: 10,
              }}
            >
              {pendingOrganizer ? (
                <form
                  onSubmit={submitCode}
                  style={{ display: 'grid', gap: 10 }}
                >
                  <label
                    htmlFor="organizer-code"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    Organizer access code for {pendingName}
                  </label>
                  <input
                    id="organizer-code"
                    type="password"
                    autoComplete="off"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      error ? 'organizer-code-error' : undefined
                    }
                    style={{
                      padding: '8px 12px',
                      border: `1.5px solid ${error ? 'var(--rust)' : 'var(--line)'}`,
                      borderRadius: 'var(--radius)',
                      fontSize: 14,
                      background: 'var(--paper-raised)',
                      color: 'var(--ink)',
                    }}
                  />
                  {error && (
                    <span
                      id="organizer-code-error"
                      role="alert"
                      style={{ fontSize: 13, color: 'var(--rust)' }}
                    >
                      {error}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '7px 14px', fontSize: 13.5 }}
                      disabled={switching}
                    >
                      {switching ? 'Checking…' : 'Sign in as organizer'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '7px 14px', fontSize: 13.5 }}
                      onClick={() => {
                        setPendingOrganizer(null)
                        setError('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span
                    role="alert"
                    style={{ fontSize: 13, color: 'var(--rust)' }}
                  >
                    {error}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={() => setError('')}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
