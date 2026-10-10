import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calculadora de crédito" };

export default function CalculadoraLayout({ children }: LayoutProps<"/calculadora">) {
  return children;
}
