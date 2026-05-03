export const SITE_URL = "https://ethos-clinic.com";
export const APP_URL = import.meta.env.VITE_APP_URL || "https://app.ethos-clinic.com";
export const SITE_NAME = "ETHOS";
export const SITE_TITLE = "ETHOS | Software para psicologos com prontuario, agenda e IA";
export const SITE_DESCRIPTION =
  "Software para psicologas e psicologos organizarem prontuario psicologico, agenda, documentos, financeiro e leads com privacidade, seguranca e apoio de IA.";
export const CONTACT_EMAIL = "contato@ethos-clinic.com";
export const SUPPORT_EMAIL = "suporte@ethos-clinic.com";

export const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
