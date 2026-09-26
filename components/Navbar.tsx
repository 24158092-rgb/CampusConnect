'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/registrations', label: 'My Registrations' },
  { href: '/organizer', label: 'Organizer' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { currentUser, setCurrentUserId, allUsers, switching } = useAuth()

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
            onChange={(e) => setCurrentUserId(e.target.value)}
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
      </div>
    </header>
  )
}
