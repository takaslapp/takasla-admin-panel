import { supabase } from "./supabase";

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  targetType: "all" | "targeted";
  targetUser?: string;
  sentAt: string;
  deviceCount: number;
  status: "success" | "partial" | "failed";
}

/**
 * Helper: Aktif oturum JWT token'ı ile headers oluşturur
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (_) {}
  return {};
}

/**
 * Tüm Kullanıcılara Toplu Duyuru / Push Bildirimi Gönderir
 * (Güvenli Supabase Edge Function 'send-push' üzerinden)
 */
export async function sendBroadcastAnnouncement({
  title,
  body,
  inAppNotification = true,
}: {
  title: string;
  body: string;
  inAppNotification?: boolean;
}): Promise<{
  success: boolean;
  devicesReached: number;
  topicSuccess: boolean;
  error?: string;
}> {
  try {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || !cleanBody) {
      return {
        success: false,
        devicesReached: 0,
        topicSuccess: false,
        error: "Başlık ve mesaj metni boş olamaz.",
      };
    }

    const headers = await getAuthHeaders();

    const { data, error } = await supabase.functions.invoke("send-push", {
      headers,
      body: {
        type: "admin_broadcast",
        custom_title: cleanTitle,
        custom_body: cleanBody,
        title: cleanTitle,
        body: cleanBody,
      },
    });

    if (error || !data?.success) {
      const errMsg =
        error?.message ||
        data?.error ||
        data?.message ||
        "Edge Function çağrısı başarısız oldu.";

      saveAnnouncementToHistory({
        id: crypto.randomUUID(),
        title: cleanTitle,
        body: cleanBody,
        targetType: "all",
        sentAt: new Date().toISOString(),
        deviceCount: 0,
        status: "failed",
      });

      return {
        success: false,
        devicesReached: 0,
        topicSuccess: false,
        error: errMsg,
      };
    }

    const devicesReached = data.sentCount ?? data.uniqueTokenCount ?? 0;

    // In-App Bildirimler tablosuna ekle
    if (inAppNotification) {
      try {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id")
          .limit(500);

        if (profileRows && profileRows.length > 0) {
          const notifInserts = profileRows.map((p) => ({
            user_id: p.id,
            title: cleanTitle,
            message: cleanBody,
            type: "system",
            is_read: false,
          }));
          await supabase.from("notifications").insert(notifInserts);
        }
      } catch (err) {
        console.warn("In-app notifications insert uyarısı:", err);
      }
    }

    // Gönderim geçmişine kaydet
    saveAnnouncementToHistory({
      id: crypto.randomUUID(),
      title: cleanTitle,
      body: cleanBody,
      targetType: "all",
      sentAt: new Date().toISOString(),
      deviceCount: devicesReached,
      status: devicesReached > 0 ? "success" : "failed",
    });

    return {
      success: true,
      devicesReached,
      topicSuccess: false,
    };
  } catch (error: any) {
    console.error("sendBroadcastAnnouncement hatası:", error);
    return {
      success: false,
      devicesReached: 0,
      topicSuccess: false,
      error: error?.message || "Bilinmeyen hata",
    };
  }
}

/**
 * Belirli Bir Kullanıcıya (@kullanici_adi veya ID) Hedefli Bildirim Gönderir
 * (Güvenli Supabase Edge Function 'send-push' üzerinden)
 */
export async function sendTargetedAnnouncement({
  userIdOrUsername,
  title,
  body,
  inAppNotification = true,
}: {
  userIdOrUsername: string;
  title: string;
  body: string;
  inAppNotification?: boolean;
}): Promise<{
  success: boolean;
  targetUser?: { id: string; fullName: string; username: string };
  devicesReached: number;
  error?: string;
}> {
  try {
    const query = userIdOrUsername.trim().replace("@", "");
    if (!query) throw new Error("Kullanıcı adı veya ID belirtilmedi.");

    // Kullanıcıyı profiles tablosunda ara
    const { data: userRow, error: uErr } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .or(`username.ilike.${query},id.eq.${query}`)
      .maybeSingle();

    if (uErr || !userRow) {
      throw new Error(`@${query} kullanıcısı veritabanında bulunamadı.`);
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const userId = userRow.id;

    const headers = await getAuthHeaders();

    const { data, error } = await supabase.functions.invoke("send-push", {
      headers,
      body: {
        type: "system_announcement",
        recipient_user_id: userId,
        custom_title: cleanTitle,
        custom_body: cleanBody,
        title: cleanTitle,
        body: cleanBody,
      },
    });

    if (error || !data?.success) {
      const errMsg =
        error?.message ||
        data?.error ||
        data?.reason ||
        "Hedef kullanıcıya bildirim iletilemedi.";

      saveAnnouncementToHistory({
        id: crypto.randomUUID(),
        title: cleanTitle,
        body: cleanBody,
        targetType: "targeted",
        targetUser: `@${userRow.username || userRow.full_name}`,
        sentAt: new Date().toISOString(),
        deviceCount: 0,
        status: "failed",
      });

      return {
        success: false,
        devicesReached: 0,
        error: errMsg,
      };
    }

    // In-app bildirimi ekle
    if (inAppNotification) {
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: cleanTitle,
          message: cleanBody,
          type: "system",
          is_read: false,
        });
      } catch (_) {}
    }

    const devicesReached = data.sent_count ?? data.total_tokens ?? 1;

    saveAnnouncementToHistory({
      id: crypto.randomUUID(),
      title: cleanTitle,
      body: cleanBody,
      targetType: "targeted",
      targetUser: `@${userRow.username || userRow.full_name}`,
      sentAt: new Date().toISOString(),
      deviceCount: devicesReached,
      status: devicesReached > 0 ? "success" : "failed",
    });

    return {
      success: true,
      targetUser: {
        id: userRow.id,
        fullName: userRow.full_name || "Kullanıcı",
        username: userRow.username || "",
      },
      devicesReached,
    };
  } catch (error: any) {
    console.error("sendTargetedAnnouncement hatası:", error);
    return {
      success: false,
      devicesReached: 0,
      error: error?.message || "Bilinmeyen hata",
    };
  }
}

/**
 * Cihaz ve Token İstatistiklerini Çeker
 */
export async function fetchFcmStats(): Promise<{
  totalTokens: number;
  totalUsers: number;
  iosDevices: number;
  androidDevices: number;
}> {
  try {
    const { data: tokens } = await supabase
      .from("user_fcm_tokens")
      .select("platform, token");

    let ios = 0;
    let android = 0;
    const uniqueTokens = new Set<string>();

    if (tokens && Array.isArray(tokens)) {
      for (const t of tokens) {
        if (t.token) uniqueTokens.add(t.token);
        if (t.platform === "ios") ios++;
        else if (t.platform === "android") android++;
      }
    }

    const { count: userCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    return {
      totalTokens: uniqueTokens.size,
      totalUsers: userCount || 0,
      iosDevices: ios,
      androidDevices: android,
    };
  } catch (err) {
    console.warn("fetchFcmStats hatası:", err);
    return {
      totalTokens: 0,
      totalUsers: 0,
      iosDevices: 0,
      androidDevices: 0,
    };
  }
}

/**
 * Gönderim Geçmişini Getirir (localStorage)
 */
export function getAnnouncementHistory(): AnnouncementRecord[] {
  try {
    const raw = localStorage.getItem("takasla_announcements_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Gönderim Geçmişine Yeni Kayıt Ekler
 */
export function saveAnnouncementToHistory(rec: AnnouncementRecord) {
  try {
    const list = getAnnouncementHistory();
    const updated = [rec, ...list].slice(0, 50); // Son 50 duyuru
    localStorage.setItem(
      "takasla_announcements_history",
      JSON.stringify(updated),
    );
  } catch (err) {
    console.warn("saveAnnouncementToHistory hatası:", err);
  }
}

/**
 * Gönderim Geçmişinden Tekil Kayıt Siler
 */
export function deleteAnnouncementFromHistory(id: string): AnnouncementRecord[] {
  try {
    const list = getAnnouncementHistory();
    const updated = list.filter((r) => r.id !== id);
    localStorage.setItem(
      "takasla_announcements_history",
      JSON.stringify(updated),
    );
    return updated;
  } catch (err) {
    console.warn("deleteAnnouncementFromHistory hatası:", err);
    return [];
  }
}

/**
 * Gönderim Geçmişinden Çoklu Kayıt Siler
 */
export function deleteMultipleAnnouncementsFromHistory(ids: string[]): AnnouncementRecord[] {
  try {
    const list = getAnnouncementHistory();
    const idSet = new Set(ids);
    const updated = list.filter((r) => !idSet.has(r.id));
    localStorage.setItem(
      "takasla_announcements_history",
      JSON.stringify(updated),
    );
    return updated;
  } catch (err) {
    console.warn("deleteMultipleAnnouncementsFromHistory hatası:", err);
    return [];
  }
}

/**
 * Tüm Gönderim Geçmişini Temizler
 */
export function clearAllAnnouncementHistory(): void {
  try {
    localStorage.removeItem("takasla_announcements_history");
  } catch (err) {
    console.warn("clearAllAnnouncementHistory hatası:", err);
  }
}

/**
 * İlan Durumu Değiştiğinde (Onay, Revize, Red) Kullanıcıya Güvenli Push Bildirimi Gönderir
 * (Supabase Edge Function 'send-push' üzerinden çalışır, tarayıcıda private key barındırmaz)
 */
export async function sendListingNotificationPush({
  userId,
  title,
  body,
  type,
  listingId,
  relatedId,
}: {
  userId: string;
  title: string;
  body: string;
  type: "listing_approved" | "listing_revision" | "listing_rejected" | "system" | string;
  listingId?: string;
  relatedId?: string;
}): Promise<boolean> {
  try {
    const targetListingId = listingId || relatedId;

    let edgeType = type;
    if (type === "listing_revision") {
      edgeType = "listing_revision_requested";
    } else if (type === "system") {
      edgeType = "system_announcement";
    }

    const headers = await getAuthHeaders();

    const payload: Record<string, any> = {
      type: edgeType,
      custom_title: title,
      custom_body: body,
      title,
      body,
    };

    if (edgeType === "system_announcement") {
      payload.recipient_user_id = userId;
    } else {
      payload.listing_id = targetListingId;
      payload.recipient_user_id = userId;
    }

    const { data, error } = await supabase.functions.invoke("send-push", {
      headers,
      body: payload,
    });

    if (error) {
      console.warn("sendListingNotificationPush invoke hatası:", error);
      return false;
    }

    return data?.success === true;
  } catch (error) {
    console.error("sendListingNotificationPush genel hatası:", error);
    return false;
  }
}
