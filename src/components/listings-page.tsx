import { AlertTriangle, ArrowLeftRight, Check, Inbox, Package, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CompletedSwapPair, Listing } from "@/lib/data";
import { useAdminStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AdminShell } from "./admin-shell";
import { ListingDetailBody, ListingStatusBadge, ListingThumb } from "./listing-detail";
import { Badge, Callout, EmptyState, FilterTabs, PresetChips, SearchField, TextAreaField } from "./ui/kit";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

type Tab = "all" | "pending" | "approved" | "completed" | "ongoing" | "revision_requested" | "rejected";

type DisplayItem = { kind: "single"; listing: Listing } | { kind: "pair"; pair: CompletedSwapPair };

const REVISION_PRESETS = [
  "Lütfen ürünün daha net ve gerçek fotoğraflarını yükleyin.",
  "Açıklama alanına ürünün kullanım durumu ve kusurlarını belirtin.",
  "İstediğiniz takas seçeneklerini daha anlaşılır ve net yazın.",
  "Ürünün kategorisi veya seçilen durumu hatalı görünüyor.",
];

const REJECT_PRESETS = [
  "Platform kurallarına aykırı ürün veya içerik.",
  "Yanıltıcı veya sahte ilan içeriği.",
  "Nakit para / satış talebi (platform sadece takas içindir).",
];

const REMOVE_WARNING =
  "Bu işlem geri alınamaz. Bekleyen teklifler iptal edilir ve teklif sahiplerine 10 TakasPara iade edilir. Teklif geçmişi olan ilan sohbet kayıtları bozulmasın diye gizlenir; hiç teklif almamış ilan tamamen silinir.";

const isApproved = (l: Listing) => l.status === "approved" || l.status === "yayinda";
const isCompleted = (l: Listing) => l.status === "completed" || l.status === "takaslandi";

function initialTabFromUrl(): Tab {
  if (typeof window === "undefined") return "pending";
  const sekme = new URLSearchParams(window.location.search).get("sekme");
  if (sekme === "takaslananlar") return "completed";
  if (sekme === "devam-eden") return "ongoing";
  if (sekme === "onay-bekleyen") return "pending";
  if (sekme === "yayinda") return "approved";
  if (sekme === "tumu") return "all";
  return "pending";
}

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
  const [activeTab, setActiveTab] = useState<Tab>(initialTabFromUrl);

  // Toplu seçim
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pencereler
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [revisionListing, setRevisionListing] = useState<Listing | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [rejectListingItem, setRejectListingItem] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // İlan sahibine bildirimde gösterilen kaldırma nedeni (tekil ve toplu kaldırmada ortak)
  const [removeReason, setRemoveReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Detay çekmecesi açıkken ilan güncellenirse (onay, ret) güncel hali göster
  const liveListing = useMemo(
    () => (previewListing ? (listings.find((l) => l.id === previewListing.id) ?? previewListing) : null),
    [previewListing, listings],
  );

  // Sayılar (tamamlanan ve silinenler normal tekil listeden hariç tutulur)
  const uncompletedListings = useMemo(
    () => listings.filter((l) => l.status !== "completed" && l.status !== "takaslandi" && l.status !== "deleted"),
    [listings],
  );
  const pendingCount = useMemo(() => listings.filter((l) => l.status === "pending").length, [listings]);
  const approvedCount = useMemo(() => listings.filter(isApproved).length, [listings]);
  // Tamamlanan takaslar ile kabul edilmiş ama henüz bitmemiş (devam eden) takaslar ayrı tutulur
  const finishedPairs = useMemo(() => completedSwapPairs.filter((p) => p.status === "completed"), [completedSwapPairs]);
  const ongoingPairs = useMemo(() => completedSwapPairs.filter((p) => p.status !== "completed"), [completedSwapPairs]);
  const revisionCount = useMemo(() => listings.filter((l) => l.status === "revision_requested").length, [listings]);
  const rejectedCount = useMemo(() => listings.filter((l) => l.status === "rejected").length, [listings]);
  const totalDisplayCount = uncompletedListings.length + finishedPairs.length;

  const displayItems = useMemo<DisplayItem[]>(() => {
    const lowerQ = q.trim().toLowerCase();
    const matchSingle = (l: Listing) =>
      !lowerQ ||
      `${l.title} ${l.ownerName} ${l.ownerPhone} ${l.category} ${l.city} ${l.wants} ${l.description}`
        .toLowerCase()
        .includes(lowerQ);
    const matchPair = (p: CompletedSwapPair) =>
      !lowerQ ||
      `${p.itemA.title} ${p.itemA.ownerName} ${p.itemA.ownerPhone} ${p.itemA.city} ${p.itemA.category} ${p.itemB.title} ${p.itemB.ownerName} ${p.itemB.ownerPhone} ${p.itemB.city} ${p.itemB.category}`
        .toLowerCase()
        .includes(lowerQ);
    const singles = (pred: (l: Listing) => boolean) =>
      listings.filter((l) => pred(l) && matchSingle(l)).map((listing) => ({ kind: "single" as const, listing }));

    switch (activeTab) {
      case "pending":
        return singles((l) => l.status === "pending");
      case "approved":
        return singles(isApproved);
      case "revision_requested":
        return singles((l) => l.status === "revision_requested");
      case "rejected":
        return singles((l) => l.status === "rejected");
      case "completed":
        return finishedPairs.filter(matchPair).map((pair) => ({ kind: "pair" as const, pair }));
      case "ongoing":
        return ongoingPairs.filter(matchPair).map((pair) => ({ kind: "pair" as const, pair }));
      default: {
        // Tümü: takaslanmamışlar tekil, tamamlanan takaslar çift olarak
        const s: DisplayItem[] = uncompletedListings
          .filter(matchSingle)
          .map((listing) => ({ kind: "single" as const, listing }));
        const p: DisplayItem[] = finishedPairs.filter(matchPair).map((pair) => ({ kind: "pair" as const, pair }));
        return [...s, ...p];
      }
    }
  }, [listings, finishedPairs, ongoingPairs, uncompletedListings, activeTab, q]);

  const singleItems = useMemo(
    () => displayItems.filter((i): i is { kind: "single"; listing: Listing } => i.kind === "single").map((i) => i.listing),
    [displayItems],
  );
  const pairItems = useMemo(
    () =>
      displayItems
        .filter((i): i is { kind: "pair"; pair: CompletedSwapPair } => i.kind === "pair")
        .map((i) => i.pair),
    [displayItems],
  );

  // Toplu seçim (yalnızca tekil ilanlar seçilebilir)
  const isAllFilteredSelected = singleItems.length > 0 && singleItems.every((l) => selectedIds.includes(l.id));
  const isSomeFilteredSelected = singleItems.some((l) => selectedIds.includes(l.id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const ids = new Set(singleItems.map((l) => l.id));
      setSelectedIds((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...singleItems.map((l) => l.id)])));
    }
  };
  const handleToggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedListings = useMemo(() => {
    const idSet = new Set(selectedIds);
    return listings.filter((l) => idSet.has(l.id));
  }, [listings, selectedIds]);

  /* ---------------- İşlemler (mantık önceki sürümle aynı) ---------------- */

  const handleApprove = async (id: string, title: string) => {
    setBusyId(id);
    try {
      await approveListing(id);
      toast.success(`"${title}" başlıklı ilan başarıyla onaylandı ve vitrinde yayına alındı.`);
    } catch (err: any) {
      toast.error(`Onaylama hatası: ${err?.message || "İşlem tamamlanamadı"}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenRevision = (listing: Listing) => {
    setRevisionListing(listing);
    setRevisionNote(listing.adminNote || "");
  };

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
    } catch (err: any) {
      toast.error(`Düzenleme talebi gönderilemedi: ${err?.message || "İşlem başarısız"}`);
    }
  };

  const handleOpenReject = (listing: Listing) => {
    setRejectListingItem(listing);
    setRejectReason("Platform kurallarına uygun olmayan veya eksik içerik tespit edildi.");
  };

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
    } catch (err: any) {
      toast.error(`Reddetme işlemi başarısız: ${err?.message || "İşlem tamamlanamadı"}`);
    }
  };

  const handleOpenDelete = (id: string, title: string) => setDeleteTarget({ id, title });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteListing(deleteTarget.id, removeReason);
      toast.success(`"${deleteTarget.title}" başlıklı ilan yayından kaldırıldı.`);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      if (previewListing?.id === deleteTarget.id) setPreviewListing(null);
      setDeleteTarget(null);
      setRemoveReason("");
    } catch (err: any) {
      toast.error(`Silme işlemi başarısız: ${err?.message || "İşlem tamamlanamadı"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    const count = selectedIds.length;
    try {
      await deleteMultipleListings(selectedIds, removeReason);
      toast.success(`Seçilen ${count} ilan yayından kaldırıldı.`);
      if (previewListing && selectedIds.includes(previewListing.id)) setPreviewListing(null);
      setSelectedIds([]);
      setBulkDeleteModalOpen(false);
      setRemoveReason("");
    } catch (err: any) {
      toast.error(err?.message || "Toplu kaldırma tamamlanamadı.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /* ---------------- Görünüm ---------------- */

  const tabs = [
    { value: "all" as const, label: "Tümü", count: totalDisplayCount },
    { value: "pending" as const, label: "Onay bekleyen", count: pendingCount, attention: true },
    { value: "approved" as const, label: "Yayında", count: approvedCount },
    { value: "completed" as const, label: "Takaslananlar", count: finishedPairs.length },
    { value: "ongoing" as const, label: "Devam eden takaslar", count: ongoingPairs.length },
    { value: "revision_requested" as const, label: "Revizyon", count: revisionCount },
    { value: "rejected" as const, label: "Reddedilen", count: rejectedCount },
  ];

  const isPairTab = activeTab === "completed" || activeTab === "ongoing";
  const emptyText: Record<Tab, string> = {
    all: "Henüz ilan yok",
    pending: "Onay bekleyen ilan yok",
    approved: "Yayında ilan yok",
    completed: "Tamamlanan takas yok",
    ongoing: "Devam eden takas yok",
    revision_requested: "Düzenleme istenen ilan yok",
    rejected: "Reddedilen ilan yok",
  };

  const openPreview = (l: Listing) => setPreviewListing(l);

  return (
    <AdminShell compact kicker="Moderasyon" title="İlanlar">
      <div className="space-y-4">
        <FilterTabs items={tabs} value={activeTab} onChange={setActiveTab} ariaLabel="İlan durumu" />

        <SearchField
          value={q}
          onChange={setQ}
          placeholder={isPairTab ? "Ürün, sahip, şehir veya kategori ara" : "Başlık, sahip, kategori veya şehir ara"}
        />

        {/* Toplu işlem çubuğu */}
        {selectedIds.length > 0 ? (
          <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2.5 shadow-sm">
            <p className="text-sm font-medium text-ink">
              {selectedIds.length} ilan seçildi
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])}>
                Seçimi temizle
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteModalOpen(true)}>
                <Trash2 className="size-3.5" />
                Kaldır
              </Button>
            </div>
          </div>
        ) : null}

        {displayItems.length === 0 ? (
          <section className="rounded-2xl border border-line bg-card">
            <EmptyState
              icon={activeTab === "pending" ? Inbox : Package}
              title={q ? "Aramaya uygun kayıt yok" : emptyText[activeTab]}
              hint={
                q
                  ? "Farklı bir kelime dene."
                  : activeTab === "pending"
                    ? "Yeni ilanlar onaya düştüğünde burada görünecek."
                    : undefined
              }
              action={
                activeTab === "pending" && !q ? (
                  <Button variant="secondary" size="md" onClick={() => setActiveTab("all")}>
                    Tüm ilanlara bak
                  </Button>
                ) : undefined
              }
            />
          </section>
        ) : null}

        {/* TEKİL İLANLAR */}
        {singleItems.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-line bg-card">
            {/* Mobil: kartlar */}
            <ul className="divide-y divide-line lg:hidden">
              {singleItems.map((l) => {
                const selected = selectedIds.includes(l.id);
                return (
                  <li key={l.id} className={cn("flex gap-3 px-3 py-3", selected && "bg-bad-soft/40")}>
                    <label className="-m-1 flex shrink-0 items-start p-1 pt-5">
                      <span className="sr-only">Seç: {l.title}</span>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggleSelect(l.id)}
                        className="size-4 cursor-pointer accent-forest"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => openPreview(l)} className="flex w-full gap-3 text-left">
                        <ListingThumb listing={l} className="size-16" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{l.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {l.ownerName} · {l.city}
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <ListingStatusBadge status={l.status} />
                            <span className="text-xs text-muted">{l.created}</span>
                          </span>
                        </span>
                      </button>
                      {l.status === "pending" ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button variant="secondary" size="md" onClick={() => openPreview(l)}>
                            İncele
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            disabled={busyId === l.id}
                            onClick={() => handleApprove(l.id, l.title)}
                          >
                            <Check className="size-4" />
                            {busyId === l.id ? "Onaylanıyor…" : "Onayla"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Masaüstü: tablo */}
            <table className="hidden w-full table-fixed text-left text-sm lg:table">
              <thead className="border-b border-line bg-shell/50 text-xs text-muted">
                <tr>
                  <th className="w-12 px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Listelenen tümünü seç"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="size-4 cursor-pointer accent-forest"
                    />
                  </th>
                  <th className="px-2 py-2.5 font-medium">İlan</th>
                  <th className="w-40 px-2 py-2.5 font-medium">Sahibi</th>
                  <th className="hidden w-36 px-2 py-2.5 font-medium xl:table-cell">Eklenme</th>
                  <th className="w-36 px-2 py-2.5 font-medium">Durum</th>
                  <th className="w-44 px-4 py-2.5 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {singleItems.map((l) => {
                  const selected = selectedIds.includes(l.id);
                  return (
                    <tr
                      key={l.id}
                      onClick={() => openPreview(l)}
                      className={cn("cursor-pointer transition-colors hover:bg-shell/60", selected && "bg-bad-soft/40")}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Seç: ${l.title}`}
                          checked={selected}
                          onChange={() => handleToggleSelect(l.id)}
                          className="size-4 cursor-pointer accent-forest"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <ListingThumb listing={l} className="size-11" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{l.title}</p>
                            <p className="truncate text-xs text-muted">
                              {l.category} · {l.city}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <p className="truncate text-ink">{l.ownerName}</p>
                        <p className="truncate font-mono text-xs text-muted">{l.ownerPhone}</p>
                      </td>
                      <td className="hidden whitespace-nowrap px-2 py-3 text-xs text-muted xl:table-cell">{l.created}</td>
                      <td className="px-2 py-3">
                        <ListingStatusBadge status={l.status} />
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {l.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => openPreview(l)}>
                              İncele
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={busyId === l.id}
                              onClick={() => handleApprove(l.id, l.title)}
                            >
                              <Check className="size-3.5" />
                              Onayla
                            </Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => openPreview(l)}>
                            İncele
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {/* TAKAS ÇİFTLERİ */}
        {pairItems.length > 0 ? (
          <section className="space-y-2">
            {activeTab === "all" ? (
              <h2 className="px-1 pt-2 text-sm font-semibold text-ink">Tamamlanan takaslar</h2>
            ) : null}
            <ul className="grid gap-3 lg:grid-cols-2">
              {pairItems.map((pair) => (
                <SwapPairCard key={pair.id} pair={pair} onOpen={openPreview} />
              ))}
            </ul>
          </section>
        ) : null}

        {displayItems.length > 0 ? (
          <p className="px-1 text-xs text-muted">
            {isPairTab ? `${pairItems.length} takas` : `${displayItems.length} kayıt`} gösteriliyor
          </p>
        ) : null}
      </div>

      {/* İLAN DETAYI */}
      <Sheet
        open={!!liveListing}
        onClose={() => setPreviewListing(null)}
        title={liveListing?.title ?? ""}
        description={liveListing ? `${liveListing.ownerName} · ${liveListing.created}` : undefined}
        size="lg"
        footer={
          liveListing && !isCompleted(liveListing) ? (
            <ListingActions
              listing={liveListing}
              busy={busyId === liveListing.id}
              onApprove={() => handleApprove(liveListing.id, liveListing.title)}
              onRevision={() => handleOpenRevision(liveListing)}
              onReject={() => handleOpenReject(liveListing)}
              onRemove={() => handleOpenDelete(liveListing.id, liveListing.title)}
            />
          ) : null
        }
      >
        {liveListing ? (
          <>
            <ListingDetailBody listing={liveListing} />
            {!isCompleted(liveListing) ? (
              <div className="mt-6 border-t border-line pt-4 sm:hidden">
                <Button
                  variant="danger-outline"
                  size="md"
                  className="w-full"
                  onClick={() => handleOpenDelete(liveListing.id, liveListing.title)}
                >
                  <Trash2 className="size-4" />
                  İlanı kaldır
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </Sheet>

      {/* DÜZENLEME İSTEĞİ */}
      <Sheet
        variant="center"
        size="lg"
        open={!!revisionListing}
        onClose={() => setRevisionListing(null)}
        title="Düzenleme iste"
        description={revisionListing ? `“${revisionListing.title}”` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setRevisionListing(null)}>
              Vazgeç
            </Button>
            <Button variant="primary" size="md" onClick={handleConfirmRevision}>
              Düzenleme isteğini gönder
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            İlan yayından çekilir ve sahibine aşağıdaki not bildirim olarak gider. Sahibi düzenleyince ilan tekrar onaya
            düşer.
          </p>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Hazır notlar</p>
            <PresetChips presets={REVISION_PRESETS} onPick={setRevisionNote} />
          </div>
          <TextAreaField
            id="revision-note"
            label="İlan sahibine gidecek not"
            required
            value={revisionNote}
            onChange={setRevisionNote}
            rows={4}
            placeholder="Örn: Lütfen ürünün çalışan halini ve kutu içeriğini gösteren fotoğraflar ekleyin."
          />
        </div>
      </Sheet>

      {/* REDDETME */}
      <Sheet
        variant="center"
        size="lg"
        open={!!rejectListingItem}
        onClose={() => setRejectListingItem(null)}
        title="İlanı reddet"
        description={rejectListingItem ? `“${rejectListingItem.title}”` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setRejectListingItem(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" size="md" onClick={handleConfirmReject}>
              Reddet ve bildir
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            İlan yayında görünmez ve sahibine red nedeni bildirilir. İstersen daha sonra tekrar yayına alabilirsin.
          </p>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Hazır nedenler</p>
            <PresetChips presets={REJECT_PRESETS} onPick={setRejectReason} />
          </div>
          <TextAreaField
            id="reject-reason"
            label="Red nedeni (ilan sahibi görür)"
            required
            value={rejectReason}
            onChange={setRejectReason}
            rows={3}
          />
        </div>
      </Sheet>

      {/* TEKİL KALDIRMA */}
      <Sheet
        variant="center"
        open={!!deleteTarget}
        busy={isDeleting}
        onClose={() => {
          setDeleteTarget(null);
          setRemoveReason("");
        }}
        title="İlanı kaldır"
        description={deleteTarget ? `“${deleteTarget.title}”` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="md"
              disabled={isDeleting}
              onClick={() => {
                setDeleteTarget(null);
                setRemoveReason("");
              }}
            >
              Vazgeç
            </Button>
            <Button variant="destructive" size="md" disabled={isDeleting} onClick={handleConfirmDelete}>
              <Trash2 className="size-4" />
              {isDeleting ? "Kaldırılıyor…" : "Evet, kaldır"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextAreaField
            id="remove-reason-single"
            label="Kaldırma nedeni"
            hint="İlan sahibine bildirimle iletilir."
            value={removeReason}
            onChange={setRemoveReason}
            rows={2}
            maxLength={500}
            placeholder="Örn: Yasaklı ürün, yanıltıcı fotoğraf, kopya ilan"
          />
          <Callout tone="bad" icon={AlertTriangle}>
            {REMOVE_WARNING}
          </Callout>
        </div>
      </Sheet>

      {/* TOPLU KALDIRMA */}
      <Sheet
        variant="center"
        size="lg"
        open={bulkDeleteModalOpen}
        busy={isBulkDeleting}
        onClose={() => {
          setBulkDeleteModalOpen(false);
          setRemoveReason("");
        }}
        title={`${selectedIds.length} ilanı kaldır`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="md"
              disabled={isBulkDeleting}
              onClick={() => {
                setBulkDeleteModalOpen(false);
                setRemoveReason("");
              }}
            >
              Vazgeç
            </Button>
            <Button variant="destructive" size="md" disabled={isBulkDeleting} onClick={handleConfirmBulkDelete}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Kaldırılıyor…" : `Evet, ${selectedIds.length} ilanı kaldır`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {selectedListings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{l.title}</p>
                  <p className="truncate text-xs text-muted">
                    {l.ownerName} · {l.city}
                  </p>
                </div>
                <ListingStatusBadge status={l.status} />
              </li>
            ))}
          </ul>
          <TextAreaField
            id="remove-reason-bulk"
            label="Kaldırma nedeni"
            hint="Her ilanın sahibine bildirimle iletilir."
            value={removeReason}
            onChange={setRemoveReason}
            rows={2}
            maxLength={500}
            placeholder="Örn: Yasaklı ürün, yanıltıcı fotoğraf, kopya ilan"
          />
          <Callout tone="bad" icon={AlertTriangle}>
            Bu işlem geri alınamaz. Bekleyen teklifler iptal edilir ve teklif sahiplerine 10 TakasPara iade edilir. Devam
            eden veya tamamlanmış takası olan ilanlar kaldırılmaz.
          </Callout>
        </div>
      </Sheet>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */

function ListingActions({
  listing: l,
  busy,
  onApprove,
  onRevision,
  onReject,
  onRemove,
}: {
  listing: Listing;
  busy: boolean;
  onApprove: () => void;
  onRevision: () => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  const remove = (
    <Button variant="ghost" size="md" className="border-0 text-bad hover:bg-bad-soft" onClick={onRemove}>
      <Trash2 className="size-4" />
      İlanı kaldır
    </Button>
  );

  if (l.status === "pending" || l.status === "revision_requested") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
        <div className="hidden sm:mr-auto sm:block">{remove}</div>
        <Button variant="danger-outline" size="md" onClick={onReject}>
          Reddet
        </Button>
        <Button variant="secondary" size="md" onClick={onRevision}>
          {l.status === "revision_requested" ? "Notu güncelle" : "Düzenleme iste"}
        </Button>
        <Button variant="primary" size="md" className="col-span-2 sm:col-span-1" disabled={busy} onClick={onApprove}>
          <Check className="size-4" />
          {busy ? "Onaylanıyor…" : "Onayla ve yayınla"}
        </Button>
      </div>
    );
  }

  if (isApproved(l)) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
        <div className="hidden sm:mr-auto sm:block">{remove}</div>
        <Button variant="secondary" size="md" onClick={onRevision}>
          Düzenleme iste
        </Button>
        <Button variant="danger-outline" size="md" onClick={onReject}>
          Yayından çek
        </Button>
      </div>
    );
  }

  // Reddedilen
  return (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end">
      <div className="hidden sm:mr-auto sm:block">{remove}</div>
      <Button variant="primary" size="md" disabled={busy} onClick={onApprove}>
        {busy ? "Yayına alınıyor…" : "Tekrar yayına al"}
      </Button>
    </div>
  );
}

function SwapPairCard({ pair, onOpen }: { pair: CompletedSwapPair; onOpen: (l: Listing) => void }) {
  const accepted = pair.status === "accepted";
  const Side = ({ l }: { l: Listing }) => (
    <button
      type="button"
      onClick={() => onOpen(l)}
      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-shell/70"
    >
      <ListingThumb listing={l} className="size-12" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{l.title}</span>
        <span className="block truncate text-xs text-muted">{l.ownerName}</span>
      </span>
    </button>
  );
  return (
    <li className="rounded-2xl border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1.5">
        <Badge tone={accepted ? "warn" : "info"} dot>
          {accepted ? "Takas devam ediyor" : "Takas tamamlandı"}
        </Badge>
        <span className="text-xs text-muted">{pair.date}</span>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
        <Side l={pair.itemA} />
        <span className="grid size-7 shrink-0 place-items-center self-center rounded-full bg-shell text-forest">
          <ArrowLeftRight className="size-3.5 rotate-90 sm:rotate-0" />
        </span>
        <Side l={pair.itemB} />
      </div>
    </li>
  );
}
