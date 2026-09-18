'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Card, Input, Textarea, Select, Label, Btn } from '@/components/ui'
import { NECESIDAD_OPTIONS, submitIntakeLead } from '@/lib/services/intakeLeads.service'

const PLAZO_OPTIONS = [
  'Inmediato',
  '1 a 3 meses',
  '3 a 6 meses',
  'Más de 6 meses',
  'Todavía no lo sé',
]

const CARGO_OPTIONS = [
  'Dueño',
  'Gerente',
  'Analista de compras',
  'Analista operativo',
  'Analista administrativo',
  'Coordinador',
  'Otro',
]

const SUCURSALES_OPTIONS = [
  'Entre 1 y 10',
  'Entre 11 y 20',
  'Entre 21 y 50',
  'Entre 51 y 100',
  'Entre 100 y 200',
  'Más de 200',
]

const URL_RE = /^https?:\/\/.+\..+/i

function Header() {
  return (
    <header className="bg-white border-b border-stone-100 px-4 py-4 sticky top-0 z-10">
      <div className="max-w-lg mx-auto flex items-center gap-2.5">
        <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
        <span className="text-[17px] font-medium text-stone-800">Catalizar</span>
      </div>
    </header>
  )
}

function ThankYou() {
  return (
    <div className="min-h-screen bg-[#f5f5f2] flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            ✓
          </div>
          <h1 className="text-lg font-medium text-stone-800 mb-2">¡Gracias!</h1>
          <p className="text-sm text-stone-500">
            Recibimos tu información. Vamos a llegar a la reunión con contexto sobre tu empresa.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function IntakeForm({ leadRef }: { leadRef: string | null }) {
  const [empresa, setEmpresa] = useState('')
  const [contactoNombre, setContactoNombre] = useState('')
  const [contactoPosicion, setContactoPosicion] = useState('')
  const [sitioWeb, setSitioWeb] = useState('')
  const [direccion, setDireccion] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [cantidadSucursales, setCantidadSucursales] = useState('')
  const [cantidadPersonal, setCantidadPersonal] = useState('')
  const [plazoProyecto, setPlazoProyecto] = useState('')
  const [necesidad, setNecesidad] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no permite compartir ubicación. Escribí la dirección a mano.')
      return
    }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
      },
      () => {
        setGeoError('No pudimos obtener tu ubicación. Escribí la dirección a mano, no pasa nada.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSubmit() {
    if (loading) return
    if (!empresa.trim() || !contactoNombre.trim() || !necesidad.trim()) {
      setError('Completá empresa, tu nombre y contanos qué necesitás.')
      return
    }
    if (sitioWeb.trim() && !URL_RE.test(sitioWeb.trim())) {
      setError('Revisá el sitio web (ej: https://tuempresa.com), o dejalo vacío.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await submitIntakeLead({
        empresa,
        contactoNombre,
        contactoPosicion,
        sitioWeb,
        direccion,
        cantidadSucursales: cantidadSucursales || undefined,
        cantidadPersonal: cantidadPersonal ? Number(cantidadPersonal) : undefined,
        plazoProyecto,
        necesidad,
        observaciones,
        latitud: coords?.lat,
        longitud: coords?.lng,
        leadRef,
      })
      setSubmitted(true)
    } catch {
      setError('No pudimos enviar el formulario. Probá de nuevo en un momento.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return <ThankYou />

  return (
    <div className="min-h-screen bg-[#f5f5f2] flex flex-col">
      <Header />

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <h1 className="text-lg font-medium text-stone-800 mb-1">Contanos sobre tu empresa</h1>
        <p className="text-sm text-stone-500 mb-5">
          Antes de nuestra reunión, ayudanos con estos datos para llegar con contexto. Toma un minuto.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <Card>
          <Label>Empresa *</Label>
          <Input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Nombre de tu empresa" autoComplete="organization" />

          <Label>Tu nombre *</Label>
          <Input value={contactoNombre} onChange={e => setContactoNombre(e.target.value)} placeholder="Nombre y apellido" autoComplete="name" />

          <Label>Tu cargo</Label>
          <Select value={contactoPosicion} onChange={e => setContactoPosicion(e.target.value)}>
            <option value="">Seleccioná una opción</option>
            {CARGO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </Select>

          <Label>Sitio web</Label>
          <Input type="url" value={sitioWeb} onChange={e => setSitioWeb(e.target.value)} placeholder="https://tuempresa.com" autoCapitalize="none" autoCorrect="off" />

          <Label>Dirección</Label>
          <Input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Dirección de la oficina o planta" autoComplete="street-address" />
          <button
            type="button"
            onClick={handleUseLocation}
            className="mt-1.5 text-xs font-medium text-accent-dark"
          >
            {geoLoading
              ? 'Obteniendo ubicación…'
              : coords
              ? '📍 Ubicación guardada — volver a marcar'
              : '📍 Estoy ahora en esa dirección, usar mi ubicación'}
          </button>
          {geoError && <p className="text-xs text-red-600 mt-1">{geoError}</p>}
          <p className="text-[11px] text-stone-400 mt-1">
            Usalo solo si estás en la oficina o planta ahora. Si respondés desde tu casa (home office), dejalo así y solo completá la dirección arriba.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sucursales</Label>
              <Select value={cantidadSucursales} onChange={e => setCantidadSucursales(e.target.value)}>
                <option value="">Elegí un rango</option>
                {SUCURSALES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <Label>Personal</Label>
              <Input type="number" inputMode="numeric" min={0} value={cantidadPersonal} onChange={e => setCantidadPersonal(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Label>Plazo del proyecto</Label>
          <Select value={plazoProyecto} onChange={e => setPlazoProyecto(e.target.value)}>
            <option value="">Seleccioná una opción</option>
            {PLAZO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </Select>

          <Label>¿Qué necesitás? *</Label>
          <Select value={necesidad} onChange={e => setNecesidad(e.target.value)}>
            <option value="">Seleccioná una opción</option>
            {NECESIDAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>

          <Label>Observaciones</Label>
          <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Algo más que quieras contarnos (opcional)" rows={3} />
        </Card>

        <div className="mt-5">
          <Btn onClick={handleSubmit} className="!py-3.5 text-base">
            {loading ? 'Enviando...' : 'Enviar'}
          </Btn>
        </div>
      </main>
    </div>
  )
}
