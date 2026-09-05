import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Menu,
  Package,
  RotateCw,
  ShieldAlert,
  User as UserIcon,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/lib/store";

const NAV = [
  { to: "/", label: "Genel bakış" },
  { to: "/kullanicilar", label: "Kullanıcılar" },
  { to: "/ilanlar", label: "İlanlar" },
  { to: "/sikayetler", label: "Şikayetler" },
  { to: "/oneriler", label: "Öneriler" },
  { to: "/analitik", label: "Analitik" },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/logo-takasla.png"
        alt="Takasla"
        className="h-7 w-auto sm:h-8"
      />
    </Link>
  );
}

export function AdminShell({
  kicker,
  title,
  actions,
  compact,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reports = useAdminStore((s) => s.reports);
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);

  // Açık şikayetler ve son bildirimler
  const openReports = useMemo(() => reports.filter((r) => r.status === "acik"), [reports]);
  const recentListings = useMemo(() => listings.slice(0, 2), [listings]);
  const recentUsers = useMemo(() => users.slice(0, 2), [users]);
  const unreadCount = openReports.length;

  const handlePageReload = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  return (
    <div className="min-h-dvh bg-bg px-2 py-2 sm:px-3 sm:py-3">
      <div className="mx-auto min-h-[calc(100dvh-1rem)] max-w-[1440px] rounded-[1.75rem] bg-shell sm:rounded-[2rem]">
        {/* Banner Üst Kısım - taşma sadece arka plan görselinde gizlenir, dropdown kesilmez */}
        <div className="relative isolate rounded-b-[1.5rem]">
          <div className="absolute inset-0 overflow-hidden rounded-b-[1.5rem] pointer-events-none">
            <img
              src="/hero.jpg"
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-forest/80 via-forest/45 to-forest/10" />
          </div>

          {/* Üst Navbar */}
          <div className="relative z-20 flex items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
            <Logo />

            <nav className="hidden items-center gap-1 rounded-full bg-card/18 p-1 backdrop-blur-md lg:flex">
              {NAV.map((item) => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150",
                      active
                        ? "bg-accent text-accent-fg"
                        : "text-card/90 hover:bg-card/15",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Sağ Üst Aksiyonlar: Sıralama: [Zil] -> [Yenileme] -> [Menü (mobilde)] -> [EN SAĞDA TAKASLA AVATAR] */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 1. ZİL BUTONU */}
              <button
                type="button"
                aria-label="Bildirimler"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setOpen(false);
                }}
                className={cn(
                  "relative grid size-9 sm:size-11 place-items-center rounded-full bg-card/92 text-forest transition-all hover:bg-card",
                  notifOpen && "ring-2 ring-accent",
                )}
                title="Bildirimler"
              >
                <Bell className="size-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-card animate-pulse">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {/* 2. YENİLEME İKONU (Siteyi Yenile) */}
              <button
                type="button"
                aria-label="Siteyi Yenile"
                onClick={handlePageReload}
                className="grid size-9 sm:size-11 place-items-center rounded-full bg-card/92 text-forest transition-all hover:bg-card hover:rotate-45"
                title="Siteyi Yenile"
              >
                <RotateCw className={cn("size-4", isRefreshing && "animate-spin")} />
              </button>

              {/* 3. MOBİL MENÜ (Sadece küçük ekranda görünür) */}
              <button
                type="button"
                className="grid size-9 sm:size-11 place-items-center rounded-full bg-card/92 text-forest lg:hidden"
                aria-label="Menü"
                onClick={() => {
                  setOpen((v) => !v);
                  setNotifOpen(false);
                }}
              >
                {open ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>

              {/* 4. EN SAĞDA: TAKASLA AVATAR */}
              <img
                src="/images/takasla-icon.jpg"
                alt="Takasla"
                className="size-9 sm:size-11 rounded-full object-cover ring-2 ring-card/90 shadow-sm"
              />
            </div>
          </div>

          {/* SİTE TARZI BİLDİRİM PANELİ (Fixed pozisyon ile kesilme veya taşma olmadan tam açılır) */}
          {notifOpen ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                onClick={() => setNotifOpen(false)}
              />
              <div className="fixed top-16 sm:top-20 right-3 sm:right-6 lg:right-8 z-50 flex max-h-[80vh] w-[calc(100vw-1.5rem)] max-w-sm flex-col rounded-2xl bg-card p-4 shadow-2xl ring-1 ring-line/80 backdrop-blur-xl sm:w-96 animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-line/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-forest/10 text-forest">
                      <Bell className="size-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">Bildirim Merkezi</h3>
                      <p className="text-[11px] text-muted">Takasla sistem ve denetim uyarıları</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        {unreadCount} Açık
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Temiz
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="rounded-full p-1 text-muted hover:bg-shell hover:text-ink"
                      aria-label="Kapat"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Kaydırılabilir Bildirim Listesi */}
                <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-2.5">
                  {/* Açık Şikayetler */}
                  {openReports.length > 0 ? (
                    openReports.map((r) => (
                      <Link
                        key={r.id}
                        to="/sikayetler"
                        onClick={() => setNotifOpen(false)}
                        className="group flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3 transition-colors hover:bg-rose-50/90"
                      >
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
                          <ShieldAlert className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                              Yeni Şikayet
                            </span>
                            <span className="text-[10px] text-muted">{r.created}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-semibold text-ink">
                            {r.subject}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                            {r.reporter} → {r.target}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : null}

                  {/* Son İlanlar */}
                  {recentListings.map((l) => (
                    <Link
                      key={l.id}
                      to="/ilanlar"
                      onClick={() => setNotifOpen(false)}
                      className="group flex items-start gap-3 rounded-xl border border-line/50 bg-shell/40 p-3 transition-colors hover:bg-shell/80"
                    >
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest">
                        <Package className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-forest">
                            Yeni İlan
                          </span>
                          <span className="text-[10px] text-muted">{l.created}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-ink">
                          {l.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          Sahibi: {l.ownerName} · {l.category}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {/* Son Kullanıcılar */}
                  {recentUsers.map((u) => (
                    <Link
                      key={u.id}
                      to="/kullanicilar"
                      onClick={() => setNotifOpen(false)}
                      className="group flex items-start gap-3 rounded-xl border border-line/50 bg-shell/40 p-3 transition-colors hover:bg-shell/80"
                    >
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-fg">
                        <UserIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-muted">
                            Yeni Üye
                          </span>
                          <span className="text-[10px] text-muted">{u.joined}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-ink">
                          {u.name} ({u.username})
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {u.city} · {u.phone}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {openReports.length === 0 && recentListings.length === 0 && recentUsers.length === 0 ? (
                    <div className="py-6 text-center text-muted">
                      <CheckCircle2 className="mx-auto size-7 opacity-40 mb-1.5" />
                      <p className="text-xs">Şu anda bekleyen yeni bildirim bulunmuyor.</p>
                    </div>
                  ) : null}
                </div>

                {/* Alt Aksiyon Butonu */}
                <div className="mt-3.5 shrink-0 border-t border-line/60 pt-2.5">
                  <Link
                    to="/sikayetler"
                    onClick={() => setNotifOpen(false)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest/8 py-2 text-xs font-semibold text-forest transition-colors hover:bg-forest/15"
                  >
                    Tüm Şikayetleri İncele
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </>
          ) : null}

          {/* Mobil Navigasyon Menüsü - Floating Overlay (Hero görselini asla uzatmaz) */}
          {open ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
                onClick={() => setOpen(false)}
              />
              <div className="fixed top-16 inset-x-3 z-50 rounded-2xl bg-card p-3 shadow-2xl ring-1 ring-line/80 backdrop-blur-xl lg:hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-line/60 px-2 pb-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Takasla Menü</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1 text-muted hover:bg-shell hover:text-ink"
                    aria-label="Kapat"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-1">
                  {NAV.map((item) => {
                    const active =
                      item.to === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-accent text-accent-fg shadow-sm"
                            : "text-forest hover:bg-shell/80",
                        )}
                      >
                        <span>{item.label}</span>
                        {active ? (
                          <span className="size-2 rounded-full bg-forest" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {/* Başlık ve Kicker Alanı */}
          <div
            className={cn(
              "relative z-10 flex flex-col justify-end gap-6 px-4 pb-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10",
              compact ? "min-h-[130px] pt-4" : "min-h-[190px] pt-8 sm:min-h-[240px]",
            )}
          >
            <div className="max-w-2xl text-card">
              <p className="text-xs sm:text-sm text-card/85 font-medium">{kicker}</p>
              <h1 className="mt-1.5 font-display text-2xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>

        {/* Ana Sayfa İçeriği */}
        <div className="px-2 pb-6 pt-3 sm:px-5 sm:pb-8 lg:px-6">{children}</div>
      </div>
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
        "rounded-[1.25rem] sm:rounded-[1.5rem] bg-card p-4 sm:p-6 shadow-[0_10px_30px_rgba(20,24,18,0.05)] ring-1 ring-line/50",
        className,
      )}
    >
      <div className="mb-4 sm:mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs sm:text-sm text-muted">{subtitle}</p>
          ) : null}
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
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}
