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

const recommendations = {
  'classic': ['lymphatic-drainage', 'hot-stone'],
  'anti-cellulite': ['lymphatic-drainage', 'natural-massage'],
  'sports': ['cupping', 'classic'],
  'lymphatic-drainage': ['sports', 'anti-cellulite'],
  'cupping': ['sports', 'classic'],
  'hot-stone': ['natural-massage', 'classic'],
  'turkish-foam': ['natural-massage', 'hot-stone'],
  'natural-massage': ['turkish-foam', 'classic']
};

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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': dict.nav.home,
        'item': `https://olegmassage.se/${lng}`
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': dict.services.title,
        'item': `https://olegmassage.se/${lng}#services`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': serviceData.name,
        'item': `https://olegmassage.se/${lng}/services/${service}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className={styles.wrapper}>
        {/* Хлебные крошки */}
        <div className="container">
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href={`/${lng}`} className={styles.breadcrumbLink}>
              {dict.nav.home}
            </Link>
            <span className={styles.separator}>/</span>
            <Link href={`/${lng}#services`} className={styles.breadcrumbLink}>
              {dict.services.title}
            </Link>
            <span className={styles.separator}>/</span>
            <span className={styles.currentBreadcrumb}>{serviceData.name}</span>
          </nav>
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

        {/* Блок перелинковки */}
        <div className="container">
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>{dict.services.relatedTitle}</h2>
            <div className={styles.relatedGrid}>
              {recommendations[service]?.map((relatedId) => {
                const relatedService = dict.services[relatedId];
                if (!relatedService) return null;

                return (
                  <Link
                    key={relatedId}
                    href={`/${lng}/services/${relatedId}`}
                    className={`${styles.relatedCard} glass`}
                  >
                    <div className={styles.relatedImageContainer}>
                      <Image
                        src={`/images/services/${relatedId}.webp`}
                        alt={relatedService.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className={styles.relatedImg}
                      />
                    </div>
                    <div className={styles.relatedContent}>
                      <h3 className={styles.relatedName}>{relatedService.name}</h3>
                      <p className={styles.relatedDesc}>{relatedService.shortDesc}</p>
                      <span className={styles.relatedLink}>
                        {dict.common.details} &rarr;
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
