import type { APIRoute } from "astro";
import business from "../../config/site.json";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(business.origin);
  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", origin).href}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
