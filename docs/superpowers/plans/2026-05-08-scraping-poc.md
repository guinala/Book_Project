# Scraping de sinopsis — POC en PHP+XAMPP y Cloud Functions

**Fecha:** 2026-05-08
**Estado:** Documento de exploración. NO es un plan aprobado para implementar — es una referencia técnica de las dos vías valoradas para scrapear sinopsis cuando Google Books no las cubre.

---

## Contexto

Google Books devuelve 503 ("backend failed") con cierta frecuencia para `fetchGoogleSynopsis`. Antes de añadir un backend de scraping, lo correcto es aplicar primero los fixes del **Frente A** del plan [2026-05-08-fix-google-synopsis.md](2026-05-08-fix-google-synopsis.md) (retry con backoff, timeout, bug del título vacío). Si tras esos fixes los 503 caen >80%, no hace falta scraping.

Este documento describe **cómo se haría** el scraping en cada una de las dos arquitecturas evaluadas, **no si se debe hacer**. Esa decisión se posterga hasta medir el impacto del Frente A.

---

## Riesgos comunes a ambas vías

Independientes del lenguaje y del hosting:

1. **Cloudflare / anti-bot.** Sitios como Goodreads, Amazon, Casa del Libro o FNAC usan protección anti-bot agresiva. Lecturalia, en cambio, **no la tiene activada** según nuestras pruebas del 2026-05-08 (ver "Hallazgos de la validación"). Cuando hay anti-bot, suelen detectar vía:
   - Fingerprint TLS (JA3)
   - Headers HTTP (`User-Agent`, `Accept-Language`, orden)
   - Falta de ejecución de JavaScript
   - Reputación de la IP de origen
   - Patrones de comportamiento

   Ya verificado con LibraryThing: Cloudflare bloquea cualquier petición server-side sin cookies de navegador real.

2. **Cambios de HTML.** El día que el sitio cambie `div.resumen` por `section.book-summary`, el scraper devuelve cadena vacía sin avisar.

3. **Términos de servicio.** Casi todos los sitios prohíben scraping en su TOS. Para uso personal/pequeño se suele tolerar; en producción y a escala expone a cease-and-desist.

4. **Velocidad.** Cada sinopsis = 2 requests HTTP en serie + parseo HTML. Más lento que una API.

---

## Flujo común a ambas implementaciones

```
React → backend (PHP o Cloud Function) → slugificar(title+author) →
  GET /s/{slug} en Lecturalia → primer <a href="/libro/..."> →
  descargar ficha → extraer <p> tras "Resumen y sinopsis" → JSON
```

El ejemplo usa **Lecturalia** como sitio destino. URLs y selectores **validados el 2026-05-08** contra el sitio real (ver sección "Hallazgos de la validación" más abajo).

---

## Hallazgos de la validación (2026-05-08)

Antes de cerrar la primera versión del documento, los URLs y selectores que se proponían eran placeholders inventados (`/buscar.php?busqueda=...`, `div.list-libro`, `div.resumen`). Una primera ejecución contra Lecturalia devolvió `synopsis: ""` con `http_status: 404` — el endpoint no existía. Tras inspeccionar el sitio real:

**URL de búsqueda:** `https://www.lecturalia.com/s/{slug}` (path-based, no query string).

El slug es el título (y opcionalmente el autor) en minúsculas, sin diacríticos, con espacios convertidos a guiones. Ej.: `"El nombre del viento" + "Rothfuss"` → `el-nombre-del-viento-rothfuss`.

**Selector del primer resultado de búsqueda:**
```xpath
(//a[contains(@href, '/libro/')])[1]/@href
```

El href ya viene absoluto (`https://www.lecturalia.com/libro/30349/el-nombre-del-viento`), no relativo, así que no hace falta concatenar dominio. El código lo gestiona por seguridad.

**Selector de la sinopsis:** la sinopsis NO está dentro de un contenedor con clase. Está en `<p>` hermanos del `<h2>` cuyo texto empieza por "Resumen y sinopsis", parando en el siguiente `<h2>`:

```xpath
//h2[contains(text(), 'Resumen y sinopsis')]/following-sibling::*
```

Iterar y romper al primer `<h2>` siguiente. Verificado contra `/libro/30349/el-nombre-del-viento`: el primer párrafo arranca con *"He robado princesas a reyes agónicos..."*, que es la apertura real de la novela.

**Estado anti-bot:** Lecturalia respondió 200 a peticiones server-side con `User-Agent` de Chrome y sin cookies. **No se observó protección Cloudflare** en este sitio (al contrario que LibraryThing). Esto es un hallazgo positivo, pero podría cambiar — el sitio no garantiza nada.

---

## Opción A — PHP + XAMPP

### Dónde colocar el archivo

PHP **debe** vivir dentro del document root de Apache, **no** dentro del proyecto React (Vite no ejecuta PHP).

```
C:\xampp\htdocs\booksynopsis\
  └── synopsis.php
```

### Setup

1. Abrir XAMPP Control Panel y arrancar **Apache**. Si el puerto 80 está ocupado (IIS, Skype, etc.), cambiar a 8080 en `Config → httpd.conf` (`Listen 80` → `Listen 8080`).
2. Crear `C:\xampp\htdocs\booksynopsis\`.
3. Pegar `synopsis.php` dentro.
4. Verificar abriendo en el navegador `http://localhost/booksynopsis/synopsis.php?title=El%20nombre%20del%20viento&author=Rothfuss` (o `:8080/...` si cambiaste el puerto). Debe devolver JSON con la sinopsis del libro, no el código fuente.

### `synopsis.php`

Versión con diagnósticos integrados — devuelve un objeto `debug` y un campo `fail_step` que indican exactamente en qué paso muere si algo va mal. En producción se puede simplificar (quitar `debug`/`fail_step`) una vez validado.

```php
<?php
// Permitir que tu app React (otro puerto) llame a este endpoint
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

$title  = $_GET['title']  ?? '';
$author = $_GET['author'] ?? '';

$debug = ['params' => ['title' => $title, 'author' => $author]];

if (!$title) {
    http_response_code(400);
    echo json_encode(['error' => 'title required', 'debug' => $debug]);
    exit;
}

function fetchHtml(string $url, array &$debug, string $stepKey): ?string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                                . 'AppleWebKit/537.36 (KHTML, like Gecko) '
                                . 'Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml',
            'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
        ],
    ]);
    $html   = curl_exec($ch);
    $info   = curl_getinfo($ch);
    $errmsg = curl_error($ch);
    curl_close($ch);

    $debug[$stepKey] = [
        'url'         => $url,
        'http_status' => $info['http_code'] ?? null,
        'curl_error'  => $errmsg,
        'html_length' => is_string($html) ? strlen($html) : null,
    ];

    return ($info['http_code'] === 200 && is_string($html)) ? $html : null;
}

// Convierte "El nombre del viento Rothfuss" → "el-nombre-del-viento-rothfuss"
function slugify(string $text): string {
    $text = mb_strtolower($text, 'UTF-8');
    $text = strtr($text, [
        'á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u',
        'ñ'=>'n','ü'=>'u','¿'=>'','¡'=>'',
    ]);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

// Paso 1 — buscar (Lecturalia usa /s/{slug}, NO /buscar?...)
$query      = $author ? "$title $author" : $title;
$slug       = slugify($query);
$searchUrl  = "https://www.lecturalia.com/s/$slug";
$debug['slug_used'] = $slug;

$searchHtml = fetchHtml($searchUrl, $debug, 'search_request');

if (!$searchHtml) {
    echo json_encode([
        'synopsis'  => '',
        'fail_step' => 'search_request_failed',
        'debug'     => $debug,
    ]);
    exit;
}

// Paso 2 — primer enlace que apunte a /libro/
$dom = new DOMDocument();
@$dom->loadHTML($searchHtml);
$xpath = new DOMXPath($dom);
$hrefs = $xpath->query("(//a[contains(@href, '/libro/')])[1]/@href");

$debug['search_extract'] = [
    'matches_count' => $hrefs->length,
    'first_href'    => $hrefs->length > 0 ? $hrefs->item(0)->nodeValue : null,
];

if ($hrefs->length === 0) {
    echo json_encode([
        'synopsis'  => '',
        'fail_step' => 'search_no_results',
        'debug'     => $debug,
    ]);
    exit;
}

$bookUrl = $hrefs->item(0)->nodeValue;
if (strpos($bookUrl, 'http') !== 0) {
    $bookUrl = 'https://www.lecturalia.com' . $bookUrl;
}

// Paso 3 — descargar la ficha
$bookHtml = fetchHtml($bookUrl, $debug, 'detail_request');

if (!$bookHtml) {
    echo json_encode([
        'synopsis'  => '',
        'fail_step' => 'detail_request_failed',
        'debug'     => $debug,
    ]);
    exit;
}

// Paso 4 — <p> hermanos del h2 "Resumen y sinopsis", hasta el siguiente <h2>
$dom = new DOMDocument();
@$dom->loadHTML($bookHtml);
$xpath = new DOMXPath($dom);
$siblings = $xpath->query(
    "//h2[contains(text(), 'Resumen y sinopsis')]/following-sibling::*"
);

$paragraphs = [];
foreach ($siblings as $node) {
    if ($node->nodeName === 'h2') break;
    if ($node->nodeName === 'p') {
        $paragraphs[] = $node->textContent;
    }
}
$synopsis = trim(implode("\n\n", $paragraphs));

$debug['synopsis_extract'] = ['paragraphs_found' => count($paragraphs)];

echo json_encode([
    'synopsis'  => $synopsis,
    'fail_step' => $synopsis === '' ? 'synopsis_extract_empty' : null,
    'debug'     => $debug,
]);
```

### Llamar desde React

```ts
// src/services/api/scraperApi.ts
export async function fetchScrapedSynopsis(
  title: string,
  author: string
): Promise<string> {
  const url = `http://localhost/booksynopsis/synopsis.php`
    + `?title=${encodeURIComponent(title)}`
    + `&author=${encodeURIComponent(author)}`;
  const r = await fetch(url);
  if (!r.ok) return '';
  const { synopsis } = await r.json();
  return synopsis ?? '';
}
```

### Limitación crítica

**Solo funciona mientras XAMPP esté encendido en tu máquina y solo desde tu propia máquina.** No vale para producción ni para Capacitor (móvil) — el navegador del usuario no puede resolver tu `localhost`.

---

## Opción B — Firebase Cloud Functions

### Setup

```bash
npm install -g firebase-tools
firebase login
firebase init functions          # elegir TypeScript

cd functions
npm install axios cheerio
npm install --save-dev @types/cheerio
```

### `functions/src/index.ts`

```ts
import { onRequest } from "firebase-functions/v2/https";
import axios from "axios";
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
         + "AppleWebKit/537.36 (KHTML, like Gecko) "
         + "Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { data, status } = await axios.get<string>(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      timeout: 8000,
      maxRedirects: 5,
      responseType: "text",
    });
    return status === 200 ? data : null;
  } catch {
    return null;
  }
}

// Convierte "El nombre del viento Rothfuss" → "el-nombre-del-viento-rothfuss"
// Nota: ̀-ͯ es el rango Unicode de marcas diacríticas combinantes;
// tras NFD, los acentos quedan separados de la letra base y los borramos.
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const scrapeSynopsis = onRequest(
  { cors: true, timeoutSeconds: 15, memory: "256MiB" },
  async (req, res) => {
    const title  = String(req.query.title  ?? "");
    const author = String(req.query.author ?? "");

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    // Paso 1 — buscar (path-based: /s/{slug})
    const slug       = slugify(author ? `${title} ${author}` : title);
    const searchUrl  = `https://www.lecturalia.com/s/${slug}`;
    const searchHtml = await fetchHtml(searchUrl);
    if (!searchHtml) { res.json({ synopsis: "" }); return; }

    // Paso 2 — primer enlace a /libro/
    const $s = cheerio.load(searchHtml);
    const href = $s('a[href*="/libro/"]').first().attr("href");
    if (!href) { res.json({ synopsis: "" }); return; }

    // Paso 3 — descargar ficha (el href ya viene absoluto en Lecturalia)
    const bookUrl = href.startsWith("http")
      ? href
      : `https://www.lecturalia.com${href}`;
    const bookHtml = await fetchHtml(bookUrl);
    if (!bookHtml) { res.json({ synopsis: "" }); return; }

    // Paso 4 — <p> hermanos del h2 "Resumen y sinopsis", hasta el siguiente <h2>
    const $d = cheerio.load(bookHtml);
    const $h2 = $d('h2:contains("Resumen y sinopsis")').first();
    const synopsis = $h2
      .nextUntil("h2", "p")
      .map((_, el) => $d(el).text())
      .get()
      .join("\n\n")
      .trim();

    res.json({ synopsis });
  }
);
```

### Desplegar

```bash
firebase deploy --only functions
```

Te dará una URL tipo `https://scrapesynopsis-abc123-uc.a.run.app` (Functions v2 corre sobre Cloud Run por debajo).

### Llamar desde React

```ts
// src/services/api/scraperApi.ts
const FN_URL = import.meta.env.VITE_SCRAPE_FUNCTION_URL;
//             ej. "https://scrapesynopsis-abc123-uc.a.run.app"

export async function fetchScrapedSynopsis(
  title: string,
  author: string
): Promise<string> {
  const url = `${FN_URL}`
    + `?title=${encodeURIComponent(title)}`
    + `&author=${encodeURIComponent(author)}`;
  const r = await fetch(url);
  if (!r.ok) return '';
  const { synopsis } = await r.json();
  return synopsis ?? '';
}
```

### Limitación crítica

Funciona en producción y desde móvil, pero **las IPs de Google Cloud están sistemáticamente marcadas por Cloudflare y los grandes sistemas anti-bot.** Probabilidad de ser bloqueado: alta para Goodreads/Amazon/sitios populares. Más viable para sitios pequeños sin protección.

---

## Comparación lado a lado

| | **PHP + XAMPP** | **Cloud Functions** |
|---|---|---|
| Tiempo de setup inicial | 5 min (XAMPP ya instalado) | 30-60 min (firebase init, deploy) |
| Funciona offline / sin tu PC | ❌ No | ✅ Sí |
| Funciona desde móvil (Capacitor) | ❌ No | ✅ Sí |
| Funciona en producción real | ❌ No | ✅ Sí |
| Coste | 0 € | 0 € (free tier 2M req/mes) |
| API key oculta server-side | ✅ Sí | ✅ Sí |
| Probabilidad de pasar Cloudflare | Media (IP residencial) | **Baja** (IPs Google Cloud marcadas) |
| Mantenimiento HTML | Igual de frágil en ambos | Igual |
| Lenguaje | PHP | TypeScript/JS (lo que ya usa la app) |

---

## Ruta recomendada de validación

Antes de invertir tiempo en migrar a Cloud Functions:

1. **Prerequisito:** verificar que el Frente A del plan `2026-05-08-fix-google-synopsis.md` está aplicado y los 503 siguen siendo problema.
2. **Prueba de concepto en PHP+XAMPP** (15 min): verificar si el sitio destino devuelve HTML útil o si Cloudflare bloquea desde IP residencial.
3. **Si el POC en XAMPP pasa Cloudflare** → considerar el porte a Cloud Functions, sabiendo que la IP de datacenter puede revertir el éxito.
4. **Si el POC en XAMPP ya falla** → no portar. Buscar otra fuente (Hardcover GraphQL como segunda fuente de sinopsis, ver `2026-05-08-synopsis-multi-source.md` Fase Futura).

---

## Tareas que NO entran en este documento

- Decisión sobre qué sitio scrapear concretamente (Lecturalia es solo el ejemplo).
- Estrategia de caché de los resultados scrapeados (probablemente Firestore como ya hace con `synopsis`).
- Cómo integrarlo en el waterfall actual (`fetchGoogleSynopsis` → fallback scraping).
- Manejo de rate limiting propio para no machacar el sitio destino.
- Política de respeto a `robots.txt`.

Estas decisiones se tomarán **después** de validar el POC, no antes.
