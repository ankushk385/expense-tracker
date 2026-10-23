import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTransactions, Transaction } from "@/context/transactions";
import { useAuth } from "@/context/auth";
import { useBudgets } from "@/context/budgets";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryById, formatINR, fromDateKey } from "@/constants/categories";
import C from "@/constants/colors";
import { SpendingChart } from "@/components/SpendingChart";

function TransactionRow({ item, onPress }: { item: Transaction; onPress: () => void }) {
  const cat = getCategoryById(item.category);
  const isIncome = item.type === "income";
  return (
    <Pressable
      accessibilityLabel={`${isIncome ? "Income" : "Expense"}: ${cat?.label ?? item.category}, ₹${formatINR(item.amount)}`}
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
  const d = fromDateKey(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Insight {
  id: string;
  icon: string;
  color: string;
  bgColor: string;
  title: string;
  body: string;
  action?: { label: string; route: string };
}

function useSmartInsights(
  transactions: Transaction[],
  budgets: ReturnType<typeof useBudgets>["budgets"]
): Insight[] {
  return useMemo(() => {
    const insights: Insight[] = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const thisMonthExp = transactions.filter((t) => t.type === "expense" && t.date.startsWith(currentMonth));
    const prevMonthExp = transactions.filter((t) => t.type === "expense" && t.date.startsWith(prevMonth));
    const thisTotal = thisMonthExp.reduce((s, t) => s + t.amount, 0);
    const prevTotal = prevMonthExp.reduce((s, t) => s + t.amount, 0);

    if (prevTotal > 0 && thisTotal > 0) {
      const change = Math.round(((thisTotal - prevTotal) / prevTotal) * 100);
      if (Math.abs(change) >= 10) {
        insights.push({
          id: "month_compare",
          icon: change > 0 ? "trending-up" : "trending-down",
          color: change > 0 ? C.red : C.green,
          bgColor: change > 0 ? C.redDim : C.greenDim,
          title: change > 0 ? `Spending up ${change}%` : `Spending down ${Math.abs(change)}%`,
          body: `You spent ₹${formatINR(thisTotal)} this month vs ₹${formatINR(prevTotal)} last month.`,
        });
      }
    }

    const catSpend: Record<string, number> = {};
    for (const t of thisMonthExp) {
      catSpend[t.category] = (catSpend[t.category] ?? 0) + t.amount;
    }
    const topCat = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat && thisTotal > 0) {
      const pct = Math.round((topCat[1] / thisTotal) * 100);
      const cat = getCategoryById(topCat[0]);
      if (pct >= 30) {
        insights.push({
          id: "top_category",
          icon: (cat?.icon ?? "pricetag") as string,
          color: cat?.color ?? C.red,
          bgColor: (cat?.color ?? C.red) + "22",
          title: `${cat?.label ?? topCat[0]} is ${pct}% of expenses`,
          body: `You spent ₹${formatINR(topCat[1])} on ${cat?.label ?? topCat[0]} this month.`,
          action: { label: "View Analytics", route: "/(tabs)/analytics" },
        });
      }
    }

    for (const budget of budgets) {
      const spent = catSpend[budget.categoryKey] ?? 0;
      const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
      const cat = getCategoryById(budget.categoryKey);
      if (pct >= 100) {
        insights.push({
          id: `over_${budget.categoryKey}`,
          icon: "warning",
          color: C.red,
          bgColor: C.redDim,
          title: `Over budget: ${cat?.label ?? budget.categoryKey}`,
          body: `You've spent ₹${formatINR(spent)} — ₹${formatINR(spent - budget.monthlyLimit)} over your ₹${formatINR(budget.monthlyLimit)} limit.`,
          action: { label: "Edit Budget", route: "/(tabs)/budgets" },
        });
        break;
      } else if (pct >= (budget.alertPct ?? 80)) {
        insights.push({
          id: `alert_${budget.categoryKey}`,
          icon: "alert-circle",
          color: "#F4A261",
          bgColor: "rgba(244,162,97,0.15)",
          title: `${Math.round(pct)}% of ${cat?.label ?? budget.categoryKey} budget used`,
          body: `₹${formatINR(budget.monthlyLimit - spent)} remaining for the month.`,
          action: { label: "View Budgets", route: "/(tabs)/budgets" },
        });
        break;
      }
    }

    if (insights.length === 0 && transactions.length > 0) {
      const totalInc = transactions.filter((t) => t.type === "income" && t.date.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0);
      if (totalInc > 0 && thisTotal > 0) {
        const savRate = Math.round(((totalInc - thisTotal) / totalInc) * 100);
        insights.push({
          id: "savings_rate",
          icon: "sparkles",
          color: C.green,
          bgColor: C.greenDim,
          title: `${savRate >= 0 ? savRate + "% saved" : "Overspending this month"}`,
          body: savRate >= 20
            ? "Great job! You're saving well this month."
            : savRate >= 0
            ? "Try to save at least 20% of your income."
            : `You spent ₹${formatINR(thisTotal - totalInc)} more than you earned.`,
        });
      }
    }

    return insights.slice(0, 3);
  }, [transactions, budgets]);
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Pressable
      accessibilityLabel={insight.title}
      style={[styles.insightCard, { borderLeftColor: insight.color, borderLeftWidth: 3 }]}
      onPress={() => {
        if (insight.action) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(insight.action.route as any);
        }
      }}
    >
      <View style={[styles.insightIconWrap, { backgroundColor: insight.bgColor }]}>
        <Ionicons name={insight.icon as any} size={18} color={insight.color} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightBody}>{insight.body}</Text>
        {insight.action && (
          <Text style={[styles.insightAction, { color: insight.color }]}>{insight.action.label} →</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { transactions, totalIncome, totalExpenses, balance, isLoading } = useTransactions();
  const { budgets } = useBudgets();

  const recent = useMemo(() => transactions.slice(0, 10), [transactions]);
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const insights = useSmartInsights(transactions, budgets);

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
            style={styles.settingsBtn}
            accessibilityLabel="Open settings"
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Ionicons name="settings-outline" size={20} color={C.lightGray} />
          </Pressable>
          <Pressable
            accessibilityLabel="Add a transaction"
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

        {/* Smart Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <View style={styles.insightsSectionHeader}>
              <Ionicons name="sparkles" size={14} color={C.green} />
              <Text style={styles.insightsSectionTitle}>Smart Insights</Text>
            </View>
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Add income"
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
            accessibilityLabel="Add expense"
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
            {transactions.length > 0 && (
              <Pressable
                accessibilityLabel="See all transactions"
                onPress={() => router.push("/(tabs)/transactions")}
              >
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
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    marginRight: 10,
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
  insightsSection: { marginBottom: 20, gap: 8 },
  insightsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  insightsSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.green,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  insightContent: { flex: 1, gap: 2 },
  insightTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.offWhite },
  insightBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.lightGray, lineHeight: 18 },
  insightAction: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
});
