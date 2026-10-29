import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";
import { makeThemeColors, ThemeColors } from "@/constants/colors";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";
interface ThemeContextValue { preference: ThemePreference; resolvedTheme: ResolvedTheme; isDark: boolean; colors: ThemeColors; setPreference: (value: ThemePreference) => Promise<void> }
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "@expense_tracker_theme";

function resolveTheme(preference: ThemePreference, system: ColorSchemeName): ResolvedTheme {
  return preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((value) => {
    if (value === "light" || value === "dark" || value === "system") setPreferenceState(value);
  }).catch(() => undefined); }, []);
  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);
  const resolvedTheme = resolveTheme(preference, systemScheme);
  const value = useMemo(() => ({ preference, resolvedTheme, isDark: resolvedTheme === "dark", colors: makeThemeColors(resolvedTheme), setPreference }), [preference, resolvedTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used within ThemeProvider");
  return value;
}
