export async function onRequest({ request, env }) {
  const profileUrl = new URL('/legendarycolocolo.html', request.url);
  const profileRequest = new Request(profileUrl.toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request.headers
  });
  return env.ASSETS.fetch(profileRequest);
}
