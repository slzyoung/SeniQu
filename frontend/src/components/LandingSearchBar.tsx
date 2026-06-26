import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useAuthModalStore } from '../stores/useAuthModalStore';
import { CITY_WHITELIST } from '../features/gallery/data/citiesRegistry';
import './LandingPage.css';

const GUEST_CITIES = ['jakarta', 'yogyakarta', 'bali', 'bandung', 'surabaya', 'semarang', 'medan'];

export function LandingSearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryClean = searchQuery.trim().toLowerCase();

    if (!queryClean) return;

    // Try to find a matching city in the whitelist
    const matchedCityEntry = Object.entries(CITY_WHITELIST).find(([id, meta]) => {
      const idLower = id.toLowerCase();
      const nameLower = meta.name.toLowerCase();
      
      // Match exact ID, exact Name, or if it matches common aliases/prefixes
      return (
        idLower === queryClean ||
        nameLower === queryClean ||
        (queryClean.length >= 3 && (
          idLower.startsWith(queryClean) ||
          nameLower.startsWith(queryClean) ||
          (idLower === 'yogyakarta' && (queryClean === 'jogja' || queryClean === 'jogjakarta' || queryClean === 'diy')) ||
          (idLower === 'jakarta' && (queryClean === 'dki' || queryClean === 'dki jakarta' || queryClean === 'jkt'))
        ))
      );
    });

    if (matchedCityEntry) {
      const cityId = matchedCityEntry[0];
      const isGuestWhitelisted = GUEST_CITIES.includes(cityId);

      if (isAuthenticated || isGuestWhitelisted) {
        navigate(`/gallery/city/${cityId}`);
      } else {
        openAuthModal();
      }
    } else {
      // General search fallback
      navigate(`/gallery?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <motion.div
      className="landing-search"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >
      <form className="landing-search__bar" onSubmit={handleSubmit}>
        <Search className="landing-search__icon" />
        <input
          type="text"
          className="landing-search__input"
          placeholder="Search museums, artworks, cities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          type="button"
          className="landing-search__filter-btn"
          onClick={() => {
            if (isAuthenticated) {
              navigate('/collections');
            } else {
              openAuthModal();
            }
          }}
        >
          <SlidersHorizontal /> EXPLORE
        </button>
      </form>
    </motion.div>
  );
}
