import {
  checkRateLimit,
  cleanText,
  isHoneypotTriggered,
  isJsonRequest,
  requireTrustedOrigin,
  secureJson,
  validEmail,
  verifyTurnstile
} from '../_lib/security.js';

const SUPABASE_URL = 'https://dkvbeizjlgxqjuxnlqho.supabase.co';

// Server-side (Cloudflare Function) should prefer service_role for full access (bypasses RLS).
// Browser uses anon key + RLS. Set these in Cloudflare Pages env vars.
const getServiceRoleKey = (env) => env?.SUPABASE_SERVICE_ROLE_KEY || null;
const getAnonKey = (env) => env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdmJlaXpqbGd4cWp1eG5scWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDMzNjIsImV4cCI6MjA5OTk3OTM2Mn0.LEoOB6rdDwYh9ViogHuZCJ2gBx6fu78RDzyPBwTe4YE';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

async function supabase(path, options = {}, env, useServiceRole = false) {
  const key = useServiceRole ? getServiceRoleKey(env) : getAnonKey(env);
  if (!key) {
    return { error: true, status: 500, text: 'Missing Supabase key' };
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    console.error('[White Line API] Supabase error', response.status, text);
    return { error: true, status: response.status, text };
  }
  return { error: false, status: response.status, data: text ? JSON.parse(text) : null };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = (url.searchParams.get('id') || '').trim();

  // Use service_role for server-side public queries to avoid RLS permission issues with is_whiteline_admin()
  const useService = !!getServiceRoleKey(env);

  if (slug || id) {
    const filter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `id=eq.${encodeURIComponent(id)}`;
    const result = await supabase(`talent_profiles?select=*&status=eq.approved&${filter}&limit=1`, {}, env, useService);
    if (result.error) {
      return json({ error: 'Profile service unavailable', details: result.text || result.status }, result.status || 500);
    }
    const profile = result.data?.[0] || null;
    return profile ? json(profile) : json({ error: 'Profile not found' }, 404);
  }

  const fields = 'id,slug,full_name,stage_name,category,secondary_categories,short_bio,city,country,profile_image_url,body_image_url,instagram_url,tiktok_url,youtube_url,facebook_url,x_url,website_url,portfolio_url,featured,availability_status';
  const result = await supabase(`talent_profiles?select=${fields}&status=eq.approved&order=featured.desc,stage_name.asc`, {}, env, useService);
  if (result.error) {
    return json({ error: 'Roster service unavailable', details: result.text || result.status }, result.status || 500);
  }
  return json(result.data || []);
}

export async function onRequestPost({ request, env }) {
  if (!requireTrustedOrigin(request)) return secureJson({ error: 'Origin not allowed' }, 403);
  if (!isJsonRequest(request)) return secureJson({ error: 'JSON request required' }, 415);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 20_000) return secureJson({ error: 'Request too large' }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return secureJson({ error: 'Invalid request body' }, 400);
  }

  if (isHoneypotTriggered(payload)) return secureJson({ ok: true }, 201);
  const challenge = await verifyTurnstile(request, env, payload, 'inquiry');
  if (!challenge.success) return secureJson({ error: 'Human verification failed. Please try again.' }, 400);

  if (Object.prototype.hasOwnProperty.call(payload, 'talent_category')) {
    const name = cleanText(payload.client_name, 120);
    const company = cleanText(payload.company_name, 160);
    const email = validEmail(payload.email);
    const phone = cleanText(payload.phone, 80);
    const projectType = cleanText(payload.project_type, 120);
    const talentCategory = cleanText(payload.talent_category, 160);
    const brief = cleanText(payload.project_description, 5000);
    const requirements = cleanText(payload.requirements, 3000);
    const eventDate = cleanText(payload.event_date, 10);
    const location = cleanText(payload.location, 200);
    const currency = cleanText(payload.currency, 3).toUpperCase();
    const preferredContact = cleanText(payload.preferred_contact_method, 20);
    const requestedTalentId = cleanText(payload.requested_talent_id, 36);
    const requestedTalentName = cleanText(payload.requested_talent_name, 160);
    const currencies = new Set(['USD', 'JMD', 'GBP', 'EUR', 'CAD']);
    const contactMethods = new Set(['Email', 'WhatsApp', 'Phone']);
    const budgetMin = payload.budget_min === null || payload.budget_min === '' ? null : Number(payload.budget_min);
    const budgetMax = payload.budget_max === null || payload.budget_max === '' ? null : Number(payload.budget_max);

    if (name.length < 2) return secureJson({ error: 'Enter your name.' }, 400);
    if (!email) return secureJson({ error: 'Enter a valid email address.' }, 400);
    if (phone.length < 5) return secureJson({ error: 'Enter a valid phone or WhatsApp number.' }, 400);
    if (projectType.length < 2) return secureJson({ error: 'Enter the project type.' }, 400);
    if (talentCategory.length < 2) return secureJson({ error: 'Enter the talent needed.' }, 400);
    if (brief.length < 30) return secureJson({ error: 'Please add at least 30 characters about the project.' }, 400);
    if (location.length < 2) return secureJson({ error: 'Enter the project location.' }, 400);
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return secureJson({ error: 'Enter a valid date.' }, 400);
    if (!currencies.has(currency)) return secureJson({ error: 'Choose a valid currency.' }, 400);
    if (preferredContact && !contactMethods.has(preferredContact)) return secureJson({ error: 'Choose a valid contact method.' }, 400);
    if (requestedTalentId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedTalentId)) {
      return secureJson({ error: 'The requested talent profile is invalid.' }, 400);
    }
    if (budgetMin !== null && (!Number.isFinite(budgetMin) || budgetMin < 0)) return secureJson({ error: 'Enter a valid minimum budget.' }, 400);
    if (budgetMax !== null && (!Number.isFinite(budgetMax) || budgetMax < 0)) return secureJson({ error: 'Enter a valid maximum budget.' }, 400);
    if (budgetMin !== null && budgetMax !== null && budgetMax < budgetMin) {
      return secureJson({ error: 'Maximum budget must be greater than or equal to the minimum.' }, 400);
    }

    const rate = await checkRateLimit(request, 'whiteline-booking', 8, 600);
    if (!rate.allowed) {
      return secureJson({ error: 'Too many booking requests. Please try again later.' }, 429, {
        'retry-after': String(rate.retryAfter)
      });
    }

    const clean = {
      client_name: name,
      company_name: company || null,
      email,
      phone,
      whatsapp: phone,
      project_type: projectType,
      talent_category: talentCategory,
      project_description: brief,
      requirements: requirements || null,
      event_date: eventDate || null,
      location,
      budget_min: budgetMin,
      budget_max: budgetMax,
      currency,
      preferred_contact_method: preferredContact || null,
      requested_talent_id: requestedTalentId || null,
      requested_talent_name: requestedTalentName || null
    };
    const result = await supabase('client_requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(clean)
    }, env, true);
    if (result.error) return secureJson({ error: 'Could not submit your booking request right now.' }, 503);
    return secureJson({ ok: true }, 201);
  }

  const services = {
    'live-performance': 'Live performance',
    'dj-set': 'DJ set',
    'studio-session': 'Studio session / production consultation',
    'music-production': 'Music production',
    'creative-direction': 'Creative direction',
    'artist-development': 'Artist development',
    'photo-video': 'Photography / video',
    'talent-booking': 'Talent booking',
    'kingston-experience': 'Kingston experience / tour',
    'sync-licensing': 'Sync or licensing',
    press: 'Press or interview',
    partnership: 'Brand or creative partnership',
    other: 'Other'
  };
  const timelines = new Set(['As soon as possible', 'Within 1 month', 'Within 1-3 months', '3+ months', 'Flexible / exploring']);
  const budgets = new Set(['Not sure yet', 'Under $250', '$250-$500', '$500-$1,500', '$1,500-$5,000', '$5,000+']);
  const name = cleanText(payload.client_name, 120);
  const email = validEmail(payload.email);
  const serviceKey = cleanText(payload.project_type, 60);
  const brief = cleanText(payload.project_description, 5000);
  const timeline = cleanText(payload.timeline, 80);
  const budget = cleanText(payload.budget, 80);
  const eventDate = cleanText(payload.event_date, 10);
  const location = cleanText(payload.location, 200);
  const phone = cleanText(payload.phone, 80);

  if (name.length < 2) return secureJson({ error: 'Enter your name.' }, 400);
  if (!email) return secureJson({ error: 'Enter a valid email address.' }, 400);
  if (!services[serviceKey]) return secureJson({ error: 'Choose a valid request type.' }, 400);
  if (brief.length < 30) return secureJson({ error: 'Please add at least 30 characters about the project.' }, 400);
  if (!timelines.has(timeline)) return secureJson({ error: 'Choose a valid timeline.' }, 400);
  if (!budgets.has(budget)) return secureJson({ error: 'Choose a valid budget range.' }, 400);
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return secureJson({ error: 'Enter a valid date.' }, 400);

  const rate = await checkRateLimit(request, 'public-inquiry', 5, 600);
  if (!rate.allowed) {
    return secureJson({ error: 'Too many requests. Please try again later.' }, 429, {
      'retry-after': String(rate.retryAfter)
    });
  }

  const details = [
    brief,
    `Timeline: ${timeline}`,
    `Budget range: ${budget}`,
    `Preferred date: ${eventDate || 'Not applicable'}`,
    `Location / venue: ${location || 'Not applicable'}`,
    `WhatsApp / phone: ${phone || 'Not provided'}`
  ].join('\n\n');
  const clean = {
    client_name: name,
    email,
    phone: phone || null,
    whatsapp: phone || null,
    project_type: services[serviceKey],
    project_description: details,
    event_date: eventDate || null,
    location: location || null,
    currency: 'USD'
  };
  const result = await supabase('client_requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(clean)
  }, env, true); // POSTs use service_role
  if (result.error) return secureJson({ error: 'Could not submit your request right now.' }, 503);
  return secureJson({ ok: true }, 201);
}
