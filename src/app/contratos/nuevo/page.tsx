"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FotoHueco } from "@/components/contratos/Fotos";
import { Aviso, Marco, Opcion } from "@/components/contratos/Marco";
import { Badge, Button, SegmentedControl, TextField, Toggle } from "@/components/ui";
import {
  ACREEDORES,
  LUGAR_PAGO,
  MESES,
  PASOS,
  PERIODOS,
  capitalDe,
  diaCorto,
  diaLocal,
  erroresContrato,
  interesesCalculados,
  isoDia,
  letras,
  llevaImei,
  nombrePlantilla,
  numeroCorto,
  planDe,
  sumarMeses,
} from "@/lib/contratos";
import { cop, decimalATexto, hora, nombreDe, pct, textoADecimal } from "@/lib/formato";
import { borrarBorrador, guardarBorrador as guardarLocal, leerBorrador } from "@/lib/borrador";
import { subirFoto } from "@/lib/fotos";
import { useRequerirRol, useStore } from "@/lib/store";
import { pedir } from "@/lib/useContrato";
import { clientesAnteriores, guardarBorrador, obtenerContrato, proximosNumeros, quitarFoto } from "@/server/contratos";
import type {
  ClienteContrato,
  Contrato,
  ContratoNuevo,
  Datos,
  EquipoContrato,
  Fotos,
  FotoCedula,
  FotoEquipo,
  Usuario,
} from "@/lib/types";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const digitos = (s: string) => s.replace(/[^0-9]/g, "");
const ORD = ["1.ª", "2.ª", "3.ª", "4.ª", "5.ª", "6.ª", "7.ª", "8.ª", "9.ª", "10.ª", "11.ª", "12.ª"];

function inicial(tasa: number): ContratoNuevo {
  const hoy = new Date();
  return {
    tipo: "acuerdo",
    acreedor: "esmer",
    forma: "cuotas",
    conIntereses: false,
    cliente: { trato: "sra", nombre: "", cc: "", exp: "", ciudad: "Yopal", dir: "", correo: "", cel: "" },
    equipo: {
      categoria: "celular",
      marca: "",
      modelo: "",
      color: "",
      capacidad: "",
      estado: "nuevo",
      serial: "",
      imeis: [""],
    },
    precio: 0,
    inicial: 0,
    capital: 0,
    nCuotas: 6,
    periodo: "mensual",
    fechaPago: isoDia(sumarMeses(hoy, 1)),
    tasa,
    mesTasa: MESES[hoy.getMonth()],
    intereses: null,
    diasDevolucion: 30,
  };
}

/** Completa un borrador guardado antes de que existieran algunos campos. */
function completar(d: Partial<ContratoNuevo>, tasa: number): ContratoNuevo {
  const base = inicial(tasa);
  const equipo = { ...base.equipo, ...d.equipo };
  return {
    ...base,
    ...d,
    cliente: { ...base.cliente, ...d.cliente },
    equipo: { ...equipo, imeis: equipo.imeis?.length ? equipo.imeis : [""] },
  };
}

const datosDe = (c: Contrato): ContratoNuevo => ({
  tipo: c.tipo,
  acreedor: c.acreedor,
  forma: c.forma,
  conIntereses: c.conIntereses,
  cliente: c.cliente,
  equipo: c.equipo,
  precio: c.precio,
  inicial: c.inicial,
  capital: c.capital,
  nCuotas: c.nCuotas,
  periodo: c.periodo,
  fechaPago: c.fechaPago,
  tasa: c.tasa,
  mesTasa: c.mesTasa,
  intereses: c.intereses,
  diasDevolucion: c.diasDevolucion,
});

export default function NuevoContratoPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const datos = useStore();
  const consulta = useSearchParams();
  // Se lee una vez: al guardar por primera vez el formulario escribe el id en la URL (para recargar sin perderlo) y no debe reiniciarse.
  const [id] = useState(() => consulta.get("borrador"));
  const router = useRouter();
  const [desdeServidor, setDesdeServidor] = useState<Contrato | null>(null);
  const [fallo, setFallo] = useState("");

  useEffect(() => {
    if (!id || !usuario) return;
    let vigente = true;
    pedir(obtenerContrato(id))
      .then(({ contrato }) => {
        if (!vigente) return;
        // Aprobado o firmado ya no se edita: se abre su pantalla.
        if (contrato.etapa !== "borrador" || contrato.anulado) router.replace(`/contratos/${contrato.id}`);
        else setDesdeServidor(contrato);
      })
      .catch((e: Error) => vigente && setFallo(e.message));
    return () => {
      vigente = false;
    };
  }, [id, usuario, router]);

  if (!usuario || !datos.listo) return null;
  const volver = usuario.rol === "admin" ? "/admin/contratos" : "/contratos";
  if (id) {
    if (fallo)
      return (
        <Aviso
          titulo="No se pudo abrir el borrador"
          texto={fallo}
          accion={
            <Link className="es-btn es-btn--secondary es-btn--md" href={volver}>
              Volver
            </Link>
          }
        />
      );
    if (!desdeServidor) return null;
    return (
      <Formulario key={desdeServidor.id} datos={datos} usuario={usuario} volver={volver} borrador={desdeServidor} />
    );
  }
  return <Formulario datos={datos} usuario={usuario} volver={volver} />;
}

const SIN_JURA = { tradicion: false, hurto: false, bloqueo: false };
type Hueco = FotoCedula | FotoEquipo;

function Formulario({
  datos,
  usuario,
  volver,
  borrador,
}: {
  datos: Datos;
  usuario: Usuario;
  volver: string;
  borrador?: Contrato;
}) {
  const router = useRouter();
  const main = useRef<HTMLElement>(null);
  const tasaSugerida = datos.ajustes.tasa;
  // Solo se monta en el navegador (con la sesión cargada), así que puede leer el borrador del celular al iniciar.
  const [recuperado] = useState(() => {
    const local = leerBorrador(usuario.id);
    // Un borrador que ya está en el servidor se sigue desde Contratos, no al empezar uno nuevo.
    if (!borrador) return local?.borradorId ? null : local;
    // Abierto desde el registro: lo escrito en este celular solo vale si es de ese mismo borrador y más reciente.
    return local && local.borradorId === borrador.id && local.guardado > Date.parse(borrador.editadoEn) ? local : null;
  });
  const [borradorId, setBorradorId] = useState<string | null>(borrador?.id ?? recuperado?.borradorId ?? null);
  const [paso, setPaso] = useState(recuperado?.paso ?? borrador?.paso ?? 1);
  const [d, setD] = useState<ContratoNuevo>(() =>
    recuperado
      ? completar(recuperado.d, tasaSugerida)
      : borrador
        ? completar(datosDe(borrador), tasaSugerida)
        : inicial(tasaSugerida),
  );
  const [tasaTxt, setTasaTxt] = useState(() => decimalATexto(d.tasa || tasaSugerida));
  const [jura, setJura] = useState(recuperado?.jura ?? SIN_JURA);
  const [aviso, setAviso] = useState(!!recuperado && !borrador);
  const [fotos, setFotos] = useState<Fotos>(borrador?.fotos ?? {});
  const [guardadoEn, setGuardadoEn] = useState<string | null>(borrador?.editadoEn ?? null);
  const [avisoGuardado, setAvisoGuardado] = useState(false);
  const [subiendo, setSubiendo] = useState<Hueco | null>(null);
  const [intentado, setIntentado] = useState(0); // último paso en el que se pulsó Continuar
  const [numeros, setNumeros] = useState<{ acuerdo: number; compraventa: number; anio: number } | null>(null);
  const [clientes, setClientes] = useState<ClienteContrato[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaEquipo, setBuscaEquipo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");
  const guardando = useRef<Promise<string> | null>(null);

  useEffect(() => {
    proximosNumeros().then(setNumeros, () => {});
    clientesAnteriores().then(setClientes, () => {});
  }, []);
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [paso]);
  // Cada cambio queda guardado en el celular: si el navegador recarga la página al volver de otra app, nada se pierde.
  const conDatos = paso > 1 || !!d.cliente.nombre || !!d.capital || !!borradorId;
  useEffect(() => {
    if (conDatos) guardarLocal(usuario.id, { paso, d, jura, borradorId });
  }, [conDatos, paso, d, jura, borradorId, usuario.id]);

  function empezarDeNuevo() {
    borrarBorrador(usuario.id);
    setBorradorId(null);
    setFotos({});
    setGuardadoEn(null);
    setPaso(1);
    setD(inicial(tasaSugerida));
    setTasaTxt(decimalATexto(tasaSugerida));
    setJura(SIN_JURA);
    setIntentado(0);
    setAviso(false);
  }

  const cambiar = (parche: Partial<ContratoNuevo>) => setD((p) => ({ ...p, ...parche }));
  const cliente = (parche: Partial<ClienteContrato>) => setD((p) => ({ ...p, cliente: { ...p.cliente, ...parche } }));
  const equipo = (parche: Partial<EquipoContrato>) => setD((p) => ({ ...p, equipo: { ...p.equipo, ...parche } }));

  const compra = d.tipo === "compraventa";
  const acuerdo = !compra;
  const cuotas = acuerdo && d.forma === "cuotas";
  const conInt = acuerdo && d.conIntereses;
  const juraCompleta = jura.tradicion && jura.hurto && jura.bloqueo;
  // En los acuerdos el capital sale del valor del producto menos la cuota inicial.
  const dd: ContratoNuevo = { ...d, capital: capitalDe(d), tasa: conInt ? d.tasa : 0 };

  const usura = datos.ajustes.usura;
  const errores = erroresContrato(dd, paso, usura);
  const error = (k: string) => (intentado === paso ? errores[k] : undefined);
  const errorJura = compra && paso === 3 && intentado === 3 && !juraCompleta;

  const hoy = new Date();
  const plan = planDe(dd, conInt ? dd.tasa : 0, hoy);
  const total = plan.reduce((a, p) => a + p.valor, 0);
  const interesesAuto = interesesCalculados(dd.capital, dd.tasa, hoy, diaLocal(d.fechaPago));

  /** Guarda en el servidor y devuelve el id; si ya hay un guardado en curso, espera ese. */
  function guardar(pasoGuardado = paso): Promise<string> {
    const anterior = guardando.current ?? Promise.resolve(borradorId);
    const siguiente = anterior
      .catch(() => borradorId)
      .then(async (id) => {
        const { contrato } = await pedir(guardarBorrador(id, dd, pasoGuardado));
        // Si el navegador recarga la página (al volver de WhatsApp), vuelve a este borrador.
        if (!id) window.history.replaceState(null, "", `/contratos/nuevo?borrador=${contrato.id}`);
        setBorradorId(contrato.id);
        setFotos(contrato.fotos);
        setGuardadoEn(contrato.editadoEn);
        return contrato.id;
      });
    guardando.current = siguiente;
    siguiente
      .finally(() => {
        if (guardando.current === siguiente) guardando.current = null;
      })
      .catch(() => {});
    return siguiente;
  }

  /** Al cambiar de paso se guarda solo si ya hay datos del cliente o el borrador existe. */
  function irA(nuevo: number) {
    setPaso(nuevo);
    if (borradorId || d.cliente.nombre.trim()) guardar(nuevo).catch((e: Error) => setFallo(e.message));
  }

  async function guardarAhora() {
    setFallo("");
    try {
      await guardar();
      setAvisoGuardado(true);
    } catch (e) {
      setFallo((e as Error).message);
    }
  }

  function continuar() {
    setIntentado(paso);
    if (Object.keys(errores).length || (compra && paso === 3 && !juraCompleta)) return;
    setFallo("");
    irA(paso + 1);
  }

  async function crearParaRevision() {
    // Revisa todo el formulario: si algo falta, vuelve al primer paso con errores.
    const conErrores = [2, 3, 4].find((p) => Object.keys(erroresContrato(dd, p, usura)).length);
    if (conErrores) {
      setPaso(conErrores);
      setIntentado(conErrores);
      return;
    }
    if (compra && !juraCompleta) {
      setPaso(3);
      setIntentado(3);
      return;
    }
    setOcupado(true);
    setFallo("");
    try {
      const id = await guardar(4);
      borrarBorrador(usuario.id);
      router.push(`/contratos/${id}`);
    } catch (e) {
      setFallo((e as Error).message);
      setOcupado(false);
    }
  }

  async function foto(hueco: Hueco, archivo: File) {
    setSubiendo(hueco);
    setFallo("");
    try {
      const id = borradorId ?? (await guardar());
      setFotos((await subirFoto(id, hueco, archivo)).fotos);
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setSubiendo(null);
    }
  }

  async function quitar(hueco: Hueco) {
    if (!borradorId) return;
    setSubiendo(hueco);
    try {
      setFotos((await pedir(quitarFoto(borradorId, hueco))).contrato.fotos);
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setSubiendo(null);
    }
  }

  // Búsquedas: clientes de contratos anteriores y productos del catálogo.
  const qc = sinTildes(buscaCliente.trim());
  const qcDig = digitos(buscaCliente);
  const sugeridos = qc
    ? clientes
        .filter((c) => sinTildes(c.nombre).includes(qc) || (qcDig.length >= 3 && digitos(c.cc).includes(qcDig)))
        .slice(0, 5)
    : [];
  const qe = sinTildes(buscaEquipo.trim());
  const productos = qe
    ? datos.productos
        .filter((p) => p.activo && sinTildes(`${nombreDe(datos.marcas, p.marcaId)} ${p.nombre}`).includes(qe))
        .slice(0, 5)
    : [];

  const proximo = numeros ? `No. ${numeroCorto(d.tipo, numeros.anio, numeros[d.tipo])} del ${numeros.anio}` : null;
  const capLetras = dd.capital ? letras(dd.capital) : "";
  const capLetrasTxt = capLetras ? capLetras.charAt(0).toUpperCase() + capLetras.slice(1) : "";
  const imeis = d.equipo.imeis.length ? d.equipo.imeis : [""];
  const nFotosEquipo = (["frente", "reverso", "pantalla", "detalle"] as const).filter((k) => fotos[k]).length;

  const pie = (
    <>
      {fallo ? (
        <div className="callout text-danger-text" role="alert">
          {fallo}
        </div>
      ) : null}
      <div className="flex gap-3">
        {paso > 1 ? (
          <Button variant="secondary" size="lg" disabled={ocupado} onClick={() => irA(paso - 1)}>
            Atrás
          </Button>
        ) : null}
        {paso < 4 ? (
          <Button size="lg" pill className="flex-1" onClick={continuar}>
            Continuar
          </Button>
        ) : (
          <Button size="lg" pill className="flex-1" disabled={ocupado} onClick={crearParaRevision}>
            {ocupado ? "Guardando…" : "Crear borrador para revisión"}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <Marco
      volver={volver}
      titulo={borrador ? "Editar borrador" : "Nuevo contrato"}
      subtitulo={`Paso ${paso} de 4 · ${PASOS[paso - 1]}`}
      lado={
        <Button variant="plain" size="sm" onClick={guardarAhora}>
          Guardar borrador
        </Button>
      }
      extra={
        <>
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={i <= paso ? "paso paso--on" : "paso"} />
            ))}
          </div>
          <div role="status" className="footnote flex items-center gap-1.5 text-ink-secondary">
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
              <path d="M5 12l5 5L20 7" />
            </svg>
            <span>
              {guardadoEn
                ? `Borrador guardado a las ${hora(guardadoEn)} · se guarda solo al cambiar de paso`
                : "Lo que escribes se guarda en este celular"}
            </span>
          </div>
        </>
      }
      mainRef={main}
      pie={pie}
    >
      {aviso ? (
        <div className="es-card flex items-center justify-between gap-3 py-3" role="status">
          <span className="callout">Recuperamos el contrato que estabas llenando.</span>
          <Button variant="plain" size="sm" onClick={empezarDeNuevo}>
            Empezar de nuevo
          </Button>
        </div>
      ) : null}
      {avisoGuardado ? (
        <section className="es-card flex flex-col gap-2 border-accent bg-surface-selected" role="status">
          <div className="headline">Borrador guardado</div>
          <div className="callout text-ink-secondary">
            Puedes cerrar y terminarlo después desde Contratos › Borradores. No tiene número de contrato hasta que
            administración lo apruebe.
          </div>
          <div className="flex gap-2">
            <Link href={volver} className="es-btn es-btn--tinted es-btn--sm">
              Ir a borradores
            </Link>
            <Button variant="plain" size="sm" onClick={() => setAvisoGuardado(false)}>
              Seguir editando
            </Button>
          </div>
        </section>
      ) : null}

      {paso === 1 ? (
        <>
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">Documento</div>
            <div role="radiogroup" aria-label="Documento" className="flex flex-col gap-2">
              <Opcion
                on={acuerdo}
                titulo="Acuerdo de pago"
                texto="Esgode vende un equipo a crédito."
                onClick={() => cambiar({ tipo: "acuerdo" })}
              />
              <Opcion
                on={compra}
                titulo="Compraventa"
                texto="Esgode le compra un equipo a un cliente."
                onClick={() => cambiar({ tipo: "compraventa" })}
              />
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">{compra ? "Comprador" : "Acreedor"}</div>
            <SegmentedControl
              className="flex [&>button]:flex-1"
              label={compra ? "Comprador" : "Acreedor"}
              options={(["esmer", "elex"] as const).map((k) => ({ value: k, label: ACREEDORES[k].nombre }))}
              value={d.acreedor}
              onChange={(v) => cambiar({ acreedor: v as ContratoNuevo["acreedor"] })}
            />
            <div className="callout text-ink-secondary">{ACREEDORES[d.acreedor].texto}</div>
          </section>
          {acuerdo ? (
            <>
              <section className="flex flex-col gap-2">
                <div className="es-caption-label">Forma de pago</div>
                <SegmentedControl
                  className="flex [&>button]:flex-1"
                  label="Forma de pago"
                  options={[
                    { value: "cuotas", label: "A cuotas" },
                    { value: "unico", label: "Un solo pago" },
                  ]}
                  value={d.forma}
                  onChange={(v) => cambiar({ forma: v as ContratoNuevo["forma"] })}
                />
              </section>
              <Toggle
                label="Con intereses corrientes"
                checked={d.conIntereses}
                onChange={(v) => cambiar({ conIntereses: v })}
              />
            </>
          ) : null}
          <section className="es-card flex flex-col gap-1.5">
            <div className="es-caption-label">Plantilla</div>
            <div className="title-3">{nombrePlantilla(d)}</div>
            <div className="callout text-ink-secondary">
              El número se asigna cuando administración aprueba el borrador
              {proximo ? (
                <>
                  {" "}
                  (el próximo es <span className="data text-ink">{proximo}</span>)
                </>
              ) : null}
              .
            </div>
          </section>
        </>
      ) : null}

      {paso === 2 ? (
        <>
          <div className="flex flex-col gap-2">
            <TextField
              className="max-w-none"
              placeholder="Buscar cliente por nombre o cédula"
              leading="search"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              hint={
                qc && !sugeridos.length
                  ? "Sin coincidencias. Completa los datos para crear uno nuevo."
                  : "O completa los datos para crear uno nuevo."
              }
            />
            {sugeridos.length ? (
              <ul className="es-card m-0 list-none overflow-hidden p-0">
                {sugeridos.map((c) => (
                  <li key={c.cc} className="border-b border-hairline last:border-b-0">
                    <button
                      type="button"
                      className="flex min-h-12 w-full cursor-pointer flex-col px-4 py-2 text-left active:bg-surface-hover"
                      onClick={() => {
                        cliente(c);
                        setBuscaCliente("");
                      }}
                    >
                      <span className="headline">{c.nombre}</span>
                      <span className="callout text-ink-secondary">
                        C.C. {c.cc} · {c.ciudad}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">{compra ? "Vendedor" : "Deudor"}</div>
            <SegmentedControl
              className="flex [&>button]:flex-1"
              label="Tratamiento"
              options={[
                { value: "sr", label: "Señor" },
                { value: "sra", label: "Señora" },
              ]}
              value={d.cliente.trato}
              onChange={(v) => cliente({ trato: v as ClienteContrato["trato"] })}
            />
          </section>
          <TextField
            className="max-w-none"
            label="Nombre completo"
            autoComplete="off"
            value={d.cliente.nombre}
            onChange={(e) => cliente({ nombre: e.target.value })}
            error={error("nombre")}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              className="max-w-none"
              label="Cédula"
              inputMode="numeric"
              value={d.cliente.cc}
              onChange={(e) => cliente({ cc: e.target.value.replace(/[^0-9.]/g, "") })}
              error={error("cc")}
            />
            <TextField
              className="max-w-none"
              label="Expedida en"
              value={d.cliente.exp}
              onChange={(e) => cliente({ exp: e.target.value })}
              error={error("exp")}
            />
          </div>
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <div className="es-caption-label">Foto de la cédula</div>
              <span className="footnote text-ink-secondary">Va al contrato como evidencia</span>
            </div>
            <div className="fotos">
              {(
                [
                  ["cedulaFrente", "Frente"],
                  ["cedulaReverso", "Reverso"],
                ] as const
              ).map(([k, t]) => (
                <FotoHueco
                  key={k}
                  contratoId={borradorId}
                  titulo={t}
                  foto={fotos[k]}
                  ocupado={subiendo === k}
                  onElegir={(f) => foto(k, f)}
                  onQuitar={() => quitar(k)}
                />
              ))}
            </div>
            <div className="footnote text-ink-secondary">
              Sobre una superficie plana, con buena luz y sin reflejos. Deben leerse el nombre y el número.
            </div>
          </section>
          <TextField
            className="max-w-none"
            label="Ciudad de residencia"
            value={d.cliente.ciudad}
            onChange={(e) => cliente({ ciudad: e.target.value })}
            error={error("ciudad")}
          />
          <TextField
            className="max-w-none"
            label="Dirección de residencia"
            value={d.cliente.dir}
            onChange={(e) => cliente({ dir: e.target.value })}
            hint="Obligatoria. Calle, número y barrio."
            error={error("dir")}
          />
          <TextField
            className="max-w-none"
            label="Correo para notificaciones"
            type="email"
            autoComplete="off"
            value={d.cliente.correo}
            onChange={(e) => cliente({ correo: e.target.value })}
            error={error("correo")}
          />
          <TextField
            className="max-w-none"
            label="Celular para notificaciones"
            type="tel"
            inputMode="tel"
            value={d.cliente.cel}
            onChange={(e) => cliente({ cel: e.target.value.replace(/[^0-9 ]/g, "") })}
            hint="Va en la cláusula de notificaciones."
            error={error("cel")}
          />
        </>
      ) : null}

      {paso === 3 ? (
        <>
          <div className="flex flex-col gap-2">
            <TextField
              className="max-w-none"
              placeholder="Buscar en inventario"
              leading="search"
              value={buscaEquipo}
              onChange={(e) => setBuscaEquipo(e.target.value)}
              hint={qe && !productos.length ? "Sin coincidencias. Escribe los datos del equipo." : undefined}
            />
            {productos.length ? (
              <ul className="es-card m-0 list-none overflow-hidden p-0">
                {productos.map((p) => {
                  const marca = nombreDe(datos.marcas, p.marcaId);
                  const cat = sinTildes(nombreDe(datos.categorias, p.categoriaId));
                  return (
                    <li key={p.id} className="border-b border-hairline last:border-b-0">
                      <button
                        type="button"
                        className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left active:bg-surface-hover"
                        onClick={() => {
                          equipo({
                            marca,
                            modelo: p.nombre,
                            categoria: cat.startsWith("cel")
                              ? "celular"
                              : cat.startsWith("tab")
                                ? "tablet"
                                : cat.startsWith("port")
                                  ? "portatil"
                                  : d.equipo.categoria,
                          });
                          if (acuerdo && !d.precio) cambiar({ precio: p.precio });
                          setBuscaEquipo("");
                        }}
                      >
                        <span className="headline">
                          {marca} {p.nombre}
                        </span>
                        <span className="data">{cop(p.precio)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">Categoría</div>
            <SegmentedControl
              className="flex [&>button]:flex-1"
              label="Categoría"
              options={[
                { value: "celular", label: "Celular" },
                { value: "tablet", label: "Tablet" },
                { value: "portatil", label: "Portátil" },
                { value: "otro", label: "Otro" },
              ]}
              value={d.equipo.categoria}
              onChange={(v) => equipo({ categoria: v as EquipoContrato["categoria"] })}
            />
          </section>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              className="max-w-none"
              label="Marca"
              placeholder="Ej: Apple, Samsung, Xiaomi"
              value={d.equipo.marca}
              onChange={(e) => equipo({ marca: e.target.value })}
              error={error("marca")}
            />
            <TextField
              className="max-w-none"
              label="Modelo"
              placeholder="Ej: iPhone 15 Pro, Galaxy A54"
              value={d.equipo.modelo}
              onChange={(e) => equipo({ modelo: e.target.value })}
              error={error("modelo")}
            />
            <TextField
              className="max-w-none"
              label="Color"
              placeholder="Ej: Negro titanio"
              value={d.equipo.color}
              onChange={(e) => equipo({ color: e.target.value })}
            />
            <TextField
              className="max-w-none"
              label="Capacidad"
              placeholder="Ej: 128 GB"
              value={d.equipo.capacidad}
              onChange={(e) => equipo({ capacidad: e.target.value })}
            />
          </div>
          <section className="flex flex-col gap-2">
            <div className="es-caption-label">Estado</div>
            <SegmentedControl
              className="flex [&>button]:flex-1"
              label="Estado del equipo"
              options={[
                { value: "nuevo", label: "Nuevo" },
                { value: "seminuevo", label: "Seminuevo" },
                { value: "usado", label: "Usado" },
              ]}
              value={d.equipo.estado}
              onChange={(v) => equipo({ estado: v as EquipoContrato["estado"] })}
            />
          </section>
          <TextField
            className="max-w-none"
            label={compra ? "Serial (obligatorio)" : "Serial"}
            placeholder="Ej: F2LXK1ABCD12"
            value={d.equipo.serial}
            onChange={(e) => equipo({ serial: e.target.value })}
            hint="Está en Ajustes › General › Información, o en la caja del equipo."
            error={error("serial")}
          />
          {llevaImei(d.equipo) ? (
            <section className="flex flex-col gap-3">
              {imeis.map((v, i) => (
                <div key={i} className="flex items-end gap-2">
                  <TextField
                    className="max-w-none flex-1"
                    label={`IMEI ${i + 1}${i === 0 && compra ? " (obligatorio)" : ""}`}
                    placeholder="Ej: 356938035643809"
                    inputMode="numeric"
                    value={v}
                    onChange={(e) => {
                      const lista = [...imeis];
                      lista[i] = digitos(e.target.value).slice(0, 15);
                      equipo({ imeis: lista });
                    }}
                    error={error(`imei${i}`)}
                  />
                  {i > 0 ? (
                    <Button
                      variant="plain"
                      size="md"
                      onClick={() => equipo({ imeis: imeis.filter((_, j) => j !== i) })}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ))}
              {imeis.length < 4 ? (
                <Button
                  variant="tinted"
                  size="md"
                  icon="plus"
                  className="self-start"
                  onClick={() => equipo({ imeis: [...imeis, ""] })}
                >
                  Agregar otro IMEI
                </Button>
              ) : null}
              <div className="callout -mt-1 text-ink-secondary">
                Marca *#06# en el celular para ver sus IMEI. Los equipos con dos SIM o eSIM tienen dos.
              </div>
            </section>
          ) : null}
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <div className="es-caption-label">Fotos del equipo</div>
              <span className="footnote text-ink-secondary">{nFotosEquipo} de 4</span>
            </div>
            <div className="fotos">
              {(
                [
                  ["frente", "Frente", "Pantalla apagada"],
                  ["reverso", "Reverso", "Cámaras y carcasa"],
                  ["pantalla", "Pantalla encendida", "Ajustes › Información"],
                  ["detalle", "Estado y detalles", "Rayones, golpes, caja"],
                ] as const
              ).map(([k, t, a]) => (
                <FotoHueco
                  key={k}
                  contratoId={borradorId}
                  titulo={t}
                  ayuda={a}
                  forma="cuadrada"
                  foto={fotos[k]}
                  ocupado={subiendo === k}
                  onElegir={(f) => foto(k, f)}
                  onQuitar={() => quitar(k)}
                />
              ))}
            </div>
            <div className="footnote text-ink-secondary">
              Toma las fotos con la cámara del celular. Van al contrato, en la página de evidencias fotográficas, con
              fecha, hora y quién las tomó.
            </div>
          </section>
          {compra ? (
            <section className="es-card flex flex-col gap-3">
              <div className="es-caption-label">El vendedor declara bajo juramento</div>
              <Toggle
                label="Compró el equipo en Esgode"
                checked={jura.tradicion}
                onChange={(v) => setJura({ ...jura, tradicion: v })}
              />
              <Toggle
                label="No está reportado como hurtado"
                checked={jura.hurto}
                onChange={(v) => setJura({ ...jura, hurto: v })}
              />
              <Toggle
                label="Sin bloqueos ni deuda con operadores"
                checked={jura.bloqueo}
                onChange={(v) => setJura({ ...jura, bloqueo: v })}
              />
              {errorJura ? (
                <div className="callout text-danger-text">
                  El contrato incluye las tres declaraciones. Si el vendedor no puede hacerlas, no se genera la
                  compraventa.
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {paso === 4 ? (
        <>
          {compra ? (
            <div className="flex flex-col gap-1.5">
              <TextField
                className="max-w-none"
                label="Valor de compra"
                placeholder="$ 0"
                inputMode="numeric"
                value={d.capital ? cop(d.capital) : ""}
                onChange={(e) => cambiar({ capital: Number(digitos(e.target.value).slice(0, 10)) })}
                error={error("capital")}
              />
              {capLetrasTxt ? <div className="callout text-ink-secondary">{capLetrasTxt}</div> : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  className="max-w-none"
                  label="Valor del producto"
                  placeholder="$ 0"
                  inputMode="numeric"
                  value={d.precio ? cop(d.precio) : ""}
                  onChange={(e) => cambiar({ precio: Number(digitos(e.target.value).slice(0, 10)), intereses: null })}
                  error={error("precio") ?? error("capital")}
                />
                <TextField
                  className="max-w-none"
                  label="Cuota inicial"
                  placeholder="$ 0"
                  inputMode="numeric"
                  value={cop(d.inicial ?? 0)}
                  onChange={(e) => cambiar({ inicial: Number(digitos(e.target.value).slice(0, 10)), intereses: null })}
                  error={error("inicial")}
                />
              </div>
              <div className="es-card flex flex-col gap-1 border-transparent bg-surface-sunken px-3.5 py-3 shadow-none">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="es-caption-label">Capital a financiar</span>
                  <span className="title-2 tabular-nums">{cop(dd.capital)}</span>
                </div>
                {capLetrasTxt ? <div className="callout text-ink-secondary">{capLetrasTxt}</div> : null}
                <div className="footnote text-ink-secondary">
                  Valor del producto {cop(d.precio ?? 0)} − cuota inicial {cop(d.inicial ?? 0)}. Sobre este valor se
                  calculan las cuotas
                  {conInt ? " y los intereses." : "."}
                </div>
              </div>
            </>
          )}

          {cuotas ? (
            <>
              <section className="flex flex-col gap-2">
                <div className="es-caption-label">Número de cuotas</div>
                <SegmentedControl
                  className="flex [&>button]:flex-1"
                  label="Número de cuotas"
                  options={[2, 3, 4, 6, 9, 12].map((n) => ({ value: String(n), label: String(n) }))}
                  value={String(d.nCuotas)}
                  onChange={(v) => cambiar({ nCuotas: Number(v) })}
                />
              </section>
              <section className="flex flex-col gap-2">
                <div className="es-caption-label">Periodicidad de pago</div>
                <SegmentedControl
                  className="flex [&>button]:flex-1"
                  label="Periodicidad de pago"
                  options={PERIODOS.map((p) => ({ value: p.value, label: p.label }))}
                  value={d.periodo}
                  onChange={(v) => cambiar({ periodo: v as ContratoNuevo["periodo"] })}
                />
              </section>
            </>
          ) : null}
          {acuerdo ? (
            <TextField
              className="max-w-none"
              label={cuotas ? "Fecha de la primera cuota" : "Fecha de pago"}
              type="date"
              value={d.fechaPago}
              onChange={(e) => cambiar({ fechaPago: e.target.value, intereses: null })}
              hint={
                cuotas
                  ? d.periodo === "semanal"
                    ? "Las demás, cada 7 días."
                    : d.periodo === "quincenal"
                      ? "Las demás, cada 15 días."
                      : "Las demás, el mismo día de cada mes."
                  : conInt
                    ? "Los intereses se pagan el mismo día que el capital."
                    : "El capital se paga completo ese día."
              }
              error={error("fechaPago")}
            />
          ) : (
            <TextField
              className="max-w-none"
              label="Días para solicitar devolución"
              inputMode="numeric"
              value={d.diasDevolucion ? String(d.diasDevolucion) : ""}
              onChange={(e) => cambiar({ diasDevolucion: Number(digitos(e.target.value).slice(0, 3)) || null })}
              hint="Cláusula quinta. Después, el contrato sirve como título ejecutivo."
              error={error("diasDevolucion")}
            />
          )}

          {conInt ? (
            <>
              <section className="es-card flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="es-caption-label">
                    Tasa sugerida · {MESES[hoy.getMonth()]} {hoy.getFullYear()}
                  </div>
                  <Badge tone="success">Sugerida {pct(tasaSugerida)}</Badge>
                </div>
                <TextField
                  className="max-w-none"
                  outlined
                  label="Tasa de interés mensual (% M.V.)"
                  inputMode="decimal"
                  value={tasaTxt}
                  onChange={(e) => {
                    const txt = e.target.value.replace(/[^0-9.,]/g, "");
                    setTasaTxt(txt);
                    cambiar({ tasa: textoADecimal(txt) || 0, intereses: null });
                  }}
                  hint={
                    usura != null
                      ? `Máximo ${pct(usura)} mensual (usura del mes).`
                      : "Escribe la tasa que aplica a este contrato."
                  }
                  error={error("tasa")}
                />
                <div className="callout text-ink-secondary">
                  Administración define la tasa sugerida en Contratos › Ajustes. Puedes escribir otra para este
                  contrato; se usa para calcular las cuotas.
                </div>
              </section>
              <TextField
                className="max-w-none"
                label="Mes de la tasa (como aparece en el contrato)"
                value={d.mesTasa}
                onChange={(e) => cambiar({ mesTasa: e.target.value })}
                hint={`Va en la cláusula 2: «…para el mes de ${d.mesTasa.trim() || "octubre"}».`}
                error={error("mesTasa")}
              />
              {!cuotas ? (
                <TextField
                  className="max-w-none"
                  label="Total de intereses"
                  inputMode="numeric"
                  value={cop(d.intereses ?? interesesAuto)}
                  onChange={(e) => cambiar({ intereses: Number(digitos(e.target.value).slice(0, 10)) })}
                  hint="Calculado con la tasa. Puedes ajustarlo; se escribe tal cual en el contrato."
                  error={error("intereses")}
                />
              ) : null}
            </>
          ) : null}

          {acuerdo && plan.length ? (
            <section className="es-card flex flex-col px-4 py-1">
              <div className="fila pt-3">
                <span className="es-caption-label self-center">Plan de pagos</span>
                <span className="callout text-ink-secondary">
                  {cuotas
                    ? `${d.nCuotas} cuotas ${PERIODOS.find((p) => p.value === d.periodo)!.plural} · ${conInt ? `${pct(dd.tasa)} mensual` : "sin intereses"}`
                    : conInt
                      ? `${pct(dd.tasa)} mensual`
                      : "Sin intereses"}
                </span>
              </div>
              {plan.map((p, i) => (
                <div key={i} className="fila">
                  <span>
                    {p.concepto ?? `${ORD[i]} cuota`}
                    <span className="text-ink-secondary"> · {diaCorto(p.fecha)}</span>
                  </span>
                  <span className="data whitespace-nowrap">{cop(p.valor)}</span>
                </div>
              ))}
              <div className="fila font-semibold">
                <span>Total a pagar</span>
                <span className="data font-semibold whitespace-nowrap">{cop(total)}</span>
              </div>
            </section>
          ) : null}

          <section className="callout flex flex-col gap-1 text-ink-secondary">
            <div>
              <span className="font-semibold text-ink">Pago:</span>{" "}
              {compra ? "Esgode paga al vendedor a la firma del contrato." : LUGAR_PAGO}
            </div>
            <div>
              <span className="font-semibold text-ink">Siguiente paso:</span> se crea el borrador con marca BORRADOR
              para revisarlo. Administración lo aprueba y se asigna el número.
            </div>
          </section>
        </>
      ) : null}
    </Marco>
  );
}
