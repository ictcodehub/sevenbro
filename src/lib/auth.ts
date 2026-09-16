import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createAdminClient } from "@/lib/db"
import { resolveEffectiveRole } from "@/lib/roles"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      return user.email?.endsWith("@mutiarabangsa.sch.id") ?? false
    },
    async jwt({ token, account, user }) {
      if (account && user?.email) {
        try {
          const email = user.email
          const db = createAdminClient()
          const { data: upserted } = await db
            .from("users")
            .upsert({ email, name: user.name ?? null }, { onConflict: "email" })
            .select("id, role")
            .single()

          token.userId = upserted?.id ?? null
          token.dbRole = upserted?.role ?? "PENDING"
          token.email = email

          let studentId: string | null = null
          let classId: string | null = null
          let studentPosition: string | null = null

          if (upserted?.role === "STUDENT") {
            const { data: student } = await db
              .from("students")
              .select("id, class_id, position")
              .eq("email", email)
              .eq("active", true)
              .maybeSingle()
            studentId = student?.id ?? null
            classId = student?.class_id ?? null
            studentPosition = student?.position ?? null
          } else if (upserted?.role === "HOMEROOM") {
            const { data: cls } = await db
              .from("classes")
              .select("id")
              .eq("homeroom_email", email)
              .maybeSingle()
            classId = cls?.id ?? null
          } else if (upserted?.role === "TEACHER") {
            const { data: t } = await db
              .from("teachers")
              .select("class_id")
              .eq("email", email)
              .maybeSingle()
            classId = t?.class_id ?? null
          }

          token.studentId = studentId
          token.classId = classId
          token.effectiveRole = resolveEffectiveRole(upserted?.role, studentPosition)
        } catch {
          token.userId = token.userId ?? null
          token.dbRole = token.dbRole ?? "PENDING"
          token.effectiveRole = token.effectiveRole ?? "PENDING"
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | null) ?? null
        session.user.role =
          (token.effectiveRole as string | undefined) ??
          (token.dbRole as string | undefined) ??
          "PENDING"
      }
      return session
    },
  },
  pages: { signIn: "/login" },
}
