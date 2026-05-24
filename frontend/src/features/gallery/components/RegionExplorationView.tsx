import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { CityMetadata, RegionDetail } from '../data/citiesRegistry';

interface RegionExplorationViewProps {
    cityMetadata: CityMetadata;
    regionsList: RegionDetail[];
    regionStats: Record<string, number>;
    onSelectRegion: (regionId: string) => void;
    onBack: () => void;
}

export const RegionExplorationView: React.FC<RegionExplorationViewProps> = ({
    cityMetadata,
    regionsList,
    regionStats,
    onSelectRegion,
    onBack,
}) => {
    return (
        <motion.div
            key="regions"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
        >
            {/* Seamless Mobile Back Button */}
            <div className="mb-4">
                <button
                    onClick={onBack}
                    className="inline-flex items-center text-xs font-bold text-theme-muted hover:text-gold active:scale-95 transition-all gap-1.5 py-1.5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>
            </div>

            {/* Page Title */}
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-theme-text leading-tight">
                    Eksplorasi {cityMetadata.name}
                </h1>
                <p className="text-[11px] text-theme-muted mt-1">
                    Pilih wilayah kota / kabupaten untuk menjelajahi destinasi cagar budaya
                </p>
            </div>

            {/* Spacious Region Cards List */}
            <div className="space-y-4">
                {regionsList.map((reg) => (
                    <div
                        key={reg.id}
                        onClick={() => onSelectRegion(reg.id)}
                        className="relative h-48 rounded-2xl overflow-hidden border border-theme-border/80 shadow-md group cursor-pointer active:scale-[0.99] transition-transform duration-200"
                    >
                        {/* Card Cover image */}
                        <img
                            src={reg.image}
                            alt={reg.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&q=80';
                            }}
                        />
                        {/* Dark overlay gradient to ensure high readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

                        {/* Text Overlay content */}
                        <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col justify-end">
                            <div className="flex items-center justify-between mb-1.5">
                                <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                                    {reg.name}
                                </h2>
                                <span className="bg-gold/95 text-black text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm shrink-0">
                                    {regionStats[reg.id] || 0} Destinasi
                                </span>
                            </div>
                            <p className="text-white/80 text-[11px] leading-relaxed line-clamp-2 max-w-[90%] mb-3.5">
                                {reg.description}
                            </p>

                            <div className="inline-flex items-center text-xs font-bold text-gold">
                                <span>Explore</span>
                                <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
