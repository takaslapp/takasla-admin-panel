import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Smartphone,
  Sparkles,
  Edit3,
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
  Copy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Archive,
  Lightbulb,
  ExternalLink,
  Bell,
  X,
  Filter,
  Send,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import type { CompletedSwapPair, Listing, ListingStatus, Report, ReportStatus, SuggestionStatus, User } from "@/lib/data";
import { useAdminStore } from "@/lib/store";
import { AdminShell, Panel, StatusChip } from "./admin-shell";
import { UserSuspensionSection } from "./user-suspension";
import { activeSuspensionMap, fetchSuspensions, type Suspension } from "@/lib/suspensions";
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

function parseDateString(d?: string): number {
  if (!d) return 0;
  const t = Date.parse(d);
  if (!isNaN(t)) return t;
  const match = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }
  return 0;
}

/* =========================================================================
   1. KULLANICILAR SAYFASI
   ========================================================================= */
export function UsersPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const users = useAdminStore((s) => s.users);
  const listings = useAdminStore((s) => s.listings);
  const isLoading = useAdminStore((s) => s.isLoading);

  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "with_listings" | "no_listings" | "admin" | "suspended">("all");
  const [sortBy, setSortBy] = useState<"newest" | "listings" | "name">("newest");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Askı kayıtları (aktif + geçmiş)
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const reloadSuspensions = () => {
    fetchSuspensions().then(setSuspensions);
  };
  useEffect(reloadSuspensions, []);
  const suspendedMap = useMemo(() => activeSuspensionMap(suspensions), [suspensions]);

  // Metrikler
  const totalUsers = users.length;
  const usersWithListings = useMemo(() => users.filter((u) => (u.listingsCount || 0) > 0), [users]);
  const usersWithoutListings = useMemo(() => users.filter((u) => (u.listingsCount || 0) === 0), [users]);
  const totalListings = useMemo(() => users.reduce((acc, u) => acc + (u.listingsCount || 0), 0), [users]);
  const adminUsers = useMemo(() => users.filter((u) => u.role === "Yönetici"), [users]);

  // Filtreleme ve Sıralama
  const rows = useMemo(() => {
    let result = users;

    if (activeFilter === "with_listings") {
      result = result.filter((u) => (u.listingsCount || 0) > 0);
    } else if (activeFilter === "no_listings") {
      result = result.filter((u) => (u.listingsCount || 0) === 0);
    } else if (activeFilter === "admin") {
      result = result.filter((u) => u.role === "Yönetici");
    } else if (activeFilter === "suspended") {
      result = result.filter((u) => suspendedMap.has(u.id));
    }

    if (q.trim()) {
      const query = q.toLowerCase().replace("@", "").trim();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.username.toLowerCase().replace("@", "").includes(query) ||
          u.city.toLowerCase().includes(query) ||
          (u.phone && u.phone.includes(query)) ||
          u.id.toLowerCase().includes(query),
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        const timeA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : parseDateString(a.joined);
        const timeB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : parseDateString(b.joined);
        return timeB - timeA;
      }
      if (sortBy === "listings") {
        return (b.listingsCount || 0) - (a.listingsCount || 0);
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "tr");
      }
      return 0;
    });
  }, [users, suspendedMap, q, activeFilter, sortBy]);

  const handleCopyId = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`${name} kullanıcısının ID'si panoya kopyalandı!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDirectNotification = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    navigator.clipboard.writeText(user.id);
    toast.success(`${user.name} ID'si kopyalandı! Bildirimler sayfasına yönlendiriliyorsunuz...`);
    setTimeout(() => {
      window.location.href = `/bildirimler`;
    }, 400);
  };

  // Seçili kullanıcının aktif ilanları
  const selectedUserListings = useMemo(() => {
    if (!selectedUser) return [];
    return listings.filter((l) => l.ownerId === selectedUser.id);
  }, [selectedUser, listings]);

  return (
    <AdminShell
      compact
      kicker="Kullanıcı Yönetimi"
      title="Kayıtlı Kullanıcılar"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchDashboardData();
              toast.info("Kullanıcı listesi güncellendi.");
            }}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Üst Kısım: 4 İstatistik / Özet Kartı */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Toplam Üye</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <Users className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{totalUsers}</p>
            <p className="mt-0.5 text-[11px] text-muted">Kayıtlı Profil</p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Aktif İlan Verenler</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <Package className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
              {usersWithListings.length}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-700 font-medium">
              En az 1 ilanı olan üye
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Yayındaki İlanlar</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent-fg">
                <ArrowLeftRight className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{totalListings}</p>
            <p className="mt-0.5 text-[11px] text-muted">Üyelerin toplam ilanı</p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Yöneticiler</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-700">
                <ShieldAlert className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{adminUsers.length}</p>
            <p className="mt-0.5 text-[11px] text-muted">Yetkili Yönetici Hesabı</p>
          </div>
        </div>

        {/* Ana Panel: Arama, Filtreleme ve Kullanıcı Listesi */}
        <Panel
          title="Kullanıcı Listesi"
          subtitle={`${users.length} kayıtlı üye · ${rows.length} görüntüleniyor`}
        >
          {/* Arama ve Filtre Kontrolleri */}
          <div className="space-y-3 mb-5">
            {/* Arama Çubuğu & Sıralama */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="İsim, @kullanıcı adı, telefon, şehir veya UUID ara..."
                  className="w-full rounded-xl border border-line/70 bg-card pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-ink placeholder:text-muted/65 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest shadow-xs"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    title="Temizle"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Sıralama Seçici */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <span className="text-xs font-medium text-muted">Sırala:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-line/70 bg-card px-3 py-2 text-xs font-semibold text-ink focus:border-forest focus:outline-none shadow-xs cursor-pointer"
                >
                  <option value="newest">En Yeni Kayıt</option>
                  <option value="listings">En Çok İlanı Olan</option>
                  <option value="name">İsim (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Hızlı Filtre Butonları */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-line/50 pb-3">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeFilter === "all"
                    ? "bg-forest text-card"
                    : "bg-shell/80 text-forest hover:bg-shell"
                }`}
              >
                Tümü ({totalUsers})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("with_listings")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeFilter === "with_listings"
                    ? "bg-forest text-card"
                    : "bg-shell/80 text-forest hover:bg-shell"
                }`}
              >
                📦 İlanı Olanlar ({usersWithListings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("no_listings")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeFilter === "no_listings"
                    ? "bg-forest text-card"
                    : "bg-shell/80 text-forest hover:bg-shell"
                }`}
              >
                İlansız Üyeler ({usersWithoutListings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("admin")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeFilter === "admin"
                    ? "bg-forest text-card"
                    : "bg-shell/80 text-forest hover:bg-shell"
                }`}
              >
                🛡️ Yöneticiler ({adminUsers.length})
              </button>
              {suspendedMap.size > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("suspended")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    activeFilter === "suspended"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  Askıdakiler ({suspendedMap.size})
                </button>
              )}

              {(q || activeFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setActiveFilter("all");
                  }}
                  className="ml-auto text-xs font-medium text-rose-600 hover:underline"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          </div>

          {/* MOBİL KULLANICI KARTLARI (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {rows.length === 0 ? (
              <div className="py-10 text-center text-muted space-y-1.5">
                <Users className="mx-auto size-8 opacity-30" />
                <p className="text-sm font-semibold text-ink">Aramanıza uygun kullanıcı bulunamadı.</p>
                <p className="text-xs text-muted">Farklı bir isim, @kullanıcı adı veya şehir deneyebilirsiniz.</p>
              </div>
            ) : (
              rows.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="rounded-2xl border border-line/70 bg-card p-3.5 shadow-sm space-y-3 hover:border-forest/40 transition-all cursor-pointer active:scale-[0.99]"
                >
                  {/* Üst Satır: Avatar, İsim ve Rol */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatar || "/images/takasla-icon.jpg"}
                        alt={u.name}
                        className="size-11 shrink-0 rounded-full object-cover ring-1 ring-line/80 bg-shell"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/takasla-icon.jpg";
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-ink text-sm truncate">{u.name}</p>
                          {suspendedMap.has(u.id) && (<span className="shrink-0 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">ASKIDA</span>)}
                        </div>
                        <p className="text-xs text-muted font-mono truncate">
                          {u.username?.startsWith("@") ? u.username : `@${u.username}`}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        u.role === "Yönetici"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100/70 text-emerald-800"
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  {/* UUID Satırı & 1-Tık Kopyalama */}
                  <div className="flex items-center justify-between rounded-xl bg-shell/50 px-2.5 py-1.5 text-[11px] border border-line/40">
                    <span className="font-mono text-muted truncate max-w-[200px]">
                      ID: {u.id}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, u.id, u.name)}
                      className="flex items-center gap-1 font-semibold text-forest hover:underline shrink-0"
                      title="ID Kopyala"
                    >
                      {copiedId === u.id ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-700">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Alt Bilgi Rozetleri */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1 border-t border-line/50">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="size-3 text-forest shrink-0" />
                      <span className="truncate">{u.city || "Belirtilmedi"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate justify-end">
                      <Package className="size-3 text-forest shrink-0" />
                      <span className="font-bold text-forest">
                        {u.listingsCount || 0} İlan
                      </span>
                    </div>

                    {u.phone ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="size-3 text-muted shrink-0" />
                        <span className="truncate font-mono">{u.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted/60">
                        <Phone className="size-3 shrink-0" />
                        <span>Telefon yok</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] justify-end">
                      <Calendar className="size-3 text-muted shrink-0" />
                      <span>{u.joined || "Yeni"}</span>
                    </div>
                  </div>

                  {/* Mobil Hızlı Aksiyonlar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-line/50">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-forest/10 py-1.5 text-xs font-bold text-forest hover:bg-forest/20 transition-colors"
                    >
                      <Eye className="size-3.5" />
                      <span>Detay & İlanlar</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDirectNotification(e, u)}
                      className="flex items-center justify-center gap-1 rounded-xl border border-line bg-card px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-shell transition-colors"
                      title="Bildirim Gönder"
                    >
                      <Bell className="size-3.5 text-forest" />
                      <span>Bildirim</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* MASAÜSTÜ KULLANICI TABLOSU (hidden md:block) */}
          <div className="hidden md:block w-full max-w-full overflow-x-auto min-w-0">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="pb-3 font-semibold">Kullanıcı Bilgileri & ID</th>
                  <th className="pb-3 font-semibold">İletişim & Konum</th>
                  <th className="pb-3 font-semibold text-center">İlan Sayısı</th>
                  <th className="pb-3 font-semibold">Kayıt Tarihi</th>
                  <th className="pb-3 font-semibold text-center">Rol</th>
                  <th className="pb-3 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted">
                      <Users className="mx-auto size-8 opacity-30 mb-2" />
                      <p className="font-semibold text-ink">Aramanıza uygun kullanıcı bulunamadı.</p>
                      <p className="text-xs text-muted">Farklı bir arama terimi veya filtre deneyebilirsiniz.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-forest/5 cursor-pointer transition-colors group"
                    >
                      {/* Kullanıcı Bilgisi */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || "/images/takasla-icon.jpg"}
                            alt={u.name}
                            className="size-10 rounded-full object-cover ring-1 ring-line/80 shrink-0 bg-shell"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/takasla-icon.jpg";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-bold text-ink group-hover:text-forest transition-colors truncate">
                                {u.name}
                              </p>
                              {suspendedMap.has(u.id) && (<span className="shrink-0 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">ASKIDA</span>)}
                            </div>
                            <p className="text-xs text-muted font-mono truncate">
                              {u.username?.startsWith("@") ? u.username : `@${u.username}`}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-muted truncate max-w-[130px]">
                                ID: {u.id}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyId(e, u.id, u.name)}
                                className="text-muted hover:text-forest"
                                title="ID Kopyala"
                              >
                                {copiedId === u.id ? (
                                  <Check className="size-3 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* İletişim & Konum */}
                      <td className="py-3.5 text-muted">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-ink font-medium">
                            <MapPin className="size-3.5 text-forest" />
                            <span>{u.city || "Şehir Yok"}</span>
                          </div>
                          {u.phone ? (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted">
                              <Phone className="size-3 text-muted" />
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted/60">—</span>
                          )}
                        </div>
                      </td>

                      {/* İlan Sayısı */}
                      <td className="py-3.5 text-center">
                        <span className="inline-flex min-w-8 justify-center rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-bold text-forest">
                          {u.listingsCount || 0}
                        </span>
                      </td>

                      {/* Kayıt Tarihi */}
                      <td className="py-3.5 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-muted" />
                          {u.joined || "Bilinmiyor"}
                        </span>
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            u.role === "Yönetici"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-emerald-100/70 text-emerald-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Hızlı İşlemler */}
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="rounded-lg p-1.5 text-muted hover:bg-forest/10 hover:text-forest transition-colors"
                            title="Kullanıcı Detayları & İlanları"
                          >
                            <Eye className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopyId(e, u.id, u.name)}
                            className="rounded-lg p-1.5 text-muted hover:bg-forest/10 hover:text-forest transition-colors"
                            title="Kullanıcı ID Kopyala"
                          >
                            <Copy className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDirectNotification(e, u)}
                            className="rounded-lg p-1.5 text-muted hover:bg-forest/10 hover:text-forest transition-colors"
                            title="Bu Kullanıcıya Bildirim Gönder"
                          >
                            <Bell className="size-4" />
                          </button>
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

      {/* KULLANICI DETAY & İLANLAR MODALI */}
      {selectedUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedUser(null)}
          />

          <div className="relative z-10 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl bg-card p-4 sm:p-6 shadow-2xl ring-1 ring-line/80 animate-in fade-in zoom-in-95 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.avatar || "/images/takasla-icon.jpg"}
                  alt={selectedUser.name}
                  className="size-14 rounded-full object-cover ring-2 ring-forest/20 shadow-sm bg-shell"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/takasla-icon.jpg";
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-ink">{selectedUser.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selectedUser.role === "Yönetici"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100/70 text-emerald-800"
                      }`}
                    >
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted font-mono">
                    {selectedUser.username?.startsWith("@") ? selectedUser.username : `@${selectedUser.username}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-1.5 text-muted hover:bg-shell hover:text-ink transition-colors"
                title="Kapat"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Profil Bilgileri Özeti */}
            <div className="rounded-xl border border-line/60 bg-shell/40 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-line/40 pb-2">
                <span className="font-semibold text-muted">Kullanıcı ID (UUID):</span>
                <div className="flex items-center gap-1.5 font-mono text-ink">
                  <span className="truncate max-w-[180px] sm:max-w-[240px] select-all">
                    {selectedUser.id}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyId(e, selectedUser.id, selectedUser.name)}
                    className="p-1 rounded text-forest hover:bg-forest/10"
                    title="ID Kopyala"
                  >
                    {copiedId === selectedUser.id ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-muted">
                <div>
                  <span className="font-semibold text-ink/70">Şehir:</span>{" "}
                  <span className="text-ink font-medium">{selectedUser.city || "Belirtilmedi"}</span>
                </div>
                <div>
                  <span className="font-semibold text-ink/70">Kayıt:</span>{" "}
                  <span className="text-ink font-medium">{selectedUser.joined || "Bilinmiyor"}</span>
                </div>
                <div>
                  <span className="font-semibold text-ink/70">Telefon:</span>{" "}
                  <span className="text-ink font-mono font-medium">{selectedUser.phone || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-ink/70">Toplam İlan:</span>{" "}
                  <span className="text-forest font-bold">{selectedUser.listingsCount || 0} Adet</span>
                </div>
              </div>
            </div>

            {/* Kullanıcının İlanları */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Kullanıcının İlanları ({selectedUserListings.length})
                </h4>
                {selectedUserListings.length > 0 && (
                  <span className="text-[11px] text-forest font-medium">
                    {selectedUserListings.filter((l) => l.status === "approved" || l.status === "yayinda").length} Yayında
                  </span>
                )}
              </div>

              {selectedUserListings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line/80 p-5 text-center text-xs text-muted">
                  Bu kullanıcının sistemde kayıtlı ilanı bulunmamaktadır.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {selectedUserListings.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-line/60 bg-card p-2.5 hover:bg-shell/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={l.images?.[0] || "/images/takasla-icon.jpg"}
                          alt={l.title}
                          className="size-10 rounded-lg object-cover ring-1 ring-line/60 shrink-0 bg-shell"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/takasla-icon.jpg";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-ink truncate">{l.title}</p>
                          <p className="text-[10px] text-muted truncate">
                            {l.category} · {l.city}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          l.status === "approved" || l.status === "yayinda"
                            ? "bg-emerald-100 text-emerald-800"
                            : l.status === "pending" || l.status === "incelemede"
                            ? "bg-amber-100 text-amber-800"
                            : l.status === "completed" || l.status === "takaslandi"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {l.status === "approved" || l.status === "yayinda"
                          ? "Yayında"
                          : l.status === "pending" || l.status === "incelemede"
                          ? "Onay Bekliyor"
                          : l.status === "completed" || l.status === "takaslandi"
                          ? "Tamamlandı"
                          : "Reddedildi / Pasif"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Askıya alma */}
            <UserSuspensionSection
              userId={selectedUser.id}
              userName={selectedUser.name}
              isAdminUser={selectedUser.role === "Yönetici"}
              history={suspensions.filter((x) => x.user_id === selectedUser.id)}
              onChanged={() => {
                reloadSuspensions();
                fetchDashboardData();
              }}
            />

            {/* Modal Aksiyon Butonları */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-line/60">
              <button
                type="button"
                onClick={(e) => handleDirectNotification(e, selectedUser)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-card hover:bg-forest/90 transition-colors cursor-pointer shadow-xs"
              >
                <Bell className="size-3.5" />
                <span>Bu Kullanıcıya Bildirim Gönder</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-line bg-shell/50 px-4 py-2 text-xs font-semibold text-ink hover:bg-shell transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/* =========================================================================
   2. İLANLAR SAYFASI (Çok Aşamalı Onay, Revizyon & Moderasyon)
   ========================================================================= */
export function ListingsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const listings = useAdminStore((s) => s.listings);
  const approveListing = useAdminStore((s) => s.approveListing);
  const requestRevision = useAdminStore((s) => s.requestRevision);
  const rejectListing = useAdminStore((s) => s.rejectListing);
  const deleteListing = useAdminStore((s) => s.deleteListing);
  const deleteMultipleListings = useAdminStore((s) => s.deleteMultipleListings);
  const completedSwapPairs = useAdminStore((s) => s.completedSwapPairs);

  const [q, setQ] = useState("");
  // Genel bakıştan "?sekme=takaslananlar" ile gelinirse ilgili sekme açılır
  const initialTab = (() => {
    if (typeof window === "undefined") return "all" as const;
    const sekme = new URLSearchParams(window.location.search).get("sekme");
    if (sekme === "takaslananlar") return "completed" as const;
    if (sekme === "devam-eden") return "ongoing" as const;
    if (sekme === "onay-bekleyen") return "pending" as const;
    return "all" as const;
  })();
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "approved" | "completed" | "ongoing" | "revision_requested" | "rejected"
  >(initialTab);

  // Toplu Seçim Durumu
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modallar
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const [revisionListing, setRevisionListing] = useState<Listing | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  const [rejectListingItem, setRejectListingItem] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // İlan sahibine bildirimde gösterilen kaldırma nedeni (tekil ve toplu kaldırmada ortak)
  const [removeReason, setRemoveReason] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Sayılar (tamamlanan ve silinenler normal tekil listeden hariç tutulur)
  const uncompletedListings = useMemo(
    () =>
      listings.filter(
        (l) =>
          l.status !== "completed" &&
          l.status !== "takaslandi" &&
          l.status !== "deleted"
      ),
    [listings]
  );
  const pendingCount = useMemo(() => listings.filter((l) => l.status === "pending").length, [listings]);
  const approvedCount = useMemo(() => listings.filter((l) => l.status === "approved" || l.status === "yayinda").length, [listings]);
  // Tamamlanan takaslar ile kabul edilmiş ama henüz bitmemiş (devam eden) takaslar ayrı tutulur
  const finishedPairs = useMemo(() => completedSwapPairs.filter((p) => p.status === "completed"), [completedSwapPairs]);
  const ongoingPairs = useMemo(() => completedSwapPairs.filter((p) => p.status !== "completed"), [completedSwapPairs]);
  const completedCount = finishedPairs.length;
  const ongoingCount = ongoingPairs.length;
  const revisionCount = useMemo(() => listings.filter((l) => l.status === "revision_requested").length, [listings]);
  const rejectedCount = useMemo(() => listings.filter((l) => l.status === "rejected").length, [listings]);
  const totalDisplayCount = uncompletedListings.length + finishedPairs.length;

  // Takaslananları birleşik gruplayan gösterim listesi (Display Items)
  type DisplayItem =
    | { kind: "single"; listing: Listing }
    | { kind: "pair"; pair: CompletedSwapPair };

  const displayItems = useMemo<DisplayItem[]>(() => {
    const lowerQ = q.trim().toLowerCase();

    const matchSingleSearch = (l: Listing) => {
      if (!lowerQ) return true;
      return `${l.title} ${l.ownerName} ${l.ownerPhone} ${l.category} ${l.city} ${l.wants} ${l.description}`
        .toLowerCase()
        .includes(lowerQ);
    };

    const matchPairSearch = (p: CompletedSwapPair) => {
      if (!lowerQ) return true;
      const str = `${p.itemA.title} ${p.itemA.ownerName} ${p.itemA.ownerPhone} ${p.itemA.city} ${p.itemA.category} ${p.itemB.title} ${p.itemB.ownerName} ${p.itemB.ownerPhone} ${p.itemB.city} ${p.itemB.category}`.toLowerCase();
      return str.includes(lowerQ);
    };

    if (activeTab === "pending") {
      return listings
        .filter((l) => l.status === "pending" && matchSingleSearch(l))
        .map((listing) => ({ kind: "single" as const, listing }));
    }

    if (activeTab === "approved") {
      return listings
        .filter((l) => (l.status === "approved" || l.status === "yayinda") && matchSingleSearch(l))
        .map((listing) => ({ kind: "single" as const, listing }));
    }

    if (activeTab === "revision_requested") {
      return listings
        .filter((l) => l.status === "revision_requested" && matchSingleSearch(l))
        .map((listing) => ({ kind: "single" as const, listing }));
    }

    if (activeTab === "rejected") {
      return listings
        .filter((l) => l.status === "rejected" && matchSingleSearch(l))
        .map((listing) => ({ kind: "single" as const, listing }));
    }

    if (activeTab === "completed") {
      return finishedPairs
        .filter(matchPairSearch)
        .map((pair) => ({ kind: "pair" as const, pair }));
    }

    if (activeTab === "ongoing") {
      return ongoingPairs
        .filter(matchPairSearch)
        .map((pair) => ({ kind: "pair" as const, pair }));
    }

    // activeTab === "all" (TÜMÜ):
    // Takaslanmamışlar tekil, takaslananlar BİRLEŞİK ÇİFTLER olarak listelenir!
    const singles: DisplayItem[] = uncompletedListings
      .filter(matchSingleSearch)
      .map((listing) => ({ kind: "single" as const, listing }));

    // Devam eden takastaki ilanlar zaten tekil ilan olarak listede; burada yalnızca tamamlananlar eşleşir
    const pairs: DisplayItem[] = finishedPairs
      .filter(matchPairSearch)
      .map((pair) => ({ kind: "pair" as const, pair }));

    return [...singles, ...pairs];
  }, [listings, finishedPairs, ongoingPairs, uncompletedListings, activeTab, q]);

  // Toplu Seçim Hesaplamaları (Sadece tekil aktif ilanlar seçilebilir)
  const selectableFiltered = useMemo(
    () =>
      displayItems
        .filter((item): item is { kind: "single"; listing: Listing } => item.kind === "single")
        .map((item) => item.listing),
    [displayItems]
  );
  const isAllFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every((l) => selectedIds.includes(l.id));
  const isSomeFilteredSelected = selectableFiltered.some((l) => selectedIds.includes(l.id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const selectableIdSet = new Set(selectableFiltered.map((l) => l.id));
      setSelectedIds((prev) => prev.filter((id) => !selectableIdSet.has(id)));
    } else {
      const selectableIds = selectableFiltered.map((l) => l.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const selectedListings = useMemo(() => {
    const idSet = new Set(selectedIds);
    return listings.filter((l) => idSet.has(l.id));
  }, [listings, selectedIds]);

  // Onaylama İşlemi
  const handleApprove = async (id: string, title: string) => {
    try {
      await approveListing(id);
      toast.success(`"${title}" başlıklı ilan başarıyla onaylandı ve vitrinde yayına alındı.`);
      if (previewListing?.id === id) {
        setPreviewListing((prev) => (prev ? { ...prev, status: "approved" } : null));
      }
    } catch (err: any) {
      toast.error(`Onaylama hatası: ${err?.message || "İşlem tamamlanamadı"}`);
    }
  };

  // Düzenleme İsteği Açma
  const handleOpenRevision = (listing: Listing) => {
    setRevisionListing(listing);
    setRevisionNote(listing.adminNote || "");
  };

  // Düzenleme İsteğini Gönderme
  const handleConfirmRevision = async () => {
    if (!revisionListing) return;
    if (!revisionNote.trim()) {
      toast.error("Lütfen kullanıcıya iletilecek düzenleme notunu yazın.");
      return;
    }
    try {
      await requestRevision(revisionListing.id, revisionNote.trim());
      toast.success(`"${revisionListing.title}" için revizyon talebi kullanıcıya bildirim olarak gönderildi.`);
      setRevisionListing(null);
      setRevisionNote("");
      if (previewListing?.id === revisionListing.id) {
        setPreviewListing((prev) => (prev ? { ...prev, status: "revision_requested", adminNote: revisionNote.trim() } : null));
      }
    } catch (err: any) {
      toast.error(`Düzenleme talebi gönderilemedi: ${err?.message || "İşlem başarısız"}`);
    }
  };

  // Reddetme Açma
  const handleOpenReject = (listing: Listing) => {
    setRejectListingItem(listing);
    setRejectReason("Platform kurallarına uygun olmayan veya eksik içerik tespit edildi.");
  };

  // Reddetme Onaylama
  const handleConfirmReject = async () => {
    if (!rejectListingItem) return;
    if (!rejectReason.trim()) {
      toast.error("Lütfen red gerekçesini belirtin.");
      return;
    }
    try {
      await rejectListing(rejectListingItem.id, rejectReason.trim());
      toast.success(`"${rejectListingItem.title}" başlıklı ilan reddedildi ve kullanıcıya bildirildi.`);
      setRejectListingItem(null);
      setRejectReason("");
      if (previewListing?.id === rejectListingItem.id) {
        setPreviewListing((prev) => (prev ? { ...prev, status: "rejected" } : null));
      }
    } catch (err: any) {
      toast.error(`Reddetme işlemi başarısız: ${err?.message || "İşlem tamamlanamadı"}`);
    }
  };

  // Tekil Silme İşlemi Başlat
  const handleOpenDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  // Tekil Silme Onaylama
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteListing(deleteTarget.id, removeReason);
      toast.success(`"${deleteTarget.title}" başlıklı ilan yayından kaldırıldı.`);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      if (previewListing?.id === deleteTarget.id) {
        setPreviewListing(null);
      }
      setDeleteTarget(null);
      setRemoveReason("");
    } catch (err: any) {
      toast.error(`Silme işlemi başarısız: ${err?.message || "İşlem tamamlanamadı"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toplu Silme Onaylama
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    const count = selectedIds.length;
    try {
      await deleteMultipleListings(selectedIds, removeReason);
      toast.success(`Seçilen ${count} ilan yayından kaldırıldı.`);
      if (previewListing && selectedIds.includes(previewListing.id)) {
        setPreviewListing(null);
      }
      setSelectedIds([]);
      setBulkDeleteModalOpen(false);
      setRemoveReason("");
    } catch (err: any) {
      toast.error(err?.message || "Toplu kaldırma tamamlanamadı.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <AdminShell compact kicker="İlan Moderasyon Merkezi" title="Tüm İlanlar">
      <div className="grid gap-5">
        {/* İlan Durumu Filtreleme Sekmeleri (Mobilde yatay kaydırılabilir, masaüstünde akıcı) */}
        <div className="w-full min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-forest text-white shadow-xs"
                  : "bg-card text-ink/80 hover:bg-shell border border-line"
              }`}
            >
              <span>Tümü</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "all" ? "bg-white/20 text-white" : "bg-shell text-muted"}`}>
                {totalDisplayCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "pending"
                  ? "bg-forest text-white shadow-xs"
                  : pendingCount > 0
                    ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                    : "bg-card text-ink/80 hover:bg-shell border border-line"
              }`}
            >
              <span>Onay Bekleyenler</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "pending" ? "bg-white/20 text-white" : pendingCount > 0 ? "bg-amber-600 text-white" : "bg-shell text-muted"}`}>
                {pendingCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("approved")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "approved"
                  ? "bg-forest text-white shadow-xs"
                  : "bg-card text-ink/80 hover:bg-shell border border-line"
              }`}
            >
              <span>Yayındakiler</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "approved" ? "bg-white/20 text-white" : "bg-shell text-muted"}`}>
                {approvedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "completed"
                  ? "bg-forest text-white shadow-xs"
                  : "bg-card text-ink/80 hover:bg-shell border border-line"
              }`}
            >
              <span>Takaslananlar</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "completed" ? "bg-white/20 text-white" : "bg-shell text-muted"}`}>
                {completedCount}
              </span>
            </button>
            {ongoingCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("ongoing")}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "ongoing"
                    ? "bg-forest text-white shadow-xs"
                    : "bg-card text-ink/80 hover:bg-shell border border-line"
                }`}
              >
                <span>Devam Eden Takaslar</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "ongoing" ? "bg-white/20 text-white" : "bg-shell text-muted"}`}>
                  {ongoingCount}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("revision_requested")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "revision_requested"
                  ? "bg-forest text-white shadow-xs"
                  : "bg-card text-ink/80 hover:bg-shell border border-line"
              }`}
            >
              <span>Düzenleme İstenenler</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "revision_requested" ? "bg-white/20 text-white" : "bg-shell text-muted"}`}>
                {revisionCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rejected")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "rejected"
                  ? "bg-forest text-white shadow-xs"
                  : "bg-card text-ink/80 hover:bg-shell border border-line"
              }`}
            >
              <span>Reddedilenler</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "rejected" ? "bg-white/20 text-white" : "bg-shell text-muted"}`}>
                {rejectedCount}
              </span>
            </button>
          </div>
        </div>

        {/* TOPLU İŞLEM ÇUBUĞU (Seçim Varsa Görünür) */}
        {selectedIds.length > 0 && (
          <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/80 bg-rose-50/95 p-3.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-600 text-white font-black text-sm shadow-sm">
                {selectedIds.length}
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-950">
                  {selectedIds.length} İlan Seçildi
                </h4>
                <p className="text-xs text-rose-800/80">
                  Toplu silme işlemi için seçilen ilanları kalıcı olarak kaldırabilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-rose-100/50 text-rose-900 border-rose-300 text-xs font-semibold"
                onClick={handleToggleSelectAll}
              >
                {isAllFilteredSelected ? "Filtrelenenlerin Seçimini Kaldır" : `Filtrelenen Tümünü Seç (${selectableFiltered.length})`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-800 hover:text-rose-950 hover:bg-rose-100/60 text-xs font-semibold"
                onClick={handleClearSelection}
              >
                Seçimi Temizle
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                onClick={() => setBulkDeleteModalOpen(true)}
              >
                <Trash2 className="size-3.5" />
                <span>Seçilenleri Sil ({selectedIds.length})</span>
              </Button>
            </div>
          </div>
        )}

        <Panel
          title={activeTab === "completed" ? "Tamamlanan Takaslar" : activeTab === "ongoing" ? "Devam Eden Takaslar" : "İlan Listesi"}
          subtitle={`${displayItems.length} ${activeTab === "completed" ? "tamamlanan takas" : activeTab === "ongoing" ? "devam eden takas" : "kayıt"} listeleniyor${selectedIds.length > 0 ? ` · ${selectedIds.length} seçildi` : ""}`}
          action={
            <div className="flex items-center gap-2">
              {selectableFiltered.length > 0 && (
                <Button
                  size="sm"
                  variant={isAllFilteredSelected ? "dark" : "outline"}
                  className="text-xs"
                  onClick={handleToggleSelectAll}
                >
                  {isAllFilteredSelected ? "✓ Tüm Seçimi Kaldır" : "Tümünü Seç"}
                </Button>
              )}
            </div>
          }
        >
          <Toolbar
            value={q}
            onChange={setQ}
            placeholder={
              activeTab === "completed" || activeTab === "ongoing"
                ? "Takaslanan ürün, sahip adı, şehir veya kategori ara..."
                : "İlan başlığı, sahibi, kategori, şehir veya takas tercihi ara..."
            }
          />

          {/* 1. MOBİL LİSTE (Ekran < lg) */}
          <div className="space-y-3.5 lg:hidden">
            {displayItems.length === 0 ? (
              <p className="py-8 text-center text-muted text-sm">Bu filtreleme kriterine uygun kayıt bulunamadı.</p>
            ) : (
              displayItems.map((item) => {
                if (item.kind === "pair") {
                  const { pair } = item;
                  const photoA = pair.itemA.images?.[0];
                  const photoB = pair.itemB.images?.[0];
                  const isAccepted = pair.status === "accepted";

                  return (
                    <div
                      key={pair.id}
                      className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
                        isAccepted
                          ? "border-amber-300/80 bg-gradient-to-b from-amber-50/50 to-white"
                          : "border-emerald-300/80 bg-gradient-to-b from-emerald-50/50 to-white"
                      }`}
                    >
                      <div className={`flex items-center justify-between border-b pb-2.5 ${isAccepted ? "border-amber-100" : "border-emerald-100"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`flex size-7 items-center justify-center rounded-lg text-white shadow-xs ${isAccepted ? "bg-amber-500" : "bg-emerald-600"}`}>
                            <ArrowLeftRight className="size-3.5" />
                          </span>
                          <div>
                            <h4 className={`font-bold text-xs ${isAccepted ? "text-amber-950" : "text-emerald-950"}`}>
                              {isAccepted ? "Devam Eden Takas (Kabul Edildi)" : "Birleşik Takas İşlemi"}
                            </h4>
                            <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                              <Clock className="size-2.5" /> {isAccepted ? "Kabul: " : ""}{pair.date}
                            </p>
                          </div>
                        </div>
                        {isAccepted ? (
                          <StatusChip tone="warn">Takas Devam Ediyor</StatusChip>
                        ) : (
                          <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
                        )}
                      </div>

                      <div className="space-y-2">
                        {/* 1. Ürün */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-line/70">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              onClick={() => {
                                setPreviewListing(pair.itemA);
                                setSelectedPhotoIndex(0);
                              }}
                              className="size-12 shrink-0 rounded-lg overflow-hidden border border-line bg-shell/50 cursor-pointer"
                            >
                              {photoA ? (
                                <img src={photoA} alt={pair.itemA.title} className="size-full object-cover" />
                              ) : (
                                <div className="grid size-full place-items-center text-muted"><Package className="size-4 opacity-40" /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className={`inline-block rounded text-[9px] font-bold px-1 py-0.2 mb-0.5 ${isAccepted ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                1. ÜRÜN
                              </span>
                              <p
                                onClick={() => {
                                  setPreviewListing(pair.itemA);
                                  setSelectedPhotoIndex(0);
                                }}
                                className="font-bold text-xs text-ink truncate cursor-pointer hover:text-forest"
                              >
                                {pair.itemA.title}
                              </p>
                              <p className="text-[11px] text-muted truncate">{pair.itemA.ownerName} ({pair.itemA.city})</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-forest shrink-0"
                            onClick={() => {
                              setPreviewListing(pair.itemA);
                              setSelectedPhotoIndex(0);
                            }}
                          >
                            <Eye className="size-3 mr-1" /> İncele
                          </Button>
                        </div>

                        {/* Ortadaki Takas İkonu */}
                        <div className="flex justify-center -my-1">
                          <div className={`size-6 rounded-full text-white flex items-center justify-center shadow-xs ${isAccepted ? "bg-amber-500" : "bg-emerald-600"}`}>
                            <ArrowLeftRight className="size-3" />
                          </div>
                        </div>

                        {/* 2. Ürün */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-line/70">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              onClick={() => {
                                setPreviewListing(pair.itemB);
                                setSelectedPhotoIndex(0);
                              }}
                              className="size-12 shrink-0 rounded-lg overflow-hidden border border-line bg-shell/50 cursor-pointer"
                            >
                              {photoB ? (
                                <img src={photoB} alt={pair.itemB.title} className="size-full object-cover" />
                              ) : (
                                <div className="grid size-full place-items-center text-muted"><Package className="size-4 opacity-40" /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className={`inline-block rounded text-[9px] font-bold px-1 py-0.2 mb-0.5 ${isAccepted ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                2. ÜRÜN
                              </span>
                              <p
                                onClick={() => {
                                  setPreviewListing(pair.itemB);
                                  setSelectedPhotoIndex(0);
                                }}
                                className="font-bold text-xs text-ink truncate cursor-pointer hover:text-forest"
                              >
                                {pair.itemB.title}
                              </p>
                              <p className="text-[11px] text-muted truncate">{pair.itemB.ownerName} ({pair.itemB.city})</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-forest shrink-0"
                            onClick={() => {
                              setPreviewListing(pair.itemB);
                              setSelectedPhotoIndex(0);
                            }}
                          >
                            <Eye className="size-3 mr-1" /> İncele
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Tekil İlan Kartı (Single)
                const l = item.listing;
                const isSelected = selectedIds.includes(l.id);
                const hasPhotos = l.images && l.images.length > 0;
                const mainPhoto = hasPhotos ? l.images[0] : null;

                return (
                  <div
                    key={l.id}
                    className={`rounded-2xl border transition-all p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0 overflow-hidden ${
                      isSelected
                        ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200"
                        : "border-line/70 bg-card hover:border-forest/30"
                    }`}
                  >
                    {/* 1. ÜST KISIM: Checkbox, Kategori & Durum Rozeti */}
                    <div className="flex items-center justify-between gap-2 border-b border-line/50 pb-2.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(l.id)}
                          className="size-4.5 rounded border-line text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600 shrink-0"
                          title="Seç / Seçimi Kaldır"
                        />
                        <span className="rounded-md bg-shell px-2 py-0.5 text-[11px] font-semibold text-forest truncate border border-line/50">
                          {l.category}
                        </span>
                        <span className="text-[11px] text-muted truncate">
                          ({l.condition})
                        </span>
                      </div>

                      <div className="shrink-0">
                        {l.status === "pending" ? (
                          <StatusChip tone="warn">Onay Bekliyor</StatusChip>
                        ) : l.status === "revision_requested" ? (
                          <StatusChip tone="warn">Revize İstendi</StatusChip>
                        ) : l.status === "approved" || l.status === "yayinda" ? (
                          <StatusChip tone="ok">Yayında</StatusChip>
                        ) : l.status === "completed" || l.status === "takaslandi" ? (
                          <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
                        ) : (
                          <StatusChip tone="bad">Reddedildi</StatusChip>
                        )}
                      </div>
                    </div>

                    {/* 2. ORTA KISIM: Görsel + Başlık & Detaylar */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        onClick={() => {
                          setPreviewListing(l);
                          setSelectedPhotoIndex(0);
                        }}
                        className="relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-shell/50 shadow-2xs group"
                      >
                        {mainPhoto ? (
                          <img
                            src={mainPhoto}
                            alt={l.title}
                            className="size-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-muted">
                            <Package className="size-6 opacity-40" />
                          </div>
                        )}
                        {hasPhotos && l.images.length > 1 && (
                          <span className="absolute bottom-1 right-1 rounded-md bg-black/75 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-xs">
                            +{l.images.length - 1}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4
                          onClick={() => {
                            setPreviewListing(l);
                            setSelectedPhotoIndex(0);
                          }}
                          className="font-bold text-sm text-ink line-clamp-2 cursor-pointer hover:text-forest leading-snug"
                        >
                          {l.title}
                        </h4>
                        <p className="text-xs text-muted flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0 text-muted/70" />
                          <span className="truncate">{l.city}</span>
                          <span className="text-muted/50">·</span>
                          <Clock className="size-3 shrink-0 text-muted/70" />
                          <span className="truncate">{l.created}</span>
                        </p>
                        <p className="text-xs text-muted truncate pt-0.5">
                          <span className="text-muted/80">Sahibi:</span>{" "}
                          <strong className="font-semibold text-ink">{l.ownerName}</strong>
                        </p>
                      </div>
                    </div>

                    {/* 3. TAKAS TERCİHİ ŞERİDİ */}
                    <div className="flex items-center gap-2 rounded-xl bg-shell/60 px-3 py-2 text-xs border border-line/50 min-w-0">
                      <ArrowLeftRight className="size-3.5 text-forest shrink-0" />
                      <span className="text-muted font-medium shrink-0">Takas:</span>
                      <span className="font-semibold text-emerald-950 truncate">
                        {l.wants && l.wants.trim() !== "" ? l.wants : "Açık Teklif"}
                      </span>
                    </div>

                    {/* 4. AKSİYON BUTONLARI (Derli toplu & dokunma dostu) */}
                    <div className="pt-2 border-t border-line/60">
                      {l.status === "pending" || l.status === "revision_requested" ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs font-semibold text-forest border-forest/30 bg-forest/5 hover:bg-forest/10"
                              onClick={() => {
                                setPreviewListing(l);
                                setSelectedPhotoIndex(0);
                              }}
                            >
                              <Eye className="size-3.5 mr-1" /> İncele
                            </Button>
                            <Button
                              size="sm"
                              className="h-9 bg-forest hover:bg-forest/90 text-white text-xs font-semibold shadow-xs"
                              onClick={() => handleApprove(l.id, l.title)}
                            >
                              <Check className="size-3.5 mr-1" /> Onayla
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                              onClick={() => handleOpenRevision(l)}
                            >
                              <Edit3 className="size-3 mr-1" /> Revize
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300"
                              onClick={() => handleOpenReject(l)}
                            >
                              <XCircle className="size-3 mr-1" /> Reddet
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 rounded-xl"
                              onClick={() => handleOpenDelete(l.id, l.title)}
                              title="İlanı Sil"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : l.status === "approved" || l.status === "yayinda" ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs font-semibold text-forest border-forest/30 bg-forest/5 hover:bg-forest/10"
                            onClick={() => {
                              setPreviewListing(l);
                              setSelectedPhotoIndex(0);
                            }}
                          >
                            <Eye className="size-3.5 mr-1" /> İncele
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                            onClick={() => handleOpenRevision(l)}
                          >
                            <Edit3 className="size-3.5 mr-1" /> Revize
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300"
                            onClick={() => handleOpenReject(l)}
                          >
                            <XCircle className="size-3.5 mr-1" /> Kaldır
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 rounded-xl"
                            onClick={() => handleOpenDelete(l.id, l.title)}
                            title="İlanı Sil"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : l.status === "rejected" ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs font-semibold text-forest border-forest/30 bg-forest/5"
                            onClick={() => {
                              setPreviewListing(l);
                              setSelectedPhotoIndex(0);
                            }}
                          >
                            <Eye className="size-3.5 mr-1" /> İncele
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                            onClick={() => handleApprove(l.id, l.title)}
                          >
                            <RotateCcw className="size-3.5 mr-1" /> Yayına Al
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 rounded-xl"
                            onClick={() => handleOpenDelete(l.id, l.title)}
                            title="İlanı Sil"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-9 text-xs font-semibold text-forest border-forest/30 bg-forest/5"
                          onClick={() => {
                            setPreviewListing(l);
                            setSelectedPhotoIndex(0);
                          }}
                        >
                          <Eye className="size-3.5 mr-1" /> İncele
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. MASAÜSTÜ TABLO (Ekran >= lg) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-muted">
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="size-4 rounded border-line text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                      title="Filtrelenen Tümünü Seç / Kaldır"
                    />
                  </th>
                  <th className="py-3.5 px-3 min-w-[300px]">Ürün / İlan</th>
                  <th className="py-3.5 px-3 min-w-[170px]">İlan Sahibi</th>
                  <th className="py-3.5 px-3 min-w-[140px]">Kategori & Durum</th>
                  <th className="py-3.5 px-3 min-w-[150px]">İstenen Takas</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Durum</th>
                  <th className="py-3.5 px-3 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      Bu filtreleme kriterine uygun kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item) => {
                    // BİRLEŞİK TAKAS SATIRI (Pair)
                    if (item.kind === "pair") {
                      const { pair } = item;
                      const photoA = pair.itemA.images?.[0];
                      const photoB = pair.itemB.images?.[0];
                      const isAccepted = pair.status === "accepted";

                      return (
                        <tr
                          key={pair.id}
                          className={`transition-colors border-b group ${
                            isAccepted
                              ? "bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/80"
                              : "bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-200/80"
                          }`}
                        >
                          {/* 0. Checkbox (Disabled) */}
                          <td className="py-4 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled
                              checked={false}
                              className="size-4 rounded border-line opacity-30 cursor-not-allowed"
                              title="Takas aşamasındaki ilanlar silinemez"
                            />
                          </td>

                          {/* 1. Ürün / İlan (İlan A ⇄ İlan B) */}
                          <td className="py-4 px-3 max-w-[360px]">
                            <div className="flex items-center gap-2">
                              {/* Ürün A */}
                              <div
                                onClick={() => {
                                  setPreviewListing(pair.itemA);
                                  setSelectedPhotoIndex(0);
                                }}
                                className="flex items-center gap-2 cursor-pointer group/a min-w-0"
                                title={`1. Ürün: ${pair.itemA.title}`}
                              >
                                <div className={`relative size-12 shrink-0 overflow-hidden rounded-xl border bg-white shadow-xs group-hover/a:scale-105 transition-transform ${isAccepted ? "border-amber-300" : "border-emerald-300"}`}>
                                  {photoA ? (
                                    <img src={photoA} alt={pair.itemA.title} className="size-full object-cover" />
                                  ) : (
                                    <div className="grid size-full place-items-center text-muted">
                                      <Package className="size-4 opacity-40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className={`inline-block rounded text-[9px] font-bold px-1 py-0.2 mb-0.5 ${isAccepted ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                    1. ÜRÜN
                                  </span>
                                  <p className="font-bold text-xs text-ink truncate group-hover/a:text-forest max-w-[105px]">
                                    {pair.itemA.title}
                                  </p>
                                  <p className="text-[10px] text-muted truncate max-w-[105px]">
                                    {pair.itemA.city}
                                  </p>
                                </div>
                              </div>

                              {/* Ortadaki Takas İkonu */}
                              <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-xs ${isAccepted ? "bg-amber-500" : "bg-emerald-600"}`}>
                                <ArrowLeftRight className="size-3.5" />
                              </div>

                              {/* Ürün B */}
                              <div
                                onClick={() => {
                                  setPreviewListing(pair.itemB);
                                  setSelectedPhotoIndex(0);
                                }}
                                className="flex items-center gap-2 cursor-pointer group/b min-w-0"
                                title={`2. Ürün: ${pair.itemB.title}`}
                              >
                                <div className={`relative size-12 shrink-0 overflow-hidden rounded-xl border bg-white shadow-xs group-hover/b:scale-105 transition-transform ${isAccepted ? "border-amber-300" : "border-emerald-300"}`}>
                                  {photoB ? (
                                    <img src={photoB} alt={pair.itemB.title} className="size-full object-cover" />
                                  ) : (
                                    <div className="grid size-full place-items-center text-muted">
                                      <Package className="size-4 opacity-40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className={`inline-block rounded text-[9px] font-bold px-1 py-0.2 mb-0.5 ${isAccepted ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                    2. ÜRÜN
                                  </span>
                                  <p className="font-bold text-xs text-ink truncate group-hover/b:text-forest max-w-[105px]">
                                    {pair.itemB.title}
                                  </p>
                                  <p className="text-[10px] text-muted truncate max-w-[105px]">
                                    {pair.itemB.city}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. İlan Sahibi (Sahip A ⇄ Sahip B) */}
                          <td className="py-4 px-3">
                            <div className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1.5 font-semibold text-ink">
                                <span>{pair.itemA.ownerName}</span>
                                <ArrowLeftRight className={`size-2.5 shrink-0 ${isAccepted ? "text-amber-600" : "text-emerald-600"}`} />
                                <span>{pair.itemB.ownerName}</span>
                              </div>
                              <p className="text-[11px] text-muted">
                                {[pair.itemA.city, pair.itemB.city].filter(Boolean).join(' ⇄ ') || 'Konum belirtilmedi'}
                              </p>
                            </div>
                          </td>

                          {/* 3. Kategori & Durum */}
                          <td className="py-4 px-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${isAccepted ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                              {pair.itemA.category}
                            </span>
                            <p className={`text-[11px] mt-0.5 font-medium ${isAccepted ? "text-amber-800/80" : "text-emerald-800/80"}`}>
                              {isAccepted ? "Kabul Edildi (Süreçte)" : "Karşılıklı Takas"}
                            </p>
                          </td>

                          {/* 4. İstenen Takas (Birebir Eşleşti - Sade & Ferah) */}
                          <td className="py-4 px-3 max-w-[180px]">
                            <div className="text-xs">
                              <span className={`font-semibold flex items-center gap-1 ${isAccepted ? "text-amber-950" : "text-emerald-950"}`}>
                                <ArrowLeftRight className={`size-3 shrink-0 ${isAccepted ? "text-amber-600" : "text-emerald-600"}`} />
                                {isAccepted ? "Aktif Takas" : "Birebir Takas"}
                              </span>
                              <p className="text-[11px] text-muted truncate mt-0.5">
                                {isAccepted ? "Fiziksel takas bekleniyor" : "Karşılıklı el değiştirdi"}
                              </p>
                            </div>
                          </td>

                          {/* 5. Moderasyon Durumu */}
                          <td className="py-4 px-3">
                            <div>
                              {isAccepted ? (
                                <StatusChip tone="warn">Takas Devam Ediyor</StatusChip>
                              ) : (
                                <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
                              )}
                              <span className={`block text-[11px] mt-0.5 font-medium flex items-center gap-1 ${isAccepted ? "text-amber-800" : "text-emerald-800"}`}>
                                <Clock className="size-3" /> {pair.date}
                              </span>
                            </div>
                          </td>

                          {/* 6. Aksiyonlar */}
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold text-forest border-forest/30 bg-white hover:bg-forest/10 px-2.5 shadow-xs"
                                onClick={() => {
                                  setPreviewListing(pair.itemA);
                                  setSelectedPhotoIndex(0);
                                }}
                                title={`1. Ürünü İncele: ${pair.itemA.title}`}
                              >
                                <Eye className="size-3 mr-1" /> 1. Ürün
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold text-forest border-forest/30 bg-white hover:bg-forest/10 px-2.5 shadow-xs"
                                onClick={() => {
                                  setPreviewListing(pair.itemB);
                                  setSelectedPhotoIndex(0);
                                }}
                                title={`2. Ürünü İncele: ${pair.itemB.title}`}
                              >
                                <Eye className="size-3 mr-1" /> 2. Ürün
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // TEKİL İLAN SATIRI (Single)
                    const l = item.listing;
                    const isSelected = selectedIds.includes(l.id);
                    const hasPhotos = l.images && l.images.length > 0;
                    const mainPhoto = hasPhotos ? l.images[0] : null;

                    return (
                      <tr
                        key={l.id}
                        className={`transition-colors group ${
                          isSelected
                            ? "bg-rose-50/50 hover:bg-rose-50/80"
                            : "hover:bg-shell/30"
                        }`}
                      >
                        {/* 0. Checkbox */}
                        <td className="py-4 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(l.id)}
                            className="size-4 rounded border-line text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            title="İlanı Seç"
                          />
                        </td>

                        {/* 1. Ürün & Görsel */}
                        <td className="py-4 px-3 max-w-[280px]">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => {
                                setPreviewListing(l);
                                setSelectedPhotoIndex(0);
                              }}
                              className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-shell/50 transition-transform hover:scale-105"
                              title="İlan detayını incele"
                            >
                              {mainPhoto ? (
                                <img
                                  src={mainPhoto}
                                  alt={l.title}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="grid size-full place-items-center text-muted">
                                  <Package className="size-5 opacity-40" />
                                </div>
                              )}
                              {hasPhotos && l.images.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.2 text-[9px] font-bold text-white">
                                  +{l.images.length - 1}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                onClick={() => {
                                  setPreviewListing(l);
                                  setSelectedPhotoIndex(0);
                                }}
                                className="font-bold text-ink hover:text-forest cursor-pointer transition-colors truncate text-sm"
                              >
                                {l.title}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                                <MapPin className="size-3 text-muted/80 shrink-0" />
                                <span>{l.city}</span>
                                <span className="opacity-40">·</span>
                                <Clock className="size-3 text-muted/80 shrink-0" />
                                <span>{l.created}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. İlan Sahibi */}
                        <td className="py-4 px-3">
                          <p className="font-semibold text-ink text-sm">{l.ownerName}</p>
                          <p className="text-xs text-muted">{l.ownerPhone}</p>
                        </td>

                        {/* 3. Kategori & Durum */}
                        <td className="py-4 px-3">
                          <span className="inline-flex rounded-full bg-shell px-2.5 py-0.5 text-xs font-medium text-ink">
                            {l.category}
                          </span>
                          <p className="text-[11px] text-muted mt-0.5">{l.condition}</p>
                        </td>

                        {/* 4. Takas Tercihi */}
                        <td className="py-4 px-3 max-w-[200px]">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-900 bg-emerald-50/80 rounded-lg px-2 py-1.5 border border-emerald-200/60">
                            <ArrowLeftRight className="size-3 text-emerald-700 shrink-0" />
                            <span className="line-clamp-2">{l.wants}</span>
                          </div>
                        </td>

                        {/* 5. Moderasyon Durumu */}
                        <td className="py-4 px-3">
                          {l.status === "pending" ? (
                            <div>
                              <StatusChip tone="warn">Onay Bekliyor</StatusChip>
                              <span className="block text-[11px] text-amber-700 mt-0.5 font-medium">İnceleme Gerekli</span>
                            </div>
                          ) : l.status === "revision_requested" ? (
                            <div>
                              <StatusChip tone="warn">Revize İstendi</StatusChip>
                              <span className="block text-[11px] text-amber-800 mt-0.5 font-medium">Düzeltme Bekleniyor</span>
                            </div>
                          ) : l.status === "approved" || l.status === "yayinda" ? (
                            <div>
                              <StatusChip tone="ok">Yayında</StatusChip>
                              <span className="block text-[11px] text-emerald-800 mt-0.5 font-medium">Aktif İlan</span>
                            </div>
                          ) : l.status === "completed" || l.status === "takaslandi" ? (
                            <div>
                              <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
                              <span className="block text-[11px] text-emerald-800 mt-0.5 font-medium">Takaslandı</span>
                            </div>
                          ) : (
                            <div>
                              <StatusChip tone="bad">Reddedildi</StatusChip>
                              <span className="block text-[11px] text-rose-800 mt-0.5 font-medium">Yayınlanmıyor</span>
                            </div>
                          )}
                        </td>

                        {/* 6. Aksiyonlar */}
                        <td className="py-4 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-forest border-forest/30 bg-forest/5 hover:bg-forest/10"
                              onClick={() => {
                                setPreviewListing(l);
                                setSelectedPhotoIndex(0);
                              }}
                              title="İlanı İncele"
                            >
                              <Eye className="size-4" />
                            </Button>

                            {l.status === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                                  onClick={() => handleApprove(l.id, l.title)}
                                  title="İlanı Onayla ve Yayına Al"
                                >
                                  <Check className="size-3.5 mr-1" /> Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                                  onClick={() => handleOpenRevision(l)}
                                  title="Kullanıcıdan Düzenleme İste"
                                >
                                  <Edit3 className="size-3.5 mr-1" /> Düzenleme İste
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300"
                                  onClick={() => handleOpenReject(l)}
                                  title="İlanı Reddet"
                                >
                                  <XCircle className="size-3.5 mr-1" /> Reddet
                                </Button>
                              </>
                            ) : l.status === "revision_requested" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                  onClick={() => handleApprove(l.id, l.title)}
                                  title="Onayla & Yayına Al"
                                >
                                  <Check className="size-3.5 mr-1" /> Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-800 hover:bg-amber-50 border-amber-300"
                                  onClick={() => handleOpenRevision(l)}
                                  title="Revize Notunu Güncelle"
                                >
                                  <Edit3 className="size-3.5 mr-1" /> Revize
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-700 hover:bg-rose-50 border-rose-300"
                                  onClick={() => handleOpenReject(l)}
                                  title="İlanı Reddet"
                                >
                                  <XCircle className="size-3.5 mr-1" /> Reddet
                                </Button>
                              </>
                            ) : l.status === "approved" || l.status === "yayinda" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                                  onClick={() => handleOpenRevision(l)}
                                  title="Kullanıcıdan Düzenleme İste"
                                >
                                  <Edit3 className="size-3.5 mr-1" /> Düzenleme İste
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-700 hover:bg-rose-50 border-rose-300"
                                  onClick={() => handleOpenReject(l)}
                                  title="İlanı Reddet / Yayından Kaldır"
                                >
                                  <XCircle className="size-3.5 mr-1" /> Reddet
                                </Button>
                              </>
                            ) : l.status === "rejected" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                onClick={() => handleApprove(l.id, l.title)}
                                title="İlanı Tekrar Yayına Al"
                              >
                                <RotateCcw className="size-3.5 mr-1" /> Yayına Al
                              </Button>
                            ) : null}

                            {l.status !== "completed" && l.status !== "takaslandi" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted hover:text-rose-600"
                                onClick={() => handleOpenDelete(l.id, l.title)}
                                title="İlanı Kalıcı Sil"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* =========================================================
          1. DETAYLI İLAN İNCELEME MODALI (Görseller, Açıklama & İşlemler)
          ========================================================= */}
      {previewListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[94vh] sm:max-h-[90vh] w-full max-w-2xl lg:max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-line">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6 sm:py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest">
                  <Package className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-ink truncate">{previewListing.title}</h3>
                  <p className="text-[11px] text-muted truncate">İlan ID: {previewListing.id}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewListing(null)}
                className="rounded-lg p-1 text-muted hover:bg-shell hover:text-ink shrink-0"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {/* Modal İçerik (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {/* Fotoğraf Galerisi */}
              {previewListing.images && previewListing.images.length > 0 ? (
                <div className="space-y-2.5">
                  {/* Büyük Önizleme */}
                  <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-xl border border-line bg-black/5 dark:bg-black/20 flex items-center justify-center">
                    <img
                      src={previewListing.images[selectedPhotoIndex] || previewListing.images[0]}
                      alt={previewListing.title}
                      className="size-full object-contain"
                    />
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
                      {selectedPhotoIndex + 1} / {previewListing.images.length}
                    </span>
                  </div>

                  {/* Küçük Fotoğraf Şeridi */}
                  {previewListing.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {previewListing.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhotoIndex(idx)}
                          className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                            selectedPhotoIndex === idx
                              ? "border-forest shadow-sm scale-105"
                              : "border-line opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={img} alt="" className="size-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
                  <Package className="mx-auto size-8 opacity-30 mb-1.5" />
                  <p className="text-xs sm:text-sm">Bu ilan için yüklenmiş fotoğraf bulunamadı.</p>
                </div>
              )}

              {/* İlan Bilgi Izgarası */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">İlan Sahibi</span>
                  <p className="mt-0.5 font-semibold text-sm text-ink">{previewListing.ownerName}</p>
                  <p className="text-xs text-muted font-mono mt-0.5 flex items-center gap-1">
                    <Phone className="size-3 text-muted" /> {previewListing.ownerPhone}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">Kategori & Durum</span>
                  <p className="mt-0.5 font-semibold text-sm text-ink">{previewListing.category}</p>
                  <p className="text-xs text-muted mt-0.5">Kondisyon: {previewListing.condition}</p>
                </div>

                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">Konum & Eklenme Tarihi</span>
                  <p className="mt-0.5 font-semibold text-sm text-ink flex items-center gap-1">
                    <MapPin className="size-3.5 text-muted" /> {previewListing.city}
                  </p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="size-3 text-muted" /> {previewListing.created}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">Mevcut Moderasyon Durumu</span>
                  <div className="mt-1">
                    {previewListing.status === "completed" || previewListing.status === "takaslandi" ? (
                      <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
                    ) : previewListing.status === "pending" ? (
                      <StatusChip tone="warn">Onay Bekliyor</StatusChip>
                    ) : previewListing.status === "revision_requested" ? (
                      <StatusChip tone="warn">Revize İstendi</StatusChip>
                    ) : previewListing.status === "approved" || previewListing.status === "yayinda" ? (
                      <StatusChip tone="ok">Yayında</StatusChip>
                    ) : (
                      <StatusChip tone="bad">Reddedildi</StatusChip>
                    )}
                  </div>
                </div>
              </div>

              {/* Tamamlanmış Takas Bilgi Kartı */}
              {(previewListing.status === "completed" || previewListing.status === "takaslandi") && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Check className="size-4 text-emerald-700" />
                    Takas Başarıyla Tamamlandı (Kalıcı Arşiv)
                  </span>
                  <p className="mt-1 text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium">
                    Bu ürünün takası karşılıklı olarak onaylanmış ve tamamlanmıştır. Tarihsel ve istatistiksel kayıt olarak korunmaktadır; sistemden silinemez, düzenlenemez veya tekrar yayına alınamaz.
                  </p>
                </div>
              )}

              {/* Takas Tercihi */}
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <ArrowLeftRight className="size-3.5 text-emerald-700" />
                  İstenen Takas Seçeneği
                </span>
                <p className="mt-1 text-sm font-semibold text-emerald-950">{previewListing.wants}</p>
              </div>

              {/* Açıklama */}
              <div className="rounded-xl border border-line bg-shell/20 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Ürün Açıklaması</span>
                <p className="mt-1.5 whitespace-pre-wrap text-xs sm:text-sm text-ink/90 leading-relaxed max-h-36 overflow-y-auto">
                  {previewListing.description || "Açıklama girilmemiş."}
                </p>
              </div>

              {/* Mevcut Yönetici Notu (Varsa) */}
              {previewListing.adminNote && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-amber-700" />
                    Mevcut Yönetici Revize / Red Notu
                  </span>
                  <p className="mt-1 text-xs sm:text-sm text-amber-950 leading-relaxed font-medium">
                    {previewListing.adminNote}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-line bg-shell/30 px-4 py-3 sm:px-6 sm:py-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewListing(null)} className="w-full sm:w-auto">
                Kapat
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                {previewListing.status === "completed" || previewListing.status === "takaslandi" ? null : previewListing.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      className="text-rose-700 hover:bg-rose-50 border-rose-300"
                      onClick={() => handleOpenReject(previewListing)}
                    >
                      <XCircle className="size-4 mr-1" /> Reddet
                    </Button>
                    <Button
                      variant="outline"
                      className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                      onClick={() => handleOpenRevision(previewListing)}
                    >
                      <Edit3 className="size-4 mr-1" /> Düzenleme İste
                    </Button>
                    <Button
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      onClick={() => handleApprove(previewListing.id, previewListing.title)}
                    >
                      <Check className="size-4 mr-1" /> İlanı Onayla & Yayına Al
                    </Button>
                  </>
                ) : previewListing.status === "approved" || previewListing.status === "yayinda" ? (
                  <>
                    <Button
                      variant="outline"
                      className="text-rose-700 hover:bg-rose-50 border-rose-300"
                      onClick={() => handleOpenReject(previewListing)}
                    >
                      <XCircle className="size-4 mr-1" /> Yayından Kaldır
                    </Button>
                    <Button
                      variant="outline"
                      className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                      onClick={() => handleOpenRevision(previewListing)}
                    >
                      <Edit3 className="size-4 mr-1" /> Düzenleme İsteği Gönder
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenDelete(previewListing.id, previewListing.title)}
                    >
                      <Trash2 className="size-4 mr-1" /> İlanı Sil
                    </Button>
                  </>
                ) : previewListing.status === "revision_requested" ? (
                  <>
                    <Button
                      variant="outline"
                      className="text-rose-700 hover:bg-rose-50 border-rose-300"
                      onClick={() => handleOpenReject(previewListing)}
                    >
                      <XCircle className="size-4 mr-1" /> Reddet
                    </Button>
                    <Button
                      variant="outline"
                      className="text-amber-800 hover:bg-amber-50 border-amber-300"
                      onClick={() => handleOpenRevision(previewListing)}
                    >
                      <Edit3 className="size-4 mr-1" /> Revize Notunu Güncelle
                    </Button>
                    <Button
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      onClick={() => handleApprove(previewListing.id, previewListing.title)}
                    >
                      <Check className="size-4 mr-1" /> Onayla & Yayına Al
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    onClick={() => handleApprove(previewListing.id, previewListing.title)}
                  >
                    <RotateCcw className="size-4 mr-1" /> Tekrar Yayına Al
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          2. DÜZENLEME İSTEĞİ MODALI
          ========================================================= */}
      {revisionListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line">
            <div className="flex items-center gap-2.5 text-amber-700">
              <Edit3 className="size-5" />
              <h3 className="text-lg font-bold text-ink">Düzenleme İsteği Gönder</h3>
            </div>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              &ldquo;{revisionListing.title}&rdquo; başlıklı ilan yayından çekilecek (veya onay bekleyecek) ve kullanıcıya aşağıdaki açıklama mobil bildirim olarak iletilecektir.
            </p>

            <div className="mt-3.5">
              <label className="block text-[11px] font-semibold uppercase text-muted mb-1.5">
                Hızlı Şablonlar:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Lütfen ürünün daha net ve gerçek fotoğraflarını yükleyin.",
                  "Açıklama alanına ürünün kullanım durumu ve kusurlarını belirtin.",
                  "İstediğiniz takas seçeneklerini daha anlaşılır ve net yazın.",
                  "Ürünün kategorisi veya seçilen durumu hatalı görünüyor.",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRevisionNote(preset)}
                    className="rounded-lg border border-line bg-shell/50 px-2 py-1 text-[11px] text-ink/80 hover:bg-shell hover:border-amber-400 text-left transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase text-muted mb-1">
                Kullanıcıya İletilecek Revizyon Notu *
              </label>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-line bg-shell/50 p-3 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Örn: Lütfen ürünün çalışan halini ve kutu içeriğini net gösteren fotoğraflar ekleyin..."
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRevisionListing(null)}>
                Vazgeç
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmRevision}
              >
                Düzenleme Talebini Gönder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          3. REDDETME MODALI
          ========================================================= */}
      {rejectListingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line">
            <div className="flex items-center gap-2.5 text-rose-700">
              <XCircle className="size-5" />
              <h3 className="text-lg font-bold text-ink">İlanı Reddet & Bildir</h3>
            </div>
            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              &ldquo;{rejectListingItem.title}&rdquo; başlıklı ilan reddedilecek ve kullanıcıya aşağıdaki açıklama iletilecektir.
            </p>

            <div className="mt-3.5">
              <label className="block text-[11px] font-semibold uppercase text-muted mb-1.5">
                Hızlı Red Sebepleri:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Platform kurallarına aykırı ürün veya içerik.",
                  "Yanıltıcı veya sahte ilan içeriği.",
                  "Nakit para / satış talebi (platform sadece takas içindir).",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="rounded-lg border border-line bg-shell/50 px-2 py-1 text-[11px] text-ink/80 hover:bg-shell hover:border-rose-300 text-left transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase text-muted mb-1">
                Red Gerekçesi (Kullanıcı Görecek) *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-line bg-shell/50 p-3 text-sm text-ink outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Örn: Platform kurallarına uygun olmayan içerik tespit edildi..."
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectListingItem(null)}>
                Vazgeç
              </Button>
              <Button variant="destructive" onClick={handleConfirmReject}>
                İlanı Reddet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          4. TEKİL KALICI SİLME ONAY MODALI
          ========================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-ink">İlanı Yayından Kaldır</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  <span className="font-semibold text-ink">&ldquo;{deleteTarget.title}&rdquo;</span> başlıklı ilanı yayından kaldırmak istediğinize emin misiniz?
                </p>
              </div>
            </div>


            <div className="mt-4 space-y-1.5">
              <label htmlFor="remove-reason-single" className="text-xs font-semibold text-ink">
                Kaldırma nedeni <span className="font-normal text-muted">(ilan sahibine bildirimle iletilir)</span>
              </label>
              <textarea
                id="remove-reason-single"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Örn: Yasaklı ürün, yanıltıcı fotoğraf, kopya ilan"
                className="w-full rounded-lg border border-line bg-card p-2.5 text-sm text-ink outline-none focus:border-rose-400"
              />
            </div>
            <div className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="leading-relaxed">
                Bu işlem geri alınamaz. Bekleyen teklifler iptal edilir ve teklif sahiplerine 10 TakasPara iade edilir. Teklif geçmişi olan ilan sohbet kayıtları bozulmasın diye gizlenir; hiç teklif almamış ilan tamamen silinir.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setRemoveReason("");
                }}
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  "Kaldırılıyor..."
                ) : (
                  <>
                    <Trash2 className="size-3.5 mr-1.5" /> Evet, Kaldır
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          5. TOPLU KALICI SİLME ONAY MODALI (Yeni)
          ========================================================= */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600 ring-2 ring-rose-200">
                <Trash2 className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-ink">
                  Seçilen {selectedIds.length} İlanı Kalıcı Olarak Sil
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Aşağıda listelenen <span className="font-bold text-rose-600">{selectedIds.length}</span> adet ilanı sistemden kalıcı olarak silmek üzeresiniz.
                </p>
              </div>
            </div>

            {/* Silinecek İlanlar Listesi Önizlemesi */}
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-line bg-shell/40 p-2.5 divide-y divide-line/60 text-xs">
              {selectedListings.map((l) => (
                <div key={l.id} className="py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{l.title}</p>
                    <p className="text-[11px] text-muted truncate">{l.ownerName} · {l.city} · {l.category}</p>
                  </div>
                  <span className="rounded bg-shell px-2 py-0.5 text-[10px] font-medium text-muted shrink-0">
                    {l.status}
                  </span>
                </div>
              ))}
            </div>


            <div className="mt-4 space-y-1.5">
              <label htmlFor="remove-reason-bulk" className="text-xs font-semibold text-ink">
                Kaldırma nedeni <span className="font-normal text-muted">(ilan sahibine bildirimle iletilir)</span>
              </label>
              <textarea
                id="remove-reason-bulk"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Örn: Yasaklı ürün, yanıltıcı fotoğraf, kopya ilan"
                className="w-full rounded-lg border border-line bg-card p-2.5 text-sm text-ink outline-none focus:border-rose-400"
              />
            </div>
            <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50/80 p-3 text-xs text-rose-950 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Dikkat:</strong> Bu işlem geri alınamaz. Bekleyen teklifler iptal edilir ve teklif sahiplerine 10 TakasPara iade edilir. Devam eden veya tamamlanmış takası olan ilanlar kaldırılmaz.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkDeleting}
                onClick={() => { setBulkDeleteModalOpen(false); setRemoveReason(""); }}
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isBulkDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleConfirmBulkDelete}
              >
                {isBulkDeleting ? (
                  "Siliniyor..."
                ) : (
                  <>
                    <Trash2 className="size-4 mr-1.5" /> Evet, Seçilen {selectedIds.length} İlanı Sil
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
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
