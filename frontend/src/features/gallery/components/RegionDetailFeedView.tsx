import React from 'react';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Building2, 
    Image as ImageIcon, 
    Compass, 
    Map as MapIcon, 
    LayoutGrid, 
    Loader2 
} from 'lucide-react';
import { RegionDetail, classifyPlace } from '../data/citiesRegistry';

type FilterType = 'museum' | 'gallery' | 'heritage';
type ViewMode = 'list' | 'map';

interface RegionDetailFeedViewProps {
    regionsList: RegionDetail[];
    selectedRegionId: string;
    filteredPlaces: any[];
    isOfflineMode: boolean;
    errorMsg: string | null;
    activeFilter: FilterType;
    setActiveFilter: (filter: FilterType) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    isLoading: boolean;
    onSelectPlace: (place: any) => void;
    onBackToRegions: () => void;
    mapContainerRef: React.RefObject<HTMLDivElement>;
    categoryCounts: { museum: number; gallery: number; heritage: number };
}

export const RegionDetailFeedView: React.FC<RegionDetailFeedViewProps> = ({
    regionsList,
    selectedRegionId,
    filteredPlaces,
    isOfflineMode,
    errorMsg,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,
    isLoading,
    onSelectPlace,
    onBackToRegions,
    mapContainerRef,
    categoryCounts,
}) => {
    return (
        <motion.div
            key="places"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
        >
            {/* Seamless Mobile Back Button */}
            <div className="mb-4">
                <button
                    onClick={onBackToRegions}
                    className="inline-flex items-center text-xs font-bold text-theme-muted hover:text-gold active:scale-95 transition-all gap-1.5 py-1.5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Regions</span>
                </button>
            </div>

            <div className="mb-5">
                <h2 className="text-xl font-serif font-bold text-theme-text leading-tight">
                    {regionsList.find(r => r.id === selectedRegionId)?.name || 'Semua Wilayah'}
                </h2>
                <p className="text-[11px] text-theme-muted mt-1 font-medium">
                    Menampilkan {filteredPlaces.length} lokasi cagar budaya yang terverifikasi di wilayah ini
                </p>
            </div>

            {isOfflineMode && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 animate-ping shrink-0" />
                    <div>
                        <h4 className="text-[10px] font-bold text-amber-500">Offline Database Active</h4>
                        <p className="text-[9px] text-theme-muted mt-0.5 leading-relaxed">
                            Google Maps API quota habis. Menyajikan pangkalan data cadangan OpenStreetMap gratis.
                        </p>
                    </div>
                </div>
            )}

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 mb-4 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <div>
                        <h4 className="text-[10px] font-bold text-red-500">Error Loading Places</h4>
                        <p className="text-[9px] text-theme-muted mt-0.5 leading-relaxed">{errorMsg}</p>
                    </div>
                </div>
            )}

            {/* Subcategory & Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-3 border-b border-theme-border/40 mb-4">
                <button
                    onClick={() => setActiveFilter('museum')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                        activeFilter === 'museum'
                            ? 'bg-gold text-charcoal'
                            : 'bg-theme-surface border border-theme-border/60 text-theme-muted'
                    }`}
                >
                    <Building2 className="w-3.5 h-3.5" />
                    Museum ({categoryCounts.museum})
                </button>
                <button
                    onClick={() => setActiveFilter('gallery')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                        activeFilter === 'gallery'
                            ? 'bg-gold text-charcoal'
                            : 'bg-theme-surface border border-theme-border/60 text-theme-muted'
                    }`}
                >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Galeri ({categoryCounts.gallery})
                </button>
                <button
                    onClick={() => setActiveFilter('heritage')}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                        activeFilter === 'heritage'
                            ? 'bg-gold text-charcoal'
                            : 'bg-theme-surface border border-theme-border/60 text-theme-muted'
                    }`}
                >
                    <Compass className="w-3.5 h-3.5" />
                    Cagar Budaya ({categoryCounts.heritage})
                </button>
            </div>

            {/* Responsive Map Drawer Toggle */}
            {viewMode === 'map' && (
                <div className="h-64 rounded-2xl overflow-hidden border border-theme-border/60 mb-5 relative z-10 shadow-md">
                    <div ref={mapContainerRef} className="w-full h-full z-0" />
                    <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-full text-[9px] font-bold text-white z-[1000] pointer-events-none flex items-center gap-1">
                        <MapIcon className="w-3 h-3 text-gold" />
                        PETA INTERAKTIF
                    </div>
                </div>
            )}

            {/* Places vertical feed layout */}
            {isLoading ? (
                <div className="py-12 flex flex-col items-center gap-2">
                    <Loader2 className="w-7 h-7 text-gold animate-spin" />
                    <p className="text-theme-muted text-[11px] font-medium">Memuat destinasi...</p>
                </div>
            ) : filteredPlaces.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-theme-border/60 rounded-2xl bg-theme-surface/30">
                    <Compass className="w-8 h-8 text-theme-muted/50 mx-auto mb-2" />
                    <h3 className="text-xs font-bold text-theme-text">Destinasi Kosong</h3>
                    <p className="text-theme-muted text-[10px] max-w-xs mx-auto mt-0.5">Tidak ditemukan data pada kriteria filter terpilih.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPlaces.map((place) => {
                        const matchedType = classifyPlace(place);
                        let typeLabel = 'Museum';
                        if (matchedType === 'gallery') {
                            typeLabel = 'Galeri Seni';
                        } else if (matchedType === 'heritage') {
                            typeLabel = 'Cagar Budaya';
                        }

                        // Extract cover image — handle both direct URLs and Google Places photo objects
                        let displayImage = place.cover_image_url;
                        if (!displayImage && place.photos && place.photos.length > 0) {
                            const firstPhoto = place.photos[0];
                            if (typeof firstPhoto === 'string' && firstPhoto.startsWith('http')) {
                                displayImage = firstPhoto;
                            }
                            // Google Places photo objects (e.g. {name: 'places/.../photos/...'}) are NOT direct URLs
                            // They need the place-details endpoint to resolve — don't use them as img src
                        }
                        if (!displayImage) {
                            if (matchedType === 'gallery') displayImage = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&q=80';
                            else if (matchedType === 'heritage') displayImage = 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=500&q=80';
                            else displayImage = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=500&q=80';
                        }

                        return (
                            <div
                                key={place.id}
                                onClick={() => onSelectPlace(place)}
                                className="group bg-theme-surface border border-theme-border/60 hover:border-gold/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col"
                            >
                                {/* Image Banner */}
                                <div className="relative h-44 overflow-hidden">
                                    <img 
                                        src={displayImage} 
                                        alt={place.name}
                                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = '/images/museum/museumnasionalindonesia.png';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                    
                                    {/* Featured Tag Mockup */}
                                    {place.rating >= 4.6 && (
                                        <span className="absolute top-3 right-3 bg-gold text-[#1a1a1a] text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                                            FEATURED
                                        </span>
                                    )}
                                </div>

                                {/* Text Info */}
                                <div className="p-4">
                                    <span className="text-gold text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                        <Building2 className="w-3 h-3" />
                                        {typeLabel}
                                    </span>
                                    <h3 className="text-base font-serif font-bold text-theme-text group-hover:text-gold transition-colors line-clamp-1">
                                        {place.name}
                                    </h3>
                                    <p className="text-[11px] text-theme-muted mt-1 line-clamp-2 leading-relaxed">
                                        {place.address || 'Alamat lokasi terdaftar di pangkalan data.'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating Map/List Switch Button at Bottom Center */}
            <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none">
                <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                    className="pointer-events-auto flex items-center gap-1.5 px-5 py-3 rounded-full bg-black dark:bg-[#FAF8F5] text-white dark:text-black font-bold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
                >
                    {viewMode === 'list' ? (
                        <>
                            <MapIcon className="w-4 h-4 text-gold" />
                            <span>Tampilkan Peta</span>
                        </>
                    ) : (
                        <>
                            <LayoutGrid className="w-4 h-4 text-gold" />
                            <span>Tampilkan Daftar</span>
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
};
