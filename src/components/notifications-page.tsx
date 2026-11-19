import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { History, Megaphone, RefreshCw, Send, Trash2, User as UserIcon, Users } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge, Callout, EmptyState, SearchField } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { handle, UserAvatar } from "@/components/user-detail-sheet";
import { useAdminStore } from "@/lib/store";
import { cn } from "@/lib/utils";
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
  label: string;
  title: string;
  body: string;
}

const CATEGORY_LABEL: Record<TemplateItem["category"], string> = {
  bayram: "Bayram",
  yas: "Yas ve taziye",
  sistem: "Sistem",
  kampanya: "Kampanya",
};

const TEMPLATES: TemplateItem[] = [
  {
    id: "ramazan",
    category: "bayram",
    label: "Ramazan Bayramı",
    title: "Ramazan Bayramınız Kutlu Olsun! 🍬",
    body: "Sevdiklerinizle birlikte sağlıklı, huzurlu ve bereketli bir bayram geçirmenizi dileriz. Takasla ailesi iyi bayramlar diler!",
  },
  {
    id: "kurban",
    category: "bayram",
    label: "Kurban Bayramı",
    title: "Kurban Bayramınız Kutlu Olsun! 🐑",
    body: "Tüm İslam aleminin ve Takasla ailesinin Kurban Bayramı'nı tebrik eder, sağlık, huzur ve esenlikler dileriz.",
  },
  {
    id: "cumhuriyet",
    category: "bayram",
    label: "29 Ekim Cumhuriyet Bayramı",
    title: "Cumhuriyet Bayramımız Kutlu Olsun! 🇹🇷",
    body: "Cumhuriyetimizin kurucusu Gazi Mustafa Kemal Atatürk ve silah arkadaşlarını saygı, minnet ve rahmetle anıyoruz.",
  },
  {
    id: "zafer",
    category: "bayram",
    label: "30 Ağustos Zafer Bayramı",
    title: "30 Ağustos Zafer Bayramımız Kutlu Olsun! 🇹🇷",
    body: "Büyük Taarruz ve Zafer Bayramımızın yıl dönümünde milletimizin bağımsızlık meşalesini gururla selamlıyoruz.",
  },
  {
    id: "yas_afet",
    category: "yas",
    label: "Milli yas ve afet başsağlığı",
    title: "Milletimizin Başı Sağ Olsun 🖤",
    body: "Meydana gelen elim hadisede hayatını kaybeden vatandaşlarımıza Allah'tan rahmet, yaralılarımıza acil şifalar diliyoruz. Kalbimiz sizinle.",
  },
  {
    id: "yas_taziye",
    category: "yas",
    label: "Taziye ve başsağlığı",
    title: "Derin Üzüntü İçindeyiz 🖤",
    body: "Yaşanan acı hadiseyi büyük bir üzüntüyle öğrenmiş bulunuyoruz. Vefat edenlere rahmet, kederli ailelerine sabır ve metanet dileriz.",
  },
  {
    id: "guncelleme",
    category: "sistem",
    label: "Yeni sürüm güncellemesi",
    title: "Takasla'da Yeni Bir Sürüm Yayında! 🎉",
    body: "Daha akıcı bir deneyim ve yeni özellikler için uygulamayı App Store / Google Play üzerinden güncellemeyi unutmayın!",
  },
  {
    id: "bakim",
    category: "sistem",
    label: "Planlı sistem bakımı",
    title: "Sistem Bakımı Bilgilendirmesi ⚙️",
    body: "Sizlere daha kaliteli ve kesintisiz hizmet sunmak amacıyla bu gece kısa süreli bir altyapı iyileştirmesi yapılacaktır.",
  },
  {
    id: "haftasonu",
    category: "kampanya",
    label: "Hafta sonu takas zamanı",
    title: "Hafta Sonu Takas Zamanı! ✨",
    body: "Evinizdeki eşyaları değerlendirmenin tam vakti. Yeni eklenen ilanları keşfet ve ilk takas teklifini anında yap!",
  },
  {
    id: "ilan_ver",
    category: "kampanya",
    label: "İlk ilanını oluştur",
    title: "İlanını Ver, Takaslamaya Başla! 🤝",
    body: "Paraya gerek yok! İhtiyaç duymadığın bir ürünü yükle, binlerce ilan arasından beğendiğin eşyalarla kolayca takasla.",
  },
];

const QUICK_EMOJIS = ["🍬", "🐑", "🇹🇷", "🖤", "📢", "🚀", "🎉", "✨", "🤝", "💬", "⚠️", "🔔"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSentAt(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Telefonda görüneceği gibi sade bildirim önizlemesi */
function NotificationPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-ink/[0.06] p-3">
      <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-line">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <img src="/images/takasla-icon.jpg" alt="" className="size-5 rounded-md" />
          <span className="font-medium uppercase tracking-wide">Takasla</span>
          <span className="ml-auto">şimdi</span>
        </div>
        <p className={cn("mt-2 text-sm font-semibold text-ink", !title && "text-muted/60")}>
          {title || "Bildirim başlığı"}
        </p>
        <p className={cn("mt-0.5 text-sm leading-snug text-ink/80", !body && "text-muted/60")}>
          {body || "Bildirim mesajı burada görünür."}
        </p>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const [stats, setStats] = useState<{
    totalTokens: number;
    totalUsers: number;
    iosDevices: number;
    androidDevices: number;
  }>({ totalTokens: 0, totalUsers: 0, iosDevices: 0, androidDevices: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const users = useAdminStore((s) => s.users);
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "targeted">("all");
  const [targetUser, setTargetUser] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [inAppNotif, setInAppNotif] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (users.length === 0) fetchDashboardData();
  }, [users.length, fetchDashboardData]);

  // Kullanıcı sayfasından "Bildirim gönder" ile gelinirse kişi seçili açılır
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("kullanici");
    if (id && UUID_RE.test(id)) {
      setTargetType("targeted");
      setTargetUser(id);
    }
  }, []);

  const selectedUser = useMemo(() => {
    if (!targetUser.trim()) return null;
    const clean = targetUser.replace("@", "").trim().toLowerCase();
    return (
      users.find(
        (u) => u.id.toLowerCase() === clean || (u.username && u.username.toLowerCase().replace("@", "") === clean),
      ) || null
    );
  }, [targetUser, users]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase().replace("@", "").trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)),
    );
  }, [users, userSearchQuery]);

  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [history, setHistory] = useState<AnnouncementRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");

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

  const scrollToComposer = () =>
    document.getElementById("bildirim-olusturucu")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleSelectTemplate = (t: TemplateItem) => {
    setTitle(t.title);
    setBody(t.body);
    setTemplatesOpen(false);
    toast.info(`"${t.label}" şablonu yüklendi.`);
  };

  const handleInsertEmoji = (emoji: string) => setTitle((prev) => `${prev} ${emoji}`.trim());

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
      toast.error("Lütfen bildirim gönderilecek hedef kullanıcıyı seçin.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);

    const targetDisplayName = selectedUser ? `${selectedUser.name}` : targetUser;
    const toastId = toast.loading(
      targetType === "all" ? "Tüm cihazlara bildirim gönderiliyor..." : `${targetDisplayName} kullanıcısına gönderiliyor...`,
    );

    try {
      if (targetType === "all") {
        const res = await sendBroadcastAnnouncement({
          title: title.trim(),
          body: body.trim(),
          inAppNotification: inAppNotif,
        });
        if (res.success) {
          toast.success(`Bildirim başarıyla gönderildi! (${res.devicesReached} cihaza ulaşıldı)`, { id: toastId });
          setTitle("");
          setBody("");
          setHistory(getAnnouncementHistory());
        } else {
          toast.error(`Gönderim hatası: ${res.error || "FCM servisi yanıt vermedi"}`, { id: toastId });
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
          setHistory(getAnnouncementHistory());
        } else {
          toast.error(`Kullanıcıya gönderilemedi: ${res.error}`, { id: toastId });
        }
      }
    } catch (err: any) {
      toast.error(`Hata oluştu: ${err?.message || "Bilinmeyen hata"}`, { id: toastId });
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
    scrollToComposer();
  };

  // Geçmiş seçimi
  const isAllHistorySelected =
    filteredHistory.length > 0 && filteredHistory.every((h) => selectedHistoryIds.includes(h.id));

  const handleToggleSelectAllHistory = () => {
    if (isAllHistorySelected) {
      const ids = new Set(filteredHistory.map((h) => h.id));
      setSelectedHistoryIds((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedHistoryIds((prev) => Array.from(new Set([...prev, ...filteredHistory.map((h) => h.id)])));
    }
  };

  const handleToggleSelectHistory = (id: string) =>
    setSelectedHistoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleConfirmDeleteSingleHistory = () => {
    if (!deleteHistoryTarget) return;
    const updated = deleteAnnouncementFromHistory(deleteHistoryTarget.id);
    setHistory(updated);
    setSelectedHistoryIds((prev) => prev.filter((id) => id !== deleteHistoryTarget.id));
    setDeleteHistoryTarget(null);
    toast.success("Bildirim kaydı geçmişten silindi.");
  };

  const handleConfirmBulkDeleteHistory = () => {
    if (selectedHistoryIds.length === 0) return;
    const count = selectedHistoryIds.length;
    const updated = deleteMultipleAnnouncementsFromHistory(selectedHistoryIds);
    setHistory(updated);
    setSelectedHistoryIds([]);
    setShowBulkDeleteHistoryModal(false);
    toast.success(`${count} adet bildirim geçmişten silindi.`);
  };

  const handleConfirmClearAllHistory = () => {
    clearAllAnnouncementHistory();
    setHistory([]);
    setSelectedHistoryIds([]);
    setShowClearAllHistoryModal(false);
    toast.success("Tüm bildirim geçmişi temizlendi.");
  };

  const recipientLabel =
    targetType === "all"
      ? `Tüm kullanıcılar (${stats.totalTokens} cihaz)`
      : selectedUser
        ? `${selectedUser.name} (${handle(selectedUser.username)})`
        : targetUser || "Kullanıcı seçilmedi";

  const canSend = !isSending && !!title.trim() && !!body.trim() && (targetType === "all" || !!targetUser.trim());

  return (
    <AdminShell
      compact
      kicker="İletişim"
      title="Duyuru ve bildirim"
      actions={
        <Button variant="pill" size="sm" onClick={loadData} disabled={isLoadingStats}>
          <RefreshCw className={cn("size-3.5", isLoadingStats && "animate-spin")} />
          Yenile
        </Button>
      }
    >
      <div className="space-y-6">
        <div id="bildirim-olusturucu" className="grid scroll-mt-4 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          {/* FORM */}
          <section className="space-y-6 rounded-2xl border border-line bg-card p-4 sm:p-5">
            {/* 1. Kime */}
            <div>
              <h2 className="text-sm font-semibold text-ink">1. Kime gönderilecek?</h2>
              <div role="radiogroup" aria-label="Alıcı" className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    { v: "all", label: "Tüm kullanıcılar", sub: `${stats.totalTokens} cihaz`, icon: Users },
                    { v: "targeted", label: "Tek kullanıcı", sub: "Kişi seç", icon: UserIcon },
                  ] as const
                ).map((o) => {
                  const active = targetType === o.v;
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTargetType(o.v)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        active ? "border-forest bg-forest/5 ring-1 ring-forest" : "border-line hover:bg-shell/60",
                      )}
                    >
                      <Icon className={cn("size-5 shrink-0", active ? "text-forest" : "text-muted")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{o.label}</span>
                        <span className="block truncate text-xs text-muted">{o.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {targetType === "all" ? (
                <p className="mt-2 text-xs text-muted">
                  {stats.iosDevices} iOS · {stats.androidDevices} Android cihaz · {stats.totalUsers} üye
                </p>
              ) : null}

              {targetType === "targeted" ? (
                <div className="mt-3">
                  {targetUser ? (
                    <div className="flex items-center gap-3 rounded-xl border border-line p-3">
                      {selectedUser ? <UserAvatar user={selectedUser} /> : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {selectedUser ? selectedUser.name : "Kayıtlı kullanıcı listesinde yok"}
                        </p>
                        <p className="truncate font-mono text-xs text-muted">
                          {selectedUser ? handle(selectedUser.username) : targetUser}
                        </p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setTargetUser("")}>
                        Değiştir
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SearchField
                        value={userSearchQuery}
                        onChange={(v) => {
                          setUserSearchQuery(v);
                          if (UUID_RE.test(v.trim())) setTargetUser(v.trim());
                        }}
                        placeholder="İsim, @kullanıcı adı, telefon veya ID"
                      />
                      <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                        {filteredUsers.length === 0 ? (
                          <li className="space-y-2 p-4 text-center text-xs text-muted">
                            <p>Eşleşen kullanıcı yok.</p>
                            {userSearchQuery.trim() ? (
                              <Button variant="secondary" size="sm" onClick={() => setTargetUser(userSearchQuery.trim())}>
                                “{userSearchQuery.trim()}” değerini ID olarak kullan
                              </Button>
                            ) : null}
                          </li>
                        ) : (
                          filteredUsers.map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetUser(u.id);
                                  setUserSearchQuery("");
                                  toast.success(`${u.name} seçildi`);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-shell/60"
                              >
                                <UserAvatar user={u} className="size-8 shrink-0 rounded-full bg-shell object-cover ring-1 ring-line" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-ink">{u.name}</span>
                                  <span className="block truncate text-xs text-muted">
                                    {handle(u.username)} · {u.city}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 2. Mesaj */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">2. Mesaj</h2>
                <Button variant="secondary" size="sm" onClick={() => setTemplatesOpen(true)}>
                  Hazır şablonlar
                </Button>
              </div>

              <div className="mt-3 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="notif-title" className="text-sm font-medium text-ink">
                      Başlık
                    </label>
                    <span className={cn("text-xs tabular-nums", title.length > 40 ? "text-warn" : "text-muted")}>
                      {title.length}/45
                    </span>
                  </div>
                  <input
                    id="notif-title"
                    type="text"
                    maxLength={50}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Kısa ve net bir başlık"
                    className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-forest/15"
                  />
                  <div className="flex flex-wrap gap-1" aria-label="Başlığa emoji ekle">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleInsertEmoji(e)}
                        className="grid size-8 place-items-center rounded-lg text-base hover:bg-shell"
                        aria-label={`${e} ekle`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="notif-body" className="text-sm font-medium text-ink">
                      Mesaj
                    </label>
                    <span className={cn("text-xs tabular-nums", body.length > 120 ? "text-warn" : "text-muted")}>
                      {body.length}/140
                    </span>
                  </div>
                  <textarea
                    id="notif-body"
                    rows={3}
                    maxLength={150}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Kilit ekranında okunacak kısa mesaj"
                    className="w-full resize-none rounded-xl border border-line bg-card p-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-forest/15"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
                  <input
                    type="checkbox"
                    checked={inAppNotif}
                    onChange={(e) => setInAppNotif(e.target.checked)}
                    className="mt-0.5 size-4 accent-forest"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">Uygulama içi bildirimlere de ekle</span>
                    <span className="block text-xs text-muted">Kullanıcının uygulamadaki bildirimler listesinde de görünür.</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Mobil önizleme */}
            <div className="lg:hidden">
              <h2 className="mb-2 text-sm font-semibold text-ink">3. Önizleme</h2>
              <NotificationPreview title={title} body={body} />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setTitle("");
                  setBody("");
                  setTargetUser("");
                }}
                disabled={isSending || (!title && !body)}
              >
                Temizle
              </Button>
              <Button variant="primary" size="md" onClick={handleSendTrigger} disabled={!canSend}>
                <Send className="size-4" />
                {isSending ? "Gönderiliyor…" : "Gönder…"}
              </Button>
            </div>
          </section>

          {/* Masaüstü önizleme */}
          <aside className="hidden space-y-2 lg:sticky lg:top-4 lg:block">
            <h2 className="text-sm font-semibold text-ink">Önizleme</h2>
            <NotificationPreview title={title} body={body} />
            <p className="px-1 text-xs text-muted">Alıcı: {recipientLabel}</p>
          </aside>
        </div>

        {/* GEÇMİŞ */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              Gönderim geçmişi <span className="font-normal text-muted">({history.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              {selectedHistoryIds.length > 0 ? (
                <Button variant="danger-outline" size="sm" onClick={() => setShowBulkDeleteHistoryModal(true)}>
                  Seçilenleri sil ({selectedHistoryIds.length})
                </Button>
              ) : history.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={() => setShowClearAllHistoryModal(true)}>
                  Geçmişi temizle
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted">Geçmiş yalnızca bu tarayıcıda saklanır.</p>

          {history.length > 0 ? (
            <SearchField value={historySearch} onChange={setHistorySearch} placeholder="Geçmişte ara" />
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {filteredHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title={history.length === 0 ? "Henüz gönderim yok" : "Aramaya uygun kayıt yok"}
                hint={history.length === 0 ? "Gönderdiğin duyurular burada listelenir." : undefined}
              />
            ) : (
              <>
                <label className="flex items-center gap-3 border-b border-line bg-shell/50 px-4 py-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={isAllHistorySelected}
                    onChange={handleToggleSelectAllHistory}
                    className="size-4 accent-forest"
                  />
                  Tümünü seç
                </label>
                <ul className="divide-y divide-line">
                  {filteredHistory.map((h) => (
                    <li key={h.id} className="flex gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Seç: ${h.title}`}
                        checked={selectedHistoryIds.includes(h.id)}
                        onChange={() => handleToggleSelectHistory(h.id)}
                        className="mt-1 size-4 shrink-0 accent-forest"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 truncate text-sm font-medium text-ink">{h.title}</p>
                          {h.status === "success" ? (
                            <Badge tone="ok" dot>
                              İletildi
                            </Badge>
                          ) : (
                            <Badge tone="bad" dot>
                              Hata
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{h.body}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                          {h.targetType === "all" ? (
                            <span className="inline-flex items-center gap-1">
                              <Megaphone className="size-3" /> Herkes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="size-3" /> {h.targetUser || "Tek kullanıcı"}
                            </span>
                          )}
                          <span>·</span>
                          <span>{h.deviceCount} cihaz</span>
                          <span>·</span>
                          <span>{formatSentAt(h.sentAt)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                        <Button variant="secondary" size="sm" onClick={() => handleReapplyHistory(h)}>
                          Tekrar kullan
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleteHistoryTarget({ id: h.id, title: h.title })}
                          aria-label="Kaydı sil"
                          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>

      {/* ŞABLONLAR */}
      <Sheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Hazır şablonlar" size="md">
        <div className="space-y-5">
          {(Object.keys(CATEGORY_LABEL) as TemplateItem["category"][]).map((cat) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-semibold text-muted">{CATEGORY_LABEL[cat]}</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(t)}
                      className="block w-full px-3 py-2.5 text-left hover:bg-shell/60"
                    >
                      <span className="block text-sm font-medium text-ink">{t.label}</span>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-muted">{t.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Sheet>

      {/* GÖNDERİM ONAYI */}
      <Sheet
        variant="center"
        size="md"
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={targetType === "all" ? "Herkese gönderilsin mi?" : "Kullanıcıya gönderilsin mi?"}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setShowConfirmModal(false)} disabled={isSending}>
              Vazgeç
            </Button>
            <Button variant="primary" size="md" onClick={handleConfirmSend} disabled={isSending}>
              <Send className="size-4" />
              Evet, gönder
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Callout tone={targetType === "all" ? "warn" : "info"}>
            {targetType === "all"
              ? `Bu bildirim tüm kullanıcılara ve kayıtlı ${stats.totalTokens} cihaza anında gider. Gönderildikten sonra geri alınamaz.`
              : `Bu bildirim ${recipientLabel} kullanıcısının tüm cihazlarına anında gider.`}
          </Callout>
          <NotificationPreview title={title} body={body} />
          <p className="text-xs text-muted">
            Uygulama içi bildirimlere ekleme: <strong className="text-ink">{inAppNotif ? "Açık" : "Kapalı"}</strong>
          </p>
        </div>
      </Sheet>

      {/* GEÇMİŞ SİLME */}
      <Sheet
        variant="center"
        size="sm"
        open={!!deleteHistoryTarget}
        onClose={() => setDeleteHistoryTarget(null)}
        title="Kaydı sil"
        description={deleteHistoryTarget ? `“${deleteHistoryTarget.title}”` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setDeleteHistoryTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" size="md" onClick={handleConfirmDeleteSingleHistory}>
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Kayıt yalnızca bu geçmiş listesinden silinir. Gönderilmiş bildirim geri alınmaz.</p>
      </Sheet>

      <Sheet
        variant="center"
        size="sm"
        open={showBulkDeleteHistoryModal}
        onClose={() => setShowBulkDeleteHistoryModal(false)}
        title={`${selectedHistoryIds.length} kaydı sil`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setShowBulkDeleteHistoryModal(false)}>
              Vazgeç
            </Button>
            <Button variant="destructive" size="md" onClick={handleConfirmBulkDeleteHistory}>
              Sil
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">Seçilen kayıtlar geçmiş listesinden silinir. Gönderilmiş bildirimler geri alınmaz.</p>
      </Sheet>

      <Sheet
        variant="center"
        size="sm"
        open={showClearAllHistoryModal}
        onClose={() => setShowClearAllHistoryModal(false)}
        title="Tüm geçmişi temizle"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setShowClearAllHistoryModal(false)}>
              Vazgeç
            </Button>
            <Button variant="destructive" size="md" onClick={handleConfirmClearAllHistory}>
              Temizle
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          {history.length} kayıt bu tarayıcıdaki geçmiş listesinden silinir. Gönderilmiş bildirimler geri alınmaz.
        </p>
      </Sheet>
    </AdminShell>
  );
}
