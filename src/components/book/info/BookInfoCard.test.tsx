import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookInfoCard from './BookInfoCard';
import type { BookDetail } from '@/types/BookDetail';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'bookDetail.ratingsCount') return String(options?.total ?? '');
      if (key === 'bookDetail.pages') return 'Páginas';
      if (key === 'bookDetail.published') return 'Publicado';
      if (key === 'bookDetail.isbn') return 'ISBN';
      if (key === 'bookDetail.readMore') return 'Leer más';
      if (key === 'bookDetail.saveBook') return 'Guardar';
      if (key === 'bookDetail.share') return 'Compartir';
      if (key === 'book.coverAlt') return `Portada ${options?.title ?? ''}`;
      if (key === 'bookDetail.viewBook') return 'Ver libro';
      if (key === 'explore.saveTooltip') return 'Guarda este libro';
      if (key.startsWith('myLibrary.shelf.')) return key.replace('myLibrary.shelf.', 'Shelf: ');
      if (key.startsWith('book.genres.')) return key.replace('book.genres.', 'Genre: ');
      return key;
    },
  }),
}));

vi.mock('@/hooks/useShelf', () => ({
  useShelf: () => ({
    addBook: vi.fn(),
    removeBook: vi.fn(),
    getStatus: () => null,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const mockBook: BookDetail = {
  key: '/works/OL123W',
  title: 'El Nombre del Viento',
  author: 'Patrick Rothfuss',
  authorKey: 'OL123A',
  cover_url: 'https://example.com/cover.jpg',
  genre: 'fantasy',
  rating: 4.5,
  reviewCount: 2500,
  pages: 662,
  year: 2007,
  isbn: '978-8466656894',
  synopsis: 'Una historia fascinante...',
  reviews: [],
  authorInfo: { name: '', photoUrl: '', bio: '', books: [] },
  recommendations: [],
};

describe('BookInfoCard', () => {
  it('renderiza el título y el autor', () => {
    render(<BookInfoCard book={mockBook} />);

    expect(screen.getByText('El Nombre del Viento')).toBeInTheDocument();
    expect(screen.getByText('Patrick Rothfuss')).toBeInTheDocument();
  });

  it('muestra la puntuación y el recuento de valoraciones formateado', () => {
    render(<BookInfoCard book={mockBook} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('2.5K')).toBeInTheDocument();
  });

  it('muestra las páginas y el ISBN', () => {
    render(<BookInfoCard book={mockBook} />);

    expect(screen.getByText('662')).toBeInTheDocument();
    expect(screen.getByText('978-8466656894')).toBeInTheDocument();
  });

  it('renderiza el botón de leer más sinopsis', () => {
    render(<BookInfoCard book={mockBook} />);

    expect(screen.getByRole('button', { name: /Leer más/i })).toBeInTheDocument();
  });
});