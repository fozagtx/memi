export type MemeTone = "chaotic" | "deadpan" | "wholesome" | "workplace";

export type AppSettings = {
  tone: MemeTone;
};

export type MemeDraft = {
  scene: string;
  objects: string[];
  jokeAngle: string;
  topText: string;
  bottomText: string;
  altCaptions: string[];
  tags: string[];
  provider: string;
};

export type GenerateMemeParams = {
  imageUri: string;
  settings: AppSettings;
  onProgress?: (message: string) => void;
};
