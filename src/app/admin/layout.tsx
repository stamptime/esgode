"use client";

import { AdminSidebar } from "@/components/AdminSidebar";
import { useRequerirRol } from "@/lib/store";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const usuario = useRequerirRol(["admin"]);
  if (!usuario) return null;
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar usuario={usuario} />
      <div className="flex min-w-0 flex-1 flex-wrap">{children}</div>
    </div>
  );
}
