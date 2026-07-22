export async function onRequest({ request, env }) {
  const profileUrl = new URL('/whiteline-profile.html?slug=legendarycolocolo', request.url);
  const profileRequest = new Request(profileUrl.toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request.headers
  });
  return env.ASSETS.fetch(profileRequest);
}
