import { describe, it, expect } from 'vitest';
import { getSearchParams } from './searchParams';

describe('getSearchParams', () => {
  it('devuelve title para filtro titulo', () => {
    expect(getSearchParams('Harry Potter', 'titulo')).toEqual({ title: 'Harry Potter' });
  });

  it('devuelve author para filtro autor', () => {
    expect(getSearchParams('J.K. Rowling', 'autor')).toEqual({ author: 'J.K. Rowling' });
  });

  it('borra guiones en filter isbn', () => {
    expect(getSearchParams('978-84-1234-567-8', 'isbn')).toEqual({ isbn: '9788412345678' });
  });

  it('usa q para filtro todo', () => {
    expect(getSearchParams('fantasía', 'todo')).toEqual({ q: 'fantasía' });
  });
});
