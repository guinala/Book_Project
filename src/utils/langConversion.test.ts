import { describe, it, expect } from 'vitest';
import { getLangIso3Letters } from './langConversion';

describe('getLangIso3Letters', () => {
  it('devuelve eng para inglés', () => {
    expect(getLangIso3Letters('en')).toBe('eng');
  });

  it('devuelve spa para español', () => {
    expect(getLangIso3Letters('es')).toBe('spa');
  });

  it('devuelve spa como fallback para otros idiomas', () => {
    expect(getLangIso3Letters('pt')).toBe('spa');
    expect(getLangIso3Letters('de')).toBe('spa');
  });
});
