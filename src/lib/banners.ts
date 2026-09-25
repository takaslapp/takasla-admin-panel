import { supabase } from "./supabase";

export type BannerTargetType =
  | "explore"
  | "profile"
  | "create_listing"
  | "messages"
  | "listing_detail"
  | "external_url"
  | "none";

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  target_type: BannerTargetType;
  target_value?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const TARGET_TYPE_LABELS: Record<
  BannerTargetType,
  { label: string; description: string; icon: string; requiresValue?: boolean; placeholder?: string }
> = {
  explore: {
    label: "Keşfet Sayfası",
    description: "Kullanıcıyı doğrudan Keşfet sekmesine yönlendirir",
    icon: "Compass",
  },
  profile: {
    label: "Profil Sayfası",
    description: "Kullanıcının kendi profil sekmesine yönlendirir",
    icon: "User",
  },
  create_listing: {
    label: "Yeni İlan Ver (+)",
    description: "İlan oluşturma ekranını açar",
    icon: "PlusCircle",
  },
  messages: {
    label: "Mesajlar & Teklifler",
    description: "Gelen kutusu ve takas teklifleri sekmesine yönlendirir",
    icon: "MessageSquare",
  },
  listing_detail: {
    label: "Belirli Bir İlan Detayı",
    description: "İlan ID'si girilen ilanın detay sayfasına yönlendirir",
    icon: "Package",
    requiresValue: true,
    placeholder: "Örn: e983c518-20fa-40f4-9f4a-8f773caec99b",
  },
  external_url: {
    label: "Harici Web Bağlantısı",
    description: "Tarayıcıda açılacak bir web bağlantısı",
    icon: "ExternalLink",
    requiresValue: true,
    placeholder: "Örn: https://takaslapp.com/kampanya",
  },
  none: {
    label: "Tıklama Yok (Sadece Bilgilendirme)",
    description: "Banner'a dokunulduğunda herhangi bir sayfa açılmaz",
    icon: "EyeOff",
  },
};

export async function fetchAllBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchBanners error:", error);
    throw error;
  }

  return (data || []) as Banner[];
}

export async function createBanner(
  banner: Omit<Banner, "id" | "created_at" | "updated_at">
): Promise<Banner> {
  const { data, error } = await supabase
    .from("banners")
    .insert([banner])
    .select()
    .single();

  if (error) {
    console.error("createBanner error:", error);
    throw error;
  }

  return data as Banner;
}

export async function updateBanner(
  id: string,
  updates: Partial<Omit<Banner, "id" | "created_at" | "updated_at">>
): Promise<Banner> {
  const { data, error } = await supabase
    .from("banners")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateBanner error:", error);
    throw error;
  }

  return data as Banner;
}

export async function deleteBanner(id: string, imageUrl?: string): Promise<void> {
  const { error } = await supabase.from("banners").delete().eq("id", id);

  if (error) {
    console.error("deleteBanner error:", error);
    throw error;
  }

  // Eğer görsel Supabase Storage 'banners' bucket'ından ise temizle
  if (imageUrl && imageUrl.includes("/banners/")) {
    try {
      const parts = imageUrl.split("/banners/");
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1].split("?")[0]);
        await supabase.storage.from("banners").remove([filePath]);
      }
    } catch (e) {
      console.warn("Storage deletion warning:", e);
    }
  }
}

export async function toggleBannerActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("banners")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("toggleBannerActive error:", error);
    throw error;
  }
}

export async function uploadBannerImage(
  file: File
): Promise<{ url: string; width?: number; height?: number }> {
  // 1. Dosya boyutu kontrolü (Maksimum 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Görsel boyutu 5 MB'dan küçük olmalıdır.");
  }

  // 2. Boyutları tespit et
  const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = URL.createObjectURL(file);
  });

  // 3. Dosya uzantısı ve tekil isim
  const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
  const uniqueName = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  // 4. Supabase Storage 'banners' bucket'ına yükle
  const { data, error } = await supabase.storage
    .from("banners")
    .upload(uniqueName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("uploadBannerImage error:", error);
    throw new Error(`Görsel yüklenemedi: ${error.message}`);
  }

  // 5. Public URL al
  const { data: publicUrlData } = supabase.storage
    .from("banners")
    .getPublicUrl(data.path);

  return {
    url: publicUrlData.publicUrl,
    width: dimensions.width,
    height: dimensions.height,
  };
}
