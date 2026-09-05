import { create } from "zustand";
import {
  LISTINGS,
  REPORTS,
  SUGGESTIONS,
  USERS,
  formatPhone,
  type Listing,
  type ListingStatus,
  type Report,
  type ReportStatus,
  type Suggestion,
  type SuggestionStatus,
  type User,
  type UserStatus,
} from "./data";
import { supabase } from "./supabase";

type SwapOfferStats = {
  totalOffers: number;
  pendingOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
};

type Store = {
  users: User[];
  listings: Listing[];
  reports: Report[];
  suggestions: Suggestion[];
  swapStats: SwapOfferStats;
  isLoading: boolean;
  fetchDashboardData: () => Promise<void>;
  setUserStatus: (id: string, status: UserStatus) => Promise<void>;
  approveListing: (id: string) => Promise<void>;
  rejectListing: (id: string, reason: string) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  setReportStatus: (id: string, status: ReportStatus) => Promise<void>;
  setSuggestionStatus: (id: string, status: SuggestionStatus) => void;
};

export const useAdminStore = create<Store>()((set, get) => ({
  users: USERS,
  listings: LISTINGS,
  reports: [],
  suggestions: SUGGESTIONS,
  swapStats: {
    totalOffers: 0,
    pendingOffers: 0,
    acceptedOffers: 0,
    rejectedOffers: 0,
  },
  isLoading: false,

  fetchDashboardData: async () => {
    set({ isLoading: true });
    try {
      // 1. Canlı Kullanıcılar (profiles) ve İlanlar (listings) paralel çekilir
      const [profilesRes, listingsRes, offersRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("listings").select("*").order("created_at", { ascending: false }),
        supabase.from("swap_offers").select("id, status"),
      ]);

      const rawProfiles = profilesRes.data || [];
      const rawListings = listingsRes.data || [];
      const rawOffers = offersRes.data || [];

      // Her kullanıcının gerçek ilan sayısını hesapla
      const userListingCounts = new Map<string, number>();
      const userMap = new Map<string, { name: string; phone: string }>();

      for (const l of rawListings) {
        if (l.user_id) {
          const currentCount = userListingCounts.get(l.user_id) || 0;
          userListingCounts.set(l.user_id, currentCount + 1);
        }
      }

      // Kullanıcı listesi
      let usersList: User[] = USERS;
      if (rawProfiles.length > 0) {
        usersList = rawProfiles.map((p) => {
          const fullName = p.full_name || p.username || "Kullanıcı";
          const username = p.username ? `@${p.username}` : (p.phone ? `@${p.phone}` : "@uye");
          const phone = formatPhone(p.phone);
          userMap.set(p.id, { name: fullName, phone });

          const dt = p.created_at ? new Date(p.created_at) : new Date();
          const joinedFormatted = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;

          return {
            id: p.id,
            name: fullName,
            username,
            phone,
            city: p.city || "Türkiye",
            avatar: p.avatar_url || "/avatars/ayse.jpg",
            listingsCount: userListingCounts.get(p.id) || 0,
            joined: joinedFormatted,
            role: p.username === "admin" ? "Yönetici" : "Kullanıcı",
          };
        });
      }

      // İlan listesi
      let listingsList: Listing[] = LISTINGS;
      if (rawListings.length > 0) {
        listingsList = rawListings.map((l) => {
          const ownerInfo = userMap.get(l.user_id) || { name: "Kullanıcı", phone: "Belirtilmemiş" };
          const dt = l.created_at ? new Date(l.created_at) : new Date();
          const createdFormatted = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;

          let status: ListingStatus = "yayinda";
          if (l.is_active === false) {
            status = "reddedildi";
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

      // Şikayetler tablosunu çek (Supabase public.reports)
      let reportsList: Report[] = [];
      try {
        const { data: repData, error: repError } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });

        if (!repError && repData !== null) {
          reportsList = repData.map((r, i) => {
            const dt = r.created_at ? new Date(r.created_at) : new Date();
            const timeStr = `${dt.toLocaleDateString("tr-TR")} ${dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
            return {
              id: r.id || `SK-${i + 1}`,
              subject: r.reason || "Bildirim",
              reporter: r.reporter_name || (r.reporter_id ? userMap.get(r.reporter_id)?.name : undefined) || "Kullanıcı",
              target: r.target_title || "İlgili İlan",
              type: r.type === "user" ? "Kullanıcı Şikayeti" : "İlan Bildirimi",
              status: (r.status as ReportStatus) || "acik",
              created: timeStr,
              detail: r.details || r.reason || "",
            };
          });
        } else {
          reportsList = [];
        }
      } catch (err) {
        console.warn("Reports fetch hatası:", err);
        reportsList = [];
      }

      set({
        users: usersList,
        listings: listingsList,
        reports: reportsList,
        swapStats,
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
    set((s) => ({
      listings: s.listings.map((l) => (l.id === id ? { ...l, status: "yayinda" } : l)),
    }));
    try {
      await supabase.from("listings").update({ is_active: true }).eq("id", id);
    } catch (e) {
      console.error("approveListing hatası:", e);
    }
  },

  rejectListing: async (id: string, reason: string) => {
    const listing = get().listings.find((l) => l.id === id);
    set((s) => ({
      listings: s.listings.map((l) => (l.id === id ? { ...l, status: "reddedildi", rejectReason: reason } : l)),
    }));
    try {
      // 1. İlanı deaktif et
      await supabase.from("listings").update({ is_active: false }).eq("id", id);

      // 2. Kullanıcıya bildirim gönder (kullanıcının bildirim ekranına düşsün)
      if (listing && listing.ownerId) {
        try {
          await supabase.from("notifications").insert({
            user_id: listing.ownerId,
            title: `İlanınız Onaylanmadı: ${listing.title}`,
            message: `"${listing.title}" başlıklı ilanınız incelendi ve reddedildi.\nNeden: ${reason}`,
            type: "listing_rejected",
            related_id: id,
          });
        } catch (notifErr) {
          console.warn("Notification insert fallback:", notifErr);
        }
      }
    } catch (e) {
      console.error("rejectListing hatası:", e);
    }
  },

  deleteListing: async (id: string) => {
    set((s) => ({
      listings: s.listings.filter((l) => l.id !== id),
    }));
    try {
      // Supabase'den ilanı sil
      await supabase.from("listings").delete().eq("id", id);
    } catch (e) {
      console.error("deleteListing hatası:", e);
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

  setSuggestionStatus: (id, status) =>
    set((s) => ({
      suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status } : x)),
    })),
}));

if (typeof window !== "undefined") {
  useAdminStore.getState().fetchDashboardData();

  // Supabase Realtime Dinleyici: Şikayet ve İlan güncellemelerini anında ekrana yansıt
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
