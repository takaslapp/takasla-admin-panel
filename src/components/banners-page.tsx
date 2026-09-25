import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Compass,
  User,
  PlusCircle,
  MessageSquare,
  Package,
  ExternalLink,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  UploadCloud,
  CheckCircle2,
  ImageIcon,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
  Link as LinkIcon,
  X,
  Check,
} from "lucide-react";
import { AdminShell, Panel } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import {
  Banner,
  BannerTargetType,
  TARGET_TYPE_LABELS,
  fetchAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  deleteBannerImageByUrl,
  toggleBannerActive,
  uploadBannerImage,
} from "@/lib/banners";

export function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetType, setTargetType] = useState<BannerTargetType>("explore");
  const [targetValue, setTargetValue] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Silme Onay Modalı
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAllBanners();
      setBanners(data);
    } catch (err: any) {
      toast.error("Bannerlar yüklenirken hata oluştu: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingBanner(null);
    setTitle("");
    setImageUrl("");
    setTargetType("explore");
    setTargetValue("");
    setDisplayOrder(banners.length + 1);
    setIsActive(true);
    setUploadFile(null);
    setImagePreview("");
    setImageDimensions(null);
    setModalOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setImageUrl(banner.image_url);
    setTargetType(banner.target_type);
    setTargetValue(banner.target_value || "");
    setDisplayOrder(banner.display_order);
    setIsActive(banner.is_active);
    setUploadFile(null);
    setImagePreview(banner.image_url);
    setImageDimensions(null);
    setModalOpen(true);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, WebP).");
      return;
    }

    setUploadFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    // Boyutları kontrol et
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imagePreview && !imageUrl) {
      toast.error("Lütfen 1200x400 boyutunda bir banner görseli yükleyin veya URL girin.");
      return;
    }

    if (TARGET_TYPE_LABELS[targetType]?.requiresValue && !targetValue.trim()) {
      toast.error("Seçtiğiniz hedef türü için hedef değer (Link veya İlan ID) zorunludur.");
      return;
    }

    setSubmitting(true);
    let newlyUploadedUrl: string | null = null;
    try {
      let finalImageUrl = imageUrl;

      // Eğer yeni bir dosya seçildiyse Cloudflare R2'ye yükle
      if (uploadFile) {
        setIsUploading(true);
        toast.info("Görsel Cloudflare R2'ye yükleniyor...");
        const result = await uploadBannerImage(uploadFile);
        finalImageUrl = result.url;
        newlyUploadedUrl = result.url;
        setIsUploading(false);
      }

      if (editingBanner) {
        const oldImageUrl = editingBanner.image_url;
        await updateBanner(editingBanner.id, {
          title: title.trim(),
          image_url: finalImageUrl,
          target_type: targetType,
          target_value: targetValue.trim() || null,
          display_order: Number(displayOrder) || 0,
          is_active: isActive,
        });

        // 🛡️ REPLACEMENT CLEANUP: Update başarılı olduktan SONRA eski görsel R2 veya storage ise sil
        if (uploadFile && oldImageUrl && oldImageUrl !== finalImageUrl) {
          deleteBannerImageByUrl(oldImageUrl).catch((e) =>
            console.warn("Eski banner görseli temizlenirken hata:", e)
          );
        }

        toast.success("Banner başarıyla güncellendi.");
      } else {
        await createBanner({
          title: title.trim(),
          image_url: finalImageUrl,
          target_type: targetType,
          target_value: targetValue.trim() || null,
          display_order: Number(displayOrder) || 0,
          is_active: isActive,
        });
        toast.success("Yeni banner başarıyla oluşturuldu.");
      }

      setModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      // 🛡️ ORPHAN CLEANUP: Eğer yeni bir görsel R2'ye yüklendikten sonra DB insert/update patlarsa,
      // yetim kalmaması için yeni yüklenen R2 görselini güvenle temizle
      if (newlyUploadedUrl) {
        deleteBannerImageByUrl(newlyUploadedUrl).catch((e) =>
          console.warn("Orphan banner görseli temizlenirken hata:", e)
        );
      }
      toast.error("İşlem başarısız: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const nextState = !banner.is_active;
    // İyimser UI
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, is_active: nextState } : b))
    );
    try {
      await toggleBannerActive(banner.id, nextState);
      toast.success(nextState ? "Banner yayına alındı." : "Banner yayından kaldırıldı.");
    } catch (_err: any) {
      toast.error("Durum güncellenirken hata oluştu.");
      loadData(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBanner(deleteTarget.id, deleteTarget.image_url);
      setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success("Banner silindi.");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error("Banner silinemedi: " + (err?.message || "Bilinmeyen hata"));
    }
  };

  const handleOrderChange = async (banner: Banner, direction: "up" | "down") => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const targetBanner = banners[targetIndex];
    const newOrderCurrent = targetBanner.display_order;
    const newOrderTarget = banner.display_order === targetBanner.display_order
      ? direction === "up" ? banner.display_order - 1 : banner.display_order + 1
      : banner.display_order;

    try {
      await updateBanner(banner.id, { display_order: newOrderCurrent });
      await updateBanner(targetBanner.id, { display_order: newOrderTarget });
      await loadData(true);
      toast.success("Banner sırası güncellendi.");
    } catch (_err) {
      toast.error("Sıra güncellenemedi.");
    }
  };

  // İstatistikler
  const activeCount = useMemo(() => banners.filter((b) => b.is_active).length, [banners]);
  const passiveCount = useMemo(() => banners.length - activeCount, [banners, activeCount]);

  const renderTargetIcon = (type: BannerTargetType) => {
    switch (type) {
      case "explore":
        return <Compass className="size-3.5 text-blue-500" />;
      case "profile":
        return <User className="size-3.5 text-purple-500" />;
      case "create_listing":
        return <PlusCircle className="size-3.5 text-lime-600" />;
      case "messages":
        return <MessageSquare className="size-3.5 text-emerald-500" />;
      case "listing_detail":
        return <Package className="size-3.5 text-amber-500" />;
      case "external_url":
        return <ExternalLink className="size-3.5 text-cyan-500" />;
      case "none":
      default:
        return <EyeOff className="size-3.5 text-zinc-400" />;
    }
  };

  return (
    <AdminShell
      kicker="Mobil Uygulama Yönetimi"
      title="Banner Yönetimi"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              loadData();
            }}
            disabled={isRefreshing || loading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button
            onClick={openCreateModal}
            size="sm"
            className="gap-1.5 bg-[#84CC16] hover:bg-[#72b013] text-black font-semibold shadow-sm"
          >
            <Plus className="size-4" />
            Yeni Banner Ekle
          </Button>
        </div>
      }
    >
      <div className="grid gap-6">
        {/* Üst Bilgi & Metrik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-card p-4 sm:p-5 ring-1 ring-line/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted">Toplam Banner</span>
              <Layers className="size-4 text-muted" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-ink">{banners.length}</p>
            <span className="text-xs text-muted">Uygulamada kayıtlı görsel sayısı</span>
          </div>

          <div className="rounded-2xl bg-card p-4 sm:p-5 ring-1 ring-line/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted">Yayında (Aktif)</span>
              <CheckCircle2 className="size-4 text-[#84CC16]" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#84CC16]">{activeCount}</p>
            <span className="text-xs text-muted">Anasayfada carousel'de dönen</span>
          </div>

          <div className="rounded-2xl bg-card p-4 sm:p-5 ring-1 ring-line/50 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-muted">Yayında Olmayan</span>
              <EyeOff className="size-4 text-zinc-400" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-400">{passiveCount}</p>
            <span className="text-xs text-muted">Taslak veya durdurulmuş</span>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-lime-500/10 via-card to-card p-4 sm:p-5 ring-1 ring-[#84CC16]/30 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-[#84CC16]">Görsel Standardı</span>
              <Sparkles className="size-4 text-[#84CC16]" />
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-ink">1200 × 400 px</p>
            <span className="text-xs text-muted">3:1 en boy oranı (Retina HD)</span>
          </div>
        </div>

        {/* Banner Listesi */}
        <Panel
          title="Anasayfa Bannerları"
          subtitle="Kullanıcılar uygulamayı açtığında tepe kısmında 6 saniyede bir otomatik kayan promosyon kartları."
        >
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="size-8 animate-spin mx-auto text-[#84CC16]" />
              <p className="mt-3 text-sm text-muted">Bannerlar yükleniyor...</p>
            </div>
          ) : banners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-8 sm:p-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-shell text-muted">
                <ImageIcon className="size-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">Henüz banner eklenmemiş</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted max-w-sm mx-auto">
                Admin panelden 1200x400 boyutunda banner yükleyerek Keşfet, Profil veya istediğiniz sayfaya yönlendirme yapabilirsiniz.
              </p>
              <Button
                onClick={openCreateModal}
                size="sm"
                className="mt-4 gap-1.5 bg-[#84CC16] hover:bg-[#72b013] text-black font-semibold"
              >
                <Plus className="size-4" />
                İlk Bannerı Ekle
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {banners.map((banner, index) => {
                const targetConfig = TARGET_TYPE_LABELS[banner.target_type] || TARGET_TYPE_LABELS.none;
                return (
                  <div
                    key={banner.id}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-shell/40 ring-1 transition-all hover:shadow-md ${
                      banner.is_active ? "ring-line/70" : "ring-line/30 opacity-70"
                    }`}
                  >
                    <div>
                      {/* 1200x400 Orantılı Görsel Önizleme (3:1) */}
                      <div className="relative aspect-[3/1] w-full overflow-hidden bg-zinc-900">
                        <img
                          src={banner.image_url}
                          alt={banner.title || "Banner"}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                        {/* Sıra & Durum Rozetleri */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
                            #{banner.display_order}
                          </span>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${
                              banner.is_active
                                ? "bg-emerald-500/90 text-white shadow-sm"
                                : "bg-zinc-700/80 text-zinc-300"
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${banner.is_active ? "bg-white animate-pulse" : "bg-zinc-400"}`} />
                            {banner.is_active ? "Yayında" : "Pasif"}
                          </span>
                        </div>

                        {/* Sıralama Okları */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-0.5 ring-1 ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOrderChange(banner, "up")}
                            disabled={index === 0}
                            className="p-1 text-white/80 hover:text-white disabled:opacity-30"
                            title="Yukarı taşı"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderChange(banner, "down")}
                            disabled={index === banners.length - 1}
                            className="p-1 text-white/80 hover:text-white disabled:opacity-30"
                            title="Aşağı taşı"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>

                        {/* Banner Başlığı */}
                        {banner.title && (
                          <div className="absolute bottom-2 left-3 right-3 truncate">
                            <span className="text-xs font-semibold text-white drop-shadow-md">
                              {banner.title}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bilgiler & Tıklama Aksiyonu */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                              Tıklama Hedefi
                            </span>
                            <div className="mt-1 flex items-center gap-1.5">
                              {renderTargetIcon(banner.target_type)}
                              <span className="text-sm font-semibold text-ink">
                                {targetConfig.label}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(banner)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ring-1 ${
                              banner.is_active
                                ? "bg-lime-500/10 text-lime-700 dark:text-lime-400 ring-lime-500/30 hover:bg-lime-500/20"
                                : "bg-shell text-muted ring-line hover:text-ink"
                            }`}
                          >
                            {banner.is_active ? "Yayından Al" : "Yayına Al"}
                          </button>
                        </div>

                        {/* Hedef Değer Varsa Göster */}
                        {banner.target_value && (
                          <div className="rounded-xl bg-card px-3 py-2 text-xs font-mono text-muted ring-1 ring-line/40 truncate flex items-center gap-2">
                            <LinkIcon className="size-3 shrink-0 text-muted" />
                            <span className="truncate">{banner.target_value}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center justify-end gap-1.5 border-t border-line/40 p-3 bg-card/40">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(banner)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Edit2 className="size-3" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(banner)}
                        className="h-8 gap-1 text-xs text-bad hover:bg-bad/10 hover:border-bad/30"
                      >
                        <Trash2 className="size-3" />
                        Sil
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* BANNER EKLE / DÜZENLE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-card p-5 sm:p-6 shadow-2xl ring-1 ring-line overflow-hidden">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-ink">
                  {editingBanner ? "Bannerı Düzenle" : "Yeni Banner Ekle"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  1200x400 banner görseli ve tıklandığında açılacak hedef sayfayı belirleyin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-shell hover:text-ink transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form İçerik (Kaydırılabilir) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* 1. 1200x400 Görsel Yükleme & Önizleme Alanı */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wider">
                  Banner Görseli (1200 × 400 px) <span className="text-bad">*</span>
                </label>

                {/* Önizleme Alanı */}
                <div className="relative aspect-[3/1] w-full overflow-hidden rounded-2xl bg-zinc-900 ring-2 ring-[#84CC16]/30 shadow-inner flex items-center justify-center group">
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Önizleme"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-black/80 text-white border-white/20 hover:bg-black"
                        >
                          Görseli Değiştir
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-zinc-800/80 transition-colors w-full h-full"
                    >
                      <UploadCloud className="size-8 text-[#84CC16] animate-bounce" />
                      <p className="mt-2 text-xs sm:text-sm font-semibold text-zinc-200">
                        1200x400 Banner Görseli Seç veya Sürükle
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        PNG, JPG, WebP formatları (Maks. 5MB)
                      </p>
                    </div>
                  )}

                  {/* Oran Rozeti */}
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white/90">
                    3:1 Oran (1200x400)
                  </span>
                </div>

                {/* Boyut Bilgisi / İpucu */}
                {imageDimensions && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <CheckCircle2 className="size-3.5 text-[#84CC16]" />
                    <span>
                      Görsel boyutu: <strong className="text-ink">{imageDimensions.width} × {imageDimensions.height} px</strong>
                      {Math.abs(imageDimensions.width / imageDimensions.height - 3) > 0.2 && (
                        <span className="text-warn ml-1">
                          (Uyarı: 3:1 oranından farklı, kenarlardan kırpılabilir)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Gizli Dosya Seçici */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                {/* Alternatif: Doğrudan URL Girişi */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">Veya doğrudan görsel URL'si girin:</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#84CC16] hover:underline font-medium text-xs"
                    >
                      Dosyadan Seç
                    </button>
                  </div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (!uploadFile) setImagePreview(e.target.value);
                    }}
                    placeholder="https://... (Örn: R2 veya CDN URL'si)"
                    className="w-full rounded-xl bg-shell px-3 py-2 text-xs text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  />
                </div>
              </div>

              {/* 2. Banner Başlığı (Opsiyonel / Admin Referansı) */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Banner Başlığı / Notu (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Bahar Takas Festivali, Keşfet Kampanyası..."
                  className="w-full rounded-xl bg-shell px-3.5 py-2.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                />
              </div>

              {/* 3. Tıklama Aksiyonu / Hedef Sayfa (User Requirement: Mesela Profil, Keşfet vb.) */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-2 uppercase tracking-wider">
                  Kullanıcı Tıklayınca Hangi Sayfaya Gitsin? <span className="text-bad">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(TARGET_TYPE_LABELS) as BannerTargetType[]).map((type) => {
                    const item = TARGET_TYPE_LABELS[type];
                    const selected = targetType === type;
                    return (
                      <div
                        key={type}
                        onClick={() => setTargetType(type)}
                        className={`flex items-start gap-3 rounded-xl p-3 cursor-pointer ring-1 transition-all ${
                          selected
                            ? "bg-lime-500/10 ring-2 ring-[#84CC16] text-ink"
                            : "bg-shell/40 ring-line/50 hover:bg-shell/70 text-muted"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">{renderTargetIcon(type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${selected ? "text-ink" : "text-ink/80"}`}>
                            {item.label}
                          </p>
                          <p className="text-[11px] text-muted leading-tight mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        {selected && (
                          <div className="size-4 rounded-full bg-[#84CC16] flex items-center justify-center shrink-0">
                            <Check className="size-3 text-black stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Hedef Değer Girişi (İlan ID veya Web Linki Gerekiyorsa) */}
              {TARGET_TYPE_LABELS[targetType]?.requiresValue && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    {targetType === "listing_detail" ? "İlan ID'si (UUID)" : "Web Adresi (URL)"} <span className="text-bad">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={TARGET_TYPE_LABELS[targetType]?.placeholder}
                    required
                    className="w-full rounded-xl bg-shell px-3.5 py-2.5 text-sm font-mono text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    {targetType === "listing_detail"
                      ? "Kullanıcı banner'a bastığında bu ilanın detay ekranı açılır."
                      : "Kullanıcı banner'a bastığında bu web bağlantısı harici tarayıcıda açılır."}
                  </p>
                </div>
              )}

              {/* 5. Sıralama & Aktiflik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line/40">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Görüntülenme Sırası
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl bg-shell px-3.5 py-2.5 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  />
                  <span className="text-[11px] text-muted">Küçük numaralı bannerlar önce gösterilir</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Yayın Durumu
                  </label>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? "bg-[#84CC16]" : "bg-zinc-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-medium text-ink">
                      {isActive ? "Aktif (Yayında)" : "Pasif (Gizli)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Aksiyon Butonları */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || isUploading}
                  className="bg-[#84CC16] hover:bg-[#72b013] text-black font-semibold min-w-[120px]"
                >
                  {submitting ? (
                    <RefreshCw className="size-4 animate-spin mr-2" />
                  ) : null}
                  {editingBanner ? "Güncelle" : "Bannerı Kaydet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line space-y-4">
            <div className="flex items-center gap-3 text-bad">
              <div className="p-2.5 rounded-full bg-bad/10">
                <Trash2 className="size-5" />
              </div>
              <h3 className="text-base font-bold text-ink">Bannerı Silmek İstiyor musunuz?</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted">
              Bu banner mobil uygulama anasayfasından kaldırılacak ve geri alınamaz.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                className="bg-bad hover:bg-bad/90 text-white font-semibold"
              >
                Evet, Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
