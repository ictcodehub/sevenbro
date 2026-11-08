import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createAdminClient } from "@/lib/db"
import { resolveEffectiveRole } from "@/lib/roles"
import { normalizeEmail } from "@/lib/login-allowlist"
import { canSignInEmail } from "@/lib/sign-in-guard"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Selalu tampilkan pilih akun Google — jangan auto-login akun terakhir
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user }) {
      // Advanced security: domain sekolah + siswa/guru/homeroom/allowlist
      return canSignInEmail(user.email)
    },
    async jwt({ token, account, user, trigger }) {
      // Refresh role:
      // DB dicek saat trigger update, atau jika sudah lewat ROLE_REFRESH_MS (30 detik).
      // Memastikan pergantian posisi siswa di roster langsung aktif saat refresh/navigasi.
      // Server-side requireApi tetap fresh per-request, jadi keamanan selalu terjamin.
      const ROLE_REFRESH_MS = 30 * 1000

      if (account && user?.email) {
        try {
          const email = normalizeEmail(user.email)
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
          token.roleCheckedAt = Date.now()
        } catch {
          token.userId = token.userId ?? null
          token.dbRole = token.dbRole ?? "PENDING"
          token.effectiveRole = token.effectiveRole ?? "PENDING"
        }
      } else if (token.email) {
        // Bukan login — session di-refetch client. Cek topi baru di DB kalau sudah waktunya atau trigger update.
        const last = (token.roleCheckedAt as number | undefined) ?? 0
        const isExpired = Date.now() - last > ROLE_REFRESH_MS
        const isUpdateTrigger = (trigger as string | undefined) === "update"
        if (isExpired || isUpdateTrigger) {
          token.roleCheckedAt = Date.now()
          try {
            const email = normalizeEmail(token.email)
            const db = createAdminClient()
            const { data: userRow } = await db
              .from("users")
              .select("id, role")
              .eq("email", email)
              .maybeSingle()
            if (userRow) {
              token.userId = userRow.id
              token.dbRole = userRow.role
              let studentId: string | null = null
              let classId: string | null = null
              let studentPosition: string | null = null
              if (userRow.role === "STUDENT") {
                const { data: student } = await db
                  .from("students")
                  .select("id, class_id, position")
                  .eq("email", email)
                  .eq("active", true)
                  .maybeSingle()
                studentId = student?.id ?? null
                classId = student?.class_id ?? null
                studentPosition = student?.position ?? null
              } else if (userRow.role === "HOMEROOM") {
                const { data: cls } = await db
                  .from("classes")
                  .select("id")
                  .eq("homeroom_email", email)
                  .maybeSingle()
                classId = cls?.id ?? null
              } else if (userRow.role === "TEACHER") {
                const { data: t } = await db
                  .from("teachers")
                  .select("class_id")
                  .eq("email", email)
                  .maybeSingle()
                classId = t?.class_id ?? null
              }
              token.studentId = studentId
              token.classId = classId
              token.effectiveRole = resolveEffectiveRole(userRow.role, studentPosition)
            }
          } catch {
            // DB gagal → pertahankan role lama (server tetap fresh per-request)
          }
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
