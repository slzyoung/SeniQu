import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import './LandingPage.css';

interface CityData {
  id: string;
  name: string;
  description: string;
  badge?: string;
  image: string;
  featured?: boolean;
}

const HERITAGE_CITIES: CityData[] = [
  {
    id: 'jakarta',
    name: 'Jakarta',
    description: "Where colonial history meets modern arts. Explore the Old Town's colonial architecture and galleries.",
    badge: 'CAPITAL CITY',
    image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1200&q=80',
    featured: true,
  },
  {
    id: 'yogyakarta',
    name: 'Yogyakarta',
    description: 'The heart of Javanese culture and their royal heritage.',
    badge: 'HERITAGE HUB',
    image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1200&q=80',
  },
  {
    id: 'bali',
    name: 'Bali',
    description: 'Island of arts, temples, and living traditions.',
    badge: 'SPIRITUAL ISLE',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
  },
  {
    id: 'bandung',
    name: 'Bandung',
    description: 'Known for its Art Deco architecture and creative energy.',
    badge: 'ART DECO CITY',
    image: '/images/city/bandung.jpg',
  },
  {
    id: 'surabaya',
    name: 'Surabaya',
    description: 'The hero city with a rich maritime and trade heritage.',
    badge: 'HERO CITY',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&q=80',
  },
  {
    id: 'semarang',
    name: 'Semarang',
    description: 'Explore Dutch colonial history and the vibrant Chinatown heritage.',
    image: '/images/city/semarang.jpg',
  },
];

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
      style={{ animationDelay: `${index * 0.1}s` }}
      whileHover={{ y: -4 }}
    >
      <img
        src={city.image}
        alt={city.name}
        className="landing-city-card__img"
        loading={index < 2 ? 'eager' : 'lazy'}
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

      <div className="landing-cities">
        {HERITAGE_CITIES.map((city, i) => (
          <CityCard
            key={city.id}
            city={city}
            index={i}
            onClick={() => navigate(`/gallery/city/${city.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
