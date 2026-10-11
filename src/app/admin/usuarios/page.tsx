"use client";

import { Catalogo } from "@/components/admin/Catalogo";
import { Badge } from "@/components/ui";
import { actualizarUsuario, crearUsuario, eliminarUsuario, useStore } from "@/lib/store";
import type { Rol, Usuario } from "@/lib/types";

const ROL: Record<Rol, string> = { admin: "Administrador", staff: "Staff" };

export default function UsuariosPage() {
  const { listo, usuarios, usuario: yo } = useStore();
  if (!listo) return null;

  const estado = (u: Usuario) => (
    <Badge tone={u.activo ? "success" : "neutral"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
  );

  return (
    <Catalogo<Usuario>
      titulo="Usuarios y roles"
      subtitulo="Quién puede ingresar y qué ve: el staff cotiza; administración configura."
      textos={{
        nuevo: "Nuevo usuario",
        crear: "Crear usuario",
        guardar: "Guardar usuario",
        eliminar: "Eliminar usuario",
        conservar: "Conservar usuario",
        buscar: "Buscar nombre o usuario",
        vacio: "Aún no hay usuarios. Crea el primero con «Nuevo usuario».",
      }}
      columnas={[
        { key: "nombre", label: "Nombre", render: (u) => (u.id === yo?.id ? `${u.nombre} (tú)` : u.nombre) },
        { key: "usuario", label: "Usuario", mono: true },
        { key: "rol", label: "Rol", render: (u) => ROL[u.rol] },
        { key: "activo", label: "Estado", render: estado },
      ]}
      tarjeta={(u) => ({
        titulo: u.id === yo?.id ? `${u.nombre} (tú)` : u.nombre,
        detalle: `${u.usuario} · ${ROL[u.rol]}`,
        lado: u.activo ? null : estado(u),
      })}
      filas={usuarios}
      textoDe={(u) => `${u.nombre} ${u.usuario} ${ROL[u.rol]}`}
      nombreDe={(u) => u.nombre}
      campos={[
        { clave: "nombre", etiqueta: "Nombre", tipo: "texto", placeholder: "Nombre Apellido" },
        {
          clave: "usuario",
          etiqueta: "Usuario",
          tipo: "texto",
          placeholder: "nombre.apellido",
          ayuda: "Con este nombre ingresa. En minúsculas y sin espacios.",
        },
        {
          clave: "rol",
          etiqueta: "Rol",
          tipo: "opcion",
          opciones: [
            { valor: "staff", etiqueta: ROL.staff },
            { valor: "admin", etiqueta: ROL.admin },
          ],
          ayuda: "El staff solo usa la calculadora. El administrador también configura tasas, catálogo y usuarios.",
        },
        {
          clave: "clave",
          etiqueta: "Contraseña",
          tipo: "texto",
          placeholder: "Mínimo 8 caracteres",
          ayuda: "Compártela con la persona. Al editar, déjala vacía para conservar la actual.",
        },
        { clave: "activo", etiqueta: "Puede ingresar", tipo: "interruptor" },
      ]}
      valoresDe={(u) => ({
        nombre: u?.nombre ?? "",
        usuario: u?.usuario ?? "",
        rol: u?.rol ?? "staff",
        clave: "",
        activo: u?.activo ?? true,
      })}
      validar={(v, actual) => {
        const errores: Record<string, string> = {};
        const usuario = String(v.usuario).trim().toLowerCase();
        const clave = String(v.clave);
        if (!String(v.nombre).trim()) errores.nombre = "Escribe el nombre de la persona, por ejemplo Laura Pérez.";
        if (!/^[a-z0-9._-]{3,40}$/.test(usuario))
          errores.usuario = "Usa de 3 a 40 letras, números o puntos, sin espacios ni tildes; por ejemplo laura.perez.";
        else if (usuarios.some((u) => u.id !== actual?.id && u.usuario === usuario))
          errores.usuario = "Ese usuario ya existe; escribe otro.";
        if (!actual && !clave) errores.clave = "Escribe la contraseña con la que va a ingresar.";
        else if (clave && clave.length < 8) errores.clave = "Escribe al menos 8 caracteres.";
        if (actual && actual.id === yo?.id) {
          if (v.rol !== "admin") errores.rol = "No puedes quitarte el rol de administrador; pídeselo a otro administrador.";
          if (v.activo !== true) errores.activo = "No puedes desactivar tu propia cuenta; pídeselo a otro administrador.";
        }
        return errores;
      }}
      guardar={(v, actual) => {
        const datos = {
          nombre: String(v.nombre).trim(),
          usuario: String(v.usuario).trim().toLowerCase(),
          rol: v.rol as Rol,
          activo: v.activo === true,
          clave: String(v.clave) || undefined,
        };
        if (!actual) return crearUsuario(datos);
        return actualizarUsuario(actual.id, datos);
      }}
      eliminar={(u) => eliminarUsuario(u.id)}
      avisoEliminar={() =>
        "Ya no podrá ingresar y no se puede deshacer. Si solo quieres quitarle el acceso, desactívalo."
      }
    />
  );
}
