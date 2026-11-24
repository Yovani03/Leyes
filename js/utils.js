// Utilidades pequeñas compartidas por todas las vistas.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Minúsculas y sin acentos, para buscar sin importar tildes.
export const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export const REL = { alta: 3, media: 2, baja: 1 };
export const RELS = ['alta', 'media', 'baja'];
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
