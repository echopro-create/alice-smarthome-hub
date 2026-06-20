import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/dictionaries';
import styles from './page.module.css';

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

export async function generateMetadata({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  return {
    title: `${dict.common.logo} | Premium Massage in Stockholm`,
    description: dict.home.heroSub,
    alternates: {
      canonical: `/${lng}`,
      languages: {
        sv: '/sv',
        en: '/en',
        no: '/no',
        ru: '/ru'
      }
    }
  };
}

export default async function HomePage({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  // Schema.org Разметка (LocalBusiness & AggregateRating) для SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MassageBusiness',
    'name': dict.common.logo,
    'image': '/images/oleg-about.webp',
    'description': dict.home.heroSub,
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': 'Stockholm',
      'addressCountry': 'SE'
    },
    'priceRange': '600SEK - 1200SEK',
    'telephone': '+4600000000',
    'openingHoursSpecification': [
      {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        'opens': '09:00',
        'closes': '21:00'
      }
    ],
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.9',
      'reviewCount': '42'
    }
  };

  return (
    <>
      {/* Встраиваем микроразметку */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className={styles.wrapper}>
        {/* HERO СЕКЦИЯ */}
        <section className={styles.hero}>
          <div className={`${styles.heroContainer} container`}>
            <div className={styles.heroGrid}>
              {/* Левая колонка: Текст и CTA */}
              <div className={styles.heroContent}>
                <h1 
                  className={`${styles.heroTitle} fadeInUp`}
                  style={{ animationDelay: '0.1s' }}
                  dangerouslySetInnerHTML={{ __html: dict.home.heroTitle }}
                />
                <p 
                  className={`${styles.heroSub} fadeInUp`}
                  style={{ animationDelay: '0.3s' }}
                >
                  {dict.home.heroSub}
                </p>
                <div 
                  className={`${styles.heroCta} fadeInUp`}
                  style={{ animationDelay: '0.5s' }}
                >
                  <Link href={`/${lng}/contacts`} className={`${styles.btn} ${styles.primaryBtn}`}>
                    {dict.common.bookNow}
                  </Link>
                  <a href="#services" className={`${styles.btn} ${styles.secondaryBtn}`}>
                    {dict.nav.services}
                  </a>
                </div>
              </div>

              {/* Правая колонка: Эстетичное изображение в форме арки с собственным свечением */}
              <div 
                className={`${styles.heroImageColumn} fadeInUp`}
                style={{ animationDelay: '0.4s' }}
              >
                <div className={styles.heroImageGlow}></div>
                <div className={styles.heroImageArch}>
                  <Image
                    src="/images/hero.png"
                    alt="Oleg Massage - Premium Spa Atmosphere"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={styles.heroImg}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Декоративный фоновый элемент */}
          <div className={styles.heroOverlay}></div>
        </section>

        {/* СЕКЦИЯ О МАСТЕРЕ */}
        <section className={styles.about} id="about">
          <div className={`${styles.aboutGrid} container`}>
            <div className={styles.aboutImageWrapper}>
              <div className={`${styles.aboutImageContainer} glass`}>
                <Image
                  src="/images/oleg-about.webp"
                  alt="Oleg - Massage Therapist"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={styles.aboutImage}
                />
              </div>
            </div>
            <div className={styles.aboutInfo}>
              <span className={styles.sectionLabel}>{dict.home.aboutTitle}</span>
              <h2 className={styles.sectionTitle}>Oleg</h2>
              <p className={styles.aboutText}>{dict.home.aboutText}</p>
              
              {/* Сертификаты / Дипломы заглушка */}
              <div className={styles.diplomasBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.badgeIcon}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Certified Massage Therapist (Sweden)</span>
              </div>
            </div>
          </div>
        </section>

        {/* СЕКЦИЯ ПРЕИМУЩЕСТВ */}
        <section className={styles.benefits}>
          <div className="container">
            <h2 className={`${styles.sectionTitle} ${styles.center}`}>{dict.home.benefitsTitle}</h2>
            <div className={styles.benefitsGrid}>
              {Object.keys(dict.home.benefits).map((key) => {
                const benefit = dict.home.benefits[key];
                return (
                  <div key={key} className={`${styles.benefitCard} glass`}>
                    <div className={styles.benefitIconWrapper}>
                      {key === 'exp' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.benefitIcon}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01l-3-3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {key === 'ind' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.benefitIcon}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {key === 'atm' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.benefitIcon}>
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <h3 className={styles.benefitCardTitle}>{benefit.title}</h3>
                    <p className={styles.benefitCardDesc}>{benefit.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* СЕКЦИЯ УСЛУГ */}
        <section className={styles.services} id="services">
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{dict.services.title}</h2>
              <p className={styles.sectionSub}>{dict.services.sub}</p>
            </div>
            
            <div className={styles.servicesGrid}>
              {servicesList.map((serviceId) => {
                const service = dict.services[serviceId];
                if (!service) return null;

                return (
                  <div key={serviceId} className={`${styles.serviceCard} glass`}>
                    <div className={styles.serviceImageContainer}>
                      <Image
                        src={`/images/services/${serviceId}.webp`}
                        alt={service.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className={styles.serviceImg}
                      />
                    </div>
                    <div className={styles.serviceContent}>
                      <h3 className={styles.serviceTitle}>{service.name}</h3>
                      <p className={styles.serviceDesc}>{service.shortDesc}</p>
                      <div className={styles.serviceMeta}>
                        <span className={styles.servicePrice}>
                          {service.price} {dict.common.currency}
                        </span>
                        <Link href={`/${lng}/services/${serviceId}`} className={styles.detailsLink}>
                          {dict.common.details} &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* СЕКЦИЯ ОТЗЫВОВ */}
        <section className={styles.testimonials}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={`${styles.sectionTitle} ${styles.center}`}>{dict.testimonials.title}</h2>
              <p className={`${styles.sectionSub} ${styles.center}`}>{dict.testimonials.sub}</p>
            </div>
            
            <div className={styles.testimonialsGrid}>
              {dict.testimonials.items.map((item, index) => (
                <div key={index} className={`${styles.testimonialCard} glass`}>
                  <div className={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} viewBox="0 0 24 24" fill="currentColor" className={styles.starIcon}>
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                    ))}
                  </div>
                  <p className={styles.testimonialText}>&ldquo;{item.text}&rdquo;</p>
                  <div className={styles.testimonialUser}>
                    <h4 className={styles.userName}>{item.name}</h4>
                    <span className={styles.userRole}>{item.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
