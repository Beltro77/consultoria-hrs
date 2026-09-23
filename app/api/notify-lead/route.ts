import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

// Se llama desde el form público de /intake apenas se guarda un lead nuevo.
// Nunca debe bloquear ni romper el submit del prospecto: si el push falla
// o no está configurado, respondemos 200 igual (el lead ya quedó guardado).
export async function POST(req: NextRequest) {
  const { empresa, contactoNombre } = await req.json() as { empresa?: string; contactoNombre?: string }
  if (!empresa?.trim() || !contactoNombre?.trim()) {
    return NextResponse.json({ error: 'empresa y contactoNombre son requeridos' }, { status: 400 })
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!vapidPublicKey || !vapidPrivateKey || !serviceRoleKey) {
    console.error('Push no configurado: faltan VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY / SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ ok: false, reason: 'not_configured' })
  }

  webpush.setVapidDetails('mailto:beltran@catalizar.com.ar', vapidPublicKey, vapidPrivateKey)

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: subs, error } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  if (error) {
    console.error('Error leyendo push_subscriptions:', error)
    return NextResponse.json({ ok: false, reason: 'db_error' })
  }

  const payload = JSON.stringify({
    title: 'Nuevo lead en /intake',
    body: `${contactoNombre.trim()} — ${empresa.trim()}`,
    url: process.env.NEXT_PUBLIC_APP_URL || '/',
  })

  const staleIds: string[] = []
  await Promise.all((subs ?? []).map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        staleIds.push(sub.id)
      } else {
        console.error('Error enviando push:', err)
      }
    }
  }))

  if (staleIds.length) {
    await admin.from('push_subscriptions').delete().in('id', staleIds)
  }

  return NextResponse.json({ ok: true, sent: (subs?.length ?? 0) - staleIds.length })
}
