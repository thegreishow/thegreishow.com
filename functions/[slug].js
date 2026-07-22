export async function onRequest({ request, env, params }) {
  const slug = String(params.slug || "").trim().toLowerCase();
  const url = new URL(request.url);

  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) {
    return env.ASSETS.fetch(request);
  }

  if (url.pathname.endsWith("/") && url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
    return Response.redirect(url.toString(), 308);
  }

  const profileUrl = new URL("/whiteline-profile.html", request.url);
  const profileRequest = new Request(profileUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: request.headers
  });

  return env.ASSETS.fetch(profileRequest);
}
