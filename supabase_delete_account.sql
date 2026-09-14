-- ========================================================
-- TAKASLA SUPABASE: HESABI KALICI SİLME FONKSİYONU
-- Coolify Supabase Studio -> SQL Editor alanında bir kere çalıştırın
-- ========================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- İstekte bulunan kullanıcının ID'sini doğrulanmış token'dan al
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadı veya yetkisiz istek.';
  END IF;

  -- 1. Kullanıcıya ait ilişkili tüm verileri temizle
  DELETE FROM public.favorites WHERE user_id = v_user_id;
  DELETE FROM public.listing_images WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  DELETE FROM public.favorites WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  DELETE FROM public.swap_offers WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id) OR offered_listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  DELETE FROM public.swap_offers WHERE offered_by = v_user_id OR owner_id = v_user_id;
  DELETE FROM public.reports WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  DELETE FROM public.listings WHERE user_id = v_user_id;
  DELETE FROM public.messages WHERE sender_id = v_user_id OR conversation_id IN (SELECT id FROM public.conversations WHERE participant_1 = v_user_id OR participant_2 = v_user_id);
  DELETE FROM public.conversations WHERE participant_1 = v_user_id OR participant_2 = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.reports WHERE reporter_id = v_user_id OR reported_user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 2. En kritik adım: Kullanıcıyı Supabase Authentication (auth.users) tablosundan kalıcı olarak sil
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Giriş yapmış kullanıcıların bu fonksiyonu çağırmasına izin ver
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
