import dynamic from 'next/dynamic'

// AppShell is client-side only
const AppShell = dynamic(() => import('@/components/AppShell'), { ssr: false })

export default function Home() {
  return <AppShell />
}
