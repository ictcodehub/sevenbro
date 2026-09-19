# Push Notification (FCM) — Seven Bro!

> Status: **infra kode siap**. Aktif setelah: migration 014 + env `FCM_SERVER_KEY` + `google-services.json` + rebuild APK.

## Arsitektur

```text
Event (Info / Report / Agenda / …)
  → insert notifications (Supabase)
  → sendFcmPush() via FCM HTTP
  → status bar Android
  → tap → MainActivity path → WebView load path
```

## Web (server)

| File | Peran |
|---|---|
| `supabase/migrations/014_push_tokens.sql` | Tabel `push_tokens` |
| `src/lib/push-fcm.ts` | Sender FCM legacy + `pushPathForKind` |
| `src/lib/notify.ts` | Setelah insert notif → push ke token |
| `src/app/api/push/register/route.ts` | POST daftar token · DELETE hapus |
| `src/lib/push-client.ts` | Register token dari `SevenBroShell` |

### Env Vercel / local (utama — FCM HTTP v1)

Firebase sering **tidak menampilkan Server key** (legacy sudah dihapus). Pakai **Service Account**:

1. Firebase → **Project settings → Service accounts**
2. **Generate new private key** → file JSON
3. Isi env Vercel (dari isi JSON):

```env
FIREBASE_PROJECT_ID=sevenbro-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@sevenbro-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`FIREBASE_PRIVATE_KEY`: gunakan `\n` literal untuk baris baru (aman di dashboard Vercel).

Jangan commit file JSON service account.

```env
# Opsional (hanya kalau project masih punya Server key)
FCM_SERVER_KEY=
```

Tanpa env di atas: notif in-app tetap jalan, push status bar tidak terkirim.

### Push dipicu oleh

`createClassNotification` / `notifyEmails` → audience email atau `HOMEROOM`.

Path tap: `announcement`→`/app/pengumuman` · `report`→`/app/poin` · `agenda`→`/app/agenda` · dst.

## Android shell

| File | Peran |
|---|---|
| `SevenBroFirebaseMessagingService.kt` | Terima FCM + notifikasi + intent path |
| `ShellBridge` | `getFcmToken()` / simpan token |
| `MainActivity` | Minta izin notif · load path dari intent |
| `app/google-services.json` | **Jangan commit** — salin lokal |
| `build.gradle` | plugin `com.google.gms.google-services` + BOM firebase-messaging |

### Langkah native (developer)

1. Firebase Console → **+ Add app** → Android  
2. Package: `com.sevenbro.app` · nickname bebas  
3. **Download `google-services.json`** → `android/app/` (**jangan commit**)  
4. Gradle sudah dipasang:  
   - root `android/build.gradle.kts`: plugin `com.google.gms.google-services` 4.5.0  
   - `android/app/build.gradle.kts`: apply plugin + `firebase-bom` + `firebase-messaging`  
   - **Jangan** tambah `firebase-analytics` (tidak perlu push)  
5. Sync Gradle di Android Studio  
6. `FCM_SERVER_KEY` di Vercel (Settings → Cloud Messaging)  
7. Bump versionCode bila perlu · rebuild APK  
8. Login sekali → token ke `/api/push/register`

### Bridge (web ↔ native)

```js
window.SevenBroShell.getFcmToken()           // string | null
// layout app memanggil useFcmTokenRegister()
```

## Uji cepat

1. Set `FCM_SERVER_KEY` di Vercel + redeploy  
2. `npx supabase db push` (014)  
3. Login di app Android → cek `push_tokens`  
4. Sekretaris terbitkan brief → HP muncul notif  
5. Tap notif → buka Info  

| Shell version | **1.1.0** (versionCode 11) — CLI build OK tanpa Android Studio |

### Build CLI (tanpa Android Studio)

JDK 17 + Android SDK (`AppData/Local/Android/Sdk`) + `google-services.json` sudah cukup.

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "C:\Users\HeyTAYO\AppData\Local\Android\Sdk"
cd D:\Workspace\sevenbro\android
.\gradlew.bat assembleRelease --no-daemon
# APK: android/app/build/outputs/apk/release/app-release.apk
# dist: android/dist/SevenBro-1.1.0-release.apk
```

- Push **gagal silent** — tidak boleh membatalkan aksi utama
- Token duplikat di-handle unique `fcm_token`
- Tanpa `google-services.json`, app tetap build normal (tanpa FCM)
