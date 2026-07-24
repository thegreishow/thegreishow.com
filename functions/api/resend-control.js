const SUPABASE_URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
const SUPABASE_KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
async function requireOwner(request){
  const auth=request.headers.get('authorization')||'';
  if(!auth.startsWith('Bearer '))throw new Error('UNAUTHORIZED');
  const user=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,authorization:auth}});
  if(!user.ok)throw new Error('UNAUTHORIZED');
  const check=await fetch(`${SUPABASE_URL}/rest/v1/rpc/owner_is_admin`,{method:'POST',headers:{apikey:SUPABASE_KEY,authorization:auth,'content-type':'application/json'},body:'{}'});
  if(!check.ok||await check.json()!==true)throw new Error('FORBIDDEN');
}
async function resend(env,path,init={}){
  if(!env.RESEND_API_KEY)throw new Error('RESEND_NOT_CONFIGURED');
  const r=await fetch(`https://api.resend.com${path}`,{...init,headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json',...(init.headers||{})}});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)return json({error:body.message||'Resend request failed',details:body},r.status);
  return json(body);
}
export async function onRequestGet({request,env}){
  try{await requireOwner(request)}catch(e){return json({error:e.message},e.message==='UNAUTHORIZED'?401:403)}
  const url=new URL(request.url),resource=url.searchParams.get('resource')||'emails',limit=Math.min(Number(url.searchParams.get('limit')||20),100);
  const paths={emails:`/emails?limit=${limit}`,contacts:`/contacts?limit=${limit}`,segments:`/segments?limit=${limit}`,templates:`/templates?limit=${limit}`};
  if(!paths[resource])return json({error:'Unsupported resource'},400);
  try{return await resend(env,paths[resource])}catch(e){return json({error:e.message},e.message==='RESEND_NOT_CONFIGURED'?503:500)}
}
export async function onRequestPost({request,env}){
  try{await requireOwner(request)}catch(e){return json({error:e.message},e.message==='UNAUTHORIZED'?401:403)}
  const body=await request.json().catch(()=>({}));
  if(body.action==='send'){
    const required=['from','to','subject','text'];
    if(required.some(k=>!body[k]))return json({error:'from, to, subject and text are required'},400);
    try{return await resend(env,'/emails',{method:'POST',body:JSON.stringify({from:body.from,to:Array.isArray(body.to)?body.to:[body.to],subject:body.subject,text:body.text,html:body.html||undefined,reply_to:body.replyTo||undefined})})}catch(e){return json({error:e.message},e.message==='RESEND_NOT_CONFIGURED'?503:500)}
  }
  return json({error:'Unsupported action'},400);
}