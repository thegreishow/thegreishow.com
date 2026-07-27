const ALLOWED_ORIGINS = new Set([
  'https://thegreishow.com',
  'https://www.thegreishow.com',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);

export function secureJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

export function requireTrustedOrigin(request) {
  const origin = request.headers.get('origin') || '';
  return !origin || ALLOWED_ORIGINS.has(origin);
}

export function isJsonRequest(request) {
  return (request.headers.get('content-type') || '').toLowerCase().startsWith('application/json');
}

export function isHoneypotTriggered(payload) {
  return Boolean(String(payload?.website || '').trim());
}

export function cleanText(value, maxLength) {
  return String(value ?? '').trim().replace(/\u0000/g, '').slice(0, maxLength);
}

export function validEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export async function checkRateLimit(request, namespace, limit = 5, windowSeconds = 600) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${namespace}:${ip}`));
  const token = [...new Uint8Array(digest)].slice(0, 12).map(value => value.toString(16).padStart(2, '0')).join('');
  const cache = caches.default;
  const key = new Request(`https://rate-limit.internal/${namespace}/${token}`);
  const now = Date.now();
  const cached = await cache.match(key);
  let state = { count: 0, resetAt: now + windowSeconds * 1000 };

  if (cached) {
    const stored = await cached.json().catch(() => null);
    if (stored && stored.resetAt > now) state = stored;
  }

  if (state.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((state.resetAt - now) / 1000))
    };
  }

  state.count += 1;
  await cache.put(key, secureJson(state, 200, {
    'cache-control': `public, max-age=${windowSeconds}`
  }));
  return { allowed: true, remaining: Math.max(0, limit - state.count) };
}

export async function verifyTurnstile(request, env, payload, expectedAction) {
  if (!env?.TURNSTILE_SECRET_KEY) return { success: true, configured: false };
  const token = cleanText(payload?.turnstile_token || payload?.['cf-turnstile-response'], 2048);
  if (!token) return { success: false, configured: true };

  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET_KEY);
  form.set('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) form.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form
  });
  const result = await response.json().catch(() => ({}));
  const hostnameAllowed = !result.hostname || ['thegreishow.com', 'www.thegreishow.com', 'localhost'].includes(result.hostname);
  const actionAllowed = !result.action || result.action === expectedAction;
  return { success: Boolean(result.success && hostnameAllowed && actionAllowed), configured: true };
}
