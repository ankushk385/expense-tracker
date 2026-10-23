import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useBudgets } from "@/context/budgets";
import { getCategoryById } from "@/constants/categories";
import { parseAmount, sanitizeAmountInput } from "@/lib/amount";
import C from "@/constants/colors";

export default function SetBudgetScreen() {
  const insets = useSafeAreaInsets();
  const { categoryKey } = useLocalSearchParams<{ categoryKey: string }>();
  const { setBudget, getBudget, removeBudget } = useBudgets();

  const existing = getBudget(categoryKey ?? "");
  const cat = getCategoryById(categoryKey ?? "");

  const [amount, setAmount] = useState(existing?.monthlyLimit?.toString() ?? "");
  const [alertPct, setAlertPct] = useState(existing?.alertPct?.toString() ?? "80");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const amt = parseAmount(amount);
    if (amt === null) {
      setError("Please enter a valid budget amount");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!categoryKey) {
      setError("No category selected");
      return;
    }
    const pct = parseInt(alertPct);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError("Alert threshold must be between 1-100%");
      return;
    }
    setSaving(true);
    try {
      await setBudget(categoryKey!, amt, pct);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    Alert.alert("Remove Budget", `Remove the budget for ${cat?.label ?? "this category"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await removeBudget(categoryKey!);
          router.back();
        },
      },
    ]);
  };

  const color = cat?.color ?? C.red;

  return (
    <View style={styles.container}>
      <View style={styles.grabBar} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.catIcon, { backgroundColor: color + "22" }]}>
            <Ionicons name={cat?.icon as any ?? "pricetag"} size={22} color={color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Set Budget</Text>
            <Text style={styles.subtitle}>{cat?.label ?? categoryKey}</Text>
          </View>
          <Pressable accessibilityLabel="Close budget form" style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={18} color={C.lightGray} />
          </Pressable>
        </View>

        <Text style={styles.label}>Monthly Limit</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={C.mediumGray}
            value={amount}
            onChangeText={(v) => {
              setAmount(sanitizeAmountInput(v));
              if (error) setError("");
            }}
            keyboardType="decimal-pad"
            inputMode="decimal"
            maxLength={12}
            accessibilityLabel="Monthly budget limit in rupees"
            autoFocus
            returnKeyType="done"
          />
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>Alert at (%)</Text>
        <View style={styles.pctRow}>
          {[50, 75, 80, 90].map((p) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: alertPct === p.toString() }}
              key={p}
              style={[
                styles.pctBtn,
                alertPct === p.toString() && { backgroundColor: C.redDim, borderColor: C.red },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setAlertPct(p.toString());
              }}
            >
              <Text
                style={[
                  styles.pctBtnText,
                  alertPct === p.toString() && { color: C.red },
                ]}
              >
                {p}%
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={C.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: color },
            pressed && { opacity: 0.85 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Budget</Text>
          )}
        </Pressable>

        {existing && (
          <Pressable
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.8 }]}
            onPress={handleRemove}
          >
            <Ionicons name="trash-outline" size={16} color={C.red} />
            <Text style={styles.removeBtnText}>Remove Budget</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.mediumGray,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.lightGray },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card2,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  rupee: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.lightGray, marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: C.white,
    paddingVertical: 14,
    letterSpacing: -1,
  },
  pctRow: { flexDirection: "row", gap: 10 },
  pctBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  pctBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.lightGray },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.redDim,
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.red, flex: 1 },
  saveBtn: {
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.white },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
  },
  removeBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.red },
});
