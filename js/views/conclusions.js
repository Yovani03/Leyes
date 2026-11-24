// Conclusiones: qué leyes aplican a más proyectos y qué proyectos tienen más obligaciones legales.
import { store } from '../store.js';
import { esc, RELS, REL, cap, plural } from '../utils.js';
import { icon } from '../icons.js';

function datos() {
  const leyes = store.leyes
    .map((l) => {
      const c = store.porLey.get(l.id);
      return { l, total: c.length, doc: c.filter((x) => x.tipo === 'documentada').length, cruce: c.filter((x) => x.tipo === 'cruce').length, alta: c.filter((x) => x.relevancia === 'alta').length, rev: c.filter((x) => x.revisar).length };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total || b.alta - a.alta || a.l.nombre_corto.localeCompare(b.l.nombre_corto, 'es'));

  const proys = store.proyectos
    .map((p) => {
      const c = store.porProy.get(p.id);
      const por = (r) => c.filter((x) => x.relevancia === r).length;
      return { p, total: c.length, alta: por('alta'), media: por('media'), baja: por('baja'), rev: c.filter((x) => x.revisar).length, doc: c.filter((x) => x.tipo === 'documentada').length, peso: c.reduce((s, x) => s + REL[x.relevancia], 0) };
    })
    .sort((a, b) => b.total - a.total || b.alta - a.alta);

  const porMateria = store.sitio.materias
    .map((m) => ({ m, n: store.conexiones.filter((c) => store.ley.get(c.ley).materia === m.id).length, leyes: leyes.filter((x) => x.l.materia === m.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return { leyes, proys, porMateria };
}

const lista = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1]);

function hallazgos({ leyes, proys }) {
  const P = store.proyectos.length;
  const out = [];
  const topN = leyes[0].total;
  const top = leyes.filter((x) => x.total === topN);
  out.push(`<strong>${lista(top.map((x) => esc(x.l.nombre_corto)))}</strong> ${top.length > 1 ? 'son las leyes que aplican' : 'es la ley que aplica'} a más proyectos: ${topN} de ${P}.`);
  const varias = leyes.filter((x) => x.total >= 3 && !top.includes(x));
  if (varias.length) out.push(`Otras leyes que cruzan tres o más proyectos: ${lista(varias.map((x) => `<strong>${esc(x.l.nombre_corto)}</strong> (${x.total})`))}.`);
  const unicas = leyes.filter((x) => x.total === 1).length;
  out.push(`${unicas} de las ${leyes.length} leyes con conexiones aplican a un solo proyecto: son normas específicas de su sector (cultura, agua, hidrocarburos, trabajo…).`);
  const topP = proys.filter((x) => x.total === proys[0].total);
  out.push(`<strong>${lista(topP.map((x) => esc(x.p.nombre_corto)))}</strong> ${topP.length > 1 ? 'son los proyectos con' : 'es el proyecto con'} más obligaciones legales: ${proys[0].total} leyes y normas.`);
  const masAlta = [...proys].sort((a, b) => b.alta - a.alta)[0];
  out.push(`Con más conexiones de relevancia alta: <strong>${esc(masAlta.p.nombre_corto)}</strong> (${masAlta.alta}).`);
  const pct = Math.round((store.stats.documentadas / store.stats.conexiones) * 100);
  out.push(`${pct}% de las conexiones están documentadas por el propio compañero; el resto (<strong>${store.stats.cruces}</strong>) son cruces propuestos aquí a partir del análisis de otro compañero.${store.revisar ? ` En total hay <strong>${store.stats.revisar}</strong> conexiones marcadas para revisión.` : ''}`);
  return out;
}

function barrasLeyes(leyes) {
  const max = leyes[0].total;
  return `<div class="chart-legend"><span><i class="sw sw-doc"></i>Documentada</span><span><i class="sw sw-cruce"></i>Cruce propuesto</span></div>
    <ol class="bars">${leyes.slice(0, 12).map((x) => `
      <li class="bar-row">
        <a class="bar-label" href="#/leyes/${x.l.id}">${esc(x.l.nombre_corto)}</a>
        <div class="bar-track">
          ${x.doc ? `<span class="bar-seg doc" style="flex:${x.doc}" data-tip="${esc(x.l.nombre_corto)}: ${plural(x.doc, 'proyecto documentado', 'proyectos documentados')}"></span>` : ''}
          ${x.cruce ? `<span class="bar-seg cruce" style="flex:${x.cruce}" data-tip="${esc(x.l.nombre_corto)}: ${plural(x.cruce, 'cruce propuesto', 'cruces propuestos')}"></span>` : ''}
          <span style="flex:${max - x.total}"></span>
        </div>
        <span class="bar-val">${x.total}</span>
      </li>`).join('')}</ol>`;
}

function barrasProyectos(proys) {
  const max = Math.max(...proys.map((x) => x.total));
  return `<div class="chart-legend">${RELS.map((r) => `<span><i class="sw sw-${r}"></i>Relevancia ${r}</span>`).join('')}</div>
    <ol class="bars">${proys.map((x) => `
      <li class="bar-row">
        <a class="bar-label" href="#/proyectos/${x.p.id}">${esc(x.p.nombre_corto)}</a>
        <div class="bar-track">
          ${RELS.map((r) => (x[r] ? `<span class="bar-seg ${r}" style="flex:${x[r]}" data-tip="${esc(x.p.nombre_corto)}: ${plural(x[r], 'ley', 'leyes')} de relevancia ${r}"></span>` : '')).join('')}
          <span style="flex:${max - x.total}"></span>
        </div>
        <span class="bar-val">${x.total}</span>
      </li>`).join('')}</ol>`;
}

function barrasMateria(porMateria) {
  const max = porMateria[0].n;
  return `<ol class="bars">${porMateria.map((x) => `
    <li class="bar-row">
      <span class="bar-label">${esc(x.m.nombre)}</span>
      <div class="bar-track"><span class="bar-seg" style="flex:${x.n};background:${x.m.color}" data-tip="${esc(x.m.nombre)}: ${plural(x.n, 'conexión', 'conexiones')} en ${plural(x.leyes, 'ley', 'leyes')}"></span><span style="flex:${max - x.n}"></span></div>
      <span class="bar-val">${x.n}</span>
    </li>`).join('')}</ol>`;
}

function matriz(leyes) {
  const mapa = new Map(store.conexiones.map((c) => [c.ley + '|' + c.proyecto, c]));
  const letra = { alta: 'A', media: 'M', baja: 'B' };
  return `<div class="chart-legend"><span><i class="sw sw-alta"></i>A = alta</span><span><i class="sw sw-media"></i>M = media</span><span><i class="sw" style="background:color-mix(in srgb, var(--rel-baja) 45%, var(--surface));border:1px solid var(--line-strong)"></i>B = baja</span><span><i class="sw sw-cruce"></i>Rayado = cruce propuesto</span>${store.revisar ? `<span>${icon('bandera', 12)} = por revisar</span>` : ''}</div>
    <div class="matrix-wrap"><table class="matrix"><thead><tr><th scope="col">Ley o norma</th>
      ${store.proyectos.map((p) => `<th scope="col" style="--c:var(--series-${p.color})" data-tip="${esc(p.nombre_corto)} · ${esc(p.alumno_corto)}"><a href="#/proyectos/${p.id}" style="color:inherit">${esc(p.siglas)}</a></th>`).join('')}</tr></thead>
    <tbody>${leyes
      .map(
        (x) => `<tr><th scope="row"><a href="#/leyes/${x.l.id}">${esc(x.l.nombre_corto)}</a></th>
        ${store.proyectos
          .map((p) => {
            const c = mapa.get(x.l.id + '|' + p.id);
            if (!c) return '<td></td>';
            return `<td><a class="cell ${c.relevancia}${c.tipo === 'cruce' ? ' cruce' : ''}" href="#/leyes/${x.l.id}" data-tip="${esc(x.l.nombre_corto)} → ${esc(p.nombre_corto)} · ${c.relevancia}${c.tipo === 'cruce' ? ' · cruce propuesto' : ''}${store.revisar && c.revisar ? ' · por revisar' : ''}" aria-label="${esc(x.l.nombre_corto)} y ${esc(p.nombre_corto)}: relevancia ${c.relevancia}">${letra[c.relevancia]}${store.revisar && c.revisar ? `<span class="flag">⚑</span>` : ''}</a></td>`;
          })
          .join('')}</tr>`
      )
      .join('')}</tbody></table></div>`;
}

function porRevisar() {
  const grupos = store.proyectos
    .map((p) => ({ p, items: store.porProy.get(p.id).filter((c) => c.revisar) }))
    .filter((g) => g.items.length);
  return grupos
    .map(
      (g) => `<div class="review-group"><h4><span class="pdot" style="--c:var(--series-${g.p.color})">${esc(g.p.siglas.slice(0, 2))}</span>${esc(g.p.nombre_corto)} <span class="count">${g.items.length}</span></h4>
      ${g.items.map((c) => `<div class="review-item"><a href="#/leyes/${c.ley}">${esc(store.ley.get(c.ley).nombre_corto)}</a> · ${esc(c.nota_revision || 'Falta confirmar la conexión.')}</div>`).join('')}</div>`
    )
    .join('');
}

export function mount(root) {
  const d = datos();
  const mejorProy = d.proys[0];
  const k = [
    [d.leyes.filter((x) => x.total >= 2).length, 'leyes aplican a 2 o más proyectos'],
    [d.leyes[0].total, 'proyectos comparten la ley más común'],
    [mejorProy.total, `leyes en el proyecto con más obligaciones`],
    store.revisar ? [store.stats.revisar, 'conexiones por revisar'] : [store.stats.cruces, 'cruces propuestos entre compañeros'],
  ];
  root.innerHTML = `
    <div class="wrap">
      <header class="page-head">
        <span class="eyebrow">Conclusiones</span>
        <h1>Lo que muestran las conexiones</h1>
        <p>Resumen calculado a partir de los datos: qué leyes se comparten más y qué proyectos cargan con más obligaciones legales.</p>
      </header>

      <div class="kpis">${k.map(([n, t]) => `<div class="kpi"><b>${n}</b><span>${esc(t)}</span></div>`).join('')}</div>

      <section class="section" style="padding-top:26px;padding-left:0;padding-right:0">
        <div class="panel"><h3>Hallazgos principales</h3><p class="sub">Se calculan solos a partir de data/conexiones.json.</p>
          <ol class="finds">${hallazgos(d).map((t, i) => `<li data-n="${i + 1}">${t}</li>`).join('')}</ol></div>
      </section>

      <section class="section two-col" style="padding-top:16px;padding-left:0;padding-right:0">
        <div class="panel"><h3>Leyes que aplican a más proyectos</h3><p class="sub">Las 12 con más conexiones. Toca una para ver el detalle.</p>${barrasLeyes(d.leyes)}</div>
        <div class="panel"><h3>Proyectos con más obligaciones legales</h3><p class="sub">Número de leyes y normas que le aplican, por relevancia.</p>${barrasProyectos(d.proys)}</div>
      </section>

      <section class="section" style="padding-top:16px;padding-left:0;padding-right:0">
        <div class="panel"><h3>Matriz completa: ley × proyecto</h3><p class="sub">Cada celda es una conexión. Toca una celda para abrir la ley y ver el porqué.</p>${matriz(d.leyes)}</div>
      </section>

      <section class="section ${store.revisar ? 'two-col' : ''}" style="padding-top:16px;padding-left:0;padding-right:0">
        <div class="panel"><h3>Temas con más conexiones</h3><p class="sub">Dónde se concentra la regulación.</p>${barrasMateria(d.porMateria)}</div>
        ${store.revisar ? `<div class="panel"><h3>Pendiente de revisar</h3><p class="sub">Conexiones que conviene confirmar antes de entregar el trabajo.</p>
          <details class="fold" open><summary>${store.stats.revisar} conexiones marcadas</summary>${porRevisar()}</details></div>` : ''}
      </section>
      <div style="height:40px"></div>
    </div>`;
}

export function unmount() {}
