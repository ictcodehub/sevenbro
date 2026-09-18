#!/usr/bin/env node
/**
 * session-sync-workflow.mjs
 * Automation: load shared brain untuk SEMUA agentic tool (MiMo, Claude Code, Cursor, dll.)
 * Usage: node scripts/session-sync-workflow.mjs
 *        npm run session:sync
 */
import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const SYNC = join(root, "docs/SESSION_SYNC.md")

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
  } catch (e) {
    return `ERR ${String(e).slice(0, 120)}`
  }
}

function read(p) {
  try {
    const abs = p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) ? p : join(root, p)
    return readFileSync(abs, "utf8")
  } catch {
    return ""
  }
}

function section(md, title) {
  const lines = String(md).split(/\r?\n/)
  const out = []
  let on = false
  for (const line of lines) {
    if (line.startsWith("#")) {
      on = line.toLowerCase().includes(title.toLowerCase())
      if (on) out.push(line)
      continue
    }
    if (on) out.push(line)
  }
  return out.join("\n").trim()
}

const branch = sh("git rev-parse --abbrev-ref HEAD")
const last = sh("git log -8 --oneline")
const status = sh("git status --short")
const progress = read("docs/PROGRESS.md")
const sync = read(SYNC)
const agents = read("AGENTS.md")

const open = section(progress, "Open")
const decisions = section(sync, "Keputusan sinkron")

console.log("╔══════════════════════════════════════╗")
console.log("║  SESSION-SYNC WORKFLOW · sevenbro    ║")
console.log("╚══════════════════════════════════════╝")
console.log("Workspace:", root)
console.log("Branch   :", branch)
console.log("Stamp    :", new Date().toISOString())
console.log("\n## Last commits\n" + last)
console.log("\n## Dirty\n" + (status || "(clean)"))
console.log("\n## Open\n" + open)
console.log("\n## Decisions (head)\n" + decisions.slice(0, 1500))
console.log("\n## Binding docs")
console.log("- AGENTS.md read:", agents.length > 0 ? "yes" : "MISSING")
console.log("- SESSION_SYNC.md:", sync.length > 0 ? "yes" : "MISSING")
console.log("- docs/PROGRESS.md:", progress.length > 0 ? "yes" : "MISSING")
console.log("\n## Agent next steps")
console.log("1. Use this brain for the current task")
console.log("2. Update PROGRESS / SESSION_SYNC if state changes")
console.log("3. No commit/push/deploy unless user asks")
console.log("4. Run codegraph sync after large code changes")

// Stamp last sync
if (sync) {
  const stamp = `\n\n### Automation log\n- last session-sync: \`${new Date().toISOString()}\` · branch \`${branch}\`\n`
  const withoutLog = sync.replace(/\n### Automation log[\s\S]*$/, "")
  try {
    writeFileSync(SYNC, withoutLog + stamp, "utf8")
  } catch {
    /* ignore */
  }
}

console.log("\nSYNC_OK")
