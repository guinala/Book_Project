import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import axios from "axios";
import * as cheerio from "cheerio";

// Límite de contenedores concurrentes (control de coste).
setGlobalOptions({ maxInstances: 10 });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.0.0 Safari/537.36";

type Candidate = { url: string; title: string; author: string };

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const { data, status } = await axios.get<string>(url, {
      timeout: 10000,
      maxRedirects: 5,
      responseType: "text",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    return status === 200 ? data : null;
  } catch {
    return null;
  }
}

function absoluteLecturaliaUrl(href: string): string {
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `https://www.lecturalia.com${href}`;
  return href;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/"{2,}/g, "\"")
    .trim();
}

// Normaliza para comparar: sin acentos, minúsculas, solo alfanumérico.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((w) => w.length >= 3);
}

// Lee TODOS los libros de la página de resultados completa, con su autor.
function collectCandidates(html: string): Candidate[] {
  const $ = cheerio.load(html);
  const out: Candidate[] = [];
  $(".datalist--img li").each((_, li) => {
    const $li = $(li);
    const $book = $li.find('a[href*="/libro/"]').first();
    const href = $book.attr("href");
    if (!href) return;
    out.push({
      url: absoluteLecturaliaUrl(href),
      title: cleanText($book.text()),
      author: cleanText($li.find('a[href*="/autor/"]').first().text()),
    });
  });
  return out;
}

// Puntúa un candidato: parecido de título + el autor como desempate fuerte.
function scoreCandidate(
  c: Candidate,
  reqTitle: string,
  reqAuthor: string
): number {
  const candTitle = tokens(c.title);
  const reqTitleTokens = tokens(reqTitle);
  const overlap = reqTitleTokens.length
    ? reqTitleTokens.filter((w) => candTitle.includes(w)).length /
      reqTitleTokens.length
    : 0;

  let score = norm(c.title) === norm(reqTitle) ? 1 : overlap;

  if (reqAuthor) {
    const candAuthor = tokens(c.author);
    const authorMatch = tokens(reqAuthor).some((w) => candAuthor.includes(w));
    score += authorMatch ? 1 : -0.5;
  }

  return score;
}

function extractSynopsis(html: string): string {
  const $ = cheerio.load(html);

  const heading = $("h1, h2, h3, h4")
    .filter((_, el) => {
      const text = cleanText($(el).text()).toLowerCase();
      return text.includes("resumen") || text.includes("sinopsis");
    })
    .first();

  if (!heading.length) return "";

  // La sinopsis son los <p> hermanos del encabezado. Los anuncios
  // (div.promo) y el bloque de premios/participantes van en <div>, no en <p>.
  const paragraphs: string[] = [];
  let started = false;

  heading.parent().children().each((_, el) => {
    if (el === heading[0]) {
      started = true;
      return;
    }
    if (!started) return;

    const tag = (el.tagName || "").toLowerCase();
    if (["h1", "h2", "h3", "h4"].includes(tag)) {
      started = false; // siguiente encabezado → fin de la sinopsis
      return;
    }
    if (tag !== "p") return; // ignora div.promo y el div de premios/participantes

    const $el = $(el);
    if ($el.hasClass("promo") || $el.hasClass("participate")) return;

    const text = cleanText($el.text());
    if (!text) return;
    // Corte defensivo: pie de ficha en cualquiera de sus dos redacciones.
    if (/han? participado en esta ficha/i.test(text)) return;

    paragraphs.push(text);
  });

  return [...new Set(paragraphs)].join("\n\n").trim();
}

export const scrapeSynopsis = onRequest(
  {
    cors: true,
    timeoutSeconds: 15,
    memory: "256MiB",
    region: "europe-west1",
  },
  async (req, res) => {
    const title = String(req.query.title ?? "").trim();
    const author = String(req.query.author ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    // /libros/s/{slug} lista TODOS los libros que coinciden con el término,
    // cada uno con su autor. Se busca solo por título — añadir el autor a la
    // query la rompe. Si el título completo no da nada, se reintenta sin el
    // subtítulo (lo que va tras ":").
    const queries = [title];
    const colon = title.indexOf(":");
    if (colon > 0) queries.push(title.slice(0, colon).trim());

    let candidates: Candidate[] = [];
    for (const query of queries) {
      const html = await fetchHtml(
        `https://www.lecturalia.com/libros/s/${slugify(query)}`
      );
      if (html) candidates = collectCandidates(html);
      if (candidates.length) break;
    }

    // Ordenar por parecido de título + autor (el autor desempata).
    const ranked = candidates
      .map((c) => ({ c, score: scoreCandidate(c, title, author) }))
      .filter((x) => x.score > 0.4)
      .sort((a, b) => b.score - a.score);

    // Probar los mejores candidatos hasta dar con una sinopsis.
    for (const { c } of ranked.slice(0, 3)) {
      const bookHtml = await fetchHtml(c.url);
      if (!bookHtml) continue;
      const synopsis = extractSynopsis(bookHtml);
      if (synopsis) {
        res.json({ synopsis, source: "lecturalia", bookUrl: c.url });
        return;
      }
    }

    res.json({ synopsis: "", source: "lecturalia" });
  }
);

// Sistema de follow (callable functions).
export * from "./follows";
