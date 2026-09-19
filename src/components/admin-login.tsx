import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AdminLoginProps {
  initialError?: string | null;
  onSuccess: (user: User, role: string) => void;
}

export function AdminLogin({ initialError, onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setError("Lütfen e-posta ve şifrenizi giriniz.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Supabase Auth ile kimlik doğrulama
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (authError || !authData.user) {
        let msg = "Giriş başarısız: E-posta veya şifre hatalı.";
        const rawMsg = authError?.message?.toLowerCase() || "";
        if (
          rawMsg.includes("invalid login credentials") ||
          rawMsg.includes("invalid_credentials")
        ) {
          msg = "E-posta veya şifre hatalı.";
        } else if (rawMsg.includes("email not confirmed")) {
          msg = "E-posta adresi doğrulanmamış.";
        } else if (authError?.message) {
          msg = authError.message;
        }
        setError(msg);
        setIsSubmitting(false);
        return;
      }

      // 2. profiles tablosundan kullanıcının rolünü sorgula
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        setError("Kullanıcı yetkisi doğrulanamadı. Lütfen tekrar deneyiniz.");
        setIsSubmitting(false);
        return;
      }

      // 3. YALNIZCA role === "admin" ise erişim ver
      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        setError("Bu hesabın yönetici yetkisi bulunmuyor.");
        setIsSubmitting(false);
        return;
      }

      // 4. Başarılı - AuthProvider state güncelle
      onSuccess(authData.user, profile.role);
    } catch (err: any) {
      console.error("Giriş hatası:", err);
      setError(err?.message || "Giriş yapılırken bir sorun oluştu.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-bg p-4 sm:p-6 overflow-hidden">
      {/* Arka Plan Görseli ve Koyu Degrade Katmanı */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/takasla-admin-wallpaper.webp"
          alt="Takasla Arka Plan"
          className="h-full w-full object-cover object-center"
        />
        {/* Zarif hafif karartma: Görselin canlılığı ve tüm detayları net şekilde görünür */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Ana Giriş Kartı */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-card p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/20 backdrop-blur-xl">
        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-shell ring-1 ring-line/60 shadow-sm mb-4">
            <img
              src="/logo-takasla.png"
              alt="Takasla"
              className="h-8 w-auto object-contain"
            />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Yönetici Girişi
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted">
            Takasla mobil uygulama yönetim paneline erişmek için oturum açın.
          </p>
        </div>

        {/* Hata Mesajı Kutusu */}
        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-bad-soft border border-bad/20 p-3.5 text-bad animate-in fade-in zoom-in-95">
            <ShieldAlert className="size-5 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              {error}
            </div>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* E-posta Alanı */}
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              E-posta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Mail className="size-4" />
              </div>
              <input
                id="admin-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@takaslapp.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-shell/40 text-sm font-medium text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Şifre Alanı */}
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold uppercase tracking-wider text-forest mb-1.5"
            >
              Şifre
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Lock className="size-4" />
              </div>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-line bg-shell/40 text-sm font-medium text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-ink transition-colors"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Giriş Butonu */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest py-3 px-4 text-sm font-semibold text-accent shadow-md hover:bg-forest/90 active:scale-[0.99] transition-all disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Alt Bilgilendirme Notu */}
        <div className="mt-6 pt-4 border-t border-line/60 text-center">
          <p className="text-[11px] text-muted leading-normal">
            Bu panele yalnızca yetkili yönetici hesapları erişebilir. Tüm işlemler kayıt altına alınmaktadır.
          </p>
        </div>
      </div>
    </div>
  );
}
