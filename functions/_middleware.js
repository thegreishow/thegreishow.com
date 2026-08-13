export async function onRequest(context){
  const path=new URL(context.request.url).pathname;
  const isStaticPromo=/^\/promo\/rodeo\/?$/.test(path);
  const isPromoDetail=!isStaticPromo&&/^\/promo\/[^/]+\/?$/.test(path);
  const upstream=isPromoDetail?await context.next('/promo/index.html'):await context.next();
  const headers=new Headers(upstream.headers);
  headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','SAMEORIGIN');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(self), usb=(), browsing-topics=()');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com; frame-src 'self' https://drive.google.com https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self' mailto:; frame-ancestors 'self'; upgrade-insecure-requests");
  if(path.startsWith('/admin')||path.startsWith('/owner')||path.startsWith('/whiteline-admin')||path.startsWith('/whiteline-talent-')){
    headers.set('X-Robots-Tag','noindex, nofollow');
  }
  const response=new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  if(path.startsWith('/whiteline-admin'))return response;
  return new HTMLRewriter().on('body',{element(el){
    if(path.startsWith('/owner'))el.append('<script src="/assets/js/owner-cms-enhancements.js" defer></script>',{html:true});
    else el.append('<script src="/assets/js/cms-public.js" defer></script>',{html:true});
    if(path==='/music'||path==='/music/'||path==='/music.html')el.append('<script src="/assets/js/music-promo-links.js" defer></script>',{html:true});
    if(path==='/promo'||path.startsWith('/promo/'))el.append('<script src="/assets/js/promo-navigation.js" defer></script>',{html:true});
  }}).transform(response);
}
