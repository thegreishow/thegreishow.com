const configuredOrigin = import.meta.env.VITE_SITE_ORIGIN?.trim();

export const siteOrigin = configuredOrigin || window.location.origin;
export const newsletterEndpoint = import.meta.env.VITE_NEWSLETTER_ENDPOINT?.trim() || '';
export const isPreview = import.meta.env.MODE !== 'production' || window.location.pathname.includes('react-preview');

export function siteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, siteOrigin).toString();
}
