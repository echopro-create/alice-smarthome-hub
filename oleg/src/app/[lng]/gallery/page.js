import { getDictionary } from '@/dictionaries';
import GalleryView from '@/components/GalleryView';

export async function generateMetadata({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  return {
    title: `${dict.gallery.title} | ${dict.common.logo}`,
    description: dict.gallery.sub
  };
}

export default async function GalleryPage({ params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  // Список 22 фотографий с привязкой к категориям (заглушка для демонстрации)
  // Мы распределим фотографии Олега по трем категориям: 'process', 'cabinet', 'results'
  const images = Array.from({ length: 22 }, (_, i) => {
    const id = i + 1;
    let category = 'process';
    if (id % 3 === 0) category = 'cabinet';
    else if (id % 3 === 1) category = 'results';
    
    return {
      id,
      src: `/images/gallery/gallery-${id}.jpg`,
      category
    };
  });

  return (
    <div className="container" style={{ padding: '40px 24px 80px 24px' }}>
      <GalleryView dict={dict} images={images} />
    </div>
  );
}
