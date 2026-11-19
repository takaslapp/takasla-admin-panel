import { supabase } from "./supabase";

/** Panelde yapılan bir yönetici işleminin kaydı (admin_audit_log). */
export interface AuditEntry {
  id: number;
  created_at: string;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown>;
}

/**
 * İşlemi kayda yazar. Kayıt başarısız olsa bile asıl işlemi ASLA engellemez (sadece konsola yazar).
 * İlan kaldırma ve askıya alma işlemleri veritabanında zaten otomatik kaydedilir; burada çağrılmaz.
 */
export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.rpc("admin_log_action", {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId ?? "",
      p_details: details,
    });
    if (error) console.warn("admin_log_action:", error.message);
  } catch (e) {
    console.warn("admin_log_action:", e);
  }
}

export async function fetchAuditLog(limit = 100, offset = 0): Promise<AuditEntry[]> {
  const { data, error } = await supabase.rpc("admin_list_audit_log", { p_limit: limit, p_offset: offset });
  if (error) {
    console.error("admin_list_audit_log:", error);
    return [];
  }
  return (data ?? []) as AuditEntry[];
}

/** Kayıtta görünen Türkçe işlem adları */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  listing_removed: "İlan kaldırıldı",
  listing_approved: "İlan onaylandı",
  listing_rejected: "İlan reddedildi",
  listing_revision_requested: "Revizyon istendi",
  user_suspended: "Kullanıcı askıya alındı",
  user_unsuspended: "Askı kaldırıldı",
  report_resolved: "Şikayet sonuçlandı",
  report_status_changed: "Şikayet durumu değişti",
  suggestion_status_changed: "Öneri durumu değişti",
  announcement_broadcast: "Toplu duyuru gönderildi",
  announcement_targeted: "Kişiye bildirim gönderildi",
  banner_created: "Banner eklendi",
  banner_updated: "Banner güncellendi",
  banner_deleted: "Banner silindi",
  banner_toggled: "Banner açıldı/kapatıldı",
};
