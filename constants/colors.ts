const C = {
  black: "#000000",
  card: "#111111",
  card2: "#1A1A1A",
  red: "#E63946",
  green: "#2A9D8F",
  lightGray: "#AAAAAA",
  mediumGray: "#555555",
  offWhite: "#F0F0F0",
  white: "#FFFFFF",
  border: "#222222",
  redDim: "rgba(230,57,70,0.15)",
  greenDim: "rgba(42,157,143,0.15)",
};

export default {
  light: {
    text: C.offWhite,
    background: C.black,
    tint: C.red,
    tabIconDefault: C.mediumGray,
    tabIconSelected: C.red,
  },
  dark: {
    text: C.offWhite,
    background: C.black,
    tint: C.red,
    tabIconDefault: C.mediumGray,
    tabIconSelected: C.red,
  },
  ...C,
};
