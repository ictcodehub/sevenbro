import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: { id?: string | null; role?: string } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string | null
    dbRole?: string
    effectiveRole?: string
    studentId?: string | null
    classId?: string | null
    roleCheckedAt?: number
    email?: string | null
  }
}
