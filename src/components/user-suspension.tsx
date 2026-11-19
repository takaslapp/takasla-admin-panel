import { useState } from "react";
import { toast } from "sonner";
import { suspendUser, unsuspendUser, type Suspension } from "@/lib/suspensions";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  userId: string;
  userName: string;
  isAdminUser: boolean;
  /** Bu kullanıcıya ait tüm askı kayıtları (en yeni önce) */
  history: Suspension[];
  onChanged: () => void;
}

/** Kullanıcı detay penceresindeki askıya alma bölümü. */
export function UserSuspensionSection({ userId, userName, isAdminUser, history, onChanged }: Props) {
  const active = history.find((s) => !s.lifted_at) ?? null;
  const past = history.filter((s) => s.lifted_at);
  const [mode, setMode] = useState<"idle" | "suspend" | "unsuspend">("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAdminUser) return null;

  const reset = () => {
    setMode("idle");
    setReason("");
  };

  const handleSuspend = async () => {
    if (reason.trim().length < 3) {
      toast.error("Askıya alma nedeni en az 3 karakter olmalı.");
      return;
    }
    setBusy(true);
    try {
      const res = await suspendUser(userId, reason.trim());
      const parts = [`${userName} askıya alındı.`];
      if (res.hidden_listings) parts.push(`${res.hidden_listings} ilan gizlendi.`);
      if (res.active_trades) parts.push(`${res.active_trades} devam eden takasa dokunulmadı.`);
      toast.success(parts.join(" "));
      reset();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnsuspend = async () => {
    setBusy(true);
    try {
      const res = await unsuspendUser(userId);
      toast.success(
        `${userName} için askı kaldırıldı.` +
          (res.restored_listings ? ` ${res.restored_listings} ilan yeniden yayında.` : ""),
      );
      reset();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {active ? (
        <div className="rounded-xl border border-bad/20 bg-bad-soft p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-bad px-2 py-0.5 text-[11px] font-semibold text-white">Askıda</span>
            <span className="text-xs text-bad">{formatDate(active.suspended_at)}</span>
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap break-words">{active.reason}</p>
          <p className="text-xs text-muted">
            Askıya alan: {active.suspended_by_name || "—"}
            {active.hidden_listings ? ` · ${active.hidden_listings} ilan gizlendi` : ""}
          </p>
        </div>
      ) : null}

      {mode === "suspend" && (
        <div className="rounded-xl border border-line bg-shell/50 p-3 space-y-2.5">
          <label htmlFor="suspend-reason" className="block text-sm font-medium text-ink">
            Askıya alma nedeni (zorunlu)
          </label>
          <textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Örn: Kapora isteyerek dolandırıcılık girişimi, 3 şikayet (12 Kasım)"
            className="w-full rounded-xl border border-line bg-card p-3 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
          <p className="text-xs text-muted leading-relaxed">
            Kullanıcı uygulamaya giriş yapamaz. Aktif ilanları gizlenir, bekleyen teklifleri iptal edilir ve teklif
            sahiplerine 10 TakasPara iade edilir. Devam eden takaslarına dokunulmaz. Askıyı istediğin zaman
            kaldırabilirsin; gizlenen ilanlar geri gelir.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="h-10 rounded-xl border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-shell"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSuspend}
              disabled={busy || reason.trim().length < 3}
              className="h-10 rounded-xl bg-bad px-4 text-sm font-medium text-white hover:bg-bad/90 disabled:opacity-50"
            >
              {busy ? "Askıya alınıyor…" : "Askıya al"}
            </button>
          </div>
        </div>
      )}

      {mode === "unsuspend" && active && (
        <div className="rounded-xl border border-line bg-shell/50 p-3 space-y-2.5">
          <p className="text-sm text-ink">
            <strong>{userName}</strong> yeniden giriş yapabilecek ve askı sırasında gizlenen ilanları yayına dönecek.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="h-10 rounded-xl border border-line bg-card px-4 text-sm font-medium text-ink hover:bg-shell"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleUnsuspend}
              disabled={busy}
              className="h-10 rounded-xl bg-forest px-4 text-sm font-medium text-card hover:bg-forest/90 disabled:opacity-50"
            >
              {busy ? "Kaldırılıyor…" : "Askıyı kaldır"}
            </button>
          </div>
        </div>
      )}

      {mode === "idle" && (
        <button
          type="button"
          onClick={() => setMode(active ? "unsuspend" : "suspend")}
          className={`h-10 w-full sm:w-auto rounded-xl px-4 text-sm font-medium transition-colors ${
            active
              ? "bg-forest text-card hover:bg-forest/90"
              : "border border-bad/30 bg-card text-bad hover:bg-bad-soft"
          }`}
        >
          {active ? "Askıyı kaldır" : "Kullanıcıyı askıya al"}
        </button>
      )}

      {past.length > 0 && (
        <details className="rounded-xl border border-line bg-card">
          <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-muted">
            Geçmiş askılar ({past.length})
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {past.map((s) => (
              <li key={s.suspended_at} className="px-3 py-2 space-y-0.5">
                <p className="text-[11px] text-muted">
                  {formatDate(s.suspended_at)} → {formatDate(s.lifted_at)}
                </p>
                <p className="text-xs text-ink whitespace-pre-wrap break-words">{s.reason}</p>
                <p className="text-[11px] text-muted">
                  Askıya alan: {s.suspended_by_name || "—"} · Kaldıran: {s.lifted_by_name || "—"}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
