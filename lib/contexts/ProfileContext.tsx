"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { UserType } from "@/lib/types/database";

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  user_type: UserType | null;
  created_at?: string;
}

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  userType: UserType | null;
  isEmployer: boolean;
  isJobseeker: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

export const ProfileContext =
  createContext<ProfileContextValue | undefined>(undefined);

const profileDataCache = new Map<string, UserProfile | null>();
const profilePromiseCache = new Map<string, Promise<UserProfile | null>>();

async function resolveProfile(
  userId: string,
  force = false
): Promise<UserProfile | null> {
  if (force) {
    profileDataCache.delete(userId);
    profilePromiseCache.delete(userId);
  } else {
    if (profileDataCache.has(userId)) {
      return profileDataCache.get(userId) ?? null;
    }

    const pending = profilePromiseCache.get(userId);
    if (pending) {
      return pending;
    }
  }

  const request = (async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, user_type, created_at")
        .eq("id", userId)
        .single();

      if (error) {
        throw error;
      }

      const result = data ?? null;
      profileDataCache.set(userId, result);
      return result;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      profileDataCache.delete(userId);
      throw error;
    } finally {
      profilePromiseCache.delete(userId);
    }
  })();

  profilePromiseCache.set(userId, request);
  return request;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(
    async (options?: { force?: boolean }) => {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const force = options?.force ?? false;

      if (!force && profileDataCache.has(userId)) {
        setProfile(profileDataCache.get(userId) ?? null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await resolveProfile(userId, force);
        setProfile(data);
      } catch (error) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId, fetchProfile]);

  const refetch = useCallback(async () => {
    await fetchProfile({ force: true });
  }, [fetchProfile]);

  const computedValues = useMemo(() => {
    if (!profile) {
      return {
        userType: null,
        isEmployer: false,
        isJobseeker: false,
        isAdmin: false,
      } as const;
    }

    const userType =
      profile.role === "admin"
        ? profile.user_type || null
        : profile.user_type || "jobseeker";

    return {
      userType,
      isEmployer: userType === "employer",
      isJobseeker: userType === "jobseeker",
      isAdmin: profile.role === "admin",
    } as const;
  }, [profile]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      ...computedValues,
      refetch,
    }),
    [profile, loading, computedValues, refetch]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
