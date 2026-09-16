/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CONTACT_ENDPOINT?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_CONTACT_EMAIL?: string;
  readonly PUBLIC_CONTACT_PHONE?: string;
  readonly PUBLIC_FORM_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
