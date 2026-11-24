// Valida la consistencia de los JSON de data/.
// Uso:  node scripts/validar-datos.mjs
import { readFile } from 'node:fs/promises';

const leer = async (n) => JSON.parse(await readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const [leyes, proyectos, conexiones, sitio] = await Promise.all(
  ['leyes', 'proyectos', 'conexiones', 'sitio'].map(leer)
);

const errores = [];
const avisos = [];
const err = (m) => errores.push(m);

const idsLey = new Set();
const idsProy = new Set();
const materias = new Set(sitio.materias.map((m) => m.id));

for (const l of leyes) {
  if (idsLey.has(l.id)) err(`Ley duplicada: ${l.id}`);
  idsLey.add(l.id);
  for (const c of ['nombre', 'nombre_corto', 'siglas', 'tipo', 'ambito', 'materia', 'resumen', 'estado_analisis']) {
    if (!l[c]) err(`Ley ${l.id}: falta «${c}»`);
  }
  if (l.materia && !materias.has(l.materia)) err(`Ley ${l.id}: materia desconocida «${l.materia}»`);
  if (!Array.isArray(l.analizada_por) || !l.analizada_por.length) err(`Ley ${l.id}: falta «analizada_por»`);
  if (!Array.isArray(l.articulos)) err(`Ley ${l.id}: «articulos» debe ser un arreglo`);
}

for (const p of proyectos) {
  if (idsProy.has(p.id)) err(`Proyecto duplicado: ${p.id}`);
  idsProy.add(p.id);
  for (const c of ['nombre', 'nombre_corto', 'siglas', 'alumno', 'descripcion', 'color']) {
    if (!p[c]) err(`Proyecto ${p.id}: falta «${c}»`);
  }
  if (!(p.color >= 1 && p.color <= 8)) err(`Proyecto ${p.id}: «color» debe ser un número de 1 a 8`);
}

const vistos = new Set();
const idsCon = new Set();
for (const c of conexiones) {
  if (idsCon.has(c.id)) err(`Conexión duplicada: ${c.id}`);
  idsCon.add(c.id);
  const par = `${c.ley}→${c.proyecto}`;
  if (vistos.has(par)) err(`Conexión repetida ${par} (${c.id})`);
  vistos.add(par);
  if (!idsLey.has(c.ley)) err(`${c.id}: ley inexistente «${c.ley}»`);
  if (!idsProy.has(c.proyecto)) err(`${c.id}: proyecto inexistente «${c.proyecto}»`);
  if (!['alta', 'media', 'baja'].includes(c.relevancia)) err(`${c.id}: relevancia inválida «${c.relevancia}»`);
  if (!['documentada', 'cruce'].includes(c.tipo)) err(`${c.id}: tipo inválido «${c.tipo}»`);
  if (typeof c.revisar !== 'boolean') err(`${c.id}: «revisar» debe ser true o false`);
  if (c.tipo === 'cruce' && !c.revisar) err(`${c.id}: un cruce siempre debe llevar revisar:true`);
  if (c.revisar && !c.nota_revision) avisos.push(`${c.id}: revisar:true sin «nota_revision»`);
  if (!c.porque || c.porque.length < 40) err(`${c.id}: «porque» muy corto o vacío`);
  if (!Array.isArray(c.articulos_citados)) { err(`${c.id}: «articulos_citados» debe ser un arreglo`); continue; }
  const ley = leyes.find((l) => l.id === c.ley);
  if (ley) {
    const refs = new Set(ley.articulos.map((a) => a.ref));
    for (const a of c.articulos_citados) {
      if (!refs.has(a)) err(`${c.id}: el artículo «${a}» no existe en los artículos de ${c.ley}`);
    }
  }
}

for (const l of leyes) {
  const n = conexiones.filter((c) => c.ley === l.id).length;
  if (n === 0 && l.estado_analisis !== 'mencionada') avisos.push(`La ley ${l.id} no tiene conexiones`);
}
for (const p of proyectos) {
  if (!conexiones.some((c) => c.proyecto === p.id)) avisos.push(`El proyecto ${p.id} no tiene conexiones`);
}

console.log(`Leyes: ${leyes.length} · Proyectos: ${proyectos.length} · Conexiones: ${conexiones.length}`);
console.log(`  documentadas: ${conexiones.filter((c) => c.tipo === 'documentada').length} · cruces: ${conexiones.filter((c) => c.tipo === 'cruce').length} · por revisar: ${conexiones.filter((c) => c.revisar).length}`);
avisos.forEach((a) => console.log('AVISO ', a));
if (errores.length) {
  errores.forEach((e) => console.log('ERROR ', e));
  process.exit(1);
}
console.log('Datos válidos ✔');
