const SUPABASE_URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
const SUPABASE_KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';

module.exports=async function handler(req,res){
  try{
    const slug=String(req.query.slug||'').trim().toLowerCase();
    const type=String(req.query.type||'audio').trim().toLowerCase();
    const index=Math.max(0,Number.parseInt(req.query.index||'0',10)||0);
    const download=String(req.query.download||'')==='1';
    if(!slug)return res.status(400).json({error:'Missing release slug'});

    const endpoint=`${SUPABASE_URL}/rest/v1/owner_releases?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,artist,audio_url,artwork_url,tracks`;
    const recordResponse=await fetch(endpoint,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
    if(!recordResponse.ok)return res.status(502).json({error:'Release lookup failed'});
    const records=await recordResponse.json();
    const release=records[0];
    if(!release)return res.status(404).json({error:'Release not found'});

    let source='';
    let filename='';
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
    if(!source||/\/folders\//.test(source))return res.status(404).json({error:'Playable file unavailable'});

    const upstreamUrl=toDirectUrl(source);
    const headers={Accept:'*/*','User-Agent':'Mozilla/5.0'};
    if(req.headers.range)headers.Range=req.headers.range;
    const upstream=await fetch(upstreamUrl,{headers,redirect:'follow'});
    if(!upstream.ok&&upstream.status!==206)return res.status(upstream.status).json({error:'Media unavailable'});

    const contentType=upstream.headers.get('content-type')||contentTypeFor(filename,type);
    const contentLength=upstream.headers.get('content-length');
    const contentRange=upstream.headers.get('content-range');
    const acceptRanges=upstream.headers.get('accept-ranges')||'bytes';
    res.status(upstream.status===206?206:200);
    res.setHeader('Content-Type',contentType);
    res.setHeader('Accept-Ranges',acceptRanges);
    res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(contentLength)res.setHeader('Content-Length',contentLength);
    if(contentRange)res.setHeader('Content-Range',contentRange);
    if(download)res.setHeader('Content-Disposition',`attachment; filename="${filename.replace(/"/g,'')}"`);
    else res.setHeader('Content-Disposition',`inline; filename="${filename.replace(/"/g,'')}"`);

    if(!upstream.body)return res.end();
    const reader=upstream.body.getReader();
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      res.write(Buffer.from(value));
    }
    res.end();
  }catch(error){
    console.error('media proxy error',error);
    if(!res.headersSent)res.status(500).json({error:'Media service unavailable'});
    else res.end();
  }
};

function toDirectUrl(url){
  const value=String(url||'');
  const match=value.match(/[?&]id=([\w-]+)/)||value.match(/\/d\/([\w-]+)/);
  if(match&&value.includes('drive.google.com'))return `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;
  return value;
}
function safeName(value){return String(value||'release').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'release'}
function extensionFromUrl(url){const m=String(url||'').match(/\.(mp3|wav|flac|m4a|aac|ogg|jpg|jpeg|png|webp)(?:[?#]|$)/i);return m?`.${m[1].toLowerCase()}`:''}
function contentTypeFor(filename,type){if(type==='artwork')return filename.endsWith('.png')?'image/png':filename.endsWith('.webp')?'image/webp':'image/jpeg';if(filename.endsWith('.wav'))return'audio/wav';if(filename.endsWith('.flac'))return'audio/flac';if(filename.endsWith('.m4a'))return'audio/mp4';return'audio/mpeg'}