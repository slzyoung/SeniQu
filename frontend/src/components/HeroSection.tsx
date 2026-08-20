import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthModalStore } from '../stores/useAuthModalStore';
import { useLanguage } from '../hooks/useLanguage';
import './LandingPage.css';

const heroSlides = [
  {
    id: 'bromo',
    image: 'https://cdn.seniqu.art/assets/static/hero/bromo.webp',
    alt: 'Mount Bromo — East Java',
  },
  {
    id: 'borobudur',
    image: 'https://cdn.seniqu.art/assets/static/hero/borobudur.webp',
    alt: 'Borobudur Temple — Central Java',
  },
  {
    id: 'bali',
    image: 'https://cdn.seniqu.art/assets/static/hero/bali.webp',
    alt: 'Ulun Danu Beratan — Bali',
  },
  {
    id: 'bandung',
    image: 'https://cdn.seniqu.art/assets/static/hero/bandung.webp',
    alt: 'Gedung Sate — Bandung',
  },
  {
    id: 'jakarta',
    image: 'https://cdn.seniqu.art/assets/static/hero/jakarta.webp',
    alt: 'Jakarta Old Town',
  },
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { openAuthModal } = useAuthModalStore();
  const { t } = useLanguage();

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
          {t('hero.label')}
        </motion.span>

        <motion.h1
          className="landing-hero__title whitespace-pre-line"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p
          className="landing-hero__subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.div
          className="landing-hero__actions"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/collections" className="landing-hero__cta">
            <Compass style={{ width: 16, height: 16 }} />
            {t('hero.explore')}
          </Link>
          <button
            onClick={() => openAuthModal()}
            className="landing-hero__cta-secondary"
          >
            {t('hero.signIn')}
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