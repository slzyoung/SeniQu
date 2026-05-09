import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Compass, MapPin } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';

const MOCK_REGIONS: Record<string, any[]> = {
    jakarta: [
        { id: 'jakarta-pusat', name: 'Jakarta Pusat', description: 'The historic and administrative heart of the city.', image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&q=80' },
        { id: 'jakarta-barat', name: 'Jakarta Barat', description: 'Where colonial history and old town charm reside.', image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80' },
        { id: 'jakarta-selatan', name: 'Jakarta Selatan', description: 'Modern art spaces and vibrant cultural hubs.', image: 'https://images.unsplash.com/photo-1513415564515-763d91423bdd?w=800&q=80' },
        { id: 'jakarta-timur', name: 'Jakarta Timur', description: 'Rich in traditional heritage and sprawling parks.', image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&q=80' },
        { id: 'jakarta-utara', name: 'Jakarta Utara', description: 'Maritime museums and coastal history.', image: 'https://images.unsplash.com/photo-1605886735742-f8ab9cd0364d?w=800&q=80' }
    ],
    yogyakarta: [
        { id: 'jogja-sleman', name: 'Sleman', description: 'Home to majestic temples and Mount Merapi slopes.', image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80' },
        { id: 'jogja-bantul', name: 'Bantul', description: 'Traditional arts, crafts, and scenic southern beaches.', image: 'https://images.unsplash.com/photo-1578301978693-85fa9c026f47?w=800&q=80' },
        { id: 'jogja-depok', name: 'Depok', description: 'Vibrant student city filled with contemporary art spaces.', image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80' }
    ],
    bali: [
        { id: 'bali-canggu', name: 'Canggu', description: 'Bohemian vibe featuring modern galleries and street art.', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80' },
        { id: 'bali-kintamani', name: 'Kintamani', description: 'Cultural heritage set against breathtaking highland views.', image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&q=80' },
        { id: 'bali-kuta', name: 'Kuta', description: 'The bustling coastal district with rich modern history.', image: 'https://images.unsplash.com/photo-1605886735742-f8ab9cd0364d?w=800&q=80' }
    ]
};

export function CityRegions() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Normalize city ID for mapping
    const cityId = id.toLowerCase();
    const regions = MOCK_REGIONS[cityId] || [];
    const cityName = id.charAt(0).toUpperCase() + id.slice(1);

    return (
        <PageContainer>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center text-sm font-medium text-theme-muted hover:text-gold transition-colors mb-8 bg-theme-surface/50 px-4 py-2 rounded-full border border-theme-border/50 backdrop-blur-sm self-start"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </button>

                {regions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {regions.map((region, i) => (
                            <motion.div
                                key={region.id}
                                className="group relative overflow-hidden rounded-2xl bg-theme-surface border border-theme-border/60 hover:border-gold/50 transition-all cursor-pointer shadow-lg"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                onClick={() => navigate(`/gallery/region/${region.id}`)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                <img
                                    src={region.image}
                                    alt={region.name}
                                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-x-0 bottom-0 p-6 z-20">
                                    <h3 className="text-2xl font-serif font-bold text-white mb-2">{region.name}</h3>
                                    <p className="text-white/80 text-sm line-clamp-2">{region.description}</p>
                                    <div className="mt-4 inline-flex items-center text-gold text-sm font-semibold group-hover:translate-x-2 transition-transform">
                                        Explore Museums <ChevronRight className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Compass className="w-16 h-16 text-theme-muted mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-theme-text mb-2">No Regions Found</h3>
                        <p className="text-theme-muted mb-6">We're still mapping the cultural districts of {cityName}.</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-2 rounded-full bg-gold/10 text-gold hover:bg-gold/20 font-medium transition-colors"
                        >
                            Return Home
                        </button>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default CityRegions;
