-- ========================================================
-- TAKASLA SUPABASE: HESABI VE TÜM VERİLERİ KALICI SİLME FONKSİYONU
-- Coolify Supabase Studio -> SQL Editor alanında çalıştırın
-- Apple App Store Review Guideline 5.1.1(v) uyumluluğu için zorunludur
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
  -- 1. İstekte bulunan kullanıcının ID'sini doğrulanmış token'dan al
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadı veya yetkisiz istek.';
  END IF;

  -- 2. Bildirim jetonlarını (FCM) temizle
  BEGIN
    DELETE FROM public.user_fcm_tokens WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 3. Bildirimleri temizle
  BEGIN
    DELETE FROM public.notifications WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 4. Cüzdan hareketlerini temizle (Foreign key kısıtını engellemek için)
  BEGIN
    DELETE FROM public.wallet_transactions WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 5. Favorileri temizle (Hem kullanıcının favorileri hem de kullanıcının ilanlarına gelen favoriler)
  BEGIN
    DELETE FROM public.favorites 
    WHERE user_id = v_user_id 
       OR listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 6. Takas tekliflerini temizle
  -- Kolon isimleri: sender_user_id, receiver_user_id, sender_listing_id, receiver_listing_id
  BEGIN
    DELETE FROM public.swap_offers 
    WHERE sender_user_id = v_user_id 
       OR receiver_user_id = v_user_id
       OR sender_listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id)
       OR receiver_listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 7. Mesajları ve sohbetleri temizle
  BEGIN
    DELETE FROM public.messages 
    WHERE sender_id = v_user_id 
       OR conversation_id IN (
         SELECT id FROM public.conversations 
         WHERE participant_1 = v_user_id OR participant_2 = v_user_id
       );
    DELETE FROM public.conversations 
    WHERE participant_1 = v_user_id OR participant_2 = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 8. Şikayet / Rapor kayıtlarını temizle
  BEGIN
    DELETE FROM public.reports 
    WHERE reporter_id = v_user_id 
       OR target_id = v_user_id::text 
       OR target_id IN (SELECT id::text FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 9. İlan fotoğraflarını ve ilanları temizle
  BEGIN
    DELETE FROM public.listing_images 
    WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
    DELETE FROM public.listings WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 10. Kullanıcı profilini (public.profiles) sil
  BEGIN
    DELETE FROM public.profiles WHERE id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 11. EN KRİTİK ADIM: Kullanıcıyı Supabase Authentication (auth.users) tablosundan kalıcı olarak sil
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Giriş yapmış tüm kullanıcıların kendi hesaplarını silmesi için çalıştırma izni ver
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
