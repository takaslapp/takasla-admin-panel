import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAdminStore } from "@/lib/store";
import { AdminLogin } from "@/components/admin-login";

interface AuthContextType {
  user: User | null;
  role: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Çıkış hatası:", err);
    } finally {
      setAdminUser(null);
      setAdminRole(null);
      setAuthStatus("unauthenticated");
    }
  }, []);

  // Kullanıcının profiles.role değerini doğrula
  const verifyAdminRole = useCallback(async (user: User): Promise<boolean> => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        setAdminUser(null);
        setAdminRole(null);
        setAuthStatus("unauthenticated");
        setInitialError("Bu hesabın yönetici yetkisi bulunmuyor.");
        return false;
      }

      setAdminUser(user);
      setAdminRole(profile.role);
      setAuthStatus("authenticated");
      setInitialError(null);

      // Veritabanı verilerini yükle
      useAdminStore.getState().fetchDashboardData();
      return true;
    } catch (err) {
      console.error("Admin yetki kontrol hatası:", err);
      await supabase.auth.signOut();
      setAdminUser(null);
      setAdminRole(null);
      setAuthStatus("unauthenticated");
      setInitialError("Yetki doğrulaması sırasında bir hata oluştu.");
      return false;
    }
  }, []);

  // Sayfa ilk yüklendiğinde veya yenilendiğinde session kontrolü
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (isMounted) {
            setAuthStatus("unauthenticated");
          }
          return;
        }

        // Mevcut session var, admin rolünü zorunlu olarak doğrula
        await verifyAdminRole(session.user);
      } catch (err) {
        console.error("Oturum başlatma hatası:", err);
        if (isMounted) {
          setAuthStatus("unauthenticated");
        }
      }
    }

    initSession();

    // Supabase auth durum değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session) {
        setAdminUser(null);
        setAdminRole(null);
        setAuthStatus("unauthenticated");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [verifyAdminRole]);

  // Login ekranından başarılı giriş yapıldığında tetiklenir
  const handleLoginSuccess = (user: User, role: string) => {
    setAdminUser(user);
    setAdminRole(role);
    setAuthStatus("authenticated");
    setInitialError(null);
    useAdminStore.getState().fetchDashboardData();
  };

  // 1. Session ve Rol Kontrol Ediliyor (Yükleme Ekranı)
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg p-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-shell ring-1 ring-line/60 shadow-lg animate-pulse">
            <img
              src="/logo-takasla.png"
              alt="Takasla"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2.5 text-accent text-sm font-medium">
            <Loader2 className="size-4 animate-spin text-accent" />
            <span>Yönetici oturumu doğrulanıyor...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Oturum Yok veya Rol Admin Değil (Login Ekranı)
  if (authStatus === "unauthenticated") {
    return (
      <AdminLogin
        initialError={initialError}
        onSuccess={handleLoginSuccess}
      />
    );
  }

  // 3. Doğrulanmış Yönetici Oturumu (Dashboard)
  return (
    <AuthContext.Provider value={{ user: adminUser, role: adminRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
