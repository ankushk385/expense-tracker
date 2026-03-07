import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: string;
}

interface TransactionsContextValue {
  transactions: Transaction[];
  isLoading: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Omit<Transaction, "id" | "createdAt">>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

function storageKey(userId: string) {
  return `@expense_tracker_txns_${userId}`;
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const raw = await AsyncStorage.getItem(storageKey(user.id));
        if (raw) setTransactions(JSON.parse(raw));
        else setTransactions([]);
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.id]);

  const save = useCallback(
    async (updated: Transaction[]) => {
      if (!user) return;
      await AsyncStorage.setItem(storageKey(user.id), JSON.stringify(updated));
      setTransactions(updated);
    },
    [user?.id]
  );

  const addTransaction = useCallback(
    async (t: Omit<Transaction, "id" | "createdAt">) => {
      const newTxn: Transaction = {
        ...t,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      const updated = [newTxn, ...transactions];
      await save(updated);
    },
    [transactions, save]
  );

  const updateTransaction = useCallback(
    async (id: string, partial: Partial<Omit<Transaction, "id" | "createdAt">>) => {
      const updated = transactions.map((t) => (t.id === id ? { ...t, ...partial } : t));
      await save(updated);
    },
    [transactions, save]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const updated = transactions.filter((t) => t.id !== id);
      await save(updated);
    },
    [transactions, save]
  );

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const balance = totalIncome - totalExpenses;

  const value = useMemo(
    () => ({
      transactions,
      isLoading,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      totalIncome,
      totalExpenses,
      balance,
    }),
    [transactions, isLoading, addTransaction, updateTransaction, deleteTransaction, totalIncome, totalExpenses, balance]
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error("useTransactions must be used within TransactionsProvider");
  return ctx;
}
