const SUPABASE_URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
const SUPABASE_KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
const ALIASES={'puff-puff-pass-remix':['puff-puff-pass-remix-feat-bay-c','puff-puff-pass-remix-bay-c'],'puff-puff-pass-remix-feat-bay-c':['puff-puff-pass-remix-feat-bay-c','puff-puff-pass-remix-bay-c'],'puff-puff-pass-remix-bay-c':['puff-puff-pass-remix-bay-c','puff-puff-pass-remix-feat-bay-c'],'theres-nothing-to-believe-in-ep':['theres-nothing-to-believe-in-ep','theres-nothing-to-believe-in'],'theres-nothing-to-believe-in':['theres-nothing-to-believe-in','theres-nothing-to-believe-in-ep'],'1122':['1122','1122-ep'],'1122-ep':['1122-ep','1122']};

export async function onRequestGet({request}){
  try{
    const url=new URL(request.url);
    const slug=normalizeSlug(url.searchParams.get('slug'));
    const type=String(url.searchParams.get('type')||'audio').trim().toLowerCase();
    const index=Math.max(0,Number.parseInt(url.searchParams.get('index')||'0',10)||0);
    const download=url.searchParams.get('download')==='1';
    if(!slug)return json({error:'Missing release slug'},400);

    const release=await findRelease(url.origin,slug);
    if(!release)return json({error:'Release not found'},404);

    let source='',filename='';
    if(type==='artwork'){
      source=release.artwork_url||'';
      filename=`${safeName(release.title||slug)}-artwork${extensionFromUrl(source)||'.jpg'}`;
    }else if(type==='track'){
      const tracks=Array.isArray(release.tracks)?release.tracks:[];
      const track=tracks[index];
      source=track&&track.url||'';
      filename=`${safeName(track&&track.title||`${release.title||slug}-track-${index+1}`)}${extensionFromUrl(source)||'.mp3'}`;
    }else{
      source=release.audio_url||'';
      filename=`${safeName(release.title||slug)}${extensionFromUrl(source)||'.mp3'}`;
    }
    if(!source||/\/folders\//.test(source))return json({error:'Playable file unavailable'},404);

    const upstreamUrl=toDirectUrl(source);
    const headers=new Headers({'Accept':'*/*','User-Agent':'Mozilla/5.0'});
    const range=request.headers.get('Range');
    if(range)headers.set('Range',range);
    const upstream=await fetch(upstreamUrl,{headers,redirect:'follow'});
    if(!upstream.ok&&upstream.status!==206)return json({error:'Media unavailable'},upstream.status);

    const upstreamType=(upstream.headers.get('content-type')||'').split(';')[0].toLowerCase();
    const usableType=type==='artwork'?upstreamType.startsWith('image/'):upstreamType.startsWith('audio/');
    const responseHeaders=new Headers();
    responseHeaders.set('Content-Type',usableType?upstreamType:contentTypeFor(filename,type));
    responseHeaders.set('Accept-Ranges',upstream.headers.get('accept-ranges')||'bytes');
    responseHeaders.set('Cache-Control','public, max-age=3600, s-maxage=86400');
    responseHeaders.set('Access-Control-Allow-Origin','*');
    for(const name of ['content-length','content-range','etag','last-modified']){const value=upstream.headers.get(name);if(value)responseHeaders.set(name,value)}
    const responseFilename=filenameForContentType(filename,upstreamType);
    responseHeaders.set('Content-Disposition',`${download?'attachment':'inline'}; filename="${responseFilename.replace(/"/g,'')}"`);
    return new Response(upstream.body,{status:upstream.status===206?206:200,headers:responseHeaders});
  }catch(error){
    console.error('media proxy error',error);
    return json({error:'Media service unavailable'},500);
  }
}

async function findRelease(origin,slug){
  const candidates=slugCandidates(slug);
  try{
    const filter=candidates.map(value=>`slug.eq.${encodeURIComponent(value)}`).join(',');
    const endpoint=`${SUPABASE_URL}/rest/v1/owner_releases?or=(${filter})&status=eq.published&select=title,artist,slug,audio_url,artwork_url,tracks`;
    const response=await fetch(endpoint,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(response.ok){const records=await response.json();const found=records.find(record=>candidates.includes(normalizeSlug(record.slug)));if(found)return found}
  }catch(error){console.warn('Remote media lookup failed',error)}
  try{
    const response=await fetch(`${origin}/assets/data/promo-releases.json`,{headers:{Accept:'application/json'}});
    if(response.ok){const records=await response.json();return records.find(record=>record&&record.status==='published'&&candidates.includes(normalizeSlug(record.slug)))||null}
  }catch(error){console.warn('Local media lookup failed',error)}
  return null;
}
function normalizeSlug(value){return String(value||'').trim().toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function slugCandidates(value){const normalized=normalizeSlug(value);return [...new Set([normalized,...(ALIASES[normalized]||[]).map(normalizeSlug)])]}
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}})}
function toDirectUrl(url){const value=String(url||'');const match=value.match(/[?&]id=([\w-]+)/)||value.match(/\/d\/([\w-]+)/);if(match&&value.includes('drive.google.com'))return`https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;return value}
function safeName(value){return String(value||'release').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'release'}
function extensionFromUrl(url){const m=String(url||'').match(/\.(mp3|wav|flac|m4a|aac|ogg|jpg|jpeg|png|webp)(?:[?#]|$)/i);return m?`.${m[1].toLowerCase()}`:''}
function filenameForContentType(filename,type){const extensions={'audio/mpeg':'.mp3','audio/wav':'.wav','audio/x-wav':'.wav','audio/flac':'.flac','audio/mp4':'.m4a','audio/aac':'.aac','audio/ogg':'.ogg','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'},extension=extensions[String(type||'').toLowerCase()];return extension?String(filename).replace(/\.(?:mp3|wav|flac|m4a|aac|ogg|jpe?g|png|webp)$/i,'')+extension:filename}
function contentTypeFor(filename,type){if(type==='artwork')return filename.endsWith('.png')?'image/png':filename.endsWith('.webp')?'image/webp':'image/jpeg';if(filename.endsWith('.wav'))return'audio/wav';if(filename.endsWith('.flac'))return'audio/flac';if(filename.endsWith('.m4a'))return'audio/mp4';if(filename.endsWith('.aac'))return'audio/aac';if(filename.endsWith('.ogg'))return'audio/ogg';return'audio/mpeg'}
