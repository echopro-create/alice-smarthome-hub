'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './GalleryView.module.css';

export default function GalleryView({ dict, images }) {
  const [filter, setFilter] = useState('all');
  const [activeImage, setActiveImage] = useState(null);

  const filteredImages = filter === 'all' 
    ? images 
    : images.filter(img => img.category === filter);

  const openLightbox = (img) => setActiveImage(img);
  const closeLightbox = () => setActiveImage(null);

  const navigateLightbox = (direction) => {
    const currentIndex = filteredImages.findIndex(img => img.id === activeImage.id);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = filteredImages.length - 1;
    if (nextIndex >= filteredImages.length) nextIndex = 0;

    setActiveImage(filteredImages[nextIndex]);
  };

  return (
    <div className={styles.wrapper}>
      {/* Шапка галереи */}
      <header className={styles.header}>
        <h1 className={styles.title}>{dict.gallery.title}</h1>
        <p className={styles.sub}>{dict.gallery.sub}</p>
      </header>

      {/* Кнопки фильтрации */}
      <div className={styles.filters}>
        <button 
          className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`}
          onClick={() => setFilter('all')}
        >
          {dict.gallery.filterAll}
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'process' ? styles.activeFilter : ''}`}
          onClick={() => setFilter('process')}
        >
          {dict.gallery.filterProcess}
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'cabinet' ? styles.activeFilter : ''}`}
          onClick={() => setFilter('cabinet')}
        >
          {dict.gallery.filterCabinet}
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'results' ? styles.activeFilter : ''}`}
          onClick={() => setFilter('results')}
        >
          {dict.gallery.filterResults}
        </button>
      </div>

      {/* Bento Grid */}
      <div className={styles.grid}>
        {filteredImages.map((img) => {
          // Задаем асимметричную верстку (Bento Grid)
          let gridClass = styles.itemNormal;
          if (img.id % 4 === 0) gridClass = styles.itemTall;
          else if (img.id % 5 === 0) gridClass = styles.itemWide;
          else if (img.id % 7 === 0) gridClass = styles.itemLarge;

          return (
            <div 
              key={img.id} 
              className={`${styles.gridItem} ${gridClass} glass`}
              onClick={() => openLightbox(img)}
            >
              <Image
                src={img.src}
                alt={`Oleg Massage Gallery ${img.id}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={styles.image}
              />
              <div className={styles.overlay}>
                <span className={styles.categoryBadge}>{img.category.toUpperCase()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Модальное окно просмотра */}
      {activeImage && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button className={styles.closeBtn} onClick={closeLightbox} aria-label="Close">
            &times;
          </button>
          
          <button 
            className={`${styles.navBtn} ${styles.prevBtn}`} 
            onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
            aria-label="Previous"
          >
            &#10216;
          </button>

          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <Image
              src={activeImage.src}
              alt="Oleg Massage Gallery Zoomed"
              fill
              sizes="100vw"
              className={styles.lightboxImg}
            />
          </div>

          <button 
            className={`${styles.navBtn} ${styles.nextBtn}`} 
            onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
            aria-label="Next"
          >
            &#10217;
          </button>
        </div>
      )}
    </div>
  );
}
