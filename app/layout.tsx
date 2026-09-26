import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AlertBanner from '@/components/AlertBanner'
import { NotificationsProvider } from '@/components/NotificationsProvider'
import { users } from '@/data/auth'
import { getNotificationStatus } from '@/data/store'
import { getOrganizerCode } from '@/lib/organizer'
import { getSessionUser } from '@/lib/session'

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
})
const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
})
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: 'Campus Connect',
  description: 'Find and register for events happening on campus.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = getSessionUser()
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <AuthProvider
          user={user && { id: user.id, name: user.name, role: user.role }}
          users={users.map(({ id, name, role }) => ({ id, name, role }))}
        >
          <NotificationsProvider
            initial={getNotificationStatus(user)}
            signedIn={!!user}
          >
            {/* The organizer bar and navbar stay pinned together at the top. */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              {/* Rendered on the server for organizers only, so the code
                never reaches a student's browser. */}
              {user?.role === 'organizer' && (
                <div
                  data-testid="organizer-code-bar"
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--paper)',
                    fontSize: 13.5,
                  }}
                >
                  <div
                    className="shell"
                    style={{
                      padding: '8px 24px',
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <span>Organizer access code:</span>
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--amber)',
                        color: 'var(--ink)',
                        padding: '1px 8px',
                        borderRadius: 'var(--radius)',
                        fontWeight: 600,
                      }}
                    >
                      {getOrganizerCode()}
                    </code>
                    <span style={{ opacity: 0.8 }}>
                      Only organizers can see this. Share it with other
                      organizers only.
                    </span>
                  </div>
                </div>
              )}
              <Navbar />
            </div>
            <AlertBanner />
            <main style={{ minHeight: '70vh' }}>{children}</main>
            <Footer />
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
