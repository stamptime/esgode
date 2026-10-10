"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { inicioDe, useSesion } from "@/lib/store";

export default function Inicio() {
  const { listo, usuario } = useSesion();
  const router = useRouter();
  const destino = !listo ? null : usuario ? inicioDe(usuario.rol) : "/login";
  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);
  return null;
}
