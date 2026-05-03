type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

type TrackPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const CONSENT_KEY = "ethos_site_consent_v1";
const GTM_ID = import.meta.env.VITE_GTM_ID;
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID;
const GOOGLE_ADS_CONVERSION_LABEL = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

let initialized = false;

const consentModePayload = (consent: ConsentState) => ({
  analytics_storage: consent.analytics ? "granted" : "denied",
  ad_storage: consent.marketing ? "granted" : "denied",
  ad_user_data: consent.marketing ? "granted" : "denied",
  ad_personalization: consent.marketing ? "granted" : "denied",
});

const loadScript = (id: string, src: string, attributes: Record<string, string> = {}) => {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
  document.head.appendChild(script);
};

const bootGtag = () => {
  if (!GA_ID && !GOOGLE_ADS_ID) return;
  const firstId = GA_ID || GOOGLE_ADS_ID;
  if (!firstId) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer?.push(arguments); };
  loadScript("ethos-google-tag", `https://www.googletagmanager.com/gtag/js?id=${firstId}`);
  window.gtag("js", new Date());
  if (GA_ID) window.gtag("config", GA_ID);
  if (GOOGLE_ADS_ID) window.gtag("config", GOOGLE_ADS_ID);
};

const bootGtm = () => {
  if (!GTM_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  loadScript("ethos-gtm", `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
};

const bootMetaPixel = () => {
  if (!META_PIXEL_ID || GTM_ID || window.fbq) return;
  const fbq = function fbq(...args: unknown[]) {
    window.fbq?.call(window, ...args);
  };
  const queue: unknown[][] = [];
  const queuedFbq = (...args: unknown[]) => queue.push(args);
  window.fbq = queuedFbq;
  window._fbq = queuedFbq;
  loadScript("ethos-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
  void fbq;
};

export const getConsent = (): ConsentState | null => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveConsent = (consent: ConsentState) => {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  initializeTracking(consent);
};

export const initializeTracking = (consent = getConsent()) => {
  if (!consent || initialized) return;
  initialized = true;
  const consentPayload = consentModePayload(consent);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer?.push(arguments); };
  window.gtag("consent", "update", consentPayload);
  window.dataLayer.push({ event: "ethos_consent_update", ...consentPayload });

  if (consent.analytics || consent.marketing) {
    if (GTM_ID) bootGtm();
    if (!GTM_ID) bootGtag();
  }
  if (consent.marketing) bootMetaPixel();
};

export const trackEvent = (event: string, payload: TrackPayload = {}) => {
  const consent = getConsent();
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
  if (consent?.analytics && window.gtag) window.gtag("event", event, payload);
  if (consent?.marketing && window.fbq && event === "page_view") window.fbq("track", "PageView");
  if (consent?.marketing && window.fbq && event === "lead_submit") window.fbq("track", "Lead", payload);
  if (consent?.marketing && window.fbq && event !== "page_view" && event !== "lead_submit") {
    window.fbq("trackCustom", event, payload);
  }
};

export const trackGoogleAdsConversion = () => {
  const consent = getConsent();
  if (!consent?.marketing || !window.gtag || !GOOGLE_ADS_ID || !GOOGLE_ADS_CONVERSION_LABEL) return;
  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
  });
};
