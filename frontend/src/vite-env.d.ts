/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps JS API key — powers the Team Profiles factory map. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.avif" {
  const src: string;
  export default src;
}
