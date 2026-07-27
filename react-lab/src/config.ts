const configuredOrigin = import.meta.env.VITE_SITE_ORIGIN?.trim();
const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://thegreishow.com';
const runtimePath = typeof window !== 'undefined' ? window.location.pathname : '';

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    console.warn(`Invalid VITE_SITE_ORIGIN value: ${value}. Falling back to the runtime origin.`);
    return runtimeOrigin;
  }
}

export const siteOrigin = configuredOrigin ? normalizeOrigin(configuredOrigin) : runtimeOrigin;
export const newsletterEndpoint = import.meta.env.VITE_NEWSLETTER_ENDPOINT?.trim() || '';
export const isPreview = import.meta.env.MODE !== 'production' || runtimePath.includes('react-preview');

export function siteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, `${siteOrigin}/`).toString();
}
