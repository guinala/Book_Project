import { describe, it, expect } from "vitest";
import { scoreTitleRelevance, scoreAuthorRelevance } from "./titleSearch";

const BALLENA =
  "El Nombre de la Ballena Colección Los Especiales de a la Orilla del Viento";

describe("scoreTitleRelevance", () => {
  it("pone el título exacto por encima de uno largo que contiene las mismas palabras (query con stopwords)", () => {
    const q = "el nombre del viento";
    expect(scoreTitleRelevance(q, "El nombre del viento")).toBeGreaterThan(
      scoreTitleRelevance(q, BALLENA)
    );
  });

  it("funciona con query sin stopwords (exactitud por conjunto de tokens)", () => {
    const q = "nombre viento";
    expect(scoreTitleRelevance(q, "El nombre del viento")).toBeGreaterThan(
      scoreTitleRelevance(q, BALLENA)
    );
  });

  it("pone el título exacto por encima de un superconjunto ('el último deseo')", () => {
    const q = "el último deseo";
    expect(scoreTitleRelevance(q, "El último deseo")).toBeGreaterThan(
      scoreTitleRelevance(q, "El último deseo de los justos")
    );
  });

  it("da 0 cuando ninguna palabra de la query aparece", () => {
    expect(scoreTitleRelevance("dune", "El nombre del viento")).toBe(0);
  });
});

describe("scoreAuthorRelevance", () => {
  it("pone al autor exacto por encima de uno que solo comparte el nombre de pila", () => {
    const q = "brandon sanderson";
    expect(scoreAuthorRelevance(q, ["Brandon Sanderson"])).toBeGreaterThan(
      scoreAuthorRelevance(q, ["Brandon Mull"])
    );
  });

  it("toma el mejor autor de un libro con varios", () => {
    const q = "brandon sanderson";
    expect(
      scoreAuthorRelevance(q, ["Otro Autor", "Brandon Sanderson"])
    ).toBe(scoreAuthorRelevance(q, ["Brandon Sanderson"]));
  });

  it("0 si no hay autores", () => {
    expect(scoreAuthorRelevance("brandon", [])).toBe(0);
  });
});

