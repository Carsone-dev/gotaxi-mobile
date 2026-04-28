export const colors = {
  primary: "#009542",
  primaryLight: "#00C957",
  primaryDark: "#006B30",
  primaryGradient: ["#00C957", "#006B30"] as const,

  yellow: "#FFD700",
  yellowDark: "#BA9700",

  black: "#1c1c1a",
  white: "#FFFFFF",
  surface: "#F8FAF9",
  surfaceAlt: "#F1EFE8",
  border: "#E5E5E5",
  borderStrong: "#D3D1C7",

  textPrimary: "#1c1c1a",
  textSecondary: "#5F5E5A",
  textMuted: "#B4B2A9",
  textInverse: "#FFFFFF",

  success: "#009542",
  successBg: "#EAF6EF",
  warning: "#FFD700",
  warningBg: "#FAEEDA",
  warningText: "#854F0B",
  error: "#FF4D4D",
  errorBg: "#FCEBEB",
  errorText: "#A32D2D",
  info: "#0066FF",
  infoBg: "#E6F1FB",

  mtnYellow: "#FFD700",
  moovBlue: "#00B7E2",
  orangeOrange: "#FF6600",
} as const;

export type ColorKey = keyof typeof colors;