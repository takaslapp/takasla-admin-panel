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
