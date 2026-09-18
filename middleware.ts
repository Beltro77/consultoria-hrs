import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// El dominio intake.catalizar.com.ar está dedicado al form público de /intake.
// Si alguien entra a la raíz sin la ruta, lo mandamos directo al form en vez
// de mostrar el dashboard interno (que requiere login).
export function middleware(req: NextRequest) {
  if (req.headers.get('host') === 'intake.catalizar.com.ar') {
    return NextResponse.rewrite(new URL('/intake', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/',
}
