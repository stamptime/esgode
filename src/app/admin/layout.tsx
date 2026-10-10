"use client";

import { usePathname, useRouter } from "next/navigation";
import { Mark } from "@/components/Mark";
import { Button, SidebarNav, type SidebarItem } from "@/components/ui";
import { cerrarSesion, useRequerirRol } from "@/lib/store";

// Las secciones sin ruta aún no están diseñadas (docs/handoff/design-system/screens.md).
const RUTAS: Record<string, string> = {
  tasas: "/admin/tasas",
  calc: "/calculadora",
};

const NAV: SidebarItem[] = [
  { id: "inicio", label: "Inicio", icon: "home", disabled: true },
  { id: "clientes", label: "Clientes", icon: "person", disabled: true },
  { id: "pedidos", label: "Pedidos", icon: "cart", disabled: true },
  { id: "conversaciones", label: "Conversaciones", icon: "chat", disabled: true },
  { id: "productos", label: "Productos", icon: "box", disabled: true },
  { section: "Crédito" },
  { id: "tasas", label: "Tasas", icon: "chart" },
  { id: "calc", label: "Calculadora", icon: "plus" },
  { section: "Equipo" },
  { id: "usuarios", label: "Usuarios y roles", icon: "person", disabled: true },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const usuario = useRequerirRol(["admin"]);
  const router = useRouter();
  const pathname = usePathname();
  if (!usuario) return null;

  const activo = Object.keys(RUTAS).find((id) => pathname.startsWith(RUTAS[id]));

  return (
    <div className="flex min-h-dvh">
      <SidebarNav
        className="sticky top-0 h-dvh flex-none"
        items={NAV}
        activeId={activo}
        onSelect={(id) => RUTAS[id] && router.push(RUTAS[id])}
        brand="esgode"
        logo={<Mark size={24} />}
        user={{ name: usuario.nombre, role: "Administrador" }}
        userAction={
          <Button variant="plain" size="sm" onClick={cerrarSesion}>
            Salir
          </Button>
        }
      />
      <div className="flex min-w-0 flex-1 flex-wrap">{children}</div>
    </div>
  );
}
