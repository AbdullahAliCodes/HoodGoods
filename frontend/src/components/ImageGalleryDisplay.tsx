import React from 'react';

interface ImageGalleryDisplayProps {
    galleryImages: string[];
}

const ImageGalleryDisplay: React.FC<ImageGalleryDisplayProps> = ({ galleryImages }) => {
    if (galleryImages.length === 0) return null;

    return (
        <section style={{ margin: '2rem 0' }}>
            <h2 style={{ marginBottom: '1rem' }}>Recently Uploaded Images (via Supabase)</h2>
            <figure style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '1rem'
            }}>
                {galleryImages.map((url, index) => (
                    <img 
                        key={url} 
                        src={url} 
                        alt={`Gallery item ${index + 1}`} 
                        style={{ 
                            width: '100%', 
                            height: 150, 
                            objectFit: 'cover',
                            borderRadius: '4px'
                        }}
                    />
                ))}
            </figure>
        </section>
    );
};

export default ImageGalleryDisplay;