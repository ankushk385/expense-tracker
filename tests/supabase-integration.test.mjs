import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('expense tables and owner RLS are defined', async () => {
  const sql = await read('supabase/migrations/20261027092000_expense_tracker.sql');
  assert.match(sql, /expense_transactions/);
  assert.match(sql, /expense_budgets/);
  assert.equal((sql.match(/enable row level security/gi) ?? []).length, 2);
  assert.match(sql, /auth\.uid\(\)/);
  assert.doesNotMatch(sql, /service[_-]role/i);
});

test('legacy plaintext credentials are removed after account mapping', async () => {
  const auth = await read('context/auth.tsx');
  assert.match(auth, /preserveLegacyDataOwner/);
  assert.match(auth, /multiRemove\(\[LEGACY_USERS_KEY, LEGACY_SESSION_KEY\]\)/);
  assert.match(auth, /signInWithGoogle/);
});

