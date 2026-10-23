import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import Svg, { Rect, Circle, Text as SvgText, Line, Path, G } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTransactions } from "@/context/transactions";
import { getCategoryById, formatINR } from "@/constants/categories";
import C from "@/constants/colors";

type Period = "week" | "month" | "3months";

const { width: SW } = Dimensions.get("window");
const CHART_W = SW - 40 - 32;
const BAR_H = 140;
const PAD = 16;

function getDateRange(period: Period): [Date, Date] {
  const end = new Date();
  const start = new Date();
  if (period === "week") start.setDate(start.getDate() - 6);
  else if (period === "month") start.setDate(1);
  else start.setMonth(start.getMonth() - 2, 1);
  return [start, end];
}

function groupByMonth(transactions: any[], period: Period) {
  const [start, end] = getDateRange(period);
  const months: { label: string; income: number; expense: number }[] = [];
  const cur = new Date(start);
  cur.setDate(1);

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = cur.toLocaleDateString("en-IN", { month: "short" });
    const income = transactions
      .filter((t) => t.type === "income" && t.date.startsWith(key))
      .reduce((s: number, t: any) => s + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(key))
      .reduce((s: number, t: any) => s + t.amount, 0);
    months.push({ label, income, expense });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
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

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={180} height={180}>
        <G>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} />
          ))}
          <Circle cx={cx} cy={cy} r={42} fill="#111" />
        </G>
      </Svg>
    </View>
  );
}

function CategoryBreakdown({ transactions }: { transactions: any[] }) {
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return Object.entries(map)
      .map(([key, total]) => ({ key, total, cat: getCategoryById(key) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [transactions]);

  const totalExpenses = byCategory.reduce((s, c) => s + c.total, 0);

  if (byCategory.length === 0) {
    return (
      <View style={styles.emptySmall}>
        <Text style={styles.emptySmallText}>No expense data yet</Text>
      </View>
    );
  }

  const pieData = byCategory.map(({ key, total, cat }) => ({
    label: cat?.label ?? key,
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
            return (
              <View key={key} style={styles.pieLegendItem}>
                <View style={[styles.bkDot, { backgroundColor: color }]} />
                <Text style={styles.pieLegendLabel} numberOfLines={1}>{cat?.label ?? key}</Text>
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
          return (
            <View key={key} style={styles.bkRow}>
              <View style={[styles.bkDot, { backgroundColor: color }]} />
              <Text style={styles.bkLabel} numberOfLines={1}>{cat?.label ?? key}</Text>
              <View style={styles.bkBarWrap}>
                <View style={[styles.bkBar, { width: `${Math.max(pct, 2)}%` as any, backgroundColor: color }]} />
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
  const insets = useSafeAreaInsets();
  const { transactions, totalIncome, totalExpenses } = useTransactions();
  const [period, setPeriod] = useState<Period>("month");

  const months = useMemo(() => groupByMonth(transactions, period), [transactions, period]);
  const maxVal = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const barW = months.length > 0 ? (CHART_W - PAD * 2) / months.length : 0;

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

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
            <Text style={styles.statLabel}>Total Income</Text>
            <Text style={[styles.statValue, { color: C.green }]}>₹{formatINR(totalIncome)}</Text>
          </View>
          <View style={[styles.statCard, { borderColor: C.red + "44" }]}>
            <Ionicons name="arrow-up-circle" size={20} color={C.red} />
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={[styles.statValue, { color: C.red }]}>₹{formatINR(totalExpenses)}</Text>
          </View>
          <View style={[styles.statCard, { borderColor: C.lightGray + "44" }]}>
            <Ionicons name="trending-up" size={20} color={savingsRate >= 0 ? C.green : C.red} />
            <Text style={styles.statLabel}>Savings Rate</Text>
            <Text style={[styles.statValue, { color: savingsRate >= 0 ? C.green : C.red }]}>{savingsRate}%</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(["week", "month", "3months"] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "3 Months"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Income vs Expenses</Text>
          <Svg width={CHART_W} height={BAR_H + 32}>
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
            <Line x1={PAD} y1={BAR_H} x2={CHART_W - PAD} y2={BAR_H} stroke={C.border} strokeWidth={1} />
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

        {/* Category Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Expense Breakdown</Text>
          <CategoryBreakdown transactions={transactions} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  scroll: { paddingHorizontal: 20 },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.white, letterSpacing: -0.5, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
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
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.offWhite, marginBottom: 16 },
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
  bkAmount: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.lightGray, width: 70, textAlign: "right" },
  emptySmall: { paddingVertical: 24, alignItems: "center" },
  emptySmallText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.mediumGray },
  pieRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  pieLegend: { flex: 1, gap: 6, paddingLeft: 8 },
  pieLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  pieLegendLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.offWhite, flex: 1 },
  pieLegendPct: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
