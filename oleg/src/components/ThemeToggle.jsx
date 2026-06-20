'use client';

import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Получаем текущую тему из атрибута или localStorage
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = savedTheme || systemTheme;
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <button 
      onClick={toggleTheme} 
      className={styles.toggle}
      aria-label="Toggle Theme"
      title="Toggle Theme"
    >
      {theme === 'dark' ? (
        // Солнце (светлая тема)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.icon}>
          <circle cx="12" cy="12" r="5" strokeWidth="2"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        // Луна (темная тема)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.icon}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}
