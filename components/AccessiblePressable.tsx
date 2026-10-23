import React from "react";
import {
  Pressable as NativePressable,
  type PressableProps,
} from "react-native";

export function AccessiblePressable(props: PressableProps) {
  return (
    <NativePressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? "button"}
    />
  );
}
