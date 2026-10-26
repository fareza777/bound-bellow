# BOUND BELOW — Android build

## Files

| File | Use |
|---|---|
| `BOUND-BELOW-2.0.5.apk` | Direct install / share with testers (signed release APK) |
| `BOUND-BELOW-2.0.5.aab` | Google Play upload (signed release App Bundle) |
| `play-store/icon-512.png` | Play Store app icon (512×512) |
| `play-store/feature-graphic-1024x500.jpg` | Play Store feature graphic |
| `play-store/screenshots/` | Four 1920×1080 phone screenshots |
| `play-store/listing.md` | Store copy, category, data-safety notes |

- APK SHA-256: `a79bef6cdc7c8ae3d0f51504c337111b0d38ab8b2d08782823892982755f0d1c`
- AAB SHA-256: `a50c859ae455410d7b019ab4b699eca8119c4ff2caf4ed0249059b950b211ee1`
- Package: `com.boundbelow.game`
- Version: `2.0.2` (`versionCode 4`)
- Min Android: 7.0 / API 24
- Target SDK: 36
- Orientation: `fullSensor` — portrait and landscape both work
- The app is fullscreen, keeps the screen awake, and uses a floating D-pad plus
  a floating weep stick. Pause, bomb and active-relic buttons are always reachable.

## Install the APK

1. Copy `BOUND-BELOW-2.0.5.apk` to the phone.
2. Allow installation from the file manager/browser when prompted.
3. Install and launch **BOUND BELOW**.

Or with ADB:

```bash
adb install -r BOUND-BELOW-2.0.5.apk
```

## Google Play upload

1. Create the app in Play Console with package `com.boundbelow.game`.
2. Upload `BOUND-BELOW-2.0.5.aab` to the internal/closed testing track.
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

- `assembleRelease` and `bundleRelease` succeeded.
- APK verified with `apksigner`; AAB verified with `jarsigner`.
- Release APK installed and launched on an Android 16 emulator.
- Title, chapter flow, gameplay, portrait/landscape rotation and the floating
  D-pad were exercised on the emulator.
