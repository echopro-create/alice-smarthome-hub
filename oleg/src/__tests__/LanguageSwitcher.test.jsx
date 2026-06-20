import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import * as navigation from 'next/navigation';

// Переопределим usePathname для тестов, чтобы проверять разные роуты
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('LanguageSwitcher Component', () => {
  it('should render all 4 supported language links with correct href values', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/sv/services/classic');

    render(<LanguageSwitcher />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);

    const hrefs = links.map(link => link.getAttribute('href'));
    expect(hrefs).toContain('/sv/services/classic');
    expect(hrefs).toContain('/en/services/classic');
    expect(hrefs).toContain('/no/services/classic');
    expect(hrefs).toContain('/ru/services/classic');
  });

  it('should apply active class to the link matching the current route language', () => {
    vi.mocked(navigation.usePathname).mockReturnValue('/ru/contacts');

    render(<LanguageSwitcher />);

    const activeLink = screen.getByRole('link', { name: 'RU' });
    expect(activeLink.className).toContain('active');

    const inactiveLink = screen.getByRole('link', { name: 'SV' });
    expect(inactiveLink.className).not.toContain('active');
  });
});
