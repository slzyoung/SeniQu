import { motion, AnimatePresence } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
import { ArrowRight, Trophy, Star, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';
import { useState, useEffect } from 'react';
import { museumService } from '../services/museumService';
import { useLanguage } from '../hooks/useLanguage';

interface Artist {
    id: string;
    name: string;
    title: string;
    avatar: string;
    verified: boolean;
    rank: number;
    wikipediaTitle: string;
}

const FEATURED_ARTISTS: Artist[] = [
    {
        id: '1',
        name: 'Raden Saleh',
        title: 'Master of Romanticism',
        avatar: '/images/tokoh/radensaleh.jpeg',
        verified: true,
        rank: 1,
        wikipediaTitle: 'Raden_Saleh'
    },
    {
        id: '2',
        name: 'Affandi',
        title: 'Expressionist Pioneer',
        avatar: '/images/tokoh/affandi.jpg',
        verified: true,
        rank: 2,
        wikipediaTitle: 'Affandi'
    },
    {
        id: '3',
        name: 'Basuki Abdullah',
        title: 'Realist Painter',
        avatar: '/images/tokoh/basoekiabdullah.png',
        verified: true,
        rank: 3,
        wikipediaTitle: 'Basuki_Abdullah'
    }
];

function BioModal({ artist, onClose }: { artist: Artist; onClose: () => void }) {
    const [bio, setBio] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchBio = async () => {
            try {
                setLoading(true);
                // Try backend proxy first to avoid client CORS/IP blocks
                const res = await museumService.getWikipediaSummary(artist.name);
                if (res && res.extract) {
                    setBio(res.extract);
                    setError(false);
                    return;
                }

                // Fallback to direct fetch
                const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${artist.wikipediaTitle}`);
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setBio(data.extract);
                setError(false);
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (artist.wikipediaTitle) {
            fetchBio();
        }
    }, [artist.wikipediaTitle, artist.name]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-theme-bg/50 transition-colors z-10 cursor-pointer"
                    >
                        <X className="w-6 h-6 text-theme-muted hover:text-theme-text" />
                    </button>

                    <div className="flex flex-col md:flex-row h-full">
                        {/* Left Side: Image & Info */}
                        <div className="w-full md:w-1/3 bg-theme-bg/50 p-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-theme-border">
                            <div className="relative mb-4">
                                <div className="w-32 h-32 rounded-full border-4 border-gold/20 overflow-hidden shadow-xl">
                                    <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                                </div>
                                {artist.verified && (
                                    <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1.5 rounded-full border-4 border-theme-surface" title="Verified Artist">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-theme-text mb-1">{artist.name}</h3>
                            <p className="text-sm text-theme-muted mb-4">{artist.title}</p>

                            <a
                                href={`https://en.wikipedia.org/wiki/${artist.wikipediaTitle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-gold hover:text-gold-light text-sm font-medium transition-colors cursor-pointer"
                            >
                                {t('artists.readWiki')} <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        {/* Right Side: Bio */}
                        <div className="w-full md:w-2/3 p-6 md:p-8 max-h-[60vh] overflow-y-auto">
                            <h4 className="text-lg font-bold text-theme-text mb-4 border-b border-theme-border pb-2">{t('artists.bio')}</h4>
                            {loading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 bg-theme-border/30 rounded w-full"></div>
                                    <div className="h-4 bg-theme-border/30 rounded w-5/6"></div>
                                    <div className="h-4 bg-theme-border/30 rounded w-4/6"></div>
                                </div>
                            ) : error ? (
                                <p className="text-red-400">{t('artists.failedBio')}</p>
                            ) : (
                                <p className="text-theme-text/80 leading-relaxed text-sm md:text-base">
                                    {bio}
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function ArtistCard({ artist, index, onSelect }: { artist: Artist; index: number; onSelect: (artist: Artist) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group relative h-[280px] w-full cursor-pointer"
            onClick={() => onSelect(artist)}
        >
            <GlowCard className="h-full overflow-hidden rounded-2xl border-theme-border/50 transition-all duration-300 group-hover:border-gold/30 bg-theme-surface" hover={true}>
                {/* Decorative Background Pattern or Gradient */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-theme-bg/80 to-transparent opacity-50" />

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-center p-6 text-center">
                    {/* Rank Badge */}
                    <div className="absolute top-4 right-4 bg-theme-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-gold/20 flex items-center gap-1.5 shadow-sm">
                        <Trophy className="w-3 h-3 text-gold" />
                        <span className="text-xs font-bold text-theme-text">#{artist.rank}</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative mb-6 section-avatar">
                        <div className="w-24 h-24 rounded-full border-4 border-theme-surface overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-300 ring-2 ring-gold/10 group-hover:ring-gold/30">
                            <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                        </div>
                        {artist.verified && (
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-4 border-theme-surface shadow-sm" title="Verified Artist">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-serif font-bold text-theme-text group-hover:text-gold transition-colors mb-2">
                        {artist.name}
                    </h3>
                    <p className="text-sm text-theme-muted font-medium px-4 py-1 rounded-full bg-theme-bg/50 border border-theme-border/50 inline-block">
                        {artist.title}
                    </p>
                </div>
            </GlowCard>
        </motion.div>
    );
}

export function ArtistsSection() {
    const { ref, isVisible } = useScrollAnimation();
    const navigate = useNavigate();
    const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
    const { t } = useLanguage();

    const localizedArtists = FEATURED_ARTISTS.map((artist) => ({
        ...artist,
        title: artist.id === '1' ? t('artists.radenSalehTitle') :
               artist.id === '2' ? t('artists.affandiTitle') :
               artist.id === '3' ? t('artists.basukiAbdullahTitle') : artist.title
    }));

    return (
        <section id="artists" className="py-16 md:py-24 bg-theme-surface relative">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                {/* Header */}
                <div
                    ref={ref}
                    className={`flex flex-col md:flex-row items-center justify-between mb-12 gap-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                >
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <Star className="w-4 h-4 text-gold fill-gold" />
                            <span className="text-gold text-xs uppercase tracking-widest font-bold">{t('artists.label')}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-serif text-theme-text">
                            {t('artists.title').split(' ').map((word, i, arr) => {
                                if (i === arr.length - 1) {
                                    return <span key={i} className="text-gold italic">{word}</span>;
                                }
                                return word + ' ';
                            })}
                        </h2>
                    </div>

                    <button
                        onClick={() => navigate(ROUTES.GALLERY)}
                        className="group flex items-center gap-2 px-6 py-3 rounded-full border border-theme-border hover:border-gold/50 hover:bg-gold/5 transition-all cursor-pointer"
                    >
                        <span className="text-sm font-medium text-theme-text group-hover:text-gold">{t('artists.viewAll')}</span>
                        <ArrowRight className="w-4 h-4 text-theme-muted group-hover:text-gold group-hover:translate-x-1 transition-all" />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {localizedArtists.map((artist, index) => (
                        <ArtistCard
                            key={artist.id}
                            artist={artist}
                            index={index}
                            onSelect={setSelectedArtist}
                        />
                    ))}
                </div>
            </div>

            {/* Modal */}
            {selectedArtist && (
                <BioModal
                    artist={localizedArtists.find(a => a.id === selectedArtist.id) || selectedArtist}
                    onClose={() => setSelectedArtist(null)}
                />
            )}
        </section>
    );
}

export default ArtistsSection;
