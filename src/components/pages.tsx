import {
  AlertCircle,
  ArrowLeftRight,
  Check,
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
   2. İLANLAR SAYFASI (Çok Aşamalı Onay, Revizyon & Moderasyon)
   ========================================================================= */
export function ListingsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const listings = useAdminStore((s) => s.listings);
  const approveListing = useAdminStore((s) => s.approveListing);
  const requestRevision = useAdminStore((s) => s.requestRevision);
  const rejectListing = useAdminStore((s) => s.rejectListing);
  const deleteListing = useAdminStore((s) => s.deleteListing);

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "revision_requested" | "rejected">("all");

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
  const pendingCount = useMemo(() => listings.filter((l) => l.status === "pending").length, [listings]);
  const approvedCount = useMemo(() => listings.filter((l) => l.status === "approved" || l.status === "yayinda").length, [listings]);
  const revisionCount = useMemo(() => listings.filter((l) => l.status === "revision_requested").length, [listings]);
  const rejectedCount = useMemo(() => listings.filter((l) => l.status === "rejected" || l.status === "reddedildi").length, [listings]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      let matchTab = true;
      if (activeTab === "pending") matchTab = l.status === "pending";
      else if (activeTab === "approved") matchTab = l.status === "approved" || l.status === "yayinda";
      else if (activeTab === "revision_requested") matchTab = l.status === "revision_requested";
      else if (activeTab === "rejected") matchTab = l.status === "rejected" || l.status === "reddedildi";

      const matchSearch =
        `${l.title} ${l.ownerName} ${l.ownerPhone} ${l.category} ${l.city} ${l.wants} ${l.description}`
          .toLowerCase()
          .includes(q.toLowerCase());

      return matchTab && matchSearch;
    });
  }, [listings, activeTab, q]);

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

  // Reddetme Açma (Sadece onay bekleyenler ve revize istenenler için)
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

  // Silme İşlemi Başlat
  const handleOpenDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  // Silme Onaylama
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteListing(deleteTarget.id);
      toast.success(`"${deleteTarget.title}" başlıklı ilan sistemden kalıcı olarak silindi.`);
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
              Tümü ({listings.length})
            </Button>
            <Button
              variant={activeTab === "pending" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("pending")}
              className={pendingCount > 0 ? "border-amber-400 bg-amber-50/60 text-amber-900 hover:bg-amber-100" : ""}
            >
              Onay Bekleyenler ({pendingCount})
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === "approved" ? "dark" : "outline"}
              size="sm"
              onClick={() => setActiveTab("approved")}
            >
              Yayında ({approvedCount})
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

        <Panel title="İlan Listesi" subtitle={`${filtered.length} ilan listeleniyor`}>
          <Toolbar value={q} onChange={setQ} placeholder="İlan başlığı, sahibi, kategori, şehir veya takas tercihi ara..." />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="pb-3 font-semibold">Ürün & Görsel</th>
                  <th className="pb-3 font-semibold">İlan Sahibi</th>
                  <th className="pb-3 font-semibold">Kategori & Durum</th>
                  <th className="pb-3 font-semibold">Takas Tercihi</th>
                  <th className="pb-3 font-semibold">Moderasyon Durumu</th>
                  <th className="pb-3 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      Bu filtreleme kriterine uygun ilan bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const hasPhotos = l.images && l.images.length > 0;
                    const mainPhoto = hasPhotos ? l.images[0] : null;

                    return (
                      <tr key={l.id} className="hover:bg-shell/30 transition-colors group">
                        {/* 1. Ürün & Görsel */}
                        <td className="py-3.5 max-w-[280px]">
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
                                className="font-semibold text-ink line-clamp-1 cursor-pointer hover:text-forest hover:underline"
                              >
                                {l.title}
                              </p>
                              <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                <MapPin className="size-3" /> {l.city} · <Clock className="size-3" /> {l.created}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. İlan Sahibi */}
                        <td className="py-3.5">
                          <p className="font-medium text-ink/90">{l.ownerName}</p>
                          <p className="text-xs text-muted font-mono">{l.ownerPhone}</p>
                        </td>

                        {/* 3. Kategori & Durum */}
                        <td className="py-3.5">
                          <span className="inline-flex rounded-full bg-shell px-2.5 py-0.5 text-xs font-medium text-ink">
                            {l.category}
                          </span>
                          <p className="text-[11px] text-muted mt-0.5">{l.condition}</p>
                        </td>

                        {/* 4. Takas Tercihi */}
                        <td className="py-3.5 max-w-[200px]">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-900 bg-emerald-50/80 rounded-lg px-2 py-1.5 border border-emerald-200/60">
                            <ArrowLeftRight className="size-3 text-emerald-700 shrink-0" />
                            <span className="line-clamp-2">{l.wants}</span>
                          </div>
                        </td>

                        {/* 5. Moderasyon Durumu */}
                        <td className="py-3.5">
                          {l.status === "pending" ? (
                            <div>
                              <StatusChip tone="warn">Onay Bekliyor</StatusChip>
                              <span className="block text-[11px] text-amber-700 mt-0.5 font-medium">İnceleme Gerekli</span>
                            </div>
                          ) : l.status === "revision_requested" ? (
                            <div>
                              <StatusChip tone="warn">Revize İstendi</StatusChip>
                              {l.adminNote && (
                                <p className="text-[10.5px] text-amber-900 line-clamp-1 mt-0.5 italic" title={l.adminNote}>
                                  &ldquo;{l.adminNote}&rdquo;
                                </p>
                              )}
                            </div>
                          ) : l.status === "approved" || l.status === "yayinda" ? (
                            <StatusChip tone="ok">Yayında</StatusChip>
                          ) : (
                            <div>
                              <StatusChip tone="bad">Reddedildi</StatusChip>
                              {l.adminNote && (
                                <p className="text-[10.5px] text-rose-800 line-clamp-1 mt-0.5 italic" title={l.adminNote}>
                                  &ldquo;{l.adminNote}&rdquo;
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. İşlemler */}
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* İncele Butonu */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-ink/70 hover:text-ink"
                              onClick={() => {
                                setPreviewListing(l);
                                setSelectedPhotoIndex(0);
                              }}
                              title="Tüm Detayları ve Fotoğrafları İncele"
                            >
                              <Eye className="size-4" />
                            </Button>

                            {/* DURUMA GÖRE AKSİYONLAR */}
                            {l.status === "pending" ? (
                              <>
                                {/* Onayla */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                                  onClick={() => handleApprove(l.id, l.title)}
                                  title="İlanı Onayla ve Yayına Al"
                                >
                                  <Check className="size-3.5 mr-1" /> Onayla
                                </Button>
                                {/* Düzenleme İste */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                                  onClick={() => handleOpenRevision(l)}
                                  title="Kullanıcıdan Düzenleme İste"
                                >
                                  <Edit3 className="size-3.5 mr-1" /> Düzenleme İste
                                </Button>
                                {/* Reddet */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-700 hover:bg-rose-50 border-rose-200"
                                  onClick={() => handleOpenReject(l)}
                                  title="İlanı Reddet"
                                >
                                  <XCircle className="size-3.5 mr-1" /> Reddet
                                </Button>
                              </>
                            ) : l.status === "approved" || l.status === "yayinda" ? (
                              <>
                                {/* YAYINDAKİ İLAN İÇİN ASLA REDDET YOK! SADECE DÜZENLEME İSTE VE SİL */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-800 bg-amber-50/70 hover:bg-amber-100 border-amber-300"
                                  onClick={() => handleOpenRevision(l)}
                                  title="Kullanıcıya Düzenleme İsteği Gönder"
                                >
                                  <Edit3 className="size-3.5 mr-1" /> Düzenleme İste
                                </Button>
                              </>
                            ) : l.status === "revision_requested" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                  onClick={() => handleApprove(l.id, l.title)}
                                  title="İlanı Doğrudan Onayla"
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
                                  <Edit3 className="size-3.5 mr-1" /> Notu Güncelle
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-700 hover:bg-rose-50 border-rose-200"
                                  onClick={() => handleOpenReject(l)}
                                  title="İlanı Reddet"
                                >
                                  <XCircle className="size-3.5 mr-1" /> Reddet
                                </Button>
                              </>
                            ) : (
                              /* Reddedildi */
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                onClick={() => handleApprove(l.id, l.title)}
                                title="Tekrar Yayına Al"
                              >
                                <RotateCcw className="size-3.5 mr-1" /> Yayına Al
                              </Button>
                            )}

                            {/* Kalıcı Sil Butonu */}
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
                    {previewListing.status === "pending" ? (
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

            {/* Modal Footer (Aksiyon Butonları - Responsive) */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-line bg-shell/30 px-4 py-3 sm:px-6 sm:py-3">
              <Button variant="outline" size="sm" onClick={() => setPreviewListing(null)} className="w-full sm:w-auto">
                Kapat
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                {previewListing.status === "pending" ? (
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
                    {/* YAYINDAKİ İLANLAR İÇİN SADECE DÜZENLEME İSTE VE SİL */}
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
          2. DÜZENLEME İSTEĞİ MODALI (Kullanıcıya Bildirim Gider)
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

            {/* Hızlı Şablonlar */}
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

            {/* Revizyon Notu Textarea */}
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
          3. REDDETME MODALI (Sadece Onay Bekleyenler için)
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

            {/* Hızlı Red Şablonları */}
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
          4. SİTE TARZINDA KALICI SİLME ONAY MODALI
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

            {/* Uyarı Kutusu */}
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
