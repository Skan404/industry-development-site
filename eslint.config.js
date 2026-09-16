import eslint from "@eslint/js";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", ".astro/**", ".wrangler/**", "node_modules/**", "Indevtest/**", "love-lashes/**", ".pnpm-store/**", "artifacts/**", ".tools/**", "release/**", "server/vendor/**"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs", "worker/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly", URL: "readonly", URLSearchParams: "readonly", Response: "readonly", Request: "readonly", TextDecoder: "readonly", setTimeout: "readonly", clearTimeout: "readonly", fetch: "readonly", AbortSignal: "readonly" } }
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ]
    }
  }
];
