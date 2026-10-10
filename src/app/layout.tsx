import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

// Fuente de marca: solo para el wordmark y el tagline. La UI usa la del sistema.
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Esgode CRM", template: "%s — Esgode CRM" },
  description: "CRM de Esgode tech store, Yopal.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// El tema sigue al sistema y se aplica con `data-theme` antes del primer pintado.
const TEMA = `(function(){try{var m=matchMedia('(prefers-color-scheme: dark)');var p=function(){document.documentElement.dataset.theme=m.matches?'dark':'light'};p();m.addEventListener('change',p)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={quicksand.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body className="es-root min-h-dvh">{children}</body>
    </html>
  );
}
