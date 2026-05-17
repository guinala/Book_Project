/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// import { onRequest } from "firebase-functions/v2/https";
import axios from "axios";
import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0.0.0 Safari/537.36";

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

function extractSynopsis(html: string): string {
  const $ = cheerio.load(html);

  const heading = $("h1, h2, h3, h4")
    .filter((_, el) => {
      const text = cleanText($(el).text()).toLowerCase();
      return text.includes("resumen") || text.includes("sinopsis");
    })
    .first();

  if (!heading.length) return "";

  const paragraphs: string[] = [];
  let buffer = "";

  let node = heading[0].nextSibling;

  while (node) {
    if (node.type === "tag") {
      const el = $(node);
      const tag = node.tagName?.toLowerCase();

      if (["h1", "h2", "h3", "h4"].includes(tag)) break;

      if (tag === "br") {
        const text = cleanText(buffer);
        if (text) paragraphs.push(text);
        buffer = "";
      } else if (!el.hasClass("promo")) {
        const text = cleanText(el.text());
        if (text) paragraphs.push(text);
      }
    }

    if (node.type === "text") {
      buffer += ` ${node.data}`;
    }

    node = node.nextSibling;
  }

  const last = cleanText(buffer);
  if (last) paragraphs.push(last);

  return [...new Set(paragraphs)]
    .filter((p) => !p.includes("Ha participado en esta ficha"))
    .join("\n\n")
    .trim();
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

    const queries = author ? [title, `${title} ${author}`] : [title];

    for (const query of queries) {
      const slug = slugify(query);
      const searchUrl = `https://www.lecturalia.com/s/${slug}`;
      const searchHtml = await fetchHtml(searchUrl);

      if (!searchHtml) continue;

      const $s = cheerio.load(searchHtml);
      const href = $s('a[href*="/libro/"]').first().attr("href");

      if (!href) continue;

      const bookUrl = absoluteLecturaliaUrl(href);
      const bookHtml = await fetchHtml(bookUrl);

      if (!bookHtml) continue;

      const synopsis = extractSynopsis(bookHtml);

      if (synopsis) {
        res.json({
          synopsis,
          source: "lecturalia",
          bookUrl,
        });
        return;
      }
    }

    res.json({
      synopsis: "",
      source: "lecturalia",
    });
  }
);

// Sistema de follow (callable functions).
export * from "./follows";


