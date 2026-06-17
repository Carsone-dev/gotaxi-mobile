import React, { useState, useCallback } from "react";
import {
  View,
  Image,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "@/src/theme";
import type { GenreUser } from "@/src/api/types";

interface ProfileAvatarProps {
  photoUrl: string | null;
  genre?: GenreUser | null;
  size?: number;
  ringColor?: string;
  ringWidth?: number;
  fallbackBg?: string;
  iconColor?: string;
  onPressNoPhoto?: () => void;
}

const GENRE_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  HOMME:      "man",
  FEMME:      "woman",
  NON_DEFINI: "person",
};

const GENRE_BG: Record<string, string> = {
  HOMME:      "#1B6FE8",
  FEMME:      "#D64F8C",
  NON_DEFINI: colors.primary,
};

export function ProfileAvatar({
  photoUrl,
  genre,
  size = 42,
  ringColor = "transparent",
  ringWidth = 0,
  fallbackBg,
  iconColor = colors.white,
  onPressNoPhoto,
}: ProfileAvatarProps) {
  const [preview, setPreview] = useState(false);
  const { width: W, height: H } = useWindowDimensions();

  const resolvedGenre = genre ?? "NON_DEFINI";
  const icon = GENRE_ICON[resolvedGenre] ?? "person";
  const bg   = fallbackBg ?? GENRE_BG[resolvedGenre] ?? colors.primary;

  const handlePress = useCallback(() => {
    if (photoUrl) {
      setPreview(true);
    } else {
      onPressNoPhoto?.();
    }
  }, [photoUrl, onPressNoPhoto]);

  const avatarInner = photoUrl ? (
    <Image source={{ uri: photoUrl }} style={{ width: size, height: size }} resizeMode="cover" />
  ) : (
    <View style={[s.fallback, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={size * 0.48} color={iconColor} />
    </View>
  );

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          s.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: ringColor,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        {avatarInner}
      </Pressable>

      {/* Modal plein-écran preview */}
      {photoUrl ? (
        <Modal
          visible={preview}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setPreview(false)}
        >
          <View style={s.overlay}>
            <Pressable style={s.closeBtn} onPress={() => setPreview(false)} hitSlop={12}>
              <Text style={s.closeIcon}>✕</Text>
            </Pressable>
            <Image
              source={{ uri: photoUrl }}
              style={{ width: W, height: H * 0.75 }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  ring: {
    overflow: "hidden",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 16,
    color: colors.white,
    fontFamily: typography.fontFamily.bold,
  },
});
