import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer({ lng, dict }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} container`}>
        <div className={styles.grid}>
          {/* Колонка 1: Логотип и мини-описание */}
          <div className={styles.brand}>
            <Link href={`/${lng}`} className={styles.logo}>
              <span>{dict.common.logo.split(' ')[0]}</span>
              <span className={styles.logoAccent}>{dict.common.logo.split(' ')[1]}</span>
            </Link>
            <p className={styles.tagline}>{dict.home.heroSub.split('.')[0]}.</p>
          </div>

          {/* Колонка 2: Быстрые ссылки */}
          <div className={styles.links}>
            <h4 className={styles.heading}>{dict.nav.services}</h4>
            <div className={styles.linksGrid}>
              <Link href={`/${lng}#services`} className={styles.link}>{dict.services.classic.name}</Link>
              <Link href={`/${lng}#services`} className={styles.link}>{dict.services.sports.name}</Link>
              <Link href={`/${lng}#services`} className={styles.link}>{dict.services['hot-stone']?.name || 'Hot Stone'}</Link>
              <Link href={`/${lng}/gallery`} className={styles.link}>{dict.nav.gallery}</Link>
            </div>
          </div>

          {/* Колонка 3: Контакты / Соцсети */}
          <div className={styles.contacts}>
            <h4 className={styles.heading}>Social & Contacts</h4>
            <ul className={styles.contactList}>
              <li>
                <a href="https://instagram.com/#" target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://t.me/#" target="_blank" rel="noopener noreferrer" className={styles.link}>
                  Telegram
                </a>
              </li>
              <li>
                <Link href={`/${lng}/contacts`} className={styles.link}>
                  {dict.nav.contacts}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            &copy; {currentYear} {dict.common.logo}. All rights reserved.
          </p>
          <div className={styles.info}>
            <span>Stockholm, Sweden</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
