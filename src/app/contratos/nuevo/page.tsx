"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Marco, Opcion } from "@/components/contratos/Marco";
import { Badge, Button, SegmentedControl, TextField, Toggle } from "@/components/ui";
import {
  LUGAR_PAGO,
  MESES,
  PASOS,
  diaCorto,
  erroresContrato,
  interesesCalculados,
  isoDia,
  letras,
  diaLocal,
  nombrePlantilla,
  numeroCorto,
  planDe,
  sumarMeses,
} from "@/lib/contratos";
import { cop, nombreDe, pct } from "@/lib/formato";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/borrador";
import { useRequerirRol, useStore } from "@/lib/store";
import { pedir } from "@/lib/useContrato";
import { clientesAnteriores, crearContrato, proximosNumeros } from "@/server/contratos";
import type { ClienteContrato, ContratoNuevo, Datos, EquipoContrato, Usuario } from "@/lib/types";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const digitos = (s: string) => s.replace(/[^0-9]/g, "");
const ORD = ["1.ª", "2.ª", "3.ª", "4.ª", "5.ª", "6.ª", "7.ª", "8.ª", "9.ª", "10.ª", "11.ª", "12.ª"];

function inicial(): ContratoNuevo {
  const hoy = new Date();
  return {
    tipo: "acuerdo",
    forma: "cuotas",
    conIntereses: false,
    cliente: { trato: "sra", nombre: "", cc: "", exp: "", ciudad: "Yopal", dir: "", correo: "", cel: "" },
    equipo: { categoria: "celular", marca: "", modelo: "", color: "", capacidad: "", estado: "nuevo", serial: "" },
    capital: 0,
    nCuotas: 6,
    fechaPago: isoDia(sumarMeses(hoy, 1)),
    mesTasa: MESES[hoy.getMonth()],
    intereses: null,
    diasDevolucion: 30,
  };
}

export default function NuevoContratoPage() {
  const usuario = useRequerirRol(["staff", "admin"]);
  const datos = useStore();
  if (!usuario || !datos.listo) return null;
  return <Formulario datos={datos} usuario={usuario} volver={usuario.rol === "admin" ? "/admin/contratos" : "/calculadora"} />;
}

const SIN_JURA = { tradicion: false, hurto: false, bloqueo: false };

function Formulario({ datos, usuario, volver }: { datos: Datos; usuario: Usuario; volver: string }) {
  const router = useRouter();
  const main = useRef<HTMLElement>(null);
  // Solo se monta en el navegador (con la sesión cargada), así que puede leer el borrador al iniciar.
  const [recuperado] = useState(() => leerBorrador(usuario.id));
  const [paso, setPaso] = useState(recuperado?.paso ?? 1);
  const [d, setD] = useState(() => recuperado?.d ?? inicial());
  const [jura, setJura] = useState(recuperado?.jura ?? SIN_JURA);
  const [aviso, setAviso] = useState(!!recuperado);
  const [intentado, setIntentado] = useState(0); // último paso en el que se pulsó Continuar
  const [numeros, setNumeros] = useState<{ acuerdo: number; compraventa: number; anio: number } | null>(null);
  const [clientes, setClientes] = useState<ClienteContrato[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaEquipo, setBuscaEquipo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState("");

  useEffect(() => {
    proximosNumeros().then(setNumeros, () => {});
    clientesAnteriores().then(setClientes, () => {});
  }, []);
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [paso]);
  // Cada cambio queda guardado: si el navegador recarga la página al volver de otra app, nada se pierde.
  const conDatos = paso > 1 || !!d.cliente.nombre || !!d.capital;
  useEffect(() => {
    if (conDatos) guardarBorrador(usuario.id, { paso, d, jura });
  }, [conDatos, paso, d, jura, usuario.id]);

  function empezarDeNuevo() {
    borrarBorrador(usuario.id);
    setPaso(1);
    setD(inicial());
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

  const errores = erroresContrato(d, paso);
  const error = (k: string) => (intentado === paso ? errores[k] : undefined);
  const errorJura = compra && paso === 3 && intentado === 3 && !juraCompleta;

  const hoy = new Date();
  const tasa = datos.ajustes.tasa;
  const usura = datos.ajustes.usura;
  const plan = planDe(d, conInt ? tasa : 0, hoy);
  const total = plan.reduce((a, p) => a + p.valor, 0);
  const interesesAuto = interesesCalculados(d.capital, tasa, hoy, diaLocal(d.fechaPago));

  function continuar() {
    setIntentado(paso);
    if (Object.keys(errores).length || (compra && paso === 3 && !juraCompleta)) return;
    setPaso(paso + 1);
  }

  async function generar() {
    setIntentado(4);
    if (Object.keys(errores).length) return;
    setOcupado(true);
    setFallo("");
    try {
      const { contrato } = await pedir(crearContrato(d));
      borrarBorrador(usuario.id);
      router.push(`/contratos/${contrato.id}`);
    } catch (e) {
      setFallo((e as Error).message);
      setOcupado(false);
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

  const consecutivo = numeros ? `No. ${numeroCorto(d.tipo, numeros.anio, numeros[d.tipo])} del ${numeros.anio}` : "…";
  const capLetras = d.capital ? letras(d.capital) : "";

  const pie = (
    <>
      {fallo ? (
        <div className="callout text-danger-text" role="alert">
          {fallo}
        </div>
      ) : null}
      <div className="flex gap-3">
        {paso > 1 ? (
          <Button variant="secondary" size="lg" disabled={ocupado} onClick={() => setPaso(paso - 1)}>
            Atrás
          </Button>
        ) : null}
        {paso < 4 ? (
          <Button size="lg" pill className="flex-1" onClick={continuar}>
            Continuar
          </Button>
        ) : (
          <Button size="lg" pill className="flex-1" disabled={ocupado} onClick={generar}>
            {ocupado ? "Generando…" : "Generar contrato"}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <Marco
      volver={volver}
      titulo="Nuevo contrato"
      subtitulo={`Paso ${paso} de 4 · ${PASOS[paso - 1]}`}
      extra={
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={i <= paso ? "paso paso--on" : "paso"} />
          ))}
        </div>
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
              Se asignará el consecutivo <span className="data text-ink">{consecutivo}</span>
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
              hint={qc && !sugeridos.length ? "Sin coincidencias. Completa los datos para crear uno nuevo." : "O completa los datos para crear uno nuevo."}
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
          <TextField
            className="max-w-none"
            label="Ciudad de residencia"
            value={d.cliente.ciudad}
            onChange={(e) => cliente({ ciudad: e.target.value })}
            error={error("ciudad")}
          />
          <TextField
            className="max-w-none"
            label={compra ? "Dirección (obligatoria en compraventa)" : "Dirección (opcional)"}
            value={d.cliente.dir}
            onChange={(e) => cliente({ dir: e.target.value })}
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
                            categoria: cat.startsWith("cel") ? "celular" : cat.startsWith("tab") ? "tablet" : cat.startsWith("port") ? "portatil" : d.equipo.categoria,
                          });
                          if (acuerdo && !d.capital) cambiar({ capital: p.precio });
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
            <TextField className="max-w-none" label="Marca" value={d.equipo.marca} onChange={(e) => equipo({ marca: e.target.value })} error={error("marca")} />
            <TextField className="max-w-none" label="Modelo" value={d.equipo.modelo} onChange={(e) => equipo({ modelo: e.target.value })} error={error("modelo")} />
            <TextField className="max-w-none" label="Color" value={d.equipo.color} onChange={(e) => equipo({ color: e.target.value })} />
            <TextField className="max-w-none" label="Capacidad" value={d.equipo.capacidad} onChange={(e) => equipo({ capacidad: e.target.value })} />
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
            label={compra ? "Serial o IMEI (obligatorio)" : "Serial o IMEI"}
            value={d.equipo.serial}
            onChange={(e) => equipo({ serial: e.target.value })}
            error={error("serial")}
          />
          {compra ? (
            <section className="es-card flex flex-col gap-3">
              <div className="es-caption-label">El vendedor declara bajo juramento</div>
              <Toggle label="Compró el equipo en Esgode" checked={jura.tradicion} onChange={(v) => setJura({ ...jura, tradicion: v })} />
              <Toggle label="No está reportado como hurtado" checked={jura.hurto} onChange={(v) => setJura({ ...jura, hurto: v })} />
              <Toggle label="Sin bloqueos ni deuda con operadores" checked={jura.bloqueo} onChange={(v) => setJura({ ...jura, bloqueo: v })} />
              {errorJura ? (
                <div className="callout text-danger-text">
                  El contrato incluye las tres declaraciones. Si el vendedor no puede hacerlas, no se genera la compraventa.
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      {paso === 4 ? (
        <>
          <div className="flex flex-col gap-1.5">
            <TextField
              className="max-w-none"
              label={compra ? "Valor de compra" : "Capital"}
              placeholder="$ 0"
              inputMode="numeric"
              value={d.capital ? cop(d.capital) : ""}
              onChange={(e) => cambiar({ capital: Number(digitos(e.target.value).slice(0, 10)), intereses: null })}
              error={error("capital")}
            />
            {capLetras ? (
              <div className="callout text-ink-secondary">{capLetras.charAt(0).toUpperCase() + capLetras.slice(1)}</div>
            ) : null}
          </div>

          {cuotas ? (
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
                  ? "Las demás, el mismo día de cada mes."
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
                    Tasa del mes · {MESES[hoy.getMonth()]} {hoy.getFullYear()}
                  </div>
                  {usura != null ? (
                    tasa <= usura ? <Badge tone="success">Bajo la usura</Badge> : <Badge tone="danger">Sobre la usura</Badge>
                  ) : null}
                </div>
                <div className="title-2">{pct(tasa)} mensual</div>
                <div className="callout text-ink-secondary">
                  La define administración en Contratos › Ajustes y se usa para calcular las cuotas.
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
                  hint="Calculado con la tasa del mes. Puedes ajustarlo; se escribe tal cual en el contrato."
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
                    ? `${d.nCuotas} cuotas · ${conInt ? `${pct(tasa)} mensual` : "sin intereses"}`
                    : conInt
                      ? `${pct(tasa)} mensual`
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
              <span className="font-semibold text-ink">Fecha de firma:</span> hoy, {hoy.getDate()} de{" "}
              {MESES[hoy.getMonth()]} de {hoy.getFullYear()} · Yopal
            </div>
          </section>
        </>
      ) : null}
    </Marco>
  );
}
