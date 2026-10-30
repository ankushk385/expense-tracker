import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTransactions, Transaction } from "@/context/transactions";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryById, formatINR, fromDateKey, todayKey, shiftDateKey } from "@/constants/categories";
import { ThemeColors } from "@/constants/colors";
import { useAppTheme } from "@/context/theme";

type Filter = "all" | "income" | "expense";

function formatDate(dateStr: string) {
  const d = fromDateKey(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function TransactionRow({ item }: { item: Transaction }) {
  const { colors: C } = useAppTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const cat = getCategoryById(item.category);
  const isIncome = item.type === "income";
  return (
    <Pressable
      accessibilityLabel={`${isIncome ? "Income" : "Expense"}, ${cat?.label ?? item.category}, ₹${formatINR(item.amount)}, ${formatDate(item.date)}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/transaction/[id]", params: { id: item.id } });
      }}
    >
      <CategoryIcon categoryKey={item.category} size={18} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowCategory} numberOfLines={1}>{cat?.label ?? item.category}</Text>
        <Text style={styles.rowDate} numberOfLines={1}>
          {item.note ? `${item.note} · ` : ""}{formatDate(item.date)}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: isIncome ? C.green : C.red }]}>
        {isIncome ? "+" : "-"}₹{formatINR(item.amount)}
      </Text>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const { colors: C } = useAppTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { transactions, isLoading } = useTransactions();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = transactions;
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (getCategoryById(t.category)?.label ?? t.category).toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filter, search]);

  const sections = useMemo(() => {
    const grouped = filtered.reduce<Record<string, Transaction[]>>((result, item) => {
      (result[item.date] ??= []).push(item);
      return result;
    }, {});
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((date) => ({
      title: date === todayKey() ? "Today" : date === shiftDateKey(todayKey(), -1) ? "Yesterday" : formatDate(date),
      date,
      data: grouped[date],
    }));
  }, [filtered]);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={styles.title}>History</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={C.mediumGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={C.mediumGray}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search transactions"
          returnKeyType="search"
        />
        {search ? (
          <Pressable accessibilityLabel="Clear transaction search" onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={C.mediumGray} />
          </Pressable>
        ) : null}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(["all", "income", "expense"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            accessibilityRole="tab"
            accessibilityLabel={`Show ${f === "all" ? "all transactions" : f === "income" ? "income only" : "expenses only"}`}
            accessibilityState={{ selected: filter === f }}
            style={[
              styles.filterPill,
              filter === f && {
                backgroundColor: f === "income" ? C.greenDim : f === "expense" ? C.redDim : C.card2,
                borderColor: f === "income" ? C.green : f === "expense" ? C.red : C.lightGray,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && {
                  color: f === "income" ? C.green : f === "expense" ? C.red : C.offWhite,
                  fontFamily: "Inter_600SemiBold",
                },
              ]}
            >
              {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.count}>{filtered.length} items</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionTotal}>₹{formatINR(section.data.reduce((sum, item) => sum + item.amount, 0))}</Text>
          </View>
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomInset + 100, paddingHorizontal: 16 },
          sections.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!sections.length}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={C.red} />
              <Text style={styles.emptyText}>Loading transactions…</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={C.mediumGray} />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubText}>
                {transactions.length === 0
                  ? "Add your first transaction"
                  : "Try changing the filter"}
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 32, color: C.text, letterSpacing: -0.7 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.offWhite,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.lightGray,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.mediumGray,
    marginLeft: "auto",
  },
  list: { gap: 0 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingBottom: 8, paddingHorizontal: 2 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.text },
  sectionTotal: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.textSecondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  rowInfo: { flex: 1 },
  rowCategory: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.offWhite },
  rowDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray, marginTop: 2 },
  rowAmount: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  separator: { height: 8 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 80,
  },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16, color: C.lightGray },
  emptySubText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.mediumGray },
});
