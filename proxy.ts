import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = token.role as string

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (
    (pathname.startsWith("/sell") || pathname.startsWith("/dashboard")) &&
    role !== "SELLER" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/sell/:path*", "/dashboard/:path*", "/admin/:path*", "/library/:path*"],
}
