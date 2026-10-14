// Funciones de noticias (servidor): leen el portal del Estado (gob.pe), dejan solo lo
// relacionado a lluvias, inundaciones y El Niño, y lo entregan a la página.
// El navegador no puede leer gob.pe directamente, por eso esto corre en un servidor:
//   · en local, dentro del servidor de Vite (ver vite.config.ts);
//   · en AWS, como función Lambda detrás de API Gateway (ver `handler` al final).
//
// Rutas:  GET /noticias          → lista de noticias
//         GET /nota?url=<gob.pe> → párrafos de una nota

export interface NoticiaOficial {
  id: string;
  title: string;
  date: string;
  source: string;
  summary: string;
  imageUrl: string;
  regionTag: string;
  url: string;
}

interface NoticiaGobPe {
  title: string;
  description: string;
  url: string;
  image: string;
  date: string;
}

// gob.pe solo entrega las notas más recientes de cada institución,
// por eso se consultan varias entidades del Estado vinculadas al tema
const FUENTES = [
  { slug: 'senamhi', sigla: 'SENAMHI', nombre: 'SENAMHI · Servicio Nacional de Meteorología e Hidrología' },
  { slug: 'indeci', sigla: 'INDECI', nombre: 'INDECI · Instituto Nacional de Defensa Civil' },
  { slug: 'cenepred', sigla: 'CENEPRED', nombre: 'CENEPRED · Centro Nacional de Prevención de Desastres' },
  { slug: 'ana', sigla: 'ANA', nombre: 'ANA · Autoridad Nacional del Agua' },
  { slug: 'anin', sigla: 'ANIN', nombre: 'ANIN · Autoridad Nacional de Infraestructura' },
  { slug: 'igp', sigla: 'IGP', nombre: 'IGP · Instituto Geofísico del Perú' },
  { slug: 'ingemmet', sigla: 'INGEMMET', nombre: 'INGEMMET · Instituto Geológico, Minero y Metalúrgico' },
  { slug: 'minam', sigla: 'MINAM', nombre: 'MINAM · Ministerio del Ambiente' },
  { slug: 'midagri', sigla: 'MIDAGRI', nombre: 'MIDAGRI · Ministerio de Desarrollo Agrario y Riego' },
  { slug: 'mindef', sigla: 'MINDEF', nombre: 'MINDEF · Ministerio de Defensa' },
];

const CACHE_MS = 20 * 60 * 1000;

// Solo lluvias, inundaciones y Fenómeno El Niño
const TEMAS =
  /lluvia|inundaci|huaico|desborde|el ni[ñn]o|crecida|quebrada|precipitaci|caudal|deslizamiento|tormenta/i;

let cache: { hora: number; noticias: NoticiaOficial[] } | null = null;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

// "3 de octubre de 2026" → número comparable (gob.pe escribe "setiembre" o "septiembre")
const fechaComparable = (fecha: string) => {
  const m = fecha.toLowerCase().replace('septiembre', 'setiembre').match(/(\d+) de (\w+) de (\d+)/);
  return m ? Number(m[3]) * 10000 + (MESES.indexOf(m[2]) + 1) * 100 + Number(m[1]) : 0;
};

// El número al inicio del enlace crece con cada publicación: sirve de id y para ordenar
const numeroDeNota = (url: string) => Number(url.match(/noticias\/(\d+)/)?.[1] ?? 0);

async function leerFuente(slug: string): Promise<NoticiaGobPe[]> {
  const res = await fetch(`https://www.gob.pe/institucion/${slug}/noticias.json`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Gotita; alerta temprana)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`gob.pe respondió ${res.status} para ${slug}`);
  return (await res.json()) as NoticiaGobPe[];
}

export async function obtenerNoticias(): Promise<NoticiaOficial[]> {
  if (cache && Date.now() - cache.hora < CACHE_MS) return cache.noticias;

  // Si una institución no responde, se continúa con las demás
  const porFuente = await Promise.all(
    FUENTES.map(async (fuente) => {
      const notas = await leerFuente(fuente.slug).catch(() => [] as NoticiaGobPe[]);
      return notas
        .filter((n) => TEMAS.test(`${n.title} ${n.description}`))
        .map<NoticiaOficial>((n) => ({
          id: `${fuente.slug}-${numeroDeNota(n.url)}`,
          title: n.title.trim(),
          date: n.date.trim(),
          source: fuente.nombre,
          summary: n.description.trim(),
          imageUrl: n.image,
          regionTag: fuente.sigla,
          url: n.url,
        }));
    })
  );

  const vistas = new Set<string>();
  const noticias = porFuente
    .flat()
    .filter((n) => (vistas.has(n.id) ? false : (vistas.add(n.id), true)))
    .sort(
      (a, b) =>
        fechaComparable(b.date) - fechaComparable(a.date) || numeroDeNota(b.url) - numeroDeNota(a.url)
    );

  if (noticias.length === 0) throw new Error('gob.pe no devolvió noticias');

  cache = { hora: Date.now(), noticias };
  return noticias;
}

// ---------------------------------------------------------------------------
// Texto completo de una nota: se lee la página de gob.pe y se extrae su cuerpo
// ---------------------------------------------------------------------------

const cacheNotas = new Map<string, string[]>();

const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

const decodificar = (texto: string) =>
  texto
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, nombre) => ENTIDADES[nombre.toLowerCase()] ?? m);

// Devuelve el contenido del <div> que empieza en `inicio`, respetando los div anidados
const contenidoDelDiv = (html: string, inicio: number) => {
  const apertura = html.indexOf('>', inicio) + 1;
  const etiqueta = /<\/?div\b[^>]*>/gi;
  etiqueta.lastIndex = apertura;
  let nivel = 1;
  for (let m = etiqueta.exec(html); m; m = etiqueta.exec(html)) {
    nivel += m[0][1] === '/' ? -1 : 1;
    if (nivel === 0) return html.slice(apertura, m.index);
  }
  return html.slice(apertura);
};

export const esNotaDeGobPe = (url: string) => /^https:\/\/www\.gob\.pe\/institucion\/[\w-]+\/noticias\/\d+/.test(url);

export async function obtenerNota(url: string): Promise<string[]> {
  if (!esNotaDeGobPe(url)) throw new Error('Solo se aceptan notas de gob.pe');
  const guardada = cacheNotas.get(url);
  if (guardada) return guardada;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Gotita; alerta temprana)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`gob.pe respondió ${res.status}`);
  const html = await res.text();

  const inicio = html.search(/<div[^>]+class="[^"]*feed-content[^"]*"/);
  if (inicio < 0) throw new Error('No se encontró el cuerpo de la nota');

  const parrafos = contenidoDelDiv(html, inicio)
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((linea) => decodificar(linea).replace(/\s+/g, ' ').trim())
    .filter((linea) => linea.length > 0);

  cacheNotas.set(url, parrafos);
  return parrafos;
}

// ---------------------------------------------------------------------------
// Respuesta común para el servidor local y para AWS Lambda
// ---------------------------------------------------------------------------

export async function responder(ruta: string, url?: string | null): Promise<{ status: number; body: string }> {
  try {
    if (ruta.endsWith('/noticias')) return { status: 200, body: JSON.stringify(await obtenerNoticias()) };
    if (ruta.endsWith('/nota')) return { status: 200, body: JSON.stringify({ parrafos: await obtenerNota(url ?? '') }) };
    return { status: 404, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
  } catch (error) {
    return { status: 502, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
  }
}

// Punto de entrada para AWS Lambda (API Gateway, HTTP API)
export const handler = async (event: {
  rawPath?: string;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
}) => {
  const { status, body } = await responder(event.rawPath ?? event.path ?? '', event.queryStringParameters?.url);
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    body,
  };
};
