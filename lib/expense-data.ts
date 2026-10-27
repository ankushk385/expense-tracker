import type { Budget } from '@/context/budgets';
import type { Transaction } from '@/context/transactions';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

function transactionRow(userId: string, transaction: Transaction) {
  return {
    id: transaction.id,
    user_id: userId,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    note: transaction.note,
    date: transaction.date,
    created_at: transaction.createdAt,
  };
}

function budgetRow(userId: string, budget: Budget) {
  return {
    id: budget.id,
    user_id: userId,
    category_key: budget.categoryKey,
    monthly_limit: budget.monthlyLimit,
    alert_pct: budget.alertPct,
  };
}

export async function syncTransactions(userId: string, local: Transaction[]) {
  if (!isSupabaseConfigured) return local;
  if (local.length) {
    const { error } = await supabase
      .from('expense_transactions')
      .upsert(local.map(item => transactionRow(userId, item)));
    if (error) throw error;
  }
  const { data, error } = await supabase
    .from('expense_transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
  })) as Transaction[];
}

export async function saveTransaction(userId: string, transaction: Transaction) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('expense_transactions')
    .upsert(transactionRow(userId, transaction));
  if (error) throw error;
}

export async function removeTransaction(id: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('expense_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function removeAllTransactions() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('expense_transactions').delete().neq('id', '');
  if (error) throw error;
}

export async function syncBudgets(userId: string, local: Budget[]) {
  if (!isSupabaseConfigured) return local;
  if (local.length) {
    const { error } = await supabase
      .from('expense_budgets')
      .upsert(local.map(item => budgetRow(userId, item)));
    if (error) throw error;
  }
  const { data, error } = await supabase
    .from('expense_budgets')
    .select('*')
    .order('category_key');
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    categoryKey: row.category_key,
    monthlyLimit: Number(row.monthly_limit),
    alertPct: row.alert_pct,
  })) as Budget[];
}

export async function saveBudget(userId: string, budget: Budget) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('expense_budgets')
    .upsert(budgetRow(userId, budget), { onConflict: 'user_id,category_key' });
  if (error) throw error;
}

export async function removeBudget(categoryKey: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('expense_budgets')
    .delete()
    .eq('category_key', categoryKey);
  if (error) throw error;
}

