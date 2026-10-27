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
import { useAuth } from "./auth";
import {
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
}

const BudgetsContext = createContext<BudgetsContextValue | null>(null);

function storageKey(userId: string) {
  return `@expense_tracker_budgets_${userId}`;
}

export function BudgetsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } catch (error) {
        console.warn("Budget cloud sync failed; using local data.", error);
      } finally {
        setIsLoading(false);
      }
    })();
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
    () => ({ budgets, isLoading, setBudget, removeBudget, getBudget }),
    [budgets, isLoading, setBudget, removeBudget, getBudget]
  );

  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export function useBudgets() {
  const ctx = useContext(BudgetsContext);
  if (!ctx) throw new Error("useBudgets must be used within BudgetsProvider");
  return ctx;
}
