export async function onRequest(context){
  const path=new URL(context.request.url).pathname;
  const isPromoDetail=/^\/promo\/[^/]+\/?$/.test(path);
  const response=isPromoDetail?await context.next('/promo/index.html'):await context.next();
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
