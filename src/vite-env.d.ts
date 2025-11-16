/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIX_CORS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
