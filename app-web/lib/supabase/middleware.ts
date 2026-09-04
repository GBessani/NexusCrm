import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: nao colocar logica entre createServerClient e getUser()
  // Protege contra lentidao do Supabase: se demorar demais, nao derruba o app
  // (evita 504 MIDDLEWARE_INVOCATION_TIMEOUT). Em caso de timeout, trata como
  // "sem usuario confirmado" e deixa a navegacao seguir seu curso normal.
  let user = null
  try {
    const resultado = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null } }), 4000)
      ),
    ])
    user = resultado.data.user
  } catch {
    user = null
  }

  // rotas publicas (sem login)
  const publicas = ['/login', '/auth']
  const ehPublica = publicas.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
