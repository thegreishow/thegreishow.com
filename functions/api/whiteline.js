const SUPABASE_URL = 'https://dkvbeizjlgxqjuxnlqho.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    console.error('[White Line API]', response.status, text);
    return { error: true, status: response.status, text };
  }
  return { error: false, status: response.status, data: text ? JSON.parse(text) : null };
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = (url.searchParams.get('id') || '').trim();

  if (slug || id) {
    const filter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `id=eq.${encodeURIComponent(id)}`;
    const result = await supabase(`talent_profiles?select=*&status=eq.approved&${filter}&limit=1`);
    if (result.error) return json({ error: 'Profile service unavailable' }, result.status);
    const profile = result.data?.[0] || null;
    return profile ? json(profile) : json({ error: 'Profile not found' }, 404);
  }

  const fields = 'id,slug,full_name,stage_name,category,secondary_categories,short_bio,city,country,profile_image_url,body_image_url,instagram_url,tiktok_url,youtube_url,facebook_url,x_url,website_url,portfolio_url,featured,availability_status';
  const result = await supabase(`talent_profiles?select=${fields}&status=eq.approved&order=featured.desc,stage_name.asc`);
  if (result.error) return json({ error: 'Roster service unavailable' }, result.status);
  return json(result.data || []);
}

export async function onRequestPost({ request }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const allowed = ['client_name','company_name','email','phone','whatsapp','project_type','talent_category','project_description','requirements','event_date','location','budget_min','budget_max','currency','status','booking_stage','payment_status'];
  const clean = Object.fromEntries(allowed.filter(key => key in payload).map(key => [key, payload[key]]));
  const result = await supabase('client_requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(clean)
  });
  if (result.error) return json({ error: 'Could not submit booking request' }, result.status);
  return json({ ok: true }, 201);
}
