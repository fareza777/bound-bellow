# BOUND BELOW — Android build

## Files

| File | Use |
|---|---|
| `BOUND-BELOW-3.0.1.apk` | Current direct install / share with testers (signed release APK) |
| `BOUND-BELOW-2.0.5.aab` | Legacy Google Play upload (rebuild for 3.0 store release) |
| `play-store/icon-512.png` | Play Store app icon (512×512) |
| `play-store/feature-graphic-1024x500.jpg` | Play Store feature graphic |
| `play-store/screenshots/` | Four 1920×1080 phone screenshots |
| `play-store/listing.md` | Store copy, category, data-safety notes |

- APK SHA-256: `530ff9923dd5c422a4c02efb6b47b73d267f228adaf0bdfad31af6d29de69b6a`
- Package: `com.boundbelow.game`
- Version: `3.0.1` (`versionCode 9`)
- Min Android: 7.0 / API 24
- Target SDK: 36
- Orientation: `fullSensor` — portrait and landscape both work
- The app is fullscreen, keeps the screen awake, and uses a floating D-pad plus
  a floating weep stick. Pause, bomb and active-relic buttons are always reachable.

## Install the APK

1. Copy `BOUND-BELOW-3.0.1.apk` to the phone.
2. Allow installation from the file manager/browser when prompted.
3. Install and launch **BOUND BELOW**.

Or with ADB:

```bash
adb install -r BOUND-BELOW-3.0.1.apk
```

## Google Play upload

1. Create the app in Play Console with package `com.boundbelow.game`.
2. Rebuild the App Bundle from this source, then upload it to the internal/closed testing track.
3. Enroll in Play App Signing and keep the upload key safe.
4. Fill the store listing from `play-store/listing.md`.
5. Upload the 512 icon, feature graphic and at least two screenshots.
6. Complete content rating and data safety. A hosted privacy-policy URL is
   required by Play Console; the local policy text is in the listing file.

## Signing key

- Keystore: `android/keystore/bound-below-release.jks`
- Alias: `boundbelow`
- Credentials: `android/keystore.properties` (keep private; never commit or share)
- Certificate SHA-256:
  `33:07:26:35:34:23:3D:5D:1C:53:DA:3B:A4:C8:47:A1:A3:40:3C:9F:CB:9D:81:0C:82:B1:0D:07:C0:B9:AF:E4`
- Back up the JKS and properties file. Losing this upload key complicates future
  Play Store updates.

## Checks performed

- `assembleRelease` succeeded for 3.0.1.
- APK verified with `apksigner` (v1/v2 signing, certificate SHA-256 matches).
- Release APK installed and launched on an Android 16 emulator; title screen,
  character portrait, voiced-intro screen and packaged WebView assets were confirmed.
- The 3.0 build includes the touch-first Android detection fix so the skill,
  relic, bomb and pause controls appear even when the WebView reports a mouse.
- Full gameplay, skill, relic and responsive layouts were exercised in the browser
  at 1440×900 and 390×844. The headless emulator became unstable after the intro,
  so a final on-device gameplay pass is still recommended before a Play Store release.
