import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Landmark, MapPin } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';

const MOCK_MUSEUMS: Record<string, any[]> = {
    'jakarta-barat': [
        {
            id: 'museum-nasional',
            name: 'Museum Nasional Indonesia',
            type: 'Heritage Museum',
            description: 'The pride of the nation. A comprehensive overview of Indonesia\'s historical and cultural heritage.',
            image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80',
            featured: true
        },
        {
            id: 'museum-fatahillah',
            name: 'Jakarta History Museum',
            type: 'Historical Building',
            description: 'Housed in the former Stadhuis, detailing the long history of Batavia.',
            image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&q=80'
        },
        { id: 'museum-wayang', name: 'Museum Wayang', type: 'Puppetry Museum', description: 'Dedicated to traditional Javanese puppetry and storytelling arts.', image: 'https://images.unsplash.com/photo-1579541592065-da8a1fbfa40a?w=800&q=80' }
    ],
    'jogja-sleman': [
        { id: 'candi-prambanan', name: 'Candi Prambanan', type: 'Heritage Site', description: 'A magnificent 9th-century Hindu temple compound.', image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80', featured: true }
    ],
    'jogja-bantul': [
        { id: 'museum-sonobudoyo', name: 'Museum Sonobudoyo', type: 'Cultural Museum', description: 'Premier museum of Javanese history and culture.', image: 'https://images.unsplash.com/photo-1578301978693-85fa9c026f47?w=800&q=80' }
    ],
    'jogja-depok': [
        { id: 'museum-affandi', name: 'Museum Affandi', type: 'Art Museum', description: 'Former home and studio of Indonesia\'s maestro of expressionism.', image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80', featured: true },
        { id: 'gallery-jogja', name: 'Gallery Jogja', type: 'Art Gallery', description: 'Contemporary art space showcasing local masterpieces.', image: 'https://images.unsplash.com/photo-1513415564515-763d91423bdd?w=800&q=80' }
    ],
    'bali-canggu': [
        { id: 'canggu-art-space', name: 'Canggu Contemporary Art', type: 'Art Gallery', description: 'Modern bohemian art space in the heart of Canggu.', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', featured: true }
    ],
    'bali-kintamani': [
        { id: 'kintamani-heritage', name: 'Kintamani Heritage', type: 'Cultural Museum', description: 'Views of Mount Batur alongside rich Balinese history.', image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&q=80' }
    ],
    'bali-kuta': [
        { id: 'kuta-gallery', name: 'Kuta Visual Arts', type: 'Art Gallery', description: 'Vibrant local art spanning the modern history of Kuta.', image: 'https://images.unsplash.com/photo-1605886735742-f8ab9cd0364d?w=800&q=80' }
    ]
};

function formatRegionName(id: string): string {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function RegionMuseums() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const regionId = id.toLowerCase();
    const museums = MOCK_MUSEUMS[regionId] || [];
    const regionName = formatRegionName(regionId);

    return (
        <PageContainer>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center text-sm font-medium text-theme-muted hover:text-gold transition-colors mb-8 bg-theme-surface/50 px-4 py-2 rounded-full border border-theme-border/50 backdrop-blur-sm self-start"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Regions
                </button>

                {museums.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {museums.map((museum, i) => (
                            <motion.div
                                key={museum.id}
                                className="group bg-theme-surface rounded-2xl border border-theme-border/60 hover:border-gold/30 transition-all overflow-hidden cursor-pointer"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                onClick={() => navigate(`/gallery/museum/${museum.id}`)}
                            >
                                <div className="h-48 overflow-hidden relative">
                                    <img
                                        src={museum.image}
                                        alt={museum.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    {museum.featured && (
                                        <div className="absolute top-3 right-3 bg-gold text-black text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-sm">
                                            Featured
                                        </div>
                                    )}
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gold tracking-wide uppercase mb-2">
                                        <Landmark className="w-3.5 h-3.5" />
                                        {museum.type}
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-theme-text mb-2 line-clamp-1">{museum.name}</h3>
                                    <p className="text-theme-muted text-sm line-clamp-2">{museum.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <MapPin className="w-16 h-16 text-theme-muted mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-theme-text mb-2">No Destinations Found</h3>
                        <p className="text-theme-muted mb-6">We're still curating the cultural spots for {regionName}.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 rounded-full bg-gold/10 text-gold hover:bg-gold/20 font-medium transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default RegionMuseums;
