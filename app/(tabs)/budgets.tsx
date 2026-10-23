import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTransactions } from "@/context/transactions";
import { useBudgets } from "@/context/budgets";
import { EXPENSE_CATEGORIES, formatINR } from "@/constants/categories";
import C from "@/constants/colors";

interface BudgetCardProps {
  categoryKey: string;
  monthlyLimit: number;
  spent: number;
  alertPct: number;
}

function BudgetCard({ categoryKey, monthlyLimit, spent, alertPct }: BudgetCardProps) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.key === categoryKey);
  const rawPct = monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : 0;
  const pct = Math.min(rawPct, 100);
  const isOver = spent > monthlyLimit;
  const isAlert = !isOver && rawPct >= alertPct;
  const barColor = isOver ? C.red : isAlert ? "#F4A261" : C.green;
  const remaining = monthlyLimit - spent;

  return (
    <Pressable
      accessibilityLabel={`${cat?.label ?? categoryKey} budget, ₹${formatINR(spent)} spent of ₹${formatINR(monthlyLimit)}${isOver ? ", over budget" : ""}`}
      style={styles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: "/set-budget",
          params: { categoryKey },
        });
      }}
    >
      <View style={styles.cardTop}>
        <View style={[styles.catIcon, { backgroundColor: (cat?.color ?? C.red) + "22" }]}>
          <Ionicons
            name={(cat?.icon ?? "pricetag") as any}
            size={20}
            color={cat?.color ?? C.red}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.catName}>{cat?.label ?? categoryKey}</Text>
          <Text style={styles.spentText}>
            ₹{formatINR(spent)} of ₹{formatINR(monthlyLimit)}
          </Text>
        </View>
        {isOver ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Over</Text>
          </View>
        ) : isAlert ? (
          <View style={[styles.badge, { backgroundColor: "rgba(244,162,97,0.15)", borderColor: "#F4A261" + "44" }]}>
            <Text style={[styles.badgeText, { color: "#F4A261" }]}>{Math.round(rawPct)}%</Text>
          </View>
        ) : null}
        <Ionicons name="pencil-outline" size={16} color={C.mediumGray} />
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.pctText}>{Math.round(rawPct)}% used</Text>
        {!isOver && (
          <Text style={[styles.remainText, { color: barColor }]}>
            ₹{formatINR(Math.abs(remaining))} {remaining >= 0 ? "remaining" : "over"}
          </Text>
        )}
        {isOver && (
          <Text style={styles.overText}>₹{formatINR(Math.abs(remaining))} over budget</Text>
        )}
      </View>
    </Pressable>
  );
}

function EmptyCatCard({ cat }: { cat: (typeof EXPENSE_CATEGORIES)[0] }) {
  return (
    <Pressable
      accessibilityLabel={`Set a budget for ${cat.label}`}
      style={styles.emptyCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/set-budget", params: { categoryKey: cat.key } });
      }}
    >
      <View style={[styles.catIcon, { backgroundColor: cat.color + "11" }]}>
        <Ionicons name={cat.icon as any} size={18} color={cat.color + "88"} />
      </View>
      <Text style={styles.emptyCatName}>{cat.label}</Text>
      <View style={styles.plusCircle}>
        <Ionicons name="add" size={14} color={C.lightGray} />
      </View>
    </Pressable>
  );
}

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const spendByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "expense" && t.date.startsWith(currentMonth)) {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      }
    }
    return map;
  }, [transactions, currentMonth]);

  const totalBudgeted = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spendByCategory[b.categoryKey] ?? 0), 0);
  const overCount = budgets.filter(
    (b) => (spendByCategory[b.categoryKey] ?? 0) > b.monthlyLimit
  ).length;

  const unbudgetedCats = EXPENSE_CATEGORIES.filter(
    (c) => !budgets.find((b) => b.categoryKey === c.key)
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={{
          paddingTop: topPad + 8,
          paddingBottom: botPad + 100,
          paddingHorizontal: 16,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.screenTitle}>Budgets</Text>
            <Text style={styles.monthLabel}>
              {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </Text>

            {budgets.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryVal} numberOfLines={1} adjustsFontSizeToFit>
                    ₹{formatINR(totalBudgeted)}
                  </Text>
                  <Text style={styles.summaryKey}>Total Budgeted</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text
                    style={[styles.summaryVal, { color: totalSpent > totalBudgeted ? C.red : C.offWhite }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    ₹{formatINR(totalSpent)}
                  </Text>
                  <Text style={styles.summaryKey}>Total Spent</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text
                    style={[
                      styles.summaryVal,
                      { color: overCount > 0 ? C.red : C.green },
                    ]}
                  >
                    {overCount}
                  </Text>
                  <Text style={styles.summaryKey}>Over Budget</Text>
                </View>
              </View>
            )}

            {budgets.length > 0 && (
              <Text style={styles.sectionHeader}>YOUR BUDGETS</Text>
            )}
          </>
        }
        data={budgets}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BudgetCard
            categoryKey={item.categoryKey}
            monthlyLimit={item.monthlyLimit}
            spent={spendByCategory[item.categoryKey] ?? 0}
            alertPct={item.alertPct}
          />
        )}
        ListFooterComponent={
          <>
            {unbudgetedCats.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { marginTop: budgets.length > 0 ? 12 : 0 }]}>
                  SET BUDGETS
                </Text>
                <View style={styles.emptyCatGrid}>
                  {unbudgetedCats.map((cat) => (
                    <EmptyCatCard key={cat.key} cat={cat} />
                  ))}
                </View>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          budgets.length === 0 ? (
            <View style={styles.emptyHero}>
              <Ionicons name="wallet-outline" size={48} color={C.mediumGray} />
              <Text style={styles.emptyHeroTitle}>No budgets yet</Text>
              <Text style={styles.emptyHeroSub}>
                Tap any category above to set a monthly budget
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: C.white,
    marginBottom: 2,
  },
  monthLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: C.lightGray,
    marginBottom: 16,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontFamily: "Inter_700Bold", fontSize: 17, color: C.offWhite },
  summaryKey: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.lightGray, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 8 },
  sectionHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: C.lightGray,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    marginBottom: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  catName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.offWhite },
  spentText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray, marginTop: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: C.redDim,
    borderWidth: 1,
    borderColor: C.red + "44",
  },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.red },
  barBg: { height: 6, backgroundColor: C.card2, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  pctText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray },
  remainText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  overText: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.red },
  emptyCatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 2,
  },
  emptyCatName: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.lightGray, flex: 1 },
  plusCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHero: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyHeroTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: C.offWhite },
  emptyHeroSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.lightGray, textAlign: "center" },
});
