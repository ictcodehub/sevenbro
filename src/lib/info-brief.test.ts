import { describe, expect, it } from "vitest"
import {
  audienceOptionsForKind,
  autoTugasForDate,
  briefTitleForDate,
  dateKeyWIB,
  defaultBriefDateKey,
  formatBriefDateLong,
  generateBriefBody,
  greetingForBrief,
  greetingLinesForBrief,
  isSchoolDay,
  normalizeAudience,
  piketNamesForDate,
  relativeDayLabel,
  resolveSubjectOptions,
  scheduleSubjectsForDate,
  subjectChipsForDate,
  timeOfDayWord,
  tomorrowKeyWIB,
  uniformForDate,
} from "./info-brief"

describe("info-brief date helpers", () => {
  it("dateKeyWIB / tomorrowKeyWIB", () => {
    const now = new Date("2026-09-16T10:00:00Z")
    expect(dateKeyWIB(now)).toBe("2026-09-16")
    expect(tomorrowKeyWIB(now)).toBe("2026-09-17")
  })

  it("formatBriefDateLong bahasa Indonesia", () => {
    // 17 Sep 2026 = Kamis (kalender; brief WA Freissy salah tulis "Jumat")
    expect(formatBriefDateLong("2026-09-17")).toBe("Kamis, 17 September 2026")
  })

  it("relativeDayLabel", () => {
    const now = new Date("2026-09-16T10:00:00Z")
    expect(relativeDayLabel("2026-09-16", now)).toBe("Hari ini")
    expect(relativeDayLabel("2026-09-17", now)).toBe("Besok")
    expect(relativeDayLabel("2026-09-20", now)).toBe("")
  })

  it("briefTitleForDate tanpa hari/tanggal", () => {
    expect(briefTitleForDate("2026-09-21")).toBe("Info Harian")
  })
})

describe("greeting dinamis", () => {
  it("timeOfDayWord WIB", () => {
    expect(timeOfDayWord(new Date("2026-09-17T00:30:00Z"))).toBe("pagi") // 07:30 WIB
    expect(timeOfDayWord(new Date("2026-09-17T05:00:00Z"))).toBe("siang") // 12:00 WIB
    expect(timeOfDayWord(new Date("2026-09-17T09:00:00Z"))).toBe("sore") // 16:00 WIB
    expect(timeOfDayWord(new Date("2026-09-17T13:00:00Z"))).toBe("malam") // 20:00 WIB
  })

  it("greeting 2 baris: enter setelah salam", () => {
    const now = new Date("2026-09-17T09:00:00Z") // 16:00 WIB 17 Sep
    const [line1, line2] = greetingLinesForBrief("2026-09-21", now)
    expect(line1).toBe("Selamat sore,")
    expect(line2).toBe("Berikut ini informasi harian untuk Senin, 21 September 2026.")
    const full = greetingForBrief("2026-09-21", now)
    expect(full).toContain("\n")
    expect(full.split("\n")[0]).toBe("Selamat sore,")
  })

  it("body WA: salam bold + baris berikutnya", () => {
    const now = new Date("2026-09-17T09:00:00Z")
    const body = generateBriefBody({ dateKey: "2026-09-18" }, now)
    expect(body).toContain("*Selamat sore,*")
    expect(body).toContain("Berikut ini informasi harian untuk Jumat, 18 September 2026.")
    expect(body).toContain("*Sekian, mohon untuk diperhatikan bersama.*")
    expect(body).toContain("Terima kasih")
  })
})

describe("school day default brief", () => {
  it("isSchoolDay: Senin-Jumat ya, Sabtu/Minggu tidak", () => {
    expect(isSchoolDay("2026-09-21")).toBe(true) // Senin
    expect(isSchoolDay("2026-09-25")).toBe(true) // Jumat
    expect(isSchoolDay("2026-09-19")).toBe(false) // Sabtu
    expect(isSchoolDay("2026-09-20")).toBe(false) // Minggu
  })

  it("defaultBriefDateKey: Sabtu → Senin; Minggu → Senin; Kamis → Jumat", () => {
    // Sabtu 19 Sep 2026 → brief default Senin 21 Sep
    expect(defaultBriefDateKey(new Date("2026-09-19T10:00:00Z"))).toBe("2026-09-21")
    // Minggu 20 Sep 2026 → Senin 21 Sep
    expect(defaultBriefDateKey(new Date("2026-09-20T10:00:00Z"))).toBe("2026-09-21")
    // Kamis 17 Sep 2026 → Jumat 18 Sep
    expect(defaultBriefDateKey(new Date("2026-09-17T10:00:00Z"))).toBe("2026-09-18")
  })
})

describe("scheduleSubjectsForDate (KBM 7B fix)", () => {
  it("Jumat: baris per sesi + teacher; WA: time | JP | Mapel (singkatan)", () => {
    const fri = scheduleSubjectsForDate("2026-09-25")
    expect(fri.length).toBe(8)
    const s1 = fri.find((s) => s.session === 1)
    expect(s1?.short_name).toBe("Science")
    expect(s1?.teacher).toContain("Rasyid")
    expect(s1?.time).toBe("07:00-07:45")

    const body = generateBriefBody({ dateKey: "2026-09-25", subjects: fri })
    expect(body).toContain("*Pelajaran:*")
    expect(body).toContain("[ 2 JP ] Science")
    expect(body).toContain("[ 2 JP ] Physical Education (P.E)")
    expect((body.match(/Science/g) || []).length).toBe(1)
  })

  it("Senin sesi 1: Character Building (CB) — JP digabung per mapel", () => {
    const mon = scheduleSubjectsForDate("2026-09-21")
    expect(mon[0]?.name).toBe("Character Building")
    expect(mon[0]?.short_name).toBe("CB")
    const body = generateBriefBody({ dateKey: "2026-09-21", subjects: mon })
    expect(body).toContain("Berikut ini informasi harian untuk Senin, 21 September 2026.")
    expect(body).toContain("1. [ 1 JP ] Character Building (CB)")
    expect(body).toContain("[ 2 JP ] Social Studies (Sosial)")
    expect((body.match(/Social Studies/g) || []).length).toBe(1)
  })

  it("Sabtu kosong", () => {
    expect(scheduleSubjectsForDate("2026-09-19")).toHaveLength(0)
  })
})

describe("uniformForDate", () => {
  it("card brief menampilkan hari + seragam lengkap (contoh Jumat)", () => {
    const fri = uniformForDate("2026-09-25") // Jumat
    expect(fri.dayLabel).toBe("Jumat")
    expect(fri.title).toBe("Seragam Pramuka + Accessories Lengkap")
    expect(fri.detail).toContain("Topi")
    expect(fri.detail).toContain("Kacu")
    expect(fri.extra).toBe("Bawa Seragam P.E")
    expect(fri.note).toBe(
      "(Topi, Dasi/Kacu, Ring, Peluit, Buku Saku) + Bawa Seragam P.E",
    )

    expect(uniformForDate("2026-09-21").title).toContain("Sailor") // Senin
    expect(uniformForDate("2026-09-23").title).toContain("Batik") // Rabu
    expect(uniformForDate("2026-09-19").dayLabel).toBe("Sabtu")
  })
})

describe("resolveSubjectOptions", () => {
  it("fallback lokal bila API kosong", () => {
    const opts = resolveSubjectOptions([])
    expect(opts.length).toBeGreaterThan(10)
    expect(opts.some((s) => s.short_name === "P.E")).toBe(true)
    expect(opts.some((s) => s.name === "Pramuka")).toBe(true)
  })
})

describe("auto tugas dari jadwal", () => {
  it("Jumat: bawa P.E + atribut Pramuka + tugas mapel hari itu", () => {
    const tugas = autoTugasForDate("2026-09-25")
    const joined = tugas.join("\n")
    expect(joined).toContain("Bawa baju P.E")
    expect(joined).toContain("Pramuka")
    expect(joined).toContain("Tugas Mandarin")
  })

  it("chip mapel unik per hari", () => {
    const chips = subjectChipsForDate("2026-09-25")
    const shorts = chips.map((c) => c.short)
    expect(shorts).toContain("Science")
    expect(shorts).toContain("P.E")
    expect(new Set(shorts).size).toBe(shorts.length)
  })
})

describe("piket fix mingguan", () => {
  it("Senin: Pauline, Andra, Keiko", () => {
    const names = piketNamesForDate("2026-09-21")
    expect(names).toHaveLength(3)
    expect(names.some((n) => /pauline/i.test(n))).toBe(true)
    expect(names.some((n) => /andra/i.test(n))).toBe(true)
    expect(names.some((n) => /keiko/i.test(n))).toBe(true)
  })

  it("Rabu: 4 orang; Jumat: Jolin/Jesslyn/Erica", () => {
    expect(piketNamesForDate("2026-09-23")).toHaveLength(4)
    const fri = piketNamesForDate("2026-09-25").join(" ")
    expect(fri).toMatch(/jolin/i)
    expect(fri).toMatch(/jesslyn/i)
    expect(fri).toMatch(/erica/i)
  })

  it("Sabtu kosong", () => {
    expect(piketNamesForDate("2026-09-19")).toHaveLength(0)
  })
})

describe("audience per jenis tugas", () => {
  it("Remedial hanya untuk Tugas", () => {
    expect(audienceOptionsForKind("TASK")).toEqual(["ALL", "NAMED", "REMEDIAL"])
    expect(audienceOptionsForKind("EVENT_NOTE")).toEqual(["ALL", "NAMED"])
    expect(audienceOptionsForKind("BRING")).toEqual(["ALL"])
    expect(normalizeAudience("EVENT_NOTE", "REMEDIAL")).toBe("ALL")
    expect(normalizeAudience("TASK", "REMEDIAL")).toBe("REMEDIAL")
  })
})

describe("generateBriefBody", () => {
  it("mengikuti urutan template Freissy", () => {
    const now = new Date("2026-09-16T10:00:00Z")
    const body = generateBriefBody(
      {
        dateKey: "2026-09-17",
        greeting: greetingForBrief("2026-09-17", new Date("2026-09-16T10:00:00Z")),
        uniform: "Pramuka",
        uniform_note: "(Topi, Dasi/Kacu, Ring, Peluit, Buku Saku) + Bawa Seragam P.E",
        subjects: [
          { subject_id: "1", name: "Science", short_name: "Science", jp: 2 },
          { subject_id: "2", name: "Physical Education", short_name: "P.E", jp: 2 },
          { subject_id: "3", name: "Visual Art", short_name: "VA", jp: 2 },
          { subject_id: "4", name: "Mandarin", short_name: "Mandarin", jp: 2 },
          { subject_id: "5", name: "Pramuka", short_name: "Pramuka", jp: 1 },
        ],
        duties: [
          { student_id: "a", name: "Jolin khojaya" },
          { student_id: "b", name: "Jesslyn Aurelia Hamsidi" },
        ],
        items: [
          { kind: "BRING", text: "Bawa baju P.E", audience: "ALL", group: "info" },
          {
            kind: "TASK",
            text: "Bikin tugas native mandarin",
            subject_name: "Mandarin",
            audience: "ALL",
            group: "tugas",
          },
          {
            kind: "TASK",
            text: "Mandarin yang remed kerjain tugasnya",
            audience: "REMEDIAL",
            group: "remedial",
          },
          {
            kind: "EVENT_NOTE",
            text: "Siap LDKS 2 hari",
            audience: "NAMED",
            student_names: ["Andra", "Pauline", "Freissy"],
            event_title: "LDKS",
            group: "info",
          },
        ],
      },
      now,
    )

    expect(body).toContain("*Selamat sore,*")
    expect(body).toContain("Berikut ini informasi harian untuk Kamis, 17 September 2026.")
    expect(body).toContain("*Seragam: Pramuka*")
    expect(body).toContain("(Topi, Dasi/Kacu, Ring, Peluit, Buku Saku) + Bawa Seragam P.E")
    expect(body).toContain("*Pelajaran:*")
    expect(body).toContain("1. [ 2 JP ] Science")
    expect(body).toContain("*Piket:*")
    expect(body).toContain("Jolin khojaya")
    expect(body).toContain("*Tugas:*")
    expect(body).toContain("*Remedial:*")
    expect(body).toContain("*Info lain:*")
    expect(body).toContain("Bawa baju P.E")
    expect(body).toContain("Bikin tugas native mandarin")
    expect(body).toContain("Mandarin yang remed")
    expect(body).toContain("LDKS")
    expect(body).toContain("*Sekian, mohon untuk diperhatikan bersama.*")
    expect(body).toContain("Terima kasih")
  })

  it("boleh kosong di bagian opsional", () => {
    const body = generateBriefBody({ dateKey: "2026-09-20" })
    expect(body).toContain("Minggu, 20 September 2026")
    expect(body).not.toContain("Seragam:")
    expect(body).not.toContain("*Pelajaran:*")
    expect(body).toContain("*Sekian, mohon untuk diperhatikan bersama.*")
  })
})
