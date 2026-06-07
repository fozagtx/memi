# Artifact Checklist

Place collected artifacts under `/Users/kaizen/Desktop/memi/artifacts/`.

## Required Before Submission

- Release APK
  - `android/app/build/outputs/apk/release/app-release.apk`
- Build log
  - `artifacts/logs/build-release.txt`
- Typecheck log
  - `artifacts/logs/typecheck.txt`
- Hardware proof
  - `artifacts/logs/hardware-proof.txt`
- Launch screenshot
  - `artifacts/screenshots/memi-launch.png`
- Generation screenshots
  - `artifacts/screenshots/memi-generate-loading.png`
  - `artifacts/screenshots/memi-generated-caption.png`
- Logcat from launch/generation
  - `artifacts/logs/memi-launch-logcat.txt`
  - `artifacts/logs/memi-generation-logcat.txt`
- Demo video
  - `artifacts/video/memi-demo.mp4`

## Create Artifact Folders

```bash
mkdir -p artifacts/logs artifacts/screenshots artifacts/video
```

## Capture Build Logs

```bash
./script/build_and_run.sh --typecheck > artifacts/logs/typecheck.txt 2>&1
./script/build_and_run.sh --release-apk > artifacts/logs/build-release.txt 2>&1
```

## Capture Hardware Proof

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
{
  "$ADB" devices -l
  "$ADB" -s 15214375AP004617 shell getprop ro.product.manufacturer
  "$ADB" -s 15214375AP004617 shell getprop ro.product.model
  "$ADB" -s 15214375AP004617 shell getprop ro.product.device
  "$ADB" -s 15214375AP004617 shell getprop ro.build.version.release
  "$ADB" -s 15214375AP004617 shell uname -m
} > artifacts/logs/hardware-proof.txt 2>&1
```

## Capture Screenshots

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 exec-out screencap -p > artifacts/screenshots/memi-launch.png
```

Use the same command during button loading and after generated captions appear.

## Capture Logcat

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 logcat -c
"$ADB" -s 15214375AP004617 shell am start -n com.anonymous.memi/.MainActivity
sleep 5
"$ADB" -s 15214375AP004617 logcat -d > artifacts/logs/memi-launch-logcat.txt
```

For generation:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 logcat -c
# Start recording, trigger Generate in the app, wait for result.
"$ADB" -s 15214375AP004617 logcat -d > artifacts/logs/memi-generation-logcat.txt
```

## Capture Demo Video

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 shell rm -f /sdcard/memi-demo.mp4
"$ADB" -s 15214375AP004617 shell screenrecord /sdcard/memi-demo.mp4
```

Stop recording with `Ctrl-C`, then pull the file:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 pull /sdcard/memi-demo.mp4 artifacts/video/memi-demo.mp4
```

## Submission Notes

- Keep raw logs. Do not only submit cropped screenshots.
- Include a short written note if the first model download happens during the
  demo. The loading button should show QVAC progress.
- If ADB drops during capture, reconnect USB, run the ADB recovery steps in
  `docs/REPRODUCIBILITY.md`, and retry the artifact command.

