# Seven Bro! — Android WebView Shell

Thin native Android app that wraps the live PWA at `https://sevenbro.vercel.app`.

**One APK for the shell; content updates from the server.** Feature/UI changes ship via Vercel. Rebuild the APK only when native shell behavior changes (permissions, system bars, WebView settings, signing).

## Why

Browser PWA still shows address bar / toolbar. This shell is a full-screen WebView: no browser chrome, layout matches the design system.

## App identity

| Field | Value |
|---|---|
| Application id | `com.sevenbro.app` |
| App name | **Seven BRO!** |
| Launcher icon | `public/pixel-duck.png` (HD pixel duck) · background **putih** `#FFFFFF` |
| Min SDK | 26 (Android 8) |
| Target / compile SDK | 35 |
| Loads | `BuildConfig.APP_URL` = `https://sevenbro.vercel.app` |
| Shell version | **1.1.0** (versionCode 11) — CLI build tanpa Android Studio |

## System bars (important)

MIUI/Xiaomi often ignores `decorFitsSystemWindows(true)`. Do **not** inject Android physical px as WebView CSS px (high-DPI → huge blank gaps).

**Current approach (shell 1.1.0):**
1. `WindowCompat.setDecorFitsSystemWindows(window, false)`
2. Pad **root** `FrameLayout` with `systemBars + displayCutout` insets (native View px)
3. WebView lays out between status bar and gesture nav
4. Shell sets web `--sevenbro-status-bar-inset` / `--sevenbro-nav-bar-inset` / `--sevenbro-safe-bottom` to `0` and forces header/nav padding `0` (no double offset)
5. `SevenBroShell.setChrome(dark)` syncs bar colors + light/dark system icons with app theme
6. WebView background = nav chrome (putih/gelap) — no color strip under bottom nav

| Theme | Bar color | System icons |
|---|---|---|
| Light (default) | `#FFFFFF` | Dark icons |
| Dark (in-app) | `#151B23` | Light icons |

## Build requirements (once per machine)

1. **JDK 17** — e.g. `winget install Microsoft.OpenJDK.17`
2. **Android SDK** — cmdline-tools + `platform-tools`, `platforms;android-35`, `build-tools;35.0.0`
3. Point `android/local.properties` at the SDK:
   ```
   sdk.dir=C:/Users/YOU/AppData/Local/Android/Sdk
   ```
4. **Gradle 8.7+** (or Android Studio)

## Commands

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

cd android
gradle assembleDebug
gradle assembleRelease
```

Artifacts:

- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`
- Distribution copies: `android/dist/SevenBro-<version>-release.apk` (install this; not committed)

## Install on phone

1. Copy the **release** APK to the device.
2. Allow **Install unknown apps**.
3. Install. If upgrading shell, uninstall old first when signature/settings look wrong.
4. Sign in with `@mutiarabangsa.sch.id`.

Play Protect may warn on sideload (unknown developer + WebView). **Install anyway**, or distribute later via Play Console closed testing.

## Signing (release)

`android/keystore.properties` + `android/sevenbro-release.keystore` are **gitignored**. Create once:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore sevenbro-release.keystore `
  -alias sevenbro -keyalg RSA -keysize 2048 -validity 10000
```

`android/keystore.properties`:

```
storeFile=sevenbro-release.keystore
storePassword=<password>
keyAlias=sevenbro
keyPassword=<password>
```

Keep the keystore backup safe. Losing it means future release APKs cannot update an installed app with the same signature.

## Update policy

| Change | Action |
|---|---|
| UI, API, roles, features (web) | Deploy to Vercel only — APK unchanged |
| WebView settings, system bars, icons, package, permissions | Bump `versionName`/`versionCode`, rebuild + redistribute APK |

## Web pieces paired with the shell

- `src/app/layout.tsx` — `viewportFit: "cover"` (browser PWA)
- `src/components/AppShell.tsx` — header/bottom-nav read `--sevenbro-*-inset` (0 on Android shell); bottom nav `env(safe-area-inset-bottom)` for browser
- `src/lib/prefs.ts` — `applyDarkMode` calls `SevenBroShell.setChrome` when bridge exists

## Device QA checklist

- [ ] Google login (`@mutiarabangsa.sch.id`)
- [ ] Session persists after force-stop
- [ ] No UI under status bar / gesture nav
- [ ] No huge blank gap above header
- [ ] Light mode: white bars + dark system icons
- [ ] Dark mode (Settings): dark bars + light system icons
- [ ] Mass Report photo (gallery + camera)
- [ ] TEACHER scan flow
- [ ] Pull-to-refresh
- [ ] Offline → **Coba Lagi**

## Project layout

```
android/
  app/src/main/java/com/sevenbro/app/MainActivity.kt
  app/src/main/res/...
  app/build.gradle.kts
  README.md
  keystore.properties          # local only
  sevenbro-release.keystore    # local only
  local.properties             # local only
  dist/                        # local APK copies, gitignored
```
