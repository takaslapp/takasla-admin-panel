-- ========================================================
-- TAKASLA ADMIN & APP SUPABASE EK TABLOLAR
-- Coolify Supabase Studio -> SQL Editor alanında çalıştırın
-- ========================================================

-- 1. Bildirimler Tablosu (Admin ilan reddetme, onay ve sistem mesajları)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  related_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Şikayet ve Bildirimler Tablosu
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'listing' | 'user'
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id),
  reporter_name TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'acik', -- 'acik' | 'inceleniyor' | 'cozuldu' | 'reddedildi'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security (RLS) İzinleri
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on notifications" ON public.notifications;
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on reports" ON public.reports;
CREATE POLICY "Allow all on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

-- 4. Supabase Realtime İzni (Admin panelinde anında canlı yenilenmesi için)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 5. Foreign Key esnekliği (Oturumsuz veya profili henüz oluşmamış raporlar için kısıt kaldırma)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
