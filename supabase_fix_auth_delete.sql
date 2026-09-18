-- =========================================================================
-- TAKASLA SUPABASE: AUTHENTICATION KULLANICI SİLME & İLİŞKİ DÜZELTME
-- =========================================================================
-- Bu script:
-- 1. listings <-> profiles ilişkisini (PGRST200 schema cache hatası) düzeltir
-- 2. user_fcm_tokens RLS izinlerini (42501 Forbidden hatası) düzeltir
-- 3. Supabase Auth Dashboard'dan kullanıcı silme (API Error) hatasını çözer
-- 4. PostgREST şema önbelleğini otomatik yeniler
--
-- NASIL UYGULANIR:
-- Supabase Dashboard -> SQL Editor alanına yapıştırıp "Run" butonuna basın.
-- =========================================================================

-- 1. PROFILES <-> AUTH.USERS CASCADE İLİŞKİSİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. LISTINGS <-> PROFILES CASCADE İLİŞKİSİ (PostgREST Join İçin Zorunlu)
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.listings 
  DROP CONSTRAINT IF EXISTS listings_user_id_fkey,
  ADD CONSTRAINT listings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. LISTING_IMAGES <-> LISTINGS CASCADE İLİŞKİSİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.listing_images 
  DROP CONSTRAINT IF EXISTS listing_images_listing_id_fkey,
  ADD CONSTRAINT listing_images_listing_id_fkey 
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- 4. FAVORITES TABLOSU CASCADE İLİŞKİLERİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.favorites 
  DROP CONSTRAINT IF EXISTS favorites_user_id_fkey,
  DROP CONSTRAINT IF EXISTS favorites_listing_id_fkey;

ALTER TABLE IF EXISTS public.favorites 
  ADD CONSTRAINT favorites_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT favorites_listing_id_fkey 
    FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;

-- 5. NOTIFICATIONS TABLOSU CASCADE İLİŞKİSİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. WALLET_TRANSACTIONS TABLOSU CASCADE İLİŞKİSİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.wallet_transactions 
  DROP CONSTRAINT IF EXISTS wallet_transactions_user_id_fkey,
  ADD CONSTRAINT wallet_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. USER_FCM_TOKENS TABLOSU & RLS İZİNLERİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_fcm_tokens 
  DROP CONSTRAINT IF EXISTS user_fcm_tokens_user_id_fkey,
  ADD CONSTRAINT user_fcm_tokens_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can manage own tokens" ON public.user_fcm_tokens 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anon can insert or manage fcm tokens" ON public.user_fcm_tokens;
CREATE POLICY "Anon can insert or manage fcm tokens" ON public.user_fcm_tokens 
  FOR ALL TO anon 
  USING (true) 
  WITH CHECK (true);

-- 8. SWAP_OFFERS & CONVERSATIONS & REPORTS FOREIGN KEY ESNEKLİĞİ
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.reports 
  DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;

-- 9. AUTH.USERS OTOMATİK SİLME TETİKLEYİCİSİ (TRIGGER)
-- -------------------------------------------------------------------------
-- Dashboard > Authentication > Users'tan kullanıcı silindiğinde
-- tüm bağlı tabloları sırasıyla ve hatasız temizler
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

  -- 1. FCM tokenları temizle
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

  -- 4. Favorileri temizle
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

  -- 7. Engellenenleri temizle
  BEGIN
    DELETE FROM public.blocked_users 
    WHERE user_id = v_user_id OR blocked_user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 8. Değerlendirmeleri temizle
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

  -- 9. Şikayetleri temizle
  BEGIN
    DELETE FROM public.reports 
    WHERE reporter_id = v_user_id 
       OR target_id = v_user_id::text 
       OR target_id IN (SELECT id::text FROM public.listings WHERE user_id = v_user_id);
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 10. İlanları ve fotoğrafları temizle
  BEGIN
    DELETE FROM public.listing_images 
    WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = v_user_id);
    DELETE FROM public.listings WHERE user_id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- 11. Profili temizle
  BEGIN
    DELETE FROM public.profiles WHERE id = v_user_id;
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN OLD;
END;
$$;

-- Trigger'ı bağla
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deleted();

GRANT EXECUTE ON FUNCTION public.handle_auth_user_deleted() TO postgres, service_role;

-- 10. POSTGREST ŞEMA ÖNBELLEĞİNİ YENİLE (Anında geçerli olması için)
-- -------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
