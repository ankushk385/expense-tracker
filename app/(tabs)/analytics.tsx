import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Rect,
  Circle,
  Text as SvgText,
  Line,
  Path,
  G,
} from "react-native-svg";
import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTransactions } from "@/context/transactions";
import {
  getCategoryById,
  formatINR,
  toDateKey,
  todayKey,
  fromDateKey,
} from "@/constants/categories";
import type { Transaction } from "@/context/transactions";
import { ThemeColors } from "@/constants/colors";
import { useAppTheme } from "@/context/theme";
import { router } from "expo-router";

type Period = "week" | "month" | "3months";

const BAR_H = 140;
const PAD = 16;

const PERIOD_LABEL: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  "3months": "3 Months",
};

function getDateRange(period: Period): [string, string] {
  const end = todayKey();
  const start = fromDateKey(end);
  if (period === "week") start.setDate(start.getDate() - 6);
  else if (period === "month") start.setDate(1);
  else start.setMonth(start.getMonth() - 2, 1);
  return [toDateKey(start), end];
}

function filterByPeriod(transactions: Transaction[], period: Period) {
  const [start, end] = getDateRange(period);
  return transactions.filter((t) => t.date >= start && t.date <= end);
}

function groupByMonth(transactions: Transaction[], period: Period) {
  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = fromDateKey(todayKey());
      day.setDate(day.getDate() - 6 + index);
      const key = toDateKey(day);
      return {
        label: day.toLocaleDateString("en-IN", { weekday: "short" }),
        income: transactions
          .filter((transaction) => transaction.type === "income" && transaction.date === key)
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        expense: transactions
          .filter((transaction) => transaction.type === "expense" && transaction.date === key)
          .reduce((sum, transaction) => sum + transaction.amount, 0),
      };
    });
  }

  const [startKey, endKey] = getDateRange(period);
  const months: { label: string; income: number; expense: number }[] = [];
  const cur = fromDateKey(startKey);
  cur.setDate(1);
  const end = fromDateKey(endKey);

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleDateString("en-IN", { month: "short" });
    const income = transactions
      .filter((t) => t.type === "income" && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
    months.push({ label, income, expense });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { colors: C } = useAppTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const R = 70;
  const cx = 90;
  const cy = 90;
  let cumulativePct = 0;

  const slices = data.map((d) => {
    const pct = d.value / total;
    const startAngle = cumulativePct * 2 * Math.PI - Math.PI / 2;
    cumulativePct += pct;
    const endAngle = cumulativePct * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path, pct };
  });

  // A single category is 100% of the pie. An SVG arc whose start and end
  // points are identical renders nothing, so draw a full circle instead.
  const isSingleSlice = slices.length === 1 || slices.some((s) => s.pct > 0.999);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={180} height={180}>
        <G>
          {isSingleSlice ? (
            <Circle cx={cx} cy={cy} r={R} fill={slices[0].color} />
          ) : (
            slices.map((s, i) => <Path key={i} d={s.path} fill={s.color} />)
          )}
          <Circle cx={cx} cy={cy} r={42} fill={C.card} />
        </G>
      </Svg>
    </View>
  );
}

function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const { colors: C } = useAppTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      });
    const ranked = Object.entries(map)
      .map(([key, total]) => ({ key, total, cat: getCategoryById(key) }))
      .sort((a, b) => b.total - a.total);
    const topCategories = ranked.slice(0, 6);
    const remainingTotal = ranked
      .slice(6)
      .reduce((sum, category) => sum + category.total, 0);
    if (remainingTotal > 0) {
      topCategories.push({
        key: "__remaining_categories__",
        total: remainingTotal,
        cat: undefined,
      });
    }
    return topCategories;
  }, [transactions]);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  if (byCategory.length === 0) {
    return (
      <View style={styles.emptySmall}>
        <Text style={styles.emptySmallText}>No expense data for this period</Text>
      </View>
    );
  }

  const pieData = byCategory.map(({ key, total, cat }) => ({
    label: cat?.label ?? (key === "__remaining_categories__" ? "Other categories" : key),
    value: total,
    color: cat?.color ?? C.mediumGray,
  }));

  return (
    <View>
      <View style={styles.pieRow}>
        <PieChart data={pieData} />
        <View style={styles.pieLegend}>
          {byCategory.map(({ key, total, cat }) => {
            const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
            const color = cat?.color ?? C.mediumGray;
            const label =
              cat?.label ?? (key === "__remaining_categories__" ? "Other categories" : key);
            return (
              <View key={key} style={styles.pieLegendItem}>
                <View style={[styles.bkDot, { backgroundColor: color }]} />
                <Text style={styles.pieLegendLabel} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={[styles.pieLegendPct, { color }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.breakdown}>
        {byCategory.map(({ key, total, cat }) => {
          const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
          const color = cat?.color ?? C.mediumGray;
          const label =
            cat?.label ?? (key === "__remaining_categories__" ? "Other categories" : key);
          return (
            <View key={key} style={styles.bkRow}>
              <View style={[styles.bkDot, { backgroundColor: color }]} />
              <Text style={styles.bkLabel} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.bkBarWrap}>
                <View
                  style={[
                    styles.bkBar,
                    { width: `${Math.max(pct, 2)}%` as any, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={styles.bkAmount}>₹{formatINR(total)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors: C } = useAppTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { transactions } = useTransactions();
  const [period, setPeriod] = useState<Period>("month");

  const periodTransactions = useMemo(
    () => filterByPeriod(transactions, period),
    [transactions, period]
  );
  const months = useMemo(
    () => groupByMonth(transactions, period),
    [transactions, period]
  );

  const totalIncome = periodTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = periodTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const maxVal = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const chartWidth = Math.max(width - 40 - 32, 200);
  const barW = months.length > 0 ? (chartWidth - PAD * 2) / months.length : 0;

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  const hasPeriodData = periodTransactions.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInset + 8, paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Analytics</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: C.green + "44" }]}>
            <Ionicons name="arrow-down-circle" size={20} color={C.green} />
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: C.green }]} numberOfLines={1}>
              ₹{formatINR(totalIncome)}
            </Text>
          </View>
          <View style={[styles.statCard, { borderColor: C.red + "44" }]}>
            <Ionicons name="arrow-up-circle" size={20} color={C.red} />
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={[styles.statValue, { color: C.red }]} numberOfLines={1}>
              ₹{formatINR(totalExpenses)}
            </Text>
          </View>
          <View style={[styles.statCard, { borderColor: C.lightGray + "44" }]}>
            <Ionicons
              name="trending-up"
              size={20}
              color={savingsRate >= 0 ? C.green : C.red}
            />
            <Text style={styles.statLabel}>Savings</Text>
            <Text
              style={[styles.statValue, { color: savingsRate >= 0 ? C.green : C.red }]}
              numberOfLines={1}
            >
              {savingsRate}%
            </Text>
          </View>
        </View>
        <Text style={styles.statsHint}>Totals for {PERIOD_LABEL[period].toLowerCase()}</Text>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(["week", "month", "3months"] as Period[]).map((p) => (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityLabel={PERIOD_LABEL[p]}
              accessibilityState={{ selected: period === p }}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {PERIOD_LABEL[p]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Income vs Expenses</Text>
          <Svg width={chartWidth} height={BAR_H + 32}>
            {months.map((m, i) => {
              const x = PAD + i * barW;
              const incH = (m.income / maxVal) * BAR_H;
              const expH = (m.expense / maxVal) * BAR_H;
              const bw = barW * 0.32;
              return (
                <React.Fragment key={m.label + i}>
                  <Rect
                    x={x + barW * 0.08}
                    y={BAR_H - incH}
                    width={bw}
                    height={Math.max(incH, 2)}
                    rx={4}
                    fill={m.income > 0 ? C.green : C.border}
                  />
                  <Rect
                    x={x + barW * 0.08 + bw + 3}
                    y={BAR_H - expH}
                    width={bw}
                    height={Math.max(expH, 2)}
                    rx={4}
                    fill={m.expense > 0 ? C.red : C.border}
                  />
                  <SvgText
                    x={x + barW / 2}
                    y={BAR_H + 20}
                    textAnchor="middle"
                    fontSize={11}
                    fill={C.lightGray}
                    fontFamily="Inter_400Regular"
                  >
                    {m.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
            <Line
              x1={PAD}
              y1={BAR_H}
              x2={chartWidth - PAD}
              y2={BAR_H}
              stroke={C.border}
              strokeWidth={1}
            />
          </Svg>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: C.green }]} />
              <Text style={styles.legendLabel}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: C.red }]} />
              <Text style={styles.legendLabel}>Expenses</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Ask AI Finance Coach about analytics"
          style={styles.coachCard}
          onPress={() => router.push("/(tabs)/ai-coach")}
        >
          <View style={styles.coachIcon}><Ionicons name="sparkles" size={22} color={C.purple} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachTitle}>Ask AI Finance Coach</Text>
            <Text style={styles.coachText}>Turn these trends into practical next steps</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
        </Pressable>

        {/* Category Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Expense Breakdown</Text>
          {hasPeriodData ? (
            <CategoryBreakdown transactions={periodTransactions} />
          ) : (
            <View style={styles.emptySmall}>
              <Text style={styles.emptySmallText}>No transactions for this period</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  scroll: { paddingHorizontal: 20 },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.lightGray },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  statsHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: C.mediumGray,
    marginBottom: 16,
    marginLeft: 2,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  periodBtnActive: { backgroundColor: C.redDim, borderColor: C.red },
  periodText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray },
  periodTextActive: { fontFamily: "Inter_600SemiBold", color: C.red },
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: C.offWhite,
    marginBottom: 16,
  },
  coachCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, minHeight: 76, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  coachIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.purple + "20" },
  coachTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.text },
  coachText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textSecondary, marginTop: 3 },
  legend: { flexDirection: "row", gap: 16, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray },
  breakdown: { gap: 12 },
  bkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bkDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  bkLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.offWhite, width: 90 },
  bkBarWrap: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
  bkBar: { height: "100%", borderRadius: 3 },
  bkAmount: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.lightGray,
    width: 70,
    textAlign: "right",
  },
  emptySmall: { paddingVertical: 24, alignItems: "center" },
  emptySmallText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.mediumGray },
  pieRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  pieLegend: { flex: 1, gap: 6, paddingLeft: 8 },
  pieLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  pieLegendLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.offWhite, flex: 1 },
  pieLegendPct: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
