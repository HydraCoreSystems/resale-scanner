import { VendorError, type NameMatch, type NamingProvider } from "./types";

/**
 * Google Lens through SerpApi.
 * Read from SerpApi docs on 2026-11-06:
 *  - POST https://serpapi.com/image, multipart field "image" plus api_key, returns { image_id }.
 *    JPG, PNG or WebP, 500 KB max, image_id expires after 10 minutes.
 *  - GET https://serpapi.com/search?engine=google_lens&type=visual_matches, response has visual_matches[]
 *    with title, link, source, price { value, extracted_value, currency }.
 * UNVERIFIED: the name of the Lens parameter that accepts an uploaded image_id. The docs page fetched
 * only showed the url parameter. This code sends image_id. Confirm with the first free tier call.
 */
export class SerpApiLens implements NamingProvider {
  readonly id = "serpapi-lens";
  readonly dataSource = "real" as const;
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async matchImage(image: Uint8Array, mime: string): Promise<NameMatch[]> {
    if (image.byteLength > 500 * 1024) throw new VendorError("serpapi", "image over 500 KB", 413);
    const form = new FormData();
    form.append("image", new Blob([image as BlobPart], { type: mime }), "scan");
    form.append("api_key", this.apiKey);
    const up = await this.fetchImpl("https://serpapi.com/image", { method: "POST", body: form });
    if (!up.ok) throw new VendorError("serpapi", `image upload failed (${up.status})`, up.status);
    const upJson = (await up.json()) as { image_id?: string; error?: string };
    if (!upJson.image_id) throw new VendorError("serpapi", upJson.error ?? "no image_id returned");

    const params = new URLSearchParams({
      engine: "google_lens",
      type: "visual_matches",
      image_id: upJson.image_id,
      api_key: this.apiKey,
    });
    const res = await this.fetchImpl(`https://serpapi.com/search?${params}`);
    if (!res.ok) throw new VendorError("serpapi", `lens search failed (${res.status})`, res.status);
    const json = (await res.json()) as {
      visual_matches?: { title?: string; link?: string; source?: string; price?: { value?: string } }[];
      error?: string;
    };
    if (json.error) throw new VendorError("serpapi", json.error);
    return (json.visual_matches ?? [])
      .filter((m) => m.title)
      .map((m) => ({ title: m.title as string, link: m.link, source: m.source, price: m.price?.value }));
  }
}
