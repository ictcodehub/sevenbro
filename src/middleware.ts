import { withAuth } from "next-auth/middleware"

export default withAuth({ pages: { signIn: "/login" } })

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|login|offline|icons|manifest.webmanifest|sw.js|apple-touch-icon.png|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
}