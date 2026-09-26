import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CancellationNotices from '@/components/CancellationNotices'
import { users } from '@/data/auth'
import { getPendingNotices } from '@/data/store'
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
          <Navbar />
          {user?.role === 'student' && (
            <CancellationNotices notices={getPendingNotices(user.id)} />
          )}
          <main style={{ minHeight: '70vh' }}>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
