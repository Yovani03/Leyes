// Fragmentos de interfaz compartidos: insignias, tarjetas de conexión, detalle de ley y tooltip.
import { store, articulosDe, maxRel } from './store.js';
import { esc, cap, plural } from './utils.js';
import { icon } from './icons.js';

export const relBadge = (r) =>
  `<span class="rel rel-${r}" title="${esc(store.sitio.relevancias[r])}"><i aria-hidden="true"></i>Relevancia ${r}</span>`;

export const origenBadge = (c) =>
  c.tipo === 'documentada'
    ? '<span class="pill pill-doc">Documentada</span>'
    : '<span class="pill pill-cruce">Cruce propuesto</span>';

export const revisarBadge = (c) =>
  store.revisar && c.revisar ? `<span class="pill pill-warn">${icon('bandera', 12)}Por revisar</span>` : '';

export const tipoLey = (l) => `<span class="pill pill-tipo">${esc(l.tipo)}</span>`;

export function projectDot(p, extra = '') {
  return `<span class="pdot ${extra}" style="--c:var(--series-${p.color})" data-tip="${esc(p.nombre_corto)} · ${esc(p.alumno_corto)}">${esc(p.siglas.slice(0, 2))}</span>`;
}

export function materiaTag(l) {
  const m = store.materia.get(l.materia);
  return `<span class="materia"><i style="background:${m.color}" aria-hidden="true"></i>${esc(m.nombre)}</span>`;
}

function listaArticulos(ley, refs) {
  if (!refs.length) return '';
  const items = articulosDe(ley, refs);
  const sinNumero = refs.every((r) => r.startsWith('Sin '));
  return `
    <details class="arts" ${items.length <= 2 ? 'open' : ''}>
      <summary>${sinNumero ? 'Qué dice el análisis' : `${plural(refs.length, 'artículo citado', 'artículos citados')}`}</summary>
      <ul>
        ${items
          .map(
            (a) => `<li><strong>${esc(a.ref)}</strong>${a.resumen ? ` <span>${esc(a.resumen)}</span>` : ''}${a.fuente ? ` <em>— según ${esc(a.fuente)}</em>` : ''}</li>`
          )
          .join('')}
      </ul>
    </details>`;
}

// Tarjeta de una conexión. `modo` indica qué entidad se muestra en el encabezado.
export function conexionCard(c, modo) {
  const ley = store.ley.get(c.ley);
  const proy = store.proy.get(c.proyecto);
  const cabecera =
    modo === 'ley'
      ? `<a class="conn-title" href="#/proyectos/${proy.id}">${projectDot(proy)}<span><strong>${esc(proy.nombre_corto)}</strong><small>${esc(proy.alumno)}</small></span></a>`
      : `<a class="conn-title" href="#/leyes/${ley.id}"><span class="conn-law-ico">${icon('documento', 16)}</span><span><strong>${esc(ley.nombre_corto)}</strong><small>${esc(ley.tipo)} · ${esc(ley.ambito)}</small></span></a>`;
  return `
    <article class="conn rel-border-${c.relevancia}${store.revisar && c.revisar ? ' is-revisar' : ''}" style="--c:var(--series-${proy.color})">
      <header class="conn-head">
        ${cabecera}
        <div class="conn-badges">${relBadge(c.relevancia)}${origenBadge(c)}${revisarBadge(c)}</div>
      </header>
      <p class="conn-why">${esc(c.porque)}</p>
      ${listaArticulos(ley, c.articulos_citados)}
      <p class="conn-src">${icon('documento', 13)} Fuente: ${esc(c.fuente)}</p>
      ${store.revisar && c.revisar && c.nota_revision ? `<p class="conn-note">${icon('bandera', 14)}<span><strong>Por revisar:</strong> ${esc(c.nota_revision)}</span></p>` : ''}
    </article>`;
}

// Contenido completo del panel de detalle de una ley.
export function leyDetalleHTML(ley) {
  const cons = store.porLey.get(ley.id) || [];
  const mejor = maxRel(cons);
  const analizadores = ley.analizada_por.map((a) => esc(a.alumno)).join(' · ');
  return `
    <header class="drawer-head">
      <div class="drawer-badges">${tipoLey(ley)}<span class="pill pill-ambito">${esc(ley.ambito)}</span>${materiaTag(ley)}</div>
      <h2 id="drawerTitle">${esc(ley.nombre)}</h2>
      <p class="drawer-meta">${ley.siglas && ley.siglas !== ley.nombre_corto ? `<span>${esc(ley.siglas)}</span> · ` : ''}Analizada por ${analizadores}</p>
    </header>

    <section class="drawer-sec">
      <h3>Resumen</h3>
      <p>${esc(ley.resumen)}</p>
      ${ley.vigencia && (store.revisar || !ley.nota_es_revision) ? `<p class="vigencia">${icon('info', 15)}<span>${esc(ley.vigencia)}</span></p>` : ''}
      ${ley.nota_sitio && (store.revisar || !ley.nota_es_revision) ? `<p class="conn-note">${icon('info', 14)}<span>${esc(ley.nota_sitio)}</span></p>` : ''}
      <div class="drawer-actions">
        ${ley.enlace_oficial ? `<a class="btn btn-ghost" href="${esc(ley.enlace_oficial)}" target="_blank" rel="noopener noreferrer">${icon('externo', 16)}Texto oficial (enlace del compañero)</a>` : ''}
        ${cons.length ? `<a class="btn btn-ghost" href="#/mapa?sel=l:${ley.id}">${icon('mapa', 16)}Ver en el mapa</a>` : ''}
        <button class="btn btn-ghost" type="button" data-copy>${icon('copiar', 16)}<span>Copiar enlace</span></button>
      </div>
    </section>

    <section class="drawer-sec">
      <h3>A qué proyectos aplica ${cons.length ? `<span class="count">${cons.length}</span>` : ''}</h3>
      ${
        cons.length
          ? `<p class="sec-hint">Mayor relevancia: <strong>${cap(mejor)}</strong>. Cada conexión explica el porqué y cita el artículo que la respalda.</p>
             <div class="conn-list">${cons.map((c) => conexionCard(c, 'ley')).join('')}</div>`
          : '<p class="empty-inline">Ningún compañero conectó esta ley con su proyecto, por eso no tiene conexiones.</p>'
      }
    </section>

    ${
      ley.articulos.length
        ? `<section class="drawer-sec">
            <h3>Todos los artículos que citan los compañeros <span class="count">${ley.articulos.length}</span></h3>
            <ul class="art-table">
              ${ley.articulos
                .map((a) => `<li><div class="art-ref">${esc(a.ref)}</div><div class="art-body">${esc(a.resumen)}<em>según ${esc(a.fuente)}</em></div></li>`)
                .join('')}
            </ul>
          </section>`
        : ''
    }`;
}

// ---- Tooltip global: cualquier elemento con data-tip ----
export function initTooltips() {
  const tip = document.getElementById('tip');
  let actual = null;
  const mostrar = (el, x, y) => {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    const px = Math.min(Math.max(8, x + 14), window.innerWidth - r.width - 8);
    const py = y + 18 + r.height > window.innerHeight ? y - r.height - 12 : y + 18;
    tip.style.transform = `translate(${px}px, ${py}px)`;
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.('[data-tip]');
    if (!el) { if (actual) { tip.hidden = true; actual = null; } return; }
    actual = el;
    mostrar(el, e.clientX, e.clientY);
  });
  document.addEventListener('pointerleave', () => { tip.hidden = true; actual = null; });
  document.addEventListener('scroll', () => { tip.hidden = true; actual = null; }, { passive: true });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    actual = el;
    mostrar(el, r.left, r.bottom - 14);
  });
  document.addEventListener('focusout', () => { tip.hidden = true; actual = null; });
}
