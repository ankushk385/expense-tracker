import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useAuth } from "./auth";
import { useBudgets } from "./budgets";
import { useTransactions } from "./transactions";
import { getCategoryById, formatINR } from "@/constants/categories";

// expo-notifications has no web implementation; calling this at import time
// would break the web build before the app even renders.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

interface BudgetAlertsValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => Promise<boolean>;
}

const BudgetAlertsContext = createContext<BudgetAlertsValue | null>(null);

function enabledKey(userId: string) {
  return `@expense_tracker_budget_alerts_enabled_${userId}`;
}

function notifiedKey(userId: string) {
  return `@expense_tracker_budget_alerts_sent_${userId}`;
}

export function BudgetAlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();
  const [enabled, setEnabledState] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [sentAlerts, setSentAlerts] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setPreferencesLoaded(false);
    if (!user) {
      setEnabledState(false);
      setSentAlerts([]);
      setPreferencesLoaded(true);
      return;
    }
    Promise.all([
      AsyncStorage.getItem(enabledKey(user.id)),
      AsyncStorage.getItem(notifiedKey(user.id)),
    ]).then(([storedEnabled, storedSent]) => {
      if (cancelled) return;
      setEnabledState(storedEnabled === "true");
      try {
        setSentAlerts(storedSent ? JSON.parse(storedSent) : []);
      } catch {
        setSentAlerts([]);
      }
      setPreferencesLoaded(true);
    }).catch(() => {
      if (!cancelled) {
        setEnabledState(false);
        setSentAlerts([]);
        setPreferencesLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    if (!user) return false;
    if (nextEnabled) {
      if (Platform.OS === "web") return false;
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (permission.status !== "granted") return false;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("budget-alerts", {
          name: "Budget alerts",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    }
    await AsyncStorage.setItem(enabledKey(user.id), String(nextEnabled));
    setEnabledState(nextEnabled);
    return true;
  }, [user?.id]);

  useEffect(() => {
    if (!user || !enabled || !preferencesLoaded || Platform.OS === "web") return;
    let cancelled = false;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const spending: Record<string, number> = {};
    for (const transaction of transactions) {
      if (transaction.type === "expense" && transaction.date.startsWith(month)) {
        spending[transaction.category] = (spending[transaction.category] ?? 0) + transaction.amount;
      }
    }

    const freshAlerts: string[] = [];
    const newlySent = new Set(sentAlerts);
    for (const budget of budgets) {
      if (budget.monthlyLimit <= 0) continue;
      const spent = spending[budget.categoryKey] ?? 0;
      const pct = (spent / budget.monthlyLimit) * 100;
      const level = pct >= 100 ? "over" : pct >= budget.alertPct ? "warning" : null;
      if (!level) continue;
      const key = `${month}:${budget.categoryKey}:${level}`;
      if (newlySent.has(key)) continue;
      newlySent.add(key);
      freshAlerts.push(key);
      const category = getCategoryById(budget.categoryKey)?.label ?? budget.categoryKey;
      const body = level === "over"
        ? `${category}: ₹${formatINR(spent)} spent against your ₹${formatINR(budget.monthlyLimit)} limit.`
        : `${category}: ${Math.floor(pct)}% of your monthly budget used.`;
      void Notifications.scheduleNotificationAsync({
        content: {
          title: level === "over" ? "Budget exceeded" : "Budget alert",
          body,
          data: { categoryKey: budget.categoryKey, month, level },
        },
        trigger: null,
      }).catch((error) => console.warn("Could not schedule budget notification", error));
    }

    if (freshAlerts.length > 0) {
      const updated = [...newlySent];
      setSentAlerts(updated);
      void AsyncStorage.setItem(notifiedKey(user.id), JSON.stringify(updated)).catch(
        (error) => console.warn("Could not save budget notification state", error),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id, enabled, preferencesLoaded, transactions, budgets, sentAlerts]);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);
  return (
    <BudgetAlertsContext.Provider value={value}>
      {children}
    </BudgetAlertsContext.Provider>
  );
}

export function useBudgetAlerts() {
  const context = useContext(BudgetAlertsContext);
  if (!context) throw new Error("useBudgetAlerts must be used within BudgetAlertsProvider");
  return context;
}
