'use client';

import { useState } from 'react';
import styles from './ContactsForm.module.css';

export default function ContactsForm({ dict }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [service, setService] = useState('classic');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const services = [
    { id: 'classic', name: dict.services.classic.name },
    { id: 'anti-cellulite', name: dict.services['anti-cellulite'].name },
    { id: 'sports', name: dict.services.sports.name },
    { id: 'lymphatic-drainage', name: dict.services['lymphatic-drainage'].name },
    { id: 'cupping', name: dict.services.cupping.name },
    { id: 'hot-stone', name: dict.services['hot-stone']?.name || 'Hot Stone' },
    { id: 'turkish-foam', name: dict.services['turkish-foam'].name },
    { id: 'natural-massage', name: dict.services['natural-massage'].name }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !contact) return;

    setStatus('submitting');

    // Симуляция отправки формы (заглушка)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStatus('success');
      setName('');
      setContact('');
    } catch (err) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.successState}>
        <div className={styles.successIconWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.successIcon}>
            <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className={styles.successTitle}>Request Sent!</h3>
        <p className={styles.successText}>{dict.contacts.successMsg}</p>
        <button className={styles.resetBtn} onClick={() => setStatus('idle')}>
          Send Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.formTitle}>{dict.contacts.formTitle}</h3>

      {/* Поле: Имя */}
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          {dict.contacts.formName} *
        </label>
        <input
          type="text"
          id="name"
          required
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          disabled={status === 'submitting'}
        />
      </div>

      {/* Поле: Контакт */}
      <div className={styles.field}>
        <label htmlFor="contact" className={styles.label}>
          {dict.contacts.formPhone} *
        </label>
        <input
          type="text"
          id="contact"
          required
          placeholder="+46 000 000 000 / @username"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className={styles.input}
          disabled={status === 'submitting'}
        />
      </div>

      {/* Поле: Выбор услуги */}
      <div className={styles.field}>
        <label htmlFor="service" className={styles.label}>
          {dict.contacts.formMessage}
        </label>
        <select
          id="service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className={styles.select}
          disabled={status === 'submitting'}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className={styles.submitBtn} disabled={status === 'submitting'}>
        {status === 'submitting' ? (
          <span className={styles.loader}></span>
        ) : (
          dict.contacts.submit
        )}
      </button>
    </form>
  );
}
