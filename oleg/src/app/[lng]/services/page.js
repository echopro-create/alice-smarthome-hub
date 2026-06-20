import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/dictionaries';
import styles from './page.module.css';

const servicesList = [
  'classic', 'anti-cellulite', 'sports', 'lymphatic-drainage',
  'cupping', 'hot-stone', 'turkish-foam', 'natural-massage'
];

export async function generateMetadata({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);
  return {
    title: dict.services.title,
    description: dict.services.sub,
    openGraph: {
      title: dict.services.title,
      description: dict.services.sub,
    },
  };
}

export default async function ServicesPage({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>{dict.services.title}</h1>
          <p className={styles.sub}>{dict.services.sub}</p>
        </header>

        <div className={styles.grid} role="list">
          {servicesList.map((id) => {
            const s = dict.services[id];
            if (!s) return null;
            return (
              <Link key={id} href={`/${lng}/services/${id}`} className={styles.card} role="listitem">
                <div className={styles.cardImage}>
                  <Image
                    src={`/images/services/${id}.webp`}
                    alt={s.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={styles.img}
                  />
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{s.name}</h3>
                  <p className={styles.cardDesc}>{s.shortDesc}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>{s.price} SEK</span>
                    <span className={styles.detail}>{dict.common.details} →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
