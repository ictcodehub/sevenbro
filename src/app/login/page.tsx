"use client"

import { signIn } from "next-auth/react"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { LogIn } from "lucide-react"
import { cn } from "@/lib/utils"

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback:
    "Sesi login terputus. Coba lagi — pastikan memakai akun sekolah @mutiarabangsa.sch.id.",
  OAuthAccountNotLinked:
    "Email Google ini sudah terpakai. Login dengan akun sekolah yang sama.",
  AccessDenied:
    "Akses ditolak. Hanya email terdaftar (siswa / guru / whitelist) di @mutiarabangsa.sch.id yang diizinkan.",
  Configuration: "Konfigurasi auth bermasalah. Hubungi admin kelas.",
  default: "Login gagal. Coba lagi atau hubungi homeroom.",
}

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(false)
  const searchParams = useSearchParams()
  const oauthError = searchParams.get("error")
  const showError = localError || Boolean(oauthError)
  const errorMessage = oauthError
    ? ERROR_MESSAGES[oauthError] ?? ERROR_MESSAGES.default
    : ERROR_MESSAGES.default

  return (
    <main className="min-h-dvh bg-page flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 p-8 bg-surface rounded-2xl shadow-lg w-80">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest text-white font-bold text-2xl">
          7B
        </div>
        <h1 className="text-xl font-bold text-ink">Seven Bro!</h1>
        <p className="text-xs text-ink-soft">Login dengan akun sekolah Anda</p>

        <button
          onClick={() => {
            setLoading(true)
            setLocalError(false)
            signIn("google", { callbackUrl: "/app" })
              .catch(() => setLocalError(true))
              .finally(() => setLoading(false))
          }}
          disabled={loading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface transition",
            loading && "opacity-50 cursor-not-allowed",
          )}
        >
          <LogIn className="h-5 w-5" />
          {loading ? "Mengarahkan..." : "Masuk dengan Google"}
        </button>

        {showError && (
          <p className="text-xs text-red-500 text-center leading-snug">{errorMessage}</p>
        )}

        <p className="text-xs text-ink-soft/60 text-center">
          Hanya siswa & guru Kelas 7B yang dapat mengakses aplikasi ini.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
