import { create } from "zustand";
import type {
  CompletedSwapPair,
  Listing,
  ListingStatus,
  Report,
  ReportStatus,
  Suggestion,
  SuggestionStatus,
  User,
} from "./data";
import { formatPhone, LISTINGS, REPORTS, SUGGESTIONS, USERS } from "./data";
import { supabase } from "./supabase";
import { sendListingNotificationPush } from "./fcm";

export interface SwapOfferStats {
  totalOffers: number;
  pendingOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
}

interface AdminStore {
  users: User[];
  listings: Listing[];
  reports: Report[];
  suggestions: Suggestion[];
  swapStats: SwapOfferStats;
  completedSwapPairs: CompletedSwapPair[];
  isLoading: boolean;

  fetchDashboardData: () => Promise<void>;
  setUserStatus: (id: string, status: "aktif" | "yeni") => Promise<void>;
  approveListing: (id: string) => Promise<void>;
  requestRevision: (id: string, note: string) => Promise<void>;
  rejectListing: (id: string, reason: string) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  deleteMultipleListings: (ids: string[]) => Promise<void>;
  setReportStatus: (id: string, status: ReportStatus) => Promise<void>;
  resolveReport: (options: {
    reportId: string;
    action: "dismiss" | "delete_listing" | "warning" | "resolve_violation" | "resolve_feedback";
    customMessage?: string;
    reporterId?: string;
    targetTitle?: string;
    targetListingId?: string;
    reportType?: string;
  }) => Promise<void>;
  setSuggestionStatus: (id: string, status: SuggestionStatus) => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  users: USERS,
  listings: LISTINGS,
  reports: REPORTS,
  suggestions: SUGGESTIONS,
  swapStats: {
    totalOffers: 0,
    pendingOffers: 0,
    acceptedOffers: 0,
    rejectedOffers: 0,
  },
  completedSwapPairs: [],
  isLoading: false,

  fetchDashboardData: async () => {
    set({ isLoading: true });
    try {
      // 1. Supabase Profiles, Listings (ile listing_images), Swap Offers
      const [profilesRes, listingsRes, offersRes] = await Promise.all([
        supabase.rpc("admin_get_profiles"),
        supabase
          .from("listings")
          .select("*, listing_images(image_url, display_order)")
          .order("created_at", { ascending: false }),
        supabase.from("swap_offers").select("*"),
      ]);

      const rawProfiles = (profilesRes.data as any[]) || [];
      const rawListings = (listingsRes.data || []) as any[];
      const rawOffers = offersRes.data || [];
      const offerMap = new Map<string, any>();
      for (const off of rawOffers) {
        offerMap.set(off.id, off);
      }

      // Her kullanıcının gerçek ilan sayısını hesapla
      const userListingCounts = new Map<string, number>();
      const userMap = new Map<string, { name: string; phone: string }>();

      for (const l of rawListings) {
        if (l.user_id && l.status !== "completed" && l.status !== "takaslandi") {
          const currentCount = userListingCounts.get(l.user_id) || 0;
          userListingCounts.set(l.user_id, currentCount + 1);
        }
      }

      // Kullanıcı listesi
      let usersList: User[] = [];
      if (rawProfiles.length > 0) {
        usersList = rawProfiles.map((p: any) => {
          const fullName = p.full_name || p.username || "Kullanıcı";
          const username = p.username ? `@${p.username}` : (p.phone ? `@${p.phone}` : "@uye");
          const phone = formatPhone(p.phone);
          userMap.set(p.id, { name: fullName, phone });

          const dt = p.created_at ? new Date(p.created_at) : new Date();
          const joinedFormatted = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;

          const rawAvatar = p.avatar_url?.trim();
          const hasCustomAvatar =
            rawAvatar &&
            rawAvatar !== "" &&
            !rawAvatar.includes("unsplash.com") &&
            !rawAvatar.includes("ui-avatars.com");

          const avatarUrl = hasCustomAvatar
            ? rawAvatar
            : "/images/takasla-icon.jpg";

          return {
            id: p.id,
            name: fullName,
            username,
            phone,
            city: p.city || "Türkiye",
            avatar: avatarUrl,
            listingsCount: userListingCounts.get(p.id) || 0,
            joined: joinedFormatted,
            role: p.username === "admin" ? "Yönetici" : "Kullanıcı",
          };
        });
      }

      // İlan listesi
      let listingsList: Listing[] = [];
      if (rawListings.length > 0) {
        listingsList = rawListings.map((l) => {
          const ownerInfo = userMap.get(l.user_id) || { name: "Kullanıcı", phone: "Belirtilmemiş" };
          const dt = l.created_at ? new Date(l.created_at) : new Date();
          const createdFormatted = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;

          // Fotoğrafları sıralı olarak çıkar
          const imagesList: string[] = [];
          if (l.listing_images && Array.isArray(l.listing_images)) {
            const sortedImages = [...l.listing_images].sort(
              (a, b) => ((a.display_order ?? 0) - (b.display_order ?? 0))
            );
            for (const img of sortedImages) {
              if (img.image_url) imagesList.push(img.image_url);
            }
          }

          // Durum tespiti (pending, approved, revision_requested, rejected, deleted)
          let status: ListingStatus = "approved";
          if (l.status) {
            const s = String(l.status).toLowerCase();
            if (s === "pending" || s === "incelemede") status = "pending";
            else if (s === "approved" || s === "yayinda") status = "approved";
            else if (s === "revision_requested" || s === "revize_istendi") status = "revision_requested";
            else if (s === "rejected" || s === "reddedildi") status = "rejected";
            else if (s === "deleted" || s === "silindi") status = "deleted";
            else status = s as ListingStatus;
          } else {
            status = l.is_active === false ? "rejected" : "approved";
          }

          return {
            id: l.id,
            title: l.title || "İsimsiz İlan",
            ownerId: l.user_id || "",
            ownerName: ownerInfo.name,
            ownerPhone: ownerInfo.phone,
            category: l.category || "Genel",
            city: l.location || "Türkiye",
            wants: l.wanted_item || "Belirtilmemiş",
            condition: l.condition_name || "Normal",
            description: l.description || "Açıklama girilmedi.",
            status,
            created: createdFormatted,
            adminNote: l.admin_note || undefined,
            images: imagesList,
          };
        });
      }

      // Takas Teklifi İstatistikleri
      const swapStats: SwapOfferStats = {
        totalOffers: rawOffers.length,
        pendingOffers: rawOffers.filter((o) => o.status === "pending").length,
        acceptedOffers: rawOffers.filter((o) => o.status === "accepted").length,
        rejectedOffers: rawOffers.filter((o) => o.status === "rejected").length,
      };

      // Şikayetler ve Öneriler tablosunu çek (Supabase public.reports)
      let reportsList: Report[] = [];
      let suggestionsList: Suggestion[] = [];
      try {
        const { data: repData, error: repError } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (!repError && repData !== null) {
          repData.forEach((r, i) => {
            const dt = r.created_at ? new Date(r.created_at) : new Date();
            const timeStr = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
            const rawType = (r.type || "").toLowerCase().trim();
            const isAppIssue =
              rawType === "app_issue" ||
              rawType === "feedback" ||
              rawType === "suggestion" ||
              r.target_id === "takasla_app" ||
              (r.target_title && r.target_title.toLowerCase().includes("uygulama"));
            const isMessage = rawType === "message";
            const isUser = rawType === "user";

            let conversationId: string | undefined = undefined;
            let reportedUserName: string | undefined = undefined;
            let reportedUserId: string | undefined = undefined;

            const detailLines = (r.details || r.reason || "").split("\n");
            const cleanLines: string[] = [];

            for (const line of detailLines) {
              const trimmed = line.trim();
              const convoMatch = trimmed.match(/\(?Konuşma ID:\s*([a-fA-F0-9\-]+)\)?/i);
              const repMatch = trimmed.match(/Bildirilen Kullanıcı:\s*([^|()\-]+)(?:(?:\s*\|\s*|\s*[-–]\s*)ID:\s*([a-fA-F0-9\-]+))?/i);
              const repIdOnlyMatch = trimmed.match(/Bildirilen Kullanıcı ID:\s*([a-fA-F0-9\-]+)/i);

              if (convoMatch) {
                conversationId = convoMatch[1]?.trim();
              } else if (repMatch) {
                reportedUserName = repMatch[1]?.trim();
                reportedUserId = repMatch[2]?.trim();
              } else if (repIdOnlyMatch) {
                reportedUserId = repIdOnlyMatch[1]?.trim();
              } else {
                cleanLines.push(line);
              }
            }

            let cleanDetail = cleanLines.join("\n").trim();

            if (isMessage && conversationId && offerMap.has(conversationId)) {
              const offer = offerMap.get(conversationId);
              const otherId = offer.sender_id === r.reporter_id ? offer.receiver_id : offer.sender_id;
              if (!reportedUserId && otherId) {
                reportedUserId = otherId;
              }
            }

            if (reportedUserId && userMap.has(reportedUserId)) {
              const profile = userMap.get(reportedUserId);
              if (profile?.name) {
                reportedUserName = profile.name;
              }
            }

            if (isUser) {
              reportedUserName = r.target_title || (r.target_id && userMap.get(r.target_id)?.name) || "Kullanıcı";
              reportedUserId = r.target_id || undefined;
            }

            if (isAppIssue) {
              let sugStatus: SuggestionStatus = "yeni";
              if (r.status === "inceleniyor") sugStatus = "degerlendiriliyor";
              else if (r.status === "cozuldu") sugStatus = "uygulandi";
              else if (r.status === "reddedildi") sugStatus = "arsiv";

              suggestionsList.push({
                id: r.id || `SUG-${i + 1}`,
                title: r.reason || "Öneri / Geliştirme Fikri",
                author: r.reporter_name || (r.reporter_id ? userMap.get(r.reporter_id)?.name : undefined) || "Kullanıcı",
                authorId: r.reporter_id || undefined,
                description: cleanDetail,
                votes: 1,
                status: sugStatus,
                created: timeStr,
                rawType: rawType || "app_issue",
              });
            } else {
              let displayType = "İlan Şikayeti";
              let finalRawType = "listing";
              if (isMessage) {
                displayType = "Mesaj Şikayeti";
                finalRawType = "message";
              } else if (isUser) {
                displayType = "Kullanıcı Şikayeti";
                finalRawType = "user";
              }

              reportsList.push({
                id: r.id || `SK-${i + 1}`,
                subject: r.reason || "Bildirim",
                reporter: r.reporter_name || (r.reporter_id ? userMap.get(r.reporter_id)?.name : undefined) || "Kullanıcı",
                reporterId: r.reporter_id || undefined,
                reportedUserName,
                reportedUserId,
                target: isMessage ? (r.target_title || "Sohbet Mesajı") : (r.target_title || (isUser ? (reportedUserName || "Kullanıcı") : "İlgili İlan")),
                targetId: r.target_id || undefined,
                type: displayType,
                rawType: finalRawType,
                status: (r.status as ReportStatus) || "acik",
                created: timeStr,
                detail: r.details || r.reason || "",
                cleanDetail,
                conversationId,
              });
            }
          });
        }
      } catch (err) {
        console.warn("Reports fetch hatası:", err);
      }

      // Takaslanan İlanları Birleştir (Unified Swap Pairs)
      const completedListings = listingsList.filter(
        (l) => l.status === "completed" || l.status === "takaslandi"
      );
      const usedListingIds = new Set<string>();
      const completedPairs: CompletedSwapPair[] = [];

      // A. swap_offers tablosundaki resmi tekliflerden eşleştir
      for (const off of rawOffers) {
        if (off.status === "completed" || off.status === "accepted") {
          const senderListingId = off.sender_listing_id || off.offered_listing_id;
          const receiverListingId = off.receiver_listing_id || off.target_listing_id;
          const itemA = listingsList.find((l) => l.id === senderListingId);
          const itemB = listingsList.find((l) => l.id === receiverListingId);

          if (itemA && itemB && !usedListingIds.has(itemA.id) && !usedListingIds.has(itemB.id)) {
            usedListingIds.add(itemA.id);
            usedListingIds.add(itemB.id);
            const dt = off.updated_at || off.created_at ? new Date(off.updated_at || off.created_at) : new Date();
            const dateStr = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
            completedPairs.push({
              id: off.id || `pair_${itemA.id}_${itemB.id}`,
              offerId: off.id,
              itemA,
              itemB,
              date: dateStr,
            });
          }
        }
      }

      // B. Kalan tamamlanan ilanları ikili çiftler halinde birleştir
      const remainingCompleted = completedListings.filter((l) => !usedListingIds.has(l.id));
      for (let i = 0; i < remainingCompleted.length; i += 2) {
        const itemA = remainingCompleted[i];
        const itemB = remainingCompleted[i + 1] || remainingCompleted[i];
        usedListingIds.add(itemA.id);
        if (remainingCompleted[i + 1]) usedListingIds.add(itemB.id);
        completedPairs.push({
          id: `pair_${itemA.id}_${itemB.id}`,
          itemA,
          itemB,
          date: itemA.created || "Tamamlandı",
        });
      }

      set({
        users: usersList,
        listings: listingsList,
        reports: reportsList,
        suggestions: suggestionsList,
        swapStats,
        completedSwapPairs: completedPairs,
        isLoading: false,
      });
    } catch (e) {
      console.error("fetchDashboardData hatası:", e);
      set({ isLoading: false });
    }
  },

  setUserStatus: async (id, status) => {
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, role: status === "aktif" ? "Aktif" : "Yeni" } : u)),
    }));
    try {
      await supabase.from("profiles").update({ is_verified: status === "aktif" }).eq("id", id);
    } catch (e) {
      console.error("setUserStatus hatası:", e);
    }
  },

  approveListing: async (id: string) => {
    const listing = get().listings.find((l) => l.id === id);
    if (listing?.status === "completed" || listing?.status === "takaslandi") {
      console.warn("Tamamlanmış takas ilanı tekrar onaylanamaz:", id);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "approved",
          is_active: true,
          admin_note: null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Veritabanı güncellenemedi (RLS politikasını kontrol edin)");
      }

      set((s) => ({
        listings: s.listings.map((l) => (l.id === id ? { ...l, status: "approved", adminNote: undefined } : l)),
      }));

      const ownerId = listing?.ownerId || (data && data[0]?.user_id);
      const listingTitle = listing?.title || (data && data[0]?.title) || "İlanınız";

      if (ownerId) {
        const isReApproval = (listing && listing.status === "revision_requested") || !!(listing && listing.adminNote);
        const notifTitle = isReApproval
          ? `İlanınız Tekrar Yayında: ${listingTitle}`
          : `İlanınız Yayında: ${listingTitle}`;
        const notifMessage = isReApproval
          ? `"${listingTitle}" başlıklı ilanınızdaki düzenlemeler onaylandı ve tekrar vitrinde yayına alındı.`
          : `"${listingTitle}" başlıklı ilanınız incelendi ve vitrinde yayına alındı.`;

        try {
          await sendListingNotificationPush({
            userId: ownerId,
            title: notifTitle,
            body: notifMessage,
            type: "listing_approved",
            listingId: id,
          });
        } catch (notifErr) {
          console.warn("Notification push fallback:", notifErr);
        }
      }
    } catch (e) {
      console.error("approveListing hatası:", e);
    }
  },

  requestRevision: async (id: string, note: string) => {
    const listing = get().listings.find((l) => l.id === id);
    if (listing?.status === "completed" || listing?.status === "takaslandi") {
      console.warn("Tamamlanmış takas ilanı revize edilemez:", id);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "revision_requested",
          is_active: false,
          admin_note: note,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Veritabanı güncellenemedi (RLS politikasını kontrol edin)");
      }

      set((s) => ({
        listings: s.listings.map((l) =>
          l.id === id ? { ...l, status: "revision_requested", adminNote: note } : l
        ),
      }));

      const ownerId = listing?.ownerId || (data && data[0]?.user_id);
      const listingTitle = listing?.title || (data && data[0]?.title) || "İlanınız";

      if (ownerId) {
        const revTitle = `İlanınızı Gözden Geçirin: ${listingTitle}`;
        const revMessage = `Yönetici Notu: ${note}`;
        try {
          await sendListingNotificationPush({
            userId: ownerId,
            title: revTitle,
            body: revMessage,
            type: "listing_revision_requested",
            listingId: id,
          });
        } catch (notifErr) {
          console.warn("Notification push fallback:", notifErr);
        }
      }
    } catch (e) {
      console.error("requestRevision hatası:", e);
    }
  },

  rejectListing: async (id: string, reason: string) => {
    const listing = get().listings.find((l) => l.id === id);
    if (listing?.status === "completed" || listing?.status === "takaslandi") {
      console.warn("Tamamlanmış takas ilanı reddedilemez:", id);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("listings")
        .update({
          status: "rejected",
          is_active: false,
          admin_note: reason,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Veritabanı güncellenemedi (RLS politikasını kontrol edin)");
      }

      set((s) => ({
        listings: s.listings.map((l) =>
          l.id === id ? { ...l, status: "rejected", rejectReason: reason, adminNote: reason } : l
        ),
      }));

      const ownerId = listing?.ownerId || (data && data[0]?.user_id);
      const listingTitle = listing?.title || (data && data[0]?.title) || "İlanınız";

      if (ownerId) {
        const rejTitle = `İlanınız Onaylanmadı: ${listingTitle}`;
        const rejMessage = `"${listingTitle}" başlıklı ilanınız platform kurallarına uygun görülmedi.\nSebep: ${reason}`;
        try {
          await sendListingNotificationPush({
            userId: ownerId,
            title: rejTitle,
            body: rejMessage,
            type: "listing_rejected",
            listingId: id,
          });
        } catch (notifErr) {
          console.warn("Notification push fallback:", notifErr);
        }
      }
    } catch (e) {
      console.error("rejectListing hatası:", e);
    }
  },

  deleteListing: async (id: string) => {
    const listing = get().listings.find((l) => l.id === id);
    if (listing?.status === "completed" || listing?.status === "takaslandi") {
      console.warn("Tamamlanmış takas ilanı silinemez:", id);
      return;
    }
    set((s) => ({
      listings: s.listings.filter((l) => l.id !== id),
    }));
    try {
      await supabase.from("favorites").delete().eq("listing_id", id);
      await supabase.from("listing_images").delete().eq("listing_id", id);
      await supabase.from("listings").delete().eq("id", id);
    } catch (e) {
      console.error("deleteListing hatası:", e);
    }
  },

  deleteMultipleListings: async (ids: string[]) => {
    const safeIds = ids.filter((id) => {
      const l = get().listings.find((item) => item.id === id);
      return l?.status !== "completed" && l?.status !== "takaslandi";
    });
    if (safeIds.length === 0) return;
    const idSet = new Set(safeIds);
    set((s) => ({
      listings: s.listings.filter((l) => !idSet.has(l.id)),
    }));
    try {
      await supabase.from("favorites").delete().in("listing_id", ids);
      await supabase.from("listing_images").delete().in("listing_id", ids);
      await supabase.from("listings").delete().in("id", ids);
    } catch (e) {
      console.error("deleteMultipleListings hatası:", e);
    }
  },

  setReportStatus: async (id, status) => {
    set((s) => ({
      reports: s.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    try {
      await supabase.from("reports").update({ status }).eq("id", id);
    } catch (e) {
      console.error("setReportStatus hatası:", e);
    }
  },

  resolveReport: async (options) => {
    const { reportId, action, customMessage, reporterId, targetTitle, targetListingId, reportType } = options;
    const newStatus: ReportStatus = action === "dismiss" ? "reddedildi" : "cozuldu";

    set((s) => ({
      reports: s.reports.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)),
    }));

    try {
      await supabase.from("reports").update({ status: newStatus }).eq("id", reportId);

      if (action === "delete_listing" && targetListingId) {
        await get().deleteListing(targetListingId);
      }

      if (reporterId) {
        let notifTitle = "";
        let notifMessage = "";

        if (action === "dismiss") {
          if (reportType === "message") {
            notifTitle = "Mesaj Şikayetiniz İncelendi";
            notifMessage =
              customMessage ||
              "Bildirdiğiniz sohbet mesajı moderasyon ekibimizce incelenmiş olup platform kurallarına aykırı bir duruma rastlanmamıştır. Hassasiyetiniz ve bildiriminiz için teşekkür ederiz.";
          } else if (reportType === "user") {
            notifTitle = "Kullanıcı Şikayetiniz İncelendi";
            notifMessage =
              customMessage ||
              `"${targetTitle || "Kullanıcı"}" hakkındaki şikayetiniz moderasyon ekibimizce incelenmiş olup kural ihlali tespit edilmemiştir. Hassasiyetiniz için teşekkür ederiz.`;
          } else if (reportType === "listing") {
            notifTitle = "İlan Şikayetiniz İncelendi";
            notifMessage =
              customMessage ||
              `"${targetTitle || "İlan"}" hakkındaki bildiriminiz moderasyon ekibimizce incelenmiş olup kural ihlali görülmemiştir. Hassasiyetiniz için teşekkür ederiz.`;
          } else {
            notifTitle = "Şikayetiniz İncelendi";
            notifMessage =
              customMessage ||
              "Bildiriminiz moderasyon ekibimizce incelenmiş olup kural ihlali görülmemiştir. Teşekkür ederiz.";
          }
        } else if (action === "delete_listing") {
          notifTitle = "Şikayetiniz Sonuçlandı: İlan Kaldırıldı";
          notifMessage =
            customMessage ||
            `Bildirdiğiniz "${targetTitle || "ilan"}" incelendi ve platform kurallarımıza aykırı bulunduğu için yayından kaldırıldı. Takasla topluluğunu korumamıza yardımcı olduğunuz için teşekkür ederiz!`;
        } else if (action === "resolve_violation") {
          if (reportType === "message") {
            notifTitle = "Şikayetiniz Sonuçlandı: Mesaj İncelendi";
            notifMessage =
              customMessage ||
              "Bildirdiğiniz sohbet mesajı moderasyon ekibimizce incelenmiş, kural ihlali tespit edilmiş ve gerekli moderasyon işlemi uygulanmıştır. Topluluk güvenliğine katkınız için teşekkür ederiz!";
          } else if (reportType === "user") {
            notifTitle = "Şikayetiniz Sonuçlandı: Kullanıcı İncelendi";
            notifMessage =
              customMessage ||
              `"${targetTitle || "Kullanıcı"}" hakkındaki şikayetiniz moderasyon ekibimizce incelenmiş ve gerekli yaptırımlar uygulanmıştır. Teşekkür ederiz!`;
          } else {
            notifTitle = "Şikayetiniz Çözüldü";
            notifMessage =
              customMessage ||
              `"${targetTitle || "Bildiriminiz"}" incelenmiş ve gerekli moderasyon işlemi uygulanmıştır. Teşekkür ederiz!`;
          }
        } else if (action === "resolve_feedback") {
          notifTitle = "Öneriniz Değerlendirildi";
          notifMessage =
            customMessage ||
            `İlettiğiniz "${targetTitle || "uygulama bildirimi"}" geliştirme ekibimizce incelendi ve değerlendirmeye alındı. Takasla deneyimini geliştirmemize katkı sağladığınız için teşekkür ederiz!`;
        } else {
          notifTitle = "Şikayetiniz İncelendi";
          notifMessage =
            customMessage ||
            `"${targetTitle || "İlgili içerik"}" hakkındaki bildiriminiz incelenmiş ve gerekli moderasyon aksiyonu alınmıştır. Teşekkür ederiz.`;
        }

        try {
          await sendListingNotificationPush({
            userId: reporterId,
            title: notifTitle,
            body: notifMessage,
            type: "system",
            listingId: targetListingId || reportId,
            relatedId: targetListingId || reportId,
          });
        } catch (notifErr) {
          console.warn("Notification push error:", notifErr);
        }
      }
    } catch (e) {
      console.error("resolveReport hatası:", e);
      throw e;
    }
  },

  setSuggestionStatus: async (id, status) => {
    set((s) => ({
      suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status } : x)),
    }));
    try {
      let dbStatus: ReportStatus = "acik";
      if (status === "degerlendiriliyor") dbStatus = "inceleniyor";
      else if (status === "uygulandi") dbStatus = "cozuldu";
      else if (status === "arsiv") dbStatus = "reddedildi";

      await supabase.from("reports").update({ status: dbStatus }).eq("id", id);
    } catch (e) {
      console.error("setSuggestionStatus hatası:", e);
    }
  },
}));

if (typeof window !== "undefined") {
  useAdminStore.getState().fetchDashboardData();

  // Supabase Realtime Dinleyici: Şikayet, İlan ve Profil güncellemelerini anında ekrana yansıt
  try {
    supabase
      .channel("admin-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        useAdminStore.getState().fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        useAdminStore.getState().fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        useAdminStore.getState().fetchDashboardData();
      })
      .subscribe();
  } catch (err) {
    console.warn("Realtime subscription setup hatası:", err);
  }
}
