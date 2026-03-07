import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTransactions, Transaction } from "@/context/transactions";
import { useAuth } from "@/context/auth";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryById, formatINR } from "@/constants/categories";
import C from "@/constants/colors";
import { SpendingChart } from "@/components/SpendingChart";

function TransactionRow({ item, onPress }: { item: Transaction; onPress: () => void }) {
  const cat = getCategoryById(item.category);
  const isIncome = item.type === "income";
  return (
    <Pressable
      style={({ pressed }) => [styles.txnRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <CategoryIcon categoryKey={item.category} size={18} />
      <View style={styles.txnInfo}>
        <Text style={styles.txnCategory} numberOfLines={1}>{cat?.label ?? item.category}</Text>
        <Text style={styles.txnNote} numberOfLines={1}>{item.note || formatDate(item.date)}</Text>
      </View>
      <Text style={[styles.txnAmount, { color: isIncome ? C.green : C.red }]}>
        {isIncome ? "+" : "-"}₹{formatINR(item.amount)}
      </Text>
    </Pressable>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { transactions, totalIncome, totalExpenses, balance, isLoading } = useTransactions();

  const recent = useMemo(() => transactions.slice(0, 10), [transactions]);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 8, paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()},</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/add-transaction");
            }}
          >
            <Ionicons name="add" size={24} color={C.white} />
          </Pressable>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={[styles.balanceAmount, { color: balance < 0 ? C.red : C.white }]}>
            ₹{formatINR(Math.abs(balance))}
          </Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiItem}>
              <View style={[styles.kpiBadge, { backgroundColor: C.greenDim }]}>
                <Ionicons name="arrow-down" size={14} color={C.green} />
              </View>
              <View>
                <Text style={styles.kpiLabel}>Income</Text>
                <Text style={[styles.kpiValue, { color: C.green }]}>+₹{formatINR(totalIncome)}</Text>
              </View>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <View style={[styles.kpiBadge, { backgroundColor: C.redDim }]}>
                <Ionicons name="arrow-up" size={14} color={C.red} />
              </View>
              <View>
                <Text style={styles.kpiLabel}>Expenses</Text>
                <Text style={[styles.kpiValue, { color: C.red }]}>-₹{formatINR(totalExpenses)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Spending Chart */}
        <SpendingChart />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { borderColor: C.green }, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/add-transaction", params: { type: "income" } });
            }}
          >
            <Ionicons name="add-circle" size={20} color={C.green} />
            <Text style={[styles.actionBtnText, { color: C.green }]}>Add Income</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { borderColor: C.red }, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/add-transaction", params: { type: "expense" } });
            }}
          >
            <Ionicons name="remove-circle" size={20} color={C.red} />
            <Text style={[styles.actionBtnText, { color: C.red }]}>Add Expense</Text>
          </Pressable>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length > 10 && (
              <Pressable onPress={() => router.push("/(tabs)/transactions")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            )}
          </View>
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : recent.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color={C.mediumGray} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubText}>Tap + to add your first one</Text>
            </View>
          ) : (
            <View style={styles.txnList}>
              {recent.map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/transaction/[id]", params: { id: item.id } });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.lightGray },
  userName: { fontFamily: "Inter_700Bold", fontSize: 26, color: C.white, letterSpacing: -0.5 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  balanceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.lightGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  balanceAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    letterSpacing: -1,
    marginBottom: 20,
  },
  kpiRow: { flexDirection: "row", alignItems: "center" },
  kpiItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  kpiBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray },
  kpiValue: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  kpiDivider: { width: 1, height: 36, backgroundColor: C.border, marginHorizontal: 16 },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.white },
  seeAll: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.red },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16, color: C.lightGray },
  emptySubText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.mediumGray },
  txnList: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  txnInfo: { flex: 1 },
  txnCategory: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.offWhite },
  txnNote: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray, marginTop: 2 },
  txnAmount: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
