# Supabase setup — Expense Tracker

This app synchronizes its existing transactions and budgets while retaining a
per-user AsyncStorage cache. Existing data from the old local account is mapped
to a Supabase account with the same email; the old plaintext credential records
are then removed.

## 1. Client values

Use the shared Supabase Free Plan project. From **Connect** (or
**Project Settings > API**) copy only the **Project URL** and **Publishable key**.
Never place a service-role key, secret key, database password, or Google client
secret in this app.

Copy `.env.example` to `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Restart Expo after changing `.env`.

## 2. Database

In **Supabase Dashboard > SQL Editor > New query**, paste and run:

`supabase/migrations/20261027092000_expense_tracker.sql`

It creates `expense_transactions` and `expense_budgets` with validation,
indexes, and owner-only RLS.

## 3. Authentication

Email/password is enabled by default. For Google:

1. Create a Google OAuth 2.0 **Web application** client.
2. Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
3. Enable Google in **Supabase Dashboard > Authentication > Providers > Google**
   and enter the client ID and secret there.
4. Add `expensetracker://**` in
   **Authentication > URL Configuration > Redirect URLs**.

The Google secret stays only in Supabase.

## 4. EAS and APK

Configure the preview environment:

```bash
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR_PROJECT_REF.supabase.co --visibility plaintext
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value YOUR_PUBLISHABLE_KEY --visibility plaintext
```

Build the downloadable APK:

```bash
npx eas-cli build --platform android --profile preview
```

## Verification checklist

- Test email registration/login/logout and Google login.
- Verify transactions and budgets survive restart and a fresh install/login.
- Verify matching legacy local data is imported after the first Supabase login.
- Test create, edit, delete, clear, empty data, and unavailable internet.
- With two accounts, verify RLS prevents cross-user reads and writes.
- Test an expired/signed-out session returns to the login flow.

