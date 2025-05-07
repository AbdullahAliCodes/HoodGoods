// frontend/src/components/utils/ImageImports.tsx
// import React from 'react'; // Import React is needed for JSX

// Logo import
// This path goes up two levels (from utils -> components -> src) then into assets
import logo from '../../assets/logo.svg'; // <-- CORRECTED PATH

// Hero and section images
// --- IMPORTANT ---
// The paths below assume your image files are directly inside 'frontend/src/assets/'.
// Make sure the filenames and extensions (.jpg, .png, .webp, etc.) are correct.
import jewelleryImg from '../../assets/jewellery.jpg';  // <-- CORRECTED PATH, UPDATE FILENAME/EXTENSION if needed
import flowerImg from '../../assets/flowers.jpg';     // <-- CORRECTED PATH, UPDATE FILENAME/EXTENSION if needed
import honeyImg from '../../assets/honey.jpg';       // <-- CORRECTED PATH, UPDATE FILENAME/EXTENSION if needed
import ceramicsImg from '../../assets/ceramics.jpg';    // <-- CORRECTED PATH, UPDATE FILENAME/EXTENSION if needed
import marketplaceImg from '../../assets/marketplace.jpg';    // <-- CORRECTED PATH, UPDATE FILENAME/EXTENSION if needed


/**
 * Renders an actual HTML image element using the imported image source.
 *
 * @param src - The imported image variable (which resolves to a path or data URI).
 * @param alt - The alternative text for the image.
 * @param width - Optional desired width for the image element.
 * @param height - Optional desired height for the image element.
 * @returns A React image element (JSX.Element).
 */
const getImage = (src: string, alt: string, width?: number, height?: number): JSX.Element => {
  // Directly render an <img> tag using the imported image source.
  return <img src={src} alt={alt} width={width} height={height} />;
};

// Export the logo, the imported image variables, and the getImage function
export {
  logo,
  jewelleryImg,
  flowerImg,
  honeyImg,
  ceramicsImg,
  marketplaceImg,
  getImage
};