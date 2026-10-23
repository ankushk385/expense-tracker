import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
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
import { getCategoryById, formatINR } from "@/constants/categories";
import C from "@/constants/colors";

type Filter = "all" | "income" | "expense";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function TransactionRow({ item }: { item: Transaction }) {
  const cat = getCategoryById(item.category);
  const isIncome = item.type === "income";
  return (
    <Pressable
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

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={styles.title}>History</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/add-transaction");
          }}
        >
          <Ionicons name="add" size={22} color={C.white} />
        </Pressable>
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomInset + 100, paddingHorizontal: 16 },
          filtered.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.white, letterSpacing: -0.5 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
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
