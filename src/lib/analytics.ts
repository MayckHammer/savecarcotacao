declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const measurementId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined;

export const gtag = (...args: unknown[]) => {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
};

let initialized = false;

export const initAnalytics = () => {
  if (initialized || typeof window === "undefined" || !measurementId) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId);
};

export const trackPageView = (path: string) => {
  if (!measurementId) return;
  gtag("event", "page_view", { page_path: path, page_location: window.location.href });
};

type CtaLocation =
  | "hero"
  | "coberturas"
  | "cta_final"
  | "sticky_mobile"
  | "rodape"
  | "modal_cobertura"
  | "botao_flutuante";

/** Clique no CTA principal de cotação. */
export const trackQuoteClick = (location: CtaLocation, extra?: Record<string, unknown>) => {
  if (!measurementId) return;
  gtag("event", "cta_cotacao_click", { cta_location: location, ...extra });
  gtag("event", "generate_lead", { cta_location: location, method: "cotacao", ...extra });
};

/** Clique em qualquer botão/link de WhatsApp. */
export const trackWhatsAppClick = (location: CtaLocation, extra?: Record<string, unknown>) => {
  if (!measurementId) return;
  gtag("event", "cta_whatsapp_click", { cta_location: location, ...extra });
  gtag("event", "generate_lead", { cta_location: location, method: "whatsapp", ...extra });
};

export const analyticsEnabled = Boolean(measurementId);
