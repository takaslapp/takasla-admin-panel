-- ============================================================================
-- TAKASLA BANNER MİGRASYONU GÜVENLİ GERİ ALMA (SAFE ROLLBACK) SQL
-- ⚠️ BU DOSYA HENÜZ ÇALIŞTIRILMAMIŞTIR.
-- Banner sistemi kaldırılmak istendiğinde güvenle çalıştırılabilir.
-- ============================================================================

-- 1. Realtime Publication'dan Güvenle Çıkar (İdempotent - Hatalar Gizlenmez)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'banners'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.banners;
  END IF;
END $$;

-- 2. Storage RLS Politikalarını Kaldır
DROP POLICY IF EXISTS "Public read banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin update banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Public can view banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete banners" ON storage.objects;

-- 3. Banners Tablosunu ve RLS Politikalarını Kaldır
DROP TABLE IF EXISTS public.banners CASCADE;

-- 4. Yalnızca Banner Sistemine Özel Fonksiyonları Kaldır
DROP FUNCTION IF EXISTS public.handle_banner_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_banner_admin() CASCADE;

-- 5. STORAGE GÖRSELLERİ NOTU:
-- Yıkıcı veri kaybını önlemek için storage'daki banner görselleri otomatik SİLİNMEMİŞTİR.
-- İleride bucket'ı ve görselleri tamamen silmek isterseniz aşağıdaki komutları manuel çalıştırabilirsiniz:
--
-- DELETE FROM storage.objects WHERE bucket_id = 'banners';
-- DELETE FROM storage.buckets WHERE id = 'banners';
