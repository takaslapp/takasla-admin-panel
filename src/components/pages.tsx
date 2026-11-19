import {
  AlertCircle,
  Check,
  Clock,
  Search,
  User as UserIcon,
  Copy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Archive,
  Lightbulb,
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
import type { SuggestionStatus } from "@/lib/data";
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

const sugTone: Record<SuggestionStatus, "ok" | "warn" | "info" | "mute"> = {
  yeni: "info",
  degerlendiriliyor: "warn",
  uygulandi: "ok",
  arsiv: "mute",
};

function formatReportDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split(" ");
    if (parts.length === 2 && parts[0].includes(".")) {
      const [d, m, y] = parts[0].split(".");
      const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
      ];
      const monthIndex = Number(m) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${Number(d)} ${monthNames[monthIndex]} ${y} • ${parts[1]}`;
      }
    }
  } catch {}
  return dateStr.replace(" ", " • ");
}


/* =========================================================================
   4. ÖNERİLER VE TOPLULUK TALEPLERİ SAYFASI (Gerçek DB Kayıtları)
   ========================================================================= */

export function SuggestionsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const suggestions = useAdminStore((s) => s.suggestions);
  const setSuggestionStatus = useAdminStore((s) => s.setSuggestionStatus);

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | SuggestionStatus>("all");
  const [filterType, setFilterType] = useState<"all" | "app_issue" | "feedback" | "suggestion">("all");
  const [expandedTech, setExpandedTech] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} panoya kopyalandı.`);
  };

  const newCount = useMemo(() => suggestions.filter((s) => s.status === "yeni").length, [suggestions]);
  const evaluatingCount = useMemo(() => suggestions.filter((s) => s.status === "degerlendiriliyor").length, [suggestions]);
  const appliedCount = useMemo(() => suggestions.filter((s) => s.status === "uygulandi").length, [suggestions]);
  const archivedCount = useMemo(() => suggestions.filter((s) => s.status === "arsiv").length, [suggestions]);

  const rows = useMemo(() => {
    return suggestions.filter((s) => {
      let matchTab = true;
      if (activeTab !== "all") {
        matchTab = s.status === activeTab;
      }

      let matchType = true;
      if (filterType !== "all") {
        matchType = s.rawType === filterType;
      }

      const matchSearch = `${s.title} ${s.author} ${s.description || ""}`
        .toLowerCase()
        .includes(q.toLowerCase());

      return matchTab && matchType && matchSearch;
    });
  }, [suggestions, activeTab, filterType, q]);

  const handleUpdateStatus = async (id: string, newStatus: SuggestionStatus) => {
    try {
      await setSuggestionStatus(id, newStatus);
      const labels: Record<SuggestionStatus, string> = {
        yeni: "Yeni",
        degerlendiriliyor: "Değerlendiriliyor",
        uygulandi: "Uygulandı",
        arsiv: "Arşivlendi",
      };
      toast.success(`Kayıt "${labels[newStatus]}" olarak güncellendi.`);
    } catch (err: any) {
      toast.error(`Durum güncellenemedi: ${err?.message || "Hata oluştu"}`);
    }
  };

  return (
    <AdminShell compact kicker="Topluluk & Geri Bildirim" title="Öneri ve Talepler">
      <div className="grid gap-5">
        {/* Filtreleme ve Sekmeler */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "all" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              Tümü ({suggestions.length})
            </Button>
            <Button
              variant={activeTab === "yeni" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("yeni")}
              className={newCount > 0 ? "border-amber-400 bg-amber-50/70 text-amber-900 hover:bg-amber-100" : ""}
            >
              Yeni ({newCount})
              {newCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {newCount}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === "degerlendiriliyor" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("degerlendiriliyor")}
            >
              Değerlendiriliyor ({evaluatingCount})
            </Button>
            <Button
              variant={activeTab === "uygulandi" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("uygulandi")}
            >
              Uygulandı ({appliedCount})
            </Button>
            <Button
              variant={activeTab === "arsiv" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("arsiv")}
            >
              Arşiv ({archivedCount})
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-9 rounded-full border border-line bg-card px-3 text-xs font-medium text-ink outline-none"
            >
              <option value="all">Tüm Kategoriler</option>
              <option value="suggestion">Öneri & Fikir</option>
              <option value="feedback">Geri Bildirim</option>
              <option value="app_issue">Uygulama Sorunu</option>
            </select>
          </div>
        </div>

        <Toolbar value={q} onChange={setQ} placeholder="Başlık, kullanıcı veya açıklama ara..." />

        {/* Öneri Listesi */}
        {rows.length === 0 ? (
          <Panel title="Kayıt Bulunamadı" subtitle="Arama kriterlerinize uygun öneri bulunamadı.">
            <div className="py-12 text-center text-muted">
              <Lightbulb className="mx-auto size-10 opacity-30 mb-2" />
              <p className="text-sm">Bu filtreye uygun herhangi bir öneri veya geri bildirim kaydı yok.</p>
            </div>
          </Panel>
        ) : (
          <div className="space-y-4">
            {rows.map((s) => {
              const isTechExpanded = !!expandedTech[s.id];

              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-forest/30 flex flex-col gap-3.5"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-line/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.rawType === "app_issue" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200/60">
                          <AlertCircle className="size-3.5" />
                          Uygulama Sorunu
                        </span>
                      ) : s.rawType === "feedback" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/60">
                          <MessageSquare className="size-3.5" />
                          Geri Bildirim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
                          <Lightbulb className="size-3.5" />
                          Öneri / Gelişim Fikri
                        </span>
                      )}

                      <StatusChip tone={sugTone[s.status]}>
                        {s.status === "yeni"
                          ? "Yeni"
                          : s.status === "degerlendiriliyor"
                            ? "Değerlendiriliyor"
                            : s.status === "uygulandi"
                              ? "Uygulandı"
                              : "Arşiv"}
                      </StatusChip>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="size-3.5 text-muted/70" />
                      <span>{formatReportDate(s.created)}</span>
                    </div>
                  </div>

                  {/* Başlık ve Kullanıcı */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-base font-bold text-ink">{s.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>Öneren:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-ink">
                        <UserIcon className="size-3 text-muted" />
                        {s.author}
                      </span>
                    </div>
                  </div>

                  {/* Açıklama */}
                  <div className="rounded-xl border border-line/70 bg-shell/40 p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                      Açıklama / Detay
                    </span>
                    <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap">
                      {s.description || "Açıklama belirtilmedi."}
                    </p>
                  </div>

                  {/* Teknik Detaylar Accordion */}
                  <div className="border-t border-line/60 pt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedTech((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
                    >
                      {isTechExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      <span>Kayıt Detayları</span>
                    </button>

                    {isTechExpanded && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-shell/50 p-2.5 border border-line/60 text-xs">
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-line/40">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-muted block">Kayıt ID</span>
                            <span className="font-mono text-[11px] text-ink truncate block">{s.id}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(s.id, "Kayıt ID")}
                            className="p-1 hover:bg-shell rounded text-muted hover:text-ink shrink-0"
                            title="Kopyala"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                        {s.authorId && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-line/40">
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold text-muted block">Kullanıcı ID</span>
                              <span className="font-mono text-[11px] text-ink truncate block">{s.authorId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(s.authorId!, "Kullanıcı ID")}
                              className="p-1 hover:bg-shell rounded text-muted hover:text-ink shrink-0"
                              title="Kopyala"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-line/60">
                    {s.status !== "degerlendiriliyor" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(s.id, "degerlendiriliyor")}
                      >
                        İncelendi / Değerlendir
                      </Button>
                    )}
                    {s.status !== "uygulandi" && (
                      <Button
                        variant="dark"
                        size="sm"
                        onClick={() => handleUpdateStatus(s.id, "uygulandi")}
                      >
                        <Check className="size-3.5 mr-1" />
                        Uygulandı
                      </Button>
                    )}
                    {s.status !== "arsiv" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(s.id, "arsiv")}
                      >
                        <Archive className="size-3.5 mr-1" />
                        Arşivle
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

  // Kategori dağılımı (kaldırılan ilanlar hariç, gerçek veri; sahte yedek veri yok)
  const categoryCounts: Record<string, number> = {};
  for (const l of listings) {
    if (l.status === "deleted") continue;
    const cat = l.category || "Diğer";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const categoryChartData = Object.entries(categoryCounts)
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n);

  // Son 6 ayın gerçek kayıt ve ilan sayıları (kayıt/oluşturma tarihine göre)
  const monthlyTrendData = (() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, d };
    });
    const keyOf = (iso?: string) => {
      if (!iso) return null;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}`;
    };
    const userCounts = new Map<string, number>();
    for (const u of users) {
      const k = keyOf(u.createdAt);
      if (k) userCounts.set(k, (userCounts.get(k) || 0) + 1);
    }
    const listingCounts = new Map<string, number>();
    for (const l of listings) {
      const k = keyOf(l.createdAt);
      if (k) listingCounts.set(k, (listingCounts.get(k) || 0) + 1);
    }
    return months.map(({ key, d }, i) => ({
      period: d.toLocaleDateString("tr-TR", { month: "long" }) + (i === months.length - 1 ? " (bu ay)" : ""),
      kayit: userCounts.get(key) || 0,
      ilan: listingCounts.get(key) || 0,
    }));
  })();

  const liveListings = listings.filter((l) => l.status === "approved" || l.status === "yayinda").length;
  const visibleListings = listings.filter((l) => l.status !== "deleted").length;

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
            <p className="text-4xl font-extrabold tabular-nums text-forest mt-1">{visibleListings}</p>
            <p className="text-xs text-muted mt-1">{liveListings} yayında</p>
          </Panel>
          <Panel title="Takas Teklifleri">
            <p className="text-4xl font-extrabold tabular-nums text-forest mt-1">{swapStats.totalOffers}</p>
            <p className="text-xs text-muted mt-1">
              {swapStats.completedOffers} tamamlanan · {swapStats.acceptedOffers} devam eden takas
            </p>
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
            title="Aylık Büyüme (Son 6 Ay)"
            subtitle="Her ay kaydolan yeni üye ve eklenen ilan sayısı"
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
                  <Area type="monotone" dataKey="ilan" name="Eklenen İlan" stroke="#D97706" fill="url(#listingGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-forest">
                <span className="size-2.5 rounded-full bg-forest" /> Yeni Üye Kaydı
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="size-2.5 rounded-full bg-amber-500" /> Eklenen İlan
              </span>
            </div>
          </Panel>

          {/* Kategori Dağılımı */}
          <Panel
            title="Kategori Dağılımı"
            subtitle="Eklenen ilanların kategorilere göre oranı"
            className="lg:col-span-4"
          >
            {categoryChartData.length === 0 ? (
              <p className="flex h-[280px] items-center justify-center text-sm text-muted">Henüz ilan yok.</p>
            ) : (
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
            )}
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
