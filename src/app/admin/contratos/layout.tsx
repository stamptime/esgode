import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contratos" };

export default function ContratosAdminLayout({ children }: LayoutProps<"/admin/contratos">) {
  return children;
}
