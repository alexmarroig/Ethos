/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_GTM_ID?: string;
  readonly VITE_GOOGLE_ADS_ID?: string;
  readonly VITE_GOOGLE_ADS_CONVERSION_LABEL?: string;
  readonly VITE_META_PIXEL_ID?: string;
  readonly VITE_LEAD_ENDPOINT?: string;
  readonly NEXT_PUBLIC_BIOHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
