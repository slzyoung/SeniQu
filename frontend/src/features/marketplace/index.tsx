/**
 * Marketplace Feature - Arts Marketplace and Details
 * Uses mockup data to match the provided design exactly
 * Proof of Art (PoA) concept — digitally verified heritage artworks
 */

import { useState } from 'react';
import { Card, Button, Badge } from '../../components/ui';
import {
    ChevronLeft,
    MoreHorizontal,
    Bookmark,
    Share,
    Heart
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../user/pages/ArtsMarketplacePage/ArtsMarketplacePage.css'; // Re-use the mockup CSS

// Mockup Data to exactly match the design
const MOCKUP_ARTS: Record<string, any> = {
    '1': {
        id: '1',
        title: 'Bold Gaze',
        artistDesc: 'Bold Strong Alive.',
        image: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=800&q=80',
        price: '120',
        year: '2023',
        medium: 'Oil on Canvas',
        dimensions: '60 cm x 80 cm',
        desc: 'A vivid portrayal of modern strength.'
    },
    '2': {
        id: '2',
        title: 'Mona Grace',
        artistDesc: 'Created by Leonardo da Vinci, a master of Renaissance art.',
        image: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1200&q=80',
        price: '150',
        year: '1503-1506',
        medium: 'Oil on Wood',
        dimensions: '77 cm × 53 cm',
        desc: 'One of the most iconic masterpieces in art history, Mona Grace captivates with its mysterious expression and unparalleled classical technique. A symbol of Renaissance beauty and artistic genius. See More..'
    },
    '3': {
        id: '3',
        title: 'Eternal Gaze',
        artistDesc: 'Light meets shadow.',
        image: 'https://images.unsplash.com/photo-1583847268964-b28e50b84bc5?w=800&q=80',
        price: '90',
        year: '2021',
        medium: 'Digital',
        dimensions: '2000px × 3000px',
        desc: 'A striking mix of shadows and light.'
    }
};

export function Marketplace() {
    // We already have the mockup marketplace in ArtsMarketplacePage.tsx for users.
    return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <p>Please use the the User Dashboard Marketplace to see the mockup design.</p>
            <Link to="/dashboard/marketplace" style={{ color: 'blue', textDecoration: 'underline' }}>Go to Mockup Marketplace</Link>
        </div>
    );
}

export function ArtDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Default to Mona Grace if not found
    const art = MOCKUP_ARTS[id || '2'] || MOCKUP_ARTS['2'];

    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);

    // CSS specifically for this exact mockup screen without affecting others
    return (
        <div className="art-detail-mockup">
            
            {/* Header Over Image */}
            <div className="art-detail-mockup__topbar">
                <button 
                    onClick={() => navigate(-1)}
                    className="art-detail-mockup__btn"
                >
                    <ChevronLeft style={{ width: 20, height: 20, marginLeft: -2 }} />
                </button>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    Art Story
                </span>
                <button 
                    className="art-detail-mockup__btn"
                >
                    <MoreHorizontal style={{ width: 20, height: 20 }} />
                </button>
            </div>

            {/* Top Fade Image */}
            <div className="art-detail-mockup__hero">
                <img 
                    src={art.image} 
                    alt={art.title} 
                />
                
                {/* Fade to bg gradient via dynamic var in CSS */}
                <div 
                    className="art-detail-mockup__fade"
                    style={{ background: 'linear-gradient(to top, var(--mk-bg) 0%, transparent 100%)' }}
                />

                {/* Floating action buttons on right */}
                <div className="art-detail-mockup__actions">
                    <button 
                        onClick={() => setLiked(!liked)}
                        className="art-detail-mockup__action-btn"
                        style={{ color: liked ? '#E53E3E' : '#FFFFFF' }}
                    >
                        <Heart style={{ width: 22, height: 22, fill: liked ? '#E53E3E' : 'none' }} />
                    </button>
                    <button 
                        onClick={() => setSaved(!saved)}
                        className="art-detail-mockup__action-btn"
                        style={{ color: saved ? '#EAB308' : '#FFFFFF' }}
                    >
                        <Bookmark style={{ width: 22, height: 22, fill: saved ? '#EAB308' : 'none' }} />
                    </button>
                    <button className="art-detail-mockup__action-btn">
                        <Share style={{ width: 22, height: 22 }} />
                    </button>
                </div>
            </div>

            {/* Content Details */}
            <div className="art-detail-mockup__content">
                <h1 className="art-detail-mockup__title">
                    {art.title}
                </h1>
                
                <p className="art-detail-mockup__subtitle">
                    {art.artistDesc}
                </p>

                {/* Timeline Line */}
                <div className="art-detail-mockup__timeline">
                    <div className="art-detail-mockup__timeline-line">
                        <div className="art-detail-mockup__timeline-dot" style={{ right: 0 }} />
                        <div className="art-detail-mockup__timeline-dash" style={{ marginRight: 8 }} />
                    </div>
                    <span className="art-detail-mockup__timeline-text">
                        Year: {art.year}
                    </span>
                    <div className="art-detail-mockup__timeline-line">
                        <div className="art-detail-mockup__timeline-dot" style={{ left: 0 }} />
                        <div className="art-detail-mockup__timeline-dash" style={{ marginLeft: 8 }} />
                    </div>
                </div>

                {/* Properties Grid */}
                <div className="art-detail-mockup__grid-info">
                    <div>
                        <p className="art-detail-mockup__info-label">Medium</p>
                        <p className="art-detail-mockup__info-val">{art.medium}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p className="art-detail-mockup__info-label">Dimensions</p>
                        <p className="art-detail-mockup__info-val">{art.dimensions}</p>
                    </div>
                </div>

                {/* Description */}
                <p className="art-detail-mockup__desc">
                    {art.desc}
                </p>
            </div>

            {/* Bottom Bar sticky */}
            <div className="art-detail-mockup__bottom">
                <div>
                    <p className="art-detail-mockup__price-label">Price</p>
                    <p className="art-detail-mockup__price-val">${art.price}</p>
                </div>
                <button className="art-detail-mockup__add-btn">
                    Add to Collection
                </button>
            </div>

        </div>
    );
}

export default { Marketplace, ArtDetail };
