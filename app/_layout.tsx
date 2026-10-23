import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/context/auth";
import { TransactionsProvider } from "@/context/transactions";
import { BudgetsProvider } from "@/context/budgets";
import { BudgetAlertsProvider } from "@/context/budget-alerts";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const [onboarding, setOnboarding] = React.useState<{
    loaded: boolean;
    complete: boolean;
  }>({ loaded: false, complete: false });

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem("@expense_tracker_onboarded")
      .then((value) => {
        if (!cancelled) {
          setOnboarding({ loaded: true, complete: value === "true" });
        }
      })
      .catch(() => {
        if (!cancelled) setOnboarding({ loaded: true, complete: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !onboarding.loaded) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";
    if (user && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    } else if (!user && !onboarding.complete && !inOnboarding && !inAuthGroup) {
      router.replace("/onboarding");
    } else if (!user && onboarding.complete && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading, onboarding, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-transaction"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.92],
          sheetGrabberVisible: true,
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="edit-transaction"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.92],
          sheetGrabberVisible: true,
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="transaction/[id]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.78],
          sheetGrabberVisible: true,
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="set-budget"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.55],
          sheetGrabberVisible: true,
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AuthProvider>
              <TransactionsProvider>
                <BudgetsProvider>
                  <BudgetAlertsProvider>
                    <RootLayoutNav />
                  </BudgetAlertsProvider>
                </BudgetsProvider>
              </TransactionsProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
