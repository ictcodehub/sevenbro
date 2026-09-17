// UI role checks on localhost using existing Chromium + minted next-auth cookie.
// Usage: node scripts/check-role-ui.mjs
import { createRequire } from "node:module"
import { encode } from "next-auth/jwt"
import { readFileSync, mkdirSync } from "node:fs"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"

const requireFrom = createRequire(path.join(process.env.TEMP || "/tmp", "sb-playwright/package.json"))
const { chromium } = requireFrom("playwright-core")

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      if (!(m[1] in process.env)) process.env[m[1]] = m[2]
    }
  } catch {}
}
loadEnv("D:/Workspace/sevenbro/.env.local")

const BASE = process.env.NEXTAUTH_URL || "http://localhost:3000"
const secret = process.env.NEXTAUTH_SECRET
const OUT = "D:/Workspace/sevenbro/.ui-check"
mkdirSync(OUT, { recursive: true })

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"

const CASES = [
  {
    label: "HOMEROOM",
    email: "tio@mutiarabangsa.sch.id",
    role: "HOMEROOM",
    expectNav: ["Beranda", "Info", "Agenda", "Kas", "Poin"],
    kas: {
      manageButtons: true,
      subtitleIncludes: "Centang siswa",
      setoran: true,
      iuranSaya: false,
    },
  },
  {
    label: "BENDAHARA",
    email: "paupau@mutiarabangsa.sch.id",
    role: "BENDAHARA",
    expectNav: ["Beranda", "Info", "Agenda", "Kas", "Poin"],
    kas: {
      manageButtons: true,
      subtitleIncludes: "Centang siswa",
      setoran: true,
      iuranSaya: false,
    },
  },
  {
    label: "KETUA",
    email: "edmundgracio@mutiarabangsa.sch.id",
    role: "KETUA",
    expectNav: ["Beranda", "Info", "Agenda", "Kas", "Poin"],
    kas: {
      manageButtons: false,
      subtitleIncludes: "Hanya dapat dilihat",
      setoran: false,
      iuranSaya: true,
    },
  },
  {
    label: "ANGGOTA",
    email: "erica@mutiarabangsa.sch.id",
    role: "ANGGOTA",
    expectNav: ["Beranda", "Info", "Agenda", "Kas", "Poin"],
    kas: {
      manageButtons: false,
      subtitleIncludes: "Hanya dapat dilihat",
      setoran: false,
      iuranSaya: true,
    },
  },
]

async function mint(email, role) {
  return encode({
    token: {
      name: email.split("@")[0],
      email,
      sub: email,
      userId: "test",
      dbRole: role === "HOMEROOM" ? "HOMEROOM" : "STUDENT",
      effectiveRole: role,
      studentId: null,
      classId: null,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      jti: randomUUID(),
    },
    secret,
  })
}

function textOf(s) {
  return s.replace(/\s+/g, " ")
}

let failures = 0
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
// warmup compile
{
  const warm = await context.newPage()
  await warm.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 })
  await warm.waitForTimeout(1000)
  await warm.close()
}

for (const c of CASES) {
  const cookieVal = await mint(c.email, c.role)
  await context.clearCookies()
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: cookieVal,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
  const page = await context.newPage()
  console.log(`\n=== ${c.label} ===`)

  // Warm session endpoint so role is available before UI paints
  const sess = await page.request.get(`${BASE}/api/auth/session`)
  const sessJson = await sess.json().catch(() => ({}))
  const sessRole = sessJson?.user?.role
  console.log(
    sessRole === c.role ? "OK" : "FAIL",
    `session.role=${sessRole} expected=${c.role}`,
  )
  if (sessRole !== c.role) failures++

  await page.goto(`${BASE}/app/kas`, { waitUntil: "domcontentloaded", timeout: 60000 })
  try {
    await page.getByText("Kas Kelas", { exact: false }).first().waitFor({ timeout: 15000 })
  } catch {
    /* fall through to assert */
  }
  await page.waitForTimeout(1500)
  const body = textOf(await page.locator("body").innerText())
  await page.screenshot({ path: `${OUT}/kas-${c.label}.png`, fullPage: true })

  const checks = [
    ["subtitle", body.includes(c.kas.subtitleIncludes)],
    [
      "Bayar Khusus",
      c.kas.manageButtons ? body.includes("Bayar Khusus") : !body.includes("Bayar Khusus"),
    ],
    [
      "Setoran Hari Ini",
      c.kas.setoran ? body.includes("Setoran Hari Ini") : !body.includes("Setoran Hari Ini"),
    ],
    ["Iuran saya", c.kas.iuranSaya ? body.includes("Iuran saya") : true],
    ["Buku Kas link", body.includes("Buku Kas")],
  ]
  for (const [name, ok] of checks) {
    if (!ok) failures++
    console.log(`${ok ? "OK" : "FAIL"}  kas ${name}`)
  }
  if (!body.includes(c.kas.subtitleIncludes)) {
    console.log(`      body snippet: ${body.slice(0, 220)}`)
  }

  for (const label of c.expectNav) {
    const ok = body.includes(label)
    if (!ok) failures++
    console.log(`${ok ? "OK" : "FAIL"}  nav has ${label}`)
  }

  await page.goto(`${BASE}/app/kas/buku`, { waitUntil: "domcontentloaded", timeout: 60000 })
  try {
    await page.getByText(/Buku|Ledger|Transaksi|Per Siswa/i).first().waitFor({ timeout: 12000 })
  } catch {}
  await page.waitForTimeout(1200)
  const bukuBody = textOf(await page.locator("body").innerText())
  await page.screenshot({ path: `${OUT}/buku-${c.label}.png`, fullPage: true })
  const bukuOk =
    bukuBody.includes("Buku") || bukuBody.includes("Transaksi") || bukuBody.includes("Per Siswa")
  if (!bukuOk) {
    failures++
    console.log(`FAIL  buku snippet: ${bukuBody.slice(0, 200)}`)
  } else {
    console.log("OK  buku kas page renders")
  }

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 60000 })
  try {
    await page.getByText("Saldo Kas").first().waitFor({ timeout: 12000 })
  } catch {}
  await page.waitForTimeout(1000)
  const homeBody = textOf(await page.locator("body").innerText())
  await page.screenshot({ path: `${OUT}/home-${c.label}.png`, fullPage: true })
  const hasSaldo = homeBody.includes("Saldo Kas")
  if (!hasSaldo) {
    failures++
    console.log(`FAIL  home kas card snippet: ${homeBody.slice(0, 200)}`)
  } else {
    console.log("OK  home shows kas card")
  }

  await page.close()
}

await browser.close()
console.log(failures === 0 ? "\nALL UI CHECKS PASSED" : `\n${failures} UI FAILURES`)
process.exit(failures === 0 ? 0 : 1)
