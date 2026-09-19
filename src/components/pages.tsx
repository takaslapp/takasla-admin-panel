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
import type { CompletedSwapPair, Listing, ListingStatus, Report, ReportStatus, SuggestionStatus, User } from "@/lib/data";
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
        
        {/* Mobil Kullanıcı Kartları */}
        <div className="space-y-3 md:hidden">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-muted text-sm">Aramanıza uygun kullanıcı bulunamadı.</p>
          ) : (
            rows.map((u) => (
              <div key={u.id} className="rounded-2xl border border-line/70 bg-card p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="size-10 shrink-0 rounded-full object-cover ring-1 ring-line"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/takasla-icon.jpg";
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{u.name}</p>
                      <p className="text-xs text-muted font-mono">{u.username}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      u.role === "Yönetici"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1.5 border-t border-line/60">
                  <span className="inline-flex items-center gap-1 truncate font-mono text-ink/90">
                    <Phone className="size-3 text-muted shrink-0" />
                    {u.phone}
                  </span>
                  <span className="inline-flex items-center gap-1 justify-end truncate">
                    <MapPin className="size-3 text-muted shrink-0" />
                    {u.city}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate text-[11px]">
                    <Calendar className="size-3 text-muted shrink-0" />
                    {u.joined}
                  </span>
                  <span className="inline-flex items-center gap-1 justify-end text-[11px] font-bold text-forest">
                    {u.listingsCount} İlan
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Masaüstü Tablosu */}
        <div className="hidden md:block w-full max-w-full overflow-x-auto min-w-0">
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
                            (e.target as HTMLImageElement).src = "/images/takasla-icon.jpg";
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
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "completed" | "revision_requested" | "rejected">("all");

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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Sayılar
  const uncompletedListings = useMemo(
    () => listings.filter((l) => l.status !== "completed" && l.status !== "takaslandi"),
    [listings]
  );
  const pendingCount = useMemo(() => listings.filter((l) => l.status === "pending").length, [listings]);
  const approvedCount = useMemo(() => listings.filter((l) => l.status === "approved" || l.status === "yayinda").length, [listings]);
  const completedCount = useMemo(() => completedSwapPairs.length, [completedSwapPairs]);
  const revisionCount = useMemo(() => listings.filter((l) => l.status === "revision_requested").length, [listings]);
  const rejectedCount = useMemo(() => listings.filter((l) => l.status === "rejected").length, [listings]);
  const totalDisplayCount = uncompletedListings.length + completedSwapPairs.length;

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
      return completedSwapPairs
        .filter(matchPairSearch)
        .map((pair) => ({ kind: "pair" as const, pair }));
    }

    // activeTab === "all" (TÜMÜ):
    // Takaslanmamışlar tekil, takaslananlar BİRLEŞİK ÇİFTLER olarak listelenir!
    const singles: DisplayItem[] = uncompletedListings
      .filter(matchSingleSearch)
      .map((listing) => ({ kind: "single" as const, listing }));

    const pairs: DisplayItem[] = completedSwapPairs
      .filter(matchPairSearch)
      .map((pair) => ({ kind: "pair" as const, pair }));

    return [...singles, ...pairs];
  }, [listings, completedSwapPairs, uncompletedListings, activeTab, q]);

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
      toast.error(`"${rejectListingItem.title}" başlıklı ilan reddedildi ve kullanıcıya bildirildi.`);
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
      await deleteListing(deleteTarget.id);
      toast.success(`"${deleteTarget.title}" başlıklı ilan sistemden kalıcı olarak silindi.`);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      if (previewListing?.id === deleteTarget.id) {
        setPreviewListing(null);
      }
      setDeleteTarget(null);
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
      await deleteMultipleListings(selectedIds);
      toast.success(`Seçilen ${count} adet ilan sistemden başarıyla silindi.`);
      if (previewListing && selectedIds.includes(previewListing.id)) {
        setPreviewListing(null);
      }
      setSelectedIds([]);
      setBulkDeleteModalOpen(false);
    } catch (err: any) {
      toast.error(`Toplu silme sırasında hata oluştu: ${err?.message || "İşlem tamamlanamadı"}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <AdminShell compact kicker="İlan Moderasyon Merkezi" title="Tüm İlanlar">
      <div className="grid gap-5">
        {/* İlan Durumu Filtreleme Sekmeleri */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "all" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              Tümü ({totalDisplayCount})
            </Button>
            <Button
              variant={activeTab === "pending" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("pending")}
            >
              Onay Bekleyenler ({pendingCount})
            </Button>
            <Button
              variant={activeTab === "approved" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("approved")}
            >
              Yayındakiler ({approvedCount})
            </Button>
            <Button
              variant={activeTab === "completed" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("completed")}
            >
              Takaslananlar ({completedCount})
            </Button>
            <Button
              variant={activeTab === "revision_requested" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("revision_requested")}
            >
              Düzenleme İstenenler ({revisionCount})
            </Button>
            <Button
              variant={activeTab === "rejected" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("rejected")}
            >
              Reddedilenler ({rejectedCount})
            </Button>
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
          title={activeTab === "completed" ? "Birleşik Takas Listesi" : "İlan Listesi"}
          subtitle={`${displayItems.length} ${activeTab === "completed" ? "tamamlanan birleşik takas" : "kayıt"} listeleniyor${selectedIds.length > 0 ? ` · ${selectedIds.length} seçildi` : ""}`}
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
              activeTab === "completed"
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

                  return (
                    <div
                      key={pair.id}
                      className="rounded-2xl border border-emerald-300/80 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                            <ArrowLeftRight className="size-3.5" />
                          </span>
                          <div>
                            <h4 className="font-bold text-xs text-emerald-950">Birleşik Takas İşlemi</h4>
                            <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                              <Clock className="size-2.5" /> {pair.date}
                            </p>
                          </div>
                        </div>
                        <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
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
                              <span className="inline-block rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 py-0.2 mb-0.5">
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
                          <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
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
                              <span className="inline-block rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 py-0.2 mb-0.5">
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
                    className={`rounded-2xl border transition-all p-3.5 shadow-sm space-y-3 ${
                      isSelected
                        ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200"
                        : "border-line/70 bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(l.id)}
                          className="size-4.5 rounded border-line text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                          title="Seç / Seçimi Kaldır"
                        />
                        <div
                          onClick={() => {
                            setPreviewListing(l);
                            setSelectedPhotoIndex(0);
                          }}
                          className="relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-shell/50"
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
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          onClick={() => {
                            setPreviewListing(l);
                            setSelectedPhotoIndex(0);
                          }}
                          className="font-bold text-sm text-ink line-clamp-2 cursor-pointer hover:text-forest"
                        >
                          {l.title}
                        </h4>
                        <p className="text-xs text-muted flex items-center gap-1 mt-1">
                          <MapPin className="size-3 shrink-0" /> {l.city} · <Clock className="size-3 shrink-0" /> {l.created}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-shell px-2 py-0.5 text-[11px] font-medium text-ink">
                            {l.category}
                          </span>
                          <span className="text-[11px] text-muted">({l.condition})</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-shell/40 p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">İlan Sahibi:</span>
                        <span className="font-semibold text-ink">{l.ownerName} ({l.ownerPhone})</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted shrink-0">Takas:</span>
                        <span className="font-medium text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 truncate max-w-[200px]">
                          {l.wants}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium text-muted">Durum:</span>
                      {l.status === "pending" ? (
                        <StatusChip tone="warn">Onay Bekliyor</StatusChip>
                      ) : l.status === "revision_requested" ? (
                        <StatusChip tone="warn">Revize İstendi</StatusChip>
                      ) : l.status === "approved" || l.status === "yayinda" ? (
                        <StatusChip tone="ok">Yayında</StatusChip>
                      ) : (
                        <StatusChip tone="bad">Reddedildi</StatusChip>
                      )}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs font-semibold text-forest border-forest/30 bg-forest/5"
                        onClick={() => {
                          setPreviewListing(l);
                          setSelectedPhotoIndex(0);
                        }}
                      >
                        <Eye className="size-3 mr-1" /> İncele
                      </Button>

                      <Button
                        size="sm"
                        className="bg-forest hover:bg-forest/90 text-white text-xs h-8 px-2.5 font-semibold"
                        onClick={() => handleApprove(l.id, l.title)}
                      >
                        <Check className="size-3 mr-1" /> Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 text-xs h-8 px-2 font-semibold"
                        onClick={() => handleOpenRevision(l)}
                      >
                        <Edit3 className="size-3 mr-1" /> Revize
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300 text-xs h-8 px-2 font-semibold"
                        onClick={() => handleOpenReject(l)}
                      >
                        <XCircle className="size-3 mr-1" /> Reddet
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 text-xs"
                        onClick={() => handleOpenDelete(l.id, l.title)}
                        title="İlanı Sil"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
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

                      return (
                        <tr
                          key={pair.id}
                          className="bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors border-b border-emerald-200/80 group"
                        >
                          {/* 0. Checkbox (Disabled) */}
                          <td className="py-4 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled
                              checked={false}
                              className="size-4 rounded border-line opacity-30 cursor-not-allowed"
                              title="Tamamlanmış takaslar silinemez"
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
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-emerald-300 bg-white shadow-xs group-hover/a:scale-105 transition-transform">
                                  {photoA ? (
                                    <img src={photoA} alt={pair.itemA.title} className="size-full object-cover" />
                                  ) : (
                                    <div className="grid size-full place-items-center text-muted">
                                      <Package className="size-4 opacity-40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="inline-block rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 py-0.2 mb-0.5">
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
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
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
                                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-emerald-300 bg-white shadow-xs group-hover/b:scale-105 transition-transform">
                                  {photoB ? (
                                    <img src={photoB} alt={pair.itemB.title} className="size-full object-cover" />
                                  ) : (
                                    <div className="grid size-full place-items-center text-muted">
                                      <Package className="size-4 opacity-40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="inline-block rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 py-0.2 mb-0.5">
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
                                <ArrowLeftRight className="size-2.5 text-emerald-600 shrink-0" />
                                <span>{pair.itemB.ownerName}</span>
                              </div>
                              <p className="text-[11px] text-muted">
                                {[pair.itemA.city, pair.itemB.city].filter(Boolean).join(' ⇄ ') || 'Konum belirtilmedi'}
                              </p>
                            </div>
                          </td>

                          {/* 3. Kategori & Durum */}
                          <td className="py-4 px-3">
                            <span className="inline-flex rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-xs font-semibold">
                              {pair.itemA.category}
                            </span>
                            <p className="text-[11px] text-emerald-800/80 mt-0.5 font-medium">Karşılıklı Takas</p>
                          </td>

                          {/* 4. İstenen Takas (Birebir Eşleşti - Sade & Ferah) */}
                          <td className="py-4 px-3 max-w-[180px]">
                            <div className="text-xs">
                              <span className="font-semibold text-emerald-950 flex items-center gap-1">
                                <ArrowLeftRight className="size-3 text-emerald-600 shrink-0" />
                                Birebir Takas
                              </span>
                              <p className="text-[11px] text-muted truncate mt-0.5">
                                Karşılıklı el değiştirdi
                              </p>
                            </div>
                          </td>

                          {/* 5. Moderasyon Durumu */}
                          <td className="py-4 px-3">
                            <div>
                              <StatusChip tone="ok">Takas Tamamlandı</StatusChip>
                              <span className="block text-[11px] text-emerald-800 mt-0.5 font-medium flex items-center gap-1">
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
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-700 hover:bg-rose-50 border-rose-300"
                                onClick={() => handleOpenReject(l)}
                                title="İlanı Reddet / Yayından Kaldır"
                              >
                                <XCircle className="size-3.5 mr-1" /> Reddet
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted hover:text-rose-600"
                              onClick={() => handleOpenDelete(l.id, l.title)}
                              title="İlanı Kalıcı Sil"
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
                <h3 className="text-base font-bold text-ink">İlanı Kalıcı Olarak Sil</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  <span className="font-semibold text-ink">&ldquo;{deleteTarget.title}&rdquo;</span> başlıklı ilanı sistemden kalıcı olarak kaldırmak istediğinize emin misiniz?
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="leading-relaxed">
                Bu işlem geri alınamaz. İlan veritabanından, favorilerden ve fotoğraflarından tamamen silinecektir.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
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
                  "Siliniyor..."
                ) : (
                  <>
                    <Trash2 className="size-3.5 mr-1.5" /> Evet, Kalıcı Olarak Sil
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

            <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50/80 p-3 text-xs text-rose-950 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Dikkat:</strong> Bu işlem geri alınamaz. Seçilen tüm ilanlar, ilan fotoğrafları ve kullanıcı favorileri veritabanından tamamen silinecektir.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkDeleting}
                onClick={() => setBulkDeleteModalOpen(false)}
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
   3. ŞİKAYET & MODERASYON MERKEZİ
   ========================================================================= */
export function ReportsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const reports = useAdminStore((s) => s.reports);
  const listings = useAdminStore((s) => s.listings);
  const resolveReport = useAdminStore((s) => s.resolveReport);

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "acik" | "cozuldu" | "reddedildi">("all");

  // İlan İnceleme Modalı
  const [inspectListing, setInspectListing] = useState<Listing | null>(null);
  const [inspectPhotoIndex, setInspectPhotoIndex] = useState(0);

  // Aksiyon ve Bildirim Modalı
  const [actionModal, setActionModal] = useState<{
    report: Report;
    action: "delete_listing" | "dismiss" | "resolve_feedback";
  } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Sayılar
  const openCount = useMemo(() => reports.filter((r) => r.status === "acik").length, [reports]);
  const resolvedCount = useMemo(() => reports.filter((r) => r.status === "cozuldu").length, [reports]);
  const dismissedCount = useMemo(() => reports.filter((r) => r.status === "reddedildi").length, [reports]);

  const rows = useMemo(() => {
    return reports.filter((r) => {
      let matchTab = true;
      if (activeTab === "acik") matchTab = r.status === "acik";
      else if (activeTab === "cozuldu") matchTab = r.status === "cozuldu";
      else if (activeTab === "reddedildi") matchTab = r.status === "reddedildi";

      const matchSearch = `${r.subject} ${r.reporter} ${r.target} ${r.detail} ${r.type}`
        .toLowerCase()
        .includes(q.toLowerCase());

      return matchTab && matchSearch;
    });
  }, [reports, activeTab, q]);

  // İlanı İncele
  const handleInspectListing = (report: Report) => {
    const targetListing = listings.find(
      (l) => l.id === report.targetId || l.title.toLowerCase() === report.target.toLowerCase()
    );

    if (targetListing) {
      setInspectListing(targetListing);
      setInspectPhotoIndex(0);
    } else {
      toast.info(`"${report.target}" başlıklı ilan sistemde aktif bulunamadı (silinmiş veya yayından kaldırılmış olabilir).`);
    }
  };

  // Aksiyon Modalını Aç
  const openActionModal = (
    report: Report,
    action: "delete_listing" | "dismiss" | "resolve_feedback"
  ) => {
    const isApp =
      report.type.includes("Uygulama") ||
      report.targetId === "takasla_app" ||
      report.target.includes("Uygulama");

    if (action === "resolve_feedback" || (isApp && action !== "dismiss")) {
      setActionNote(
        `İlettiğiniz "${report.subject}" konulu geri bildiriminiz ekibimiz tarafından incelendi ve değerlendirmeye alındı. Takasla deneyimini geliştirmemize katkı sağladığınız için teşekkür ederiz!`
      );
      setActionModal({ report, action: "resolve_feedback" });
    } else if (action === "delete_listing") {
      setActionNote(
        `Bildirdiğiniz "${report.target}" başlıklı ilan moderasyon ekibimiz tarafından incelendi ve platform kurallarımıza aykırı bulunduğu için yayından kaldırıldı. Topluluğumuzu korumamıza yardımcı olduğunuz için teşekkür ederiz!`
      );
      setActionModal({ report, action });
    } else {
      setActionNote(
        isApp
          ? `İlettiğiniz bildirim incelenmiş ve notlarımız arasına alınmıştır. Teşekkür ederiz.`
          : `"${report.target}" hakkındaki bildiriminiz moderasyon ekibimiz tarafından incelenmiş olup platform kurallarına aykırı bir duruma rastlanmamıştır. Hassasiyetiniz ve bildiriminiz için teşekkür ederiz.`
      );
      setActionModal({ report, action });
    }
  };

  // Aksiyonu Onayla ve Bildir
  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setIsActionSubmitting(true);
    try {
      await resolveReport({
        reportId: actionModal.report.id,
        action: actionModal.action,
        customMessage: actionNote.trim(),
        reporterId: actionModal.report.reporterId,
        targetTitle: actionModal.report.target,
        targetListingId: actionModal.report.targetId,
      });

      if (actionModal.action === "delete_listing") {
        toast.success(`İlan kaldırıldı ve ${actionModal.report.reporter} kullanıcısına teşekkür bildirimi iletildi.`);
      } else if (actionModal.action === "resolve_feedback") {
        toast.success(`Geri bildirim çözüldü ve ${actionModal.report.reporter} kullanıcısına teşekkür iletildi.`);
      } else {
        toast.info(`Şikayet kapatıldı ve ${actionModal.report.reporter} kullanıcısına bilgi verildi.`);
      }

      setActionModal(null);
      if (inspectListing && inspectListing.id === actionModal.report.targetId) {
        setInspectListing(null);
      }
    } catch (err: any) {
      toast.error(`Aksiyon uygulanamadı: ${err?.message || "Hata oluştu"}`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  return (
    <AdminShell compact kicker="Moderasyon ve Güvenlik" title="Şikayet ve Bildirimler">
      <div className="grid gap-5">
        {/* Filtreleme Sekmeleri */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "all" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("all")}
            >
              Tümü ({reports.length})
            </Button>
            <Button
              variant={activeTab === "acik" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("acik")}
              className={openCount > 0 ? "border-rose-400 bg-rose-50/70 text-rose-900 hover:bg-rose-100" : ""}
            >
              Açık Şikayetler ({openCount})
              {openCount > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {openCount}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === "cozuldu" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("cozuldu")}
            >
              Çözülenler ({resolvedCount})
            </Button>
            <Button
              variant={activeTab === "reddedildi" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("reddedildi")}
            >
              İhlal Görülmeyenler ({dismissedCount})
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetchDashboardData();
              toast.info("Şikayet listesi yenilendi.");
            }}
          >
            <RotateCcw className="size-3.5 mr-1" /> Yenile
          </Button>
        </div>

        <Panel title="Gelen Şikayetler" subtitle={`${rows.length} bildirim listeleniyor`}>
          <Toolbar value={q} onChange={setQ} placeholder="Şikayet konusu, şikayet eden, hedef ilan veya açıklama ara..." />

          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto size-12 text-emerald-600 mb-2 opacity-80" />
              <p className="font-semibold text-ink">Bu filtrede gösterilecek bildirim bulunmuyor.</p>
              <p className="text-xs text-muted mt-1">Gelen şikayetler çözüldü veya filtreleme kriterine uygun kayıt yok.</p>
            </div>
          ) : (
            <>
              {/* MOBİL ŞİKAYET KARTLARI */}
              <div className="space-y-3.5 md:hidden">
                {rows.map((r) => {
                  const isApp =
                    r.type.includes("Uygulama") ||
                    r.targetId === "takasla_app" ||
                    r.target.includes("Uygulama");
                  const hasListing = listings.some(
                    (l) => l.id === r.targetId || l.title.toLowerCase() === r.target.toLowerCase()
                  );

                  return (
                    <div key={r.id} className="rounded-2xl border border-line/70 bg-card p-4 shadow-sm space-y-3">
                      {/* Başlık & Durum */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                              isApp
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}>
                              {isApp ? <Sparkles className="size-3 text-emerald-600" /> : <AlertCircle className="size-3 text-rose-600" />}
                              {r.subject}
                            </span>
                            <span className="text-[11px] text-muted font-medium">{r.type}</span>
                          </div>
                          <p className="text-[11px] text-muted flex items-center gap-1 mt-1">
                            <Clock className="size-3" /> {r.created}
                          </p>
                        </div>

                        <StatusChip tone={r.status === "acik" ? "warn" : r.status === "cozuldu" ? "ok" : "mute"}>
                          {r.status === "acik" ? "Açık Dosya" : r.status === "cozuldu" ? "Çözüldü" : "İhlal Görülmedi"}
                        </StatusChip>
                      </div>

                      {/* Bildiren & İlgili Hedef */}
                      <div className="rounded-xl bg-shell/40 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Bildiren Üye:</span>
                          <span className="font-semibold text-ink flex items-center gap-1">
                            <UserIcon className="size-3.5 text-muted" /> {r.reporter}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">İlgili Hedef:</span>
                          {isApp ? (
                            <span className="font-semibold text-forest flex items-center gap-1">
                              <Smartphone className="size-3.5" /> Takasla Mobil Uygulama
                            </span>
                          ) : (
                            <span className="font-semibold text-ink truncate max-w-[180px]">
                              {r.target}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kullanıcı Notu */}
                      {r.detail && (
                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 text-xs text-amber-950">
                          <span className="font-bold text-[10.5px] uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-0.5">
                            <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                            Kullanıcı Açıklaması:
                          </span>
                          <p className="font-medium leading-relaxed italic text-ink/90">
                            &ldquo;{r.detail}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Aksiyon Butonları */}
                      {r.status === "acik" ? (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          {isApp ? (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 bg-forest hover:bg-forest/90 text-white font-semibold text-xs h-9"
                                onClick={() => openActionModal(r, "resolve_feedback")}
                              >
                                <CheckCircle2 className="size-3.5 mr-1" /> İncelendi & Çöz
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-muted hover:text-ink text-xs h-9 px-3"
                                onClick={() => openActionModal(r, "dismiss")}
                              >
                                Not Al / Kapat
                              </Button>
                            </>
                          ) : (
                            <>
                              {hasListing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-forest border-forest/30 bg-forest/5 font-semibold text-xs h-8 mb-1"
                                  onClick={() => handleInspectListing(r)}
                                >
                                  <Eye className="size-3.5 mr-1" /> İlanı İncele
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300 font-semibold text-xs h-9"
                                onClick={() => openActionModal(r, "delete_listing")}
                              >
                                <Trash2 className="size-3.5 mr-1" /> İlanı Kaldır & Çöz
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted hover:text-ink text-xs h-9 px-3"
                                onClick={() => openActionModal(r, "dismiss")}
                              >
                                İhlal Yok
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-end text-xs font-semibold text-muted gap-1">
                          <CheckCircle className="size-3.5 text-emerald-600" />
                          <span>
                            {r.status === "cozuldu"
                              ? isApp
                                ? "İncelendi & Çözüldü"
                                : "İlan Kaldırıldı & Çözüldü"
                              : "İhlal Görülmedi (Kapatıldı)"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* MASAÜSTÜ TABLOSU */}
              <div className="hidden md:block w-full max-w-full overflow-x-auto min-w-0">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted">
                    <tr className="border-b border-line">
                      <th className="pb-3 font-semibold min-w-[240px]">Şikayet Nedeni & Açıklama</th>
                      <th className="pb-3 font-semibold">Bildiren Üye</th>
                      <th className="pb-3 font-semibold min-w-[200px]">İlgili Hedef / İlan</th>
                      <th className="pb-3 font-semibold">Tarih</th>
                      <th className="pb-3 font-semibold">Durum</th>
                      <th className="pb-3 font-semibold text-right min-w-[220px]">Moderasyon Aksiyonu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {rows.map((r) => {
                      const isApp =
                        r.type.includes("Uygulama") ||
                        r.targetId === "takasla_app" ||
                        r.target.includes("Uygulama");
                      const hasListing = listings.some(
                        (l) => l.id === r.targetId || l.title.toLowerCase() === r.target.toLowerCase()
                      );

                      return (
                        <tr key={r.id} className="hover:bg-shell/30 transition-colors">
                          {/* 1. Şikayet Nedeni & Açıklama */}
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                                isApp
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                  : "bg-rose-50 text-rose-800 border-rose-200/80"
                              }`}>
                                {isApp ? <Sparkles className="size-3 text-emerald-600" /> : <AlertCircle className="size-3 text-rose-600" />}
                                {r.subject}
                              </span>
                              <span className="text-[11px] text-muted">{r.type}</span>
                            </div>

                            {r.detail && (
                              <div className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 text-xs text-amber-950 max-w-[360px]">
                                <span className="font-bold text-[10.5px] uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-0.5">
                                  <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                                  Kullanıcı Notu:
                                </span>
                                <p className="font-medium leading-relaxed italic text-ink/90">
                                  &ldquo;{r.detail}&rdquo;
                                </p>
                              </div>
                            )}
                          </td>

                          {/* 2. Bildiren Üye */}
                          <td className="py-4">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="size-3.5 text-muted" />
                              <span className="font-medium text-ink">{r.reporter}</span>
                            </div>
                          </td>

                          {/* 3. İlgili Hedef / İlan */}
                          <td className="py-4">
                            {isApp ? (
                              <div>
                                <div className="flex items-center gap-1.5 font-semibold text-forest">
                                  <Smartphone className="size-4 shrink-0" />
                                  <span>Takasla Mobil Uygulama</span>
                                </div>
                                <span className="text-[11px] text-muted">Sistem / Geri Bildirimi</span>
                              </div>
                            ) : (
                              <div>
                                <p className="font-semibold text-ink line-clamp-1">{r.target}</p>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`h-7 px-2.5 text-xs ${
                                      hasListing
                                        ? "text-forest bg-forest/5 hover:bg-forest/10 border-forest/30 font-semibold"
                                        : "text-muted border-line opacity-75"
                                    }`}
                                    onClick={() => handleInspectListing(r)}
                                    title="İlanın fotoğraflarını ve tüm bilgilerini aç"
                                  >
                                    <Eye className="size-3.5 mr-1" />
                                    İlanı İncele
                                  </Button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 4. Tarih */}
                          <td className="py-4 text-xs text-muted whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {r.created}
                            </div>
                          </td>

                          {/* 5. Durum */}
                          <td className="py-4 whitespace-nowrap">
                            {r.status === "acik" ? (
                              <StatusChip tone="warn">Açık Dosya</StatusChip>
                            ) : r.status === "cozuldu" ? (
                              <StatusChip tone="ok">Çözüldü</StatusChip>
                            ) : (
                              <StatusChip tone="mute">İhlal Görülmedi</StatusChip>
                            )}
                          </td>

                          {/* 6. Moderasyon Aksiyonları */}
                          <td className="py-4 text-right whitespace-nowrap">
                            {r.status === "acik" ? (
                              isApp ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    className="text-white bg-forest hover:bg-forest/90 font-semibold text-xs"
                                    onClick={() => openActionModal(r, "resolve_feedback")}
                                    title="Bildirimi incele ve kullanıcıya teşekkür ilet"
                                  >
                                    <CheckCircle2 className="size-3.5 mr-1" /> İncelendi & Çöz
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted hover:text-ink text-xs"
                                    onClick={() => openActionModal(r, "dismiss")}
                                    title="Bildirimi not al ve kapat"
                                  >
                                    <Check className="size-3.5 mr-1" /> Not Alındı
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300 font-semibold text-xs"
                                    onClick={() => openActionModal(r, "delete_listing")}
                                    title="İlanı kalıcı sil ve şikayetçiye teşekkür bildirimi ilet"
                                  >
                                    <Trash2 className="size-3.5 mr-1" /> İlanı Kaldır & Çöz
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-muted hover:text-ink text-xs"
                                    onClick={() => openActionModal(r, "dismiss")}
                                    title="İlanı elleme, şikayetçiye kural ihlali görülmediği bildir"
                                  >
                                    <XCircle className="size-3.5 mr-1" /> İhlal Yok
                                  </Button>
                                </div>
                              )
                            ) : r.status === "cozuldu" ? (
                              <div className="flex items-center justify-end gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle className="size-3.5" />
                                <span>{isApp ? "İncelendi & Çözüldü" : "İlan Kaldırıldı & Çözüldü"}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 text-xs font-medium text-muted">
                                <Check className="size-3.5" />
                                <span>İhlal Görülmedi (Kapatıldı)</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* =========================================================
          1. ŞİKAYET EDİLEN İLANI İNCELEME MODALI
          ========================================================= */}
      {inspectListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[94vh] sm:max-h-[90vh] w-full max-w-2xl lg:max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6 sm:py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                  <AlertTriangle className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-ink truncate">{inspectListing.title}</h3>
                    <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 shrink-0">
                      Şikayet Edilen İlan
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate">İlan ID: {inspectListing.id} · Sahibi: {inspectListing.ownerName}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectListing(null)}
                className="rounded-lg p-1 text-muted hover:bg-shell hover:text-ink shrink-0"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {/* Modal İçerik (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {/* Fotoğraf Galerisi */}
              {inspectListing.images && inspectListing.images.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-xl border border-line bg-black/5 dark:bg-black/20 flex items-center justify-center">
                    <img
                      src={inspectListing.images[inspectPhotoIndex] || inspectListing.images[0]}
                      alt={inspectListing.title}
                      className="size-full object-contain"
                    />
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
                      {inspectPhotoIndex + 1} / {inspectListing.images.length}
                    </span>
                  </div>
                  {inspectListing.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {inspectListing.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setInspectPhotoIndex(idx)}
                          className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                            inspectPhotoIndex === idx
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
                  <p className="text-xs sm:text-sm">Bu ilan için fotoğraf yüklenmemiş.</p>
                </div>
              )}

              {/* Bilgi Izgarası */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">İlan Sahibi</span>
                  <p className="mt-0.5 font-semibold text-sm text-ink">{inspectListing.ownerName}</p>
                  <p className="text-xs text-muted font-mono mt-0.5 flex items-center gap-1">
                    <Phone className="size-3 text-muted" /> {inspectListing.ownerPhone}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">Kategori & Durum</span>
                  <p className="mt-0.5 font-semibold text-sm text-ink">{inspectListing.category}</p>
                  <p className="text-xs text-muted mt-0.5">Kondisyon: {inspectListing.condition}</p>
                </div>
                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">Konum & Eklenme</span>
                  <p className="mt-0.5 font-semibold text-sm text-ink flex items-center gap-1">
                    <MapPin className="size-3.5 text-muted" /> {inspectListing.city}
                  </p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="size-3 text-muted" /> {inspectListing.created}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-shell/30 p-3">
                  <span className="text-[11px] font-medium text-muted">Yayın Durumu</span>
                  <div className="mt-1">
                    <StatusChip tone={inspectListing.status === "approved" || inspectListing.status === "yayinda" ? "ok" : "warn"}>
                      {inspectListing.status === "approved" || inspectListing.status === "yayinda" ? "Yayında" : inspectListing.status}
                    </StatusChip>
                  </div>
                </div>
              </div>

              {/* Takas Tercihi */}
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <ArrowLeftRight className="size-3.5 text-emerald-700" />
                  İstenen Takas Seçeneği
                </span>
                <p className="mt-1 text-sm font-semibold text-emerald-950">{inspectListing.wants}</p>
              </div>

              {/* Açıklama */}
              <div className="rounded-xl border border-line bg-shell/20 p-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Ürün Açıklaması</span>
                <p className="mt-1.5 whitespace-pre-wrap text-xs sm:text-sm text-ink/90 leading-relaxed max-h-36 overflow-y-auto">
                  {inspectListing.description || "Açıklama girilmemiş."}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-line bg-shell/30 px-4 py-3 sm:px-6 sm:py-3">
              <Button variant="outline" size="sm" onClick={() => setInspectListing(null)} className="w-full sm:w-auto">
                Kapat
              </Button>
              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="destructive"
                  className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
                  onClick={() => {
                    const relatedReport = reports.find((r) => r.targetId === inspectListing.id || r.target === inspectListing.title);
                    if (relatedReport) {
                      setInspectListing(null);
                      openActionModal(relatedReport, "delete_listing");
                    } else {
                      toast.error("Bu ilana bağlı aktif şikayet kaydı bulunamadı.");
                    }
                  }}
                >
                  <Trash2 className="size-3.5 mr-1" /> Bu İlanı Kaldır & Şikayeti Çöz
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          2. ŞİKAYETİ ÇÖZME / KAPATMA & KULLANICIYA BİLDİRİM MODALI
          ========================================================= */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div
                className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${
                  actionModal.action === "delete_listing"
                    ? "bg-rose-50 text-rose-600 ring-rose-200"
                    : actionModal.action === "resolve_feedback"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-slate-100 text-slate-700 ring-slate-200"
                }`}
              >
                {actionModal.action === "delete_listing" ? (
                  <Trash2 className="size-5" />
                ) : actionModal.action === "resolve_feedback" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <CheckCircle className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-ink">
                  {actionModal.action === "delete_listing"
                    ? "İlanı Kaldır ve Şikayeti Çöz"
                    : actionModal.action === "resolve_feedback"
                      ? "Geri Bildirimi Yanıtla & Çöz"
                      : "Şikayeti Kapat (İhlal Tespit Edilmedi)"}
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Bildiren: <strong className="text-ink font-semibold">{actionModal.report.reporter}</strong> · Hedef: <strong className="text-ink font-semibold">{actionModal.report.target}</strong>
                </p>
              </div>
            </div>

            {/* Bilgilendirme Bannerı */}
            <div
              className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${
                actionModal.action === "delete_listing"
                  ? "border-rose-200 bg-rose-50/70 text-rose-900"
                  : actionModal.action === "resolve_feedback"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {actionModal.action === "delete_listing" ? (
                <p className="flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    İlgili ilan sistemden tamamen silinecektir ve şikayet eden üyeye teşekkür ve durum bildirimi iletilecektir.
                  </span>
                </p>
              ) : actionModal.action === "resolve_feedback" ? (
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>
                    İlettiği öneri veya sorun bildirimi için kullanıcıya teşekkür bildirimi gönderilecek ve dosya çözüldü olarak kapatılacaktır.
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-2">
                  <Check className="size-4 shrink-0 text-slate-600 mt-0.5" />
                  <span>
                    Bildirim incelendi ve not alındı olarak işaretlenecek ve dosya kapatılacaktır.
                  </span>
                </p>
              )}
            </div>

            {/* Bildirim Önizlemesi & Düzenleme */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                Kullanıcıya İletilecek Mobil Bildirim Mesajı:
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-line bg-shell/50 p-3 text-xs sm:text-sm text-ink outline-none focus:ring-2 focus:ring-forest"
                placeholder="Kullanıcıya gidecek mesaj..."
              />
              <p className="mt-1 text-[10.5px] text-muted">
                Bu mesaj, şikayeti ileten üyenin mobil bildirim menüsüne anında düşecektir.
              </p>
            </div>

            {/* Butonlar */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isActionSubmitting}
                onClick={() => setActionModal(null)}
              >
                Vazgeç
              </Button>
              <Button
                size="sm"
                disabled={isActionSubmitting}
                className={
                  actionModal.action === "delete_listing"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-forest hover:bg-forest/90 text-white"
                }
                onClick={handleConfirmAction}
              >
                {isActionSubmitting ? (
                  "İşleniyor..."
                ) : actionModal.action === "delete_listing" ? (
                  <>
                    <Trash2 className="size-3.5 mr-1.5" /> İlanı Kaldır ve Bildir
                  </>
                ) : actionModal.action === "resolve_feedback" ? (
                  <>
                    <CheckCircle2 className="size-3.5 mr-1.5" /> İncelendi Olarak Çöz & Bildir
                  </>
                ) : (
                  <>
                    <Check className="size-3.5 mr-1.5" /> Şikayeti Kapat ve Bildir
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
            <p className="text-xs text-muted mt-1">{listings.filter((l) => l.status === "approved" || l.status === "yayinda").length} aktif yayında</p>
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
