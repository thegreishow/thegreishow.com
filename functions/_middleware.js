export async function onRequest(context){
  const response=await context.next();
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const path=new URL(context.request.url).pathname;
  if(path.startsWith('/whiteline-admin'))return response;
  return new HTMLRewriter().on('body',{element(el){
    if(path.startsWith('/owner'))el.append('<script src="/assets/js/owner-cms-enhancements.js" defer></script>',{html:true});
    else el.append('<script src="/assets/js/cms-public.js" defer></script>',{html:true});
  }}).transform(response);
}