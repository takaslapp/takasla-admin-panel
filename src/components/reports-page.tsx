import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Package,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Listing, Report, ReportStatus, User } from "@/lib/data";
import { useAdminStore } from "@/lib/store";
import { fetchSuspensions, type Suspension } from "@/lib/suspensions";
import { cn } from "@/lib/utils";
import { AdminShell } from "./admin-shell";
import { ListingDetailBody, ListingThumb } from "./listing-detail";
import { Badge, Callout, CopyId, EmptyState, FilterTabs, SearchField, SectionLabel, SelectField, TextAreaField, type Tone } from "./ui/kit";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { UserDetailSheet } from "./user-detail-sheet";

type ModerationAction = "delete_listing" | "dismiss" | "resolve_violation";
type StatusTab = "open" | "cozuldu" | "reddedildi" | "all";
type TypeFilter = "all" | "listing" | "user" | "message";

const TYPE_META: Record<string, { label: string; long: string; icon: React.ComponentType<{ className?: string }> }> = {
  listing: { label: "İlan", long: "İlan şikayeti", icon: Package },
  user: { label: "Kullanıcı", long: "Kullanıcı şikayeti", icon: UserIcon },
  message: { label: "Mesaj", long: "Mesaj şikayeti", icon: MessageSquare },
};

function typeOf(r: Report) {
  return TYPE_META[r.rawType] ?? TYPE_META.listing;
}

const STATUS_META: Record<ReportStatus, { label: string; tone: Tone }> = {
  acik: { label: "Açık", tone: "bad" },
  inceleniyor: { label: "İnceleniyor", tone: "warn" },
  cozuldu: { label: "Çözüldü", tone: "ok" },
  reddedildi: { label: "Kapatıldı", tone: "mute" },
};

const isOpen = (r: Report) => r.status === "acik" || r.status === "inceleniyor";

function formatReportDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split(" ");
    if (parts.length === 2 && parts[0].includes(".")) {
      const [d, m, y] = parts[0].split(".");
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const monthIndex = Number(m) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${Number(d)} ${monthNames[monthIndex]} ${y}, ${parts[1]}`;
      }
    }
  } catch {
    /* biçim tanınmadı */
  }
  return dateStr;
}

/** Şikayet edilen kişinin adı (kullanıcı ve mesaj şikayetlerinde) */
function reportedName(r: Report) {
  if (r.rawType === "user") return r.reportedUserName || r.target;
  return r.reportedUserName;
}

/** Listede görünen kısa hedef metni */
function targetSummary(r: Report) {
  if (r.rawType === "message") return reportedName(r) ? `${reportedName(r)} adlı kişinin mesajı` : "Sohbet mesajı";
  if (r.rawType === "user") return reportedName(r) || "Kullanıcı";
  return r.target;
}

/** İşlem onayında bildirene gidecek varsayılan mesaj */
function defaultNoteFor(report: Report, action: ModerationAction) {
  const isMessage = report.rawType === "message";
  const isUser = report.rawType === "user";
  if (action === "resolve_violation") {
    if (isMessage)
      return "Bildirdiğiniz mesaj moderasyon ekibimiz tarafından incelendi ve platform kurallarımıza aykırı bulunduğu için gerekli moderasyon işlemi uygulandı. Topluluğumuzu korumamıza yardımcı olduğunuz için teşekkür ederiz!";
    if (isUser)
      return "Bildirdiğiniz kullanıcı profili moderasyon ekibimiz tarafından incelendi ve platform kurallarımıza aykırı davranış nedeniyle gerekli yaptırım uygulandı. Topluluğumuzu korumamıza yardımcı olduğunuz için teşekkür ederiz!";
    return `Bildirdiğiniz "${report.target}" başlıklı içerik incelendi ve kural ihlali nedeniyle gerekli işlem uygulandı. Teşekkür ederiz!`;
  }
  if (action === "delete_listing") {
    return `Bildirdiğiniz "${report.target}" başlıklı ilan moderasyon ekibimiz tarafından incelendi ve platform kurallarımıza aykırı bulunduğu için yayından kaldırıldı. Topluluğumuzu korumamıza yardımcı olduğunuz için teşekkür ederiz!`;
  }
  if (isMessage)
    return "Bildirdiğiniz mesaj moderasyon ekibimiz tarafından incelenmiş olup platform kurallarımıza aykırı bir duruma rastlanmamıştır. Hassasiyetiniz ve bildiriminiz için teşekkür ederiz.";
  if (isUser)
    return "Bildirdiğiniz kullanıcı hakkındaki rapor moderasyon ekibimiz tarafından incelenmiş olup kural ihlaline rastlanmamıştır. Hassasiyetiniz ve bildiriminiz için teşekkür ederiz.";
  return `"${report.target}" hakkındaki bildiriminiz moderasyon ekibimiz tarafından incelenmiş olup platform kurallarına aykırı bir duruma rastlanmamıştır. Hassasiyetiniz ve bildiriminiz için teşekkür ederiz.`;
}

const ACTION_COPY: Record<ModerationAction, { title: string; explain: string; confirm: string }> = {
  dismiss: {
    title: "İhlal yok, şikayeti kapat",
    explain: "Şikayet kapatılır. İçeriğe veya kullanıcıya dokunulmaz. Bildiren kişiye aşağıdaki mesaj gönderilir.",
    confirm: "Kapat ve bildir",
  },
  resolve_violation: {
    title: "İhlal var, şikayeti çöz",
    explain:
      "Şikayet çözüldü olarak işaretlenir ve bildiren kişiye aşağıdaki mesaj gönderilir. Bu adım kullanıcıyı kendiliğinden askıya almaz; gerekirse önce kullanıcıyı askıya al.",
    confirm: "Çöz ve bildir",
  },
  delete_listing: {
    title: "İlanı kaldır ve şikayeti çöz",
    explain:
      "İlan yayından kaldırılır: bekleyen teklifler iptal edilir ve teklif sahiplerine 10 TakasPara iade edilir. Şikayet çözüldü olarak işaretlenir.",
    confirm: "İlanı kaldır ve bildir",
  },
};

export function ReportsPage() {
  const fetchDashboardData = useAdminStore((s) => s.fetchDashboardData);
  const reports = useAdminStore((s) => s.reports);
  const listings = useAdminStore((s) => s.listings);
  const users = useAdminStore((s) => s.users);
  const resolveReport = useAdminStore((s) => s.resolveReport);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<StatusTab>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectListing, setInspectListing] = useState<Listing | null>(null);
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  const [actionModal, setActionModal] = useState<{ report: Report; action: ModerationAction } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Askı kayıtları (kullanıcı çekmecesindeki askıya alma bölümü için)
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);
  const reloadSuspensions = () => {
    fetchSuspensions().then(setSuspensions);
  };
  useEffect(reloadSuspensions, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Yalnızca moderasyon kayıtları (message, user, listing)
  const moderationReports = useMemo(() => {
    return reports.filter((r) => {
      const raw = r.rawType;
      if (raw === "message" || raw === "user" || raw === "listing") return true;
      if (!raw) {
        return r.type.includes("Mesaj") || r.type.includes("Kullanıcı") || r.type.includes("İlan");
      }
      return false;
    });
  }, [reports]);

  const counts = useMemo(
    () => ({
      open: moderationReports.filter(isOpen).length,
      cozuldu: moderationReports.filter((r) => r.status === "cozuldu").length,
      reddedildi: moderationReports.filter((r) => r.status === "reddedildi").length,
      all: moderationReports.length,
    }),
    [moderationReports],
  );

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return moderationReports.filter((r) => {
      if (tab === "open" && !isOpen(r)) return false;
      if (tab === "cozuldu" && r.status !== "cozuldu") return false;
      if (tab === "reddedildi" && r.status !== "reddedildi") return false;
      if (typeFilter !== "all" && r.rawType !== typeFilter) return false;
      if (!query) return true;
      return `${r.subject} ${r.reporter} ${r.target} ${r.reportedUserName ?? ""} ${r.cleanDetail || r.detail} ${r.type}`
        .toLowerCase()
        .includes(query);
    });
  }, [moderationReports, tab, typeFilter, q]);

  const selected = useMemo(() => moderationReports.find((r) => r.id === selectedId) ?? null, [moderationReports, selectedId]);

  const findListing = (report: Report) =>
    listings.find((l) => l.id === report.targetId || l.title.toLowerCase() === report.target.toLowerCase());

  const handleInspectListing = (report: Report) => {
    const target = findListing(report);
    if (target) setInspectListing(target);
    else
      toast.info(
        `"${report.target}" başlıklı ilan sistemde aktif bulunamadı (silinmiş veya yayından kaldırılmış olabilir).`,
      );
  };

  const openUser = (id?: string) => {
    const u = id ? users.find((x) => x.id === id) : undefined;
    if (u) setInspectUser(u);
    else toast.info("Kullanıcı profili bulunamadı.");
  };

  const openActionModal = (report: Report, action: ModerationAction) => {
    setActionNote(defaultNoteFor(report, action));
    setActionModal({ report, action });
  };

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
        reportType: actionModal.report.rawType,
      });

      if (actionModal.action === "delete_listing") {
        toast.success(`İlan kaldırıldı ve ${actionModal.report.reporter} kullanıcısına bildirim iletildi.`);
      } else if (actionModal.action === "resolve_violation") {
        toast.success(`İhlal çözüldü ve ${actionModal.report.reporter} kullanıcısına bildirim iletildi.`);
      } else {
        toast.info(`Şikayet kapatıldı ve ${actionModal.report.reporter} kullanıcısına bilgi verildi.`);
      }

      if (inspectListing && inspectListing.id === actionModal.report.targetId) setInspectListing(null);
      setActionModal(null);
      setSelectedId(null);
    } catch (err: any) {
      toast.error(`Aksiyon uygulanamadı: ${err?.message || "Hata oluştu"}`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const tabs = [
    { value: "open" as const, label: "Açık", count: counts.open, attention: true },
    { value: "cozuldu" as const, label: "Çözüldü", count: counts.cozuldu },
    { value: "reddedildi" as const, label: "Kapatıldı", count: counts.reddedildi },
    { value: "all" as const, label: "Tümü", count: counts.all },
  ];

  return (
    <AdminShell compact kicker="Moderasyon" title="Şikayetler">
      <div className="space-y-4">
        <FilterTabs items={tabs} value={tab} onChange={setTab} ariaLabel="Şikayet durumu" />

        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Sebep, kişi veya ilan ara"
            className="sm:flex-1"
          />
          <SelectField
            label="Şikayet türü"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            className="sm:w-48"
            options={[
              { value: "all", label: "Tüm türler" },
              { value: "listing", label: "İlan şikayetleri" },
              { value: "user", label: "Kullanıcı şikayetleri" },
              { value: "message", label: "Mesaj şikayetleri" },
            ]}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-line bg-card">
          {/* Masaüstü sütun başlıkları */}
          <div className="hidden grid-cols-[7rem_minmax(0,1fr)_minmax(0,14rem)_9rem_6.5rem_1rem] gap-4 border-b border-line bg-shell/50 px-4 py-2.5 text-xs font-medium text-muted lg:grid">
            <span>Tür</span>
            <span>Sebep</span>
            <span>Bildiren → Hedef</span>
            <span>Tarih</span>
            <span>Durum</span>
            <span />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={tab === "open" ? ShieldCheck : ShieldAlert}
              title={tab === "open" && !q && typeFilter === "all" ? "Açık şikayet yok" : "Kayıt bulunamadı"}
              hint={
                tab === "open" && !q && typeFilter === "all"
                  ? "Yeni şikayet geldiğinde burada görünecek."
                  : "Aramayı veya filtreleri değiştirmeyi dene."
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const t = typeOf(r);
                const st = STATUS_META[r.status] ?? STATUS_META.acik;
                const TIcon = t.icon;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className="group grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 py-3.5 text-left transition-colors hover:bg-shell/60 focus-visible:bg-shell/60 focus-visible:outline-none lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,14rem)_9rem_6.5rem_1rem] lg:items-center lg:gap-4"
                    >
                      {/* Tür */}
                      <span className="flex items-center gap-2 text-sm text-ink lg:row-auto">
                        <span className="grid size-9 place-items-center rounded-lg bg-shell text-forest lg:size-8">
                          <TIcon className="size-4" />
                        </span>
                        <span className="hidden lg:inline">{t.label}</span>
                      </span>

                      {/* Mobil: tek blok; Masaüstü: sütunlar */}
                      <span className="min-w-0 lg:contents">
                        <span className="flex min-w-0 items-start justify-between gap-2 lg:block">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-ink">{r.subject}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted lg:hidden">
                              {r.reporter} → {targetSummary(r)}
                            </span>
                            {(r.cleanDetail || "").trim() ? (
                              <span className="mt-0.5 hidden truncate text-xs text-muted lg:block">{r.cleanDetail.trim()}</span>
                            ) : null}
                          </span>
                          <Badge tone={st.tone} dot className="shrink-0 lg:hidden">
                            {st.label}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs text-muted lg:hidden">
                          {t.long} · {formatReportDate(r.created)}
                        </span>

                        <span className="hidden min-w-0 text-sm lg:block">
                          <span className="block truncate text-ink">{r.reporter}</span>
                          <span className="block truncate text-xs text-muted">→ {targetSummary(r)}</span>
                        </span>
                        <span className="hidden text-xs text-muted lg:block">{formatReportDate(r.created)}</span>
                        <span className="hidden lg:block">
                          <Badge tone={st.tone} dot>
                            {st.label}
                          </Badge>
                        </span>
                        <ChevronRight className="hidden size-4 text-muted group-hover:text-ink lg:block" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {rows.length > 0 ? (
          <p className="px-1 text-xs text-muted">{rows.length} şikayet gösteriliyor</p>
        ) : null}
      </div>

      {/* ŞİKAYET DETAYI */}
      <Sheet
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.subject ?? ""}
        description={selected ? `${typeOf(selected).long} · ${formatReportDate(selected.created)}` : undefined}
        footer={selected ? <ReportActions report={selected} onAction={openActionModal} /> : null}
      >
        {selected ? (
          <ReportDetail
            report={selected}
            listing={selected.rawType === "listing" ? findListing(selected) : undefined}
            users={users}
            onInspectListing={() => handleInspectListing(selected)}
            onOpenUser={openUser}
          />
        ) : null}
      </Sheet>

      {/* ŞİKAYET EDİLEN İLAN */}
      <Sheet
        open={!!inspectListing}
        onClose={() => setInspectListing(null)}
        title={inspectListing?.title ?? ""}
        description={inspectListing ? `Sahibi: ${inspectListing.ownerName}` : undefined}
        size="lg"
        footer={
          inspectListing ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="md" onClick={() => setInspectListing(null)}>
                Kapat
              </Button>
              {(() => {
                const rep = moderationReports.find((r) => r.targetId === inspectListing.id && r.status === "acik");
                return rep ? (
                  <Button variant="destructive" size="md" onClick={() => openActionModal(rep, "delete_listing")}>
                    <Trash2 className="size-4" />
                    İlanı kaldır
                  </Button>
                ) : null;
              })()}
            </div>
          ) : null
        }
      >
        {inspectListing ? <ListingDetailBody listing={inspectListing} /> : null}
      </Sheet>

      {/* KULLANICI PROFİLİ (askıya alma dahil) */}
      <UserDetailSheet
        user={inspectUser}
        onClose={() => setInspectUser(null)}
        listings={listings}
        suspensions={suspensions}
        onChanged={() => {
          reloadSuspensions();
          fetchDashboardData();
        }}
      />

      {/* İŞLEM ONAYI */}
      <Sheet
        variant="center"
        size="lg"
        open={!!actionModal}
        busy={isActionSubmitting}
        onClose={() => setActionModal(null)}
        title={actionModal ? ACTION_COPY[actionModal.action].title : ""}
        description={actionModal ? `Bildiren: ${actionModal.report.reporter}` : undefined}
        footer={
          actionModal ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" size="md" onClick={() => setActionModal(null)} disabled={isActionSubmitting}>
                Vazgeç
              </Button>
              <Button
                variant={actionModal.action === "delete_listing" ? "destructive" : "primary"}
                size="md"
                onClick={handleConfirmAction}
                disabled={isActionSubmitting}
              >
                {isActionSubmitting ? "İşleniyor…" : ACTION_COPY[actionModal.action].confirm}
              </Button>
            </div>
          ) : null
        }
      >
        {actionModal ? (
          <div className="space-y-4">
            <Callout
              tone={actionModal.action === "delete_listing" ? "bad" : "info"}
              icon={actionModal.action === "delete_listing" ? AlertTriangle : CheckCircle2}
            >
              {ACTION_COPY[actionModal.action].explain}
            </Callout>
            <TextAreaField
              id="report-action-note"
              label="Bildiren kişiye gidecek mesaj"
              value={actionNote}
              onChange={setActionNote}
              rows={5}
              hint={
                actionModal.action === "delete_listing"
                  ? "Bu metin ilan sahibine de kaldırma nedeni olarak iletilir."
                  : "Mesaj, şikayeti gönderen kişinin uygulamadaki bildirimlerine düşer."
              }
            />
          </div>
        ) : null}
      </Sheet>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */

function PersonRow({
  role,
  name,
  onOpen,
  openLabel,
}: {
  role: string;
  name: string;
  onOpen?: () => void;
  openLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted">{role}</p>
        <p className="truncate text-sm font-medium text-ink">{name}</p>
      </div>
      {onOpen ? (
        <Button variant="secondary" size="sm" onClick={onOpen} className="shrink-0">
          {openLabel ?? "Profili aç"}
        </Button>
      ) : null}
    </div>
  );
}

function ReportDetail({
  report: r,
  listing,
  users,
  onInspectListing,
  onOpenUser,
}: {
  report: Report;
  listing?: Listing;
  users: User[];
  onInspectListing: () => void;
  onOpenUser: (id?: string) => void;
}) {
  const st = STATUS_META[r.status] ?? STATUS_META.acik;
  const reporterExists = !!r.reporterId && users.some((u) => u.id === r.reporterId);
  const reportedId = r.rawType === "user" ? r.targetId || r.reportedUserId : r.reportedUserId;
  const reportedExists = !!reportedId && users.some((u) => u.id === reportedId);
  const note = (r.cleanDetail || r.detail || "").trim();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={st.tone} dot>
          {st.label}
        </Badge>
        <Badge>{typeOf(r).long}</Badge>
      </div>

      {/* Hedef */}
      {r.rawType === "listing" ? (
        <div>
          <SectionLabel>Şikayet edilen ilan</SectionLabel>
          <button
            type="button"
            onClick={onInspectListing}
            className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:bg-shell/60"
          >
            {listing ? <ListingThumb listing={listing} /> : (
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-shell text-muted">
                <Package className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{r.target}</span>
              <span className="block truncate text-xs text-muted">
                {listing ? `${listing.ownerName} · ${listing.city}` : "İlan artık yayında olmayabilir"}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-forest">İlanı incele</span>
          </button>
        </div>
      ) : r.rawType === "message" ? (
        <div>
          <SectionLabel>Şikayet edilen mesaj</SectionLabel>
          <blockquote className="rounded-xl border border-line bg-shell/50 p-3 text-sm leading-relaxed text-ink">
            “{r.target}”
          </blockquote>
        </div>
      ) : null}

      {/* Kişiler */}
      <div>
        <SectionLabel>Kişiler</SectionLabel>
        <div className="divide-y divide-line rounded-xl border border-line">
          <PersonRow
            role="Bildiren"
            name={r.reporter}
            onOpen={reporterExists ? () => onOpenUser(r.reporterId) : undefined}
          />
          {r.rawType === "listing" ? (
            listing ? (
              <PersonRow
                role="İlan sahibi"
                name={listing.ownerName}
                onOpen={users.some((u) => u.id === listing.ownerId) ? () => onOpenUser(listing.ownerId) : undefined}
                openLabel="Profil / askıya al"
              />
            ) : null
          ) : (
            <PersonRow
              role={r.rawType === "message" ? "Mesajı yazan" : "Şikayet edilen"}
              name={reportedName(r) || "Bilinmiyor"}
              onOpen={reportedExists ? () => onOpenUser(reportedId) : undefined}
              openLabel="Profil / askıya al"
            />
          )}
        </div>
      </div>

      {/* Not */}
      <div>
        <SectionLabel>Bildirenin notu</SectionLabel>
        {note ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{note}</p>
        ) : (
          <p className="text-sm text-muted">Ek açıklama yazılmamış.</p>
        )}
      </div>

      <details className="rounded-xl border border-line">
        <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted">Teknik bilgiler</summary>
        <div className="divide-y divide-line border-t border-line">
          <CopyId label="Şikayet ID" value={r.id} />
          {r.targetId ? (
            <CopyId
              label={r.rawType === "listing" ? "İlan ID" : r.rawType === "user" ? "Kullanıcı ID" : "Mesaj ID"}
              value={r.targetId}
            />
          ) : null}
          {r.conversationId ? <CopyId label="Konuşma ID" value={r.conversationId} /> : null}
        </div>
      </details>
    </div>
  );
}

function ReportActions({
  report: r,
  onAction,
}: {
  report: Report;
  onAction: (r: Report, a: ModerationAction) => void;
}) {
  if (!isOpen(r)) {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-muted")}>
        <CheckCircle2 className="size-4 text-forest" />
        Bu şikayet {r.status === "cozuldu" ? "çözüldü" : "kapatıldı"}.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
      <Button variant="secondary" size="md" onClick={() => onAction(r, "dismiss")}>
        İhlal yok, kapat
      </Button>
      {r.rawType === "listing" ? (
        <Button variant="destructive" size="md" onClick={() => onAction(r, "delete_listing")}>
          <Trash2 className="size-4" />
          İlanı kaldır
        </Button>
      ) : (
        <Button variant="primary" size="md" onClick={() => onAction(r, "resolve_violation")}>
          İhlal var, çöz
        </Button>
      )}
    </div>
  );
}
