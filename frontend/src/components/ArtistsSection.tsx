import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
import { ArrowRight, Trophy, Star, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';

interface Artist {
    id: string;
    name: string;
    title: string;
    avatar: string;
    cover: string;
    followers: string;
    totalSales: string;
    verified: boolean;
    rank: number;
}

const FEATURED_ARTISTS: Artist[] = [
    {
        id: '1',
        name: 'Raden Saleh Digital',
        title: 'Master of Romanticism',
        avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Raden_Saleh.jpg/220px-Raden_Saleh.jpg',
        cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Raden_Saleh_-_Deer_Hunt_-_Google_Art_Project.jpg/1200px-Raden_Saleh_-_Deer_Hunt_-_Google_Art_Project.jpg',
        followers: '12.5k',
        totalSales: '845 SOL',
        verified: true,
        rank: 1
    },
    {
        id: '2',
        name: 'Affandi Legacy',
        title: 'Expressionist Pioneer',
        avatar: 'https://upload.wikimedia.org/wikipedia/id/3/30/Affandi.jpg',
        cover: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Self_Portrait_by_Affandi.jpg',
        followers: '8.2k',
        totalSales: '620 SOL',
        verified: true,
        rank: 2
    },
    {
        id: '3',
        name: 'Basuki Abdullah',
        title: 'Realist Painter',
        avatar: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Basuki_Abdullah.jpg',
        cover: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Basuki_Abdullah_-_Lady_with_Kebaya.jpg',
        followers: '5.9k',
        totalSales: '415 SOL',
        verified: true,
        rank: 3
    }
];

function ArtistCard({ artist, index }: { artist: Artist; index: number }) {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group relative h-[320px] md:h-[380px] w-full cursor-pointer"
            onClick={() => navigate(`/artist/${artist.id}`)}
        >
            <GlowCard className="h-full overflow-hidden rounded-2xl border-theme-border/50 transition-all duration-300 group-hover:border-gold/30" hover={true}>
                {/* Cover Image */}
                <div className="absolute inset-0 h-1/2 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-theme-surface z-10" />
                    <img
                        src={artist.cover}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                </div>

                {/* Content */}
                <div className="relative z-20 h-full flex flex-col items-center justify-end p-6 text-center">
                    {/* Rank Badge */}
                    <div className="absolute top-4 right-4 bg-theme-surface/80 backdrop-blur-md px-3 py-1 rounded-full border border-gold/20 flex items-center gap-1.5 shadow-lg">
                        <Trophy className="w-3 h-3 text-gold" />
                        <span className="text-xs font-bold text-theme-text">#{artist.rank}</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative mb-4">
                        <div className="w-20 h-20 rounded-full border-4 border-theme-surface overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-300">
                            <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                        </div>
                        {artist.verified && (
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-theme-surface" title="Verified Artist">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-serif font-bold text-theme-text group-hover:text-gold transition-colors mb-1">
                        {artist.name}
                    </h3>
                    <p className="text-sm text-theme-muted mb-4">{artist.title}</p>

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-6 w-full pt-4 border-t border-theme-border/50">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-theme-muted mb-0.5 flex items-center gap-1">
                                <Users className="w-3 h-3" /> Followers
                            </span>
                            <span className="font-bold text-theme-text">{artist.followers}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-theme-muted mb-0.5 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Sales
                            </span>
                            <span className="font-bold text-gold">{artist.totalSales}</span>
                        </div>
                    </div>
                </div>
            </GlowCard>
        </motion.div>
    );
}

export function ArtistsSection() {
    const { ref, isVisible } = useScrollAnimation();
    const navigate = useNavigate();

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
                            <span className="text-gold text-xs uppercase tracking-widest font-bold">Top Creators</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-serif text-theme-text">
                            Featured <span className="text-gold italic">Artists</span>
                        </h2>
                    </div>

                    <button
                        onClick={() => navigate(ROUTES.GALLERY)}
                        className="group flex items-center gap-2 px-6 py-3 rounded-full border border-theme-border hover:border-gold/50 hover:bg-gold/5 transition-all"
                    >
                        <span className="text-sm font-medium text-theme-text group-hover:text-gold">View All Artists</span>
                        <ArrowRight className="w-4 h-4 text-theme-muted group-hover:text-gold group-hover:translate-x-1 transition-all" />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {FEATURED_ARTISTS.map((artist, index) => (
                        <ArtistCard key={artist.id} artist={artist} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default ArtistsSection;
