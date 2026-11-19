/**
 * Tüm yanıtlara güvenlik başlıkları ekler (canlı sunucu / Nitro).
 * - Panel başka bir sitenin içine gömülemez (clickjacking koruması).
 * - Tarayıcı her zaman HTTPS kullanır (HSTS).
 * - Arama motorları paneli dizine eklemez.
 */
const SUPABASE = "https://supabase.takaslapp.com";

const CSP = [
  "default-src 'self'",
  // TanStack Start satır içi hidrasyon betikleri kullanır
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // İlan ve banner görselleri farklı depolama alanlarından gelir
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${SUPABASE} wss://supabase.takaslapp.com https://*.r2.cloudflarestorage.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
};

interface MiddlewareEvent {
  res?: { headers?: Headers };
}

export default async function securityHeaders(
  event: MiddlewareEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  // Yanıt henüz oluşmadan da başlıkları ayarla (statik dosyalar vb.)
  const pending = event.res?.headers;
  if (pending) for (const [k, v] of Object.entries(SECURITY_HEADERS)) pending.set(k, v);

  const result = await next();
  if (result instanceof Response) {
    const headers = new Headers(result.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
    return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
  }
  return result;
}
