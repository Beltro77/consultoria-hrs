import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en variables de entorno del servidor.' },
      { status: 500 },
    )
  }

  // Verify the caller is an authenticated consultant
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const callerClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  )

  const { data: isConsultant } = await callerClient.rpc('is_consultant')
  if (!isConsultant) {
    return NextResponse.json({ error: 'Acceso denegado: solo consultores pueden invitar miembros' }, { status: 403 })
  }

  const { email } = await req.json() as { email?: string }
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    data: { role: 'member' },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
  })

  if (error) {
    // User already exists → send password reset instead
    if (error.message.includes('already been registered') || error.status === 422) {
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(email.trim().toLowerCase())
      if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 400 })
      return NextResponse.json({ ok: true, method: 'reset' })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, method: 'invite' })
}
