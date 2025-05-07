import React, { useEffect, useRef } from 'react';
import './Hero.css';
// These image imports are no longer used if the <main> section is commented out
// import { jewelleryImg, flowerImg, honeyImg, ceramicsImg, getImage } from './utils/ImageImports'; // Adjust path if needed
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

// --- TypeScript Declaration for Vanta ---
// (Keep this as it helps TypeScript understand Vanta)
declare global {
  interface Window {
    VANTA: {
      // Add FOG here:
      FOG: (options: VantaFogOptions) => VantaEffect;
      // You can remove BIRDS if you're not using it anywhere else,
      // or keep it if you might switch between effects.
      // BIRDS?: (options: VantaBirdsOptions) => VantaEffect;
    };
  }
}

interface VantaFogOptions {
  el: HTMLElement | string;
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  highlightColor?: number | string;
  midtoneColor?: number | string;
  lowlightColor?: number | string;
  baseColor?: number | string;
  blurFactor?: number;
  zoom?: number;
  speed?: number;
}


interface VantaEffect {
  destroy: () => void;
}


// --- End TypeScript Declaration ---


const Hero: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();
  const showPrompt = !isLoading && !isAuthenticated;

  // Ref for the Vanta target element
  const vantaRef = useRef<HTMLElement>(null); // Use HTMLElement for <section>

  const handleLoginPrompt = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  };

  // --- Vanta Initialization useEffect ---
// Inside the Hero component's useEffect hook...

useEffect(() => {
  let effectInstance: VantaEffect | null = null;

  // Ensure you are checking for and calling FOG
  if (window.VANTA && window.VANTA.FOG && vantaRef.current) { // Check for FOG
    console.log("Initializing Vanta Fog effect (run once)...");
    effectInstance = window.VANTA.FOG({ // <--- MAKE SURE THIS SAYS FOG
      el: vantaRef.current,
      // General Controls
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,

      // --- Fog Specific Options (from the Fog image) ---
   
      highlightColor: 0x6514a4,
      midtoneColor: 0x090909,
      lowlightColor: 0x4920d2,
      baseColor: 0x000000,
      blurFactor: 0.36,
      speed: 0.60,
      zoom: 0.20
  // Add other Fog options if needed
    });
  } else {
      console.warn("Vanta.js FOG or target element not ready for initialization.");
  }

  // Cleanup function (remains the same)
  return () => {
    if (effectInstance) {
      effectInstance.destroy();
    }
  };
}, []); // Empty dependency array

  return (
    // Attach the ref to the main section element
    <section className="hero-section light-purple-bg" ref={vantaRef}>
      {/* The Vanta effect is applied to this section's background */}
      <article className="hero-container">
        <header className="hero-header">
          <h1 className="hero-title">
            Find Your Kind<br />
            Of Handmade
          </h1>
          <p className="hero-text">
            From bold and modern to cozy and traditional, every shop here brings something unique.
            Browse through passionate creators and find pieces that match your style, your story, and your space.
          </p>
          <nav className="hero-buttons">
            <Link to="products" className="btn btn-primary">
              Shop now
            </Link>
          </nav>
          {showPrompt && (
            <aside className="hero-seller-prompt">
              <p>
                Ready to share your unique creations with the world?{' '}
                <button onClick={handleLoginPrompt} className="link-button">
                  Sign up or Log in
                </button>
                {' '}to become a seller on HoodsGoods!
              </p>
            </aside>
          )}
        </header>

        {/* --- You have commented out this section --- */}
        {/* <main className="hero-images">
          <ul className="image-grid">
             <li className="grid-item new">
               <figure>
                 {getImage(jewelleryImg, "Jewelry", 200, 150)}
                 <figcaption className="tag">New</figcaption>
               </figure>
             </li>
             <li className="grid-item featured">
               <figure>
                 {getImage(flowerImg, "Flowers", 200, 150)}
                 <figcaption className="tag">Featured</figcaption>
               </figure>
             </li>
             <li className="grid-item">
               <figure>
                 {getImage(honeyImg, "Honey", 200, 150)}
                 <figcaption className="tag">Popular</figcaption>
               </figure>
             </li>
             <li className="grid-item">
               <figure>
                 {getImage(ceramicsImg, "Ceramics", 200, 150)}
                 <figcaption className="tag">Trending</figcaption>
               </figure>
             </li>
           </ul>

            <figure className="dots-decoration" aria-hidden="true">
              <svg
                className="dots"
                width="100"
                height="100"
                aria-hidden="true"
              >
                <pattern id="dots-pattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1.5" fill="var(--white, #fff)"/>
                </pattern>
                <rect width="100" height="100" fill="url(#dots-pattern)" />
              </svg>
            </figure>
          </main> */}
       </article>
     </section>
  );
};

export default Hero;