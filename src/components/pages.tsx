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
import { useMemo, useState } from "react";
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
  const users = useAdminStore((s) => s.users);
  const [q, setQ] = useState("");

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
                          src={u.avatar || "/avatars/ayse.jpg"}
                          alt=""
                          className="size-10 rounded-full object-cover ring-1 ring-line"
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
   2. İLANLAR SAYFASI (Onayla, Reddet + Neden Modal, Sil)
   ========================================================================= */
export function ListingsPage() {
  const listings = useAdminStore((s) => s.listings);
  const approveListing = useAdminStore((s) => s.approveListing);
  const rejectListing = useAdminStore((s) => s.rejectListing);
  const deleteListing = useAdminStore((s) => s.deleteListing);

  const [q, setQ] = useState("");
  const [rejectModalListing, setRejectModalListing] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailModalListing, setDetailModalListing] = useState<Listing | null>(null);

  const rows = useMemo(
    () =>
      listings.filter((l) =>
        `${l.title} ${l.ownerName} ${l.category} ${l.city} ${l.wants}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [listings, q],
  );

  const handleConfirmReject = async () => {
    if (!rejectModalListing) return;
    if (!rejectReason.trim()) {
      toast.error("Lütfen kullanıcıya iletilecek bir red nedeni yazın.");
      return;
    }

    await rejectListing(rejectModalListing.id, rejectReason.trim());
    toast.success(`İlan reddedildi ve kullanıcıya bildirim gönderildi.`);
    setRejectModalListing(null);
    setRejectReason("");
  };

  const handleDelete = async (l: Listing) => {
    if (window.confirm(`"${l.title}" ilanını kalıcı olarak silmek istiyor musunuz?`)) {
      await deleteListing(l.id);
      toast.success("İlan başarıyla silindi.");
    }
  };

  return (
    <AdminShell compact kicker="İlan Yönetimi" title="İlanlar ve Denetim">
      <Panel title="Tüm İlanlar" subtitle={`${listings.length} ilan yayında veya denetimde`}>
        <Toolbar value={q} onChange={setQ} placeholder="İlan başlığı, sahibi, kategori veya takas hedefi ara..." />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="pb-3 font-semibold">İlan Bilgileri</th>
                <th className="pb-3 font-semibold">İlan Sahibi</th>
                <th className="pb-3 font-semibold">Kategori / Konum</th>
                <th className="pb-3 font-semibold">Takas Hedefi</th>
                <th className="pb-3 font-semibold">Durum</th>
                <th className="pb-3 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    Aramanıza uygun ilan bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((l) => (
                  <tr key={l.id} className="hover:bg-shell/30 transition-colors">
                    {/* İlan Başlığı & Detayı (UUID YOK) */}
                    <td className="py-3.5 max-w-[240px]">
                      <p className="font-semibold text-ink line-clamp-1">{l.title}</p>
                      <p className="text-xs text-muted line-clamp-1 mt-0.5">{l.condition}</p>
                    </td>

                    {/* İlan Sahibi */}
                    <td className="py-3.5">
                      <p className="font-medium text-ink">{l.ownerName}</p>
                      <p className="text-xs text-muted font-mono">{l.ownerPhone}</p>
                    </td>

                    {/* Kategori & Şehir */}
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-forest">
                        <Tag className="size-3" />
                        {l.category}
                      </span>
                      <p className="text-xs text-muted mt-0.5">{l.city}</p>
                    </td>

                    {/* Takas Hedefi */}
                    <td className="py-3.5 max-w-[180px]">
                      <span className="text-xs font-medium text-ink/85 line-clamp-1">
                        🎯 {l.wants}
                      </span>
                    </td>

                    {/* Durum */}
                    <td className="py-3.5">
                      <StatusChip tone={l.status === "yayinda" ? "ok" : "bad"}>
                        {l.status === "yayinda" ? "Yayında" : "Reddedildi"}
                      </StatusChip>
                    </td>

                    {/* İşlem Butonları */}
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Detay Gör Butonu */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetailModalListing(l)}
                          title="Tüm Bilgileri Gör"
                        >
                          <Eye className="size-3.5" />
                        </Button>

                        {/* Onayla Butonu */}
                        {l.status !== "yayinda" ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={async () => {
                              await approveListing(l.id);
                              toast.success(`"${l.title}" onaylandı ve yayına alındı.`);
                            }}
                          >
                            <CheckCircle className="size-3.5" /> Onayla
                          </Button>
                        ) : null}

                        {/* Reddet Butonu */}
                        {l.status === "yayinda" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              setRejectModalListing(l);
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="size-3.5" /> Reddet
                          </Button>
                        ) : null}

                        {/* Kaldır / Sil Butonu */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(l)}
                          title="İlanı Sil"
                        >
                          <Trash2 className="size-3.5" />
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

      {/* İLAN REDDETME MODALI (Admin nedenini yazar ve kullanıcıya bildirim gider) */}
      {rejectModalListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">İlanı Reddet</h3>
                <p className="text-xs text-muted">
                  "{rejectModalListing.title}" ilanını reddetmek üzeresiniz.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-ink">
                Reddetme Nedeni (Kullanıcının bildirim ekranında görünecektir):
              </label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Örn: Ürün görselleri net değil veya yanıltıcı takas isteği belirtilmiş. Lütfen güncelleyip tekrar gönderin."
                className="mt-2 w-full rounded-xl border border-line bg-shell/40 p-3 text-sm text-ink outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setRejectModalListing(null)}
              >
                Vazgeç
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleConfirmReject}
              >
                Reddet ve Bildirim Gönder
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* İLAN TÜM BİLGİLERİ DETAY MODALI */}
      {detailModalListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-forest">{detailModalListing.category}</span>
                <h3 className="text-xl font-bold text-ink mt-0.5">{detailModalListing.title}</h3>
                <p className="text-xs text-muted">{detailModalListing.city} · {detailModalListing.created}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDetailModalListing(null)}>
                Kapat
              </Button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl bg-shell/40 p-3.5 ring-1 ring-line">
                <span className="text-xs font-medium text-muted">İlan Sahibi</span>
                <p className="font-semibold text-ink">{detailModalListing.ownerName} ({detailModalListing.ownerPhone})</p>
              </div>

              <div className="rounded-xl bg-shell/40 p-3.5 ring-1 ring-line">
                <span className="text-xs font-medium text-muted">Takasta İstenen Ürün / Şartlar</span>
                <p className="font-semibold text-emerald-800">{detailModalListing.wants}</p>
              </div>

              <div className="rounded-xl bg-shell/40 p-3.5 ring-1 ring-line">
                <span className="text-xs font-medium text-muted">Ürün Durumu</span>
                <p className="text-ink">{detailModalListing.condition}</p>
              </div>

              <div className="rounded-xl bg-shell/40 p-3.5 ring-1 ring-line">
                <span className="text-xs font-medium text-muted">İlan Açıklaması</span>
                <p className="mt-1 text-ink whitespace-pre-wrap">{detailModalListing.description}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setDetailModalListing(null)}>Tamam</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

/* =========================================================================
   3. ŞİKAYETLER SAYFASI (Uygulamaya Canlı Bağlı)
   ========================================================================= */
export function ReportsPage() {
  const reports = useAdminStore((s) => s.reports);
  const setReportStatus = useAdminStore((s) => s.setReportStatus);
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const isLoading = useAdminStore((s) => s.isLoading);
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      reports.filter((r) =>
        `${r.subject} ${r.reporter} ${r.target} ${r.detail}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [reports, q],
  );

  return (
    <AdminShell compact kicker="Güvenlik ve Denetim" title="Şikayet ve Bildirimler">
      <div className="grid gap-4">
        <Panel
          title="Gelen Şikayetler"
          subtitle={`${reports.length} toplam bildirim`}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await fetchDashboardData();
                toast.success("Şikayet listesi güncellendi.");
              }}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          }
        >
          <Toolbar value={q} onChange={setQ} placeholder="Şikayet konusu, kullanıcı veya hedef ara..." />
          
          {rows.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <ShieldAlert className="size-10 mx-auto mb-2 opacity-40" />
              <p>Herhangi bir açık şikayet bulunmuyor.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl bg-shell/50 p-4 ring-1 ring-line transition-all hover:bg-shell/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                          {r.type}
                        </span>
                        <p className="font-bold text-ink">{r.subject}</p>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        Bildiren: <strong className="text-ink">{r.reporter}</strong> → Hedef: <strong className="text-ink">{r.target}</strong> · Tarih: {r.created}
                      </p>
                      <p className="mt-2 text-sm text-ink/90 bg-card p-3 rounded-xl ring-1 ring-line">
                        {r.detail}
                      </p>
                    </div>
                    <StatusChip tone={reportTone[r.status]}>{r.status}</StatusChip>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-line/60">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await setReportStatus(r.id, "inceleniyor");
                        toast.success("Şikayet incelemeye alındı.");
                      }}
                    >
                      İncelemeye Al
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={async () => {
                        await setReportStatus(r.id, "cozuldu");
                        toast.success("Şikayet çözüldü olarak işaretlendi.");
                      }}
                    >
                      Çözüldü Olarak Kapat
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={async () => {
                        await setReportStatus(r.id, "reddedildi");
                        toast.success("Şikayet geçersiz sayılarak reddedildi.");
                      }}
                    >
                      Reddet
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);
  const reports = useAdminStore((s) => s.reports);
  const swapStats = useAdminStore((s) => s.swapStats);

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
