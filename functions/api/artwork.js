const APPLE_ORIGIN = "https://itunes.apple.com";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim();
  const term = (url.searchParams.get("term") || "").trim();

  if (!id && !term) {
    return json({ error: "Missing artwork id or search term" }, 400);
  }

  const countries = ["jm", "us", "gb"];

  for (const country of countries) {
    const endpoint = id
      ? `${APPLE_ORIGIN}/lookup?id=${encodeURIComponent(id)}&entity=album&country=${country}`
      : `${APPLE_ORIGIN}/search?term=${encodeURIComponent(term)}&entity=album&limit=10&country=${country}`;

    try {
      const response = await fetch(endpoint, {
        headers: { "User-Agent": "TheGreiShow/1.0" },
        cf: { cacheTtl: 86400, cacheEverything: true }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const item = (data.results || []).find((result) => result.artworkUrl100);
      if (!item) continue;

      const artwork = item.artworkUrl100
        .replace(/100x100bb(?:-\d+)?\.jpg$/, "800x800bb.jpg")
        .replace(/^http:/, "https:");

      return json({ artwork, country }, 200, 86400);
    } catch (_) {
      // Try the next storefront.
    }
  }

  return json({ error: "Official artwork not found" }, 404, 300);
}

function json(body, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}`
    }
  });
}
