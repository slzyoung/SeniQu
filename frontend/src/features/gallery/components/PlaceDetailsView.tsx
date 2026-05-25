import React from 'react';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, 
    Share2, 
    Check, 
    Plus, 
    MapPin, 
    BookOpen, 
    Loader2, 
    ExternalLink, 
    Palette, 
    ChevronRight,
    Star,
    MessageCircle
} from 'lucide-react';
import { CityMetadata } from '../data/citiesRegistry';

interface PlaceDetailsViewProps {
    selectedPlace: any;
    cityMetadata: CityMetadata;
    isFollowing: boolean;
    setIsFollowing: (following: boolean) => void;
    wikiLoadingId: string | null;
    wikiDataMap: Record<string, any>;
    wikiErrorMap: Record<string, string>;
    collectionLoading: boolean;
    collectionArtworks: any[];
    onBackToPlaces: () => void;
}

export const PlaceDetailsView: React.FC<PlaceDetailsViewProps> = ({
    selectedPlace,
    cityMetadata,
    isFollowing,
    setIsFollowing,
    wikiLoadingId,
    wikiDataMap,
    wikiErrorMap,
    collectionLoading,
    collectionArtworks,
    onBackToPlaces,
}) => {
    return (
        <motion.div
            key="details"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="bg-theme-surface rounded-3xl overflow-hidden border border-theme-border/60 shadow-xl"
        >
            {/* Photo Cover Banner */}
            <div className="relative h-60 w-full overflow-hidden bg-black">
                <img 
                    src={selectedPlace.cover_image_url || (selectedPlace.photos && selectedPlace.photos[0]) || 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80'} 
                    alt={selectedPlace.name} 
                    className="w-full h-full object-cover opacity-80"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/museum/museumnasionalindonesia.png';
                    }}
                />
                
                {/* Back button overlay */}
                <button
                    onClick={onBackToPlaces}
                    className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-colors"
                >
                    <ArrowLeft className="w-4.5 h-4.5" />
                </button>

                {/* Action Buttons Overlay */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button 
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-colors"
                        title="Bagikan Lokasi"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                    
                    <button 
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={`px-3 py-1 rounded-full flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                            isFollowing 
                                ? 'bg-gold text-black border-gold' 
                                : 'bg-black/60 hover:bg-black/80 border-white/10 text-white'
                        }`}
                    >
                        {isFollowing ? (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Following</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Follow</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Floating Initial Avatar Badge */}
            <div className="flex justify-center -mt-10 relative z-20">
                <div className="w-20 h-20 rounded-full border-4 border-[#121214] bg-charcoal dark:bg-zinc-800 text-white font-serif text-3xl font-bold flex items-center justify-center shadow-lg">
                    {selectedPlace.name ? selectedPlace.name.charAt(0) : 'M'}
                </div>
            </div>

            {/* Place Metadata Information */}
            <div className="px-5 pt-3 pb-6 text-center">
                <h1 className="text-xl md:text-2xl font-serif font-bold text-theme-text tracking-wide uppercase">
                    {selectedPlace.name}
                </h1>
                <p className="text-xs text-theme-muted mt-1.5 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{selectedPlace.city || cityMetadata.name}, Indonesia</span>
                </p>

                {/* Wikipedia Summary / History Section */}
                <div className="mt-5 text-left pt-5 border-t border-theme-border/40">
                    <h3 className="text-xs font-bold tracking-wider text-theme-text uppercase mb-2 flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-gold" />
                        Deskripsi & Sejarah Singkat
                    </h3>
                    
                    {wikiLoadingId === selectedPlace.id ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                            <Loader2 className="w-4.5 h-4.5 text-gold animate-spin shrink-0" />
                            <p className="text-[10px] text-theme-muted font-sans font-medium">Memuat sejarah singkat dari Wikipedia...</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-theme-text/90 font-serif leading-relaxed text-justify">
                                {wikiDataMap[selectedPlace.id]?.extract || 
                                 wikiErrorMap[selectedPlace.id] ||
                                 selectedPlace.description || 
                                 'Tidak ada sejarah singkat yang terdaftar untuk lokasi ini.'}
                            </p>

                            {wikiDataMap[selectedPlace.id]?.url && (
                                <a 
                                    href={wikiDataMap[selectedPlace.id].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2.5 text-blue-500 hover:underline flex items-center gap-0.5 text-[10px] font-sans font-bold"
                                >
                                    Baca Selengkapnya di Wikipedia
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            )}
                        </>
                    )}
                </div>

                {/* Star Divider Accent */}
                <div className="my-6 flex items-center justify-center gap-2">
                    <div className="h-[1px] bg-theme-border/50 flex-grow max-w-[80px]" />
                    <span className="text-[#CBA36D] text-xs">✦</span>
                    <div className="h-[1px] bg-theme-border/50 flex-grow max-w-[80px]" />
                </div>

                {/* ==========================================================
                    THE COLLECTION (Gold Wood Framed Cards - Screenshot 4 Layout)
                   ========================================================== */}
                <div className="text-left">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-bold tracking-wider text-theme-text uppercase">
                            THE COLLECTION
                        </h3>
                        <ChevronRight className="w-4 h-4 text-theme-muted" />
                    </div>
                    <p className="text-[9px] text-theme-muted mb-4 leading-normal">
                        Daftar karya/artefak terunggah yang dikelola mandiri oleh masing-masing pengelola museum via CDN Storage R2.
                    </p>

                    {collectionLoading ? (
                        <div className="py-12 flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-gold animate-spin" />
                            <p className="text-[10px] text-theme-muted">Menghubungi CDN Storage R2...</p>
                        </div>
                    ) : collectionArtworks.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-theme-border/60 rounded-2xl">
                            <Palette className="w-7 h-7 text-theme-muted opacity-40 mx-auto mb-2" />
                            <p className="text-[11px] text-theme-text font-bold">Koleksi Belum Diunggah</p>
                        </div>
                    ) : (
                        /* 2x2 grid of gold-framed items matching mockup */
                        <div className="grid grid-cols-2 gap-4">
                            {collectionArtworks.map((art) => (
                                <div 
                                    key={art.id}
                                    className="vintage-double-border flex flex-col justify-between"
                                >
                                    {/* Inner canvas box */}
                                    <div className="w-full aspect-[4/3] bg-black shadow-inner overflow-hidden border border-amber-900/60 rounded mb-2">
                                        <img 
                                            src={art.primary_image_url || art.cover_image_url} 
                                            alt={art.title} 
                                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '/images/gallery/galerinasionalindonesia.jpg';
                                            }}
                                        />
                                    </div>

                                    {/* Brass/paper label plate */}
                                    <div className="label-plate p-1.5 rounded text-[#2c2720] flex flex-col">
                                        <h4 className="text-[9px] font-bold font-serif line-clamp-1 uppercase tracking-tight">
                                            {art.title}
                                        </h4>
                                        <p className="text-[8px] text-stone-600 truncate mt-0.5">
                                            Oleh: {art.artist?.displayName || 'Unknown Artist'}
                                        </p>
                                        <div className="flex items-center justify-between text-[7px] text-stone-500 font-bold mt-1 pt-1 border-t border-stone-300/60">
                                            <span>Medium: {art.medium ? art.medium.split(' ')[0] : 'N/A'}</span>
                                            <span>Tahun: {art.year || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Star Divider Accent */}
                <div className="my-6 flex items-center justify-center gap-2">
                    <div className="h-[1px] bg-theme-border/50 flex-grow max-w-[80px]" />
                    <span className="text-[#CBA36D] text-xs">✦</span>
                    <div className="h-[1px] bg-theme-border/50 flex-grow max-w-[80px]" />
                </div>

                {/* Google Maps Reviews Section */}
                <div className="text-left">
                    <h3 className="text-xs font-bold tracking-wider text-theme-text uppercase mb-1 flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 text-gold" />
                        Ulasan Google Maps
                    </h3>
                    <p className="text-[9px] text-theme-muted mb-4 leading-normal">
                        Pendapat langsung dari pengunjung di Google Maps.
                    </p>

                    {selectedPlace.reviews && selectedPlace.reviews.length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-transparent">
                            {selectedPlace.reviews.map((review: any, i: number) => (
                                <div 
                                    key={i} 
                                    className="p-3 rounded-2xl bg-black/20 dark:bg-white/5 border border-theme-border/40 flex flex-col gap-1.5"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-theme-text font-sans">
                                            {review.author}
                                        </span>
                                        <span className="text-[8px] text-theme-muted">
                                            {review.time}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }).map((_, si) => (
                                            <Star
                                                key={si}
                                                className={`w-3 h-3 ${si < review.rating ? 'fill-gold text-gold' : 'text-theme-muted'}`}
                                            />
                                        ))}
                                    </div>

                                    {review.text && (
                                        <p className="text-[10.5px] text-theme-text/80 font-sans leading-relaxed text-justify">
                                            {review.text}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center border border-dashed border-theme-border/60 rounded-2xl">
                            <MessageCircle className="w-7 h-7 text-theme-muted opacity-40 mx-auto mb-2" />
                            <p className="text-[11px] text-theme-text font-bold">Belum Ada Ulasan</p>
                            <p className="text-[9px] text-theme-muted mt-0.5">Ulasan Google Maps tidak tersedia untuk lokasi ini.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
