import { ArrowUpRight, Package, Repeat, ShieldAlert, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAdminStore } from "@/lib/store";
import { AdminShell, Panel, StatusChip } from "./admin-shell";
import { Button } from "./ui/button";

function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  sublabel?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClasses = {
    default: "text-forest border-line",
    good: "text-emerald-700 bg-emerald-50 border-emerald-200",
    warn: "text-amber-700 bg-amber-50 border-amber-200",
    bad: "text-rose-700 bg-rose-50 border-rose-200",
  }[tone];

  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-shell/40 p-4 transition-all hover:bg-shell/70">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl border ${toneClasses}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold tabular-nums tracking-tight text-ink">{value}</p>
        <p className="text-sm font-medium text-ink/80">{label}</p>
        {sublabel ? <p className="mt-0.5 text-xs text-muted">{sublabel}</p> : null}
      </div>
    </div>
  );
}

export function OverviewPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);
  const reports = useAdminStore((s) => s.reports);
  const swapStats = useAdminStore((s) => s.swapStats);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const activeListings = listings.filter((l) => l.status === "yayinda");
  const rejectedListings = listings.filter((l) => l.status === "reddedildi");
  const openReports = reports.filter((r) => r.status === "acik" || r.status === "inceleniyor");

  return (
    <AdminShell
      kicker="Takasla — Yönetim Merkezi"
      title={
        <>
          Parayla değil,
          <br />
          takasla.
        </>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="pill" asChild>
            <Link to="/ilanlar">İlanları İncele</Link>
          </Button>
          <Button variant="dark" asChild>
            <Link to="/kullanicilar">Kullanıcı Yönetimi</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        {/* TAKASLA UYGULAMA ÖZETİ */}
        <Panel
          title="Takasla Uygulama Özeti"
          subtitle="Mobil uygulama canlı istatistikleri ve anlık platform verileri"
          action={
            <Button size="sm" variant="ghost" asChild>
              <Link to="/analitik" className="flex items-center gap-1">
                Detaylı Analitik <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              value={users.length}
              label="Kayıtlı Kullanıcı"
              sublabel="Aktif mobil hesaplar"
              tone="good"
            />
            <StatCard
              icon={Package}
              value={listings.length}
              label="Toplam İlan"
              sublabel={`${activeListings.length} yayında`}
              tone="default"
            />
            <StatCard
              icon={Repeat}
              value={swapStats.totalOffers}
              label="Takas Teklifi"
              sublabel={`${swapStats.acceptedOffers} kabul edildi`}
              tone="default"
            />
            <StatCard
              icon={ShieldAlert}
              value={openReports.length}
              label="Açık Şikayet"
              sublabel="İnceleme bekliyor"
              tone={openReports.length > 0 ? "bad" : "good"}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="rounded-xl bg-shell/30 p-3 ring-1 ring-line">
              <span className="text-xs text-muted">Yayındaki İlanlar</span>
              <p className="mt-1 text-lg font-semibold tabular-nums text-forest">{activeListings.length}</p>
            </div>
            <div className="rounded-xl bg-shell/30 p-3 ring-1 ring-line">
              <span className="text-xs text-muted">Reddedilen İlanlar</span>
              <p className="mt-1 text-lg font-semibold tabular-nums text-rose-600">{rejectedListings.length}</p>
            </div>
            <div className="rounded-xl bg-shell/30 p-3 ring-1 ring-line">
              <span className="text-xs text-muted">Bekleyen Teklifler</span>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-600">{swapStats.pendingOffers}</p>
            </div>
            <div className="rounded-xl bg-shell/30 p-3 ring-1 ring-line">
              <span className="text-xs text-muted">Tamamlanan Takaslar</span>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600">{swapStats.acceptedOffers}</p>
            </div>
          </div>
        </Panel>

        {/* 2 SÜTUN: SON İLANLAR & SON KULLANICILAR */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Son İlanlar */}
          <Panel
            title="Son Eklenen İlanlar"
            subtitle="Mobil uygulamadan eklenen son ürünler"
            action={
              <Button size="sm" variant="ghost" asChild>
                <Link to="/ilanlar" className="flex items-center gap-1">
                  Tümü <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            }
            className="lg:col-span-7"
          >
            {listings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Henüz ilan eklenmedi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted">
                    <tr className="border-b border-line">
                      <th className="pb-3 font-medium">İlan Başlığı</th>
                      <th className="pb-3 font-medium">Sahibi</th>
                      <th className="pb-3 font-medium">Kategori</th>
                      <th className="pb-3 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {listings.slice(0, 5).map((l) => (
                      <tr key={l.id} className="hover:bg-shell/30">
                        <td className="py-3 font-medium text-ink">
                          <p className="line-clamp-1">{l.title}</p>
                          <span className="text-xs font-normal text-muted">{l.city}</span>
                        </td>
                        <td className="py-3 text-muted">{l.ownerName}</td>
                        <td className="py-3 text-muted">{l.category}</td>
                        <td className="py-3">
                          <StatusChip tone={l.status === "yayinda" ? "ok" : "bad"}>
                            {l.status === "yayinda" ? "Yayında" : "Reddedildi"}
                          </StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Son Kayıt Olan Kullanıcılar */}
          <Panel
            title="Son Kayıt Olanlar"
            subtitle="Mobil uygulamaya yeni katılan üyeler"
            action={
              <Button size="sm" variant="ghost" asChild>
                <Link to="/kullanicilar" className="flex items-center gap-1">
                  Tümü <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            }
            className="lg:col-span-5"
          >
            {users.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Kayıtlı üye bulunamadı.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {users.slice(0, 5).map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="size-10 rounded-full object-cover ring-1 ring-line"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=255a47&color=ffffff`;
                        }}
                      />
                      <div>
                        <p className="font-semibold text-ink leading-tight">{u.name}</p>
                        <p className="text-xs text-muted">
                          {u.username} · {u.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex rounded-full bg-shell px-2.5 py-0.5 text-xs font-medium text-ink">
                        {u.listingsCount} ilan
                      </span>
                      <p className="mt-1 text-[11px] text-muted">{u.city}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
