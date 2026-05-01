const BIOHUB_URL_FALLBACK = "https://biohub.ethos-clinic.com";

const normalizeBaseUrl = (url?: string) =>
  (url || BIOHUB_URL_FALLBACK).replace(/\/+$/, "");

export const BIOHUB_BASE_URL = normalizeBaseUrl(import.meta.env.NEXT_PUBLIC_BIOHUB_URL);

export const biohubUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BIOHUB_BASE_URL}${normalizedPath}`;
};

export const BIOHUB_HOME_URL = BIOHUB_BASE_URL;
export const BIOHUB_LOGIN_URL = biohubUrl("/auth/login");
