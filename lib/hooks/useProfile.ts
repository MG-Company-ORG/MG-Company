"use client";

import { useContext } from "react";
import {
  ProfileContext,
  type UserProfile,
} from "@/lib/contexts/ProfileContext";

export type { UserProfile };

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return context;
}
