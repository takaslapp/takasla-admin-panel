-- ========================================================
-- TAKASLA İLAN ONAY SİSTEMİ & BİLDİRİM GELİŞTİRMESİ
-- Coolify Supabase Studio -> SQL Editor alanında çalıştırın
-- ========================================================

-- 1. listings tablosuna onay süreçleri için status ve not sütunlarını ekle
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 2. Mevcut ilanların tamamını 'approved' (Yayında) ve is_active=true olarak ayarla (Şu anki 6 ilan kesintisiz yayında kalsın)
UPDATE public.listings 
SET status = 'approved', is_active = true 
WHERE status IS NULL OR status = 'pending';

-- 3. notifications tablosunun ilgili ilan id ve bildirim tipini desteklemesini sağla
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notif_type TEXT DEFAULT 'system';

-- 4. Realtime yayınına listings ve notifications tablolarını dahil et (Canlı bildirim & admin senkronizasyonu)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
