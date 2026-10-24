import type { MetadataRoute } from "next";

// Instalable en la pantalla de inicio (iPhone: Compartir › Agregar a inicio).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Esgode CRM",
    short_name: "Esgode",
    description: "CRM de Esgode tech store, Yopal.",
    lang: "es-CO",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // La marca ocupa la mitad central: cabe en el área segura de los íconos adaptables.
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
