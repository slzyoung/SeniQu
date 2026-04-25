import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthModalStore } from '../stores/useAuthModalStore';
import './LandingPage.css';

const heroSlides = [
  {
    id: 'bromo',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1800&q=85',
    alt: 'Mount Bromo — East Java',
  },
  {
    id: 'borobudur',
    image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1800&q=85',
    alt: 'Borobudur Temple — Central Java',
  },
  {
    id: 'bali',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1800&q=85',
    alt: 'Ulun Danu Beratan — Bali',
  },
  {
    id: 'bandung',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Gedung_Sate_Oktober_2024_-_Rahmatdenas.jpg/1280px-Gedung_Sate_Oktober_2024_-_Rahmatdenas.jpg',
    alt: 'Gedung Sate — Bandung',
  },
  {
    id: 'jakarta',
    image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1800&q=85',
    alt: 'Jakarta Old Town',
  },
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { openAuthModal } = useAuthModalStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="landing-hero" id="hero">
      {/* Background Image Carousel */}
      <AnimatePresence mode="wait">
        <motion.img
          key={heroSlides[currentIndex].id}
          src={heroSlides[currentIndex].image}
          alt={heroSlides[currentIndex].alt}
          className="landing-hero__bg"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
        />
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div className="landing-hero__overlay" />

      {/* Content */}
      <div className="landing-hero__content">
        <motion.span
          className="landing-hero__label"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Sparkles /> SeniQu Gallery
        </motion.span>

        <motion.h1
          className="landing-hero__title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Preserving{'\n'}Nusantara's Soul
        </motion.h1>

        <motion.p
          className="landing-hero__subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          A digital sanctuary for Indonesia's heritage — spanning museums,
          galleries, & historical sites. Verified, digitized, and curated
          for cultural exploration.
        </motion.p>

        <motion.div
          className="landing-hero__actions"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/collections" className="landing-hero__cta">
            <Compass style={{ width: 16, height: 16 }} />
            Explore Collections
          </Link>
          <button
            onClick={() => openAuthModal()}
            className="landing-hero__cta-secondary"
          >
            Sign In
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </motion.div>
      </div>

      {/* Carousel Dots */}
      <div className="landing-hero__dots">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.id}
            className={`landing-hero__dot ${index === currentIndex ? 'landing-hero__dot--active' : ''}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}