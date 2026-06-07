import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  Camera,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from "react-native";
import { captureRef } from "react-native-view-shot";

import { GlassButton, GlassPanel } from "./src/components/glass";
import { generateMeme } from "./src/lib/meme-ai";
import { useSettings } from "./src/lib/storage";
import type { MemeDraft } from "./src/types";

const iconColor = "#ffffff";
const logoMarkSource = require("./assets/logo-mark.png");

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const memeRef = useRef<View>(null);

  const [settings] = useSettings();
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [draft, setDraft] = useState<MemeDraft | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [generationPercent, setGenerationPercent] = useState(0);
  const [error, setError] = useState("");
  const [showLaunch, setShowLaunch] = useState(true);
  const aiBorder = useRef(new Animated.Value(0)).current;
  const launchFill = useRef(new Animated.Value(0)).current;
  const launchPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fillAnimation = Animated.timing(launchFill, {
      toValue: 1,
      duration: 920,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(launchPulse, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(launchPulse, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 2 }
    );
    const nativeTimer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    }, 80);
    const launchTimer = setTimeout(() => setShowLaunch(false), 1080);

    fillAnimation.start();
    pulseAnimation.start();

    return () => {
      clearTimeout(nativeTimer);
      clearTimeout(launchTimer);
      fillAnimation.stop();
      pulseAnimation.stop();
    };
  }, [launchFill, launchPulse]);

  useEffect(() => {
    if (!busy || progress !== "Running on device") {
      return undefined;
    }

    const timer = setInterval(() => {
      setGenerationPercent((value) => Math.min(92, value + 1.5));
    }, 650);

    return () => clearInterval(timer);
  }, [busy, progress]);

  function updateGenerationProgress(message: string) {
    setProgress(message);

    const qvacMatch = message.match(/Loading QVAC (\d+(?:\.\d+)?)%/);
    if (qvacMatch) {
      const percent = Number(qvacMatch[1]);
      if (Number.isFinite(percent)) {
        setGenerationPercent(Math.min(58, 12 + percent * 0.46));
      }
      return;
    }

    if (message === "Reading image") {
      setGenerationPercent(6);
      return;
    }

    if (message === "Preparing QVAC") {
      setGenerationPercent(10);
      return;
    }

    if (message === "Running on device") {
      setGenerationPercent((value) => Math.max(value, 62));
    }
  }

  function playMemeBorderAnimation() {
    aiBorder.stopAnimation();
    aiBorder.setValue(0);
    Animated.timing(aiBorder, {
      toValue: 1,
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => aiBorder.setValue(0));
  }

  function updateImage(uri: string) {
    setImageUri(uri);
    setDraft(null);
    setTopText("");
    setBottomText("");
    setError("");
    setProgress("");
    setGenerationPercent(0);
    aiBorder.setValue(0);
  }

  function resetImage() {
    setImageUri(null);
    setDraft(null);
    setTopText("");
    setBottomText("");
    setError("");
    setProgress("");
    setGenerationPercent(0);
    aiBorder.setValue(0);
  }

  async function takePhoto() {
    try {
      await Haptics.selectionAsync();
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });

      if (photo?.uri) {
        updateImage(photo.uri);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Camera failed.");
    }
  }

  async function pickImage() {
    try {
      await Haptics.selectionAsync();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.86,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        updateImage(result.assets[0].uri);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Picker failed.");
    }
  }

  async function runGeneration() {
    if (!imageUri || busy) {
      return;
    }

    setBusy(true);
    setError("");
    updateGenerationProgress("Reading image");

    try {
      const nextDraft = await generateMeme({
        imageUri,
        settings,
        onProgress: updateGenerationProgress,
      });

      setDraft(nextDraft);
      setTopText(nextDraft.topText);
      setBottomText(nextDraft.bottomText);
      setGenerationPercent(100);
      setProgress("Draft ready");
      playMemeBorderAnimation();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Generation failed.";
      setError(message);
      setProgress("");
      setGenerationPercent(0);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  async function captureMeme() {
    if (!memeRef.current) {
      throw new Error("Meme frame is not ready.");
    }

    return captureRef(memeRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  }

  async function saveMeme() {
    try {
      const uri = await captureMeme();
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Photo save permission denied.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      setProgress("Saved");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your meme was saved to your photos.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
    }
  }

  async function shareMeme() {
    try {
      const uri = await captureMeme();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", uri);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share meme",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Share failed.");
    }
  }

  if (showLaunch) {
    return <LaunchSplash fill={launchFill} pulse={launchPulse} />;
  }

  if (!cameraPermission?.granted && !imageUri) {
    return (
      <View style={styles.stage}>
        <StatusBar style="light" />
        <GlassPanel style={styles.permissionPanel}>
          <MemiLogo large />
          <Text style={styles.permissionKicker}>Create memes from anywhere.</Text>
          <Text style={styles.permissionText}>
            Grant camera access to snap a photo, or pick one from your gallery.
          </Text>
          <View style={styles.permissionActions}>
            <GlassButton
              label="Grant camera"
              icon={<Camera color={iconColor} size={18} />}
              onPress={requestCameraPermission}
              style={styles.permissionButton}
            />
            <GlassButton
              label="Pick photo"
              icon={<ImageIcon color={iconColor} size={18} />}
              onPress={pickImage}
              style={styles.permissionButton}
            />
          </View>
        </GlassPanel>
      </View>
    );
  }

  if (!imageUri) {
    return (
      <View style={styles.stage}>
        <StatusBar style="light" />
        <CameraView ref={cameraRef} facing={cameraFacing} mirror style={styles.camera} />
        <View style={styles.cameraScrim} />
        <View style={styles.captureTop}>
          <GlassPanel style={styles.brandPill}>
            <MemiLogo />
          </GlassPanel>
        </View>
        <View style={styles.captureDock}>
          <GlassButton
            label="Gallery"
            icon={<ImageIcon color={iconColor} size={18} />}
            onPress={pickImage}
            style={styles.sideButton}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            onPress={takePhoto}
            style={({ pressed }) => [
              styles.shutter,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <View style={styles.shutterCore} />
          </Pressable>
          <GlassButton
            label="Flip"
            icon={<RotateCcw color={iconColor} size={18} />}
            onPress={() => setCameraFacing((next) => (next === "back" ? "front" : "back"))}
            style={styles.sideButton}
          />
        </View>
        {error ? <FloatingError message={error} /> : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.stage}
    >
      <StatusBar style="light" />
      <Image source={{ uri: imageUri }} blurRadius={24} style={styles.backdropImage} />
      <View style={styles.editorScrim} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.editorContent}
      >
        <View style={styles.topBar}>
          <GlassPanel style={styles.brandPill}>
            <MemiLogo />
          </GlassPanel>
          <GlassButton
            label="New"
            destructive
            icon={<X color={iconColor} size={18} />}
            onPress={resetImage}
            style={{ minWidth: 94 }}
          />
        </View>

        <View ref={memeRef} collapsable={false} style={styles.memeFrame}>
          <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.memeImage} />
          <View pointerEvents="none" style={styles.memeVignette} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.aiBorder,
              {
                opacity: aiBorder.interpolate({
                  inputRange: [0, 0.08, 0.82, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                borderColor: aiBorder.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: ["#7dd3fc", "#c084fc", "#f0abfc", "#7dd3fc"],
                }),
                transform: [
                  {
                    scale: aiBorder.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.012, 1],
                    }),
                  },
                ],
              },
            ]}
          />
          <MemeLine position="top" text={topText || " "} />
          <MemeLine position="bottom" text={bottomText || " "} />
        </View>

        <GlassPanel style={styles.actionPanel}>
          <View style={styles.actionRow}>
            <GlassButton
              label={draft ? "Regenerate" : "Generate"}
              busy={busy}
              progress={busy ? generationPercent : undefined}
              icon={
                draft ? (
                  <RefreshCw color={iconColor} size={18} />
                ) : (
                  <Sparkles color={iconColor} size={18} />
                )
              }
              onPress={runGeneration}
              style={styles.primaryAction}
            />
            <GlassButton
              label="Save"
              icon={<Save color={iconColor} size={18} />}
              onPress={saveMeme}
              style={styles.compactAction}
            />
            <GlassButton
              label="Share"
              icon={<Share2 color={iconColor} size={18} />}
              onPress={shareMeme}
              style={styles.compactAction}
            />
          </View>

          {progress || error ? (
            <Text
              selectable
              style={[styles.statusText, error ? styles.errorText : undefined]}
            >
              {error || progress}
            </Text>
          ) : null}
        </GlassPanel>

        <GlassPanel style={styles.editorPanel}>
          <Label text="Top" />
          <CaptionInput value={topText} onChangeText={setTopText} />
          <Label text="Bottom optional" />
          <CaptionInput value={bottomText} onChangeText={setBottomText} />

          {draft ? (
            <View style={styles.readout}>
              <Text selectable style={styles.readoutTitle}>
                {draft.scene}
              </Text>
              <Text selectable style={styles.readoutBody}>
                {draft.jokeAngle}
              </Text>
              <View style={styles.tagRow}>
                {draft.tags.slice(0, 5).map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </GlassPanel>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MemeLine({ position, text }: { position: "top" | "bottom"; text: string }) {
  return (
    <View
      style={[
        styles.memeLineWrap,
        position === "top" ? styles.memeTop : styles.memeBottom,
      ]}
    >
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.52}
        numberOfLines={2}
        style={styles.memeLine}
      >
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

function Label({ text, error }: { text: string; error?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{text}</Text>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
    </View>
  );
}

function CaptionInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Caption"
      placeholderTextColor="rgba(255,255,255,0.45)"
      multiline
      maxLength={84}
      style={styles.captionInput}
    />
  );
}

function LaunchSplash({
  fill,
  pulse,
}: {
  fill: Animated.Value;
  pulse: Animated.Value;
}) {
  const fillWidth = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ["7%", "100%"],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.82],
  });
  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.1],
  });

  return (
    <View style={styles.launchStage}>
      <StatusBar style="light" />
      <View style={styles.launchGrid} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.launchHalo,
          {
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <View style={styles.launchContent}>
        <MemiLogo large />
        <Text style={styles.launchTagline}>Create memes from anywhere</Text>
        <View style={styles.launchMeter}>
          <Animated.View style={[styles.launchMeterFill, { width: fillWidth }]} />
        </View>
      </View>
    </View>
  );
}

function MemiLogo({ large }: { large?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <Image
        resizeMode="contain"
        source={logoMarkSource}
        style={[styles.logoMarkImage, large ? styles.logoMarkImageLarge : undefined]}
      />
      <Text style={[styles.logoWord, large ? styles.logoWordLarge : undefined]}>
        Memi
      </Text>
    </View>
  );
}

function FloatingError({ message }: { message: string }) {
  return (
    <View style={styles.floatingError}>
      <Text selectable style={styles.errorText}>
        {message}
      </Text>
    </View>
  );
}

const fieldBase: TextStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
  backgroundColor: "rgba(3,8,16,0.52)",
  color: "#ffffff",
  fontSize: 16,
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#06080f",
  },
  launchStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#06080f",
    paddingHorizontal: 28,
  },
  launchGrid: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(125,211,252,0.03)",
  },
  launchHalo: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 2,
    borderColor: "rgba(125,211,252,0.50)",
    backgroundColor: "rgba(192,132,252,0.08)",
  },
  launchContent: {
    alignItems: "center",
    gap: 18,
    width: "100%",
    maxWidth: 330,
  },
  launchTagline: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  launchMeter: {
    width: "74%",
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  launchMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(96,195,255,0.72)",
  },
  camera: {
    flex: 1,
  },
  cameraScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  captureTop: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 64,
    alignItems: "flex-start",
  },
  brandPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  logoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  logoMarkImage: {
    width: 31,
    height: 31,
  },
  logoMarkImageLarge: {
    width: 44,
    height: 44,
  },
  logoWord: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  logoWordLarge: {
    fontSize: 32,
  },
  captureDock: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 34,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sideButton: {
    width: 112,
  },
  shutter: {
    width: 82,
    height: 82,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.64)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  shutterCore: {
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  backdropImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.52,
  },
  editorScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(5,8,16,0.70)",
  },
  editorContent: {
    padding: 16,
    paddingTop: 76,
    paddingBottom: 36,
    gap: 16,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  memeFrame: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    aspectRatio: 1,
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "#111827",
  },
  memeImage: {
    flex: 1,
  },
  memeVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  aiBorder: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 6,
    bottom: 6,
    borderRadius: 18,
    borderWidth: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  memeLineWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    minHeight: 78,
    justifyContent: "center",
  },
  memeTop: {
    top: 12,
  },
  memeBottom: {
    bottom: 12,
  },
  memeLine: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    letterSpacing: 0,
    textAlign: "center",
    textShadowColor: "#000000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  actionPanel: {
    padding: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 12,
  },
  primaryAction: {
    flex: 1.18,
  },
  compactAction: {
    flex: 1,
  },
  statusText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: "#ffb4b4",
  },
  editorPanel: {
    padding: 16,
    gap: 10,
  },
  labelRow: {
    minHeight: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  inlineError: {
    color: "#ffb4b4",
    fontSize: 12,
    fontWeight: "800",
  },
  captionInput: {
    ...fieldBase,
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontWeight: "800",
    textAlignVertical: "top",
  },
  readout: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    paddingTop: 14,
    gap: 7,
  },
  readoutTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  readoutBody: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  permissionPanel: {
    alignSelf: "center",
    margin: 24,
    padding: 24,
    gap: 18,
    justifyContent: "center",
    marginTop: "auto",
    marginBottom: "auto",
    maxWidth: 390,
    width: "100%",
  },
  permissionActions: {
    gap: 10,
    paddingTop: 2,
  },
  permissionButton: {
    width: "100%",
  },
  permissionText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 16,
    lineHeight: 22,
  },
  permissionKicker: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  floatingError: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 118,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(90,0,0,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,160,160,0.34)",
  },
});
