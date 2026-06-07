# Memi Submission Dossier

## One-Line Pitch

Create memes from anywhere with a 100% local QVAC-powered mobile app: snap a
photo, run multimodal inference on consumer hardware, edit the caption, and save
or share without sending the image to a cloud AI provider.

## Track

Mobile track.

Memi targets a physical Android phone with `arm64-v8a` native libraries. The
current hardware used during development is:

- Device: `TECNO_KM7k`
- Product: `KM7k-OP`
- ADB serial: `15214375AP004617`
- App id: `com.anonymous.memi`

## Mandatory Requirements Map

| Requirement | Status | Evidence |
| --- | --- | --- |
| Must use QVAC SDK for all AI inference and RAG | Met for current app scope | `src/lib/meme-ai.ts` imports `@qvac/sdk`, loads the QVAC multimodal model, and calls `qvac.completion()`. No Ollama/cloud fallback remains. Memi has no RAG subsystem. |
| Follow a participant/hardware track | Mobile track | Android `arm64-v8a` release APK and physical TECNO test phone. |
| Full reproducibility instructions and hardware setup | Included | See `docs/REPRODUCIBILITY.md`. |
| Complete artifacts: logs, demo video, hardware proof | Collection plan included | See `docs/ARTIFACTS.md`. Put captured files under `artifacts/`. |

## Core Criteria Map

| Criterion | Current Implementation |
| --- | --- |
| Innovation | Local meme generation from a real photo on a phone, with private local inference and editable output. |
| Capabilities | Multimodal image-to-caption inference, progress states, save/share rendering. Tool calling and multi-agent orchestration are not implemented in this release. |
| Artifact Quality | Build scripts, hardware commands, APK path, log/screenshot/video checklist, and generated assets are documented. |
| Performance | Uses a lighter QVAC multimodal model, CPU-only config, short context, short prediction window, 45s timeout, cached model id, and native release APK. |
| Complexity and UX | Camera/gallery flow, glass UI, generated logo, native splash, water-fill loading button, editable top/bottom captions, save/share, and failure states. |
| Model Usage and Coverage | Uses QVAC multimodal model constants for image-conditioned caption generation. Psy models are not used in this meme app version. |
| Social Engagement Bonus | Not represented in code. Capture public build links separately if posting in public. |

## Honest Limitations

- First QVAC model download is large and needs a network connection. After cache,
  the app is local-first.
- The connected TECNO phone had intermittent ADB USB drops during verification.
  APK installation succeeded, but post-install screenshot capture may require
  reconnecting USB and accepting the debugging prompt again.
- No P2P load distribution is implemented yet. QVAC supports delegated/P2P
  inference, but Memi currently runs locally on the phone.
- No RAG is implemented because meme captioning does not need document retrieval.

## Demo Script

1. Show the phone model and ADB device proof.
2. Launch Memi from the Android launcher and show the native generated icon.
3. Show the splash/launch screen with Memi logo.
4. Grant camera permission or pick a gallery image.
5. Tap `Generate`.
6. Show the water-fill percentage on the button.
7. Wait for QVAC caption output.
8. Show the 3-second animated image border.
9. Edit one caption line.
10. Save or share the final meme.

