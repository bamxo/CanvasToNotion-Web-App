/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the API base URL (e.g. a deployed Vercel backend). Set in frontend/.env.local. */
  readonly VITE_API_BASE?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
