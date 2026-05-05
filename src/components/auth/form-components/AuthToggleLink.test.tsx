import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthToggleLink from './AuthToggleLink';

describe('AuthToggleLink', () => {
  it('renderiza el texto y el enlace', () => {
    const onClick = vi.fn();
    render(<AuthToggleLink text="¿Tienes cuenta?" linkText="Inicia sesión" onClick={onClick} />);

    expect(screen.getByText('¿Tienes cuenta?')).toBeInTheDocument();
    expect(screen.getByText('Inicia sesión')).toBeInTheDocument();
  });

  it('dispara onClick al hacer click en el enlace', () => {
    const onClick = vi.fn();
    render(<AuthToggleLink text="¿Tienes cuenta?" linkText="Inicia sesión" onClick={onClick} />);

    fireEvent.click(screen.getByText('Inicia sesión'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('dispara onClick al presionar Enter sobre el enlace', () => {
    const onClick = vi.fn();
    render(<AuthToggleLink text="¿Tienes cuenta?" linkText="Inicia sesión" onClick={onClick} />);

    fireEvent.keyDown(screen.getByText('Inicia sesión'), { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
