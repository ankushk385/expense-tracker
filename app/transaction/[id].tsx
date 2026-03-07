import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTransactions } from "@/context/transactions";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryById, formatINR } from "@/constants/categories";
import C from "@/constants/colors";

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TransactionDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, deleteTransaction } = useTransactions();

  const transaction = transactions.find((t) => t.id === id);

  if (!transaction) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Transaction not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const cat = getCategoryById(transaction.category);
  const isIncome = transaction.type === "income";
  const accentColor = isIncome ? C.green : C.red;
  const accentDim = isIncome ? C.greenDim : C.redDim;

  const handleDelete = () => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteTransaction(transaction.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) }]}>
      <View style={styles.grabBar} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transaction</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={C.lightGray} />
        </Pressable>
      </View>

      {/* Main Card */}
      <View style={[styles.mainCard, { borderColor: accentColor + "44", backgroundColor: accentDim }]}>
        <CategoryIcon categoryKey={transaction.category} size={24} />
        <View style={styles.mainCardInfo}>
          <Text style={styles.categoryLabel}>{cat?.label ?? transaction.category}</Text>
          <Text style={[styles.amountText, { color: accentColor }]}>
            {isIncome ? "+" : "-"}₹{formatINR(transaction.amount)}
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: accentColor + "22" }]}>
          <Text style={[styles.typeBadgeText, { color: accentColor }]}>
            {isIncome ? "Income" : "Expense"}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsCard}>
        <DetailRow
          icon="calendar-outline"
          label="Date"
          value={formatFullDate(transaction.date)}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="pricetag-outline"
          label="Category"
          value={cat?.label ?? transaction.category}
        />
        {transaction.note ? (
          <>
            <View style={styles.divider} />
            <DetailRow
              icon="pencil-outline"
              label="Note"
              value={transaction.note}
            />
          </>
        ) : null}
        <View style={styles.divider} />
        <DetailRow
          icon="time-outline"
          label="Added"
          value={new Date(transaction.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
      </View>

      {/* Delete */}
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
        onPress={handleDelete}
      >
        <Ionicons name="trash-outline" size={18} color={C.red} />
        <Text style={styles.deleteBtnText}>Delete Transaction</Text>
      </Pressable>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon as any} size={16} color={C.lightGray} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card, paddingHorizontal: 20 },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.mediumGray,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.white },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  mainCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
  mainCardInfo: { flex: 1 },
  categoryLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.lightGray },
  amountText: { fontFamily: "Inter_700Bold", fontSize: 32, letterSpacing: -1 },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  typeBadgeText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  detailsCard: {
    backgroundColor: C.card2,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray },
  detailValue: { fontFamily: "Inter_500Medium", fontSize: 15, color: C.offWhite, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 60 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.redDim,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.red + "44",
  },
  deleteBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.red },
  notFound: { flex: 1, backgroundColor: C.black, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontFamily: "Inter_500Medium", fontSize: 16, color: C.lightGray },
  backBtn: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.red },
});
