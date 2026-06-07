import { BlurView } from "expo-blur";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

type GlassPanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}>;

export function GlassPanel({ children, style, intensity = 42 }: GlassPanelProps) {
  const flattenedStyle = StyleSheet.flatten(style);
  const contentGap =
    typeof flattenedStyle?.gap === "number" ? flattenedStyle.gap : undefined;

  return (
    <View
      style={[
        {
          overflow: "hidden",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.30)",
          backgroundColor: "rgba(255,255,255,0.13)",
        },
        { boxShadow: "0 24px 80px rgba(0,0,0,0.36)" } as ViewStyle,
        style,
      ]}
    >
      <BlurView
        tint="dark"
        intensity={intensity}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          borderRadius: 24,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderTopColor: "rgba(255,255,255,0.55)",
          borderLeftColor: "rgba(255,255,255,0.34)",
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
      />
      <View style={[{ position: "relative" }, contentGap ? { gap: contentGap } : undefined]}>
        {children}
      </View>
    </View>
  );
}

type GlassButtonProps = PropsWithChildren<{
  label: string;
  icon?: ReactNode;
  busy?: boolean;
  progress?: number;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function GlassButton({
  label,
  icon,
  busy,
  progress,
  disabled,
  destructive,
  onPress,
  style,
}: GlassButtonProps) {
  const isDisabled = disabled || busy;
  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));
  const displayLabel = busy && progress !== undefined
    ? `${Math.round(clampedProgress)}%`
    : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 54,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingVertical: 0,
          borderRadius: 999,
          overflow: "hidden",
          opacity: disabled ? 0.48 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <BlurView
        tint="dark"
        intensity={36}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          top: 0,
          width: `${clampedProgress}%`,
          borderRadius: 999,
          backgroundColor: destructive ? "rgba(255,130,130,0.28)" : "rgba(96,195,255,0.34)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: destructive ? "rgba(255,130,130,0.45)" : "rgba(255,255,255,0.28)",
          backgroundColor: destructive ? "rgba(255,80,80,0.18)" : "rgba(255,255,255,0.11)",
        }}
      />
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
          justifyContent: "center",
          minWidth: 0,
          width: "100%",
        }}
      >
        <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
          {busy ? <ActivityIndicator color="#ffffff" size="small" /> : icon}
        </View>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          numberOfLines={1}
          style={{
            color: "#ffffff",
            flexShrink: 1,
            fontSize: 14,
            fontWeight: "800",
            lineHeight: 18,
            textAlign: "center",
          }}
        >
          {displayLabel}
        </Text>
      </View>
    </Pressable>
  );
}
