import * as Device from "expo-device";

import type { GenerateMemeParams, MemeDraft } from "../types";

const toneMap = {
  chaotic: "internet-chaotic, sharp, absurd, but not cruel",
  deadpan: "dry, minimal, deadpan, almost too calm",
  wholesome: "warm, playful, affectionate, never saccharine",
  workplace: "office-culture, Slack-thread, meeting-fatigue funny",
};

const GENERATED_CAPTION_CHAR_LIMIT = 56;
const GENERATED_CAPTION_WORD_LIMIT = 10;
const QVAC_COMPLETION_TIMEOUT_MS = 45000;

function buildQvacPrompt(tone: keyof typeof toneMap) {
  return [
    `Meme this image. Tone: ${toneMap[tone]}.`,
    'Return only JSON: {"topText":"short meme line","bottomText":"","scene":"short scene","jokeAngle":"short angle","tags":["tag"]}',
    "One line is OK; leave bottomText empty if not needed.",
    "Max 7 words per meme line. Do not describe the image.",
  ].join("\n");
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Model did not return JSON.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function parseModelPayload(text: string): unknown {
  try {
    return extractJson(text);
  } catch {
    return {};
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function cleanCaption(value: string) {
  return value
    .replace(/^[\s"'`*_#>-]+/, "")
    .replace(/[\s"'`*_#<{-]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 84);
}

function isPlaceholderText(value: string) {
  const normalized = cleanCaption(value).toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    "caption",
    "short meme setup",
    "short meme punchline",
    "object one",
    "object two",
    "option one",
    "option two",
    "option three",
    "what is visible",
    "why it is funny",
    "tag",
  ].some((placeholder) => normalized === placeholder || normalized.includes(placeholder));
}

function normalizedCaption(value: string) {
  return cleanCaption(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generatedCaptionIssue(value: string) {
  const cleaned = cleanCaption(value);
  const normalized = normalizedCaption(cleaned);
  const wordCount = normalized.split(" ").filter(Boolean).length;

  if (!cleaned) {
    return "empty";
  }

  if (isPlaceholderText(cleaned)) {
    return "placeholder";
  }

  if (cleaned.length > GENERATED_CAPTION_CHAR_LIMIT || wordCount > GENERATED_CAPTION_WORD_LIMIT) {
    return "too long";
  }

  if (
    /^this is (a|an|the) (joke|image|photo|picture|caption|man|woman|person|scene)\b/.test(normalized) ||
    /\bjoke about\b/.test(normalized) ||
    /\b(the image|this image|the photo|this photo|the picture|this picture) (shows|contains|has)\b/.test(normalized) ||
    /\b(a man|a woman|a person|he|she|they) (wears|wearing|is wearing)\b/.test(normalized) ||
    /\bis looking at\b/.test(normalized)
  ) {
    return "description";
  }

  return "";
}

function cleanGeneratedCaption(value: string) {
  const cleaned = cleanCaption(value);
  return generatedCaptionIssue(cleaned) ? "" : cleaned;
}

function captionsMatch(first: string, second: string) {
  const left = normalizedCaption(first);
  const right = normalizedCaption(second);
  return Boolean(left && right && left === right);
}

function textCandidates(rawText: string) {
  const withoutJsonNoise = rawText
    .replace(/[{}[\],]/g, "\n")
    .replace(/"(scene|objects|jokeAngle|topText|bottomText|altCaptions|tags)"\s*:/gi, "\n");

  return withoutJsonNoise
    .split(/\r?\n|[•]/)
    .map(cleanCaption)
    .filter((line) => {
      if (line.length < 4 || line.length > 84) {
        return false;
      }

      return !/^(json|top|bottom|caption|scene|objects|tags)$/i.test(line) &&
        !generatedCaptionIssue(line);
    });
}

function captionPairFromCandidates(candidates: string[]) {
  const unique = Array.from(
    new Set(candidates.map(cleanGeneratedCaption).filter(Boolean)),
  );
  const top = unique[0] ?? "";
  const bottom = unique.find((line) => !captionsMatch(line, top)) ?? "";

  return { top, bottom };
}

function fallbackCaptionPair(record: Record<string, unknown>, rawText: string) {
  const candidates = [
    ...toStringArray(record.altCaptions),
    ...toStringArray(record.captions),
    ...toStringArray(record.memeCaptions),
    firstString(record, ["caption", "memeText", "punchline", "jokeAngle"]),
    ...textCandidates(rawText),
  ].filter(Boolean);

  const pair = captionPairFromCandidates(candidates);
  return {
    top: pair.top,
    bottom: pair.bottom,
  };
}

function coerceDraft(value: unknown, provider: string, rawText = ""): MemeDraft {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};

  const fallback = fallbackCaptionPair(record, rawText);
  const rawTopText =
    firstString(record, ["topText", "top", "topCaption", "top_text", "setup"]) ||
    fallback.top;
  const rawBottomText =
    firstString(record, ["bottomText", "bottom", "bottomCaption", "bottom_text", "punchline"]) ||
    fallback.bottom;
  const altCaptions = toStringArray(record.altCaptions).slice(0, 5);

  let cleanedTop = cleanGeneratedCaption(rawTopText);
  let cleanedBottom = cleanGeneratedCaption(rawBottomText);

  if (captionsMatch(cleanedTop, cleanedBottom)) {
    cleanedBottom = "";
  }

  if (!cleanedTop && !cleanedBottom) {
    throw new Error(
      `${provider} described the image but did not produce usable meme text. Regenerate or edit the captions manually.`,
    );
  }

  return {
    scene: String(record.scene ?? "Unclear scene").trim(),
    objects: toStringArray(record.objects),
    jokeAngle: String(record.jokeAngle ?? "Visual mismatch").trim(),
    topText: cleanedTop,
    bottomText: cleanedBottom,
    altCaptions: (altCaptions.length ? altCaptions : [fallback.top, fallback.bottom])
      .map(cleanGeneratedCaption)
      .filter(Boolean),
    tags: toStringArray(record.tags).slice(0, 8),
    provider,
  };
}

let qvacModelId: string | null = null;
let qvacLoadPromise: Promise<string> | null = null;

async function getQvacModel(onProgress?: (message: string) => void) {
  if (qvacModelId) {
    return qvacModelId;
  }

  if (!qvacLoadPromise) {
    qvacLoadPromise = (async () => {
      const qvac = await import("@qvac/sdk");
      const modelId = await qvac.loadModel({
        modelSrc: qvac.SMOLVLM2_500M_MULTIMODAL_Q8_0,
        modelType: "llm",
        modelConfig: {
          ctx_size: 2048,
          device: "cpu",
          gpu_layers: 0,
          predict: 48,
          projectionModelSrc: qvac.MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0,
        },
        onProgress: (progress: { percentage?: number }) => {
          const percent = progress.percentage;
          onProgress?.(
            typeof percent === "number"
              ? `Loading QVAC ${percent.toFixed(0)}%`
              : "Loading QVAC",
          );
        },
      });

      qvacModelId = modelId;
      return modelId;
    })();
  }

  try {
    return await qvacLoadPromise;
  } catch (error) {
    qvacLoadPromise = null;
    throw error;
  }
}

export async function generateWithQvac({
  imageUri,
  settings,
  onProgress,
}: GenerateMemeParams): Promise<MemeDraft> {
  if (process.env.EXPO_OS === "ios" && !Device.isDevice) {
    throw new Error(
      "QVAC vision is disabled in iOS Simulator because the simulator Metal driver crashes while loading multimodal weights. Run this on a physical iPhone to use the QVAC model.",
    );
  }

  onProgress?.("Preparing QVAC");
  const qvac = await import("@qvac/sdk");
  const modelId = await getQvacModel(onProgress);
  const path = imageUri.replace(/^file:\/\//, "");

  onProgress?.("Running on device");
  const run = qvac.completion({
    modelId,
    stream: false,
    responseFormat: {
      type: "text",
    },
    generationParams: {
      predict: 48,
      temp: 0.8,
      top_p: 0.9,
    },
    history: [
      {
        role: "user",
        content: buildQvacPrompt(settings.tone),
        attachments: [{ path }],
      },
    ],
  });

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      qvac.cancel({ requestId: run.requestId }).catch(() => undefined);
      reject(new Error("QVAC took too long on this phone. Try again or edit the captions manually."));
    }, QVAC_COMPLETION_TIMEOUT_MS);
  });
  const result = await Promise.race([run.final, timeout]);
  const content = result.contentText || result.raw.fullText;
  return coerceDraft(parseModelPayload(content), "QVAC SmolVLM2 500M", content);
}

export function generateMeme(params: GenerateMemeParams) {
  return generateWithQvac(params);
}
