"use client";

import { useEffect } from "react";

const LOCAL_FONT_CSS = `
@font-face { font-family: 'Rubik'; font-weight: 300; font-display: swap; src: url('/fonts/rubik/rubik-v31-latin-300.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 400; font-display: swap; src: url('/fonts/rubik/rubik-v31-latin-regular.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 500; font-display: swap; src: url('/fonts/rubik/rubik-v31-latin-500.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 600; font-display: swap; src: url('/fonts/rubik/rubik-v31-latin-600.woff2') format('woff2'); }
@font-face { font-family: 'Rubik'; font-weight: 700; font-display: swap; src: url('/fonts/rubik/rubik-v31-latin-700.woff2') format('woff2'); }
@font-face { font-family: 'Vazirmatn'; font-weight: 300; font-display: swap; src: url('/fonts/vazirmatn/vazirmatn-v16-arabic_latin-300.woff2') format('woff2'); }
@font-face { font-family: 'Vazirmatn'; font-weight: 400; font-display: swap; src: url('/fonts/vazirmatn/vazirmatn-v16-arabic_latin-regular.woff2') format('woff2'); }
@font-face { font-family: 'Vazirmatn'; font-weight: 500; font-display: swap; src: url('/fonts/vazirmatn/vazirmatn-v16-arabic_latin-500.woff2') format('woff2'); }
@font-face { font-family: 'Vazirmatn'; font-weight: 600; font-display: swap; src: url('/fonts/vazirmatn/vazirmatn-v16-arabic_latin-600.woff2') format('woff2'); }
@font-face { font-family: 'Vazirmatn'; font-weight: 700; font-display: swap; src: url('/fonts/vazirmatn/vazirmatn-v16-arabic_latin-700.woff2') format('woff2'); }
`;

function injectLocalFonts() {
  if (document.getElementById("local-fonts")) return;
  const style = document.createElement("style");
  style.id = "local-fonts";
  style.textContent = LOCAL_FONT_CSS;
  document.head.appendChild(style);
}

export default function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&family=Vazirmatn:wght@300;400;500;600;700&display=swap";

    link.onerror = injectLocalFonts;

    // Safety net: if Google CSS loads but fonts don't render within 3s, use local
    const timer = setTimeout(() => {
      if (!document.fonts.check("16px Rubik")) injectLocalFonts();
    }, 3000);

    link.onload = () => clearTimeout(timer);

    document.head.appendChild(link);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
