import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { useAppTheme } from "@/context/theme";

export default function TabLayout() {
  const { colors: C, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabHeight = 72 + Math.max(insets.bottom, Platform.OS === "web" ? 12 : 6);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.expense,
        tabBarInactiveTintColor: C.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarStyle: {
          position: "absolute",
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: C.surface,
          borderTopWidth: 1,
          borderTopColor: C.border,
          elevation: 18,
          shadowColor: C.shadow,
          shadowOpacity: isDark ? 0.35 : 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -5 },
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={23} color={color} /> }} />
      <Tabs.Screen name="transactions" options={{ title: "History", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "list" : "list-outline"} size={24} color={color} /> }} />
      <Tabs.Screen
        name="add"
        listeners={{ tabPress: (event) => event.preventDefault() }}
        options={{
          title: "Add",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => (
            <View style={styles.addSlot} pointerEvents="box-none">
              <Pressable
                accessibilityLabel="Add transaction"
                style={({ pressed }) => [styles.addButton, { backgroundColor: C.expense, borderColor: C.surface }, pressed && styles.pressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({ pathname: "/add-transaction", params: { type: "expense" } });
                }}
              >
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="analytics" options={{ title: "Analytics", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={23} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "More", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline"} size={24} color={color} /> }} />
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="ai-coach" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 1 },
  item: { paddingTop: 2 },
  addSlot: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  addButton: { width: 56, height: 56, marginTop: -20, borderRadius: 28, borderWidth: 5, alignItems: "center", justifyContent: "center", shadowColor: "#FF5A6B", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
});
