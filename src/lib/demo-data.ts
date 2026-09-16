// ============================================================
// Demo data Seven Bro! — ganti dengan data asli (API/DB)
// ============================================================

export type AppNotification = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

export type Announcement = {
  id: string
  title: string
  body: string
  author: string
  time: string
  pinned: boolean
}

export type AgendaEvent = {
  id: string
  title: string
  location: string
  date: string
  time: string
}

export type KasTransaction = {
  id: string
  type: "in" | "out"
  note: string
  amount: number
  date: string
}

export type LeaderboardEntry = {
  id: string
  name: string
  points: number
}

// Data siswa 7B dari roster asli
export const STUDENTS = [
  { id: "s1", name: "Edmund Gracio Wirjo", email: "edmundgracio@mutiarabangsa.sch.id", position: "KETUA" },
  { id: "s2", name: "Erica Aurie", email: "erica@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s3", name: "Evander Tristan Lee", email: "Evander@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s4", name: "Freissy Celestyn Lien", email: "freissy@mutiarabangsa.sch.id", position: "SEKRETARIS" },
  { id: "s5", name: "Gavriella Mulia Sitorus", email: "gavriella@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s6", name: "Jesslyn Aurelia Hamsidi", email: "jesslynhm@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s7", name: "Jivin Wellington Priyanto", email: "JivinWell@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s8", name: "Jolin khojaya", email: "jolinkho@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s9", name: "keiko kholis", email: "keiko@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s10", name: "Li Ming Xin", email: "xinxin@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s11", name: "Madeline Mellow Andrea", email: "madelinea@mutiarabangsa.sch.id", position: "BENDAHARA" },
  { id: "s12", name: "Mishella Tjung", email: "mishella@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s13", name: "Muhamad Dwi Andra Shakti", email: "andra@mutiarabangsa.sch.id", position: "SEKRETARIS" },
  { id: "s14", name: "Pauline Joice Widjadja", email: "paupau@mutiarabangsa.sch.id", position: "BENDAHARA" },
  { id: "s15", name: "Rebecca Christa P", email: "rebecca@mutiarabangsa.sch.id", position: "ANGGOTA" },
  { id: "s16", name: "Wilbert Bryan", email: "wilbert@mutiarabangsa.sch.id", position: "ANGGOTA" },
] as const

export type Student = (typeof STUDENTS)[number]

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    title: "Pengumuman baru",
    body: "Piket kelas jadwal baru sudah keluar, cek ya!",
    time: "2 jam lalu",
    read: false,
  },
  {
    id: "n2",
    title: "Reminder iuran",
    body: "Iuran bulanan — jatuh tempo tanggal 20.",
    time: "5 jam lalu",
    read: false,
  },
  {
    id: "n3",
    title: "Poin perilaku",
    body: "Kamu dapat +2 poin karena membantu teman.",
    time: "Kemarin",
    read: true,
  },
]

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    title: "Jadwal Piket Kelas Baru",
    body: "Mulai Senin depan, jadwal piket diganti per kelompok. Cek bagian dasbor ya!",
    author: "Bu Tio (Homeroom)",
    time: "2 jam lalu",
    pinned: true,
  },
  {
    id: "a2",
    title: "Pengumpulan Tugas Matematika",
    body: "Tugas bab 3 dikumpulkan paling lambat Jumat jam 12:00 di meja Bu Tio.",
    author: "Edmund (Ketua)",
    time: "Kemarin",
    pinned: false,
  },
  {
    id: "a3",
    title: "Class Meeting Minggu Depan",
    body: "Ada class meeting 2 hari. Yang mau ikut lomba futsal daftar ke ketua kelas.",
    author: "Bu Tio (Homeroom)",
    time: "2 hari lalu",
    pinned: false,
  },
]

export const AGENDA: AgendaEvent[] = [
  { id: "e1", title: "Upacara Bendera", location: "Lapangan", date: "Sen, 15 Sep", time: "07:00" },
  { id: "e2", title: "Ekstrakurikuler Basket", location: "Lapangan Basket", date: "Sen, 15 Sep", time: "15:30" },
  { id: "e3", title: "Ulangan Matematika", location: "Kelas 7B", date: "Sel, 16 Sep", time: "08:00" },
  { id: "e4", title: "Rapat Kelas (Class Meeting)", location: "Kelas 7B", date: "Kam, 18 Sep", time: "13:00" },
]

export const KAS_TRANSACTIONS: KasTransaction[] = [
  { id: "k1", type: "in", note: "Iuran bulanan", amount: 160000, date: "12 Sep" },
  { id: "k2", type: "out", note: "Beli alat kebersihan", amount: 75000, date: "13 Sep" },
  { id: "k3", type: "out", note: "Cetak jadwal piket", amount: 25000, date: "14 Sep" },
]

export const LEADERBOARD: LeaderboardEntry[] = [
  { id: "s1", name: "Edmund", points: 42 },
  { id: "s4", name: "Freissy", points: 38 },
  { id: "s13", name: "Andra", points: 35 },
  { id: "s11", name: "Madeline", points: 30 },
  { id: "s14", name: "Pauline", points: 28 },
]