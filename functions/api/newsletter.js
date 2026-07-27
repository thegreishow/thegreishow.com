import {
  checkRateLimit,
  isHoneypotTriggered,
  isJsonRequest,
  requireTrustedOrigin,
  secureJson,
  verifyTurnstile
} from '../_lib/security.js';

const SUBSCRIBE_ENDPOINT = 'https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/subscribe-release-list';

export async function onRequestPost({ request, env }) {
  if (!requireTrustedOrigin(request)) return secureJson({ error: 'Origin not allowed' }, 403);
  if (!isJsonRequest(request)) return secureJson({ error: 'JSON request required' }, 415);

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 12_000) return secureJson({ error: 'Request too large' }, 413);

  const rate = await checkRateLimit(request, 'newsletter', 5, 600);
  if (!rate.allowed) {
    return secureJson({ error: 'Too many signup attempts. Please try again later.' }, 429, {
      'retry-after': String(rate.retryAfter)
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return secureJson({ error: 'Invalid request body' }, 400);
  }

  if (isHoneypotTriggered(payload)) return secureJson({ ok: true, message: 'You are on the list.' });
  const challenge = await verifyTurnstile(request, env, payload, 'newsletter');
  if (!challenge.success) return secureJson({ error: 'Human verification failed. Please try again.' }, 400);

  const upstream = await fetch(SUBSCRIBE_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://thegreishow.com',
      'x-form-client': request.headers.get('cf-connecting-ip') || 'unknown'
    },
    body: JSON.stringify(payload)
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
