import { describe, it, expect, vi } from 'vitest';
import { mapOpenLibraryDoc } from './bookMapper';
import type { OpenLibraryDoc } from '@/types/OpenLibrary';

vi.mock('@/plugins/i18n/i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('mapOpenLibraryDoc', () => {
  it('mapea un documento OpenLibrary a Book', () => {
    const doc: OpenLibraryDoc = {
      key: '/works/OL123W',
      title: 'El Nombre del Viento',
      author_name: ['Patrick Rothfuss'],
      first_publish_year: 2007,
      cover_i: 123,
      edition_count: 1,
    };

    expect(mapOpenLibraryDoc(doc)).toEqual({
      key: '/works/OL123W',
      title: 'El Nombre del Viento',
      authors: ['Patrick Rothfuss'],
      first_publish_year: 2007,
      cover_id: 123,
      edition_count: 1,
    });
  });

  it('usa autor desconocido cuando no hay author_name', () => {
    const doc: OpenLibraryDoc = {
      key: '/works/OL123W',
      title: 'El Nombre del Viento',
      first_publish_year: 2007,
      cover_i: undefined,
      edition_count: 1,
    };

    expect(mapOpenLibraryDoc(doc)).toEqual({
      key: '/works/OL123W',
      title: 'El Nombre del Viento',
      authors: ['book.unknownAuthor'],
      first_publish_year: 2007,
      cover_id: null,
      edition_count: 1,
    });
  });
});
