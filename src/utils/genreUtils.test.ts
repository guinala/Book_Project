import { describe, it, expect } from 'vitest';
import { genreToI18nKey, detectGenre } from './genreUtils';

describe('genreToI18nKey', () => {
  it('convierte el género a llave i18n en minúsculas y sin espacios', () => {
    expect(genreToI18nKey('Science Fiction')).toBe('science_fiction');
    expect(genreToI18nKey('Dark-Fantasy')).toBe('dark_fantasy');
    expect(genreToI18nKey('Magic & Mystery')).toBe('magic__mystery');
  });
});

describe('detectGenre', () => {
  it('detecta Fantasy a partir de subjects relacionados', () => {
    expect(detectGenre(['fantasy fiction'])).toBe('Fantasy');
  });

  it('detecta Historical Fiction a partir de subjects relacionados', () => {
    expect(detectGenre(['history'])).toBe('Historical Fiction');
  });

  it('devuelve Fiction cuando aparece fiction sin match exacto', () => {
    expect(detectGenre(['fiction'])).toBe('Fiction');
  });

  it('devuelve Non-Fiction cuando no hay coincidencias pero hay subject', () => {
    expect(detectGenre(['biography'])).toBe('Non-Fiction');
  });

  it('devuelve undefined si no hay subjects', () => {
    expect(detectGenre(undefined)).toBeUndefined();
    expect(detectGenre([])).toBeUndefined();
  });
});
