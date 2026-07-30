const APPLE_ORIGIN = "https://itunes.apple.com";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim();
  const term = (url.searchParams.get("term") || "").trim();

  if (!id && !term) {
    return json({ error: "Missing artwork id or search term" }, 400);
  }

  const countries = ["jm", "us", "gb", "ca"];

  for (const country of countries) {
    const endpoints = [];

    // A collection/album ID must be looked up directly. Adding entity=album
    // makes Apple treat the ID like an artist ID and often returns zero results.
    if (id) {
      endpoints.push(`${APPLE_ORIGIN}/lookup?id=${encodeURIComponent(id)}&country=${country}`);
    }
    if (term) {
      endpoints.push(`${APPLE_ORIGIN}/search?term=${encodeURIComponent(term)}&entity=album&media=music&limit=10&country=${country}`);
    }

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; TheGreiShowArtwork/1.0)"
          },
          cf: { cacheTtl: 86400, cacheEverything: true }
        });
        if (!response.ok) continue;

        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];
        const item = results.find((result) => result.artworkUrl100 || result.artworkUrl60);
        const source = item?.artworkUrl100 || item?.artworkUrl60;
        if (!source) continue;

        const artwork = source
          .replace(/\/\d+x\d+bb(?:-\d+)?\.(jpg|png)$/i, "/800x800bb.$1")
          .replace(/^http:/, "https:");

        return json({ artwork, country }, 200, 86400);
      } catch (_) {
        // Try the next endpoint or storefront.
      }
    }
  }

  return json({ error: "Official artwork not found" }, 404, 60);
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
