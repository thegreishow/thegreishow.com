type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: AnalyticsPayload }) => void;
  }
}

export function track(event: string, payload: AnalyticsPayload = {}): void {
  window.dispatchEvent(new CustomEvent('grei:analytics', { detail: { event, payload } }));

  if (typeof window.gtag === 'function') {
    window.gtag('event', event, payload);
  }

  if (typeof window.plausible === 'function') {
    window.plausible(event, { props: payload });
  }
}
