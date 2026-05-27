import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth

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
  },
  {
    callbacks: {
      authorized({ req, token }) {
        if (!token) return false
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/sell/:path*", "/dashboard/:path*", "/admin/:path*", "/library/:path*"],
}
