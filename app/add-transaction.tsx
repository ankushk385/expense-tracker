import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
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
  todayKey,
} from "@/constants/categories";
import { parseAmount, sanitizeAmountInput } from "@/lib/amount";
import { ThemeColors } from "@/constants/colors";
import { useAppTheme } from "@/context/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";

function formatDisplayDate(dateStr: string) {
  const d = fromDateKey(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function CategoryPicker({
  categories,
  selected,
  onSelect,
  accent,
}: {
  categories: Category[];
  selected: string;
  onSelect: (key: string) => void;
  accent: { color: string; soft: string };
}) {
  const { colors: C, isDark } = useAppTheme();
  const styles = React.useMemo(() => createStyles(C), [C]);
  const [showAll, setShowAll] = useState(false);
  const visibleCategories = showAll || categories.length <= 8 ? categories : categories.slice(0, 7);
  return (
    <View style={styles.catGrid}>
      {visibleCategories.map((cat) => {
        const isSelected = cat.key === selected;
        return (
          <Pressable
            accessibilityLabel={`Select ${cat.label} category`}
            accessibilityState={{ selected: isSelected }}
            key={cat.key}
            style={[
              styles.catItem,
              isSelected && { backgroundColor: accent.soft, borderColor: accent.color },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(cat.key);
            }}
          >
            <View style={[styles.catIconWrap, { backgroundColor: cat.color + (isDark ? "26" : "18") }]}> 
              <Ionicons name={cat.icon as any} size={18} color={cat.color} />
            </View>
            <Text style={[styles.catLabel, isSelected && { color: accent.color }]} numberOfLines={1}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
      {!showAll && categories.length > 8 ? (
        <Pressable accessibilityLabel="Show more categories" style={styles.catItem} onPress={() => setShowAll(true)}>
          <View style={[styles.catIconWrap, { backgroundColor: C.surfaceSecondary }]}><Ionicons name="ellipsis-horizontal" size={20} color={C.textSecondary} /></View>
          <Text style={styles.catLabel}>More</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AddTransactionScreen() {
  const { colors: C } = useAppTheme();
  const styles = React.useMemo(() => createStyles(C), [C]);
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const closeSheet = () => router.canGoBack() ? router.back() : router.replace("/(tabs)");

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
      closeSheet();
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

      <KeyboardAwareScrollViewCompat
        enabled={Platform.OS !== "android"}
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
            onPress={closeSheet}
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
          <CategoryPicker categories={categories} selected={category} onSelect={setCategory} accent={{ color: accentColor, soft: isIncome ? C.incomeSoft : C.expenseSoft }} />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <Pressable
            accessibilityLabel={`Choose transaction date. Current date ${formatDisplayDate(date)}`}
            style={styles.dateRow}
            onPress={() => {
              Haptics.selectionAsync();
              setCalendarOpen(true);
            }}
          >
            <View style={[styles.dateIcon, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name="calendar-outline" size={19} color={accentColor} />
            </View>
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
          </Pressable>
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
      </KeyboardAwareScrollViewCompat>
      <CalendarDatePicker
        visible={calendarOpen}
        value={date}
        onChange={setDate}
        onClose={() => setCalendarOpen(false)}
        accentColor={accentColor}
      />
    </View>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
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
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
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
    width: "23.2%",
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: C.textSecondary,
    maxWidth: "100%",
    textAlign: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: C.offWhite },
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
