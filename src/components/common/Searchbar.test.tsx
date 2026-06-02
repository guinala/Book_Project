import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './Searchbar';

const navigateMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}));

describe('SearchBar', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('renderiza el título y el campo de búsqueda', () => {
    render(<SearchBar />);
    expect(screen.getByText('explore.searchTitle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeInTheDocument();
  });

  it('navega a /search tras el debounce al escribir 3+ caracteres', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SearchBar debounceMs={400} />);

    const input = screen.getByPlaceholderText('explore.searchPlaceholder');
    await user.type(input, 'historia');
    vi.advanceTimersByTime(400);

    expect(navigateMock).toHaveBeenCalledWith('/search?q=historia');
    vi.useRealTimers();
  });

  it('muestra el botón de limpiar cuando hay texto y lo borra al hacer click', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('explore.searchPlaceholder');
    await userEvent.type(input, 'prueba');
    const clearButton = screen.getByRole('button', { name: 'search.clearLabel' });
    expect(clearButton).toBeInTheDocument();
    await userEvent.click(clearButton);
    expect(input).toHaveValue('');
  });
});
