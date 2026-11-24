// Vista por proyecto: eliges un proyecto y ves todas las leyes que le aplican.
import { store } from '../store.js';
import { esc, RELS, cap, plural, $, $$ } from '../utils.js';
import { icon } from '../icons.js';
import { conexionCard } from '../ui.js';

const f = { rel: 'todas', origen: 'todas', grupo: 'relevancia' };
let root, actualId;

function resumen(cons) {
  return {
    total: cons.length,
    alta: cons.filter((c) => c.relevancia === 'alta').length,
    revisar: cons.filter((c) => c.revisar).length,
    doc: cons.filter((c) => c.tipo === 'documentada').length,
  };
}

function seg(nombre, clave, opciones) {
  return `<div class="seg-group"><span>${nombre}</span><div class="seg" role="group" aria-label="${nombre}">
    ${opciones.map(([v, t]) => `<button type="button" data-f="${clave}" data-v="${v}" aria-pressed="${f[clave] === v}">${t}</button>`).join('')}
  </div></div>`;
}

function aplicarFiltros(cons) {
  return cons.filter((c) => {
    if (f.rel !== 'todas' && c.relevancia !== f.rel) return false;
    if (f.origen === 'documentada' && c.tipo !== 'documentada') return false;
    if (f.origen === 'cruce' && c.tipo !== 'cruce') return false;
    if (f.origen === 'revisar' && !c.revisar) return false;
    return true;
  });
}

function pintarLista() {
  $('#projList', root).innerHTML = store.proyectos
    .map((p) => {
      const n = store.porProy.get(p.id).length;
      return `<a class="proj-item" href="#/proyectos/${p.id}" style="--c:var(--series-${p.color})" aria-current="${p.id === actualId}">
        <span class="pdot is-lg" style="--c:var(--series-${p.color})">${esc(p.siglas.slice(0, 2))}</span>
        <span><strong>${esc(p.nombre_corto)}</strong><small>${esc(p.alumno_corto)}</small></span>
        <span class="n" title="${plural(n, 'ley', 'leyes')}">${n}</span></a>`;
    })
    .join('');
}

function pintarDetalle() {
  const p = store.proy.get(actualId);
  const todas = store.porProy.get(p.id);
  const r = resumen(todas);
  const cons = aplicarFiltros(todas);

  let cuerpo;
  if (!cons.length) {
    cuerpo = '<div class="empty"><h3>Ninguna conexión con esos filtros</h3><p>Cambia la relevancia o el origen para ver más.</p></div>';
  } else if (f.grupo === 'relevancia') {
    cuerpo = RELS.map((rel) => {
      const g = cons.filter((c) => c.relevancia === rel);
      if (!g.length) return '';
      return `<div class="group-title"><span class="rel rel-${rel}"><i></i>Relevancia ${rel}</span><span class="count">${g.length}</span><span class="line"></span></div>
        <div class="conn-list">${g.map((c) => conexionCard(c, 'proyecto')).join('')}</div>`;
    }).join('');
  } else {
    const ids = [...new Set(cons.map((c) => store.ley.get(c.ley).materia))];
    ids.sort((a, b) => store.sitio.materias.findIndex((m) => m.id === a) - store.sitio.materias.findIndex((m) => m.id === b));
    cuerpo = ids.map((mid) => {
      const m = store.materia.get(mid);
      const g = cons.filter((c) => store.ley.get(c.ley).materia === mid);
      return `<div class="group-title"><span class="materia"><i style="background:${m.color}"></i>${esc(m.nombre)}</span><span class="count">${g.length}</span><span class="line"></span></div>
        <div class="conn-list">${g.map((c) => conexionCard(c, 'proyecto')).join('')}</div>`;
    }).join('');
  }

  $('#projDetail', root).innerHTML = `
    <div class="proj-hero" style="--c:var(--series-${p.color})">
      <span class="eyebrow">Proyecto de ${esc(p.alumno)}</span>
      <h2>${esc(p.nombre)}</h2>
      <div class="who"><span class="pill pill-ambito">${esc(p.ambito)}</span></div>
      <p class="desc">${esc(p.descripcion)}</p>
      ${p.nota ? `<p class="conn-note" style="margin-top:12px">${icon('info', 14)}<span>${esc(p.nota)}</span></p>` : ''}
      <p class="doc">${icon('documento', 14)}<span>Documento fuente: ${esc(p.documento_fuente)}</span></p>
    </div>

    <div class="tiles">
      <div class="tile"><b>${r.total}</b><span>leyes y normas que le aplican</span></div>
      <div class="tile"><b>${r.alta}</b><span>de relevancia alta</span></div>
      <div class="tile"><b>${r.doc}</b><span>documentadas por el compañero</span></div>
      ${store.revisar
        ? `<div class="tile"><b>${r.revisar}</b><span>por revisar</span></div>`
        : `<div class="tile"><b>${r.total - r.doc}</b><span>cruces propuestos</span></div>`}
    </div>

    <div class="seg-wrap">
      ${seg('Relevancia', 'rel', [['todas', 'Todas'], ...RELS.map((x) => [x, cap(x)])])}
      ${seg('Origen', 'origen', [['todas', 'Todas'], ['documentada', 'Documentadas'], ['cruce', 'Cruces'], ...(store.revisar ? [['revisar', 'Por revisar']] : [])])}
      ${seg('Agrupar por', 'grupo', [['relevancia', 'Relevancia'], ['tema', 'Tema']])}
    </div>

    ${cuerpo}
    <p style="margin-top:20px"><a class="btn btn-ghost" href="#/mapa?sel=p:${p.id}">${icon('mapa', 16)} Ver este proyecto en el mapa</a></p>`;
}

export function mount(el, ruta) {
  root = el;
  root.innerHTML = `
    <div class="wrap">
      <header class="page-head">
        <span class="eyebrow">Por proyecto</span>
        <h1>¿Qué leyes le aplican a cada proyecto?</h1>
        <p>Elige un proyecto para ver sus obligaciones legales, el porqué de cada una y el artículo que la respalda.</p>
      </header>
      <div class="split">
        <nav class="proj-list" id="projList" aria-label="Proyectos"></nav>
        <section class="proj-detail" id="projDetail" aria-live="polite"></section>
      </div>
    </div>`;

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    f[b.dataset.f] = b.dataset.v;
    pintarDetalle();
  });
  update(ruta);
}

export function update(ruta) {
  const id = store.proy.has(ruta.id) ? ruta.id : store.proyectos[0].id;
  const cambio = id !== actualId;
  actualId = id;
  pintarLista();
  pintarDetalle();
  document.title = `${store.proy.get(id).nombre_corto} · ${store.sitio.titulo_sitio}`;
  if (cambio && root) {
    // En móvil, lleva el proyecto elegido a la vista dentro de la tira horizontal y sube al detalle.
    const item = $('.proj-item[aria-current="true"]', root);
    item?.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (ruta.id && window.innerWidth < 900) $('#projDetail', root).scrollIntoView({ block: 'start' });
  }
}

export function unmount() {
  document.title = store.sitio.titulo_sitio;
}
