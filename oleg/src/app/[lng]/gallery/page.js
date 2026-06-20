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

  const images = [
    { id: 1, src: '/images/gallery/gallery-1.webp', category: 'results' },
    { id: 2, src: '/images/gallery/gallery-2.webp', category: 'process' },
    { id: 3, src: '/images/gallery/gallery-3.webp', category: 'cabinet' },
    { id: 4, src: '/images/gallery/gallery-4.webp', category: 'cabinet' },
    { id: 5, src: '/images/gallery/gallery-5.webp', category: 'cabinet' },
    { id: 6, src: '/images/gallery/gallery-6.webp', category: 'process' }
  ];

  return (
    <div className="container" style={{ padding: '120px 24px 80px 24px' }}>
      <GalleryView dict={dict} images={images} />
    </div>
  );
}
