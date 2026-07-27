import { newsletterEndpoint } from '@/config';

export type NewsletterPayload = {
  firstName: string;
  email: string;
  country: string;
  consent: boolean;
};

export type NewsletterResult = {
  ok: boolean;
  message: string;
};

export async function submitNewsletter(payload: NewsletterPayload, signal?: AbortSignal): Promise<NewsletterResult> {
  if (!newsletterEndpoint) {
    return {
      ok: true,
      message: 'Preview mode: submission is validated, but the live mailing-list endpoint is not configured here.'
    };
  }

  const response = await fetch(newsletterEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    throw new Error(`Newsletter request failed with status ${response.status}.`);
  }

  return { ok: true, message: 'You’re on the list. Watch for the next transmission.' };
}
