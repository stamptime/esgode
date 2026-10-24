"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lockup } from "@/components/Mark";
import { Button, TextField, Toggle } from "@/components/ui";
import { iniciarSesion, inicioDe, useSesion } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { listo, usuario: actual } = useSesion();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState("");
  const [ayuda, setAyuda] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // Con sesión abierta no hay nada que hacer aquí.
  const destino = listo && actual ? inicioDe(actual.rol) : null;
  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !clave) {
      setError("Escribe tu usuario y tu contraseña para ingresar.");
      return;
    }
    setEntrando(true);
    try {
      if (!(await iniciarSesion(usuario, clave, recordar))) {
        setError("Revisa el usuario y la contraseña; deben ser los que te asignó administración.");
      }
    } catch {
      setError("No se pudo conectar. Revisa tu internet y vuelve a intentar.");
    }
    setEntrando(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-6 pt-[72px] pb-8">
      <div className="mb-10 flex flex-col gap-2">
        <div className="mb-8">
          <Lockup width={200} />
        </div>
        <h1 className="title-1 m-0">Ingresa a tu cuenta</h1>
        <p className="body m-0 text-ink-secondary">Usa el usuario que te asignó administración.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={entrar} noValidate>
        <TextField
          className="max-w-none"
          label="Usuario"
          name="usuario"
          placeholder="nombre.apellido"
          autoComplete="username"
          value={usuario}
          onChange={(e) => {
            setUsuario(e.target.value);
            setError("");
          }}
        />
        <TextField
          className="max-w-none"
          label="Contraseña"
          name="clave"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => {
            setClave(e.target.value);
            setError("");
          }}
          error={error || undefined}
        />

        <div className="mt-1 flex items-center justify-between">
          <Toggle label="Recordarme" checked={recordar} onChange={setRecordar} />
          <button
            type="button"
            className="callout cursor-pointer font-semibold text-accent-text"
            aria-expanded={ayuda}
            onClick={() => setAyuda((v) => !v)}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        {ayuda ? (
          <p className="callout m-0 text-ink-secondary" role="status">
            Pídele a administración que te asigne una nueva.
          </p>
        ) : null}

        <Button type="submit" size="lg" pill className="mt-4 w-full" disabled={entrando}>
          Ingresar
        </Button>
      </form>

      <div className="mt-auto flex flex-col items-center gap-3 pt-10 text-center">
        <div className="footnote flex items-center gap-2 text-ink-secondary">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <span>Tu rol (staff o administrador) se asigna desde el escritorio.</span>
        </div>
        <div className="footnote text-ink-secondary">Esgode · Yopal, Casanare</div>
      </div>
    </div>
  );
}
