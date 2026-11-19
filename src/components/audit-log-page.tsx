import { useEffect, useMemo, useState } from "react";
import { AUDIT_ACTION_LABELS, fetchAuditLog, type AuditEntry } from "@/lib/audit";
import { AdminShell, Panel } from "./admin-shell";

const PAGE = 100;

const FILTERS: { key: string; label: string; match: (a: string) => boolean }[] = [
  { key: "all", label: "Tümü", match: () => true },
  { key: "listing", label: "İlanlar", match: (a) => a.startsWith("listing_") },
  { key: "user", label: "Kullanıcılar", match: (a) => a.startsWith("user_") },
  { key: "report", label: "Şikayet & Öneri", match: (a) => a.startsWith("report_") || a.startsWith("suggestion_") },
  { key: "announcement", label: "Duyurular", match: (a) => a.startsWith("announcement_") },
  { key: "banner", label: "Bannerlar", match: (a) => a.startsWith("banner_") },
];

const TONE: Record<string, string> = {
  listing_removed: "bg-rose-100 text-rose-800",
  listing_rejected: "bg-rose-100 text-rose-800",
  user_suspended: "bg-rose-100 text-rose-800",
  listing_approved: "bg-emerald-100 text-emerald-800",
  user_unsuspended: "bg-emerald-100 text-emerald-800",
  listing_revision_requested: "bg-amber-100 text-amber-800",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Kayıttaki ayrıntılardan okunabilir satırlar üretir (neden, not, mesaj vb.). */
function detailLines(e: AuditEntry): string[] {
  const d = e.details ?? {};
  const out: string[] = [];
  const str = (k: string) => (typeof d[k] === "string" && (d[k] as string).trim() ? (d[k] as string).trim() : null);
  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : null);

  if (str("reason")) out.push(`Neden: ${str("reason")}`);
  if (str("note")) out.push(`Not: ${str("note")}`);
  if (str("original_reason")) out.push(`Askı nedeni: ${str("original_reason")}`);
  if (str("message")) out.push(`Mesaj: ${str("message")}`);
  if (str("body")) out.push(`Metin: ${str("body")}`);
  if (num("closed_offers")) out.push(`${num("closed_offers")} bekleyen teklif kapatıldı (10 TP iade)`);
  if (num("hidden_listings")) out.push(`${num("hidden_listings")} ilan gizlendi`);
  if (num("restored_listings")) out.push(`${num("restored_listings")} ilan yeniden yayında`);
  if (num("active_trades")) out.push(`${num("active_trades")} devam eden takasa dokunulmadı`);
  if (num("devices") !== null) out.push(`${num("devices")} cihaza ulaştı`);
  if (d.deletion_type === "hard") out.push("Teklif geçmişi yoktu, tamamen silindi");
  if (d.deletion_type === "soft") out.push("Teklif geçmişi olduğu için gizlendi");
  if (typeof d.is_active === "boolean") out.push(d.is_active ? "Yayına alındı" : "Yayından kaldırıldı");
  if (str("status")) out.push(`Yeni durum: ${str("status")}`);
  return out;
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = async (offset: number) => {
    setLoading(true);
    const rows = await fetchAuditLog(PAGE, offset);
    setEntries((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE);
    setLoading(false);
  };

  useEffect(() => {
    void load(0);
  }, []);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return entries.filter((e) => f.match(e.action));
  }, [entries, filter]);

  return (
    <AdminShell compact kicker="Yönetim" title="İşlem Kaydı">
      <Panel
        title="Yönetici işlemleri"
        subtitle="Kim, ne zaman, ne yaptı. Kayıtlar değiştirilemez ve silinemez."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.key ? "bg-forest text-card" : "bg-shell/80 text-forest hover:bg-shell"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Yükleniyor…</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Henüz kayıt yok.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {visible.map((e) => {
              const lines = detailLines(e);
              return (
                <li key={e.id} className="py-3 sm:py-3.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            TONE[e.action] ?? "bg-shell text-ink"
                          }`}
                        >
                          {AUDIT_ACTION_LABELS[e.action] ?? e.action}
                        </span>
                        {e.target_name && (
                          <span className="truncate text-sm font-semibold text-ink">{e.target_name}</span>
                        )}
                      </div>
                      {lines.map((l) => (
                        <p key={l} className="break-words text-xs text-muted whitespace-pre-wrap">
                          {l}
                        </p>
                      ))}
                    </div>
                    <div className="shrink-0 text-[11px] text-muted sm:text-right">
                      <p>{formatDate(e.created_at)}</p>
                      <p className="font-semibold text-ink/80">{e.admin_name ?? "—"}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(entries.length)}
              className="w-full sm:w-auto rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-ink disabled:opacity-50"
            >
              {loading ? "Yükleniyor…" : "Daha fazla göster"}
            </button>
          </div>
        )}
      </Panel>
    </AdminShell>
  );
}
