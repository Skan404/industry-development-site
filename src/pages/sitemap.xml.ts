import type { APIRoute } from "astro";
import { routes } from "../data/site";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("https://example.com");
  const urls = routes
    .filter((route) => route !== "/polityka-prywatnosci")
    .map((route) => `<url><loc>${new URL(route, origin).href}</loc></url>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
