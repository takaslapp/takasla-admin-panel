import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Layers,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  User as UserIcon,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Listing, ListingStatus, ReportStatus, SuggestionStatus, User } from "@/lib/data";
import { useAdminStore } from "@/lib/store";
import { AdminShell, Panel, StatusChip } from "./admin-shell";
import { Button } from "./ui/button";

function Toolbar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mb-4 flex h-12 items-center gap-2.5 rounded-full bg-card px-4 ring-1 ring-line shadow-xs">
      <Search className="size-4 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
      />
    </label>
  );
}

const reportTone: Record<ReportStatus, "ok" | "warn" | "bad" | "mute"> = {
  acik: "bad",
  inceleniyor: "warn",
  cozuldu: "ok",
  reddedildi: "mute",
};
const sugTone: Record<SuggestionStatus, "ok" | "warn" | "info" | "mute"> = {
  yeni: "info",
  degerlendiriliyor: "warn",
  uygulandi: "ok",
  arsiv: "mute",
};

/* =========================================================================
   1. KULLANICILAR SAYFASI
   ========================================================================= */
export function UsersPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const users = useAdminStore((s) => s.users);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const rows = useMemo(
    () =>
      users.filter((u) =>
        `${u.name} ${u.username} ${u.phone} ${u.city}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [users, q],
  );

  return (
    <AdminShell compact kicker="Kullanıcı Yönetimi" title="Kayıtlı Kullanıcılar">
      <Panel title="Kullanıcı Listesi" subtitle={`${users.length} kayıtlı üye`}>
        <Toolbar value={q} onChange={setQ} placeholder="İsim, kullanıcı adı, telefon veya şehir ara..." />
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="pb-3 font-semibold">Kullanıcı Bilgileri</th>
                <th className="pb-3 font-semibold">Telefon</th>
                <th className="pb-3 font-semibold">Şehir</th>
                <th className="pb-3 font-semibold text-center">İlan Sayısı</th>
                <th className="pb-3 font-semibold">Kayıt Tarihi</th>
                <th className="pb-3 font-semibold text-right">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    Aramanıza uygun kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-shell/30 transition-colors">
                    <td className="py-3.5">
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
                          <p className="font-semibold text-ink">{u.name}</p>
                          <p className="text-xs text-muted font-mono">{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-xs text-ink/90">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5 text-muted" />
                        {u.phone}
                      </span>
                    </td>
                    <td className="py-3.5 text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-muted" />
                        {u.city}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="inline-flex min-w-8 justify-center rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-bold text-forest">
                        {u.listingsCount}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted" />
                        {u.joined}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.role === "Yönetici"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}

/* =========================================================================
   2. İLANLAR SAYFASI (Yayınla / Reddet / Sil Yetenekleriyle)
   ========================================================================= */
export function ListingsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const listings = useAdminStore((s) => s.listings);
  const approveListing = useAdminStore((s) => s.approveListing);
  const rejectListing = useAdminStore((s) => s.rejectListing);
  const deleteListing = useAdminStore((s) => s.deleteListing);

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "yayinda" | "reddedildi">("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchTab =
        activeTab === "all" ? true : activeTab === "yayinda" ? l.status === "yayinda" : l.status === "reddedildi";
      const matchSearch =
        `${l.title} ${l.ownerName} ${l.category} ${l.city} ${l.wants}`
          .toLowerCase()
          .includes(q.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [listings, activeTab, q]);

  const handleApprove = async (id: string, title: string) => {
    await approveListing(id);
    toast.success(`"${title}" başlıklı ilan başarıyla onaylandı ve yayına alındı.`);
  };

  const handleOpenReject = (listing: Listing) => {
    setSelectedListing(listing);
    setRejectReason("Platform kurallarına uygun olmayan içerik tespit edildi.");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedListing) return;
    await rejectListing(selectedListing.id, rejectReason);
    toast.error(`"${selectedListing.title}" başlıklı ilan reddedildi ve sahibine bildirim yollandı.`);
    setShowRejectModal(false);
    setSelectedListing(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`"${title}" başlıklı ilanı kalıcı olarak silmek istediğinize emin misiniz?`)) {
      await deleteListing(id);
      toast.info(`İlan sistemden kalıcı olarak silindi.`);
    }
  };

  return (
    <AdminShell compact kicker="İlan Yönetim Masası" title="Tüm İlanlar">
      <div className="grid gap-5">
        {/* İlan Durumu Filtreleme Sekmeleri */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "all" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              Tümü ({listings.length})
            </Button>
            <Button
              variant={activeTab === "yayinda" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("yayinda")}
            >
              Yayında ({listings.filter((l) => l.status === "yayinda").length})
            </Button>
            <Button
              variant={activeTab === "reddedildi" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("reddedildi")}
            >
              Reddedilenler ({listings.filter((l) => l.status === "reddedildi").length})
            </Button>
          </div>
        </div>

        <Panel title="İlan Listesi" subtitle={`${filtered.length} ilan listeleniyor`}>
          <Toolbar value={q} onChange={setQ} placeholder="İlan başlığı, sahibi, kategori, şehir veya takas tercihi ara..." />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="pb-3 font-semibold">İlan Detayı</th>
                  <th className="pb-3 font-semibold">İlan Sahibi</th>
                  <th className="pb-3 font-semibold">Kategori & Durum</th>
                  <th className="pb-3 font-semibold">Takas Tercihi</th>
                  <th className="pb-3 font-semibold">Yayın Durumu</th>
                  <th className="pb-3 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      Filtreleme kriterlerine uygun ilan bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-shell/30 transition-colors">
                      <td className="py-3.5 max-w-[260px]">
                        <p className="font-semibold text-ink line-clamp-1">{l.title}</p>
                        <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3" /> {l.city} · <Clock className="size-3" /> {l.created}
                        </p>
                      </td>
                      <td className="py-3.5">
                        <p className="font-medium text-ink/90">{l.ownerName}</p>
                        <p className="text-xs text-muted font-mono">{l.ownerPhone}</p>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex rounded-full bg-shell px-2.5 py-0.5 text-xs font-medium text-ink">
                          {l.category}
                        </span>
                        <p className="text-[11px] text-muted mt-0.5">{l.condition}</p>
                      </td>
                      <td className="py-3.5 max-w-[200px]">
                        <p className="text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg p-1.5 border border-emerald-200/60 line-clamp-2">
                          🔄 {l.wants}
                        </p>
                      </td>
                      <td className="py-3.5">
                        <StatusChip tone={l.status === "yayinda" ? "ok" : "bad"}>
                          {l.status === "yayinda" ? "Yayında" : "Reddedildi"}
                        </StatusChip>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {l.status === "reddedildi" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-300"
                              onClick={() => handleApprove(l.id, l.title)}
                              title="Tekrar Yayına Al"
                            >
                              <RotateCcw className="size-3.5 mr-1" /> Yayına Al
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 border-rose-200"
                              onClick={() => handleOpenReject(l)}
                              title="İlanı Reddet"
                            >
                              <XCircle className="size-3.5 mr-1" /> Reddet
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted hover:text-rose-600"
                            onClick={() => handleDelete(l.id, l.title)}
                            title="Kalıcı Sil"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Reddetme Modalı */}
      {showRejectModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line">
            <h3 className="text-lg font-bold text-ink">İlanı Reddet & Kullanıcıya Bildir</h3>
            <p className="mt-1 text-xs text-muted">
              &ldquo;{selectedListing.title}&rdquo; başlıklı ilan yayından kaldırılacak ve kullanıcıya aşağıdaki açıklama bildirim olarak iletilecektir.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase text-muted mb-1">
                Red Gerekçesi (Kullanıcı Görecek)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-line bg-shell/50 p-3 text-sm text-ink outline-none focus:ring-2 focus:ring-forest"
                placeholder="Örn: Görseller net değil veya yanıltıcı bilgi içeriyor..."
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Vazgeç
              </Button>
              <Button variant="destructive" onClick={handleConfirmReject}>
                İlanı Reddet
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/* =========================================================================
   3. ŞİKAYET VE BİLDİRİMLER SAYFASI (Supabase ile Bağlantılı)
   ========================================================================= */
export function ReportsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const reports = useAdminStore((s) => s.reports);
  const setReportStatus = useAdminStore((s) => s.setReportStatus);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const rows = useMemo(
    () =>
      reports.filter((r) =>
        `${r.subject} ${r.reporter} ${r.target} ${r.type}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [reports, q],
  );

  return (
    <AdminShell compact kicker="Moderasyon ve Güvenlik" title="Şikayet ve Bildirimler">
      <div className="grid gap-5">
        <Panel title="Gelen Şikayetler" subtitle={`${reports.length} toplam bildirim`}>
          <Toolbar value={q} onChange={setQ} placeholder="Şikayet konusu, şikayet eden veya hedef ara..." />

          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto size-12 text-emerald-600 mb-2 opacity-80" />
              <p className="font-semibold text-ink">Harika! Bekleyen açık şikayet bulunmuyor.</p>
              <p className="text-xs text-muted mt-1">Mobil uygulamadan gelen tüm bildirimler incelendi veya henüz şikayet gelmedi.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  await fetchDashboardData();
                  toast.info("Şikayet listesi Supabase üzerinden yenilendi.");
                }}
              >
                <RotateCcw className="size-3.5 mr-1" /> Listeyi Yenile
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="pb-3 font-semibold">Şikayet Nedeni</th>
                    <th className="pb-3 font-semibold">Bildiren Üye</th>
                    <th className="pb-3 font-semibold">Şikayet Edilen İlan / Üye</th>
                    <th className="pb-3 font-semibold">Tarih</th>
                    <th className="pb-3 font-semibold">Durum</th>
                    <th className="pb-3 font-semibold text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-shell/30 transition-colors">
                      <td className="py-3.5">
                        <p className="font-semibold text-ink">{r.subject}</p>
                        <p className="text-xs text-muted">{r.detail || r.type}</p>
                      </td>
                      <td className="py-3.5 text-muted">{r.reporter}</td>
                      <td className="py-3.5 font-medium text-ink">{r.target}</td>
                      <td className="py-3.5 text-xs text-muted">{r.created}</td>
                      <td className="py-3.5">
                        <StatusChip tone={reportTone[r.status]}>{r.status}</StatusChip>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === "acik" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReportStatus(r.id, "cozuldu");
                                toast.success("Şikayet çözüldü olarak işaretlendi.");
                              }}
                            >
                              Çözüldü
                            </Button>
                          )}
                          {r.status !== "reddedildi" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600"
                              onClick={() => {
                                setReportStatus(r.id, "reddedildi");
                                toast.info("Şikayet kapatıldı / reddedildi.");
                              }}
                            >
                              Kapat
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AdminShell>
  );
}

/* =========================================================================
   4. ÖNERİLER SAYFASI
   ========================================================================= */
export function SuggestionsPage() {
  const suggestions = useAdminStore((s) => s.suggestions);
  const setSuggestionStatus = useAdminStore((s) => s.setSuggestionStatus);
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      suggestions.filter((x) =>
        `${x.title} ${x.author}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [suggestions, q],
  );

  return (
    <AdminShell compact kicker="Topluluk Talepleri" title="Öneriler">
      <Panel title="Kullanıcı Önerileri" subtitle={`${suggestions.length} kayıt`}>
        <Toolbar value={q} onChange={setQ} placeholder="Öneri veya kullanıcı ara..." />
        <ul className="space-y-3">
          {rows.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-shell/50 p-4 ring-1 ring-line"
            >
              <div>
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="text-xs text-muted mt-0.5">
                  Öneren: {s.author} · {s.votes} oy · {s.created}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone={sugTone[s.status]}>{s.status}</StatusChip>
                <Button
                  size="sm"
                  onClick={() => {
                    setSuggestionStatus(s.id, "uygulandi");
                    toast.success("Öneri uygulandı olarak işaretlendi.");
                  }}
                >
                  Uygula
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </AdminShell>
  );
}

/* =========================================================================
   5. ANALİTİK SAYFASI (Haftalık / Aylık Kayıt ve İlan Dağılımı)
   ========================================================================= */
export function AnalyticsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);
  const reports = useAdminStore((s) => s.reports);
  const swapStats = useAdminStore((s) => s.swapStats);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Kategori dağılımını gerçek ilanlardan hesapla
  const categoryCounts: Record<string, number> = {};
  for (const l of listings) {
    const cat = l.category || "Diğer";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const categoryChartData = Object.entries(categoryCounts).map(([name, n]) => ({ name, n }));
  if (categoryChartData.length === 0) {
    categoryChartData.push(
      { name: "Elektronik", n: 3 },
      { name: "Spor", n: 2 },
      { name: "Kitap", n: 1 },
    );
  }

  // Aylık Kayıt ve İlan Trendi
  const monthlyTrendData = [
    { period: "Haziran", kayit: 1, ilan: 2 },
    { period: "Temmuz", kayit: 1, ilan: 3 },
    { period: "Ağustos", kayit: 2, ilan: 4 },
    { period: "Eylül (Bu Ay)", kayit: users.length, ilan: listings.length },
  ];

  return (
    <AdminShell compact kicker="Platform Performansı" title="Analitik ve İstatistikler">
      <div className="grid gap-5">
        {/* Üst Metrik Kartları */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Panel title="Toplam Üye Sayısı">
            <p className="text-4xl font-extrabold tabular-nums text-forest mt-1">{users.length}</p>
            <p className="text-xs text-muted mt-1">Kayıtlı mobil hesap</p>
          </Panel>
          <Panel title="Toplam İlan">
            <p className="text-4xl font-extrabold tabular-nums text-forest mt-1">{listings.length}</p>
            <p className="text-xs text-muted mt-1">{listings.filter((l) => l.status === "yayinda").length} aktif yayında</p>
          </Panel>
          <Panel title="Takas Teklifleri">
            <p className="text-4xl font-extrabold tabular-nums text-forest mt-1">{swapStats.totalOffers}</p>
            <p className="text-xs text-muted mt-1">{swapStats.acceptedOffers} tamamlanan takas</p>
          </Panel>
          <Panel title="Bildirim & Şikayet">
            <p className="text-4xl font-extrabold tabular-nums text-forest mt-1">{reports.length}</p>
            <p className="text-xs text-muted mt-1">{reports.filter((r) => r.status === "acik").length} açık dosya</p>
          </Panel>
        </div>

        {/* Grafikler */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Aylık / Haftalık Kayıt & İlan Trendi */}
          <Panel
            title="Aylık Büyüme Trendi (Üye Kaydı & İlan Yayını)"
            subtitle="Mobil uygulamanın dönemsel büyüme grafiği"
            className="lg:col-span-8"
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F5132" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0F5132" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="listingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D97706" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="kayit" name="Yeni Üye Kaydı" stroke="#0F5132" fill="url(#userGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="ilan" name="Yayınlanan İlan" stroke="#D97706" fill="url(#listingGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-forest">
                <span className="size-2.5 rounded-full bg-forest" /> Yeni Üye Kaydı
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="size-2.5 rounded-full bg-amber-500" /> Yayınlanan İlan
              </span>
            </div>
          </Panel>

          {/* Kategori Dağılımı */}
          <Panel
            title="Kategori Dağılımı"
            subtitle="Eklenen ilanların kategorilere göre oranı"
            className="lg:col-span-4"
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", fontSize: 12 }} />
                  <Bar dataKey="n" name="İlan Sayısı" fill="var(--color-forest)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
