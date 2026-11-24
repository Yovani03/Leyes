// Mapa de conexiones: leyes a la izquierda, proyectos a la derecha, unidos por líneas.
// Al tocar un nodo se resaltan sus conexiones.
import { store, leyesOrdenadas } from '../store.js';
import { esc, trunc, RELS, cap, plural, $, $$ } from '../utils.js';
import { icon } from '../icons.js';
import { relBadge, projectDot } from '../ui.js';

const filtro = { alta: true, media: true, baja: true, cruces: true, revisar: true };
let root, svg, panel, seleccion = null, ancho = 0, ro = null;

const visibles = () =>
  store.conexiones.filter((c) => filtro[c.relevancia] && (filtro.cruces || c.tipo !== 'cruce') && (!store.revisar || filtro.revisar || !c.revisar));

function trazar() {
  const cons = visibles();
  const leyes = leyesOrdenadas(cons);
  const movil = ancho < 640;
  const rowH = movil ? 31 : 34;
  const pad = 14;
  const H = pad * 2 + Math.max(leyes.length, 1) * rowH;
  const labelW = movil ? 108 : 270;
  const pillW = movil ? 84 : 238;
  const xL = labelW + 10;
  const xR = ancho - pillW - 8;
  const pillH = movil ? 40 : 46;
  const n = store.proyectos.length;
  const gap = Math.max(8, (H - pad * 2 - n * pillH) / (n - 1));
  const yP = (j) => pad + pillH / 2 + j * (pillH + gap);
  const yL = (i) => pad + rowH * (i + 0.5);
  const li = new Map(leyes.map((l, i) => [l.id, i]));

  let lineas = '';
  for (const c of cons) {
    const proy = store.proy.get(c.proyecto);
    const x1 = xL + 5, y1 = yL(li.get(c.ley)), x2 = xR, y2 = yP(store.proyIndex.get(c.proyecto));
    const xm = (x1 + x2) / 2;
    lineas += `<path class="map-line d-${c.relevancia}${store.revisar && c.revisar ? ' rev' : ''}" data-l="${c.ley}" data-p="${c.proyecto}" style="--c:var(--series-${proy.color})" d="M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}"><title>${esc(store.ley.get(c.ley).nombre_corto)} → ${esc(proy.nombre_corto)} · relevancia ${c.relevancia}${store.revisar && c.revisar ? ' · por revisar' : ''}${c.tipo === 'cruce' ? ' · cruce propuesto' : ''}</title></path>`;
  }

  let nodosL = '';
  leyes.forEach((l, i) => {
    const y = yL(i);
    const etiqueta = movil ? l.siglas : trunc(l.nombre_corto, 36);
    nodosL += `<g class="map-node law" tabindex="0" role="button" aria-pressed="false" data-key="l:${l.id}" aria-label="${esc(l.nombre)}">
      <title>${esc(l.nombre)}</title>
      <rect class="hit" x="0" y="${y - rowH / 2}" width="${xL + 14}" height="${rowH}"/>
      <text x="${labelW}" y="${y + 4.5}" text-anchor="end" style="font-size:${movil ? 11.5 : 12.5}px">${esc(etiqueta)}</text>
      <circle class="dot" cx="${xL}" cy="${y}" r="5.5"/></g>`;
  });

  let nodosP = '';
  store.proyectos.forEach((p, j) => {
    const y = yP(j) - pillH / 2;
    nodosP += `<g class="map-node proj" tabindex="0" role="button" aria-pressed="false" data-key="p:${p.id}" style="--c:var(--series-${p.color})" aria-label="${esc(p.nombre)}">
      <title>${esc(p.nombre)}</title>
      <rect class="card" x="${xR}" y="${y}" width="${pillW}" height="${pillH}" rx="11"/>
      <rect class="bar" x="${xR}" y="${y + 6}" width="5" height="${pillH - 12}" rx="2.5"/>
      ${movil
        ? `<text class="t1" x="${xR + pillW / 2 + 2}" y="${y + pillH / 2 + 4}" text-anchor="middle" style="font-size:11.5px">${esc(p.siglas)}</text>`
        : `<text class="t1" x="${xR + 18}" y="${y + 20}">${esc(trunc(p.nombre_corto, 24))}</text><text class="t2" x="${xR + 18}" y="${y + 36}">${esc(p.alumno_corto)}</text>`}
    </g>`;
  });

  svg.setAttribute('viewBox', `0 0 ${ancho} ${H}`);
  svg.style.height = 'auto';
  svg.innerHTML = `<g>${lineas}</g><g>${nodosL}</g><g>${nodosP}</g>`;
  if (seleccion && !svg.querySelector(`[data-key="${seleccion}"]`)) seleccion = null;
  resaltar(seleccion);
  pintarPanel();
}

function relacionados(key) {
  const cons = visibles();
  if (key.startsWith('l:')) return new Set(cons.filter((c) => c.ley === key.slice(2)).map((c) => 'p:' + c.proyecto));
  return new Set(cons.filter((c) => c.proyecto === key.slice(2)).map((c) => 'l:' + c.ley));
}

function resaltar(key) {
  svg.classList.toggle('has-sel', !!key);
  const rel = key ? relacionados(key) : new Set();
  $$('.map-line', svg).forEach((p) => {
    p.classList.toggle('on', !!key && (key === 'l:' + p.dataset.l || key === 'p:' + p.dataset.p));
  });
  $$('.map-node', svg).forEach((g) => {
    const k = g.dataset.key;
    g.classList.toggle('sel', k === key);
    g.classList.toggle('related', rel.has(k));
    g.setAttribute('aria-pressed', String(k === key));
  });
}

function seleccionar(key) {
  seleccion = seleccion === key ? null : key;
  resaltar(seleccion);
  pintarPanel();
  history.replaceState(null, '', seleccion ? `#/mapa?sel=${seleccion}` : '#/mapa');
}

function pintarPanel() {
  panel.hidden = !seleccion;
  if (!seleccion) { panel.innerHTML = ''; return; }
  const [tipo, id] = [seleccion[0], seleccion.slice(2)];
  const cons = visibles();
  if (tipo === 'l') {
    const l = store.ley.get(id);
    const mias = cons.filter((c) => c.ley === id);
    panel.innerHTML = `
      <div class="panel-head"><div><h3>${esc(l.nombre_corto)}</h3>
        <p class="panel-meta">${esc(l.tipo)} · ${esc(l.ambito)} · aplica a ${plural(mias.length, 'proyecto', 'proyectos')}</p></div></div>
      <div class="panel-list">${mias.map((c) => {
        const p = store.proy.get(c.proyecto);
        return `<button type="button" class="panel-row" data-sel="p:${p.id}">${projectDot(p)}<span class="name">${esc(p.nombre_corto)} <small style="color:var(--ink-3)">· ${esc(p.alumno_corto)}</small></span>${relBadge(c.relevancia).replace('Relevancia ', '')}${store.revisar && c.revisar ? icon('bandera', 14) : ''}</button>`;
      }).join('')}</div>
      <div class="panel-actions"><a class="btn btn-primary" href="#/leyes/${l.id}">Ver detalle y porqué ${icon('flecha', 15)}</a><button class="btn btn-ghost" type="button" data-clear>Quitar selección</button></div>`;
  } else {
    const p = store.proy.get(id);
    const mias = cons.filter((c) => c.proyecto === id);
    panel.innerHTML = `
      <div class="panel-head"><div><h3>${esc(p.nombre_corto)}</h3>
        <p class="panel-meta">Proyecto de ${esc(p.alumno)} · ${plural(mias.length, 'ley', 'leyes')} (según los filtros)</p></div></div>
      <div class="panel-list">${mias.map((c) => {
        const l = store.ley.get(c.ley);
        return `<button type="button" class="panel-row" data-sel="l:${l.id}"><span class="conn-law-ico">${icon('documento', 15)}</span><span class="name">${esc(l.nombre_corto)}</span>${relBadge(c.relevancia).replace('Relevancia ', '')}${store.revisar && c.revisar ? icon('bandera', 14) : ''}</button>`;
      }).join('')}</div>
      <div class="panel-actions"><a class="btn btn-primary" href="#/proyectos/${p.id}">Ver el proyecto ${icon('flecha', 15)}</a><button class="btn btn-ghost" type="button" data-clear>Quitar selección</button></div>`;
  }
}

function controles() {
  const tog = (k, t) => `<button class="chip" type="button" data-tog="${k}" aria-pressed="${filtro[k]}">${t}</button>`;
  return `
    <div class="map-controls">
      <div class="seg-group"><span>Relevancia</span><div class="chips" style="padding:0;overflow:visible" role="group" aria-label="Relevancia">${RELS.map((r) => tog(r, cap(r))).join('')}</div></div>
      <div class="seg-group"><span>Origen</span><div class="chips" style="padding:0;overflow:visible" role="group" aria-label="Origen">${tog('cruces', 'Cruces propuestos')}${store.revisar ? tog('revisar', 'Por revisar') : ''}</div></div>
    </div>
    <div class="map-legend" aria-label="Cómo leer las líneas">
      <span><svg viewBox="0 0 34 8"><path d="M0 4h34" stroke="var(--ink-3)" stroke-width="2.6"/></svg>Relevancia alta</span>
      <span><svg viewBox="0 0 34 8"><path d="M0 4h34" stroke="var(--ink-3)" stroke-width="1.6"/></svg>Media</span>
      <span><svg viewBox="0 0 34 8"><path d="M0 4h34" stroke="var(--ink-3)" stroke-width="1"/></svg>Baja</span>
      ${store.revisar ? '<span><svg viewBox="0 0 34 8"><path d="M0 4h34" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="5 4"/></svg>Por revisar (discontinua)</span>' : ''}
    </div>`;
}

export function mount(el, ruta) {
  root = el;
  root.innerHTML = `
    <div class="wrap">
      <header class="page-head">
        <span class="eyebrow">Mapa de conexiones</span>
        <h1>Leyes ↔ proyectos</h1>
        <p>A la izquierda están las leyes; a la derecha, los proyectos. Toca cualquier nodo para resaltar con qué se conecta.</p>
      </header>
      ${controles()}
      <p class="map-hint">${icon('info', 16)}<span>Toca una ley o un proyecto para resaltar sus conexiones.</span></p>
      <div class="map-box"><svg id="mapSvg" role="group" aria-label="Mapa de conexiones entre leyes y proyectos"></svg></div>
      <div class="map-panel" id="mapPanel" aria-live="polite"></div>
      <div style="height:30px"></div>
    </div>`;
  svg = $('#mapSvg', root);
  panel = $('#mapPanel', root);

  root.addEventListener('click', (e) => {
    const tog = e.target.closest('[data-tog]');
    if (tog) { filtro[tog.dataset.tog] = !filtro[tog.dataset.tog]; tog.setAttribute('aria-pressed', String(filtro[tog.dataset.tog])); trazar(); return; }
    if (e.target.closest('[data-clear]')) { seleccion = null; resaltar(null); pintarPanel(); history.replaceState(null, '', '#/mapa'); return; }
    const fila = e.target.closest('[data-sel]');
    if (fila) { seleccion = null; seleccionar(fila.dataset.sel); return; }
    const nodo = e.target.closest('.map-node');
    if (nodo) seleccionar(nodo.dataset.key);
  });
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const nodo = e.target.closest('.map-node');
    if (nodo) { e.preventDefault(); seleccionar(nodo.dataset.key); }
  });
  // Vista previa al pasar el ratón (solo si no hay nada seleccionado)
  svg.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || seleccion) return;
    const nodo = e.target.closest('.map-node');
    if (nodo) resaltar(nodo.dataset.key);
  });
  svg.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || seleccion) return;
    if (e.target.closest('.map-node')) resaltar(null);
  });

  ancho = Math.max(320, Math.round(svg.parentElement.clientWidth - 12));
  update(ruta);
  let ultimo = ancho;
  ro = new ResizeObserver(() => {
    const w = Math.max(320, Math.round(svg.parentElement.clientWidth - 12));
    if (Math.abs(w - ultimo) > 4) { ultimo = w; ancho = w; trazar(); }
  });
  ro.observe(svg.parentElement);
}

export function update(ruta) {
  const sel = ruta.params.get('sel');
  if (sel && /^[lp]:/.test(sel) && (store.ley.has(sel.slice(2)) || store.proy.has(sel.slice(2)))) seleccion = sel;
  trazar();
  if (sel && svg.querySelector(`[data-key="${sel}"]`)) {
    const nodo = svg.querySelector(`[data-key="${sel}"]`);
    setTimeout(() => nodo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }
}

export function unmount() {
  ro?.disconnect();
  ro = null;
}
