-- =========================================================================
-- TAKAS SİSTEMİ VERİ BÜTÜNLÜĞÜ VE TAMAMLANMIŞ TAKAS KORUMA TETİKLEYİCİLERİ
-- =========================================================================
-- Bu script:
-- 1. Tamamlanmış takasların (swap_offers status = 'completed') veritabanından silinmesini KESİN OLARAK ENGELLER.
-- 2. Tamamlanmış ilanların (listings status = 'completed') silinmesini ENGELLER.
-- 3. Tamamlanmış ilanların tekrar yayına alınmasını/aktif edilmesini ENGELLER.
-- 4. Değerlendirmelerin ve takas geçmişinin kalıcı olmasını güvenceye alır.
--
-- NASIL UYGULANIR:
-- Supabase Dashboard -> SQL Editor alanına yapıştırıp "Run" butonuna basın.
-- =========================================================================

-- 1. TAMAMLANMIŞ TAKASLARI SİLİNMEYE KARŞI KORUMA FONKSİYONU & TETİKLEYİCİSİ
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_completed_swap_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eğer takas tamamlanmışsa veya her iki taraf da onaylamışsa SİLİNEMEZ!
  IF OLD.status = 'completed' OR (OLD.sender_confirmed_trade = true AND OLD.receiver_confirmed_trade = true) THEN
    RAISE EXCEPTION 'Tamamlanmış takaslar (completed) tarihsel kayıt ve değerlendirme bütünlüğü gereği silinemez.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_completed_swap_deletion ON public.swap_offers;
CREATE TRIGGER trg_prevent_completed_swap_deletion
  BEFORE DELETE ON public.swap_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_completed_swap_deletion();

-- 2. TAMAMLANMIŞ İLANLARIN SİLİNMESİNİ ENGELLEME FONKSİYONU & TETİKLEYİCİSİ
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_completed_listing_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eğer ilan takaslanmış/tamamlanmışsa SİLİNEMEZ!
  IF OLD.status IN ('completed', 'takaslandi') THEN
    RAISE EXCEPTION 'Takaslanmış ilan kayıtları (completed) silinemez. Tarihsel kayıt olarak korunmalıdır.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_completed_listing_deletion ON public.listings;
CREATE TRIGGER trg_prevent_completed_listing_deletion
  BEFORE DELETE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_completed_listing_deletion();

-- 3. TAMAMLANMIŞ İLANIN TEKRAR AKTİF EDİLMESİNİ VEYA DURUM DEĞİŞTİRMESİNİ ENGELLEME
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_completed_listing_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- İlan daha önce tamamlanmışsa, durumu tekrar pending, approved veya başka bir duruma çekilemez!
  IF OLD.status IN ('completed', 'takaslandi') AND NEW.status NOT IN ('completed', 'takaslandi') THEN
    RAISE EXCEPTION 'Tamamlanmış bir ilan tekrar aktif edilemez veya farklı bir duruma dönüştürülemez.';
  END IF;

  -- Eğer tamamlanmışsa her zaman is_active = false kalmalı
  IF NEW.status IN ('completed', 'takaslandi') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_completed_listing_reactivation ON public.listings;
CREATE TRIGGER trg_prevent_completed_listing_reactivation
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_completed_listing_reactivation();

-- 4. POSTGREST ŞEMA ÖNBELLEĞİNİ YENİLE
-- -------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
