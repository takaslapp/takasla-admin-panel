import * as jose from "jose";
import { supabase } from "./supabase";

const FCM_PROJECT_ID = "takasla-uygulamasi";
const FCM_CLIENT_EMAIL =
  "firebase-adminsdk-fbsvc@takasla-uygulamasi.iam.gserviceaccount.com";
const FCM_TOKEN_URI = "https://oauth2.googleapis.com/token";

const FCM_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2r8ymzmiSgtBS
CPkwHLLCt55dD2D7YC2uubL/vHLd6rp4reP9Y+lyOGBt7x2oQk7EE/Mw/BvCZK8G
SKN7AVSzlCUnXoF/9YP2XnnQqHzhnrqiE/eIvNiVUTvU4RHnGMnw78jzMCfC1qxt
XMHd2RI+PCu0zneBm5g30Wi6SbiqqhdvO3SVv/p6odn1rCzwrFIrQbO/t7Z3EnGJ
ywn9BAFtKHjDbjYd/MKdKiN2hdnjheYTByEfpAzMxEGJKwJ3imcHSuhcBijpc2J3
xCnZiyYCIcCliZv0HUZcFOSLoqkUDRdLW7duUNJLGJYqcAaNcKaco/BN7y53GnZe
nwAtIgOlAgMBAAECggEAE9R/BfJCJqPSzLzS87aBxEzIgLh9Ifwy0+muCkAgmyxy
Dkxt2DZNWPZ7/SLnWLl4hvnVZuakIBSWwmYFx4HW+baQgTarHu0oZF36ohF6m3ED
4uOroGjt/Oii8nzLLoch0H3uwFBkrdZomWcSrNagZNIE5SzuNaA37y3Td46DYD7v
CKyvdz3aTWZAAsgmeosdm49Wmohc1fo/saoKFYOkCrnr0ms/qIRQIxNx1BGos158
7UZmBGrjE6yO+XLkSp8DldjNVmkQhUB2Iy1pB5NgQxf4HZJZqSVPsu5p5uNyv75H
skT5owZ0AkOzC4AttyLjhAVccsEiolmoh7eu4xWuVwKBgQDdHY3skzuY0+WptPAH
hGS7qr8qxoSXT7Tnbhaw8Z8k5pQ8Abbg2XG6HFChsS3/srAyN+QitiUcVL6TaMKv
0YJGbh50kOQN1PuIjlnvrsYXHM76imHx6dh9rYPivZ5rK9jl7bwfd1qRMZQn6cGV
Z8LA55mHAIEVncza0Hc8fELMuwKBgQDTgi3s0mXn0R52zwfaERxz9f0m+Def7JpT
d11wK3ManNsZNUPvOaoPTwee5rcAjpurjT0iHfbW8kfPv9x9XqdxYuwmebZAZfWp
vT16FcmFM5vqERwqDJvaKA7QnNpQG/N2N7MjM42x8dQ5mP1T+BGp46vXNMtjrT1P
aCuRtuKbHwKBgCcOaVs4RnagNxja1Or+/6wGZO3xUspHUfTvBSMMCshB0j0nMF5X
CjeNeNCWs0FPFsBIDwvykGuIrIDtKDZWE2TNXqPIU//9dtCQFGK5xFOgyw6GEvbg
D1VjqMAMLkdP32f9rhUAyAaNc1X5fDAfu87HGd82v5ZJ4T1lRSpx6HqxAoGABKkF
ogYwwJ7W8P82yRM/cT6mSUmG0DtCWzxyDpqmepuiKDgIOykmGhg/rryeo6CAxZLj
GfFXEv1bn7Q2g3yma9UmJuLfpSOZ+hd1V09LlWfBs7KU0Ehe1ruzN9184e77uksX
41qrcJRHfM1mJ4d7vCaMDr3XDWcvxqQg8aD59TkCgYEAlHolDlXQz5tkhuSfc6+l
T5ua4TYWk6ZvRQhRsO3VNsw4tc8GQpNFO+ohj9DtQtkg5cSMkF61RLGKmRSuWBaS
ta082jSEQbJVU9S8r3WUXmHVUsQgQ72OXGKbouov+tXuk2IfXkeoEA8K8JuDWphz
RjjRFf2A7VxhRltlYJdtAxw=
-----END PRIVATE KEY-----`;

let cachedAccessToken: string | null = null;
let tokenExpiryTime = 0;

/**
 * Google Service Account ile JWT imzalayarak OAuth2 Access Token alır
 */
export async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < tokenExpiryTime) {
    return cachedAccessToken;
  }

  const key = await jose.importPKCS8(FCM_PRIVATE_KEY_PEM, "RS256");
  const jwt = await new jose.SignJWT({
    iss: FCM_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: FCM_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(key);

  const res = await fetch(FCM_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth2 Hatası (${res.status}): ${errText}`);
  }

  const json = await res.json();
  cachedAccessToken = json.access_token as string;
  tokenExpiryTime = now + 3000; // ~50 dk geçerli
  return cachedAccessToken;
}

/**
 * FCM v1 Bildirim Payload Formatı
 */
function createFcmPayload({
  topic,
  token,
  title,
  body,
  data,
}: {
  topic?: string;
  token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const cleanData: Record<string, string> = {};
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      cleanData[k] = v !== undefined && v !== null ? String(v) : "";
    }
  }

  const notificationType = cleanData.type || cleanData.notif_type || "admin_announcement";

  return {
    message: {
      ...(topic ? { topic } : { token }),
      notification: {
        title,
        body,
      },
      data: {
        type: notificationType,
        title,
        body,
        timestamp: new Date().toISOString(),
        ...cleanData,
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
          "apns-topic": "com.takaslapp.app",
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: "default",
            badge: 1,
          },
          type: notificationType,
          title,
          body,
          ...cleanData,
        },
      },
      android: {
        priority: "high",
        notification: {
          title,
          body,
          sound: "default",
          channel_id: "takasla_high_importance_channel",
        },
      },
    },
  };
}

/**
 * Tek bir FCM v1 isteği gönderir
 */
async function sendRawFcm(accessToken: string, payload: any): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("FCM v1 Gönderim Uyarısı:", res.status, errText);
    return false;
  }
  return true;
}

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
 * Tüm Kullanıcılara Toplu Duyuru / Push Bildirimi Gönderir
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
    const accessToken = await getGoogleAccessToken();

    // 1. Topic 'all_users' yayını yap
    const topicPayload = createFcmPayload({
      topic: "all_users",
      title,
      body,
    });
    const topicSuccess = await sendRawFcm(accessToken, topicPayload);

    // 2. Supabase user_fcm_tokens tablosundaki tüm aktif cihaz tokenlarını çek
    const { data: tokenRows } = await supabase
      .from("user_fcm_tokens")
      .select("token, user_id");

    const tokens = new Set<string>();
    if (tokenRows && Array.isArray(tokenRows)) {
      for (const row of tokenRows) {
        if (row.token && row.token.trim().length > 10) {
          tokens.add(row.token.trim());
        }
      }
    }

    // 3. Profiles tablosunda kayıtlı token'ları da ekle
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, fcm_token");

    if (profileRows && Array.isArray(profileRows)) {
      for (const p of profileRows) {
        if (p.fcm_token && p.fcm_token.trim().length > 10) {
          tokens.add(p.fcm_token.trim());
        }
      }
    }

    // Tüm cihazlara doğrudan da iletim yap (Topic gecikmesine karşı garanti)
    let directSentCount = 0;
    for (const token of tokens) {
      try {
        const payload = createFcmPayload({ token, title, body });
        const ok = await sendRawFcm(accessToken, payload);
        if (ok) directSentCount++;
      } catch (_) {}
    }

    const totalDevices = Math.max(tokens.size, topicSuccess ? 1 : 0);

    // 4. In-App Bildirimler tablosuna ekle
    if (inAppNotification && profileRows && profileRows.length > 0) {
      try {
        const notifInserts = profileRows.slice(0, 500).map((p) => ({
          user_id: p.id,
          title,
          message: body,
          type: "system",
          is_read: false,
        }));
        await supabase.from("notifications").insert(notifInserts);
      } catch (err) {
        console.warn("In-app notifications insert uyarısı:", err);
      }
    }

    // 5. Gönderim geçmişine kaydet
    saveAnnouncementToHistory({
      id: crypto.randomUUID(),
      title,
      body,
      targetType: "all",
      sentAt: new Date().toISOString(),
      deviceCount: totalDevices,
      status: topicSuccess || directSentCount > 0 ? "success" : "failed",
    });

    return {
      success: topicSuccess || directSentCount > 0,
      devicesReached: totalDevices,
      topicSuccess,
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
      .select("id, full_name, username, fcm_token")
      .or(`username.ilike.${query},id.eq.${query}`)
      .maybeSingle();

    if (uErr || !userRow) {
      throw new Error(`@${query} kullanıcısı veritabanında bulunamadı.`);
    }

    const userId = userRow.id;
    const tokens = new Set<string>();
    if (userRow.fcm_token && userRow.fcm_token.trim().length > 10) {
      tokens.add(userRow.fcm_token.trim());
    }

    // user_fcm_tokens tablosundan da cihazları al
    const { data: devTokens } = await supabase
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", userId);

    if (devTokens && Array.isArray(devTokens)) {
      for (const r of devTokens) {
        if (r.token && r.token.trim().length > 10) {
          tokens.add(r.token.trim());
        }
      }
    }

    const accessToken = await getGoogleAccessToken();
    let sentCount = 0;
    for (const token of tokens) {
      const payload = createFcmPayload({ token, title, body });
      const ok = await sendRawFcm(accessToken, payload);
      if (ok) sentCount++;
    }

    // In-app bildirimi ekle
    if (inAppNotification) {
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title,
          message: body,
          type: "system",
          is_read: false,
        });
      } catch (_) {}
    }

    saveAnnouncementToHistory({
      id: crypto.randomUUID(),
      title,
      body,
      targetType: "targeted",
      targetUser: `@${userRow.username || userRow.full_name}`,
      sentAt: new Date().toISOString(),
      deviceCount: tokens.size,
      status: sentCount > 0 ? "success" : "failed",
    });

    return {
      success: sentCount > 0,
      targetUser: {
        id: userRow.id,
        fullName: userRow.full_name || "Kullanıcı",
        username: userRow.username || "",
      },
      devicesReached: tokens.size,
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
 * Gönderim Geçmişini Getirir
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
 * İlan Durumu Değiştiğinde (Onay, Revize, Red) Kullanıcıya Doğrudan Push Bildirimi Gönderir
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
    const tokens = new Set<string>();

    // 1. profiles tablosundaki fcm_token
    const { data: userRow } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", userId)
      .maybeSingle();

    if (userRow?.fcm_token && userRow.fcm_token.trim().length > 10) {
      tokens.add(userRow.fcm_token.trim());
    }

    // 2. user_fcm_tokens tablosundaki cihazlar
    const { data: devTokens } = await supabase
      .from("user_fcm_tokens")
      .select("token")
      .eq("user_id", userId);

    if (devTokens && Array.isArray(devTokens)) {
      for (const r of devTokens) {
        if (r.token && r.token.trim().length > 10) {
          tokens.add(r.token.trim());
        }
      }
    }

    if (tokens.size === 0) {
      console.warn(`sendListingNotificationPush: Kullanıcı (${userId}) için aktif FCM token bulunamadı.`);
      return false;
    }

    const accessToken = await getGoogleAccessToken();
    let sentCount = 0;
    const targetListingId = listingId || relatedId || "";

    for (const token of tokens) {
      try {
        const payload = createFcmPayload({
          token,
          title,
          body,
          data: {
            type,
            notif_type: type,
            listing_id: targetListingId,
            related_id: targetListingId,
          },
        });
        const ok = await sendRawFcm(accessToken, payload);
        if (ok) sentCount++;
      } catch (e) {
        console.warn("Tekil token gönderim hatası:", e);
      }
    }

    console.log(`✅ [Push Bildirimi] ${type} bildirimi ${sentCount}/${tokens.size} cihaza iletildi (${title}).`);
    return sentCount > 0;
  } catch (error) {
    console.error("sendListingNotificationPush genel hatası:", error);
    return false;
  }
}
