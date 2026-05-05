import { describe, it, expect } from 'vitest';
import { getCoverUrl } from './coverImage';

describe('getCoverUrl', () => {
  it('devuelve la URL correcta de portada de Open Library', () => {
    expect(getCoverUrl(12345)).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg');
  });
});
