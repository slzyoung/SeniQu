import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, X, Heart, CheckCircle2, Lock, FileText, Database, Search, ChevronRight, ChevronLeft, RotateCw } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { useArtworks } from '../../../hooks/useArtworks';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';
import { Artwork } from '../../../lib/types';
import { SEOHead } from '../../../components/common/SEOHead';
import { GlowCard } from '../../../components/GlowCard';
import { museumService } from '../../../services/museumService';
import { CITY_REGIONS_MAP, getRealPlaceCoverImage } from '../data/citiesRegistry';
import { API_BASE_URL } from '../../../lib/constants';

const CITIES = [
    { name: 'Bali', key: 'bali' },
    { name: 'DKI JAKARTA', key: 'dki jakarta' },
    { name: 'Jawa Tengah', key: 'jawa tengah' },
    { name: 'Yogyakarta', key: 'yogyakarta' }
];

const JAWA_TENGAH_REGIONS = [
    {
        id: "semarang",
        name: "Semarang",
        description: "Ibu kota Jawa Tengah dengan pesona sejarah Kota Lama colonial.",
        keywords: ["semarang", "kota lama", "lawang sewu"],
        image: "https://cdn.seniqu.art/assets/static/cities/semarang.webp"
    },
    {
        id: "tegal",
        name: "Tegal",
        description: "Wilayah pesisir utara Jawa Tengah yang kaya akan cagar budaya prasejarah.",
        keywords: ["tegal", "semedo"],
        image: "https://cdn.seniqu.art/assets/static/cities/solo.webp"
    },
    {
        id: "solo",
        name: "Surakarta (Solo)",
        description: "Pusat kebudayaan Jawa klasik warisan agung Kasunanan Surakarta.",
        keywords: ["solo", "surakarta", "kraton solo", "kasunanan"],
        image: "https://cdn.seniqu.art/assets/static/cities/solo.webp"
    }
];

// Curated verified lists matching physical folder/CDN paths
const VERIFIED_CDN_INSTITUTIONS = [
    // Bali (mapped to denpasar subDistrict to show them all together under Bali page)
    { name: 'MUSEUM PASIFIKA', city: 'bali', subDistrict: 'denpasar', type: 'museum', description: 'Museum seni rupa di Bali yang menampilkan karya dari seniman Asia Pasifik.' },
    { name: 'Museum Geopark Batur', city: 'bali', subDistrict: 'denpasar', type: 'museum', description: 'Museum geopark yang menyajikan warisan geologi Gunung Batur.' },
    { name: 'UPT. MUSEUM BALI', city: 'bali', subDistrict: 'denpasar', type: 'museum', description: 'Museum kebudayaan tertua di Bali yang menyimpan koleksi etnografi.' },

    // Jawa Tengah -> Semarang
    { name: 'Semarang Contemporary Art Gallery', city: 'jawa tengah', subDistrict: 'semarang', type: 'gallery', description: 'Galeri seni kontemporer ternama di Kota Lama Semarang.' },
    { name: 'Museum Kota Lama', city: 'jawa tengah', subDistrict: 'semarang', type: 'museum', description: 'Museum sejarah interaktif Kota Lama Semarang.' },

    // Jawa Tengah -> Tegal
    { name: 'Museum Semedo', city: 'jawa tengah', subDistrict: 'tegal', type: 'museum', description: 'Museum prasejarah yang menyimpan fosil manusia purba Semedo.' },

    // Yogyakarta
    { name: 'Museum Sonobudoyo', city: 'yogyakarta', subDistrict: 'kota', type: 'museum', description: 'Museum kebudayaan Jawa terlengkap di Yogyakarta.' },

    // DKI Jakarta
    { name: 'Museum Bank Indonesia', city: 'dki jakarta', subDistrict: 'barat', type: 'museum', description: 'Museum sejarah keuangan Indonesia bertempat di gedung cagar budaya.' },
    { name: 'Galeri Nasional Indonesia', city: 'dki jakarta', subDistrict: 'pusat', type: 'gallery', description: 'Lembaga museum dan galeri seni rupa modern nasional.' },
    { name: 'Museum Paseban', city: 'dki jakarta', subDistrict: 'timur', type: 'museum', description: 'Museum sejarah lokal di Jakarta Timur.' }
];

const generateLocalArtworks = () => {
    const list: Artwork[] = [];

    // 1. Museum Geopark Batur (20 items)
    const baturIds = [
        7293, 7294, 7295, 7296, 7297, 7299, 7300, 7301, 7302, 7303,
        7304, 7305, 7306, 7307, 7308, 7309, 7310, 7311, 7312, 7313
    ];
    baturIds.forEach((num, index) => {
        list.push({
            id: `local-batur-${num}`,
            title: `Batur Geopark Artifact #${num}`,
            description: `Koleksi geologi dan kebudayaan kawasan Gunung Batur ke-${index + 1}.`,
            primaryImageUrl: `https://cdn.seniqu.art/Bali/Museum/Museum%20Geopark%20Batur/IMG_${num}.jpg`,
            region: 'Bali',
            yearCreated: '2026',
            category: 'Heritage',
            artist: { displayName: 'Tim Konservasi Batur' },
            poaCertificate: {
                hash: `0x8f2d9c4b7a1e0f358b2c4d9e0f1a2b3c4d5e${num}`,
                r2Path: `Bali/Museum/Museum Geopark Batur/IMG_${num}.jpg`
            }
        } as any);
    });

    // 2. UPT. MUSEUM BALI (20 items)
    const uptIds = [
        6400, 6401, 6402, 6405, 6407, 6411, 6412, 6416, 6421, 6422,
        6423, 6425, 6426, 6427, 6428, 6429, 6431, 6432, 6433, 6434
    ];
    uptIds.forEach((num, index) => {
        list.push({
            id: `local-upt-${num}`,
            title: `Museum Bali Preservation #${num}`,
            description: `Artefak prasejarah dan etnografi Bali ke-${index + 1}.`,
            primaryImageUrl: `https://cdn.seniqu.art/Bali/Museum/UPT.%20MUSEUM%20BALI/IMG_${num}.jpg`,
            region: 'Bali',
            yearCreated: '2026',
            category: 'Heritage',
            artist: { displayName: 'Tim Konservasi Bali' },
            poaCertificate: {
                hash: `0x3c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a${num}`,
                r2Path: `Bali/Museum/UPT. MUSEUM BALI/IMG_${num}.jpg`
            }
        } as any);
    });

    // 3. MUSEUM PASIFIKA (21 items)
    const pasifikaIds: number[] = [];
    for (let i = 6975; i <= 6995; i++) {
        pasifikaIds.push(i);
    }
    pasifikaIds.forEach((num, index) => {
        list.push({
            id: `local-pasifika-${num}`,
            title: `Museum Pasifika Collection #${num}`,
            description: `Karya seni rupa Asia Pasifik bernilai sejarah tinggi ke-${index + 1}.`,
            primaryImageUrl: `https://cdn.seniqu.art/Bali/Museum/MUSEUM%20PASIFIKA/IMG_${num}.jpg`,
            region: 'Bali',
            yearCreated: '2026',
            category: 'Heritage',
            artist: { displayName: 'Tim Seni Pasifika' },
            poaCertificate: {
                hash: `0x5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b${num}`,
                r2Path: `Bali/Museum/MUSEUM PASIFIKA/IMG_${num}.jpg`
            }
        } as any);
    });

    // 4. Museum Kota Lama (42 items)
    const kotalamaIds = [
        "141604", "141611", "141807", "143257", "144540", "144604", "144610", "144646",
        "144708", "144716", "144759", "144825", "144916", "144923", "145001", "145011",
        "145025", "145031", "145038", "145041", "145104", "145124", "145131", "145336",
        "145705", "145749", "145806", "145812", "145852", "145859", "145908", "145915",
        "150004", "150010", "150019", "150025", "150030", "150035", "150043", "150059",
        "150447", "150554"
    ];
    kotalamaIds.forEach((id, index) => {
        list.push({
            id: `local-kotalama-${id}`,
            title: `Kota Lama Artifact #${id}`,
            description: `Aset sejarah kolonial Kota Lama Semarang ke-${index + 1}.`,
            primaryImageUrl: `https://cdn.seniqu.art/Jawa Tengah/Semarang/Museum/Museum Kota Lama/IMG_20260409_${id}.jpg`,
            region: 'Jawa Tengah',
            yearCreated: '2026',
            category: 'Heritage',
            artist: { displayName: 'Tim Konservasi Semarang' },
            poaCertificate: {
                hash: `0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a${id}`,
                r2Path: `Jawa Tengah/Semarang/Museum/Museum Kota Lama/IMG_20260409_${id}.jpg`
            }
        } as any);
    });

    // 5. Semarang Contemporary Art Gallery (37 items)
    const galleryItems = [
        { title: 'Actual Occasions', file: 'Actual Occasions.jpg' },
        { title: 'Actual Sublime', file: 'Actual Sublime.jpg' },
        { title: 'Akaji', file: 'Akaji.jpg' },
        { title: 'Bersemi di Tanah Basah', file: 'Bersemi di Tanah Basah.jpg' },
        { title: 'Blue Prayer', file: 'Blue Prayer.jpg' },
        { title: 'Chaotic Beauty Home', file: 'Chaotic Beauty Home.jpg' },
        { title: 'Flow', file: 'Flow.jpg' },
        { title: 'Futakoto #2 Futakoto #1', file: 'Futakoto #2 Futakoto #1.jpg' },
        { title: 'Hope in the Dry Season', file: 'Hope in the Dry Season.jpg' },
        { title: 'Ijo Royo-Royo', file: 'Ijo Royo-Royo.jpg' },
        { title: 'In Between', file: 'In Between.jpg' },
        { title: 'In Stillness', file: 'In Stillness.jpg' },
        { title: 'Jaga Harmoni', file: 'Jaga Harmoni.jpg' },
        { title: 'Kontemplasi #1', file: 'Kontemplasi #1.jpg' },
        { title: 'Kontemplasi #2', file: 'Kontemplasi #2.jpg' },
        { title: 'Lapisan Dalam', file: 'Lapisan Dalam.jpg' },
        { title: 'Lintas Ambang', file: 'Lintas Ambang.jpg' },
        { title: 'Melihat Air di Sebelah', file: 'Melihat Air di Sebelah.jpg' },
        { title: 'Mikrosmos', file: 'Mikrosmos.jpg' },
        { title: 'Myth of Attraction', file: 'Myth of Attraction.jpg' },
        { title: 'Nayami', file: 'Nayami.jpg' },
        { title: 'Scary Night', file: 'Scary Night.jpg' },
        { title: 'Shallow Field', file: 'Shallow Field.jpg' },
        { title: 'Siklus Perpindahan Air', file: 'Siklus Perpindahan Air.jpg' },
        { title: 'Spirit Ranting Emas', file: 'Spirit Ranting Emas.jpg' },
        { title: 'Tat Twam Asi #1', file: 'Tat Twam Asi #1.jpg' },
        { title: 'Tat Twam Asi #2', file: 'Tat Twam Asi #2.jpg' },
        { title: 'The Wanderer', file: 'The Wanderer.jpg' },
        { title: 'To Be Continued', file: 'To Be Continued.jpg' },
        { title: 'Gallery Composition #121623', file: 'IMG_20260409_121623.jpg' },
        { title: 'Gallery Composition #131039', file: 'IMG_20260409_131039.jpg' },
        { title: 'Gallery Composition #131519', file: 'IMG_20260409_131519.jpg' },
        { title: 'Gallery Composition #131802', file: 'IMG_20260409_131802.jpg' },
        { title: 'Gallery Composition #131825', file: 'IMG_20260409_131825.jpg' },
        { title: 'Gallery Composition #132757', file: 'IMG_20260409_132757.jpg' },
        { title: 'Gallery Composition #132838', file: 'IMG_20260409_132838.jpg' },
        { title: 'Gallery Composition #132844', file: 'IMG_20260409_132844.jpg' }
    ];
    galleryItems.forEach((item, index) => {
        list.push({
            id: `local-gallery-${index}`,
            title: item.title,
            description: `Karya seni kontemporer terpilih di Galeri Semarang ke-${index + 1}.`,
            primaryImageUrl: `https://cdn.seniqu.art/Jawa Tengah/Semarang/Galery/Semarang Contemporary Art Gallery/${encodeURIComponent(item.file)}`,
            region: 'Jawa Tengah',
            yearCreated: '2026',
            category: 'Art',
            artist: { displayName: 'Kontributor Galeri' },
            poaCertificate: {
                hash: `0x6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b${index}`,
                r2Path: `Jawa Tengah/Semarang/Galery/Semarang Contemporary Art Gallery/${item.file}`
            }
        } as any);
    });

    return list;
};

const LOCAL_FALLBACK_ARTWORKS: Artwork[] = generateLocalArtworks();

const HeicImage = ({ src, alt, className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const isHeic = src?.toLowerCase().endsWith('.heic');
    const displaySrc = isHeic
        ? `${API_BASE_URL}/proxy?url=${encodeURIComponent(src)}`
        : src;

    useEffect(() => {
        if (!displaySrc) {
            setLoading(false);
            setError(true);
            return;
        }

        setLoading(true);
        setError(false);
        
        const img = new Image();
        img.src = displaySrc;
        img.onload = () => {
            setLoading(false);
        };
        img.onerror = () => {
            setLoading(false);
            setError(true);
        };
        
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [displaySrc]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-theme-surface/50 ${className}`} style={style}>
                <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !displaySrc) {
        return (
            <div className={`flex items-center justify-center bg-theme-surface/50 text-theme-muted/50 text-[10px] ${className}`} style={style}>
                <span>Format tidak didukung</span>
            </div>
        );
    }

    return (
        <img
            src={displaySrc}
            alt={alt}
            className={className}
            style={style}
            loading="lazy"
        />
    );
};

const CURATIONS = [
    {
        id: 'pusaka-jawa',
        title: 'Pusaka Jawa Kuno',
        subtitle: 'Heritage of Java',
        description: 'Preservasi digital artefak logam, keris peninggalan dinasti Mataram dan Majapahit.',
        coverUrl: 'https://cdn.seniqu.art/museums/images/72c2bead-5c19-4a80-aca3-2e7d7a69459c.webp',
        cityKey: 'yogyakarta',
        institutionName: 'Museum Sonobudoyo'
    },
    {
        id: 'magis-nusantara',
        title: 'Magis Pura Bali',
        subtitle: 'Sacred Bali Arts',
        description: 'Keindahan arsitektur pura, patung batu vulkanik, dan lukisan klasik kamasan khas Dewata.',
        coverUrl: 'https://cdn.seniqu.art/museums/images/c31315d0-4399-471d-bb9b-412647b2db07.webp',
        cityKey: 'bali',
        institutionName: 'UPT. Museum Bali'
    },
    {
        id: 'semarang-kolonial',
        title: 'Pesona Kota Lama',
        subtitle: 'Semarang Old City',
        description: 'Peninggalan sejarah perdagangan maritim, barang antik, dan cagar budaya Kota Lama Semarang.',
        coverUrl: 'https://cdn.seniqu.art/museums/images/d2cf8036-8e81-4e17-af42-3829e388e289.webp',
        cityKey: 'jawa tengah',
        institutionName: 'Museum Kota Lama'
    },
    {
        id: 'modern-expressions',
        title: 'Karya Kontemporer',
        subtitle: 'Modern Expressions',
        description: 'Lukisan ekspresionis dan kurasi karya seni rupa modern perupa legendaris Nusantara.',
        coverUrl: 'https://cdn.seniqu.art/museums/images/e5ab352d-ffb6-4e3f-8d30-a36da629196d.webp',
        cityKey: 'bali',
        institutionName: 'Museum Pasifika'
    }
];

const CurationCarousel = ({ onSelectCuration }: { onSelectCuration: (curation: typeof CURATIONS[0]) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Track active index on scroll
    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollLeft } = containerRef.current;
            // Width of one item is roughly 280px or 320px + 16px gap
            const itemWidth = containerRef.current.firstElementChild
                ? (containerRef.current.firstElementChild as HTMLElement).offsetWidth + 16
                : 316;
            const index = Math.round(scrollLeft / itemWidth);
            setActiveIndex(Math.min(Math.max(index, 0), CURATIONS.length - 1));
        }
    };

    const scrollToIndex = (index: number) => {
        if (containerRef.current) {
            const itemWidth = containerRef.current.firstElementChild
                ? (containerRef.current.firstElementChild as HTMLElement).offsetWidth + 16
                : 316;
            containerRef.current.scrollTo({
                left: index * itemWidth,
                behavior: 'smooth'
            });
            setActiveIndex(index);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        let nextIndex = activeIndex;
        if (direction === 'left') {
            nextIndex = activeIndex > 0 ? activeIndex - 1 : CURATIONS.length - 1;
        } else {
            nextIndex = activeIndex < CURATIONS.length - 1 ? activeIndex + 1 : 0;
        }
        scrollToIndex(nextIndex);
    };

    // Auto-play effect
    useEffect(() => {
        if (isHovered) return;
        const interval = setInterval(() => {
            scroll('right');
        }, 4000); // Auto-scroll every 4 seconds

        return () => clearInterval(interval);
    }, [activeIndex, isHovered]);

    return (
        <div 
            className="relative group/carousel py-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Scroll Buttons */}
            <button 
                onClick={() => scroll('left')}
                className="absolute left-1 top-[42%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 border border-gold/30 hover:border-gold text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 shadow-lg"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button 
                onClick={() => scroll('right')}
                className="absolute right-1 top-[42%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 border border-gold/30 hover:border-gold text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 shadow-lg"
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Carousel Container */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory gap-4 px-1 py-2 scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {CURATIONS.map((curation, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                        <motion.div
                            key={curation.id}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            onClick={() => onSelectCuration(curation)}
                            className={`flex-shrink-0 w-[280px] sm:w-[320px] aspect-[16/10] rounded-2xl overflow-hidden border ${isActive ? 'border-gold shadow-[0_0_15px_rgba(186,149,73,0.3)]' : 'border-theme-border/50'} bg-theme-surface shadow-md relative cursor-pointer snap-start group transition-all duration-300`}
                        >
                            {/* Cover Image */}
                            <HeicImage 
                                src={curation.coverUrl} 
                                alt={curation.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80"
                            />
                            {/* Vignette Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />
                            
                            {/* Card Content */}
                            <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                                <div className="space-y-0.5">
                                    <span className="text-[8px] font-bold text-gold uppercase tracking-widest block">
                                        {curation.subtitle}
                                    </span>
                                    <h4 className="text-xs font-bold font-serif leading-tight group-hover:text-gold transition-colors">
                                        {curation.title}
                                    </h4>
                                    <p className="text-[9px] text-white/70 line-clamp-2 leading-normal mt-1">
                                        {curation.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Indicator Dots */}
            <div className="flex justify-center items-center gap-1.5 mt-2">
                {CURATIONS.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => scrollToIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-5 bg-gold' : 'w-1.5 bg-theme-border/80 hover:bg-gold/40'}`}
                        aria-label={`Slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

const FeaturedArtCard = ({ artwork, delay, onClick }: { artwork: Artwork; delay: number; onClick: () => void }) => {
    // Determine aspect ratio deterministically based on string ID hash
    const getAspectClass = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const val = Math.abs(hash) % 3;
        if (val === 0) return 'aspect-[3/4]'; // Tall
        if (val === 1) return 'aspect-[4/3]'; // Wide
        return 'aspect-square'; // Square
    };

    const aspectClass = getAspectClass(artwork.id);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ 
                y: -8, 
                scale: 1.02, 
                boxShadow: "0px 15px 35px rgba(186, 149, 73, 0.25)",
            }}
            onClick={onClick}
            className="group relative rounded-2xl overflow-hidden border border-theme-border/50 bg-theme-surface cursor-pointer shadow-md transition-all duration-500 ease-out"
        >
            <div className={`relative overflow-hidden w-full ${aspectClass}`}>
                <img
                    src={artwork.primaryImageUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[800ms] ease-out"
                    loading="lazy"
                />
                
                {/* Overlay gradient - fades in on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Minimal info overlay (always visible but slides up/shows more details on hover) */}
                <div className="absolute bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-black/90 via-black/30 to-transparent text-white flex flex-col justify-end min-h-[50%] transition-transform duration-300">
                    <span className="text-[8px] font-bold text-gold uppercase tracking-widest block mb-1">
                        {artwork.category || 'Heritage'}
                    </span>
                    <h4 className="text-[11px] font-bold font-serif leading-tight line-clamp-2 group-hover:text-gold transition-colors duration-300">
                        {artwork.title}
                    </h4>
                    <p className="text-[9px] text-white/70 line-clamp-1 mt-0.5 font-medium">
                        {artwork.artist?.displayName || 'Unknown Artist'}
                    </p>
                    
                    {/* Extra detail shown only on hover */}
                    <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-2 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100">
                        <p className="text-[8px] text-white/50 line-clamp-2 leading-relaxed">
                            {artwork.description || 'Digital preservation of Indonesian fine art.'}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Helper to parse R2 CDN path structure from URL
const parseArtworkCDNPath = (url?: string) => {
    if (!url || !url.includes('cdn.seniqu.art')) return null;
    try {
        const pathname = decodeURIComponent(new URL(url).pathname);
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length === 4) {
            const [city, type, instName] = parts;
            return {
                city: city.trim(),
                subDistrict: city.trim(),
                type: type.trim().toLowerCase() === 'galery' || type.trim().toLowerCase() === 'galeri' ? 'gallery' : type.trim().toLowerCase(),
                instName: instName.trim()
            };
        } else if (parts.length >= 5) {
            const [city, subDistrict, type, instName] = parts;
            return {
                city: city.trim(),
                subDistrict: subDistrict.trim(),
                type: type.trim().toLowerCase() === 'galery' || type.trim().toLowerCase() === 'galeri' ? 'gallery' : type.trim().toLowerCase(),
                instName: instName.trim()
            };
        }
    } catch (e) {
        console.error('Error parsing CDN path:', e);
    }
    return null;
};

interface SubDistrict {
    id: string;
    name: string;
    description?: string;
    keywords: string[];
    image?: string;
}

// Helper to resolve sub-district based on keywords/address
const getInstitutionSubDistrict = (inst: any, cityKey: string): SubDistrict | null => {
    const name = (inst.name || '').toLowerCase();
    const addressStr = (inst.address?.street || inst.address?.city || inst.city || '').toLowerCase();

    // First try matching against verified list
    const matchedInst = VERIFIED_CDN_INSTITUTIONS.find(
        v => v.name.toLowerCase() === name || name.includes(v.name.toLowerCase())
    );
    
    let regionsList: any[] = [];
    if (cityKey === 'dki jakarta') {
        regionsList = CITY_REGIONS_MAP.jakarta || [];
    } else if (cityKey === 'yogyakarta') {
        regionsList = CITY_REGIONS_MAP.yogyakarta || [];
    } else if (cityKey === 'bali') {
        regionsList = CITY_REGIONS_MAP.bali || [];
    } else if (cityKey === 'jawa tengah') {
        regionsList = JAWA_TENGAH_REGIONS;
    }

    if (matchedInst) {
        const reg = regionsList.find(r => r.id === matchedInst.subDistrict);
        if (reg) return reg;
    }

    // Fallback: match keywords
    for (const reg of regionsList) {
        if (reg.keywords?.some((kw: string) => {
            const kwLower = kw.toLowerCase();
            return addressStr.includes(kwLower) || name.includes(kwLower);
        })) {
            return reg;
        }
    }
    return regionsList[0] || null;
};

export default function CollectionsPage() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
    const [followedInstitutions, setFollowedInstitutions] = useState<Record<string, boolean>>({});
    const [activeModalTab, setActiveModalTab] = useState<'info' | 'security'>('info');

    // Breadcrumb state navigation
    const [activeCity, setActiveCity] = useState<{ name: string; key: string } | null>(null);
    const [activeSubDistrict, setActiveSubDistrict] = useState<{ id: string; name: string; description?: string; keywords: string[]; image?: string } | null>(null);
    const [activeInstitution, setActiveInstitution] = useState<{ name: string; info: any; list: Artwork[] } | null>(null);

    const { cityId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Fetch real artworks from database (limit 100 to index all metadata)
    const { data: dbArtworks, isLoading: isLoadingArtworks } = useArtworks({
        limit: 100
    });

    // Fetch real museums/galleries from database
    const { data: dbMuseums, isLoading: isLoadingMuseums } = useQuery({
        queryKey: ['collections-museums'],
        queryFn: () => museumService.getMuseums({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false
    });

    const isLoading = isLoadingArtworks || isLoadingMuseums;
    const artworks = useMemo(() => [...(dbArtworks?.data || []), ...LOCAL_FALLBACK_ARTWORKS], [dbArtworks?.data]);
    const museums = useMemo(() => dbMuseums?.data || [], [dbMuseums?.data]);

    const [randomArtworks, setRandomArtworks] = useState<Artwork[]>([]);

    // Function to shuffle and select 9 random artworks from the pool
    const shuffleArtworks = () => {
        const pool = artworks.filter(art => art.primaryImageUrl);
        if (pool.length === 0) return;
        
        // Fisher-Yates shuffle to pick 9 random unique items
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setRandomArtworks(shuffled.slice(0, 9));
    };

    // Initialize/update random artworks when artworks pool loads or changes
    useEffect(() => {
        if (artworks.length > 0) {
            shuffleArtworks();
        }
    }, [artworks]);

    const col1 = randomArtworks.filter((_, idx) => idx % 3 === 0);
    const col2 = randomArtworks.filter((_, idx) => idx % 3 === 1);
    const col3 = randomArtworks.filter((_, idx) => idx % 3 === 2);

    // Sync URL path param to activeCity and query param to activeInstitution
    useEffect(() => {
        if (cityId) {
            const matchedCity = CITIES.find(c => c.key === cityId.replace(/-/g, ' '));
            if (matchedCity) {
                setActiveCity(matchedCity);
                
                // Read and set active institution if present in query param
                const museumQuery = searchParams.get('museum');
                if (museumQuery) {
                    const instArtworks = artworks.filter(art => {
                        const inst = getArtworkInstitution(art);
                        return inst && inst.name.toLowerCase() === museumQuery.toLowerCase();
                    });
                    const instInfo = museums.find(m => m.name.toLowerCase() === museumQuery.toLowerCase()) || {
                        name: museumQuery,
                        type: 'museum',
                        description: 'Digital museum collection.',
                        city: matchedCity.key,
                        isVerified: true
                    };
                    setActiveInstitution({
                        name: museumQuery,
                        info: instInfo,
                        list: instArtworks
                    });
                } else {
                    setActiveInstitution(null);
                }

                // Set default subdistrict for Bali and Yogyakarta
                if (matchedCity.key === 'bali') {
                    const baliRegions = CITY_REGIONS_MAP.bali || [];
                    const denpasarRegion = baliRegions.find((r: any) => r.id === 'denpasar');
                    if (denpasarRegion) setActiveSubDistrict(denpasarRegion);
                } else if (matchedCity.key === 'yogyakarta') {
                    const yogyaRegions = CITY_REGIONS_MAP.yogyakarta || [];
                    if (yogyaRegions[0]) setActiveSubDistrict(yogyaRegions[0]);
                }
            } else {
                setActiveCity(null);
                setActiveSubDistrict(null);
                setActiveInstitution(null);
            }
        } else {
            setActiveCity(null);
            setActiveSubDistrict(null);
            setActiveInstitution(null);
        }
    }, [cityId, searchParams, artworks, museums]);

    const [searchQuery, setSearchQuery] = useState<string>('');
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('collections_recent_searches');
            return saved ? JSON.parse(saved) : ['Museum Nasional', 'Ubud', 'Sonobudoyo'];
        } catch {
            return ['Museum Nasional', 'Ubud', 'Sonobudoyo'];
        }
    });

    const { ref, isVisible } = useScrollAnimation();

    const toggleFavorite = (id: string) => {
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const toggleFollow = (instName: string) => {
        setFollowedInstitutions(prev => ({
            ...prev,
            [instName]: !prev[instName]
        }));
    };

    // Helper to find/seed corresponding museum of an artwork
    const getArtworkInstitution = (artwork: Artwork) => {
        if (artwork.institutionId) {
            const found = museums.find(m => m.id === artwork.institutionId);
            if (found) return found;
        }
        if (artwork.museum) return artwork.museum;
        if (artwork.gallery) {
            return {
                id: artwork.gallery.id,
                name: artwork.gallery.name,
                type: 'gallery',
                isVerified: true
            } as any;
        }
        const parsed = parseArtworkCDNPath(artwork.primaryImageUrl);
        if (parsed) {
            return {
                id: parsed.instName.toLowerCase().replace(/\s+/g, '-'),
                name: parsed.instName,
                type: parsed.type,
                city: parsed.city.toLowerCase(),
                isVerified: true
            } as any;
        }
        return {
            id: 'heritage-archive',
            name: 'Heritage Archive',
            type: 'heritage',
            isVerified: true
        } as any;
    };

    const getCityCuratorsCount = (cityKey: string) => {
        const cityArtworks = artworks.filter(art => {
            const artRegion = (art.region || '').toLowerCase();
            return artRegion === cityKey ||
                (cityKey === 'dki jakarta' && artRegion.includes('jakarta')) ||
                (cityKey === 'jawa tengah' && artRegion.includes('tengah'));
        });

        const activeInstNames = new Set<string>();
        cityArtworks.forEach(art => {
            const parsed = parseArtworkCDNPath(art.primaryImageUrl);
            let name = '';
            if (parsed) {
                name = parsed.instName;
            } else {
                name = getArtworkInstitution(art).name;
            }
            if (name) activeInstNames.add(name.toLowerCase());
        });

        return VERIFIED_CDN_INSTITUTIONS.filter(
            inst => inst.city === cityKey && activeInstNames.has(inst.name.toLowerCase())
        ).length;
    };

    const getSubDistrictCuratorsCount = (cityKey: string, region: any) => {
        const cityArtworks = artworks.filter(art => {
            const artRegion = (art.region || '').toLowerCase();
            return artRegion === cityKey ||
                (cityKey === 'dki jakarta' && artRegion.includes('jakarta')) ||
                (cityKey === 'jawa tengah' && artRegion.includes('tengah'));
        });

        const activeInstNames = new Set<string>();
        cityArtworks.forEach(art => {
            const parsed = parseArtworkCDNPath(art.primaryImageUrl);
            let name = '';
            if (parsed) {
                name = parsed.instName;
            } else {
                name = getArtworkInstitution(art).name;
            }
            if (name) activeInstNames.add(name.toLowerCase());
        });

        return VERIFIED_CDN_INSTITUTIONS.filter(
            inst => inst.city === cityKey && inst.subDistrict === region.id && activeInstNames.has(inst.name.toLowerCase())
        ).length;
    };

    // Process and group artworks by institution
    const getCuratorsInSubDistrict = (cityKey: string, subDistrictId: string) => {
        const subDistInsts = VERIFIED_CDN_INSTITUTIONS.filter(
            inst => inst.city === cityKey && inst.subDistrict === subDistrictId
        );

        const instGroups: Record<string, { info: any; list: Artwork[] }> = {};

        subDistInsts.forEach(inst => {
            instGroups[inst.name] = {
                info: {
                    name: inst.name,
                    type: inst.type,
                    description: inst.description,
                    city: cityKey,
                    isVerified: true
                },
                list: []
            };
        });

        const cityArtworks = artworks.filter(art => {
            const artRegion = (art.region || '').toLowerCase();
            return artRegion === cityKey ||
                (cityKey === 'dki jakarta' && artRegion.includes('jakarta')) ||
                (cityKey === 'jawa tengah' && artRegion.includes('tengah'));
        });

        cityArtworks.forEach(art => {
            const parsed = parseArtworkCDNPath(art.primaryImageUrl);
            let targetInstName = '';

            if (parsed) {
                targetInstName = parsed.instName;
            } else {
                const instInfo = getArtworkInstitution(art);
                targetInstName = instInfo.name;
            }

            const matchedInst = VERIFIED_CDN_INSTITUTIONS.find(
                v => v.name.toLowerCase() === targetInstName.toLowerCase()
            );

            if (matchedInst && matchedInst.city === cityKey && matchedInst.subDistrict === subDistrictId) {
                if (!instGroups[matchedInst.name]) {
                    instGroups[matchedInst.name] = {
                        info: {
                            name: matchedInst.name,
                            type: matchedInst.type,
                            description: matchedInst.description,
                            city: cityKey,
                            isVerified: true
                        },
                        list: []
                    };
                }
                instGroups[matchedInst.name].list.push(art);
            }
        });

        // Filter out empty groups so we don't display institutions with 0 artworks
        const filteredGroups: Record<string, { info: any; list: Artwork[] }> = {};
        Object.entries(instGroups).forEach(([name, group]) => {
            if (group.list.length > 0) {
                filteredGroups[name] = group;
            }
        });

        return filteredGroups;
    };

    const addRecentSearch = (query: string) => {
        if (!query.trim()) return;
        setRecentSearches(prev => {
            const next = [query, ...prev.filter(q => q !== query)].slice(0, 5);
            try {
                localStorage.setItem('collections_recent_searches', JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    const removeRecentSearch = (query: string) => {
        setRecentSearches(prev => {
            const next = prev.filter(q => q !== query);
            try {
                localStorage.setItem('collections_recent_searches', JSON.stringify(next));
            } catch { }
            return next;
        });
    };

    return (
        <PageContainer className="max-w-7xl mx-auto pt-4 pb-20 px-4 bg-theme-bg min-h-screen text-theme-text transition-colors duration-300">
            <SEOHead
                title="Regional Museum & Heritage Collections"
                description="Preserved historical artifacts and digital art collections from Indonesian cities, powered securely by Cloudflare R2 CDN."
                canonical="/collections"
            />

            {/* Header (Minimal, matching modern mobile mockup) */}
            <div
                ref={ref}
                className={`mb-5 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
                <h1 className="text-2xl font-serif font-black tracking-tight text-theme-text">
                    Collections
                </h1>
                <div className="h-[1px] w-12 bg-gold mt-1.5" />
            </div>

            {/* Search Bar at the Top */}
            {!isLoading && artworks.length > 0 && (
                <div className="sticky top-[0px] md:top-[64px] z-30 -mx-4 px-4 py-3 bg-theme-bg/95 backdrop-blur-md border-b border-theme-border flex flex-col gap-2 mb-4 transition-colors duration-300">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4.5 h-4.5 text-theme-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari museum, cagar budaya, kota atau karya seni..."
                            className="w-full pl-11 pr-10 py-2.5 bg-theme-surface border border-theme-border/60 hover:border-gold/30 focus:border-gold/70 focus:ring-1 focus:ring-gold/70 rounded-full text-xs text-theme-text placeholder-theme-muted/70 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 text-theme-muted hover:text-theme-text transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Breadcrumb Path Navigation Bar */}
            {(activeCity || activeSubDistrict || activeInstitution) && !searchQuery.trim() && (
                <div className="flex items-center flex-wrap gap-1.5 text-[10px] sm:text-xs font-semibold text-theme-muted mb-4 bg-theme-surface/40 p-2 rounded-lg border border-theme-border/30">
                    <button
                        onClick={() => {
                            navigate('/collections');
                        }}
                        className="hover:text-gold transition-colors flex items-center gap-1"
                    >
                        Collections
                    </button>
                    {activeCity && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-theme-muted/50" />
                            <button
                                onClick={() => {
                                    navigate(`/collections/${activeCity.key.replace(/\s+/g, '-')}`);
                                }}
                                className={`hover:text-gold transition-colors ${(!activeSubDistrict || activeCity.key === 'bali' || activeCity.key === 'yogyakarta') && !activeInstitution ? 'text-gold' : ''}`}
                            >
                                {activeCity.name}
                            </button>
                        </>
                    )}
                    {activeSubDistrict && activeCity?.key !== 'bali' && activeCity?.key !== 'yogyakarta' && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-theme-muted/50" />
                            <button
                                onClick={() => {
                                    setActiveInstitution(null);
                                }}
                                className={`hover:text-gold transition-colors ${!activeInstitution ? 'text-gold' : ''}`}
                            >
                                {activeSubDistrict.name}
                            </button>
                        </>
                    )}
                    {activeInstitution && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-theme-muted/50" />
                            <span className="text-gold truncate max-w-[120px] sm:max-w-xs">
                                {activeInstitution.name}
                            </span>
                        </>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="h-[300px] flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    <span className="text-theme-muted text-xs">Loading collections database...</span>
                </div>
            ) : artworks.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-center px-4">
                    <Database className="w-12 h-12 text-theme-muted/50 mb-3" />
                    <h3 className="text-sm font-bold text-theme-text mb-1">Belum Ada Karya Preservasi</h3>
                    <p className="text-xs text-theme-muted max-w-xs">
                        Database belum memiliki data metadata cdn yang terindeks untuk ditampilkan.
                    </p>
                </div>
            ) : (() => {
                // SEARCH STATE: If search query has value, bypass hierarchy
                if (searchQuery.trim()) {
                    const searchLower = searchQuery.toLowerCase().trim();
                    const filteredArtworks = artworks.filter(art => {
                        const artRegion = (art.region || '').toLowerCase();
                        const artTitle = (art.title || '').toLowerCase();
                        const artistName = (art.artist?.displayName || '').toLowerCase();
                        const inst = getArtworkInstitution(art);
                        const instName = (inst.name || '').toLowerCase();
                        return (
                            artRegion.includes(searchLower) ||
                            artTitle.includes(searchLower) ||
                            artistName.includes(searchLower) ||
                            instName.includes(searchLower)
                        );
                    });

                    const instGroups: Record<string, { info: any; list: Artwork[] }> = {};
                    filteredArtworks.forEach(art => {
                        const inst = getArtworkInstitution(art);
                        const key = inst.name || 'Heritage Archive';
                        if (!instGroups[key]) {
                            instGroups[key] = { info: inst, list: [] };
                        }
                        instGroups[key].list.push(art);
                    });



                    return (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-theme-border pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted">
                                    Hasil Pencarian untuk "{searchQuery}"
                                </h3>
                                <span className="text-[10px] text-theme-muted">
                                    {filteredArtworks.length} Karya • {Object.keys(instGroups).length} Kolektor
                                </span>
                            </div>

                            {filteredArtworks.length === 0 ? (
                                <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
                                    <Database className="w-9 h-9 text-theme-muted/50 mb-2.5" />
                                    <h3 className="text-xs font-bold text-theme-text mb-1">Tidak ada hasil</h3>
                                    <p className="text-[11px] text-theme-muted max-w-xs">
                                        Coba kata kunci lain seperti "Nasional", "Ubud", atau "Yogyakarta".
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(instGroups).map(([instName, group]) => (
                                        <div
                                            key={instName}
                                            onClick={() => {
                                                addRecentSearch(searchQuery);
                                                setActiveInstitution({ name: instName, info: group.info, list: group.list });
                                                const primaryArt = group.list[0];
                                                if (primaryArt) {
                                                    const regKey = (primaryArt.region || '').toLowerCase();
                                                    const matchedCity = CITIES.find(c => c.key === regKey || (c.key === 'dki jakarta' && regKey.includes('jakarta')) || (c.key === 'jawa tengah' && regKey.includes('tengah')));
                                                    if (matchedCity) {
                                                        navigate(`/collections/${matchedCity.key.replace(/\s+/g, '-')}`);
                                                        const subD = getInstitutionSubDistrict(group.info, matchedCity.key);
                                                        if (subD) setActiveSubDistrict(subD);
                                                    }
                                                }
                                            }}
                                            className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-md relative overflow-hidden transition-all duration-300 hover:border-gold/30 hover:scale-[1.01] cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-center gap-4 mb-3 pb-3 border-b border-theme-border">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black ${group.info.type === 'museum' ? 'bg-[#7C6BD4]' : group.info.type === 'gallery' ? 'bg-gold' : 'bg-emerald-500'
                                                        }`}>
                                                        {instName.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-theme-text group-hover:text-gold transition-colors line-clamp-1">{instName}</h4>
                                                        <p className="text-[9px] text-theme-muted capitalize mt-0.5">
                                                            {group.info.type || 'Museum'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-theme-muted group-hover:text-gold transition-colors" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {group.list.slice(0, 3).map(art => (
                                                    <div key={art.id} className="h-16 rounded-lg overflow-hidden border border-theme-border/30 bg-theme-bg">
                                                        <HeicImage src={art.primaryImageUrl || art.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }

                // HIERARCHY LEVEL 4: 20 Artworks grid of the selected Institution
                if (activeInstitution) {
                    const instName = activeInstitution.name;
                    const group = activeInstitution;
                    const isFollowed = followedInstitutions[instName];
                    const instType = group.info.type || 'museum';
                    const primaryBanner = group.list[0]?.primaryImageUrl || group.list[0]?.images?.[0]?.url || '';

                    return (
                        <div className="space-y-6">
                            {/* Immersive Curator Banner */}
                            <div className="relative rounded-2xl overflow-hidden aspect-[2.3/1] sm:aspect-[3.5/1] bg-black border border-theme-border shadow-2xl">
                                {primaryBanner && (
                                    <HeicImage
                                        src={primaryBanner}
                                        alt={instName}
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent flex flex-col justify-end p-4 sm:p-6">
                                    <span className={`px-2 py-0.5 text-[8px] font-bold rounded w-max uppercase tracking-wider mb-2 text-black ${instType === 'museum' ? 'bg-[#7C6BD4]' : instType === 'gallery' ? 'bg-gold' : 'bg-emerald-500'
                                        }`}>
                                        {instType === 'museum' ? 'Museum' : instType === 'gallery' ? 'Galeri Seni' : 'Cagar Budaya'}
                                    </span>
                                    <h2 className="text-lg sm:text-2xl font-serif font-black text-white flex items-center gap-1.5 drop-shadow-md">
                                        {instName} Collections
                                        <CheckCircle2 className="w-4.5 h-4.5 text-green-400 fill-green-400/10" />
                                    </h2>
                                    <p className="text-[10px] sm:text-xs text-cream/70 max-w-xl mt-1 line-clamp-2 leading-relaxed">
                                        {group.info.description || `Preserved digital archives from ${instName} stored securely on R2 CDN.`}
                                    </p>
                                </div>
                            </div>

                            {/* Stats & Follow bar */}
                            <div className="flex items-center justify-between bg-theme-surface border border-theme-border rounded-xl p-3">
                                <div className="flex gap-4 text-center">
                                    <div>
                                        <span className="text-[8px] text-theme-muted uppercase tracking-wider block font-semibold">Total Karya</span>
                                        <span className="text-xs font-black text-theme-text">{group.list.length}</span>
                                    </div>
                                    <div className="border-l border-theme-border pl-4">
                                        <span className="text-[8px] text-theme-muted uppercase tracking-wider block font-semibold">R2 CDN Status</span>
                                        <span className="text-[8px] font-black text-green-500 uppercase tracking-widest mt-0.5 block">VERIFIED</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleFollow(instName)}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all active:scale-95 border ${isFollowed
                                        ? 'bg-transparent border-theme-border text-theme-muted hover:border-red-500/30 hover:text-red-500'
                                        : 'bg-gold text-black border-transparent shadow-sm'
                                        }`}
                                >
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>

                            {/* Grid of Artworks (High contrast, bright imagery, zero muddy filters!) */}
                            {group.list.length === 0 ? (
                                <div className="h-[200px] flex flex-col items-center justify-center text-center bg-theme-surface border border-theme-border rounded-2xl p-6">
                                    <Database className="w-10 h-10 text-theme-muted/30 mb-2" />
                                    <h4 className="text-xs font-bold text-theme-text">Belum ada karya seni terunggah</h4>
                                    <p className="text-[10px] text-theme-muted max-w-xs mt-0.5">
                                        Koleksi digital dari {instName} sedang dalam proses verifikasi CDN.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {group.list.slice(0, 20).map((artwork) => {
                                        const isFav = favorites.includes(artwork.id);
                                        const primaryUrl = artwork.primaryImageUrl || artwork.images?.[0]?.url;
                                        return (
                                            <div key={artwork.id} className="w-full">
                                                <GlowCard className="h-[200px] sm:h-[220px] rounded-xl overflow-hidden relative" hover={true}>
                                                    <div
                                                        className="relative h-full w-full group cursor-pointer bg-theme-surface"
                                                        onClick={() => setSelectedArtwork(artwork)}
                                                    >
                                                        {primaryUrl ? (
                                                            <HeicImage
                                                                src={primaryUrl}
                                                                alt={artwork.title}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                style={{ mixBlendMode: 'normal' }}
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 bg-theme-bg/80 flex items-center justify-center">
                                                                <Database className="w-8 h-8 text-theme-muted/30" />
                                                            </div>
                                                        )}
                                                        {/* Top Bar with Bookmarks */}
                                                        <div className="absolute top-2.5 right-2.5 z-20 flex gap-1.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleFavorite(artwork.id);
                                                                }}
                                                                className={`w-6 h-6 rounded-full backdrop-blur-md flex items-center justify-center border border-white/10 transition-colors ${isFav ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-black/35 text-cream hover:bg-black/60'
                                                                    }`}
                                                                aria-label="Bookmark"
                                                            >
                                                                <Heart className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                                                            </button>
                                                        </div>
                                                        {/* Text Info */}
                                                        <div className="absolute bottom-0 inset-x-0 p-2.5 z-20 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-6">
                                                            <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-gold transition-colors">
                                                                {artwork.title}
                                                            </h4>
                                                            <div className="flex items-center justify-between mt-0.5 text-[9px] text-white/70">
                                                                <span className="truncate max-w-[70%]">{artwork.artist?.displayName || 'Unknown Artist'}</span>
                                                                <span>{artwork.yearCreated || artwork.year || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </GlowCard>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                }

                // HIERARCHY LEVEL 3: Museum / Institution list in the selected Sub-District
                if (activeSubDistrict) {
                    const cityKey = activeCity!.key;
                    const instGroups = getCuratorsInSubDistrict(cityKey, activeSubDistrict.id);

                    return (
                        <div className="space-y-6">
                            {/* Sub-District Banner */}
                            <div className="relative rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-theme-surface to-theme-bg border border-theme-border shadow-xl">
                                <h3 className="text-base font-serif font-black text-theme-text">{activeSubDistrict.name} Collections</h3>
                                <p className="text-[11px] text-theme-muted mt-1 max-w-md leading-relaxed">
                                    {activeSubDistrict.description || 'Jelajahi cagar budaya dan galeri lokal terkemuka di wilayah ini.'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 border-b border-theme-border pb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                                    Daftar Museum & Cagar Budaya ({Object.keys(instGroups).length})
                                </h4>
                            </div>

                            {Object.keys(instGroups).length === 0 ? (
                                <div className="h-[180px] flex flex-col items-center justify-center text-center">
                                    <Database className="w-9 h-9 text-theme-muted/30 mb-2" />
                                    <h4 className="text-xs font-bold text-theme-text">Belum ada instansi terdata</h4>
                                    <p className="text-[10px] text-theme-muted max-w-xs mt-0.5">
                                        Data koleksi untuk wilayah {activeSubDistrict.name} belum diunggah ke CDN.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(instGroups).map(([instName, group]) => {
                                        const instType = group.info.type || 'museum';
                                        const firstArtworkUrl = group.list[0]?.primaryImageUrl;
                                        let cover = firstArtworkUrl || group.info.cover_image_url;
                                        if (cover && cover.toLowerCase().split('?')[0].endsWith('.heic')) {
                                            cover = `${API_BASE_URL}/proxy?url=${encodeURIComponent(cover)}`;
                                        } else {
                                            cover = getRealPlaceCoverImage(instName, instType, cover);
                                        }
                                        return (
                                            <div
                                                key={instName}
                                                onClick={() => setActiveInstitution({ name: instName, info: group.info, list: group.list })}
                                                className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-md cursor-pointer hover:border-gold/30 hover:scale-[1.01] transition-all duration-300 flex flex-col group h-[200px]"
                                            >
                                                <div className="relative h-[65%] w-full bg-black overflow-hidden">
                                                    <img src={cover} alt={instName} className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                                    <span className={`absolute top-2 left-2 px-2 py-0.5 text-[8px] font-bold rounded text-black ${instType === 'museum' ? 'bg-[#7C6BD4]' : instType === 'gallery' ? 'bg-gold' : 'bg-emerald-500'
                                                        }`}>
                                                        {instType === 'museum' ? 'Museum' : instType === 'gallery' ? 'Galeri' : 'Cagar Budaya'}
                                                    </span>
                                                </div>
                                                <div className="p-3 flex-1 flex flex-col justify-between">
                                                    <h4 className="text-xs font-bold text-theme-text group-hover:text-gold transition-colors line-clamp-1">
                                                        {instName}
                                                    </h4>
                                                    <div className="flex items-center justify-between text-[9px] text-theme-muted font-semibold mt-1">
                                                        <span>{group.list.length} Digital Aset</span>
                                                        <span className="text-gold flex items-center gap-0.5">Jelajahi <ChevronRight className="w-3 h-3" /></span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                }

                // HIERARCHY LEVEL 2: Sub-districts list in the selected City
                if (activeCity) {
                    const cityKey = activeCity.key;
                    let regionsList: any[] = [];
                    if (cityKey === 'dki jakarta') {
                        regionsList = CITY_REGIONS_MAP.jakarta || [];
                    } else if (cityKey === 'yogyakarta') {
                        regionsList = CITY_REGIONS_MAP.yogyakarta || [];
                    } else if (cityKey === 'bali') {
                        regionsList = CITY_REGIONS_MAP.bali || [];
                    } else if (cityKey === 'jawa tengah') {
                        regionsList = JAWA_TENGAH_REGIONS;
                    }

                    return (
                        <div className="space-y-6">
                            <div className="border-b border-theme-border pb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                                        Pilih Wilayah di {activeCity.name}
                                    </h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {regionsList.map(region => {
                                    const curatorsCount = getSubDistrictCuratorsCount(cityKey, region);
                                    return (
                                        <div
                                            key={region.id}
                                            onClick={() => setActiveSubDistrict(region)}
                                            className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-md cursor-pointer hover:border-gold/30 hover:scale-[1.01] transition-all duration-300 flex items-center justify-between group"
                                        >
                                            <div className="space-y-1 pr-4 max-w-[80%]">
                                                <h4 className="text-xs font-bold text-theme-text group-hover:text-gold transition-colors">{region.name}</h4>
                                                <p className="text-[10px] text-theme-muted line-clamp-1 leading-relaxed">{region.description || 'Preservasi aset daerah.'}</p>
                                                <span className="text-[9px] font-semibold text-theme-muted/80 block mt-1">
                                                    {curatorsCount} Kolektor Digital
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-theme-muted group-hover:text-gold transition-colors flex-shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // HIERARCHY LEVEL 1: City Selection Page (Top-Level)
                return (
                    <div className="space-y-6">
                        {/* Mockup-style Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">Recent Search</span>
                                <div className="flex flex-col gap-2">
                                    {recentSearches.map(q => (
                                        <div key={q} className="flex items-center justify-between border-b border-theme-border/20 pb-2 text-xs text-theme-muted hover:text-theme-text transition-colors">
                                            <button onClick={() => setSearchQuery(q)} className="text-left flex-1 font-medium">
                                                {q}
                                            </button>
                                            <button onClick={() => removeRecentSearch(q)} className="hover:text-red-500 transition-colors p-1">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-b border-theme-border pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                                Discover Indonesian Collections
                            </h3>
                        </div>

                        {/* Cities list grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {CITIES.map(city => {
                                const curatorsCount = getCityCuratorsCount(city.key);
                                let bgImage = 'https://cdn.seniqu.art/assets/static/cities/jakarta.webp';
                                if (city.key === 'bali') bgImage = 'https://cdn.seniqu.art/assets/static/cities/bali.webp';
                                else if (city.key === 'yogyakarta') bgImage = 'https://cdn.seniqu.art/assets/static/cities/yogyakarta.webp';
                                else if (city.key === 'jawa tengah') bgImage = 'https://cdn.seniqu.art/assets/static/cities/semarang.webp';

                                return (
                                    <div
                                        key={city.key}
                                        onClick={() => {
                                            navigate(`/collections/${city.key.replace(/\s+/g, '-')}`);
                                        }}
                                        className="relative rounded-2xl overflow-hidden h-[160px] sm:h-[180px] shadow-lg cursor-pointer group border border-theme-border/60 hover:border-gold/30 transition-all duration-300"
                                    >
                                        <img
                                            src={bgImage}
                                            alt={city.name}
                                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 flex flex-col justify-end" />
                                        <div className="absolute bottom-3 left-3 right-3 z-20">
                                            <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-gold transition-colors">{city.name}</h4>
                                            <p className="text-[9px] text-white/70 mt-0.5">{curatorsCount} Kolektor Terdaftar</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Curated Collections Carousel */}
                        <div className="space-y-4 pt-4">
                            <div className="border-b border-theme-border pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                                    Curated Collections
                                </h3>
                            </div>
                            <CurationCarousel 
                                onSelectCuration={(curation) => {
                                    navigate(`/collections/${curation.cityKey.replace(/\s+/g, '-')}?museum=${encodeURIComponent(curation.institutionName)}`);
                                }} 
                            />
                        </div>

                        {/* Discover New Art section with see all link on right */}
                        <div className="space-y-4 pt-4">
                            <div className="border-b border-theme-border pb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                                        Discover New Art
                                    </h3>
                                    <button
                                        onClick={shuffleArtworks}
                                        className="p-1 rounded-full text-theme-muted hover:text-gold hover:bg-gold/10 transition-all duration-300 active:scale-95 group"
                                        title="Variasikan Seni"
                                    >
                                        <RotateCw className="w-3 h-3 group-active:rotate-180 transition-transform duration-500 ease-out" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setSearchQuery(' '); // space triggers showing all arts in search list
                                    }}
                                    className="text-[10px] font-bold text-gold hover:text-gold/80 transition-colors uppercase tracking-wider"
                                >
                                    See All
                                </button>
                            </div>

                            {/* Masonry / Mosaic Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {/* Column 1 */}
                                <div className="flex flex-col gap-3">
                                    {col1.map((art, idx) => (
                                        <FeaturedArtCard key={art.id} artwork={art} delay={idx * 0.15} onClick={() => setSelectedArtwork(art)} />
                                    ))}
                                </div>
                                {/* Column 2 */}
                                <div className="flex flex-col gap-3">
                                    {col2.map((art, idx) => (
                                        <FeaturedArtCard key={art.id} artwork={art} delay={idx * 0.15 + 0.05} onClick={() => setSelectedArtwork(art)} />
                                    ))}
                                </div>
                                {/* Column 3 */}
                                <div className="hidden md:flex flex-col gap-3">
                                    {col3.map((art, idx) => (
                                        <FeaturedArtCard key={art.id} artwork={art} delay={idx * 0.15 + 0.1} onClick={() => setSelectedArtwork(art)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Interactive Detail Modal */}
            <AnimatePresence>
                {selectedArtwork && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 15 }}
                            className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[85vh] md:max-h-[80vh]"
                        >
                            {/* Close button */}
                            <button
                                onClick={() => {
                                    setSelectedArtwork(null);
                                    setActiveModalTab('info');
                                }}
                                className="absolute top-3 right-3 z-40 w-8 h-8 rounded-full bg-black/60 text-white hover:text-gold flex items-center justify-center border border-white/10 hover:border-gold/30 transition-all active:scale-90"
                                aria-label="Close details"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Image banner */}
                            <div className="w-full h-[180px] sm:h-[220px] relative bg-black flex-shrink-0">
                                <HeicImage
                                    src={selectedArtwork.primaryImageUrl || selectedArtwork.images?.[0]?.url}
                                    alt={selectedArtwork.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 flex flex-col justify-end h-24">
                                    <span className="px-2 py-0.5 bg-gold text-black text-[9px] font-bold rounded w-max uppercase tracking-wider mb-1">
                                        {selectedArtwork.category || 'Heritage'}
                                    </span>
                                    <h4 className="text-base sm:text-lg font-serif font-bold text-white drop-shadow-md line-clamp-1">
                                        {selectedArtwork.title}
                                    </h4>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-theme-border bg-theme-surface">
                                <button
                                    onClick={() => setActiveModalTab('info')}
                                    className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${activeModalTab === 'info' ? 'border-gold text-gold bg-gold/[0.02]' : 'border-transparent text-theme-muted hover:text-theme-text'}`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Detail Karya
                                </button>
                                <button
                                    onClick={() => setActiveModalTab('security')}
                                    className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${activeModalTab === 'security' ? 'border-gold text-gold bg-gold/[0.02]' : 'border-transparent text-theme-muted hover:text-theme-text'}`}
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Integritas CDN R2
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-5 overflow-y-auto flex-1 bg-theme-bg/50">
                                {activeModalTab === 'info' ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <span className="text-[9px] text-theme-muted uppercase tracking-wider block font-semibold font-mono">Seniman</span>
                                                <span className="text-xs font-bold text-theme-text">{selectedArtwork.artist?.displayName || 'Unknown'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-theme-muted uppercase tracking-wider block font-semibold font-mono">Tahun Preservasi</span>
                                                <span className="text-xs font-bold text-theme-text">{selectedArtwork.yearCreated || selectedArtwork.year || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-theme-muted uppercase tracking-wider block font-semibold font-mono">Medium Fisik</span>
                                                <span className="text-xs font-bold text-theme-text">{selectedArtwork.medium || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-theme-muted uppercase tracking-wider block font-semibold font-mono">Institusi Pengelola</span>
                                                <span className="text-xs font-bold text-theme-text">
                                                    {getArtworkInstitution(selectedArtwork).name}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t border-theme-border pt-3">
                                            <span className="text-[9px] text-theme-muted uppercase tracking-wider block font-semibold mb-1 font-mono">Deskripsi</span>
                                            <p className="text-[11px] text-theme-text leading-relaxed">
                                                {selectedArtwork.description}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-green-500/5 text-green-400 border border-green-500/10 rounded-lg text-[10px]">
                                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                            <span>Objek terdata dan disinkronisasi ke server CDN utama secara real-time.</span>
                                        </div>

                                        <div className="space-y-2 bg-theme-elevated border border-theme-border rounded-xl p-3 font-mono">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-theme-muted uppercase tracking-wider font-semibold">Folder Target R2 CDN</span>
                                                <code className="text-gold text-[10px] bg-theme-bg px-2 py-1 rounded border border-theme-border break-all">
                                                    artworks/images/{selectedArtwork.poaCertificate?.r2Path || `${selectedArtwork.region}/${getArtworkInstitution(selectedArtwork).name}/${selectedArtwork.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.webp`}
                                                </code>
                                            </div>

                                            {selectedArtwork.poaCertificate?.hash && (
                                                <div className="flex flex-col gap-1 mt-2">
                                                    <span className="text-[9px] text-theme-muted uppercase tracking-wider font-semibold">Digital Signature Hash</span>
                                                    <code className="text-theme-muted text-[9px] bg-theme-bg px-2 py-1 rounded border border-theme-border break-all select-all">
                                                        {selectedArtwork.poaCertificate.hash}
                                                    </code>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-2 bg-theme-surface p-2.5 rounded-lg border border-theme-border text-[9px] text-theme-muted leading-relaxed">
                                            <Lock className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
                                            <span>Hanya admin dengan otentikasi kunci R2 regional yang dapat mengubah data gambar atau metadata aset ini.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </PageContainer>
    );
}
