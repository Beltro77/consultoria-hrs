import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dm = DM_Sans({ subsets: ['latin'], variable: '--font-dm', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Consultoria Hrs',
  description: 'Seguimiento de horas y tareas',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Hrs' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f5f5f2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${dm.variable} font-sans`}>{children}</body>
    </html>
  )
}
