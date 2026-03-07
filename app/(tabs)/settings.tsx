import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/auth";
import { useTransactions } from "@/context/transactions";
import { formatINR } from "@/constants/categories";
import C from "@/constants/colors";

function SettingsRow({
  icon,
  iconColor,
  label,
  sublabel,
  onPress,
  destructive,
  rightElement,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  destructive?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && { color: C.red }]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {rightElement ?? (
        onPress ? <Ionicons name="chevron-forward" size={16} color={C.mediumGray} /> : null
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { transactions, totalIncome, totalExpenses, balance } = useTransactions();
  const [exporting, setExporting] = useState(false);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  };

  const handleDeleteData = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently delete all your transactions. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await AsyncStorage.removeItem(`@expense_tracker_txns_${user?.id}`);
            Alert.alert("Done", "All transactions deleted.");
          },
        },
      ]
    );
  };

  const transactionCount = transactions.length;
  const incomeCount = transactions.filter((t) => t.type === "income").length;
  const expenseCount = transactions.filter((t) => t.type === "expense").length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInset + 8, paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{transactionCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: C.green }]}>{incomeCount}</Text>
            <Text style={styles.statLabel}>Income</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: C.red }]}>{expenseCount}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: balance >= 0 ? C.green : C.red, fontSize: 14 }]}>
              ₹{formatINR(Math.abs(balance))}
            </Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          <SettingsRow
            icon="person-circle-outline"
            iconColor="#4CC9F0"
            label="Profile"
            sublabel={user?.email ?? ""}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="notifications-outline"
            iconColor="#FFD166"
            label="Notifications"
            sublabel="Budget alerts & reminders"
          />
        </View>

        {/* Data Section */}
        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.group}>
          <SettingsRow
            icon="cloud-download-outline"
            iconColor={C.green}
            label="Export Data"
            sublabel="Download as CSV"
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("Export", "Your transaction data has been prepared. On a real device, this would save a CSV file to your downloads.");
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="trash-outline"
            iconColor={C.red}
            label="Delete All Transactions"
            destructive
            onPress={handleDeleteData}
          />
        </View>

        {/* App Section */}
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.group}>
          <SettingsRow
            icon="information-circle-outline"
            iconColor={C.lightGray}
            label="Version"
            sublabel="1.0.0"
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="shield-checkmark-outline"
            iconColor="#4361EE"
            label="Privacy"
            sublabel="Data stored locally on device"
          />
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={C.red} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.black },
  scroll: { paddingHorizontal: 20 },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 28, color: C.white, letterSpacing: -0.5, marginBottom: 20 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.redDim,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.red },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: C.white },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.lightGray, marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.white },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.lightGray, marginTop: 2 },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.lightGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: C.card,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 15, color: C.offWhite },
  rowSublabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.lightGray, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 64 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.redDim,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.red + "44",
    marginBottom: 16,
  },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.red },
});
