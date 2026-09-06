import { useEffect, type ReactNode } from "react";
import { useAdminStore } from "@/lib/store";

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Sayfa tarayıcıda yüklendiğinde anında Supabase'den tüm verileri çek
    useAdminStore.getState().fetchDashboardData();
  }, []);

  return <>{children}</>;
}
