# Architecture

## Runtime

Memi is a React Native app built with Expo SDK 54 and the React Native New
Architecture enabled. Native QVAC support is provided through:

- `@qvac/sdk`
- `@qvac/embed-llamacpp`
- `react-native-bare-kit`
- `@qvac/sdk/expo-plugin`
- `@qvac/sdk/llamacpp-completion/plugin`

`qvac/worker.bundle.js` and `qvac/addons.manifest.json` are part of the native
QVAC worker setup.

## AI Path

All meme generation goes through `src/lib/meme-ai.ts`.

The app:

1. Dynamically imports `@qvac/sdk`.
2. Calls `qvac.loadModel()`.
3. Loads `SMOLVLM2_500M_MULTIMODAL_Q8_0`.
4. Loads `MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0`.
5. Sends the selected image path as a multimodal attachment.
6. Calls `qvac.completion()`.
7. Parses the returned JSON-like text.
8. Rejects placeholder/descriptive output.
9. Returns editable meme captions.

There is no cloud inference path and no Ollama fallback.

## Model Configuration

```ts
{
  ctx_size: 2048,
  device: "cpu",
  gpu_layers: 0,
  predict: 48,
  projectionModelSrc: qvac.MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0
}
```

Completion generation:

```ts
{
  predict: 48,
  temp: 0.8,
  top_p: 0.9
}
```

Timeout:

```text
45 seconds
```

The app cancels the QVAC request when the timeout is hit and tells the user to
retry or manually edit captions.

## UX States

- Native splash uses generated Memi bitmap logo.
- React launch handoff shows logo, tagline, and loading meter.
- Permission state offers camera grant or photo picker.
- Generate button shows a water-fill percentage.
- Successful generation triggers a 3-second animated image border.
- Captions are editable in top and bottom fields.
- Bottom caption is optional.
- Save/share render the meme frame to PNG through `react-native-view-shot`.

## RAG

Memi does not use RAG in the current release. If RAG is added for template
retrieval, caption memory, or style packs, it should use QVAC SDK embeddings/RAG
functions and a local vector store.

