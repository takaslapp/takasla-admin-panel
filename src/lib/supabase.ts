import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "http://supabasekong-0dfraqtznuhdxtpzvidcex9d.179.198.200.147.sslip.io";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4ODM2MzAwMCwiZXhwIjo0OTQ0MDM2NjAwLCJyb2xlIjoiYW5vbiJ9.hUvf_6rITGdijl2NTia81kLIVR_yfYt8cbPO4WYsoyM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
  realtime: typeof window === "undefined" ? { transport: WebSocket as any } : undefined,
});
