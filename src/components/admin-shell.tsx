import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ImageIcon,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Package,
  RotateCw,
  ScrollText,
  ShieldAlert,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

type NavKey = "listings" | "reports" | "suggestions";

interface NavItem {
  to: string;
  label: string;
  short?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: NavKey;
}

const NAV: NavItem[] = [
  { to: "/", label: "Genel bakış", short: "Genel", icon: LayoutDashboard },
  { to: "/ilanlar", label: "İlanlar", icon: Package, badge: "listings" },
  { to: "/sikayetler", label: "Şikayetler", icon: ShieldAlert, badge: "reports" },
  { to: "/kullanicilar", label: "Kullanıcılar", icon: Users },
  { to: "/oneriler", label: "Öneriler", icon: Lightbulb, badge: "suggestions" },
  { to: "/bildirimler", label: "Duyuru & Bildirim", icon: Megaphone },
  { to: "/bannerlar", label: "Bannerlar", icon: ImageIcon },
  { to: "/analitik", label: "Analitik", icon: BarChart3 },
  { to: "/islem-kaydi", label: "İşlem Kaydı", icon: ScrollText },
];

/** Mobil alt çubukta doğrudan görünenler; diğerleri "Daha fazla" içinde */
const MOBILE_PRIMARY = ["/", "/ilanlar", "/sikayetler", "/kullanicilar"];

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function CountBadge({ count, tone = "warn", className }: { count: number; tone?: "warn" | "muted"; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums",
        tone === "warn" ? "bg-warn text-white" : "bg-card/15 text-card",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AdminShell({
  kicker,
  title,
  actions,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  /** Eski sürümden kalan; artık tüm başlıklar aynı boyutta */
  compact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reports = useAdminStore((s) => s.reports);
  const suggestions = useAdminStore((s) => s.suggestions);
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);

  // Açık şikayetler ve açık öneriler
  const openReports = useMemo(() => reports.filter((r) => r.status === "acik"), [reports]);
  const openSuggestions = useMemo(
    () => suggestions.filter((s) => s.status === "yeni" || s.status === "degerlendiriliyor"),
    [suggestions],
  );
  const recentListings = useMemo(() => listings.slice(0, 2), [listings]);
  const recentUsers = useMemo(() => users.slice(0, 2), [users]);

  const counts: Record<NavKey, number> = {
    listings: listings.filter((l) => l.status === "pending").length,
    reports: reports.filter((r) => r.status === "acik" || r.status === "inceleniyor").length,
    suggestions: openSuggestions.length,
  };

  // Okunmuş bildirim kimlikleri (localStorage üzerinden kalıcı)
  const [readReportIds, setReadReportIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("takasla_read_reports");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markReportsAsRead = (ids?: string[]) => {
    setReadReportIds((prev) => {
      const targetIds = ids || openReports.map((r) => r.id);
      const updated = Array.from(new Set([...prev, ...targetIds]));
      try {
        localStorage.setItem("takasla_read_reports", JSON.stringify(updated));
      } catch {
        /* depolama kullanılamıyor */
      }
      return updated;
    });
  };

  // /sikayetler sayfasına gidildiğinde açık şikayetleri okundu say
  useEffect(() => {
    if (pathname === "/sikayetler" && openReports.length > 0) {
      markReportsAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, openReports]);

  const unreadCount = useMemo(
    () => openReports.filter((r) => !readReportIds.includes(r.id)).length,
    [openReports, readReportIds],
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Çıkış hatası:", err);
    }
  };

  const handlePageReload = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const openNotifications = () => {
    setNotifOpen(true);
    setMoreOpen(false);
    if (openReports.length > 0) markReportsAsRead();
  };

  const moreActive = NAV.some((n) => !MOBILE_PRIMARY.includes(n.to) && isActive(pathname, n.to));

  const iconButton =
    "relative grid size-10 place-items-center rounded-xl text-card/80 transition-colors hover:bg-card/10 hover:text-card";

  return (
    <div className="min-h-dvh w-full bg-shell lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* MASAÜSTÜ YAN MENÜ */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-bg text-card lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/" aria-label="Genel bakış">
            <img src="/logo-takasla-clean.png" alt="Takasla" className="h-7 w-auto" />
          </Link>
        </div>
        <nav aria-label="Ana menü" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                  active ? "bg-card/10 font-medium text-card" : "text-card/70 hover:bg-card/5 hover:text-card",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "")} />
                <span className="flex-1 truncate">{item.label}</span>
                <CountBadge count={count} tone={item.badge === "suggestions" ? "muted" : "warn"} />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-card/10 p-3">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-card/70 transition-colors hover:bg-card/5 hover:text-card"
          >
            <LogOut className="size-4" />
            Çıkış yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* ÜST ÇUBUK */}
        <header className="flex h-14 items-center justify-between gap-2 bg-bg px-3 text-card lg:h-16 lg:justify-end lg:bg-transparent lg:px-8 lg:text-ink">
          <Link to="/" aria-label="Genel bakış" className="lg:hidden">
            <img src="/logo-takasla-clean.png" alt="Takasla" className="h-6 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePageReload}
              aria-label="Sayfayı yenile"
              title="Sayfayı yenile"
              className={cn(iconButton, "lg:text-muted lg:hover:bg-ink/5 lg:hover:text-ink")}
            >
              <RotateCw className={cn("size-4", isRefreshing && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={openNotifications}
              aria-label={unreadCount > 0 ? `Bildirimler, ${unreadCount} yeni` : "Bildirimler"}
              title="Bildirimler"
              className={cn(iconButton, "lg:text-muted lg:hover:bg-ink/5 lg:hover:text-ink")}
            >
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-semibold leading-4 text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        {/* SAYFA BAŞLIĞI */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pt-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">{kicker}</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>

        {/* İÇERİK */}
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* MOBİL ALT ÇUBUK */}
      <nav
        aria-label="Ana menü"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px]",
                    active ? "font-semibold text-forest" : "text-muted",
                  )}
                >
                  {active ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-forest" aria-hidden /> : null}
                  <span className="relative">
                    <Icon className="size-5" />
                    {count > 0 ? (
                      <CountBadge count={count} className="absolute -right-3 -top-2 min-w-4 px-1 text-[10px] leading-4" />
                    ) : null}
                  </span>
                  {item.short ?? item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={cn(
                "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]",
                moreActive ? "font-semibold text-forest" : "text-muted",
              )}
            >
              {moreActive ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-forest" aria-hidden /> : null}
              <span className="relative">
                <MoreHorizontal className="size-5" />
                {counts.suggestions > 0 ? (
                  <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-forest" aria-hidden />
                ) : null}
              </span>
              Daha fazla
            </button>
          </li>
        </ul>
      </nav>

      {/* DAHA FAZLA (mobil) */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menü">
        <nav aria-label="Diğer sayfalar" className="space-y-1">
          {NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to)).map((item) => {
            const active = isActive(pathname, item.to);
            const Icon = item.icon;
            const count = item.badge ? counts[item.badge] : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-xl px-3 text-sm",
                  active ? "bg-forest/10 font-semibold text-forest" : "text-ink hover:bg-shell",
                )}
              >
                <Icon className="size-5 text-muted" />
                <span className="flex-1">{item.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-shell px-2 text-xs font-semibold leading-5 text-ink">{count}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setShowLogoutConfirm(true);
            }}
            className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm text-bad hover:bg-bad-soft"
          >
            <LogOut className="size-5" />
            Çıkış yap
          </button>
        </div>
      </Sheet>

      {/* BİLDİRİM MERKEZİ */}
      <Sheet
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Bildirimler"
        description="Yeni şikayetler, ilanlar ve üyeler"
        size="sm"
        footer={
          <Button variant="secondary" size="md" className="w-full" asChild>
            <Link to="/sikayetler" onClick={() => setNotifOpen(false)}>
              Tüm şikayetler
            </Link>
          </Button>
        }
      >
        {openReports.length === 0 && recentListings.length === 0 && recentUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
            <CheckCircle2 className="size-6 text-forest" />
            Yeni bildirim yok.
          </div>
        ) : (
          <div className="space-y-5">
            {openReports.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted">Açık şikayetler</h3>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {openReports.map((r) => (
                    <li key={r.id}>
                      <Link
                        to="/sikayetler"
                        onClick={() => {
                          markReportsAsRead([r.id]);
                          setNotifOpen(false);
                        }}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-shell/60"
                      >
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{r.subject}</span>
                          <span className="block truncate text-xs text-muted">
                            {r.reporter} → {r.target}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{r.created.split(" ")[0]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {recentListings.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted">Son ilanlar</h3>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {recentListings.map((l) => (
                    <li key={l.id}>
                      <Link
                        to="/ilanlar"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-shell/60"
                      >
                        <Package className="mt-0.5 size-4 shrink-0 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{l.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {l.ownerName} · {l.category}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {recentUsers.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-muted">Son üyeler</h3>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {recentUsers.map((u) => (
                    <li key={u.id}>
                      <Link
                        to="/kullanicilar"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-shell/60"
                      >
                        <UserIcon className="mt-0.5 size-4 shrink-0 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{u.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {u.username} · {u.city}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Sheet>

      {/* ÇIKIŞ ONAYI */}
      <Sheet
        variant="center"
        size="sm"
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Çıkış yapılsın mı?"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setShowLogoutConfirm(false)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={() => {
                setShowLogoutConfirm(false);
                handleLogout();
              }}
            >
              Çıkış yap
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Tekrar girmek için yönetici bilgilerinle oturum açman gerekir.</p>
      </Sheet>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-line bg-card p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink sm:text-base">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted sm:text-sm">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "mute" | "info";
  children: React.ReactNode;
}) {
  const map = {
    ok: "bg-accent-soft text-accent-fg",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    mute: "bg-shell text-muted",
    info: "bg-info-soft text-forest",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", map[tone])}>{children}</span>
  );
}
