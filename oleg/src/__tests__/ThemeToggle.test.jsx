import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import ThemeToggle from '../components/ThemeToggle';

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.clearAllMocks();
  });

  const mockSystemTheme = (isDark) => {
    vi.mocked(window.matchMedia).mockImplementation((query) => ({
      matches: isDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  it('should initialize with dark theme if system prefers dark and no theme is saved', () => {
    mockSystemTheme(true);
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should initialize with light theme if system prefers light and no theme is saved', () => {
    mockSystemTheme(false);
    render(<ThemeToggle />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should initialize with theme from localStorage overriding system preference', () => {
    mockSystemTheme(true); // Система хочет темную
    window.localStorage.setItem('theme', 'light'); // Пользователь сохранил светлую
    render(<ThemeToggle />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should toggle theme on click and update localStorage', () => {
    mockSystemTheme(true); // Начинаем с темной
    render(<ThemeToggle />);
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const button = screen.getByRole('button', { name: /toggle theme/i });
    
    // Кликаем для переключения на светлую
    fireEvent.click(button);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');

    // Кликаем еще раз для переключения на темную
    fireEvent.click(button);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});
