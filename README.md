# Leyes y software

Sitio web interactivo que conecta las **leyes mexicanas** con los **proyectos de software** de la clase
(UTT, Ingeniería en TI e Innovación Digital, 7º B): eliges una ley y ves a qué proyectos aplica y por qué,
o eliges un proyecto y ves todas sus obligaciones legales.

HTML, CSS y JavaScript puros: sin frameworks, sin dependencias y **sin paso de compilación**.

## Qué tiene

| Sección | Ruta | Qué hace |
|---|---|---|
| Portada | `#/` | De qué trata el trabajo, cifras y botón para entrar al explorador |
| Explorador de leyes | `#/leyes` | Tarjetas con buscador y filtros; al tocar una se abre su detalle (`#/leyes/<id>`) |
| Vista por proyecto | `#/proyectos/<id>` | Todas las leyes que le aplican, con el porqué y los artículos |
| Mapa de conexiones | `#/mapa` | Leyes a la izquierda, proyectos a la derecha; tocar un nodo resalta sus conexiones |
| Conclusiones *(oculta por ahora)* | `#/conclusiones` | Qué leyes aplican a más proyectos y qué proyectos tienen más obligaciones. Se activa con `"mostrar_conclusiones": true` en `data/sitio.json` |

## Estructura

```
index.html          Esqueleto de la página (sin contenido)
css/styles.css      Estilos (tema claro/oscuro, responsive)
js/                 app.js (router), store.js (datos), ui.js, utils.js, icons.js
js/views/           Una vista por sección
data/               TODO el contenido vive aquí
  leyes.json        Leyes y normas, con sus artículos tal como los citan los compañeros
  proyectos.json    Proyectos y sus autores
  conexiones.json   { ley, proyecto, porque, articulos_citados, relevancia, revisar, ... }
  sitio.json        Textos de la portada, temas y leyendas
docs/               Notas sobre los documentos de origen
scripts/            Validador de los datos
netlify.toml        Configuración de Netlify
```

## Probarlo en tu computadora

Los navegadores no permiten leer los JSON si abres `index.html` con doble clic; usa un servidor local:

```powershell
npx serve .
```

(o la extensión **Live Server** de VS Code, o `python -m http.server`) y abre la dirección que te indique.

## Cómo editar el contenido

Nada está escrito en el HTML. Para cambiar o agregar contenido, edita los JSON de `data/`:

- **Nueva ley**: agrega un objeto a `leyes.json` (`articulos` lleva solo lo que el compañero cita).
- **Nuevo proyecto**: agrega un objeto a `proyectos.json` con `color` del 1 al 8 (paleta del sitio).
- **Nueva conexión**: agrega un objeto a `conexiones.json`. Cada `articulos_citados` debe coincidir
  exactamente con un `ref` de `articulos` de esa ley.
- Si no estás seguro de una conexión, pon `"revisar": true` y explica en `nota_revision`.
  Los cruces propuestos (`"tipo": "cruce"`) siempre van con `revisar: true`.

**Mostrar u ocultar lo «por revisar»:** en `data/sitio.json`, `"mostrar_por_revisar": false` oculta las
insignias, notas, filtros y la sección de pendientes (los datos `revisar` se conservan). Cámbialo a `true`
para volver a verlos, por ejemplo cuando quieras revisar las conexiones dudosas.

Valida los datos antes de subir cambios:

```powershell
node scripts/validar-datos.mjs
```

## Reglas de contenido

- No se inventan artículos ni contenido: todo sale de los análisis de los compañeros.
- Cuando el compañero no cita número de artículo, se escribe «Sin artículo citado».
- Es un trabajo académico y no sustituye la asesoría jurídica.

## Publicarlo en Netlify

El sitio ya trae `netlify.toml`: la carpeta raíz se publica tal cual y no hay comando de build.

1. **Sube el repositorio a GitHub**: crea un repositorio vacío en GitHub y, desde esta carpeta:
   ```powershell
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
2. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → **GitHub**
   y autoriza el acceso a tu repositorio.
3. Elige el repositorio. En la configuración deja:
   - **Branch to deploy:** `main`
   - **Build command:** *(vacío)*
   - **Publish directory:** `.`
4. Pulsa **Deploy**. En un minuto tendrás una dirección `https://algo.netlify.app`.
   Puedes cambiar el nombre en **Site configuration → Change site name**.
5. A partir de ahí, cada `git push` a `main` vuelve a publicar el sitio solo.

Alternativa sin GitHub: arrastra la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop).
Antes, mueve fuera de la carpeta los `.zip` y las carpetas «Ya pasaron…» y «No han pasado…» (pesan más de 100 MB y no hacen falta para el sitio).
