// Explorador de leyes: tarjetas con buscador y filtros; al tocar una ley se abre su detalle.
import { store, maxRel } from '../store.js';
import { esc, norm, debounce, REL, plural, cap, $, $$ } from '../utils.js';
import { icon } from '../icons.js';
import { tipoLey, projectDot, leyDetalleHTML } from '../ui.js';

const filtros = { q: '', materias: new Set(), ambito: '', tipo: '', proyecto: '', revisar: false, orden: 'proyectos' };
let root, dialog, indice, volverA = '#/leyes', abierta = null;

// Texto en el que busca el buscador: nombre, resumen, artículos, porqués y proyectos relacionados.
function construirIndice() {
  indice = new Map(
    store.leyes.map((l) => {
      const cons = store.porLey.get(l.id);
      const partes = [
        l.nombre, l.siglas, l.nombre_corto, l.tipo, l.ambito, l.resumen, store.materia.get(l.materia).nombre,
        ...l.articulos.flatMap((a) => [a.ref, a.resumen]),
        ...cons.flatMap((c) => [c.porque, store.proy.get(c.proyecto).nombre, store.proy.get(c.proyecto).alumno]),
      ];
      return [l.id, norm(partes.join(' '))];
    })
  );
}

function filtrar() {
  const q = norm(filtros.q).trim();
  const palabras = q ? q.split(/\s+/) : [];
  let lista = store.leyes.filter((l) => {
    const cons = store.porLey.get(l.id);
    if (filtros.materias.size && !filtros.materias.has(l.materia)) return false;
    if (filtros.ambito && !l.ambito.startsWith(filtros.ambito)) return false;
    if (filtros.tipo && l.tipo !== filtros.tipo) return false;
    if (filtros.proyecto && !cons.some((c) => c.proyecto === filtros.proyecto)) return false;
    if (filtros.revisar && !cons.some((c) => c.revisar)) return false;
    if (palabras.length) { const t = indice.get(l.id); if (!palabras.every((w) => t.includes(w))) return false; }
    return true;
  });
  const relMax = (l) => REL[maxRel(store.porLey.get(l.id)) || ''] || 0;
  const n = (l) => store.porLey.get(l.id).length;
  const alfa = (a, b) => a.nombre_corto.localeCompare(b.nombre_corto, 'es');
  if (filtros.orden === 'proyectos') lista.sort((a, b) => n(b) - n(a) || relMax(b) - relMax(a) || alfa(a, b));
  else if (filtros.orden === 'relevancia') lista.sort((a, b) => relMax(b) - relMax(a) || n(b) - n(a) || alfa(a, b));
  else lista.sort(alfa);
  return lista;
}

function tarjeta(l) {
  const cons = store.porLey.get(l.id);
  const mejor = maxRel(cons);
  const rev = cons.filter((c) => c.revisar).length;
  const m = store.materia.get(l.materia);
  const proys = [...new Set(cons.map((c) => c.proyecto))].map((id) => store.proy.get(id)).sort((a, b) => store.proyIndex.get(a.id) - store.proyIndex.get(b.id));
  return `
    <a class="law-card${cons.length ? '' : ' is-empty'}" href="#/leyes/${l.id}" style="--m:${m.color}">
      <div class="top">${tipoLey(l)}<span class="pill pill-ambito">${esc(l.ambito)}</span></div>
      <h3>${esc(l.nombre_corto)}</h3>
      <p class="sum">${esc(l.resumen)}</p>
      <div class="foot-row">
        ${cons.length
          ? `<div class="dots" aria-label="Proyectos: ${esc(proys.map((p) => p.nombre_corto).join(', '))}">${proys.map((p) => projectDot(p)).join('')}</div>
             <div class="meta"><strong>${plural(proys.length, 'proyecto', 'proyectos')}</strong>
               <span class="rel rel-${mejor}"><i></i>${cap(mejor)}</span>
               ${rev ? `<span class="pill pill-warn">${icon('bandera', 11)}${rev} por revisar</span>` : ''}</div>`
          : '<span class="meta" style="justify-items:start;text-align:left">Mencionada, sin conexiones</span>'}
      </div>
    </a>`;
}

function pintarResultados() {
  const lista = filtrar();
  $('#cards', root).innerHTML = lista.length
    ? lista.map(tarjeta).join('')
    : `<div class="empty"><h3>No hay leyes con esos filtros</h3><p>Prueba con otra palabra o quita algún filtro.</p><p><button class="linklike" type="button" data-reset>Limpiar filtros</button></p></div>`;
  const hay = hayFiltros();
  $('#resultsBar', root).innerHTML = `<span>Mostrando <strong>${lista.length}</strong> de ${store.leyes.length} leyes y normas</span>${hay ? '<button class="linklike" type="button" data-reset>Limpiar filtros</button>' : ''}`;
  $('#clearQ', root).classList.toggle('show', !!filtros.q);
}

const hayFiltros = () => !!(filtros.q || filtros.materias.size || filtros.ambito || filtros.tipo || filtros.proyecto || filtros.revisar);

function limpiar() {
  Object.assign(filtros, { q: '', ambito: '', tipo: '', proyecto: '', revisar: false });
  filtros.materias.clear();
  $('#q', root).value = '';
  $('#fAmbito', root).value = '';
  $('#fTipo', root).value = '';
  $('#fProy', root).value = '';
  $('#fRev', root).checked = false;
  $$('.chip', root).forEach((c) => c.setAttribute('aria-pressed', 'false'));
  pintarResultados();
}

export function mount(el, ruta) {
  root = el;
  construirIndice();
  const tipos = [...new Set(store.leyes.map((l) => l.tipo))].sort((a, b) => a.localeCompare(b, 'es'));
  const ambitos = ['Federal', 'Estatal'];
  const cuentaMateria = (id) => store.leyes.filter((l) => l.materia === id).length;

  root.innerHTML = `
    <div class="wrap">
      <header class="page-head">
        <span class="eyebrow">Explorador</span>
        <h1>Leyes y normas</h1>
        <p>Busca una ley o filtra por tema. Al tocar una tarjeta verás su resumen, a qué proyectos aplica y por qué, con el artículo que lo respalda.</p>
      </header>

      <div class="toolbar">
        <div class="search">
          ${icon('buscar', 20)}
          <input id="q" type="search" inputmode="search" autocomplete="off" placeholder="Busca por ley, artículo, tema o proyecto…" aria-label="Buscar leyes">
          <button class="clear" id="clearQ" type="button" aria-label="Borrar búsqueda">${icon('cerrar', 16)}</button>
        </div>
        <div class="chips" role="group" aria-label="Filtrar por tema">
          ${store.sitio.materias
            .map((m) => `<button class="chip" type="button" data-materia="${m.id}" aria-pressed="false"><i style="background:${m.color}"></i>${esc(m.nombre)} <small>${cuentaMateria(m.id)}</small></button>`)
            .join('')}
        </div>
        <div class="filters">
          <label class="field">Ámbito<select id="fAmbito"><option value="">Todos</option>${ambitos.map((a) => `<option>${a}</option>`).join('')}</select></label>
          <label class="field">Tipo<select id="fTipo"><option value="">Todos</option>${tipos.map((t) => `<option>${esc(t)}</option>`).join('')}</select></label>
          <label class="field">Aplica al proyecto<select id="fProy"><option value="">Todos</option>${store.proyectos.map((p) => `<option value="${p.id}">${esc(p.nombre_corto)} · ${esc(p.alumno_corto)}</option>`).join('')}</select></label>
          <label class="field">Ordenar por<select id="fOrden"><option value="proyectos">Más proyectos</option><option value="relevancia">Mayor relevancia</option><option value="az">Nombre (A-Z)</option></select></label>
          <label class="check"><input type="checkbox" id="fRev"> Con conexiones por revisar</label>
        </div>
      </div>

      <div class="results-bar" id="resultsBar" aria-live="polite"></div>
      <div class="grid" id="cards"></div>
    </div>

    <dialog class="drawer" id="drawer" aria-labelledby="drawerTitle">
      <div class="drawer-bar"><span>Detalle de la ley</span><button class="drawer-close" type="button" data-close>${icon('cerrar', 16)} Cerrar</button></div>
      <div class="drawer-body" id="drawerBody" tabindex="-1" autofocus></div>
    </dialog>`;

  dialog = $('#drawer', root);

  // Eventos
  const buscar = debounce(() => { filtros.q = $('#q', root).value; pintarResultados(); }, 120);
  $('#q', root).addEventListener('input', buscar);
  $('#clearQ', root).addEventListener('click', () => { $('#q', root).value = ''; filtros.q = ''; pintarResultados(); $('#q', root).focus(); });
  $('#fAmbito', root).addEventListener('change', (e) => { filtros.ambito = e.target.value; pintarResultados(); });
  $('#fTipo', root).addEventListener('change', (e) => { filtros.tipo = e.target.value; pintarResultados(); });
  $('#fProy', root).addEventListener('change', (e) => { filtros.proyecto = e.target.value; pintarResultados(); });
  $('#fOrden', root).addEventListener('change', (e) => { filtros.orden = e.target.value; pintarResultados(); });
  $('#fRev', root).addEventListener('change', (e) => { filtros.revisar = e.target.checked; pintarResultados(); });
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-materia]');
    if (chip) {
      const id = chip.dataset.materia;
      if (filtros.materias.has(id)) filtros.materias.delete(id); else filtros.materias.add(id);
      chip.setAttribute('aria-pressed', String(filtros.materias.has(id)));
      pintarResultados();
    }
    if (e.target.closest('[data-reset]')) limpiar();
    if (e.target.closest('[data-close]')) dialog.close();
    if (e.target === dialog) dialog.close();
    const copiar = e.target.closest('[data-copy]');
    if (copiar) {
      navigator.clipboard?.writeText(location.href).then(() => {
        const s = copiar.querySelector('span');
        const antes = s.textContent;
        s.textContent = '¡Enlace copiado!';
        setTimeout(() => { s.textContent = antes; }, 1600);
      }).catch(() => {});
    }
  });
  dialog.addEventListener('close', () => {
    abierta = null;
    // Si se cerró con el botón o Esc mientras la URL aún apunta a una ley, volvemos a donde estábamos.
    if (/^#\/leyes\/.+/.test(location.hash)) location.hash = volverA;
  });

  // Estado inicial de los controles (si el usuario ya había filtrado antes)
  $('#q', root).value = filtros.q;
  $('#fAmbito', root).value = filtros.ambito;
  $('#fTipo', root).value = filtros.tipo;
  $('#fProy', root).value = filtros.proyecto;
  $('#fOrden', root).value = filtros.orden;
  $('#fRev', root).checked = filtros.revisar;
  $$('.chip', root).forEach((c) => c.setAttribute('aria-pressed', String(filtros.materias.has(c.dataset.materia))));

  pintarResultados();
  update(ruta);
}

export function update(ruta) {
  if (ruta.id) {
    const ley = store.ley.get(ruta.id);
    if (!ley) { location.replace('#/leyes'); return; }
    // De dónde venimos: si no era la lista de leyes, al cerrar volvemos allí.
    if (!dialog.open) volverA = ruta.desde !== null && ruta.desde !== 'leyes' ? ruta.desdeHash || '#/leyes' : '#/leyes';
    abrir(ley);
  } else {
    document.title = store.sitio.titulo_sitio;
    if (dialog.open) dialog.close();
  }
}

function abrir(ley) {
  if (abierta === ley.id && dialog.open) return;
  abierta = ley.id;
  $('#drawerBody', root).innerHTML = leyDetalleHTML(ley);
  $('#drawerBody', root).scrollTop = 0;
  document.title = `${ley.nombre_corto} · ${store.sitio.titulo_sitio}`;
  if (!dialog.open) dialog.showModal();
}

export function unmount() {
  if (dialog?.open) dialog.close();
  document.title = store.sitio.titulo_sitio;
}
