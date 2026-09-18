import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Bell,
  Send,
  Smartphone,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  Heart,
  RefreshCw,
  Search,
  MessageSquare,
  ChevronRight,
  Filter,
  Layers,
  Check,
  Megaphone,
  Radio,
  Trash2,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { AdminShell, Panel, StatusChip } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import {
  sendBroadcastAnnouncement,
  sendTargetedAnnouncement,
  fetchFcmStats,
  getAnnouncementHistory,
  deleteAnnouncementFromHistory,
  deleteMultipleAnnouncementsFromHistory,
  clearAllAnnouncementHistory,
  type AnnouncementRecord,
} from "@/lib/fcm";

interface TemplateItem {
  id: string;
  category: "bayram" | "yas" | "sistem" | "kampanya";
  icon: string;
  label: string;
  title: string;
  body: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "ramazan",
    category: "bayram",
    icon: "🍬",
    label: "Ramazan Bayramı",
    title: "Ramazan Bayramınız Kutlu Olsun! 🍬",
    body: "Sevdiklerinizle birlikte sağlıklı, huzurlu ve bereketli bir bayram geçirmenizi dileriz. Takasla ailesi iyi bayramlar diler!",
  },
  {
    id: "kurban",
    category: "bayram",
    icon: "🐑",
    label: "Kurban Bayramı",
    title: "Kurban Bayramınız Kutlu Olsun! 🐑",
    body: "Tüm İslam aleminin ve Takasla ailesinin Kurban Bayramı'nı tebrik eder, sağlık, huzur ve esenlikler dileriz.",
  },
  {
    id: "cumhuriyet",
    category: "bayram",
    icon: "🇹🇷",
    label: "29 Ekim Cumhuriyet",
    title: "Cumhuriyet Bayramımız Kutlu Olsun! 🇹🇷",
    body: "Cumhuriyetimizin kurucusu Gazi Mustafa Kemal Atatürk ve silah arkadaşlarını saygı, minnet ve rahmetle anıyoruz.",
  },
  {
    id: "zafer",
    category: "bayram",
    icon: "🇹🇷",
    label: "30 Ağustos Zafer",
    title: "30 Ağustos Zafer Bayramımız Kutlu Olsun! 🇹🇷",
    body: "Büyük Taarruz ve Zafer Bayramımızın yıl dönümünde milletimizin bağımsızlık meşalesini gururla selamlıyoruz.",
  },
  {
    id: "yas_afet",
    category: "yas",
    icon: "🖤",
    label: "Milli Yas & Afet Başsağlığı",
    title: "Milletimizin Başı Sağ Olsun 🖤",
    body: "Meydana gelen elim hadisede hayatını kaybeden vatandaşlarımıza Allah'tan rahmet, yaralılarımıza acil şifalar diliyoruz. Kalbimiz sizinle.",
  },
  {
    id: "yas_taziye",
    category: "yas",
    icon: "🖤",
    label: "Taziye & Başsağlığı",
    title: "Derin Üzüntü İçindeyiz 🖤",
    body: "Yaşanan acı hadiseyi büyük bir üzüntüyle öğrenmiş bulunuyoruz. Vefat edenlere rahmet, kederli ailelerine sabır ve metanet dileriz.",
  },
  {
    id: "guncelleme",
    category: "sistem",
    icon: "🚀",
    label: "Yeni Sürüm Güncellemesi",
    title: "Takasla'da Yeni Bir Sürüm Yayında! 🎉",
    body: "Daha akıcı bir deneyim ve yeni özellikler için uygulamayı App Store / Google Play üzerinden güncellemeyi unutmayın!",
  },
  {
    id: "bakim",
    category: "sistem",
    icon: "⚙️",
    label: "Planlı Sistem Bakımı",
    title: "Sistem Bakımı Bilgilendirmesi ⚙️",
    body: "Sizlere daha kaliteli ve kesintisiz hizmet sunmak amacıyla bu gece kısa süreli bir altyapı iyileştirmesi yapılacaktır.",
  },
  {
    id: "haftasonu",
    category: "kampanya",
    icon: "✨",
    label: "Hafta Sonu Takas Zamanı",
    title: "Hafta Sonu Takas Zamanı! ✨",
    body: "Evinizdeki eşyaları değerlendirmenin tam vakti. Yeni eklenen ilanları keşfet ve ilk takas teklifini anında yap!",
  },
  {
    id: "ilan_ver",
    category: "kampanya",
    icon: "🤝",
    label: "İlk İlanını Oluştur",
    title: "İlanını Ver, Takaslamaya Başla! 🤝",
    body: "Paraya gerek yok! İhtiyaç duymadığın bir ürünü yükle, binlerce ilan arasından beğendiğin eşyalarla kolayca takasla.",
  },
];

const QUICK_EMOJIS = ["🍬", "🐑", "🇹🇷", "🖤", "📢", "🚀", "🎉", "✨", "🤝", "💬", "⚠️", "🔔"];

export function NotificationsPage() {
  const [stats, setStats] = useState<{
    totalTokens: number;
    totalUsers: number;
    iosDevices: number;
    androidDevices: number;
  }>({
    totalTokens: 0,
    totalUsers: 0,
    iosDevices: 0,
    androidDevices: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Form durumları
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "targeted">("all");
  const [targetUser, setTargetUser] = useState("");
  const [inAppNotif, setInAppNotif] = useState(true);
  const [activeCategory, setActiveCategory] = useState<"all" | "bayram" | "yas" | "sistem" | "kampanya">("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Gönderim ve Modal Durumları
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [history, setHistory] = useState<AnnouncementRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [previewMode, setPreviewMode] = useState<"lockscreen" | "banner">("lockscreen");

  // Geçmiş Bildirim Silme Durumları
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [deleteHistoryTarget, setDeleteHistoryTarget] = useState<{ id: string; title: string } | null>(null);
  const [showClearAllHistoryModal, setShowClearAllHistoryModal] = useState(false);
  const [showBulkDeleteHistoryModal, setShowBulkDeleteHistoryModal] = useState(false);

  const loadData = async () => {
    setIsLoadingStats(true);
    try {
      const s = await fetchFcmStats();
      setStats(s);
      setHistory(getAnnouncementHistory());
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectTemplate = (t: TemplateItem) => {
    setTitle(t.title);
    setBody(t.body);
    setSelectedTemplateId(t.id);
    toast.info(`"${t.label}" şablonu yüklendi.`);
  };

  const handleInsertEmoji = (emoji: string) => {
    setTitle((prev) => `${prev} ${emoji}`.trim());
  };

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "all") return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.body.toLowerCase().includes(q) ||
        (h.targetUser && h.targetUser.toLowerCase().includes(q)),
    );
  }, [history, historySearch]);

  const handleSendTrigger = () => {
    if (!title.trim()) {
      toast.error("Lütfen bildirim başlığı girin.");
      return;
    }
    if (!body.trim()) {
      toast.error("Lütfen bildirim mesajı girin.");
      return;
    }
    if (targetType === "targeted" && !targetUser.trim()) {
      toast.error("Lütfen hedef kullanıcı adı (@kullanici) veya ID girin.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);

    const toastId = toast.loading(
      targetType === "all"
        ? "Tüm cihazlara bildirim gönderiliyor..."
        : `${targetUser} kullanıcısına gönderiliyor...`,
    );

    try {
      if (targetType === "all") {
        const res = await sendBroadcastAnnouncement({
          title: title.trim(),
          body: body.trim(),
          inAppNotification: inAppNotif,
        });

        if (res.success) {
          toast.success(
            `Bildirim başarıyla gönderildi! (${res.devicesReached} cihaza ulaşıldı)`,
            { id: toastId },
          );
          setTitle("");
          setBody("");
          setSelectedTemplateId(null);
          setHistory(getAnnouncementHistory());
        } else {
          toast.error(
            `Gönderim hatası: ${res.error || "FCM servisi yanıt vermedi"}`,
            { id: toastId },
          );
        }
      } else {
        const res = await sendTargetedAnnouncement({
          userIdOrUsername: targetUser.trim(),
          title: title.trim(),
          body: body.trim(),
          inAppNotification: inAppNotif,
        });

        if (res.success) {
          toast.success(
            `Bildirim @${res.targetUser?.username || res.targetUser?.fullName} kullanıcısına iletildi (${res.devicesReached} cihaz)!`,
            { id: toastId },
          );
          setTitle("");
          setBody("");
          setTargetUser("");
          setSelectedTemplateId(null);
          setHistory(getAnnouncementHistory());
        } else {
          toast.error(`Kullanıcıya gönderilemedi: ${res.error}`, {
            id: toastId,
          });
        }
      }
    } catch (err: any) {
      toast.error(`Hata oluştu: ${err?.message || "Bilinmeyen hata"}`, {
        id: toastId,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleReapplyHistory = (h: AnnouncementRecord) => {
    setTitle(h.title);
    setBody(h.body);
    if (h.targetType === "targeted" && h.targetUser) {
      setTargetType("targeted");
      setTargetUser(h.targetUser);
    } else {
      setTargetType("all");
      setTargetUser("");
    }
    toast.info("Geçmiş duyuru forma yüklendi.");
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  // Geçmiş Seçim İşlemleri
  const isAllHistorySelected =
    filteredHistory.length > 0 &&
    filteredHistory.every((h) => selectedHistoryIds.includes(h.id));

  const isSomeHistorySelected =
    filteredHistory.some((h) => selectedHistoryIds.includes(h.id)) &&
    !isAllHistorySelected;

  const handleToggleSelectAllHistory = () => {
    if (isAllHistorySelected) {
      const filteredIdSet = new Set(filteredHistory.map((h) => h.id));
      setSelectedHistoryIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const filteredIds = filteredHistory.map((h) => h.id);
      setSelectedHistoryIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectHistory = (id: string) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Tekil Geçmiş Kaydı Sil
  const handleDeleteSingleHistory = (id: string, title: string) => {
    setDeleteHistoryTarget({ id, title });
  };

  const handleConfirmDeleteSingleHistory = () => {
    if (!deleteHistoryTarget) return;
    const updated = deleteAnnouncementFromHistory(deleteHistoryTarget.id);
    setHistory(updated);
    setSelectedHistoryIds((prev) => prev.filter((id) => id !== deleteHistoryTarget.id));
    setDeleteHistoryTarget(null);
    toast.success("Bildirim kaydı geçmişten silindi.");
  };

  // Toplu Geçmiş Kaydı Sil
  const handleConfirmBulkDeleteHistory = () => {
    if (selectedHistoryIds.length === 0) return;
    const count = selectedHistoryIds.length;
    const updated = deleteMultipleAnnouncementsFromHistory(selectedHistoryIds);
    setHistory(updated);
    setSelectedHistoryIds([]);
    setShowBulkDeleteHistoryModal(false);
    toast.success(`${count} adet bildirim geçmişten silindi.`);
  };

  // Tüm Geçmişi Temizle
  const handleConfirmClearAllHistory = () => {
    clearAllAnnouncementHistory();
    setHistory([]);
    setSelectedHistoryIds([]);
    setShowClearAllHistoryModal(false);
    toast.success("Tüm bildirim geçmişi temizlendi.");
  };

  return (
    <AdminShell
      kicker="Mobil İletişim & Duyuru Merkezi"
      title="Toplu Bildirim & Duyuru Yönetimi"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoadingStats}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoadingStats ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      }
    >
      <div className="grid gap-6">
        {/* KPI İstatistik Kartları */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Kayıtlı Cihazlar</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent-fg">
                <Smartphone className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
              {stats.totalTokens}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {stats.iosDevices} iOS · {stats.androidDevices} Android
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Takasla Üyeleri</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <Users className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
              {stats.totalUsers}
            </p>
            <p className="mt-0.5 text-[11px] text-forest font-medium">
              Aktif Profil Sayısı
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Yayın Kanalı</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700">
                <Radio className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-ink">
              FCM HTTP v1
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Topic: <span className="font-semibold">all_users</span>
            </p>
          </div>

          <div className="rounded-2xl border border-line/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Gönderilenler</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                <Clock className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
              {history.length}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Toplam Duyuru Kaydı
            </p>
          </div>
        </div>

        {/* Hazır Şablonlar Paneli */}
        <Panel
          title="Hazır Bildirim Şablonları"
          subtitle="Bayramlar, milli günler, başsağlığı veya sistem duyuruları için tek tıkla mesajı doldurun"
        >
          {/* Kategori Filtre Butonları */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line/60 pb-3 mb-4">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeCategory === "all"
                  ? "bg-forest text-card"
                  : "bg-shell/80 text-forest hover:bg-shell"
              }`}
            >
              Tüm Şablonlar ({TEMPLATES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("bayram")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeCategory === "bayram"
                  ? "bg-forest text-card"
                  : "bg-shell/80 text-forest hover:bg-shell"
              }`}
            >
              🍬 Bayramlar & Kutlamalar
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("yas")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeCategory === "yas"
                  ? "bg-forest text-card"
                  : "bg-shell/80 text-forest hover:bg-shell"
              }`}
            >
              🖤 Başsağlığı & Taziye
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("sistem")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeCategory === "sistem"
                  ? "bg-forest text-card"
                  : "bg-shell/80 text-forest hover:bg-shell"
              }`}
            >
              ⚙️ Güncelleme & Bakım
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("kampanya")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeCategory === "kampanya"
                  ? "bg-forest text-card"
                  : "bg-shell/80 text-forest hover:bg-shell"
              }`}
            >
              ✨ Takas & Kampanyalar
            </button>
          </div>

          {/* Şablon Kartları Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3 transition-all hover:border-forest/40 hover:bg-shell/50 hover:shadow-sm ${
                    isSelected
                      ? "border-forest bg-forest/5 ring-2 ring-forest/20"
                      : "border-line/60 bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{t.icon}</span>
                      {isSelected ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-forest text-card">
                          <Check className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-2 text-xs font-bold text-ink group-hover:text-forest">
                      {t.label}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted">
                      {t.body}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold text-forest">
                    <span>Şablonu Seç</span>
                    <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Ana Gönderim Alanı: Sol Form / Sağ Canlı Simülatör */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sol Kolon: Bildirim Formu */}
          <div className="lg:col-span-7">
            <Panel
              title="Bildirim Oluşturucu"
              subtitle="Başlık, mesaj ve hedef kitleyi belirleyin"
            >
              <div className="space-y-4">
                {/* Hedef Kitle Seçici */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Hedef Kitle
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetType("all")}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        targetType === "all"
                          ? "border-forest bg-forest text-card shadow-sm"
                          : "border-line/70 bg-shell/40 text-forest hover:bg-shell"
                      }`}
                    >
                      <Megaphone className="size-4" />
                      <span>Tüm Kullanıcılar (Toplu Yayın)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType("targeted")}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                        targetType === "targeted"
                          ? "border-forest bg-forest text-card shadow-sm"
                          : "border-line/70 bg-shell/40 text-forest hover:bg-shell"
                      }`}
                    >
                      <Users className="size-4" />
                      <span>Belirli Bir Kullanıcı</span>
                    </button>
                  </div>
                </div>

                {/* Tekil Hedef Alanı */}
                {targetType === "targeted" ? (
                  <div className="rounded-xl border border-line/60 bg-shell/30 p-3">
                    <label className="text-xs font-semibold text-ink">
                      Kullanıcı Adı veya Kullanıcı ID
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-muted">@</span>
                      <input
                        type="text"
                        placeholder="ornek_kullanici veya UUID"
                        value={targetUser}
                        onChange={(e) => setTargetUser(e.target.value)}
                        className="w-full rounded-lg border border-line/70 bg-card px-3 py-2 text-xs font-medium text-ink focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Bildirim sadece bu kullanıcının kayıtlı cihazlarına iletilir.
                    </p>
                  </div>
                ) : null}

                {/* Bildirim Başlığı */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Bildirim Başlığı
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        title.length > 40 ? "text-warn" : "text-muted"
                      }`}
                    >
                      {title.length}/45
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Örn: Ramazan Bayramınız Kutlu Olsun! 🍬"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line/70 bg-card px-3.5 py-2.5 text-sm font-semibold text-ink placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                  {/* Hızlı Emoji Ekleyici */}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-medium text-muted mr-1">
                      Hızlı Emoji:
                    </span>
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="rounded-md bg-shell/70 px-1.5 py-0.5 text-xs hover:bg-shell hover:scale-110 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bildirim Mesajı (Body) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Bildirim Mesajı (Açıklama)
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        body.length > 120 ? "text-warn" : "text-muted"
                      }`}
                    >
                      {body.length}/140
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={150}
                    placeholder="Bildirim açıklaması... (Kilit ekranında okunabilir netlikte olmalıdır)"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="mt-1.5 w-full resize-none rounded-xl border border-line/70 bg-card px-3.5 py-2.5 text-xs text-ink placeholder:text-muted/60 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>

                {/* Seçenekler */}
                <div className="rounded-xl border border-line/50 bg-shell/30 p-3 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inAppNotif}
                      onChange={(e) => setInAppNotif(e.target.checked)}
                      className="size-4 rounded border-line text-forest focus:ring-forest"
                    />
                    <div>
                      <span className="text-xs font-bold text-ink">
                        Uygulama İçi Bildirim Kutusu
                      </span>
                      <p className="text-[11px] text-muted">
                        Kullanıcının ana sayfadaki 🔔 zil butonuna bildirim kaydı ekler.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Butonlar */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTitle("");
                      setBody("");
                      setSelectedTemplateId(null);
                      setTargetUser("");
                    }}
                    disabled={isSending || (!title && !body)}
                  >
                    Temizle
                  </Button>

                  <Button
                    variant="dark"
                    onClick={handleSendTrigger}
                    disabled={isSending || !title.trim() || !body.trim()}
                    className="gap-2 px-6"
                  >
                    <Send className="size-4" />
                    <span>
                      {targetType === "all"
                        ? "Toplu Bildirimi Gönder"
                        : "Kullanıcıya Gönder"}
                    </span>
                  </Button>
                </div>
              </div>
            </Panel>
          </div>

          {/* Sağ Kolon: Canlı Telefon Simülatörü */}
          <div className="lg:col-span-5">
            <Panel
              title="Canlı Telefon Önizlemesi"
              subtitle="Bildirimin kullanıcının cihazında nasıl görüneceğini test edin"
              action={
                <div className="flex rounded-lg bg-shell p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("lockscreen")}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      previewMode === "lockscreen"
                        ? "bg-card text-forest shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Kilit Ekranı
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("banner")}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      previewMode === "banner"
                        ? "bg-card text-forest shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Banner
                  </button>
                </div>
              }
            >
              {/* Telefon Ekran Çerçevesi */}
              <div className="mx-auto max-w-[320px] overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-800 bg-black shadow-2xl">
                {/* Dynamic Island / Notch */}
                <div className="relative pt-3 pb-2 flex justify-center bg-black">
                  <div className="h-5 w-24 rounded-full bg-zinc-900 flex items-center justify-end px-2">
                    <div className="size-2 rounded-full bg-emerald-950 ring-1 ring-emerald-500/50" />
                  </div>
                </div>

                {/* Ekran İçi Görseli (Duvar Kağıdı) */}
                <div className="relative min-h-[360px] bg-gradient-to-b from-[#1a3a2e] via-[#0d221a] to-[#081510] px-4 py-5 text-white flex flex-col justify-between select-none">
                  {previewMode === "lockscreen" ? (
                    <>
                      {/* Saat & Tarih */}
                      <div className="text-center pt-2">
                        <div className="text-[11px] font-medium tracking-wide text-white/70">
                          15 Eylül Salı
                        </div>
                        <div className="font-display text-5xl font-light tracking-tight text-white/95">
                          09:41
                        </div>
                      </div>

                      {/* Bildirim Kartı (Kilit Ekranı) */}
                      <div className="my-auto">
                        <div className="rounded-2xl bg-white/20 p-3.5 shadow-lg backdrop-blur-md border border-white/20 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {/* Takasla Logo */}
                              <div className="flex size-5 items-center justify-center rounded-md bg-[#c1ea69] text-[#163228] font-black text-[10px] shadow-xs">
                                t
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                                Takasla
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-white/60">
                              şimdi
                            </span>
                          </div>

                          <div className="mt-1.5">
                            <h5 className="text-xs font-bold text-white leading-snug">
                              {title || "Yeni Bildirim Başlığı"}
                            </h5>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-white/80 line-clamp-3">
                              {body ||
                                "Burada bildirimin açıklaması ve detaylı metni yer alacaktır..."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Kilit Ekranı Alt İkonlar */}
                      <div className="flex items-center justify-between px-2 pt-4">
                        <div className="flex size-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                          <span className="text-xs">🔦</span>
                        </div>
                        <div className="h-1 w-24 rounded-full bg-white/40" />
                        <div className="flex size-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                          <span className="text-xs">📷</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Ön Plan Banner Modu */
                    <div className="pt-2">
                      <div className="rounded-2xl bg-[#c1ea69] p-3 text-[#163228] shadow-2xl border border-white/40 transition-all">
                        <div className="flex items-start gap-2.5">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#163228] text-[#c1ea69] font-black text-xs">
                            t
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="truncate text-xs font-bold">
                                {title || "Yeni Bildirim Başlığı"}
                              </h5>
                              <span className="text-[10px] text-[#163228]/70">
                                şimdi
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-[#163228]/85 line-clamp-2">
                              {body ||
                                "Burada ön planda kayarak açılan banner mesajı yer alacaktır."}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-12 text-center text-xs text-white/40">
                        Uygulama Açıkken Ön Plan Banner Görünümü
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* Gönderim Geçmişi Tablosu */}
        <Panel
          title="Duyuru & Bildirim Geçmişi"
          subtitle={`Daha önce gönderilmiş olan duyuruların listesi (${history.length} kayıt)${selectedHistoryIds.length > 0 ? ` · ${selectedHistoryIds.length} seçildi` : ""}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-40 sm:w-56">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Geçmişte ara..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full rounded-full border border-line/60 bg-card pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted/60 focus:border-forest focus:outline-none"
                />
              </div>

              {selectedHistoryIds.length > 0 ? (
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 h-8 px-3"
                  onClick={() => setShowBulkDeleteHistoryModal(true)}
                >
                  <Trash2 className="size-3.5" />
                  <span>Seçilenleri Sil ({selectedHistoryIds.length})</span>
                </Button>
              ) : history.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs h-8 px-2.5"
                  onClick={() => setShowClearAllHistoryModal(true)}
                  title="Tüm bildirim geçmişini temizle"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  <span>Geçmişi Temizle</span>
                </Button>
              ) : null}
            </div>
          }
        >
          {/* Toplu Seçim Bilgilendirme Çubuğu */}
          {selectedHistoryIds.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-xs text-rose-950">
              <span className="font-semibold">
                {selectedHistoryIds.length} adet duyuru kaydı seçildi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHistoryIds([])}
                  className="text-xs font-semibold text-rose-800 hover:underline"
                >
                  Seçimi Temizle
                </button>
              </div>
            </div>
          )}

          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <Megaphone className="mx-auto size-8 opacity-40 mb-2" />
              <p className="text-sm font-medium">
                Henüz kayıtlı bildirim geçmişi bulunmuyor.
              </p>
              <p className="mt-0.5 text-xs text-muted/70">
                Yukarıdaki formu kullanarak ilk toplu duyurunuzu gönderebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line/60 text-muted">
                    <th className="pb-2.5 pr-2 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={isAllHistorySelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeHistorySelected;
                        }}
                        onChange={handleToggleSelectAllHistory}
                        className="size-3.5 rounded border-line text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                        title="Tümünü Seç / Kaldır"
                      />
                    </th>
                    <th className="pb-2.5 font-semibold">Tarih</th>
                    <th className="pb-2.5 font-semibold">Başlık & Mesaj</th>
                    <th className="pb-2.5 font-semibold">Hedef Kitle</th>
                    <th className="pb-2.5 font-semibold">Cihaz Sayısı</th>
                    <th className="pb-2.5 font-semibold">Durum</th>
                    <th className="pb-2.5 text-right font-semibold pr-1">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 text-ink">
                  {filteredHistory.map((h) => {
                    const isSelected = selectedHistoryIds.includes(h.id);
                    return (
                      <tr
                        key={h.id}
                        className={`group transition-colors ${
                          isSelected ? "bg-rose-50/60" : "hover:bg-shell/40"
                        }`}
                      >
                        <td className="py-3 pr-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectHistory(h.id)}
                            className="size-3.5 rounded border-line text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            title="Kaydı Seç"
                          />
                        </td>
                        <td className="py-3 whitespace-nowrap text-muted font-medium">
                          {new Date(h.sentAt).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4 max-w-xs">
                          <p className="font-bold truncate text-ink">{h.title}</p>
                          <p className="text-[11px] text-muted truncate">{h.body}</p>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {h.targetType === "all" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">
                              <Megaphone className="size-3" />
                              Tüm Kullanıcılar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              <Users className="size-3" />
                              {h.targetUser || "Özel Kullanıcı"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-semibold">
                          {h.deviceCount} cihaz
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {h.status === "success" ? (
                            <StatusChip tone="ok">İletildi</StatusChip>
                          ) : (
                            <StatusChip tone="bad">Hata</StatusChip>
                          )}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap pr-1">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleReapplyHistory(h)}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-forest hover:bg-forest/10 transition-colors"
                            >
                              Tekrar Kullan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleHistory(h.id, h.title)}
                              className="rounded-lg p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Bu bildirimi geçmişten sil"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Onay Modalı (Modal) */}
      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line/80 animate-in fade-in zoom-in-95">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent/20 text-accent-fg mb-4">
              <Megaphone className="size-5" />
            </div>

            <h3 className="text-lg font-bold text-ink">
              {targetType === "all"
                ? "Toplu Bildirim Gönderilsin mi?"
                : "Özel Bildirim Gönderilsin mi?"}
            </h3>

            <p className="mt-1.5 text-xs text-muted leading-relaxed">
              {targetType === "all"
                ? `Bu bildirim platformdaki tüm aktif kullanıcılara ve kayıtlı ${stats.totalTokens} cihaza anlık Push Bildirim olarak iletilecektir.`
                : `Bu bildirim ${targetUser} kullanıcısının tüm cihazlarına anlık iletilecektir.`}
            </p>

            {/* Bildirim Özeti */}
            <div className="mt-4 rounded-xl border border-line/70 bg-shell/40 p-3 text-xs">
              <div className="font-bold text-ink">{title}</div>
              <div className="mt-0.5 text-muted line-clamp-2">{body}</div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSending}
              >
                Vazgeç
              </Button>
              <Button
                variant="dark"
                size="sm"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="gap-2"
              >
                <Send className="size-3.5" />
                <span>Evet, Hemen Gönder</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Tekil Geçmiş Bildirim Silme Modalı */}
      {deleteHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-ink">Bildirim Kaydını Sil</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  <span className="font-semibold text-ink">&ldquo;{deleteHistoryTarget.title}&rdquo;</span> başlıklı duyuru kaydını geçmişten silmek istediğinize emin misiniz?
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteHistoryTarget(null)}
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleConfirmDeleteSingleHistory}
              >
                <Trash2 className="size-3.5 mr-1.5" /> Evet, Kaydı Sil
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Geçmiş Bildirim Silme Modalı */}
      {showBulkDeleteHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-ink">Seçilen Bildirimleri Sil</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Seçilen <span className="font-bold text-rose-600">{selectedHistoryIds.length}</span> adet bildirim kaydını geçmişten silmek istediğinize emin misiniz?
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteHistoryModal(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleConfirmBulkDeleteHistory}
              >
                <Trash2 className="size-3.5 mr-1.5" /> Evet, {selectedHistoryIds.length} Kaydı Sil
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tüm Bildirim Geçmişini Temizleme Modalı */}
      {showClearAllHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-ink">Tüm Bildirim Geçmişini Temizle</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Gönderilmiş tüm duyuru ve bildirim geçmişi kalıcı olarak temizlenecektir. Bu işlem geri alınamaz.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearAllHistoryModal(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleConfirmClearAllHistory}
              >
                <Trash2 className="size-3.5 mr-1.5" /> Evet, Tümünü Temizle
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
