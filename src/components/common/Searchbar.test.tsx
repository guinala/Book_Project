import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './Searchbar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SearchBar', () => {
  it('renderiza el título y el campo de búsqueda', () => {
    render(<SearchBar />);

    expect(screen.getByText('Descubre tu próxima trama')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('explore.searchPlaceholder')).toBeInTheDocument();
  });

  it('actualiza el input cuando se escribe y dispara onSearch al presionar Enter', async () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText('explore.searchPlaceholder');
    await userEvent.type(input, '  historia  ');
    await userEvent.keyboard('{Enter}');

    expect(handleSearch).toHaveBeenCalledTimes(1);
    expect(handleSearch).toHaveBeenCalledWith('historia', 'todo');
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
