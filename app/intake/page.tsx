import type { Metadata } from 'next'
import IntakeForm from '@/components/intake/IntakeForm'

const TITLE = 'Contanos sobre tu empresa — Catalizar'
const DESCRIPTION = 'Un formulario breve para llegar con contexto a nuestra primera reunión.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    // TODO: agregar /public/og-intake.png (1200x630) con la marca Catalizar.
    // Mientras no exista, WhatsApp mostrará la tarjeta sin imagen.
    images: [{ url: '/og-intake.png', width: 1200, height: 630 }],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-intake.png'],
  },
}

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const { lead } = await searchParams
  return <IntakeForm leadRef={lead ?? null} />
}
