# Memi

Memi is a local-first React Native / Expo meme maker for the QVAC mobile track.
It lets a user snap or pick a photo, runs a QVAC multimodal model on the device,
drafts meme captions, then saves or shares the final image.

The app is built to avoid paid cloud inference. All app AI inference goes through
`@qvac/sdk`; there is no Ollama, OpenAI, or hosted model fallback in the product
path.

## Current Build

- App id: `com.anonymous.memi`
- Platform target: Android physical device, `arm64-v8a`
- Track: Mobile
- Native SDK: `@qvac/sdk`
- QVAC addon: `@qvac/sdk/llamacpp-completion/plugin`
- Model: `SMOLVLM2_500M_MULTIMODAL_Q8_0`
- Projection model: `MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0`
- First-run model download: about 546 MB, then served from local cache
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`

## App Flow

1. Launch Memi.
2. Grant camera permission or pick a gallery image.
3. Tap `Generate`.
4. The button fills like water and shows QVAC progress percentage.
5. QVAC analyzes the image locally and returns meme text.
6. The image border plays a 3-second AI activation animation.
7. Edit top or bottom caption if needed.
8. Save or share the rendered meme.

## Reproduce

```bash
npm ci
./script/build_and_run.sh --typecheck
./script/build_and_run.sh --release-apk
```

Install on the connected Android phone:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" devices -l
"$ADB" install --no-streaming -r android/app/build/outputs/apk/release/app-release.apk
"$ADB" shell am start -n com.anonymous.memi/.MainActivity
```

If ADB loses the TECNO phone, reset the daemon:

```bash
ADB="$HOME/Library/Android/sdk/platform-tools/adb"
"$ADB" kill-server
sleep 1
"$ADB" start-server
"$ADB" devices -l
```

## Documentation

- [Submission dossier](docs/SUBMISSION.md)
- [Reproducibility and hardware setup](docs/REPRODUCIBILITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Artifact checklist](docs/ARTIFACTS.md)

## QVAC References

- QVAC SDK overview: https://qvac.tether.io/dev/sdk/
- QVAC Expo tutorial: https://docs.qvac.tether.io/sdk/tutorials/expo/
- QVAC `loadModel()`: https://docs.qvac.tether.io/sdk/api/loadModel/
- QVAC `completion()`: https://docs.qvac.tether.io/sdk/api/completion/
- QVAC RAG capability: https://docs.qvac.tether.io/ai-capabilities/rag/

## Notes

- Memi currently has no RAG subsystem. If RAG is added, it must use QVAC SDK
  embeddings/RAG APIs, not a hosted service.
- iOS Simulator QVAC vision is blocked in code because the simulator Metal path
  can crash while loading multimodal projection weights. Use a physical iPhone
  for iOS QVAC tests.
- The Android permission list is intentionally small: camera, image read, save,
  vibration, and network access for first model download. `RECORD_AUDIO` is
  blocked at manifest merge.
