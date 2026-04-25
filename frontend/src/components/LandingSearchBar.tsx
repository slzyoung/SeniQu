import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import './LandingPage.css';

export function LandingSearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
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
        <span className="landing-search__count">
          450+ museums
        </span>
        <button
          type="button"
          className="landing-search__filter-btn"
          onClick={() => navigate('/collections')}
        >
          <SlidersHorizontal /> EXPLORE
        </button>
      </form>
    </motion.div>
  );
}
