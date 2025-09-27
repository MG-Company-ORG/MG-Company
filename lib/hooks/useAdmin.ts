"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  email: string;
  role: string;
  user_type?: string;
  created_at?: string;
}

export interface Banner {
  id: number;
  image_url: string;
  link_url: string | null;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(profile?.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, user_type, created_at")
        .order("email", { ascending: true });

      if (error) {
        console.error("Error fetching profiles:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else {
        setProfiles(data || []);
      }
    } catch (error) {
      console.error("Error:", {
        message: error instanceof Error ? error.message : "Unknown error",
        error: error,
      });
    }
  }, []);

  const updateUserRole = useCallback(
    async (userId: string, newRole: string) => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ role: newRole })
          .eq("id", userId);

        if (error) {
          console.error("Error updating user role:", error);
          return {
            success: false,
            error: "사용자 권한 변경 중 오류가 발생했습니다.",
          };
        }

        setProfiles((prev) =>
          prev.map((profile) =>
            profile.id === userId ? { ...profile, role: newRole } : profile
          )
        );
        return { success: true };
      } catch (error) {
        console.error("Error:", error);
        return {
          success: false,
          error: "사용자 권한 변경 중 오류가 발생했습니다.",
        };
      }
    },
    []
  );

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("id, image_url, link_url")
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching banners:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      } else {
        setBanners(data || []);
      }
    } catch (error) {
      console.error("Error:", {
        message: error instanceof Error ? error.message : "Unknown error",
        error: error,
      });
    }
  }, []);

  const createBanner = useCallback(async (bannerData: Omit<Banner, "id">) => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .insert([bannerData])
        .select()
        .single();

      if (error) {
        console.error("Error creating banner:", error);
        return { success: false, error: "배너 추가 중 오류가 발생했습니다." };
      }

      setBanners((prev) => [data, ...prev]);
      return { success: true, data };
    } catch (error) {
      console.error("Error:", error);
      return { success: false, error: "배너 추가 중 오류가 발생했습니다." };
    }
  }, []);

  const deleteBanner = useCallback(async (bannerId: number) => {
    try {
      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", bannerId);

      if (error) {
        console.error("Error deleting banner:", error);
        return { success: false, error: "배너 삭제 중 오류가 발생했습니다." };
      }

      setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
      return { success: true };
    } catch (error) {
      console.error("Error:", error);
      return { success: false, error: "배너 삭제 중 오류가 발생했습니다." };
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    if (isAdmin) {
      fetchProfiles();
      fetchBanners();
    }
  }, [isAdmin, fetchProfiles, fetchBanners]);

  return {
    isAdmin,
    loading,
    profiles,
    banners,
    checkAdminStatus,
    fetchProfiles,
    updateUserRole,
    fetchBanners,
    createBanner,
    deleteBanner,
  };
}
