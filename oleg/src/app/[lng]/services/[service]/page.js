import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/dictionaries';
import styles from './ServicePage.module.css';

const servicesList = [
  'classic',
  'anti-cellulite',
  'sports',
  'lymphatic-drainage',
  'cupping',
  'hot-stone',
  'turkish-foam',
  'natural-massage'
];

export async function generateStaticParams() {
  const locales = ['sv', 'en', 'no', 'ru'];
  const paths = [];

  locales.forEach((lng) => {
    servicesList.forEach((service) => {
      paths.push({ lng, service });
    });
  });

  return paths;
}

export async function generateMetadata({ params }) {
  const { lng, service } = await params;
  const dict = await getDictionary(lng);
  const serviceData = dict.services[service];

  if (!serviceData) return { title: 'Massage Service' };

  return {
    title: `${serviceData.name} | ${dict.common.logo} Stockholm`,
    description: serviceData.shortDesc,
    openGraph: {
      title: `${serviceData.name} | ${dict.common.logo}`,
      description: serviceData.shortDesc,
      images: [`/images/services/${service}.webp`]
    }
  };
}

export default async function ServicePage({ params }) {
  const { lng, service } = await params;
  const dict = await getDictionary(lng);
  const serviceData = dict.services[service];

  if (!serviceData) {
    return (
      <div className={`${styles.notFound} container`}>
        <h2>Service not found</h2>
        <Link href={`/${lng}`} className={styles.backBtn}>
          {dict.common.back}
        </Link>
      </div>
    );
  }

  // Формируем текст предзаписи для кнопок связи
  const whatsappUrl = `https://wa.me/#?text=${encodeURIComponent(
    dict.contacts.waPreset + serviceData.name
  )}`;
  const telegramUrl = `https://t.me/#?text=${encodeURIComponent(
    dict.contacts.tgPreset + serviceData.name
  )}`;

  return (
    <article className={styles.wrapper}>
      {/* Ссылка назад */}
      <div className="container">
        <Link href={`/${lng}#services`} className={styles.backLink}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.backIcon}>
            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {dict.common.back}
        </Link>
      </div>

      <div className={`${styles.grid} container`}>
        {/* Медиа (Изображение) */}
        <div className={styles.imageWrapper}>
          <div className={`${styles.imageContainer} glass`}>
            <Image
              src={`/images/services/${service}.webp`}
              alt={serviceData.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className={styles.image}
            />
          </div>
        </div>

        {/* Контентная часть */}
        <div className={styles.info}>
          <header className={styles.header}>
            <h1 className={styles.title}>{serviceData.name}</h1>
            <p className={styles.shortDesc}>{serviceData.shortDesc}</p>
          </header>

          {/* Карточка цены и времени */}
          <div className={`${styles.stats} glass`}>
            <div className={styles.statItem}>
              <span className={styles.label}>Duration</span>
              <span className={styles.value}>
                {serviceData.duration} {dict.common.min}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.label}>Price</span>
              <span className={styles.value}>
                {serviceData.price} {dict.common.currency}
              </span>
            </div>
          </div>

          <section className={styles.descriptionSection}>
            <p className={styles.longDesc}>{serviceData.longDesc}</p>
          </section>

          {/* Польза процедуры */}
          {serviceData.benefits && (
            <section className={styles.benefitsSection}>
              <h3 className={styles.benefitsTitle}>Key Benefits</h3>
              <ul className={styles.benefitsList}>
                {serviceData.benefits.map((benefit, index) => (
                  <li key={index} className={styles.benefitItem}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.checkIcon}>
                      <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Кнопки записи */}
          <div className={styles.ctaGroup}>
            <Link href={`/${lng}/contacts`} className={`${styles.ctaBtn} ${styles.primaryBtn}`}>
              {dict.common.bookNow}
            </Link>
            <div className={styles.socialCta}>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                WhatsApp
              </a>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBtn}>
                Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
