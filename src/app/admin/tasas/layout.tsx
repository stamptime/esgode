import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tasas de crédito" };

export default function TasasLayout({ children }: LayoutProps<"/admin/tasas">) {
  return children;
}
