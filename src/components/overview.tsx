import { CheckCircle2, ChevronRight, Inbox, Lightbulb, PenLine, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useAdminStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AdminShell } from "./admin-shell";
import { ListingStatusBadge, ListingThumb } from "./listing-detail";
import { handle, UserAvatar } from "./user-detail-sheet";

/** İlanlar sayfasını belirli bir sekmeyle açan bağlantı */
function listingsLink(sekme: string) {
  return { to: "/ilanlar" as const, search: { sekme } as never };
}

function Kpi({
  label,
  value,
  hint,
  link,
}: {
  label: string;
  value: number | string;
  hint?: string;
  link: React.ComponentProps<typeof Link>;
}) {
  return (
    <Link
      {...link}
      className="group flex flex-col rounded-2xl border border-line bg-card p-4 transition-colors hover:border-forest/40 hover:bg-shell/40"
    >
      <span className="flex items-center justify-between text-xs font-medium text-muted">
        {label}
        <ChevronRight className="size-4 opacity-50 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</span>
      {hint ? <span className="mt-0.5 text-xs text-muted">{hint}</span> : null}
    </Link>
  );
}

function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-line bg-card", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function OverviewPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);
  const reports = useAdminStore((s) => s.reports);
  const suggestions = useAdminStore((s) => s.suggestions);
  const swapStats = useAdminStore((s) => s.swapStats);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const pendingListings = listings.filter((l) => l.status === "pending");
  const activeListings = listings.filter((l) => l.status === "approved" || l.status === "yayinda");
  const revisionListings = listings.filter((l) => l.status === "revision_requested");
  const openReports = reports.filter((r) => r.status === "acik" || r.status === "inceleniyor");
  const openSuggestions = suggestions.filter((s) => s.status === "yeni" || s.status === "degerlendiriliyor");

  const recentListings = useMemo(
    () => listings.filter((l) => l.status !== "completed" && l.status !== "takaslandi" && l.status !== "deleted").slice(0, 5),
    [listings],
  );

  const attention = [
    {
      key: "pending",
      icon: Inbox,
      label: "Onay bekleyen ilan",
      count: pendingListings.length,
      link: listingsLink("onay-bekleyen"),
      urgent: true,
    },
    {
      key: "reports",
      icon: ShieldAlert,
      label: "Açık şikayet",
      count: openReports.length,
      link: { to: "/sikayetler" as const },
      urgent: true,
    },
    {
      key: "revision",
      icon: PenLine,
      label: "Düzenleme bekleyen ilan",
      count: revisionListings.length,
      link: listingsLink("revizyon"),
      urgent: false,
    },
    {
      key: "suggestions",
      icon: Lightbulb,
      label: "Değerlendirilecek öneri",
      count: openSuggestions.length,
      link: { to: "/oneriler" as const },
      urgent: false,
    },
  ];
  const attentionTotal = attention.reduce((n, a) => n + a.count, 0);

  return (
    <AdminShell kicker="Takasla yönetim paneli" title="Genel bakış" compact>
      <div className="space-y-5">
        {/* BEKLEYEN İŞLER */}
        <SectionCard
          title="Bekleyen işler"
          action={
            attentionTotal > 0 ? (
              <span className="text-xs text-muted">{attentionTotal} iş</span>
            ) : null
          }
        >
          {attentionTotal === 0 ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted">
              <CheckCircle2 className="size-5 text-forest" />
              Bekleyen iş yok. Her şey güncel.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.key}>
                    <Link
                      {...a.link}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-shell/60"
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg",
                          a.count > 0 && a.urgent ? "bg-warn-soft text-warn" : "bg-shell text-muted",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className={cn("flex-1 text-sm", a.count > 0 ? "text-ink" : "text-muted")}>{a.label}</span>
                      <span
                        className={cn(
                          "min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                          a.count > 0 && a.urgent
                            ? "bg-warn text-white"
                            : a.count > 0
                              ? "bg-forest text-card"
                              : "bg-shell text-muted",
                        )}
                      >
                        {a.count}
                      </span>
                      <ChevronRight className="size-4 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* SAYILAR */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Kullanıcı" value={users.length} hint="Kayıtlı hesap" link={{ to: "/kullanicilar" }} />
          <Kpi label="Yayındaki ilan" value={activeListings.length} hint={`${listings.length} ilan toplam`} link={listingsLink("yayinda")} />
          <Kpi
            label="Tamamlanan takas"
            value={swapStats.completedOffers}
            hint="İki tarafın onayıyla"
            link={listingsLink("takaslananlar")}
          />
          <Kpi
            label="Bekleyen teklif"
            value={swapStats.pendingOffers}
            hint={`${swapStats.totalOffers} teklif toplam`}
            link={{ to: "/analitik" }}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* SON İLANLAR */}
          <SectionCard
            title="Son eklenen ilanlar"
            action={
              <Link {...listingsLink("tumu")} className="text-xs font-medium text-forest hover:underline">
                Tümü
              </Link>
            }
          >
            {recentListings.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Henüz ilan yok.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentListings.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ListingThumb listing={l} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{l.title}</p>
                      <p className="truncate text-xs text-muted">
                        {l.ownerName} · {l.city}
                      </p>
                    </div>
                    <ListingStatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* SON KULLANICILAR */}
          <SectionCard
            title="Son kayıt olanlar"
            action={
              <Link to="/kullanicilar" className="text-xs font-medium text-forest hover:underline">
                Tümü
              </Link>
            }
          >
            {users.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Kayıtlı üye yok.</p>
            ) : (
              <ul className="divide-y divide-line">
                {users.slice(0, 5).map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <UserAvatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{u.name}</p>
                      <p className="truncate text-xs text-muted">
                        {handle(u.username)} · {u.city}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{u.listingsCount} ilan</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}
