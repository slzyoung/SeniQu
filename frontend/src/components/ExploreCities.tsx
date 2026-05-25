import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useAuthModalStore } from '../stores/useAuthModalStore';
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
}: {
  city: CityData;
  index: number;
  onClick: () => void;
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
            Discover More <ArrowRight />
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
  
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev

  const PAGE_SIZE = 7;
  const pageCount = Math.ceil(HERITAGE_CITIES.length / PAGE_SIZE);

  const displayedCities = useMemo(() => {
    const start = page * PAGE_SIZE;
    return HERITAGE_CITIES.slice(start, start + PAGE_SIZE);
  }, [page]);

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

  return (
    <div className="landing-section">
      <div className="landing-section__header">
        <div>
          <p className="landing-section__eyebrow">Cultural Atlas</p>
          <h2 className="landing-section__title">Explore by City</h2>
        </div>
        <button
          className="landing-section__see-all"
          onClick={() => navigate('/gallery/nearby')}
        >
          View All Districts <ChevronRight style={{ width: 14, height: 14 }} />
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
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Elegant mobile-first Pagination controls for showing 7 cities at a time */}
      {pageCount > 1 && (
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
            {page === pageCount - 1 ? 'Show First 7' : 'Show More (7)'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Explore More CTA for non-authenticated users */}
      {!isAuthenticated && (
        <div className="mt-8 flex justify-center w-full">
          <motion.button
            onClick={() => openAuthModal()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="group relative overflow-hidden px-8 py-3.5 rounded-2xl bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/40 text-gold font-bold text-xs tracking-wider uppercase shadow-[0_4px_20px_rgba(201,168,76,0.1)] hover:shadow-[0_8px_30px_rgba(201,168,76,0.25)] hover:border-gold hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
          >
            <span className="absolute inset-0 bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
            <span className="relative z-10">Explore More</span>
            <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
