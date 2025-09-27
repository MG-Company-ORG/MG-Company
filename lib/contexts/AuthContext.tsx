"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

let initialUserPromise: Promise<User | null> | null = null;

async function loadInitialUser() {
  if (!initialUserPromise) {
    initialUserPromise = supabase.auth
      .getUser()
      .then(({ data: { user } }) => user ?? null)
      .catch((error) => {
        console.error("Error fetching auth user:", error);
        return null;
      })
      .finally(() => {
        initialUserPromise = null;
      });
  }

  return initialUserPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      setLoading(true);
      const initialUser = await loadInitialUser();
      if (isActive) {
        setUser(initialUser);
        setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (!isActive) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Wait for the auth listener to update user state; no extra handling needed
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user: refreshedUser },
      } = await supabase.auth.getUser();
      setUser(refreshedUser ?? null);
    } catch (error) {
      console.error("Error refreshing auth user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signOut,
      refresh,
    }),
    [user, loading, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
