import type { APIRoute } from "astro";
import { routes } from "../data/site";
import { projects } from "../data/projects";
import business from "../../config/site.json";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(business.origin);
  const urls = routes
    .filter((route) => !["/polityka-prywatnosci", "/regulamin"].includes(route) && (route !== "/realizacje" || projects.length > 0))
    .map((route) => `<url><loc>${new URL(route, origin).href}</loc></url>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
