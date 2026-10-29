import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCategoryById } from "@/constants/categories";
import { useAppTheme } from "@/context/theme";

interface Props {
  categoryKey: string;
  size?: number;
}

export function CategoryIcon({ categoryKey, size = 20 }: Props) {
  const { isDark } = useAppTheme();
  const cat = getCategoryById(categoryKey);
  const color = cat?.color ?? "#888";
  const icon = (cat?.icon ?? "ellipsis-horizontal") as any;
  const bg = color + (isDark ? "26" : "18");

  return (
    <View style={[styles.container, { backgroundColor: bg, width: size + 24, height: size + 24, borderRadius: 13 }]}> 
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
