import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { useAuth } from "./auth";
import {
  fetchBudgets,
  removeBudget as removeCloudBudget,
  saveBudget,
  syncBudgets,
} from "@/lib/expense-data";

export interface Budget {
  id: string;
  categoryKey: string;
  monthlyLimit: number;
  alertPct: number;
}

interface BudgetsContextValue {
  budgets: Budget[];
  isLoading: boolean;
  setBudget: (categoryKey: string, monthlyLimit: number, alertPct?: number) => Promise<void>;
  removeBudget: (categoryKey: string) => Promise<void>;
  getBudget: (categoryKey: string) => Budget | undefined;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  syncError: string | null;
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null);

function storageKey(userId: string) {
  return `@expense_tracker_budgets_${userId}`;
}

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setBudgets([]);
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        let raw = await AsyncStorage.getItem(storageKey(user.id));
        if (!raw) {
          const legacyId = await AsyncStorage.getItem(`@expense_tracker_legacy_user_id_${user.id}`);
          if (legacyId) raw = await AsyncStorage.getItem(storageKey(legacyId));
        }
        const local: Budget[] = raw ? JSON.parse(raw) : [];
        setBudgets(local);
        const synced = await syncBudgets(user.id, local);
        setBudgets(synced);
        await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(synced));
        setSyncError(null);
      } catch (error) {
        console.warn("Budget cloud sync failed; using local data.", error);
        setSyncError("Budgets could not reach Supabase.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await syncBudgets(user.id, budgets);
      setBudgets(synced);
      await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(synced));
      setSyncError(null);
    } catch (error) {
      setSyncError("Budgets could not reach Supabase.");
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [budgets, isSyncing, user]);

  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void fetchBudgets()
        .then(async (cloud) => {
          setBudgets(cloud);
          await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(cloud));
          setSyncError(null);
        })
        .catch(() => setSyncError("Budgets could not reach Supabase."));
    });
    return () => subscription.remove();
  }, [user]);

  const save = useCallback(
    async (updated: Budget[]) => {
      if (!user) return;
      await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(updated));
      setBudgets(updated);
    },
    [user]
  );

  const setBudget = useCallback(
    async (categoryKey: string, monthlyLimit: number, alertPct = 80) => {
      const existing = budgets.find((b) => b.categoryKey === categoryKey);
      let updated: Budget[];
      if (existing) {
        updated = budgets.map((b) =>
          b.categoryKey === categoryKey ? { ...b, monthlyLimit, alertPct } : b
        );
      } else {
        const newBudget: Budget = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          categoryKey,
          monthlyLimit,
          alertPct,
        };
        updated = [...budgets, newBudget];
      }
      await save(updated);
      const changed = updated.find(budget => budget.categoryKey === categoryKey);
      if (user && changed) await saveBudget(user.id, changed);
    },
    [budgets, save, user]
  );

  const removeBudget = useCallback(
    async (categoryKey: string) => {
      const updated = budgets.filter((b) => b.categoryKey !== categoryKey);
      await save(updated);
      await removeCloudBudget(categoryKey);
    },
    [budgets, save]
  );

  const getBudget = useCallback(
    (categoryKey: string) => budgets.find((b) => b.categoryKey === categoryKey),
    [budgets]
  );

  const value = useMemo(
    () => ({ budgets, isLoading, setBudget, removeBudget, getBudget, syncNow, isSyncing, syncError }),
    [budgets, isLoading, setBudget, removeBudget, getBudget, syncNow, isSyncing, syncError]
  );

  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export function useBudgets() {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error("useBudgets must be used within BudgetsProvider");
  return ctx;
}
