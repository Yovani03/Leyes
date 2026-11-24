// Carga los JSON de data/ y construye los índices que usan todas las vistas.
import { REL } from './utils.js';

export const store = {};

const ARCHIVOS = ['sitio', 'leyes', 'proyectos', 'conexiones'];

export async function loadData() {
  const [sitio, leyes, proyectos, conexiones] = await Promise.all(
    ARCHIVOS.map(async (n) => {
      const r = await fetch(`data/${n}.json`);
      if (!r.ok) throw new Error(`No se pudo leer data/${n}.json (${r.status})`);
      return r.json();
    })
  );

  Object.assign(store, { sitio, leyes, proyectos, conexiones });
  store.ley = new Map(leyes.map((l) => [l.id, l]));
  store.proy = new Map(proyectos.map((p) => [p.id, p]));
  store.materia = new Map(sitio.materias.map((m) => [m.id, m]));
  store.proyIndex = new Map(proyectos.map((p, i) => [p.id, i]));

  store.porLey = new Map(leyes.map((l) => [l.id, []]));
  store.porProy = new Map(proyectos.map((p) => [p.id, []]));
  const orden = (a, b) => REL[b.relevancia] - REL[a.relevancia] || Number(a.revisar) - Number(b.revisar);
  for (const c of conexiones) {
    store.porLey.get(c.ley)?.push(c);
    store.porProy.get(c.proyecto)?.push(c);
  }
  store.porLey.forEach((a) => a.sort((x, y) => orden(x, y) || store.proyIndex.get(x.proyecto) - store.proyIndex.get(y.proyecto)));
  store.porProy.forEach((a) => a.sort((x, y) => orden(x, y) || store.ley.get(x.ley).nombre_corto.localeCompare(store.ley.get(y.ley).nombre_corto, 'es')));

  // Interruptor en data/sitio.json: false oculta todo lo "por revisar" sin borrar los datos.
  store.revisar = sitio.mostrar_por_revisar !== false;

  store.stats = {
    cruces: conexiones.filter((c) => c.tipo === 'cruce').length,
    leyes: leyes.length,
    proyectos: proyectos.length,
    conexiones: conexiones.length,
    revisar: conexiones.filter((c) => c.revisar).length,
    documentadas: conexiones.filter((c) => c.tipo === 'documentada').length,
  };
  return store;
}

// Relevancia más alta entre varias conexiones (o null si no hay).
export function maxRel(cons) {
  let best = null;
  for (const c of cons) if (!best || REL[c.relevancia] > REL[best]) best = c.relevancia;
  return best;
}

// Entradas de artículos de una ley que corresponden a las referencias citadas.
export function articulosDe(ley, refs) {
  const out = [];
  for (const ref of refs) {
    const hallados = ley.articulos.filter((a) => a.ref === ref);
    if (hallados.length) out.push(...hallados);
    else out.push({ ref, resumen: null, fuente: null });
  }
  return out;
}

// Leyes con al menos una conexión, ordenadas para que las líneas del mapa se crucen poco
// (por el promedio de la posición de los proyectos con los que se conectan).
export function leyesOrdenadas(conexiones = store.conexiones) {
  const pos = new Map();
  for (const c of conexiones) {
    const arr = pos.get(c.ley) || [];
    arr.push(store.proyIndex.get(c.proyecto));
    pos.set(c.ley, arr);
  }
  return [...pos.entries()]
    .map(([id, arr]) => ({ ley: store.ley.get(id), media: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => a.media - b.media || a.ley.nombre_corto.localeCompare(b.ley.nombre_corto, 'es'))
    .map((x) => x.ley);
}
