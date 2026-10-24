import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contratos" };

// Las páginas leen el id y la consulta de la URL, que solo se conocen al abrirlas.
export default function ContratosLayout({ children }: LayoutProps<"/contratos">) {
  return <Suspense>{children}</Suspense>;
}
