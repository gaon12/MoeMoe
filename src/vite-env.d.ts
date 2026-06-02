/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIX_CORS_API_URL?: string;
  readonly VITE_SERVER_TIME_API_URL?: string;
  readonly VITE_GITHUB_REPO_URL?: string;
  readonly VITE_ANIME_QUOTE_API_URL?: string;
  readonly VITE_IP_REVERSE_GEOCODING_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
