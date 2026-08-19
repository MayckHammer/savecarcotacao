import { useEffect } from "react";

const GTM_CONTAINER_ID = "GTM-MW77WPBJ";

declare global {
  interface Window {
    __gtmInitialized?: boolean;
  }
}

/** Inicializa o dataLayer e injeta o script do Google Tag Manager no <head>. */
export const initGTM = () => {
  if (typeof window === "undefined" || window.__gtmInitialized) return;
  window.__gtmInitialized = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.async = true;
  script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;
  document.head.appendChild(script);
};

/** Hook para carregar o GTM quando o componente montar. */
export const useGTM = () => {
  useEffect(() => {
    initGTM();
  }, []);
};

/** Iframe nosscript que o GTM exige logo após a abertura do <body>. */
export const GTMBodyNoScript = () => (
  <noscript>
    <iframe
      src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
      height="0"
      width="0"
      style={{ display: "none", visibility: "hidden" }}
      title="gtm"
    />
  </noscript>
);
