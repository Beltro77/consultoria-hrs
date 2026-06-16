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

  const { email } = await req.json() as { email?: string }
  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Invite creates the user if they don't exist, sends magic link
  const { error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    data: { role: 'member' },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL ?? undefined,
  })

  if (error) {
    // If user already exists, fall back to password reset
    if (error.message.includes('already been registered') || error.status === 422) {
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(email.trim().toLowerCase())
      if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 400 })
      return NextResponse.json({ ok: true, method: 'reset' })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, method: 'invite' })
}
