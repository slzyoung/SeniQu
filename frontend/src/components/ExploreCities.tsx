import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useAuthModalStore } from '../stores/useAuthModalStore';
import { useLanguage } from '../hooks/useLanguage';
import { CITY_WHITELIST } from '../features/gallery/data/citiesRegistry';
import './LandingPage.css';

interface CityData {
  id: string;
  name: string;
  description: string;
  badge?: string;
  image: string;
  featured?: boolean;
}

const HERITAGE_CITIES: CityData[] = Object.entries(CITY_WHITELIST).map(([id, meta]) => ({
  id,
  name: meta.name,
  description: meta.description,
  image: meta.image,
  badge: id === 'jakarta' ? 'CAPITAL CITY' :
         id === 'yogyakarta' ? 'HERITAGE HUB' :
         id === 'bali' ? 'SPIRITUAL ISLE' :
         id === 'bandung' ? 'ART DECO CITY' :
         id === 'surabaya' ? 'HERO CITY' : undefined,
  featured: id === 'jakarta',
}));

function CityCard({
  city,
  index,
  onClick,
  discoverText,
}: {
  city: CityData;
  index: number;
  onClick: () => void;
  discoverText: string;
}) {
  return (
    <motion.div
      className={`landing-city-card landing-fade-in ${city.featured ? 'landing-city-card--featured' : 'landing-city-card--regular'}`}
      onClick={onClick}
      style={{ animationDelay: `${index * 0.08}s` }}
      whileHover={{ y: -4 }}
    >
      <img
        src={city.image}
        alt={city.name}
        className="landing-city-card__img"
        loading="lazy"
      />
      <div className="landing-city-card__gradient" />
      <div className="landing-city-card__content">
        <h3 className="landing-city-card__name">{city.name}</h3>
        <p className="landing-city-card__desc">{city.description}</p>
        {city.badge && (
          <span className="landing-city-card__badge">{city.badge}</span>
        )}
        {city.featured && (
          <button className="landing-city-card__explore-btn">
            {discoverText} <ArrowRight />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ExploreCities() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const { t, language } = useLanguage();
  
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev

  const PAGE_SIZE = 7;
  const pageCount = Math.ceil(HERITAGE_CITIES.length / PAGE_SIZE);

  const displayedCities = useMemo(() => {
    if (!isAuthenticated) {
      return HERITAGE_CITIES.slice(0, PAGE_SIZE);
    }
    const start = page * PAGE_SIZE;
    return HERITAGE_CITIES.slice(start, start + PAGE_SIZE);
  }, [page, isAuthenticated]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 120 : -120,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 120 : -120,
      opacity: 0
    })
  };

  const discoverText = language === 'en' ? 'Discover More' : 'Temukan Lebih Banyak';
  const exploreMoreText = language === 'en' ? 'Explore More' : 'Jelajahi Lebih Banyak';
  const showFirstText = language === 'en' ? 'Show First 7' : 'Tampilkan 7 Pertama';
  const showMoreText = language === 'en' ? 'Show More (7)' : 'Tampilkan Lebih (7)';

  return (
    <div className="landing-section">
      <div className="landing-section__header">
        <div>
          <p className="landing-section__eyebrow">{t('cities.label')}</p>
          <h2 className="landing-section__title">{t('cities.title')}</h2>
        </div>
        <button
          className="landing-section__see-all"
          onClick={() => {
            if (isAuthenticated) {
              navigate('/gallery/nearby');
            } else {
              openAuthModal();
            }
          }}
        >
          {t('cities.viewAll')} <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <div style={{ position: 'relative', overflow: 'hidden', minHeight: '380px', width: '100%' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="landing-cities"
          >
            {displayedCities.map((city, i) => (
              <CityCard
                key={city.id}
                city={city}
                index={i}
                onClick={() => navigate(`/gallery/city/${city.id}`)}
                discoverText={discoverText}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Guest: Explore More CTA */}
      {!isAuthenticated && HERITAGE_CITIES.length > PAGE_SIZE && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => openAuthModal()}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium tracking-wide text-gold/80 hover:text-gold border border-gold/20 hover:border-gold/40 bg-transparent hover:bg-gold/[0.05] transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            {exploreMoreText}
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {/* Elegant mobile-first Pagination controls for showing 7 cities at a time */}
      {isAuthenticated && pageCount > 1 && (
        <div className="flex items-center justify-between mt-8 w-full px-4 max-w-md mx-auto">
          {/* Previous Page */}
          <button
            onClick={() => {
              if (page > 0) {
                setDirection(-1);
                setPage(prev => prev - 1);
              }
            }}
            disabled={page === 0}
            className={`p-2.5 rounded-full border border-theme-border/60 text-theme-text/80 hover:text-gold hover:border-gold transition-all active:scale-95 cursor-pointer ${
              page === 0 ? 'opacity-30 pointer-events-none' : ''
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Page Indicators */}
          <div className="flex gap-2">
            {Array.from({ length: pageCount }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > page ? 1 : -1);
                  setPage(idx);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  page === idx ? 'bg-gold w-6' : 'bg-theme-text/20 hover:bg-theme-text/40'
                }`}
              />
            ))}
          </div>

          {/* Show More (Next Page) */}
          <button
            onClick={() => {
              if (page < pageCount - 1) {
                setDirection(1);
                setPage(prev => prev + 1);
              } else {
                setDirection(-1);
                setPage(0);
              }
            }}
            className="px-5 py-2.5 rounded-full border border-gold/40 text-xs font-semibold text-gold hover:border-gold active:scale-95 transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            {page === pageCount - 1 ? showFirstText : showMoreText}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
