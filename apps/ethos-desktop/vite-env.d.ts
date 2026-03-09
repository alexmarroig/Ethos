/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CONTROL_API_BASE_URL?: string;
  readonly CLINICAL_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
