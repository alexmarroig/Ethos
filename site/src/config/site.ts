export const SITE_URL = "https://ethos-clinic.com";
export const APP_URL = import.meta.env.VITE_APP_URL || "https://app.ethos-clinic.com";
export const SITE_NAME = "ETHOS";
export const SITE_TITLE = "ETHOS - Plataforma clinica para psicologos";
export const SITE_DESCRIPTION =
  "Sistema para psicologos com prontuario inteligente, agenda, pacientes, financeiro, documentos e automacoes com foco em sigilo clinico.";
export const CONTACT_EMAIL = "contato@ethos-clinic.com";
export const SUPPORT_EMAIL = "suporte@ethos-clinic.com";

export const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
