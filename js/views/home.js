// Portada: de qué trata el trabajo y botón para entrar al explorador.
import { store, leyesOrdenadas } from '../store.js';
import { esc } from '../utils.js';
import { icon } from '../icons.js';

let timer = null;

export function mount(root) {
  const s = store.sitio;
  const p = s.portada;
  root.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <div>
          <span class="eyebrow">${esc(p.eyebrow)}</span>
          <h1>${esc(p.titulo)}</h1>
          <p class="hero-sub">${esc(p.subtitulo)}</p>
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" href="#/leyes">${esc(p.boton_principal)} ${icon('flecha', 18)}</a>
            <a class="btn btn-ghost btn-lg" href="#/mapa">${icon('mapa', 18)} ${esc(p.boton_secundario)}</a>
          </div>
          <p class="hero-inst">${esc(s.institucion)}</p>
        </div>
        <div class="hero-viz" aria-hidden="true">
          <div class="viz-cap" id="vizCap"><i></i><span></span></div>
          <svg viewBox="0 0 420 380" id="heroSvg" role="img"></svg>
        </div>
      </div>
    </section>

    <div class="stats" id="stats"></div>

    <section class="section" aria-labelledby="h-como">
      <h2 id="h-como">Cómo se usa</h2>
      <div class="steps">
        ${s.pasos
          .map(
            (x) => `<a class="step" href="${esc(x.ruta)}">
              <div class="ico">${icon(x.icono, 22)}</div>
              <h3>${esc(x.titulo)}</h3>
              <p>${esc(x.texto)}</p>
              <span class="go">Abrir ${icon('flecha', 15)}</span>
            </a>`
          )
          .join('')}
      </div>
    </section>

    <section class="section" aria-labelledby="h-leer">
      <h2 id="h-leer">${esc(s.leyenda_titulo)}</h2>
      <div class="legend-grid">
        ${s.leyenda
          .filter((l) => store.revisar || l.clave !== 'revisar')
          .map((l) => {
            const pill = l.clave === 'documentada' ? '<span class="pill pill-doc">Documentada</span>' : l.clave === 'cruce' ? '<span class="pill pill-cruce">Cruce propuesto</span>' : `<span class="pill pill-warn">${icon('bandera', 12)}Por revisar</span>`;
            return `<div class="legend-item">${pill}<p>${esc(l.texto)}</p></div>`;
          })
          .join('')}
      </div>
      <div class="rel-legend">
        ${['alta', 'media', 'baja']
          .map((r) => `<div><span class="rel rel-${r}"><i></i>Relevancia ${r}</span><span>${esc(s.relevancias[r])}</span></div>`)
          .join('')}
      </div>
    </section>

    <section class="section" aria-labelledby="h-proy">
      <h2 id="h-proy">Los proyectos de la clase</h2>
      <div class="proj-chips">
        ${store.proyectos
          .map(
            (pr) => `<a class="proj-chip" href="#/proyectos/${pr.id}" style="--c:var(--series-${pr.color})">
              <span class="pdot is-lg" style="--c:var(--series-${pr.color})">${esc(pr.siglas.slice(0, 2))}</span>
              <span>${esc(pr.nombre_corto)}<small>${esc(pr.alumno_corto)}</small></span></a>`
          )
          .join('')}
      </div>
    </section>

    <footer class="foot">${esc(s.institucion)}</footer>`;

  pintarStats(root, p.estadisticas.filter((d) => store.revisar || !d.solo_si_revisar));
  miniMapa(root);
}

function pintarStats(root, defs) {
  const cont = root.querySelector('#stats');
  cont.innerHTML = defs.map((d) => `<div class="stat"><b data-n="${store.stats[d.clave]}">0</b><span>${esc(d.etiqueta)}</span></div>`).join('');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cont.querySelectorAll('b').forEach((b) => {
    const meta = +b.dataset.n;
    if (reduce) { b.textContent = meta; return; }
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      b.textContent = Math.round(meta * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && b.isConnected) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

// Miniatura del mapa: va resaltando un proyecto tras otro.
function miniMapa(root) {
  const svg = root.querySelector('#heroSvg');
  const cap = root.querySelector('#vizCap');
  const leyes = leyesOrdenadas();
  const W = 420, H = 380, top = 18, bot = 18;
  const xL = 28, xR = 360;
  const yL = (i) => top + ((H - top - bot) * i) / (leyes.length - 1);
  const yP = (j) => top + 12 + ((H - top - bot - 24) * j) / (store.proyectos.length - 1);
  const li = new Map(leyes.map((l, i) => [l.id, i]));

  let html = '';
  for (const c of store.conexiones) {
    const pj = store.proyIndex.get(c.proyecto);
    const x1 = xL, y1 = yL(li.get(c.ley)), x2 = xR, y2 = yP(pj), xm = (x1 + x2) / 2;
    html += `<path class="hv-line" data-p="${c.proyecto}" data-l="${c.ley}" style="--c:var(--series-${store.proy.get(c.proyecto).color})" d="M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}"/>`;
  }
  leyes.forEach((l, i) => { html += `<circle class="hv-law" data-l="${l.id}" cx="${xL}" cy="${yL(i)}" r="4"/>`; });
  store.proyectos.forEach((pr, j) => {
    html += `<g><circle class="hv-proj" cx="${xR}" cy="${yP(j)}" r="11" stroke="var(--series-${pr.color})"/><text class="hv-ptxt" x="${xR + 18}" y="${yP(j) + 4}">${esc(pr.siglas)}</text></g>`;
  });
  svg.innerHTML = html;
  svg.setAttribute('viewBox', `0 0 ${W + 40} ${H}`);

  let k = 0;
  const paso = () => {
    const pr = store.proyectos[k % store.proyectos.length];
    const leyesDe = new Set(store.porProy.get(pr.id).map((c) => c.ley));
    svg.querySelectorAll('.hv-line').forEach((p) => { p.classList.toggle('on', p.dataset.p === pr.id); });
    svg.querySelectorAll('.hv-law').forEach((d) => {
      const on = leyesDe.has(d.dataset.l);
      d.classList.toggle('on', on);
      if (on) d.style.setProperty('--c', `var(--series-${pr.color})`);
    });
    cap.style.setProperty('--c', `var(--series-${pr.color})`);
    cap.querySelector('span').textContent = `${pr.nombre_corto} · ${leyesDe.size} ${leyesDe.size === 1 ? 'ley' : 'leyes'}`;
    k++;
  };
  paso();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(paso, 2600);
}

export function unmount() {
  clearInterval(timer);
  timer = null;
}
