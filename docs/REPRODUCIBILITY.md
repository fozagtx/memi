# Reproducibility and Hardware Setup

## Host Requirements

- macOS development host
- Node.js and npm
- Android Studio or Android SDK with platform tools
- Java from Android Studio JBR
- Physical Android phone with USB debugging enabled

The repo script configures Android SDK and Java paths when they exist in the
standard macOS locations.

## Install Dependencies

```bash
cd /Users/kaizen/Desktop/memi
npm ci
```

## Verify TypeScript

```bash
./script/build_and_run.sh --typecheck
```

Expected result: no output and exit code `0`.

## Build Android Release APK

```bash
./script/build_and_run.sh --release-apk
```

Expected artifact:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The release APK embeds the JavaScript bundle, generated image assets, QVAC
native worker bundle, and Android native libraries.

## Connect Hardware

On the Android phone:

1. Enable Developer Options.
2. Enable USB debugging.
3. Connect USB.
4. Choose a USB mode that allows debugging.
5. Accept the Android RSA debugging prompt.

Check visibility:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" devices -l
```

Expected example:

```text
15214375AP004617 device usb:3-1 product:KM7k-OP model:TECNO_KM7k device:TECNO-KM7k
```

## Install

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 install --no-streaming -r android/app/build/outputs/apk/release/app-release.apk
```

Expected result:

```text
Performing Push Install
Success
```

## Launch

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 shell am start -n com.anonymous.memi/.MainActivity
```

## Capture Screenshot

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 exec-out screencap -p > artifacts/screenshots/memi-launch.png
```

## Capture Logs

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" -s 15214375AP004617 logcat -c
"$ADB" -s 15214375AP004617 shell am start -n com.anonymous.memi/.MainActivity
sleep 5
"$ADB" -s 15214375AP004617 logcat -d > artifacts/logs/memi-launch-logcat.txt
```

QVAC-focused filter:

```bash
rg -i "qvac|memi|reactnative|fatal|exception|crash" artifacts/logs/memi-launch-logcat.txt
```

## ADB Recovery

If install or launch says `waiting for device` or `device not found`:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" kill-server
sleep 1
"$ADB" start-server
"$ADB" devices -l
```

If the device list is still empty:

1. Unlock the phone.
2. Reconnect USB.
3. Re-select USB debugging/file transfer mode.
4. Accept the RSA debugging prompt.
5. Retry `adb devices -l`.

## First Run Model Download

The first `Generate` call downloads the QVAC multimodal model and projection
weights. Keep the phone online for the first run. Later runs use the device
cache and avoid repeated downloads unless the cache is cleared.

## Offline Verification

After one successful model download:

1. Disable Wi-Fi/mobile data on the phone.
2. Launch Memi.
3. Pick an image already on the phone.
4. Tap `Generate`.
5. Verify captions are produced without a cloud provider.

