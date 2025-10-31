import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow unauthenticated access to /login and all /api routes
  if (pathname === "/login" || pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
// const cookieStore = await cookies()
//   const cookieValue = cookieStore.get('user')?.value
//   const cookieObject = cookieValue ? JSON.parse(cookieValue) : null
//   console.log('cookie object is ')
//   console.log(cookieObject)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
            console.log('cookies are')
            console.log(request.cookies.getAll())
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('session is')
  console.log(session)

  // Redirect to login if no session
  if (!session) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
}
