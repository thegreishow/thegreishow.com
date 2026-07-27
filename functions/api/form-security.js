import { secureJson } from '../_lib/security.js';

export async function onRequestGet({ env }) {
  return secureJson({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || null
  });
}
