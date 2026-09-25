-- ============================================================================
-- TAKASLA DİNAMİK BANNER SİSTEMİ – FINAL PRODUCTION-READY MIGRATION
-- ⚠️ BU DOSYA HENÜZ PRODUCTION'DA ÇALIŞTIRILMAMIŞTIR.
-- Coolify Supabase Studio -> SQL Editor alanında güvenle çalıştırılabilir.
-- ============================================================================

-- 1. Banners Tablosu
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'none', 
  -- Hedef Sayfa / Aksiyon Türleri:
  -- 'explore'        : Keşfet Sayfası
  -- 'profile'        : Profil Sayfası
  -- 'create_listing' : Yeni İlan Ekle (+)
  -- 'messages'       : Mesajlar & Teklifler
  -- 'listing_detail' : Belirli İlan Detayı (target_value = listing_id UUID)
  -- 'external_url'   : Harici Web Bağlantısı (target_value = https://...)
  -- 'none'           : Sadece Görsel (Tıklama eylemi yok)
  target_value TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. İndeksler (Sıralama ve aktiflik filtreleri için)
CREATE INDEX IF NOT EXISTS idx_banners_active_order 
ON public.banners(is_active, display_order ASC, created_at DESC);

-- 3. Otomatik Güncelleme Zamanı Tetikleyicisi (updated_at)
CREATE OR REPLACE FUNCTION public.handle_banner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_banner_updated_at ON public.banners;
CREATE TRIGGER trigger_banner_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_banner_updated_at();

-- 4. HARDENED SECURITY DEFINER ADMIN KONTROL FONKSİYONU
-- İsim: public.is_banner_admin() (Mevcut fonksiyonlarla çakışmayı önler)
CREATE OR REPLACE FUNCTION public.is_banner_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_uid uuid;
BEGIN
  -- 1) Service role anahtarı doğrudan tam yetkilidir
  BEGIN
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN true;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2) auth.uid() al
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 3) Schema-qualified profiles tablosundan role sorgula
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_uid;

  RETURN (v_role = 'admin');
END;
$$;

ALTER FUNCTION public.is_banner_admin() OWNER TO postgres;

-- PUBLIC ve anon execute yetkilerini revoke et
REVOKE ALL ON FUNCTION public.is_banner_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_banner_admin() FROM anon;

-- Yalnızca authenticated ve service_role rollerine EXECUTE izni ver
GRANT EXECUTE ON FUNCTION public.is_banner_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banner_admin() TO service_role;

-- 5. TABLE PRIVILEGES (MINIMUM EXPLICIT GRANTS)
-- Varsayılan PUBLIC / anon izinlerini temizle
REVOKE ALL ON TABLE public.banners FROM PUBLIC;
REVOKE ALL ON TABLE public.banners FROM anon;
REVOKE ALL ON TABLE public.banners FROM authenticated;

-- anon: Yalnızca SELECT hakkı (RLS politikası ile filtrelenir; mutation ASLA yapamaz)
GRANT SELECT ON TABLE public.banners TO anon;

-- authenticated: SELECT ve mutation hakkı (RLS politikası ile admin kontrol edilir; TRUNCATE yok)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banners TO authenticated;

-- service_role: Tam yetki
GRANT ALL ON TABLE public.banners TO service_role;

-- 6. Row Level Security (RLS) Etkinleştirme ve Politikalar
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Eski wildcard / taslak politikaları temizle
DROP POLICY IF EXISTS "Active banners are viewable by everyone" ON public.banners;
DROP POLICY IF EXISTS "Admin full access on banners" ON public.banners;
DROP POLICY IF EXISTS "Public read active banners" ON public.banners;
DROP POLICY IF EXISTS "Admin read all banners" ON public.banners;
DROP POLICY IF EXISTS "Admin insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admin update banners" ON public.banners;
DROP POLICY IF EXISTS "Admin delete banners" ON public.banners;

-- OKUMA POLİTİKALARI (SELECT):
-- 1) Aktif bannerlar: anon ve authenticated herkes okuyabilir (is_banner_admin fonksiyonuna ASLA dokunmaz)
CREATE POLICY "Public read active banners"
ON public.banners
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2) Tüm bannerlar (aktif + pasif taslaklar): Yalnızca authenticated yöneticiler okuyabilir
CREATE POLICY "Admin read all banners"
ON public.banners
FOR SELECT
TO authenticated
USING (public.is_banner_admin());

-- YAZMA POLİTİKASI (INSERT): Yalnızca Admin
CREATE POLICY "Admin insert banners"
ON public.banners FOR INSERT
TO authenticated
WITH CHECK (
  public.is_banner_admin()
);

-- GÜNCELLEME POLİTİKASI (UPDATE): Yalnızca Admin
CREATE POLICY "Admin update banners"
ON public.banners FOR UPDATE
TO authenticated
USING (
  public.is_banner_admin()
)
WITH CHECK (
  public.is_banner_admin()
);

-- SİLME POLİTİKASI (DELETE): Yalnızca Admin
CREATE POLICY "Admin delete banners"
ON public.banners FOR DELETE
TO authenticated
USING (
  public.is_banner_admin()
);

-- 7. Supabase Realtime (İdempotent Ekleme - Hatalar Gizlenmez)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'banners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
  END IF;
END $$;

-- 8. Supabase Storage - 'banners' Public Bucket Tanımlama
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880, -- 5 MB Maksimum Dosya Boyutu
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 9. Storage RLS Politikaları
DROP POLICY IF EXISTS "Public can view banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin update banner objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete banner objects" ON storage.objects;

-- Storage SELECT: Herkes okuyabilir (görseller CDN üzerinden herkese açıktır)
CREATE POLICY "Public read banner objects"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Storage INSERT: Yalnızca Admin yükleyebilir (anon ve normal kullanıcı ASLA yükleyemez)
CREATE POLICY "Admin upload banner objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'banners' AND public.is_banner_admin()
);

-- Storage UPDATE: Yalnızca Admin güncelleyebilir
CREATE POLICY "Admin update banner objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'banners' AND public.is_banner_admin()
)
WITH CHECK (
  bucket_id = 'banners' AND public.is_banner_admin()
);

-- Storage DELETE: Yalnızca Admin silebilir
CREATE POLICY "Admin delete banner objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'banners' AND public.is_banner_admin()
);
