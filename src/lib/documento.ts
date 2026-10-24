import {
  ACREEDOR,
  MESES,
  diaLocal,
  interesesCalculados,
  letras,
  palabras,
  plantillaDe,
  sumarMeses,
  titulo,
  valoresCuotas,
} from "./contratos";
import type { Contrato, EquipoContrato } from "./types";

// Texto de las plantillas originales (Word de Esgode), sin cambios: solo se
// reemplazan los datos del formulario. Incluye tildes y espacios dobles tal
// como están en los originales.

export interface Segmento {
  t: string;
  b?: boolean;
}

export type Bloque =
  | { tipo: "titulo"; lineas: string[]; cv: boolean }
  | { tipo: "h"; texto: string }
  | { tipo: "p"; segs: Segmento[] }
  | { tipo: "li"; num: string; segs: Segmento[] }
  | {
      tipo: "firmas";
      lblA: string;
      lblB: string;
      nombreB: string;
      ccB: string;
      ccNegrita: boolean;
      huellaArriba: boolean;
      huellaLbl: string;
    };

const S = (t: string): Segmento => ({ t });
const B = (t: string): Segmento => ({ t, b: true });

const cop = (n: number) => "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n));

function partes(d: Date) {
  return { d: String(d.getDate()).padStart(2, "0"), m: MESES[d.getMonth()].toUpperCase(), y: String(d.getFullYear()) };
}

const ESTADO_EQUIPO: Record<EquipoContrato["estado"], string> = { nuevo: "NUEVO", seminuevo: "SEMINUEVO", usado: "USADO" };
const TIPO_CV: Record<EquipoContrato["categoria"], string> = {
  celular: "teléfono celular",
  tablet: "tablet",
  portatil: "equipo portátil",
  otro: "equipo",
};

const ORD = ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Séptima", "Octava", "Novena", "Décima", "Undécima", "Duodécima"];

export function bloquesDocumento(c: Contrato): Bloque[] {
  const plantilla = plantillaDe(c);
  const firma = new Date(c.creadoEn);
  const F = partes(firma);
  const N = c.cliente.nombre.trim().toUpperCase();
  const EGD = ACREEDOR.nombre;
  const CCA = ACREEDOR.cc;
  const num = c.tipo === "compraventa" ? `${String(c.anio).slice(2)}-${String(c.numero).padStart(2, "0")}` : String(c.numero).padStart(3, "0");
  const q = c.equipo;
  const equipo = [q.modelo, q.color, q.capacidad].filter((x) => x.trim()).join(", ").toUpperCase() + ` (${ESTADO_EQUIPO[q.estado]})`;
  const ciudad = c.cliente.ciudad.trim();
  const capLetras = titulo(letras(c.capital));
  const cuantas = (n: number) => palabras(n).toUpperCase() + " (" + String(n).padStart(2, "0") + ")";
  const mayus = (n: number) => letras(n).toUpperCase().replace(/ PESOS$/, "");
  const mesTasa = c.mesTasa.trim() || MESES[firma.getMonth()];

  const bloques: Bloque[] = [];
  const P = (segs: Segmento[]) => bloques.push({ tipo: "p", segs });
  const LI = (n: string, segs: Segmento[]) => bloques.push({ tipo: "li", num: n, segs });
  const H = (texto: string) => bloques.push({ tipo: "h", texto });
  const TIT = (lineas: string[], cv = false) => bloques.push({ tipo: "titulo", lineas, cv });
  const notificaciones = (inicio: Segmento[]) =>
    P([...inicio, S(" manifiesta que autoriza recibir notificaciones al correo electrónico "), B(c.cliente.correo.trim()), S(" y al número celular " + c.cliente.cel.replace(/\D/g, "") + ".")]);
  const constancia = (mes: string) =>
    P([S(`En constancia y compromiso de los intervinientes se firma este acuerdo de pago de obligatorio cumplimiento el día ${F.d} del mes de ${mes} del año ${F.y} en la ciudad de Yopal, Casanare.`)]);
  const entre = (cierre: string) => [
    S("Entre los suscritos, "), B(EGD), S(` identificado con cedula No ${CCA}, y el señor (a) `), B(N),
    S(`, identificado con cedula de ciudadanía No ${c.cliente.cc} de ${c.cliente.exp}, domiciliado (a) y residente en la ciudad de `), B(ciudad.toUpperCase()),
    S(", hemos convenido el siguiente "), B("ACUERDO DE PAGO"), S(", con relación al crédito de un "), B(equipo + " "),
    S("que el señor "), B(N), S(cierre), B(EGD + ":"),
  ];
  const mora = (que: string) =>
    LI(plantilla.endsWith("con") ? "3." : "2.", [S(`Interés Moratorio, en caso de mora en el pago ${que}, el señor (a) `), B(N), S(", deberá pagar a "), B(EGD), S(" los intereses moratorios liquidados con la tasa máxima del interés moratorio autorizado por la Superintendencia Financiera de Colombia para el tiempo en que se genere la mora.")]);

  if (plantilla === "unico-sin" || plantilla === "unico-con") {
    const pago = diaLocal(c.fechaPago);
    const p = partes(pago);
    const con = plantilla === "unico-con";
    TIT([`ACUERDO DE PAGO No. ${num} DEL ${F.y} SUSCRITO ENTRE`, `${N} Y ${EGD}`]);
    P(entre(con ? " tiene para con el señor  " : " tiene para con el señor "));
    LI("1.", [S("El capital es la suma de "), B(`${capLetras} MLCTE (${cop(c.capital)})`)]);
    if (con)
      LI("2.", [S("Respecto del capital se liquidarán de manera mensual los intereses corrientes o de plazo que el señor "), B(N), S(", pagará a "), B(EGD), S(` identificado con cedula No ${CCA}, a la tasa máxima del interés bancario corriente autorizado para modalidad Consumo y Ordinario por la Superintendencia Financiera de Colombia para el mes de ${mesTasa.toUpperCase()}.`)]);
    mora("de los intereses corrientes o el capital");
    H("PAGO:");
    if (con) {
      P([S("Para el pago del capital el señor (a) "), B(N), S(`, identificado con cédula de ciudadanía No ${c.cliente.cc}, se compromete a PAGAR en la ciudad de Yopal esta suma de dinero en EFECTIVO el día ${p.d} del mes ${p.m} del año ${p.y}, al señor `), B(EGD), S(` identificado con cedula No ${CCA}, en la Carrera 22 # 09 – 34 Esgode Tech Store.`)]);
      const intereses = c.intereses ?? interesesCalculados(c.capital, c.tasa, firma, pago);
      P([S(`Los intereses corrientes o de plazo se liquidarán de manera mensual y se pagaran el mismo día que se paga el capital esto es el día ${p.d} del mes de ${p.m} del año ${p.y}, para un total de ${mayus(intereses)} PESOS ML/CTE (${cop(intereses)}) por concepto de intereses de plazo o corrientes.`)]);
    } else {
      P([S("Para el pago del capital el señor (a) "), B(N), S(`, identificado con cédula de ciudadanía No ${c.cliente.cc}, se compromete a PAGAR en la ciudad de Yopal esta suma de dinero en `), B("EFECTIVO "), S(`el día ${p.d} del mes ${p.m} del año ${p.y}, al señor `), B(EGD), S(` identificado con cedula No ${CCA}, en la Carrera 22 # 09 – 34 Esgode Tech Store.`)]);
    }
    notificaciones([S("El señor (a) "), B(N)]);
    constancia(F.m);
  }

  if (plantilla === "cuotas-sin") {
    TIT([`ACUERDO DE PAGO No. ${num} DEL ${F.y} SUSCRITO`, `ENTRE ${N} Y ${EGD}`]);
    P(entre(" tiene para con el señor "));
    LI("1.", [S("El capital es la suma de "), B(`${capLetras} MLCTE (${cop(c.capital)})`)]);
    mora("del capital");
    H("PAGO:");
    P([S("Para el pago del capital "), B(`${capLetras} MLCTE (${cop(c.capital)}) `), S("el señor (a) "), B(N), S(` identificado con cedula de ciudadanía No ${c.cliente.cc}, se compromete a `), B("PAGAR"), S(" al señor "), B(EGD), S(` identificado con cedula No ${CCA}, en la ciudad de Yopal en la carrera 22 No 09-34 Esgode Tech Store esta suma de dinero en `), B("EFECTIVO"), S(" en "), B(cuantas(c.nCuotas) + " CUOTAS "), S("así:")]);
    valoresCuotas(c.capital, c.nCuotas, c.tasa, false).forEach((v, i) => {
      const f = partes(sumarMeses(diaLocal(c.fechaPago), i));
      P([B(ORD[i] + " cuota: "), S(`El día ${f.d} del mes ${f.m} del año ${f.y} por valor de ${mayus(v)} PESOS MLCTE (${cop(v)}).`)]);
    });
    P([B("CLAUSULA ACELERATORIA"), S(`: El señor ${EGD} acreedor podrá declarar vencidos la totalidad de los plazos de esta obligación o de las cuotas que constituyan el saldo de lo debido y exigir su pago inmediato ya sea judicial o extrajudicialmente, cuando el deudor entre en mora o incumpla uno de los pagos derivados del presente documento.`)]);
    notificaciones([S("El señor (a) "), B(N), S(",")]);
    constancia(F.m);
  }

  if (plantilla === "cuotas-con") {
    const T = c.cliente.trato === "sra" ? "la señora" : "el señor";
    const Tc = T.charAt(0).toUpperCase() + T.slice(1);
    TIT([`ACUERDO DE PAGO No. ${num} DEL ${F.y} SUSCRITO ENTRE`, `${N} Y ${EGD}`]);
    P([S("Entre los suscritos, "), B(EGD), S(` identificado con cedula No ${CCA}, y ${T} `), B(N + ","), S(` identificado con cedula de ciudadanía No ${c.cliente.cc} de ${c.cliente.exp}, domiciliado (a) y residente en la ciudad de ${ciudad}, Casanare hemos convenido el siguiente `), B("ACUERDO DE PAGO"), S(", con relación al crédito de un "), B(equipo), S(`, que ${T} `), B(N), S(" tiene para con el señor  "), B(EGD + ":")]);
    LI("1.", [S("El capital es la suma de "), B(`${capLetras} MLCTE `), S(`(${cop(c.capital)})`)]);
    LI("2.", [S(`Respecto del capital se liquidarán de manera mensual los intereses corrientes o de plazo que ${T} `), B(N), S(" pagará a "), B(EGD), S(` identificado con cedula No ${CCA}, a la tasa máxima del interés bancario corriente autorizado para modalidad Consumo y Ordinario por la Superintendencia Financiera de Colombia para el mes de ${mesTasa.toLowerCase()}`)]);
    LI("3.", [S(`Interés Moratorio, en caso de mora en el pago de los intereses corrientes o el capital, ${T} `), B(N), S(", deberá pagar a "), B(EGD), S(" los intereses moratorios liquidados con la tasa máxima del interés moratorio autorizado por la Superintendencia Financiera de Colombia para el tiempo en que se genere la mora.")]);
    H("PAGO:");
    P([S(`Para el pago del capital y de los intereses corrientes ${T} `), B(N), S(` identificado con cedula de ciudadanía No ${c.cliente.cc}, se compromete a PAGAR en la ciudad de Yopal esta suma de dinero descrita en el numeral 1 en EFECTIVO al señor `), B(EGD), S(` identificado con cedula No ${CCA} en la carrera 22 No 09-34 Esgode Tech Store, en `), B(cuantas(c.nCuotas)), S(" cuotas que incluyen el capital y el interés corriente así:")]);
    valoresCuotas(c.capital, c.nCuotas, c.tasa, true).forEach((v, i) => {
      const f = partes(sumarMeses(diaLocal(c.fechaPago), i));
      P([B(ORD[i] + " cuota: "), S(`el día ${f.d} del mes ${f.m} del año ${f.y} por valor de ${mayus(v)} PESOS MLCTE (${cop(v)}).`)]);
    });
    P([B("CLAUSULA ACELERATORIA:"), S(" El señor "), B(EGD), S(" acreedor podrá declarar vencidos la totalidad de los plazos de esta obligación o de las cuotas que constituyan el saldo de lo debido y exigir su pago inmediato ya sea judicial o extrajudicialmente, cuando el deudor entre en mora o incumpla uno de los pagos derivados del presente documento.")]);
    notificaciones([S(Tc + " "), B(N)]);
    constancia(F.m.toLowerCase());
  }

  if (plantilla !== "compraventa") {
    bloques.push({ tipo: "firmas", lblA: "ACEPTO (ACREEDOR)", lblB: "ACEPTO (DEUDOR)", nombreB: N, ccB: `${c.cliente.cc} de ${c.cliente.exp}`, ccNegrita: false, huellaArriba: false, huellaLbl: "HUELLA DEUDOR" });
    return bloques;
  }

  // Compraventa
  const Tart = c.cliente.trato === "sra" ? "la señora" : "el señor";
  const T = Tart.replace(/^(la|el) /, "");
  const Tc = Tart.charAt(0).toUpperCase() + Tart.slice(1);
  const EG = "ESMER GÓMEZ DELGADO";
  const tipoEq = TIPO_CV[q.categoria];
  const campos: [string, string][] = [
    ["MARCA", q.marca],
    ["MODELO", q.modelo],
    ["COLOR", q.color],
    ["SERIAL No.", q.serial],
    ["CAPACIDAD", q.capacidad],
  ];
  const objeto = campos
    .filter(([, v]) => v.trim())
    .flatMap(([k, v], i) => [S((i ? " " : "") + k + " "), B(v.trim().toUpperCase())]);
  const corto = [q.marca, q.modelo, q.color].filter((x) => x.trim()).join(" ").toUpperCase();
  const dias = c.diasDevolucion ?? 30;
  TIT(["CONTRATO DE COMPRAVENTA CELULAR", `No. ${num} DEL ${F.y} SUSCRITO ENTRE ${N} Y ${EG}`], true);
  P([
    S("Entre los suscritos, "), B(EG), S(` identificado con cedula No ${CCA} en calidad de COMPRADOR y ${Tart} `), B(N), S(", identificada con cedula de ciudadanía No "), B(c.cliente.cc), S(" de "), B(c.cliente.exp), S(", domiciliado y residente en la ciudad de "), B(ciudad), S(" en la "), B(c.cliente.dir.trim() + ","), S(" en calidad de VENDEDOR, hemos convenido suscribir el siguiente CONTRATO DE COMPRAVENTA de teléfono móvil el cual se regirá por las siguientes clausulas: "),
    B("PRIMERA: OBJETO: "), S("El VENDEDOR entrega a título de venta a "), B(EG), S(` el ${tipoEq} `),
    ...objeto,
    S(". "), B("SEGUNDA: "), S(`VALOR: El valor de la COMPRAVENTA es de ${letras(c.capital).toUpperCase()} COLOMBIANOS `), B(`(${cop(c.capital)} COP`), S("). "),
    B("TERCERA: TRADICION"), S(`: el VENDEDOR ${T} `), B(N), S(" manifiesta bajo la gravedad de juramento que adquirió el teléfono móvil que entrega en venta por compra a "), B("tiendas esgode"), S(" en la ciudad de "), B("Yopal, Colombia"), S(". "),
    B("CUARTA: SANEAMIENTO"), S(": El VENDEDOR declara bajo la gravedad de juramento que el equipo entregado en venta al señor "), B("ESMER GÓMEZ"), S(", está exento de todo bloqueo, daño en su software, fallas de fábrica, hurto, y que NO lo está pagando a cuotas a ningún operador nacional o internacional. "), B("Parágrafo:"), S(` en caso de que posterior a la entrega al COMPRADOR el celular sea bloqueado por hurto, o tenga algún bloqueo administrativo de fábrica o por algún operador nacional o internacional como consecuencia de su no pago o hurto, esto dará lugar a DENUNCIA PENAL POR EL PRESUNTO PUNIBLE DE ESTAFA ante la FISCALIA GENERAL DE LA NACIÒN, toda vez que ${Tart} `), B(N), S(" está declarando su procedencia bajo la gravedad de juramento. "),
    B("QUINTA: ENTREGA –"), S(` ${Tc} `), B(N), S(` hace entrega a la firma de este contrato del ${tipoEq} `), B(corto), S(" al señor ESMER GÓMEZ quien manifiesta recibir. "), B("Parágrafo Primero:"), S(` el señor ESMER GÓMEZ tendrá ${dias} días siguientes a la firma de este contrato para solicitar la devolución del dinero al VENDEDOR en caso de que el equipo presente algún tipo de falla. `), B("Parágrafo Segundo:"), S(" En caso de que el VENDEDOR no realice la devolución del dinero objeto de la VENTA al señor ESMER GÓMEZ, dentro de los cinco días siguientes al requerimiento escrito realizado y enviado dentro del término del parágrafo primero por el SEÑOR Gómez Delgado al correo electrónico que autoriza el VENDEDOR en la cláusula sexta, este documento servirá de título base de ejecución para que el COMPRADOR cobre vía judicial a través de un proceso ejecutivo la suma de dinero contenida en la Cláusula Segunda de este contrato. "),
    B("SEXTA: NOTIFICACIONES"), S(": El VENDEDOR, manifiesta que autoriza recibir notificaciones al correo electrónico "), B(c.cliente.correo.trim()), S(" y al número celular "), B(c.cliente.cel.replace(/\D/g, "") + "."),
  ]);
  P([S(`En constancia y compromiso de los intervinientes se firma este contrato el día ${F.d} del mes de ${F.m} del año ${F.y} en la ciudad de Yopal, Casanare.`)]);
  bloques.push({ tipo: "firmas", lblA: "COMPRADOR", lblB: "VENDEDOR", nombreB: N, ccB: `${c.cliente.cc} DE ${c.cliente.exp.toUpperCase()}`, ccNegrita: true, huellaArriba: true, huellaLbl: "" });
  return bloques;
}

/* ---------- Paginación ---------- */
// Estimación del alto de cada bloque con el ancho aproximado de Arial 10 pt
// sobre 635 px (Arial Narrow 11 pt en la compraventa). Un título de sección y
// el párrafo antes de las firmas nunca quedan solos al final de una página.

function anchoLetra(ch: string, negrita: boolean): number {
  let w: number;
  if (ch === " ") w = 3.7;
  else if (/[A-ZÁÉÍÓÚÑÒ]/.test(ch)) w = /[MW]/.test(ch) ? 11.1 : /[IJ]/.test(ch) ? 4.4 : 8.9;
  else if (/[0-9$]/.test(ch)) w = 7.4;
  else if (/[iljtf.,;:'()·–-]/.test(ch)) w = 3.4;
  else if (/[mw]/.test(ch)) w = 10.4;
  else w = 7.0;
  return negrita ? w * 1.08 : w;
}

export function paginar(bloques: Bloque[], compraventa: boolean): Bloque[][] {
  const angosta = compraventa ? 0.82 * 1.1 : 1;
  const lineas = (segs: Segmento[], ancho: number) => {
    let n = 1;
    let x = 0;
    for (const sg of segs) {
      for (const w of sg.t.split(/(\s+)/)) {
        if (!w) continue;
        const ww = [...w].reduce((a, ch) => a + anchoLetra(ch, !!sg.b), 0) * angosta;
        if (/^\s+$/.test(w)) x += ww;
        else if (x + ww > ancho && x > 0) {
          n++;
          x = ww;
        } else x += ww;
      }
    }
    return n;
  };
  const alto = (b: Bloque) => {
    if (b.tipo === "firmas") return 170;
    if (b.tipo === "titulo") return compraventa ? 14 + 3 * 22 : 22 + b.lineas.length * 22;
    if (b.tipo === "h") return 37;
    if (compraventa) return lineas(b.segs, 648) * 16.9 + 12;
    return lineas(b.segs, b.tipo === "li" ? 609 : 635) * 18.4 + (b.tipo === "li" ? 10 : 12);
  };
  const firmas = bloques.findIndex((b) => b.tipo === "firmas");
  const unido = bloques.map((b, i) => b.tipo === "h" || i === firmas - 1);
  const cadena = (i: number) => {
    let h = 0;
    for (let j = i; j < bloques.length; j++) {
      h += alto(bloques[j]);
      if (!unido[j]) break;
    }
    return h;
  };
  const util = compraventa ? 1056 - 40 - 56 : 1056 - 150 - 104;
  const paginas: Bloque[][] = [[]];
  let usado = 0;
  bloques.forEach((b, i) => {
    const empieza = !(i > 0 && unido[i - 1]);
    const necesita = empieza ? cadena(i) : alto(b);
    if (empieza && usado + necesita > util && paginas[paginas.length - 1].length) {
      paginas.push([]);
      usado = 0;
    }
    paginas[paginas.length - 1].push(b);
    usado += alto(b);
  });
  return paginas;
}

/** Encabezado de la esquina, como en los Word originales. */
export function encabezado(c: Contrato): { lineas: string[]; version: string } {
  const p = plantillaDe(c);
  const lineas = {
    "cuotas-sin": ["ACUERDO DE PAGO", "A CUOTAS", "SIN INTERESES CORRIENTES"],
    "cuotas-con": ["ACUERDO DE PAGO", "A CUOTAS", "CON INTERESES CORRIENTES"],
    "unico-sin": ["ACUERDO DE PAGO", "A UN SOLO PAGO", "SIN INTERESES CORRIENTES"],
    "unico-con": ["ACUERDO DE PAGO", "A UN SOLO PAGO", "CON INTERESES CORRIENTES"],
    compraventa: [],
  }[p];
  return { lineas, version: p === "cuotas-con" ? "V.01/SEP23" : "" };
}
