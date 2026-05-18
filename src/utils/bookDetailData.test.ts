import { describe, it, expect } from 'vitest';
import { getBookDetailById, FALLBACK_REVIEWS } from './bookDetailData';

describe('bookDetailData', () => {
  it('devuelve el detalle de libro por id conocido', () => {
    const book = getBookDetailById('el-nombre-del-viento');

    expect(book).toBeDefined();
    expect(book.key).toBe('el-nombre-del-viento');
    expect(book.title).toBe('El nombre del viento');
    expect(book.author).toBe('Patrick Rothfuss');
  });

  it('devuelve fallback para id desconocido', () => {
    const book = getBookDetailById('otro-id');

    expect(book.key).toBe('el-nombre-del-viento');
    expect(book.title).toBe('El nombre del viento');
  });

  it('exporta FALLBACK_REVIEWS con al menos tres reseñas', () => {
    expect(FALLBACK_REVIEWS).toBeInstanceOf(Array);
    expect(FALLBACK_REVIEWS.length).toBeGreaterThanOrEqual(3);
    expect(FALLBACK_REVIEWS[0]).toHaveProperty('id');
  });
});
