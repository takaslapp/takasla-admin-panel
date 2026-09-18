-- =========================================================================
-- TAKASLA SUPABASE: AUTHENTICATION KULLANICI SİLME DÜZELTME SCRIPTI
-- =========================================================================
-- Bu script, Supabase Dashboard > Authentication > Users kısmından
-- kullanıcı silindiğinde çıkan "API error happened while trying to communicate with the server"
-- hatasını tamamen çözer.
--
-- NASIL UYGULANIR:
-- Supabase Dashboard -> SQL Editor alanına yapıştırın ve "Run" butonuna basın.
-- =========================================================================

-- 1. FOREIGN KEY KISITLARINI "ON DELETE CASCADE" OLARAK GÜNCELLE
-- -------------------------------------------------------------------------

-- profiles -> auth.users
ALTER TABLE IF EXISTS public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_fcm_tokens -> profiles / auth.users
ALTER TABLE IF EXISTS public.user_fcm_tokens 
  DROP CONSTRAINT IF EXISTS user_fcm_tokens_user_id_fkey,
  ADD CONSTRAINT user_fcm_tokens_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- notifications -> profiles / auth.users
ALTER TABLE IF EXISTS public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- wallet_transactions -> profiles / auth.users
ALTER TABLE IF EXISTS public.wallet_transactions 
  DROP CONSTRAINT IF EXISTS wallet_transactions_user_id_fkey,
  ADD CONSTRAINT wallet_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- listings -> profiles / auth.users
ALTER TABLE IF EXISTS public.listings 
  DROP CONSTRAINT IF EXISTS listings_user_id_fkey,
  ADD CONSTRAINT listings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- listing_images -> listings
ALTER TABLE IF EXISTS public.listing_images 
  DROP CONSTRAINT IF EXISTS listing_images_listing_id_fkey,
  ADD CONSTRAINT listing_images_listing_id_fkey 
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- favorites -> profiles & listings
ALTER TABLE IF EXISTS public.favorites 
  DROP CONSTRAINT IF EXISTS favorites_user_id_fkey,
  DROP CONSTRAINT IF EXISTS favorites_listing_id_fkey,
  ADD CONSTRAINT favorites_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT favorites_listing_id_fkey 
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- blocked_users -> profiles / auth.users
ALTER TABLE IF EXISTS public.blocked_users 
  DROP CONSTRAINT IF EXISTS blocked_users_user_id_fkey,
  DROP CONSTRAINT IF EXISTS blocked_users_blocked_user_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocked_users') THEN
    BEGIN
      ALTER TABLE public.blocked_users 
        ADD CONSTRAINT blocked_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
        ADD CONSTRAINT blocked_users_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- reports tablosu foreign key esnekliği
ALTER TABLE IF EXISTS public.reports 
  DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;


-- 2. AUTH.USERS SİLME TETİKLEYİCİSİ (TRIGGER)
-- -------------------------------------------------------------------------
-- Supabase Authentication tablosundan bir kullanıcı silindiğinde,
-- PostgreSQL önce bu fonksiyonu çalıştırarak ilişkili tüm verileri temizler.
-- Böylece hiçbir Foreign Key çakışması veya kilitlenme yaşanmaz.

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := OLD.id;

  -- 1. Bildirim jetonlarını temizle
  BEGIN
    DELETE FROM public.user_fcm_tokens WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 2. Bildirimleri temizle
  BEGIN
    DELETE FROM public.notifications WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 3. Cüzdan hareketlerini temizle
  BEGIN
    DELETE FROM public.wallet_transactions WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 4. Favorileri temizle (kullanıcının favorileri + ilanlarına gelen favoriler)
  BEGIN
    DELETE FROM public.favorites 
    WHERE user_id = v_user_id 
       OR listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 5. Mesajları ve sohbetleri temizle
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

  -- 6. Takas tekliflerini temizle
  BEGIN
    DELETE FROM public.swap_offers 
    WHERE sender_user_id = v_user_id 
       OR receiver_user_id = v_user_id
       OR sender_listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id)
       OR receiver_listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 7. Engellenen kullanıcı kayıtlarını temizle
  BEGIN
    DELETE FROM public.blocked_users 
    WHERE user_id = v_user_id OR blocked_user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 8. Değerlendirme / Yorum kayıtlarını temizle (varsa)
  BEGIN
    DELETE FROM public.reviews 
    WHERE reviewer_id = v_user_id OR target_user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    DELETE FROM public.swap_reviews 
    WHERE reviewer_id = v_user_id OR target_user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 9. Şikayet kayıtlarını temizle / anonimleştir
  BEGIN
    DELETE FROM public.reports 
    WHERE reporter_id = v_user_id 
       OR target_id = v_user_id::text 
       OR target_id IN (SELECT id::text FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 10. İlan fotoğraflarını ve ilanları temizle
  BEGIN
    DELETE FROM public.listing_images 
    WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
    DELETE FROM public.listings WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 11. Kullanıcı profilini sil
  BEGIN
    DELETE FROM public.profiles WHERE id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN OLD;
END;
$$;

-- Trigger'ı auth.users tablosuna bağla
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deleted();

-- 3. Yetkilendirme
GRANT EXECUTE ON FUNCTION public.handle_auth_user_deleted() TO postgres, service_role;
