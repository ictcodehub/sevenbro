// Info brief harian — sumber data form Sekretaris + generate body
// Spec: docs/INFO_BRIEF_SPEC.md

const DAY_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MONTH_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

export type BriefSubjectRow = {
  subject_id: string | null
  name: string
  short_name?: string | null
  jp: number
  note?: string | null
  /** Rentang jam dari jadwal fix, mis. "07:00-07:45" */
  time?: string | null
  /** Nomor sesi KBM (1-9) bila dari jadwal fix */
  session?: number | null
  /** Nama guru mapel — tampil di tabel form, TIDAK ikut salin WA */
  teacher?: string | null
}

/** Slot jadwal KBM 7B (Mutiara Bangsa 2, AY 2026-2027) */
export type TimetableSlot = {
  session: number
  time: string
  label: string
  name: string
  short_name: string
  teacher: string
}

/** Default guru mapel 7B — seed + fallback bila DB kosong */
export const DEFAULT_SUBJECT_TEACHERS: { subject_name: string; teacher_name: string }[] = [
  { subject_name: "Character Building", teacher_name: "Ajit Prasetiyo" },
  { subject_name: "Social Studies", teacher_name: "Thoriq Faraaj Mumtaaz" },
  { subject_name: "English", teacher_name: "Sayid Alwy S Assegaf" },
  { subject_name: "Mathematics", teacher_name: "Yenni Triastuti" },
  { subject_name: "Indonesian", teacher_name: "Dolly Indra Rukmana" },
  { subject_name: "Music Theory", teacher_name: "Selviana Gisela Abel" },
  { subject_name: "Science", teacher_name: "Muhammad Rasyid Sidik" },
  { subject_name: "Violin", teacher_name: "Miman Kusma" },
  { subject_name: "ICT", teacher_name: "Ajit Prasetiyo" },
  { subject_name: "Mandarin", teacher_name: "Jitmen" },
  { subject_name: "Guidance and Counseling", teacher_name: "Safa Alia Putri Milenia" },
  { subject_name: "Religion", teacher_name: "Guru Agama" },
  { subject_name: "Prakarya", teacher_name: "Guru Prakarya" },
  { subject_name: "Civics", teacher_name: "Thoriq Faraaj Mumtaaz" },
  { subject_name: "Physical Education", teacher_name: "Saeful Abidin" },
  { subject_name: "Visual Art", teacher_name: "Sayid Alwy S Assegaf" },
  { subject_name: "Native Mandarin", teacher_name: "Jitmen" },
]

const TEACHERS: Record<string, string> = Object.fromEntries(
  DEFAULT_SUBJECT_TEACHERS.map((t) => [t.subject_name, t.teacher_name]),
)

export type SubjectTeacherRow = {
  id: string
  subject_name: string
  teacher_name: string
  active: boolean
}

/** Lookup guru: DB map (subject → teacher) dulu, fallback DEFAULT */
export function teacherFromMap(
  subjectName: string,
  map?: Record<string, string> | null,
): string {
  if (map && map[subjectName]) return map[subjectName]!
  return TEACHERS[subjectName] ?? "-"
}

export function teacherForSubjectName(name: string): string {
  return TEACHERS[name] ?? "-"
}

/** Map dari API subject_teachers */
export function subjectTeacherLookup(
  rows: SubjectTeacherRow[] | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows ?? []) {
    if (r.active !== false && r.teacher_name?.trim()) {
      out[r.subject_name] = r.teacher_name.trim()
    }
  }
  return out
}

const T = (
  session: number,
  time: string,
  label: string,
  name: string,
  short_name: string,
): TimetableSlot => ({
  session,
  time,
  label,
  name,
  short_name,
  teacher: TEACHERS[name] ?? "-",
})

/**
 * Jadwal fix Grade 7B — sumber: gambar KBM 7B AY 2026-2027.
 * Key = getUTCDay() (1=Senin … 5=Jumat). Libur tanpa entri.
 */
export const GRADE_7B_TIMETABLE: Record<number, TimetableSlot[]> = {
  // Senin
  1: [
    T(1, "07:00-07:45", "CB", "Character Building", "CB"),
    T(2, "07:45-08:30", "SOCIAL", "Social Studies", "Sosial"),
    T(3, "08:30-09:15", "SOCIAL", "Social Studies", "Sosial"),
    T(4, "09:30-10:15", "ENGLISH", "English", "English"),
    T(5, "10:15-11:00", "ENGLISH", "English", "English"),
    T(6, "11:00-11:45", "MATHEMATICS", "Mathematics", "Math"),
    T(7, "12:15-13:00", "BAHASA INDONESIA", "Indonesian", "Indonesian"),
    T(8, "13:00-13:45", "BAHASA INDONESIA", "Indonesian", "Indonesian"),
    T(9, "13:45-14:30", "MUSIK TEORI", "Music Theory", "Music"),
  ],
  // Selasa
  2: [
    T(1, "07:00-07:45", "MATHEMATICS", "Mathematics", "Math"),
    T(2, "07:45-08:30", "MATHEMATICS", "Mathematics", "Math"),
    T(3, "08:30-09:15", "SCIENCE", "Science", "Science"),
    T(4, "09:30-10:15", "VIOLIN", "Violin", "Violin"),
    T(5, "10:15-11:00", "ICT", "ICT", "ICT"),
    T(6, "11:00-11:45", "ICT", "ICT", "ICT"),
    T(7, "12:15-13:00", "MANDARIN", "Mandarin", "Mandarin"),
    T(8, "13:00-13:45", "ENGLISH", "English", "English"),
    T(9, "13:45-14:30", "GUIDANCE & COUNSELING", "Guidance and Counseling", "BK"),
  ],
  // Rabu
  3: [
    T(1, "07:00-07:45", "SOCIAL", "Social Studies", "Sosial"),
    T(2, "07:45-08:30", "SOCIAL", "Social Studies", "Sosial"),
    T(3, "08:30-09:15", "RELIGION", "Religion", "Religion"),
    T(4, "09:30-10:15", "RELIGION", "Religion", "Religion"),
    T(5, "10:15-11:00", "SCIENCE", "Science", "Science"),
    T(6, "11:00-11:45", "SCIENCE", "Science", "Science"),
    T(7, "12:15-13:00", "ENGLISH", "English", "English"),
    T(8, "13:00-13:45", "ENGLISH", "English", "English"),
    T(9, "13:45-14:30", "PRAKARYA", "Prakarya", "Prakarya"),
  ],
  // Kamis
  4: [
    T(1, "07:00-07:45", "ENGLISH", "English", "English"),
    T(2, "07:45-08:30", "ENGLISH", "English", "English"),
    T(3, "08:30-09:15", "CIVICS", "Civics", "Civics"),
    T(4, "09:30-10:15", "CIVICS", "Civics", "Civics"),
    T(5, "10:15-11:00", "MATHEMATICS", "Mathematics", "Math"),
    T(6, "11:00-11:45", "MATHEMATICS", "Mathematics", "Math"),
    T(7, "12:15-13:00", "NATIVE MANDARIN", "Native Mandarin", "Native Mandarin"),
    T(8, "13:00-13:45", "BAHASA INDONESIA", "Indonesian", "Indonesian"),
    T(9, "13:45-14:30", "BAHASA INDONESIA", "Indonesian", "Indonesian"),
  ],
  // Jumat
  5: [
    T(1, "07:00-07:45", "SCIENCE", "Science", "Science"),
    T(2, "07:45-08:30", "SCIENCE", "Science", "Science"),
    T(3, "08:30-09:15", "PHYSICAL EDUCATION", "Physical Education", "P.E"),
    T(4, "09:30-10:15", "PHYSICAL EDUCATION", "Physical Education", "P.E"),
    T(5, "10:15-11:00", "VISUAL ART", "Visual Art", "VA"),
    T(6, "11:00-11:45", "VISUAL ART", "Visual Art", "VA"),
    T(7, "12:15-13:00", "MANDARIN", "Mandarin", "Mandarin"),
    T(8, "13:00-13:45", "MANDARIN", "Mandarin", "Mandarin"),
  ],
}

export function timetableDow(dateKey: string): number {
  const parts = dateKey.split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return -1
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
}

/** Slot mentah jadwal per tanggal (kosong di libur) */
export function timetableSlotsForDate(dateKey: string): TimetableSlot[] {
  return GRADE_7B_TIMETABLE[timetableDow(dateKey)] ?? []
}

/**
 * Piket fix 7B per hari sekolah (nama sesuai roster kelas).
 * Key = getUTCDay() 1=Senin … 5=Jumat.
 */
export const GRADE_7B_PIKET: Record<number, string[]> = {
  1: ["Pauline Joice Widjadja", "Muhamad Dwi Andra Shakti", "keiko kholis"],
  2: ["Edmund Gracio Wirjo", "Evander Tristan Lee", "Jivin Wellington Priyanto"],
  3: [
    "Freissy Celestyn Lien",
    "Mishella Tjung",
    "Rebecca Christa P",
    "Li Ming Xin",
  ],
  4: ["Madeline Mellow Andrea", "Gavriella Mulia Sitorus", "Wilbert Bryan"],
  5: ["Jolin khojaya", "Jesslyn Aurelia Hamsidi", "Erica Aurie"],
}

/** Nama piket fix untuk tanggal brief (kosong di libur) */
export function piketNamesForDate(dateKey: string): string[] {
  return GRADE_7B_PIKET[timetableDow(dateKey)] ?? []
}

/** Payload lama / alias Google → nama roster */
const DUTY_RENAME: Record<string, string> = {
  Avriel: "Gavriella Mulia Sitorus",
  "Avriel Sitorus": "Gavriella Mulia Sitorus",
}

export function fixDutyName(raw: string): string {
  return DUTY_RENAME[raw.trim()] ?? raw
}

/**
 * Saran tugas/bawaan otomatis dari jadwal KBM hari itu.
 * Dipetakan ke 3 grup: tugas · remedial · info
 */
export type AutoTugasGroups = {
  tugas: string[]
  remedial: string[]
  info: string[]
}

export function autoTugasGroupsForDate(dateKey: string): AutoTugasGroups {
  const slots = timetableSlotsForDate(dateKey)
  const shorts = new Set(slots.map((s) => s.short_name))
  const has = (n: string) => shorts.has(n)
  const tugas: string[] = []
  const remedial: string[] = []
  const info: string[] = []

  if (has("P.E")) info.push("Bawa baju P.E")
  if (has("Pramuka") || timetableDow(dateKey) === 5) {
    info.push("Bawa atribut Pramuka (Topi, Dasi/Kacu, Ring, Peluit, Buku Saku)")
  }
  if (has("Violin")) info.push("Bawa alat Violin")
  if (has("VA")) info.push("Bawa alat Visual Art bila diminta guru")
  if (has("ICT")) info.push("Bawa perangkat ICT bila ada jadwal praktik")

  const taskSubjects = [
    "Mandarin",
    "Native Mandarin",
    "Mathematics",
    "Science",
    "English",
    "Indonesian",
  ]
  for (const name of taskSubjects) {
    if (has(name)) {
      const label = slots.find((s) => s.short_name === name)?.short_name || name
      tugas.push(`Tugas ${label}: `)
    }
  }

  // Remedial: biasanya diketahui saat itu — mulai kosong / placeholder
  if (has("Mandarin") || has("Native Mandarin")) {
    remedial.push("Mandarin yang remed: ")
  }

  return { tugas, remedial, info }
}

/** Kompatibel payload body: gabungan tanpa label grup (dipakai generate) */
export function autoTugasForDate(dateKey: string): string[] {
  const g = autoTugasGroupsForDate(dateKey)
  return [...g.tugas, ...g.remedial, ...g.info]
}

/** Mapel hari ini untuk chip cepat tambah tugas */
export function subjectChipsForDate(dateKey: string): { short: string; name: string }[] {
  const seen = new Set<string>()
  const out: { short: string; name: string }[] = []
  for (const s of timetableSlotsForDate(dateKey)) {
    const key = s.short_name || s.name
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ short: s.short_name, name: s.name })
  }
  return out
}

/** Item tugas terstruktur dari jadwal (mapel saja; siswa & deskripsi diisi user) */
export function autoTugasItemsForDate(dateKey: string): {
  subject_name: string
}[] {
  return subjectChipsForDate(dateKey).map((c) => ({ subject_name: c.short }))
}

/** Baris tabel sesi → payload/preview (tetap bawa teacher untuk UI) */
export function sessionRowsToSubjects(slots: TimetableSlot[]): BriefSubjectRow[] {
  return slots.map((s, idx) => ({
    subject_id: `tt-s${s.session ?? idx + 1}-${s.short_name.toLowerCase().replace(/\s+/g, "-")}`,
    name: s.name,
    short_name: s.short_name,
    jp: 1,
    note: null,
    time: s.time,
    session: s.session ?? idx + 1,
    teacher: s.teacher && s.teacher !== "-" ? s.teacher : teacherForSubjectName(s.name),
  }))
}

/**
 * Agregasi mapel per hari (dipakai bila perlu ringkas JP).
 */
export function scheduleSubjectsForDate(dateKey: string): BriefSubjectRow[] {
  const slots = timetableSlotsForDate(dateKey)
  return sessionRowsToSubjects(slots)
}

export type BriefDutyRow = {
  student_id: string | null
  name: string
}

export type BriefItemKind = "BRING" | "TASK" | "EVENT_NOTE" | "CUSTOM"
export type BriefItemGroup = "tugas" | "remedial" | "info"

export type BriefItemRow = {
  kind: BriefItemKind
  text: string
  subject_id?: string | null
  subject_name?: string | null
  audience: "ALL" | "NAMED" | "REMEDIAL"
  student_names?: string[]
  linked_event_id?: string | null
  event_title?: string | null
  group?: BriefItemGroup
}

export type BriefPayload = {
  subjects?: BriefSubjectRow[]
  duties?: BriefDutyRow[]
  items?: BriefItemRow[]
}

export type DailyBrief = {
  id: string
  class_id: string
  date: string
  kind: "DAILY" | "GENERAL"
  title: string
  greeting: string | null
  uniform: string | null
  uniform_note: string | null
  pinned: boolean
  payload: BriefPayload
  body_generated: string
  announcement_id: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

export type SubjectRow = {
  id: string
  name: string
  short_name: string | null
  sort: number
  active: boolean
}

/** Kurikulum kelas 7 (Mapel Kelas 7.xlsx) + Pramuka (dipakai kelas, tidak ada di overview) */
export const DEFAULT_SUBJECTS: { name: string; short_name: string; sort: number }[] = [
  { name: "Character Building", short_name: "CB", sort: 1 },
  { name: "Buddhist", short_name: "Buddhist", sort: 2 },
  { name: "Christian", short_name: "Christian", sort: 3 },
  { name: "Catholic", short_name: "Catholic", sort: 4 },
  { name: "Islam", short_name: "Islam", sort: 5 },
  { name: "Civics", short_name: "Civics", sort: 6 },
  { name: "Indonesian", short_name: "Indonesian", sort: 7 },
  { name: "Mathematics", short_name: "Math", sort: 8 },
  { name: "Science", short_name: "Science", sort: 9 },
  { name: "Social Studies", short_name: "Sosial", sort: 10 },
  { name: "English", short_name: "English", sort: 11 },
  { name: "Visual Art", short_name: "VA", sort: 12 },
  { name: "Music Theory", short_name: "Music", sort: 13 },
  { name: "Violin", short_name: "Violin", sort: 14 },
  { name: "Physical Education", short_name: "P.E", sort: 15 },
  { name: "ICT", short_name: "ICT", sort: 16 },
  { name: "Mandarin", short_name: "Mandarin", sort: 17 },
  { name: "Guidance and Counseling", short_name: "BK", sort: 18 },
  { name: "Pramuka", short_name: "Pramuka", sort: 19 },
]

/** Preset seragam — Seragam Kelas 7 SMP Mutiara Bangsa 2 */
export const UNIFORM_PRESETS = [
  {
    id: "sailor",
    label: "Sailor",
    note: "(Kemeja Putih, Dasi, Vest, Celana/Rok Biru)",
  },
  {
    id: "batik",
    label: "Batik",
    note: "(Celana/Rok Biru)",
  },
  {
    id: "pramuka",
    label: "Pramuka + Accessories Lengkap",
    note: "(Topi, Dasi/Kacu, Ring, Peluit, Buku Saku) + Bawa Seragam P.E",
  },
  {
    id: "olahraga",
    label: "Olahraga / P.E",
    note: "(Baju olahraga)",
  },
  { id: "bebas", label: "Bebas", note: "" },
] as const

export type DayUniform = {
  /** Nama hari brief — mis. "Jumat" */
  dayLabel: string
  /** Baris utama card — mis. "Seragam Pramuka + Accessories Lengkap" */
  title: string
  /** Detail aksesori / potongan seragam */
  detail: string
  /** Tambahan bila ada (mis. bawa baju P.E) */
  extra: string
  /** Nilai untuk payload / body */
  label: string
  note: string
}

const DAY_SHORT = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

export function dayLabelFromKey(dateKey: string): string {
  const parts = dateKey.split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return ""
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return DAY_SHORT[dt.getUTCDay()] || ""
}

/**
 * Seragam per tanggal brief (besok saat Sekretaris menulis).
 * Card selalu menampilkan hari + nama seragam + detail aksesori.
 */
export function uniformForDate(dateKey: string): DayUniform {
  const dayLabel = dayLabelFromKey(dateKey) || "Hari ini"
  const dow = (() => {
    const parts = dateKey.split("-")
    const y = Number(parts[0])
    const m = Number(parts[1])
    const d = Number(parts[2])
    if (!y || !m || !d) return -1
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
  })()

  const pack = (label: string, detail: string, extra = ""): DayUniform => {
    const note = extra ? `${detail} + ${extra}` : detail
    return {
      dayLabel,
      title: `Seragam ${label}`,
      detail,
      extra,
      label,
      note,
    }
  }

  switch (dow) {
    case 1:
    case 2:
      return pack("Sailor", "(Kemeja Putih, Dasi, Vest, Celana/Rok Biru)")
    case 3:
      return pack("Batik", "(Celana/Rok Biru)")
    case 4:
      return pack("Sailor", "(Kemeja Putih, Dasi, Vest, Celana/Rok Biru)")
    case 5:
      return pack(
        "Pramuka + Accessories Lengkap",
        "(Topi, Dasi/Kacu, Ring, Peluit, Buku Saku)",
        "Bawa Seragam P.E",
      )
    case 6:
    case 0:
    default:
      return pack(
        "Bebas",
        "(Di luar jadwal sekolah — ganti manual bila ada kegiatan)",
      )
  }
}

/** Daftar mapel untuk form — fallback lokal bila API/DB belum siap */
export function subjectOptionsFallback(): SubjectRow[] {
  return DEFAULT_SUBJECTS.map((s) => ({
    id: `local-${s.sort}`,
    name: s.name,
    short_name: s.short_name,
    sort: s.sort,
    active: true,
  }))
}

export function resolveSubjectOptions(fromApi: SubjectRow[] | null | undefined): SubjectRow[] {
  if (fromApi && fromApi.length > 0) return fromApi
  return subjectOptionsFallback()
}

/**
 * Kata sapaan waktu (WIB): pagi / siang / sore / malam
 * pagi 04.00-10.59 · siang 11.00-14.59 · sore 15.00-17.59 · malam 18.00-03.59
 */
export function timeOfDayWord(now: Date = new Date()): "pagi" | "siang" | "sore" | "malam" {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const h = wib.getUTCHours()
  if (h >= 4 && h < 11) return "pagi"
  if (h >= 11 && h < 15) return "siang"
  if (h >= 15 && h < 18) return "sore"
  return "malam"
}

/**
 * Sapaan brief — hardcoded sistem (tanpa field form).
 * Format: enter setelah salam.
 *   Selamat sore,
 *   berikut ini informasi harian untuk Senin, 21 September 2026.
 */
export function greetingLinesForBrief(
  dateKey: string,
  now: Date = new Date(),
): [string, string] {
  const word = timeOfDayWord(now)
  const longDate = formatBriefDateLong(dateKey)
  return [
    `Selamat ${word},`,
    `Berikut ini informasi harian untuk ${longDate}.`,
  ]
}

/** Greeting 2 baris (dipakai body WA + payload default) */
export function greetingForBrief(dateKey: string, now = new Date()): string {
  return greetingLinesForBrief(dateKey, now).join("\n")
}

export const DEFAULT_GREETING = greetingForBrief(tomorrowKeyWIB())

export const ITEM_KIND_LABEL: Record<BriefItemKind, string> = {
  BRING: "Atribut",
  TASK: "Tugas",
  EVENT_NOTE: "Kegiatan",
  CUSTOM: "Umum",
}

export type BriefAudience = "ALL" | "NAMED" | "REMEDIAL"

/** Audience yang valid per jenis item brief */
export function audienceOptionsForKind(kind: BriefItemKind): BriefAudience[] {
  switch (kind) {
    case "BRING":
      return ["ALL"]
    case "TASK":
      return ["ALL", "NAMED", "REMEDIAL"]
    case "EVENT_NOTE":
      return ["ALL", "NAMED"]
    case "CUSTOM":
    default:
      return ["ALL", "NAMED"]
  }
}

/** Saat ganti jenis, audience lama yang tidak valid → reset */
export function normalizeAudience(
  kind: BriefItemKind,
  audience: BriefAudience,
): BriefAudience {
  const allowed = audienceOptionsForKind(kind)
  return allowed.includes(audience) ? audience : "ALL"
}

export function audienceAllowsStudentPick(audience: BriefAudience): boolean {
  return audience === "NAMED" || audience === "REMEDIAL"
}

export function subjectLabel(s: BriefSubjectRow): string {
  return s.short_name || s.name
}

/** Y-m-d di zona WIB dari Date / string input date */
export function dateKeyWIB(d: Date | string): string {
  const base = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d
  const wib = new Date(base.getTime() + 7 * 60 * 60 * 1000)
  const y = wib.getUTCFullYear()
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0")
  const day = String(wib.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function tomorrowKeyWIB(now = new Date()): string {
  return dateKeyWIB(new Date(now.getTime() + 24 * 60 * 60 * 1000))
}

/** Senin–Jumat = hari sekolah; Sabtu & Minggu libur */
export function isSchoolDay(dateKey: string): boolean {
  const parts = dateKey.split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return false
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
  return dow >= 1 && dow <= 5
}

/**
 * Tanggal default brief untuk Sekretaris:
 * besok, tapi kalau jatuh Sabtu/Minggu → hari sekolah berikutnya (Senin).
 * Minggu pagi menyiapkan jadwal → default Senin.
 */
export function defaultBriefDateKey(now = new Date()): string {
  let key = tomorrowKeyWIB(now)
  // maju maksimal 7 hari sampai hari sekolah
  for (let i = 0; i < 7 && !isSchoolDay(key); i++) {
    const base = new Date(key + "T12:00:00Z")
    key = dateKeyWIB(new Date(base.getTime() + 24 * 60 * 60 * 1000))
  }
  return key
}

/** "Jumat, 17 September 2026" dari key Y-m-d */
export function formatBriefDateLong(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split("-")
  const y = Number(ys)
  const m = Number(ms)
  const d = Number(ds)
  if (!y || !m || !d) return dateKey
  // Zaman UTC dari Y-m-d → weekday WIB sama (siang WIB masih hari yang sama)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const day = DAY_ID[dt.getUTCDay()] || ""
  const month = MONTH_ID[m - 1] || ""
  return `${day}, ${d} ${month} ${y}`
}

export function relativeDayLabel(dateKey: string, now = new Date()): string {
  const today = dateKeyWIB(now)
  const tomorrow = tomorrowKeyWIB(now)
  if (dateKey === today) return "Hari ini"
  if (dateKey === tomorrow) return "Besok"
  return ""
}

/** Judul brief — tanpa hari/tanggal (tanggal tampil di meta card) */
export function briefTitleForDate(_dateKey: string): string {
  return "Info Harian"
}

export function generateBriefBody(
  input: {
    dateKey: string
    greeting?: string | null
    uniform?: string | null
    uniform_note?: string | null
    subjects?: BriefSubjectRow[]
    duties?: BriefDutyRow[]
    items?: BriefItemRow[]
    /** Jumlah siswa aktif — nama terpilih ≥ ini ditulis "[All Students]" */
    rosterSize?: number
  },
  now: Date = new Date(),
): string {
  const [greetSal, greetInfo] = greetingLinesForBrief(input.dateKey, now)
  const lines: string[] = []

  // Sapaan hardcoded sistem (WA bold); abaikan override lama agar format konsisten
  lines.push(`*${greetSal}*`)
  lines.push(greetInfo)

  const uniform = input.uniform?.trim()
  if (uniform) {
    lines.push("")
    lines.push(`*Seragam: ${uniform}*`)
    const note = input.uniform_note?.trim()
    if (note) lines.push(note)
  }

  const subjects = (input.subjects ?? []).filter((s) => s.name?.trim())
  if (subjects.length) {
    // Gabung sesi mapel yang sama → 1 baris JP total (anti double)
    const agg = new Map<string, { name: string; short: string; jp: number }>()
    for (const s of subjects) {
      const name = s.name.trim()
      const short = (s.short_name || "").trim() || name
      const key = short || name
      const jp = Number(s.jp) > 0 ? Number(s.jp) : 1
      const prev = agg.get(key)
      if (prev) prev.jp += jp
      else agg.set(key, { name, short, jp })
    }
    lines.push("")
    lines.push(`*Pelajaran:*`)
    let no = 0
    for (const row of agg.values()) {
      no += 1
      const mapel =
        row.short && row.short !== row.name
          ? `${row.name} (${row.short})`
          : row.name
      lines.push(`${no}. [ ${row.jp} JP ] ${mapel}`)
    }
  }

  const duties = (input.duties ?? []).filter((d) => d.name?.trim())
  if (duties.length) {
    lines.push("")
    lines.push(`*Piket:*`)
    for (const d of duties) {
      lines.push(`- ${fixDutyName(d.name).trim()}`)
    }
  }

  const items = (input.items ?? []).filter((i) => i.text?.trim())
  if (items.length) {
    const groupOf = (it: BriefItemRow): BriefItemGroup => {
      if (it.group === "tugas" || it.group === "remedial" || it.group === "info") {
        return it.group
      }
      if (it.audience === "REMEDIAL" || /remed/i.test(it.text)) return "remedial"
      if (it.kind === "TASK") return "tugas"
      return "info"
    }

    const buckets: Record<BriefItemGroup, BriefItemRow[]> = {
      tugas: [],
      remedial: [],
      info: [],
    }
    for (const it of items) buckets[groupOf(it)].push(it)

    const pushGroup = (title: string, rows: BriefItemRow[]) => {
      if (!rows.length) return
      lines.push("")
      lines.push(`*${title}:*`)
      for (const it of rows) {
        const mapel = (it.subject_name || "").trim()
        const desc = normalizeBriefText(
          (it.text || "").trim().replace(/^Tugas\s+/i, ""),
        )
        const names = (it.student_names ?? []).filter(Boolean)
        const who =
          input.rosterSize && names.length >= input.rosterSize
            ? "[All Students]"
            : names.length
              ? names.join(", ")
              : ""
        const ev = it.event_title?.trim()
        const evTag = ev ? `[${ev}]` : ""
        const detail = [desc, evTag].filter(Boolean).join(" ")
        if (mapel) {
          // Header: - Mapel. [All Students] / nama · detail turun indent 2
          lines.push(who ? `- ${mapel}. ${who}` : `- ${mapel}`)
          if (detail) lines.push(`  ${detail}`)
        } else {
          lines.push(`- ${[who, detail].filter(Boolean).join(" ")}`)
        }
      }
    }

    pushGroup("Tugas", buckets.tugas)
    pushGroup("Remedial", buckets.remedial)
    pushGroup("Info lain", buckets.info)
  }

  lines.push("")
  lines.push("*Sekian, mohon untuk diperhatikan bersama.*")
  lines.push("Terima kasih \u{1F64F}")
  return lines.join("\n")
}

/** Teks siap salin ke WhatsApp group */
export function generateBriefWaText(input: Parameters<typeof generateBriefBody>[0]): string {
  return generateBriefBody(input)
}

/**
 * Normalisasi teks ketikan siswa → format brief yang benar (Title Case + ejaan).
 * Contoh: "Kerjakan tugas dibuku hal53 no12 sampai 14,hal 62 no 10 - 13"
 *   → "Kerjakan Tugas di Buku Hal. 53 No. 12-14, Hal. 62 No. 10-13"
 */
const TITLE_STOP = new Set([
  "di",
  "ke",
  "dari",
  "dan",
  "yang",
  "untuk",
  "pada",
  "dengan",
  "atau",
  "ini",
  "itu",
])

/** Singkatan yang wajib ALL-CAPS walau diketik lowercase */
const TITLE_ABBREV = new Set(["ldks", "pk", "osis"])

export function normalizeBriefText(raw: string): string {
  let s = (raw || "").trim().replace(/\s+/g, " ")
  if (!s) return s
  // kata tempel: dibuku → di buku
  s = s.replace(/\b(di)(buku|kelas|rumah|sekolah)\b/gi, "di $2")
  // spasi setelah koma
  s = s.replace(/,\s*/g, ", ")
  // hal53 / hal 53 / hal.53 → Hal. 53
  s = s.replace(/\bhal\s*\.?\s*(\d)/gi, "Hal. $1")
  // no12 / no 12 / no.12 → No. 12
  s = s.replace(/\bno\s*\.?\s*(\d)/gi, "No. $1")
  // rentang: 12 sampai 14 / 10 - 13 / 1 s.d 3 → 12-14 / 10-13 / 1-3
  s = s.replace(/(\d)\s*(?:sampai|s\.?\/?d\.?|-)\s*(\d)/gi, "$1-$2")
  // Title Case per kata; singkatan ALL-CAPS (LDKS, PR) dipertahankan
  s = s.replace(/\b([A-Za-z]+)\b/g, (w, offset: number) => {
    if (w.length === 1) return w.toUpperCase()
    if (w === w.toUpperCase()) return w
    const lw = w.toLowerCase()
    if (TITLE_ABBREV.has(lw)) return lw.toUpperCase()
    if (offset === 0 || !TITLE_STOP.has(lw)) {
      return lw.charAt(0).toUpperCase() + lw.slice(1)
    }
    return lw
  })
  return s
}
