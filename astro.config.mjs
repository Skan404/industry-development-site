import { defineConfig } from "astro/config";
import process from "node:process";
import site from "./config/site.json" with { type: "json" };

export default defineConfig({
  site: process.env.SITE_URL ?? site.origin,
  output: "static",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: "auto"
  }
});
