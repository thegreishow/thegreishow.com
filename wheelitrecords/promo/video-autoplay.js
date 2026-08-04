(() => {
  const section = document.querySelector('.official-video');
  const frame = section?.querySelector('iframe');
  if (!frame) return;

  section.querySelector('.official-video-note')?.remove();

  let url;
  try {
    url = new URL(frame.src);
  } catch {
    return;
  }

  url.hostname = 'www.youtube.com';
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('mute', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('loop', '1');
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('origin', location.origin);
  url.searchParams.set('controls', '1');
  url.searchParams.set('rel', '0');
  url.searchParams.set('modestbranding', '1');

  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.loading = 'eager';
  frame.src = url.toString();

  const command = func => {
    frame.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func,
      args: []
    }), 'https://www.youtube.com');
  };

  const start = () => {
    command('mute');
    command('playVideo');
  };

  frame.addEventListener('load', () => {
    start();
    setTimeout(start, 350);
    setTimeout(start, 1000);
    setTimeout(start, 2200);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
})();