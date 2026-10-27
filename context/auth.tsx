import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import * as Linking from "expo-linking";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { authRedirectTo, createSessionFromUrl, signInWithGoogle as beginGoogleSignIn } from "@/lib/auth";
import { requireSupabaseConfiguration, supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LEGACY_USERS_KEY = "@expense_tracker_users";
const LEGACY_SESSION_KEY = "@expense_tracker_session";

async function preserveLegacyDataOwner(user: SupabaseUser | null | undefined) {
  if (!user?.email) return;
  const [sessionRaw, usersRaw] = await Promise.all([
    AsyncStorage.getItem(LEGACY_SESSION_KEY),
    AsyncStorage.getItem(LEGACY_USERS_KEY),
  ]);
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;
  const users = usersRaw ? JSON.parse(usersRaw) : [];
  const legacy = [session, ...users].find(
    candidate => candidate?.email?.toLowerCase() === user.email?.toLowerCase(),
  );
  if (legacy?.id) {
    await AsyncStorage.setItem(`@expense_tracker_legacy_user_id_${user.id}`, legacy.id);
  }
  await AsyncStorage.multiRemove([LEGACY_USERS_KEY, LEGACY_SESSION_KEY]);
}

function toAppUser(user: SupabaseUser | null | undefined): User | null {
  if (!user) return null;
  return {
    id: user.id,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data }) => {
        await preserveLegacyDataOwner(data.session?.user);
        setUser(toAppUser(data.session?.user));
      })
      .finally(() => setIsLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void preserveLegacyDataOwner(session?.user).finally(() => {
        setUser(toAppUser(session?.user));
      });
    });
    const handleUrl = ({ url }: { url: string }) => {
      createSessionFromUrl(url).catch(error => console.error("Auth callback failed:", error));
    };
    const linkingListener = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then(url => {
      if (url?.includes("auth/callback")) handleUrl({ url });
    });
    return () => {
      data.subscription.unsubscribe();
      linkingListener.remove();
    };
  }, []);

  const login = async (email: string, password: string) => {
    requireSupabaseConfiguration();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (name: string, email: string, password: string) => {
    requireSupabaseConfiguration();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, app_source: "expense-tracker" },
        emailRedirectTo: authRedirectTo,
      },
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error("Account created. Check your email to confirm it, then log in.");
    }
  };

  const signInWithGoogle = async () => {
    await beginGoogleSignIn();
  };

  const logout = async () => {
    requireSupabaseConfiguration();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(
    () => ({ user, isLoading, login, register, signInWithGoogle, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

