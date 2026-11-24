// Punto de entrada: carga los datos, dibuja la barra de navegación y enruta las vistas por hash.
import { loadData, store } from './store.js';
import { icon } from './icons.js';
import { esc, $, $$ } from './utils.js';
import { initTooltips } from './ui.js';

// Todas las secciones posibles. «Conclusiones» se activa con "mostrar_conclusiones" en data/sitio.json.
const NAV_TODAS = [
  { vista: '', href: '#/', texto: 'Inicio', icono: 'casa' },
  { vista: 'leyes', href: '#/leyes', texto: 'Leyes', icono: 'libro' },
  { vista: 'proyectos', href: '#/proyectos', texto: 'Proyectos', icono: 'proyecto' },
  { vista: 'mapa', href: '#/mapa', texto: 'Mapa', icono: 'mapa' },
  { vista: 'conclusiones', href: '#/conclusiones', texto: 'Conclusiones', icono: 'grafico' },
];

const VISTAS = {
  '': () => import('./views/home.js'),
  leyes: () => import('./views/explorer.js'),
  proyectos: () => import('./views/projects.js'),
  mapa: () => import('./views/map.js'),
};
let NAV = NAV_TODAS;

// Activa o desactiva «Conclusiones» según el interruptor de los datos.
function configurarSecciones() {
  if (store.sitio.mostrar_conclusiones === true) {
    VISTAS.conclusiones = () => import('./views/conclusions.js');
    NAV = NAV_TODAS;
  } else {
    delete VISTAS.conclusiones;
    NAV = NAV_TODAS.filter((n) => n.vista !== 'conclusiones');
  }
}

const main = document.getElementById('app');
let actual = { vista: null, mod: null };
let previaVista = null;
let previaHash = null;

function parseRuta() {
  const h = location.hash.replace(/^#\/?/, '');
  const [camino, consulta = ''] = h.split('?');
  const [vista, id] = camino.split('/');
  return { vista: VISTAS[vista] !== undefined ? vista : '', id: id ? decodeURIComponent(id) : null, params: new URLSearchParams(consulta), hash: location.hash || '#/' };
}

function pintarChrome() {
  document.getElementById('brand').innerHTML = `<span class="brand-mark">${icon('balanza', 19)}</span><span>${esc(store.sitio.marca)}</span>`;
  const items = (cls) => NAV.map((n) => `<a href="${n.href}" data-vista="${n.vista}">${cls === 'm' ? icon(n.icono, 21) : icon(n.icono, 17)}<span>${n.texto}</span></a>`).join('');
  document.getElementById('navDesktop').innerHTML = items('d');
  document.getElementById('navMobile').innerHTML = items('m');
  document.title = store.sitio.titulo_sitio;
}

function marcarNav(vista) {
  $$('#navDesktop a, #navMobile a').forEach((a) => {
    if (a.dataset.vista === vista) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function enrutar() {
  const ruta = parseRuta();
  ruta.desde = previaVista;
  ruta.desdeHash = previaHash;
  const cargador = VISTAS[ruta.vista];
  if (actual.vista !== ruta.vista) {
    const mod = await cargador();
    if (actual.mod?.unmount) actual.mod.unmount();
    main.innerHTML = '';
    main.scrollTop = 0;
    window.scrollTo(0, 0);
    actual = { vista: ruta.vista, mod };
    marcarNav(ruta.vista);
    // Cada vista vive en su propio contenedor, así sus eventos desaparecen al cambiar de vista.
    const vista = document.createElement('div');
    vista.className = 'view';
    main.appendChild(vista);
    await mod.mount(vista, ruta);
    main.focus({ preventScroll: true });
  } else {
    actual.mod.update?.(ruta);
  }
  previaVista = ruta.vista;
  previaHash = ruta.hash;
}

function temaInicial() {
  const btn = document.getElementById('themeToggle');
  const oscuroSistema = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const esOscuro = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : oscuroSistema();
  };
  const pintar = () => { btn.innerHTML = icon(esOscuro() ? 'sol' : 'luna', 19); };
  btn.addEventListener('click', () => {
    const nuevo = esOscuro() ? 'light' : 'dark';
    document.documentElement.dataset.theme = nuevo;
    try { localStorage.setItem('tema', nuevo); } catch (e) { /* sin almacenamiento: no pasa nada */ }
    pintar();
  });
  pintar();
}

async function iniciar() {
  main.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando leyes y proyectos…</p></div>';
  try {
    await loadData();
  } catch (e) {
    const local = location.protocol === 'file:';
    main.innerHTML = `<div class="fatal"><h2>No se pudieron cargar los datos</h2>
      <p>${local ? 'Estás abriendo el archivo directamente. Los navegadores bloquean la lectura de los JSON así: abre la carpeta con un servidor local, por ejemplo <code>npx serve</code>, la extensión Live Server de VS Code, o <code>python -m http.server</code>.' : esc(e.message)}</p></div>`;
    return;
  }
  configurarSecciones();
  pintarChrome();
  temaInicial();
  initTooltips();
  window.addEventListener('hashchange', enrutar);
  await enrutar();
}

iniciar();
