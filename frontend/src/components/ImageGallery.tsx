import supabase from '../supabaseClient';
import { useEffect, useState } from 'react';

const ImageGallery = () => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase.storage.from('images').list('uploads');
      if (data) {
        const urls = data.map(
          (item) => `https://euudlgzarnvbsvzlizcu.supabase.co/storage/v1/object/public/images/uploads/${item.name}`
        );
        setImageUrls(urls);
      }
    };
    fetchImages();
  }, []);

  return (
    <figure style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0' }}>
      {imageUrls.map((url) => (
        <img 
          key={url} 
          src={url} 
          alt="Gallery image from storage" 
          style={{ width: 150, height: 150, objectFit: 'cover' }}
        />
      ))}
    </figure>
  );
};

export default ImageGallery;