import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText, Path } from "react-native-svg";
import { useTransactions } from "@/context/transactions";
import { formatINR } from "@/constants/categories";
import C from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 120;
const CHART_PADDING = 20;

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export function SpendingChart() {
  const { transactions } = useTransactions();
  const days = getLast7Days();

  const data = useMemo(() => {
    return days.map((day) => {
      const expense = transactions
        .filter((t) => t.type === "expense" && t.date === day)
        .reduce((s, t) => s + t.amount, 0);
      const income = transactions
        .filter((t) => t.type === "income" && t.date === day)
        .reduce((s, t) => s + t.amount, 0);
      return { day, expense, income };
    });
  }, [transactions, days]);

  const maxVal = Math.max(...data.map((d) => Math.max(d.expense, d.income)), 1);
  const chartWidth = SCREEN_WIDTH - 40 - 32;
  const barWidth = (chartWidth - CHART_PADDING * 2) / days.length;

  const dayLabels = days.map((d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spending (7 days)</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: C.red }]} />
            <Text style={styles.legendText}>Expense</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: C.green }]} />
            <Text style={styles.legendText}>Income</Text>
          </View>
        </View>
      </View>

      <Svg width={chartWidth} height={CHART_HEIGHT + 28}>
        {data.map((d, i) => {
          const x = CHART_PADDING + i * barWidth;
          const bw = barWidth * 0.35;
          const expH = maxVal > 0 ? (d.expense / maxVal) * CHART_HEIGHT : 0;
          const incH = maxVal > 0 ? (d.income / maxVal) * CHART_HEIGHT : 0;

          return (
            <React.Fragment key={d.day}>
              <Rect
                x={x + barWidth * 0.1}
                y={CHART_HEIGHT - expH}
                width={bw}
                height={Math.max(expH, 2)}
                rx={4}
                fill={d.expense > 0 ? C.red : C.border}
              />
              <Rect
                x={x + barWidth * 0.1 + bw + 2}
                y={CHART_HEIGHT - incH}
                width={bw}
                height={Math.max(incH, 2)}
                rx={4}
                fill={d.income > 0 ? C.green : C.border}
              />
              <SvgText
                x={x + barWidth / 2}
                y={CHART_HEIGHT + 18}
                textAnchor="middle"
                fontSize={10}
                fill={C.mediumGray}
                fontFamily="Inter_400Regular"
              >
                {dayLabels[i]}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Line
          x1={CHART_PADDING}
          y1={CHART_HEIGHT}
          x2={chartWidth - CHART_PADDING}
          y2={CHART_HEIGHT}
          stroke={C.border}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.offWhite },
  legend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.lightGray },
});
