import { fetch } from "expo/fetch";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL — explicit override (e.g. a deployed server).
 * 2. EXPO_PUBLIC_DOMAIN — Replit-style host (https://<host>).
 * 3. The Metro host the app was loaded from (LAN IP in Expo Go) on port 5000.
 * 4. localhost, for web/simulator development.
 *
 * Previously this threw when EXPO_PUBLIC_DOMAIN was missing, which made the
 * AI Coach silently fail on any device build.
 */
export function getApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) {
    return new URL(explicit.includes("://") ? explicit : `http://${explicit}`).href;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return new URL(domain.includes("://") ? domain : `https://${domain}`).href;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } })
      .expoGoConfig?.debuggerHost;
  const lanHost = hostUri?.split(":")[0];
  if (lanHost) {
    return `http://${lanHost}:5000`;
  }

  return Platform.OS === "web" ? "http://localhost:5000" : "http://localhost:5000";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
