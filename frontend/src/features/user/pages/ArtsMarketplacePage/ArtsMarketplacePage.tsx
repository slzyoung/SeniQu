/**
 * Arts Marketplace
 * Mockup Implementation based on provided design
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart,
    Bell,
    ArrowRight,
} from 'lucide-react';
import './ArtsMarketplacePage.css';

// Mockup Data
const CATEGORIES = ['All', 'Abstract', 'Portraits', 'Digital', 'Classic'];

const MOCKUP_ARTS = {
    boldGaze: {
        id: '1',
        title: 'Bold Gaze',
        subtitle: 'Bold Strong Alive.',
        image: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=800&q=80',
        liked: false,
    },
    monaGrace: {
        id: '2',
        title: 'Mona Grace',
        subtitle: 'Elegant Enigmatic.',
        image: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80',
        liked: true,
    },
    eternalGaze: {
        id: '3',
        title: 'Eternal Gaze',
        subtitle: 'Light meets shadow.',
        image: 'https://images.unsplash.com/photo-1583847268964-b28e50b84bc5?w=800&q=80',
        liked: true,
    }
};

export function NFTMarketplacePage() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('All');
    
    // Simulate likes state
    const [likes, setLikes] = useState<Record<string, boolean>>({
        '1': false,
        '2': true,
        '3': true,
    });

    const toggleLike = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setLikes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="art-market-mockup">
            
            {/* ====== HEADER ====== */}
            <div className="art-market-mockup__header">
                <div className="art-market-mockup__user">
                    <div className="art-market-mockup__avatar">
                        <img 
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
                            alt="Alex Nova" 
                        />
                    </div>
                    <span className="art-market-mockup__name">Alex Nova</span>
                </div>
                <button className="art-market-mockup__bell">
                    <Bell style={{ width: 20, height: 20 }} />
                </button>
            </div>

            {/* ====== TITLE ====== */}
            <h1 className="art-market-mockup__title art-market-mockup__fade-in" style={{ animationDelay: '0.1s' }}>
                Your Art<br />Marketplace
            </h1>

            {/* ====== CATEGORIES ====== */}
            <div className="art-market-mockup__categories art-market-mockup__fade-in" style={{ animationDelay: '0.2s' }}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        className={`art-market-mockup__pill ${activeCategory === cat ? 'art-market-mockup__pill--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ====== SECTION HEADER ====== */}
            <div className="art-market-mockup__section-header art-market-mockup__fade-in" style={{ animationDelay: '0.3s' }}>
                <h2 className="art-market-mockup__section-title">Trending Art</h2>
                <span className="art-market-mockup__see-all" onClick={() => navigate('/dashboard/my-arts')}>See All</span>
            </div>

            {/* ====== MASONRY GRID ====== */}
            <div className="art-market-mockup__grid">
                
                {/* Left Column */}
                <div className="art-market-mockup__col-left art-market-mockup__fade-in" style={{ animationDelay: '0.4s' }}>
                    
                    {/* Big Card - Bold Gaze */}
                    <div 
                        className="art-market-mockup__card art-market-mockup__card--large"
                        onClick={() => navigate(`/marketplace/art/${MOCKUP_ARTS.boldGaze.id}`)}
                    >
                        <img src={MOCKUP_ARTS.boldGaze.image} alt="Bold Gaze" className="art-market-mockup__card-img" />
                        
                        <button 
                            className={`art-market-mockup__card-heart ${likes['1'] ? 'art-market-mockup__card-heart--active' : ''}`}
                            onClick={(e) => toggleLike(e, '1')}
                        >
                            <Heart />
                        </button>
                        
                        <div className="art-market-mockup__card-info">
                            <h3 className="art-market-mockup__card-title">{MOCKUP_ARTS.boldGaze.title}</h3>
                            <p className="art-market-mockup__card-subtitle">{MOCKUP_ARTS.boldGaze.subtitle}</p>
                        </div>
                    </div>

                    {/* Buy Now Button (Placed under the large card as in mockup) */}
                    <button className="art-market-mockup__buy-btn" onClick={() => navigate(`/marketplace/art/${MOCKUP_ARTS.boldGaze.id}`)}>
                        Buy Now
                        <ArrowRight style={{ width: 18, height: 18 }} />
                    </button>

                </div>

                {/* Right Column */}
                <div className="art-market-mockup__col-right art-market-mockup__fade-in" style={{ animationDelay: '0.5s' }}>
                    
                    {/* Small Card 1 - Mona Grace */}
                    <div 
                        className="art-market-mockup__card art-market-mockup__card--small"
                        onClick={() => navigate(`/marketplace/art/${MOCKUP_ARTS.monaGrace.id}`)}
                    >
                        <img src={MOCKUP_ARTS.monaGrace.image} alt="Mona Grace" className="art-market-mockup__card-img" style={{ objectPosition: 'top' }} />
                        
                        <button 
                            className={`art-market-mockup__card-heart ${likes['2'] ? 'art-market-mockup__card-heart--active' : ''}`}
                            onClick={(e) => toggleLike(e, '2')}
                        >
                            <Heart />
                        </button>
                        
                        <div className="art-market-mockup__card-info">
                            <h3 className="art-market-mockup__card-title">{MOCKUP_ARTS.monaGrace.title}</h3>
                            <p className="art-market-mockup__card-subtitle">{MOCKUP_ARTS.monaGrace.subtitle}</p>
                        </div>
                    </div>

                    {/* Small Card 2 - Eternal Gaze */}
                    <div 
                        className="art-market-mockup__card art-market-mockup__card--small"
                        onClick={() => navigate(`/marketplace/art/${MOCKUP_ARTS.eternalGaze.id}`)}
                    >
                        <img src={MOCKUP_ARTS.eternalGaze.image} alt="Eternal Gaze" className="art-market-mockup__card-img" />
                        
                        <button 
                            className={`art-market-mockup__card-heart ${likes['3'] ? 'art-market-mockup__card-heart--active' : ''}`}
                            onClick={(e) => toggleLike(e, '3')}
                        >
                            <Heart />
                        </button>
                        
                        <div className="art-market-mockup__card-info">
                            <h3 className="art-market-mockup__card-title">{MOCKUP_ARTS.eternalGaze.title}</h3>
                            <p className="art-market-mockup__card-subtitle">{MOCKUP_ARTS.eternalGaze.subtitle}</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default NFTMarketplacePage;
