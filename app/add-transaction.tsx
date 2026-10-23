import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTransactions, TransactionType } from "@/context/transactions";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Category,
  fromDateKey,
  isFutureDateKey,
  shiftDateKey,
  todayKey,
} from "@/constants/categories";
import { parseAmount, sanitizeAmountInput } from "@/lib/amount";
import C from "@/constants/colors";

function formatDisplayDate(dateStr: string) {
  const d = fromDateKey(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function CategoryPicker({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={styles.catGrid}>
      {categories.map((cat) => {
        const isSelected = cat.key === selected;
        return (
          <Pressable
            accessibilityLabel={`Select ${cat.label} category`}
            accessibilityState={{ selected: isSelected }}
            key={cat.key}
            style={[
              styles.catItem,
              isSelected && { backgroundColor: cat.color + "22", borderColor: cat.color },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(cat.key);
            }}
          >
            <View style={[styles.catIconWrap, { backgroundColor: cat.color + "22" }]}>
              <Ionicons name={cat.icon as any} size={18} color={cat.color} />
            </View>
            <Text style={[styles.catLabel, isSelected && { color: cat.color }]} numberOfLines={1}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string }>();
  const { addTransaction } = useTransactions();

  const [type, setType] = useState<TransactionType>(
    (params.type as TransactionType) ?? "expense"
  );
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async () => {
    const amt = parseAmount(amount);
    if (amt === null) {
      setError("Please enter a valid amount");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!category) {
      setError("Please select a category");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await addTransaction({ type, amount: amt, category, date, note: note.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const isIncome = type === "income";
  const accentColor = isIncome ? C.green : C.red;

  return (
    <View style={styles.container}>
      {/* Grab Handle */}
      <View style={styles.grabBar} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>New Transaction</Text>
          <Pressable
            accessibilityLabel="Close transaction form"
            style={styles.closeBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={20} color={C.lightGray} />
          </Pressable>
        </View>

        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <Pressable
            accessibilityLabel="Select expense transaction type"
            accessibilityState={{ selected: !isIncome }}
            style={[styles.typeBtn, !isIncome && { backgroundColor: C.redDim, borderColor: C.red }]}
            onPress={() => {
              Haptics.selectionAsync();
              setType("expense");
              setCategory("");
            }}
          >
            <Ionicons name="trending-down" size={16} color={isIncome ? C.mediumGray : C.red} />
            <Text style={[styles.typeBtnText, !isIncome && { color: C.red }]}>Expense</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Select income transaction type"
            accessibilityState={{ selected: isIncome }}
            style={[styles.typeBtn, isIncome && { backgroundColor: C.greenDim, borderColor: C.green }]}
            onPress={() => {
              Haptics.selectionAsync();
              setType("income");
              setCategory("");
            }}
          >
            <Ionicons name="trending-up" size={16} color={isIncome ? C.green : C.mediumGray} />
            <Text style={[styles.typeBtnText, isIncome && { color: C.green }]}>Income</Text>
          </Pressable>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.currencySign}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: accentColor }]}
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
            returnKeyType="done"
            accessibilityLabel="Transaction amount in rupees"
            autoFocus
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <CategoryPicker categories={categories} selected={category} onSelect={setCategory} />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <View style={styles.dateRow}>
            <Pressable
              accessibilityLabel="Previous date"
              style={styles.dateBtn}
              onPress={() => {
                setDate((current) => shiftDateKey(current, -1));
                Haptics.selectionAsync();
              }}
            >
              <Ionicons name="chevron-back" size={18} color={C.lightGray} />
            </Pressable>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            <Pressable
              accessibilityLabel="Next date"
              accessibilityState={{ disabled: isFutureDateKey(shiftDateKey(date, 1)) }}
              disabled={isFutureDateKey(shiftDateKey(date, 1))}
              style={[styles.dateBtn, isFutureDateKey(shiftDateKey(date, 1)) && { opacity: 0.3 }]}
              onPress={() => {
                setDate((current) => {
                  const next = shiftDateKey(current, 1);
                  return isFutureDateKey(next) ? current : next;
                });
                Haptics.selectionAsync();
              }}
            >
              <Ionicons name="chevron-forward" size={18} color={C.lightGray} />
            </Pressable>
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Note (optional)</Text>
          <View style={styles.noteWrap}>
            <Ionicons name="pencil-outline" size={16} color={C.lightGray} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note..."
              placeholderTextColor={C.mediumGray}
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={C.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Save Button */}
        <Pressable
          accessibilityLabel="Save transaction"
          accessibilityState={{ disabled: saving }}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: accentColor },
            pressed && { opacity: 0.85 },
            saving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={C.white} />
              <Text style={styles.saveBtnText}>Save Transaction</Text>
            </>
          )}
        </Pressable>
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
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.white },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  typeToggle: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.mediumGray },
  amountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card2,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  currencySign: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: C.lightGray,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    letterSpacing: -2,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  catIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.lightGray,
    maxWidth: 80,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateBtn: { padding: 4 },
  dateText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.offWhite },
  noteWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card2,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    height: 48,
  },
  noteInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: C.offWhite,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.redDim,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.red, flex: 1 },
  saveBtn: {
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.white },
});
