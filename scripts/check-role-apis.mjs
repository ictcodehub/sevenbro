// Localhost role guard check against a running next dev server.
// Usage: node scripts/check-role-apis.mjs
import { encode } from "next-auth/jwt"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      if (!(m[1] in process.env)) process.env[m[1]] = m[2]
    }
  } catch {}
}
loadEnv(".env.local")

const BASE = process.env.NEXTAUTH_URL || "http://localhost:3000"
const secret = process.env.NEXTAUTH_SECRET
if (!secret) throw new Error("NEXTAUTH_SECRET missing")

const ACCOUNTS = [
  { label: "HOMEROOM", email: "tio@mutiarabangsa.sch.id", role: "HOMEROOM" },
  { label: "BENDAHARA", email: "paupau@mutiarabangsa.sch.id", role: "BENDAHARA" },
  { label: "KETUA", email: "edmundgracio@mutiarabangsa.sch.id", role: "KETUA" },
  { label: "SEKRETARIS", email: "andra@mutiarabangsa.sch.id", role: "SEKRETARIS" },
  { label: "ANGGOTA", email: "erica@mutiarabangsa.sch.id", role: "ANGGOTA" },
  { label: "TEACHER", email: "teacher@mutiarabangsa.sch.id", role: "TEACHER" },
]

async function mint(email, role) {
  const token = {
    name: email.split("@")[0],
    email,
    sub: email,
    userId: "test",
    dbRole: role === "HOMEROOM" ? "HOMEROOM" : role === "TEACHER" ? "TEACHER" : "STUDENT",
    effectiveRole: role,
    studentId: null,
    classId: null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    jti: randomUUID(),
  }
  return encode({ token, secret })
}

const ENDPOINTS = [
  { path: "/api/auth/session", expect: 200 },
  { path: "/api/kas/summary", expect: 200, studentOnly: true },
  { path: "/api/kas/transactions", expect: 200, studentOnly: true },
  {
    path: "/api/admin/students",
    expect: [200, 403],
    // manage/view kas + give points + admin allowed
    allowed: ["HOMEROOM", "BENDAHARA", "TEACHER", "KETUA", "SEKRETARIS", "ANGGOTA"],
  },
  { path: "/api/kas/collect", method: "POST", body: { studentIds: [] }, expect: [400, 403], allowStatus: true },
  { path: "/api/kas/tunggak?amountPer=2000", expect: [200, 403] },
]

function expectedStatus(acct, ep) {
  if (ep.path === "/api/admin/students") return 200
  if (ep.path.startsWith("/api/kas/tunggak")) {
    return ["HOMEROOM", "BENDAHARA"].includes(acct.role) ? 200 : 403
  }
  if (ep.path === "/api/kas/collect") {
    return ["HOMEROOM", "BENDAHARA"].includes(acct.role) ? 400 : 403
  }
  if (ep.studentOnly) {
    return acct.role === "TEACHER" ? 403 : 200
  }
  return 200
}

let failures = 0
for (const acct of ACCOUNTS) {
  const cookieVal = await mint(acct.email, acct.role)
  const cookie = `next-auth.session-token=${cookieVal}`
  console.log(`\n=== ${acct.label} (${acct.email}) ===`)
  for (const ep of ENDPOINTS) {
    const url = BASE + ep.path
    const init = {
      method: ep.method || "GET",
      headers: { Cookie: cookie, Accept: "application/json" },
      redirect: "manual",
    }
    if (ep.body) {
      init.headers["Content-Type"] = "application/json"
      init.body = JSON.stringify(ep.body)
    }
    let status = 0
    let snippet = ""
    try {
      const res = await fetch(url, init)
      status = res.status
      const text = await res.text()
      snippet = text.slice(0, 80).replace(/\s+/g, " ")
      if (ep.path === "/api/auth/session") {
        let role = "?"
        try {
          role = JSON.parse(text)?.user?.role ?? "?"
        } catch {}
        const ok = role === acct.role
        if (!ok) failures++
        console.log(`${ok ? "OK" : "FAIL"}  session.role=${role} expected=${acct.role}`)
        continue
      }
    } catch (e) {
      console.log(`FAIL  ${ep.path} network ${e.message}`)
      failures++
      continue
    }
    const want = expectedStatus(acct, ep)
    const ok = status === want
    if (!ok) failures++
    console.log(`${ok ? "OK" : "FAIL"}  ${ep.method || "GET"} ${ep.path} → ${status} (want ${want}) ${snippet}`)
  }
}

console.log(failures === 0 ? "\nALL ROLE API CHECKS PASSED" : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
