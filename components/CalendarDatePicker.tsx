import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AccessiblePressable as Pressable } from "@/components/AccessiblePressable";
import { fromDateKey, toDateKey, todayKey } from "@/constants/categories";
import { ThemeColors } from "@/constants/colors";
import { useAppTheme } from "@/context/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type CalendarDatePickerProps = {
  visible: boolean;
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
  accentColor: string;
  maximumDate?: string;
};

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function CalendarDatePicker({
  visible,
  value,
  onChange,
  onClose,
  accentColor,
  maximumDate = todayKey(),
}: CalendarDatePickerProps) {
  const { colors: C } = useAppTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const selectedDate = fromDateKey(value);
  const maxDate = fromDateKey(maximumDate);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  useEffect(() => {
    if (visible) {
      const nextSelectedDate = fromDateKey(value);
      setVisibleMonth(
        new Date(nextSelectedDate.getFullYear(), nextSelectedDate.getMonth(), 1),
      );
    }
  }, [visible, value]);

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= count; day += 1) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [visibleMonth]);

  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const nextDisabled = nextMonth > maxDate && !sameMonth(nextMonth, maxDate);
  const monthLabel = visibleMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close calendar"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View accessibilityLabel="Transaction date calendar" style={styles.card}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Previous month"
              style={styles.monthButton}
              onPress={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
            >
              <Ionicons name="chevron-back" size={20} color={C.text} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityState={{ disabled: nextDisabled }}
              disabled={nextDisabled}
              style={[styles.monthButton, nextDisabled && styles.disabled]}
              onPress={() => setVisibleMonth(nextMonth)}
            >
              <Ionicons name="chevron-forward" size={20} color={C.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const key = toDateKey(day);
              const selected = key === value;
              const disabled = key > maximumDate;
              return (
                <Pressable
                  key={key}
                  accessibilityLabel={day.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  style={styles.dayCell}
                  onPress={() => {
                    onChange(key);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected && { backgroundColor: accentColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        disabled && styles.disabledDayText,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityLabel="Select today"
            style={[styles.todayButton, { borderColor: accentColor }]}
            onPress={() => {
              onChange(maximumDate);
              onClose();
            }}
          >
            <Text style={[styles.todayText, { color: accentColor }]}>Today</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (C: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceSecondary,
  },
  disabled: { opacity: 0.3 },
  monthLabel: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: C.text },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: C.textSecondary,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  disabledDayText: { color: C.textSecondary, opacity: 0.35 },
  selectedDayText: { color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  todayButton: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  todayText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
