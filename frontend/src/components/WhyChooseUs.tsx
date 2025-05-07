import React from 'react';
import './WhyChooseUs.css';


interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => {
  return (
    <article className="feature">
      <figure className="feature-icon">
        {icon}
      </figure>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </article>
  );
};

const WhyChooseUs: React.FC = () => {
  return (
    <section id="about-us" className="why-choose-us light-purple-bg">
      <main className="container">
        {/* First row: About Us */}
        <article className="about-us-content">
          <h2 className="section-title">About Us</h2>
          <p className="about-us-text">
            HoodsGoods is a vibrant marketplace connecting talented local artisans with conscious consumers who value handcrafted quality. Founded in 2020, our platform supports independent creators throughout South Africa, providing them with a digital space to showcase their unique skills and products. We believe that behind every handmade item is a story of passion, creativity, and craftsmanship. Our mission is to celebrate these stories while promoting sustainable shopping practices and supporting local economies. When you shop at HoodsGoods, you're not just buying a product - you're investing in a community of makers and the authentic art of handmade creation.
          </p>
        </article>

        {/* Second row: Why Choose Us + Image */}
        <section className="why-choose-us-row">
          <article className="why-choose-us-content">
            <h2 className="section-title">Why Choose Us</h2>

            <section className="features-grid">
              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M4 14h16M4 10h16M7 18l-3 4M17 18l3 4" />
                  </svg>
                }
                title="Secure & Trusted Shopping"
                description="Shop with confidence. We use secure payment gateways and prioritize your privacy for a safe online experience."
              />

              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM12 6v6l4 2" />
                  </svg>
                }
                title="Truly Handmade Treasures"
                description="Discover one-of-a-kind items crafted with passion and skill by talented artisans right here in South Africa."
              />

              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M22 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9zM8 15l3-3-3-3M12 12h6" />
                  </svg>
                }
                title="Careful & Reliable Delivery"
                description="Your handmade items are packed with care and shipped reliably to your choice of pickup points. Choose the best delivery option for you at checkout."
              />

              <Feature
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                }
                title="Easy to Shop"
                description="Browse, discover, and buy with ease. Our clean, simple interface makes finding something special a breeze."
              />
            </section>
          </article>

          {/* <figure className="why-choose-us-image">
            <img
              src={marketplaceImg}
              alt="Artisan marketplace products display"
            />
          </figure> */}
        </section>
      </main>
    </section>
  );
};

export default WhyChooseUs;