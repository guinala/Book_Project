import type { ListBook } from "@/types/BookList";
import { describe, expect, it } from "vitest";
import { getListCoverUrls, isValidListName, listBookToBook } from "./bookListUtils";

const mk = (key: string, cover?: string): ListBook => ({
    key, title: `T-${key}`, authors: ["A"], cover_url: cover,
});

describe("getListCoverUrls", () => {
    it("devuelve las 4 primeras portadas válidas", () => {
        const books = [mk("1", "c1"), mk("2", "c2"), mk("3", "c3"), mk("4", "c4"), mk("5", "c5")];
        expect(getListCoverUrls(books)).toEqual(["c1", "c2", "c3", "c4"]);
    });
    it("ignora libros sin portada", () => {
        const books = [mk("1", "c1"), mk("2"), mk("3", "c3")];
        expect(getListCoverUrls(books)).toEqual(["c1", "c3"]);
    });
    it("devuelve [] si no hay portadas", () => {
        expect(getListCoverUrls([mk("1"), mk("2")])).toEqual([]);
    });
});

describe("isValidListName", () => {
  it("acepta un nombre con texto", () => {
    expect(isValidListName("Mis favoritos")).toBe(true);
  });
  it("rechaza vacío o solo espacios", () => {
    expect(isValidListName("")).toBe(false);
    expect(isValidListName("   ")).toBe(false);
  });
});

describe("listBookToBook", () => {
  it("conserva los campos conocidos y rellena el resto", () => {
    const b = listBookToBook(mk("1", "c1"));
    expect(b.key).toBe("1");
    expect(b.cover_url).toBe("c1");
    expect(b.cover_id).toBeNull();
    expect(b.first_publish_year).toBe(0);
    expect(b.edition_count).toBe(0);
  });
});