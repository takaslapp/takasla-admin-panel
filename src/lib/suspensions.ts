import { supabase } from "./supabase";

/** Bir askı kaydı (aktif veya geçmiş). admin_list_suspensions RPC'sinden gelir. */
export interface Suspension {
  user_id: string;
  reason: string;
  suspended_at: string;
  suspended_by_name: string | null;
  lifted_at: string | null;
  lifted_by_name: string | null;
  hidden_listings: number;
}

const ERRORS: Record<string, string> = {
  forbidden: "Bu işlem için yönetici yetkisi gerekiyor.",
  unauthorized: "Oturumunun süresi dolmuş. Lütfen tekrar giriş yap.",
  reason_required: "Askıya alma nedeni en az 3 karakter olmalı.",
  cannot_suspend_self: "Kendi hesabını askıya alamazsın.",
  cannot_suspend_admin: "Yönetici hesapları askıya alınamaz.",
  user_not_found: "Kullanıcı bulunamadı.",
  already_suspended: "Bu kullanıcı zaten askıda.",
  not_suspended: "Bu kullanıcı askıda değil.",
  ban_failed: "Giriş engeli uygulanamadı; işlem geri alındı.",
  unban_failed: "Giriş engeli kaldırılamadı.",
};

function message(code?: string, fallback = "İşlem tamamlanamadı.") {
  return (code && ERRORS[code]) || fallback;
}

/** Tüm askı kayıtları (en yeni önce). */
export async function fetchSuspensions(): Promise<Suspension[]> {
  const { data, error } = await supabase.rpc("admin_list_suspensions");
  if (error) {
    console.error("admin_list_suspensions hatası:", error);
    return [];
  }
  return (data ?? []) as Suspension[];
}

/** Kullanıcı başına aktif askı (lifted_at boş olan). */
export function activeSuspensionMap(list: Suspension[]): Map<string, Suspension> {
  const map = new Map<string, Suspension>();
  for (const s of list) if (!s.lifted_at && !map.has(s.user_id)) map.set(s.user_id, s);
  return map;
}

async function callEdge(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-suspend-user", { body });
  // functions.invoke 4xx/5xx'te error döner; gövdedeki kodu okumaya çalış
  if (error) {
    let code: string | undefined;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") code = (await ctx.json())?.error;
    } catch {
      /* gövde okunamadı */
    }
    throw new Error(message(code));
  }
  if (!data?.success) throw new Error(message(data?.error));
  return data as { success: true; hidden_listings?: number; active_trades?: number; restored_listings?: number };
}

/** Askıya alır: bekleyen teklifler iptal + iade, ilanlar gizlenir, giriş engellenir. */
export function suspendUser(userId: string, reason: string) {
  return callEdge({ action: "suspend", userId, reason });
}

/** Askıyı kaldırır: giriş açılır, askı yüzünden gizlenen ilanlar geri gelir. */
export function unsuspendUser(userId: string) {
  return callEdge({ action: "unsuspend", userId });
}
