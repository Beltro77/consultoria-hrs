import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dm = DM_Sans({ subsets: ['latin'], variable: '--font-dm', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Consultoría Hrs',
  description: 'Seguimiento de horas y tareas de consultoría',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Consultoría Hrs' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1D9E75',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${dm.variable} font-sans`}>{children}</body>
    </html>
  )
}
