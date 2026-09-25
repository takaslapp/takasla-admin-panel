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

/**
 * URL üzerinden ilgili görseli siler (R2 veya legacy Supabase Storage)
 * Harici linklere dokunmaz.
 */
export async function deleteBannerImageByUrl(imageUrl?: string | null): Promise<void> {
  if (!imageUrl || typeof imageUrl !== "string") return;

  const isTakaslaR2 =
    imageUrl.includes("cdn.takaslapp.com/banners/") ||
    imageUrl.includes("/banners/banner_");

  const isLegacySupabase =
    imageUrl.includes("/storage/v1/object/public/banners/") ||
    (imageUrl.includes("/banners/") && !imageUrl.includes("cdn.takaslapp.com"));

  // 1. Cloudflare R2 Banner Objesi Silme
  if (isTakaslaR2) {
    try {
      const match = imageUrl.match(/banners\/banner_[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)/);
      if (match) {
        const objectKey = match[0];
        const { data, error } = await supabase.functions.invoke("r2-delete", {
          body: { objectKey },
        });

        if (error || (data && data.success === false)) {
          console.warn("⚠️ [R2 Banner Delete Hatası]:", error || data);
        } else {
          console.log("✅ [R2 Banner Delete Başarılı]:", objectKey);
        }
      }
    } catch (e) {
      console.warn("⚠️ [R2 Banner Deletion Exception]:", e);
    }
    return;
  }

  // 2. Legacy Supabase Storage Bucket Silme (Geriye Dönük Uyumluluk)
  if (isLegacySupabase) {
    try {
      const parts = imageUrl.split("/banners/");
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1].split("?")[0]);
        await supabase.storage.from("banners").remove([filePath]);
        console.log("✅ [Legacy Supabase Banner Delete]:", filePath);
      }
    } catch (e) {
      console.warn("⚠️ [Legacy Storage Deletion Warning]:", e);
    }
  }
}

export async function deleteBanner(id: string, imageUrl?: string): Promise<void> {
  // 1. Önce veritabanı kaydını sil
  const { error } = await supabase.from("banners").delete().eq("id", id);

  if (error) {
    console.error("deleteBanner DB error:", error);
    throw error;
  }

  // 2. DB silme başarılı olduktan sonra görseli temizle
  if (imageUrl) {
    await deleteBannerImageByUrl(imageUrl);
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

/**
 * Tarayıcı tarafında görseli WebP formatına dönüştürür ve boyutlarını okur
 */
async function processAndConvertToWebP(
  file: File
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context oluşturulamadı."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("WebP dönüşümü başarısız oldu."));
            return;
          }
          resolve({ blob, width, height });
        },
        "image/webp",
        0.90 // Kaliteli WebP sıkıştırması
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Görsel yüklenemedi veya geçersiz dosya biçimi."));
    };

    img.src = objectUrl;
  });
}

/**
 * 🚀 Cloudflare R2 Presigned Upload ile Banner Yükleme
 * r2-sign Edge Function'ı üzerinden güvenli URL alır ve HTTP PUT ile R2'ye yükler.
 */
export async function uploadBannerImage(
  file: File
): Promise<{ url: string; width: number; height: number }> {
  // 1. Maksimum dosya boyutu kontrolü (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Görsel boyutu 5 MB'dan küçük olmalıdır.");
  }

  // 2. WebP optimizasyonu ve boyut tespiti
  const { blob: webpBlob, width, height } = await processAndConvertToWebP(file);

  // 3. r2-sign Edge Function üzerinden presigned PUT URL al
  const { data: signData, error: signError } = await supabase.functions.invoke(
    "r2-sign",
    {
      body: {
        type: "banner",
        contentType: "image/webp",
      },
    }
  );

  if (signError || !signData?.success || !signData?.uploadUrl || !signData?.publicUrl) {
    console.error("r2-sign error:", signError || signData);
    const msg = signData?.error || signError?.message || "R2 presigned URL temin edilemedi";
    throw new Error(`R2 Yükleme Başarısız: ${msg}`);
  }

  const uploadUrl = signData.uploadUrl as string;
  const publicUrl = signData.publicUrl as string;

  // 4. Doğrudan Cloudflare R2'ye HTTP PUT ile yükle
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/webp",
    },
    body: webpBlob,
  });

  if (!putResponse.ok) {
    console.error("R2 PUT error:", putResponse.status, putResponse.statusText);
    throw new Error(`Cloudflare R2 yükleme başarısız (HTTP ${putResponse.status})`);
  }

  console.log(`✅ [R2 Banner Upload]: Başarıyla yüklendi -> ${publicUrl}`);

  return {
    url: publicUrl,
    width,
    height,
  };
}
