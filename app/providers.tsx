"use client";

import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ProfileProvider } from "@/lib/contexts/ProfileContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>{children}</ProfileProvider>
    </AuthProvider>
  );
}
