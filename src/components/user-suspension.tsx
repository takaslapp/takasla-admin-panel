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
    <div className="space-y-3 border-t border-line/60 pt-3">
      {active ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">ASKIDA</span>
            <span className="text-xs text-rose-900">{formatDate(active.suspended_at)}</span>
          </div>
          <p className="text-sm text-rose-950 whitespace-pre-wrap break-words">{active.reason}</p>
          <p className="text-[11px] text-rose-800">
            Askıya alan: {active.suspended_by_name || "—"}
            {active.hidden_listings ? ` · ${active.hidden_listings} ilan gizlendi` : ""}
          </p>
        </div>
      ) : null}

      {mode === "suspend" && (
        <div className="rounded-xl border border-line bg-shell/40 p-3 space-y-2">
          <label htmlFor="suspend-reason" className="text-xs font-semibold text-ink">
            Askıya alma nedeni (zorunlu)
          </label>
          <textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Örn: Kapora isteyerek dolandırıcılık girişimi, 3 şikayet (12 Kasım)"
            className="w-full rounded-lg border border-line bg-card p-2.5 text-sm text-ink outline-none focus:border-forest"
          />
          <p className="text-[11px] text-muted leading-relaxed">
            Kullanıcı uygulamaya giriş yapamaz. Aktif ilanları gizlenir, bekleyen teklifleri iptal edilir ve teklif
            sahiplerine 10 TakasPara iade edilir. Devam eden takaslarına dokunulmaz. Askıyı istediğin zaman
            kaldırabilirsin; gizlenen ilanlar geri gelir.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-ink"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSuspend}
              disabled={busy || reason.trim().length < 3}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "Askıya alınıyor…" : "Askıya al"}
            </button>
          </div>
        </div>
      )}

      {mode === "unsuspend" && active && (
        <div className="rounded-xl border border-line bg-shell/40 p-3 space-y-2">
          <p className="text-xs text-ink">
            <strong>{userName}</strong> yeniden giriş yapabilecek ve askı sırasında gizlenen ilanları yayına dönecek.
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-ink"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleUnsuspend}
              disabled={busy}
              className="rounded-xl bg-forest px-4 py-2 text-xs font-bold text-card disabled:opacity-50"
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
          className={`w-full sm:w-auto rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
            active
              ? "bg-forest text-card hover:bg-forest/90"
              : "border border-rose-300 bg-card text-rose-700 hover:bg-rose-50"
          }`}
        >
          {active ? "Askıyı kaldır" : "Kullanıcıyı askıya al"}
        </button>
      )}

      {past.length > 0 && (
        <details className="rounded-xl border border-line/70 bg-card">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted">
            Geçmiş askılar ({past.length})
          </summary>
          <ul className="divide-y divide-line/60">
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
