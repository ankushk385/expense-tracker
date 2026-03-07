# Expense Tracker App

## Overview
A mobile-first personal finance app built with React Native (Expo) + Express backend.
OLED-optimised dark theme. All data stored locally using AsyncStorage.
Currency: Indian Rupee (₹)

## Architecture

### Frontend (Expo Router)
- `app/_layout.tsx` — Root layout with AuthProvider, TransactionsProvider, QueryClientProvider
- `app/(auth)/` — Login and Register screens
- `app/(tabs)/` — Main tab navigation (Dashboard, History, Analytics, Settings)
- `app/add-transaction.tsx` — Add transaction sheet (formSheet)
- `app/transaction/[id].tsx` — Transaction detail sheet (formSheet)

### Backend (Express)
- `server/index.ts` — Express server on port 5000
- `server/routes.ts` — API routes (minimal, data is local)

### Key Context Files
- `context/auth.tsx` — Authentication (login/register/logout via AsyncStorage)
- `context/transactions.tsx` — Transaction CRUD, totals, balance

### Components
- `components/CategoryIcon.tsx` — Colored icon for transaction categories
- `components/SpendingChart.tsx` — SVG-based 7-day spending bar chart
- `components/ErrorBoundary.tsx` — App-level error boundary

### Constants
- `constants/colors.ts` — OLED dark theme color tokens
- `constants/categories.ts` — Expense/income categories with icons + formatINR helper

## Design Tokens
- Background: #000000
- Card: #111111
- Card2: #1A1A1A
- Red (expenses): #E63946
- Green (income): #2A9D8F
- Light Gray: #AAAAAA
- Medium Gray: #555555
- Off-White: #F0F0F0

## Features
1. **Auth** — Email/password auth, stored locally with AsyncStorage
2. **Dashboard** — Balance hero, income/expense KPIs, 7-day chart, recent transactions
3. **Add Transaction** — Income/Expense toggle, amount, category picker, date navigator, note
4. **Transaction History** — Searchable, filterable list with type filter pills
5. **Transaction Detail** — Full info with delete action
6. **Analytics** — Period selector (week/month/3mo), bar chart, category breakdown
7. **Settings** — Profile, stats summary, data management, sign out

## Running Locally
- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)
- Scan QR code in Expo Go app to test on device

## Environment Variables
- `EXPO_PUBLIC_DOMAIN` — Set automatically in Replit workflow
- `SESSION_SECRET` — Available as secret in Replit

## Packages Used
- expo, expo-router, @tanstack/react-query
- @react-native-async-storage/async-storage
- react-native-svg (for charts)
- expo-haptics
- expo-blur, expo-glass-effect
- @expo/vector-icons
