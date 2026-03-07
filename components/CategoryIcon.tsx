import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCategoryById } from "@/constants/categories";

interface Props {
  categoryKey: string;
  size?: number;
}

export function CategoryIcon({ categoryKey, size = 20 }: Props) {
  const cat = getCategoryById(categoryKey);
  const color = cat?.color ?? "#888";
  const icon = (cat?.icon ?? "ellipsis-horizontal") as any;
  const bg = color + "22";

  return (
    <View style={[styles.container, { backgroundColor: bg, width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 }]}>
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
