// FCM push — server sender
// Utama: FCM HTTP v1 + Service Account (tanpa server key legacy)
// Env:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY   (\n harus di-escape atau ganti literal newline)
// Opsional lama:
//   FCM_SERVER_KEY         (legacy — jarang masih ada)

import crypto from "crypto"
import { pathForNotification } from "./notif-nav"

const FCM_V1 = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
const FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"

export type PushPayload = {
  title: string
  body: string
  kind?: string | null
  path?: string | null
}

function env(name: string): string {
  return (process.env[name] || "").trim()
}

function privateKeyPem(): string {
  let key = env("FIREBASE_PRIVATE_KEY")
  if (!key) return ""
  key = key.replace(/\\n/g, "\n")
  return key
}

export function pushConfigured(): boolean {
  if (env("FIREBASE_PROJECT_ID") && env("FIREBASE_CLIENT_EMAIL") && privateKeyPem()) {
    return true
  }
  return Boolean(env("FCM_SERVER_KEY"))
}

export function pushPathForKind(
  kind?: string | null,
  title?: string | null,
  body?: string | null,
): string {
  return pathForNotification(kind, title, body)
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

async function getV1AccessToken(): Promise<string | null> {
  const email = env("FIREBASE_CLIENT_EMAIL")
  const key = privateKeyPem()
  if (!email || !key) return null
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claims}`
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(unsigned)
  const signature = signer.sign(key)
  const jwt = `${unsigned}.${b64url(signature)}`
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    })
    if (!res.ok) return null
    const b = (await res.json().catch(() => null)) as { access_token?: string } | null
    return b?.access_token || null
  } catch {
    return null
  }
}

async function sendFcmV1(
  tokens: string[],
  payload: PushPayload,
): Promise<number> {
  const projectId = env("FIREBASE_PROJECT_ID")
  const token = await getV1AccessToken()
  if (!projectId || !token || tokens.length === 0) return 0
  const data: Record<string, string> = {
    title: payload.title,
    body: payload.body,
    kind: payload.kind || "",
    path: payload.path || pushPathForKind(payload.kind, payload.title, payload.body),
  }
  let sent = 0
  for (const t of tokens) {
    try {
      const res = await fetch(FCM_V1(projectId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: t,
            // Data-only: WebView shell yang render notif + deep-link path
            // (kalau pakai "notification", Android buka launcher default tanpa path)
            data,
            android: { priority: "high" },
          },
        }),
      })
      if (res.ok) sent += 1
    } catch {
      /* silent */
    }
  }
  return sent
}

async function sendFcmLegacy(tokens: string[], payload: PushPayload): Promise<number> {
  const key = env("FCM_SERVER_KEY")
  if (!key || tokens.length === 0) return 0
  const data = {
    title: payload.title,
    body: payload.body,
    kind: payload.kind || "",
    path: payload.path || pushPathForKind(payload.kind, payload.title, payload.body),
  }
  let sent = 0
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500)
    try {
      const res = await fetch(FCM_LEGACY_URL, {
        method: "POST",
        headers: {
          Authorization: `key=${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: chunk,
          priority: "high",
          data,
        }),
      })
      if (res.ok) {
        const b = (await res.json().catch(() => null)) as { success?: number } | null
        sent += Number(b?.success || chunk.length)
      }
    } catch {
      /* silent */
    }
  }
  return sent
}

/** Kirim ke token device. Prioritas: FCM v1 (service account) → legacy key */
export async function sendFcmPush(
  tokens: string[],
  payload: PushPayload,
): Promise<number> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))]
  if (!unique.length) return 0
  if (env("FIREBASE_PROJECT_ID") && env("FIREBASE_CLIENT_EMAIL") && privateKeyPem()) {
    return sendFcmV1(unique, payload)
  }
  return sendFcmLegacy(unique, payload)
}
