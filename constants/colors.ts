export const lightColors = {
  background: "#F7F5F2", surface: "#FFFFFF", surfaceSecondary: "#F3F2F0",
  text: "#0F172A", textSecondary: "#788293", border: "#E9EAED",
  expense: "#FF5A6B", expenseSoft: "#FFE6EB", income: "#16C2A3",
  incomeSoft: "#DDF8F1", purple: "#8B5CF6", blue: "#3B82F6",
  yellow: "#F59E0B", shadow: "#152238", overlay: "rgba(15,23,42,0.42)", white: "#FFFFFF",
  balanceGradientStart: "#FF5A6B", balanceGradientEnd: "#FF6674",
} as const;

export const darkColors = {
  background: "#0A0D12", surface: "#151A21", surfaceSecondary: "#1A2029",
  text: "#F8FAFC", textSecondary: "#A3ACB9", border: "#28333C",
  expense: "#FF5A6B", expenseSoft: "#371A24", income: "#16C2A3",
  incomeSoft: "#103A36", purple: "#8B5CF6", blue: "#3B82F6",
  yellow: "#F59E0B", shadow: "#000000", overlay: "rgba(0,0,0,0.66)", white: "#FFFFFF",
  balanceGradientStart: "#163E8F", balanceGradientEnd: "#7C3AED",
} as const;

export type ThemeColors = { [K in keyof typeof lightColors]: string } & {
  black: string; card: string; card2: string; red: string; green: string;
  lightGray: string; mediumGray: string; offWhite: string; redDim: string; greenDim: string;
};

export function makeThemeColors(mode: "light" | "dark"): ThemeColors {
  const p = mode === "dark" ? darkColors : lightColors;
  return { ...p, black: p.background, card: p.surface, card2: p.surfaceSecondary,
    red: p.expense, green: p.income, lightGray: p.textSecondary,
    mediumGray: p.textSecondary, offWhite: p.text, redDim: p.expenseSoft, greenDim: p.incomeSoft };
}

export const spacing = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 } as const;
export const radii = { button: 14, input: 16, small: 16, card: 22 } as const;
