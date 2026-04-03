import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dm = DM_Sans({ subsets: ['latin'], variable: '--font-dm', weight: ['400', '500'] })

 export const metadata = {title: 'Catalizar HS',
  description: 'App de horas Catalizar',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Hrs' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0b0b0b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${dm.variable} font-sans`}>{children}</body>
    </html>
  )
}
