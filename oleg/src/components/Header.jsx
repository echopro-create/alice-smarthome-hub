'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Header.module.css';

export default function Header({ lng, dict }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: `/${lng}`, label: dict.nav.home },
    { href: `/${lng}#services`, label: dict.nav.services }, // Ссылка на якорь на главной или отдельную страницу
    { href: `/${lng}/gallery`, label: dict.nav.gallery },
    { href: `/${lng}/contacts`, label: dict.nav.contacts }
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className={`${styles.header} glass`}>
      <div className={`${styles.container} container`}>
        {/* Логотип */}
        <Link href={`/${lng}`} className={styles.logo} onClick={closeMenu}>
          <span>{dict.common.logo.split(' ')[0]}</span>
          <span className={styles.logoAccent}>{dict.common.logo.split(' ')[1]}</span>
        </Link>

        {/* Десктопное меню */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
            // Для главной проверяем строгое совпадение, для других — вхождение
            const isActive = item.href.endsWith('#services') 
              ? pathname.includes('/services')
              : pathname === item.href;
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Действия (Переключатель темы, языка, запись) */}
        <div className={styles.actions}>
          <ThemeToggle />
          <LanguageSwitcher />
          <Link href={`/${lng}/contacts`} className={styles.bookBtn}>
            {dict.common.bookNow}
          </Link>
        </div>

        {/* Кнопка мобильного меню */}
        <button 
          className={`${styles.burger} ${isOpen ? styles.burgerActive : ''}`} 
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Мобильное меню */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.mobileMenuOpen : ''} glass`}>
        <nav className={styles.mobileNav}>
          {navItems.map((item) => {
            const isActive = item.href.endsWith('#services') 
              ? pathname.includes('/services')
              : pathname === item.href;

            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`${styles.mobileNavLink} ${isActive ? styles.mobileActiveLink : ''}`}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}
          <div className={styles.mobileActions}>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
          <Link href={`/${lng}/contacts`} className={styles.mobileBookBtn} onClick={closeMenu}>
            {dict.common.bookNow}
          </Link>
        </nav>
      </div>
    </header>
  );
}
