import { getDictionary } from '@/dictionaries';
import ContactsForm from '@/components/ContactsForm';
import styles from './ContactsPage.module.css';

export async function generateMetadata({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  return {
    title: `${dict.contacts.title} | ${dict.common.logo}`,
    description: dict.contacts.sub
  };
}

export default async function ContactsPage({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  return (
    <div className={`${styles.wrapper} container`}>
      <header className={styles.header}>
        <h1 className={styles.title}>{dict.contacts.title}</h1>
        <p className={styles.sub}>{dict.contacts.sub}</p>
      </header>

      <div className={styles.grid}>
        {/* Контактная информация */}
        <section className={styles.infoSection}>
          <div className={`${styles.card} glass`}>
            <h3 className={styles.cardHeading}>{dict.contacts.addressTitle}</h3>
            <p className={styles.cardText}>{dict.contacts.address}</p>
          </div>

          <div className={`${styles.card} glass`}>
            <h3 className={styles.cardHeading}>{dict.contacts.hoursTitle}</h3>
            <p className={styles.cardText}>{dict.contacts.hours}</p>
          </div>

          <div className={`${styles.card} glass`}>
            <h3 className={styles.cardHeading}>Social & Direct Message</h3>
            <div className={styles.socialGrid}>
              <a
                href={`https://wa.me/#?text=${encodeURIComponent(dict.contacts.waPreset)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.socialBtn} ${styles.wa}`}
              >
                WhatsApp
              </a>
              <a
                href={`https://t.me/#?text=${encodeURIComponent(dict.contacts.tgPreset)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.socialBtn} ${styles.tg}`}
              >
                Telegram
              </a>
            </div>
          </div>
        </section>

        {/* Форма обратной связи */}
        <section className={`${styles.formSection} glass`}>
          <ContactsForm dict={dict} />
        </section>
      </div>
    </div>
  );
}
