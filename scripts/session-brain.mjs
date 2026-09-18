#!/usr/bin/env node
/**
 * Session brain — ringkasan otak bersama untuk semua session project sevenbro.
 * Jalankan: node scripts/session-brain.mjs
 */
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" }).trim()
  } catch (e) {
    return `(error: ${e.message})`
  }
}

function readSafe(p) {
  try {
    return readFileSync(join(root, p), "utf8")
  } catch {
    return ""
  }
}

function extractSection(md, heading) {
  const lines = md.split(/\r?\n/)
  const out = []
  let on = false
  for (const line of lines) {
    if (line.startsWith("#")) {
      on = line.includes(heading)
      if (on) out.push(line)
      continue
    }
    if (on) out.push(line)
  }
  return out.join("\n").trim()
}

const branch = sh("git rev-parse --abbrev-ref HEAD")
const last = sh("git log -5 --oneline")
const dirty = sh("git status --short")
const progress = readSafe("docs/PROGRESS.md")
const sync = readSafe("docs/SESSION_SYNC.md")

const done = extractSection(progress, "Selesai")
const open = extractSection(progress, "Open")
const decisions = extractSection(sync, "Keputusan sinkron")

console.log("=== SEVEN BRO · SESSION BRAIN ===")
console.log(`Workspace: ${root}`)
console.log(`Branch: ${branch}`)
console.log("\n--- Last commits ---\n" + last)
console.log("\n--- Working tree ---\n" + (dirty || "(clean)"))
console.log("\n--- Open items (PROGRESS.md) ---\n" + open.slice(0, 800))
console.log("\n--- Decisions (SESSION_SYNC.md) ---\n" + decisions.slice(0, 1200))
console.log("\n--- Wajib baca ---\nAGENTS.md · docs/SESSION_SYNC.md · docs/PROGRESS.md · docs/ROLE_UI.md")
