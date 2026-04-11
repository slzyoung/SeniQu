/**
 * Gallery Feature - Layout and Pages
 * Uses real API data with useArtwork hook
 */

import { Outlet, useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, CardContent, Button, Badge } from '../../components/ui';
import {
    Image as ImageIcon,
    Building2,
    Heart,
    Eye,
    Share2,
    Bookmark,
    ChevronLeft,
    Loader2
} from 'lucide-react';
import { useArtwork } from '../../hooks/useArtworks';
import { useAddBookmark } from '../../hooks/useUser';
import { formatDate } from '../../lib/utils';

import { MobileBottomNav } from '../../components/common/MobileBottomNav';

// Gallery Layout
export function GalleryLayout() {
    return (
        <div className="min-h-screen bg-theme-bg">
            <Navbar />
            <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8 pb-24 md:pb-8">
                <Outlet />
            </main>
            <Footer />
            <MobileBottomNav />
        </div>
    );
}

// Artwork Detail Page with real API data
export function ArtworkView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: artwork, isLoading, isError } = useArtwork(id || '');
    const addBookmark = useAddBookmark();

    const handleBookmark = () => {
        if (id) {
            addBookmark.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <PageContainer title="Loading..." subtitle="">
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            </PageContainer>
        );
    }

    if (isError || !artwork) {
        return (
            <PageContainer title="Artwork Not Found" subtitle="">
                <Card variant="elevated" className="text-center py-16">
                    <ImageIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-theme-text mb-2">Artwork Not Found</h3>
                    <p className="text-theme-muted">The artwork you're looking for doesn't exist.</p>
                    <Link to="/gallery">
                        <Button variant="gold" className="mt-4">
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Gallery
                        </Button>
                    </Link>
                </Card>
            </PageContainer>
        );
    }

    const imageUrl = artwork.images?.[0]?.url;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 lg:min-h-screen">
            <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-theme-muted hover:text-gold transition-colors mb-6 md:mb-8 bg-theme-surface/50 px-4 py-2 rounded-full border border-theme-border/50 backdrop-blur-sm self-start">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative">
                {/* Artwork Image */}
                <div className="lg:sticky lg:top-24 z-10 w-full mb-8 lg:mb-0">
                    <Card variant="elevated" className="overflow-hidden bg-theme-surface/30 border-theme-border/40 Aspect-square lg:aspect-auto flex items-center justify-center p-4 lg:p-8">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={artwork.title}
                                className="w-full object-contain rounded-xl max-h-[70vh] lg:max-h-[85vh] h-auto"
                            />
                        ) : (
                            <div className="w-full aspect-square flex flex-col items-center justify-center bg-theme-elevated/50 text-theme-muted/50 rounded-xl">
                                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                <span>Image not available</span>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Artwork Details */}
                <div className="flex flex-col space-y-8 relative z-20 w-full pb-8">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {artwork.isArt && <Badge variant="gold" className="px-3 py-1 text-xs tracking-wider">PREMIUM ART</Badge>}
                            {(artwork.genre && artwork.genre.length > 0) ? (
                                artwork.genre.map((g, i) => <Badge key={i} variant="default" className="bg-theme-surface">{g}</Badge>)
                            ) : (
                                <Badge variant="default" className="bg-theme-surface">Artwork</Badge>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-theme-text leading-tight">{artwork.title}</h1>
                        <div className="flex items-center gap-3 mt-4 text-lg">
                            <span className="text-theme-muted">by</span>
                            <span className="text-gold font-medium">
                                {artwork.artist?.displayName || 'Unknown Artist'}
                            </span>
                        </div>
                    </div>

                    <Card variant="default" className="bg-theme-surface/50 border-theme-border/40">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-6 text-sm text-theme-muted/80">
                                    <span className="flex items-center gap-2 bg-theme-bg/50 px-3 py-1.5 rounded-lg">
                                        <Eye className="w-4 h-4 text-theme-muted" />
                                        <span className="font-medium text-theme-text">{artwork.views || 0}</span> views
                                    </span>
                                    <span className="flex items-center gap-2 bg-theme-bg/50 px-3 py-1.5 rounded-lg">
                                        <Heart className="w-4 h-4 text-theme-muted" />
                                        <span className="font-medium text-theme-text">{artwork.likes || 0}</span> likes
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        className="h-10 w-10 p-0 rounded-full flex items-center justify-center border-theme-border/50 hover:border-gold hover:text-gold hover:bg-gold/5"
                                        onClick={handleBookmark}
                                        disabled={addBookmark.isPending}
                                        title="Bookmark Artwork"
                                    >
                                        <Bookmark className="w-5 h-5 mx-auto" />
                                    </Button>
                                    <Button variant="outline" className="h-10 w-10 p-0 rounded-full flex items-center justify-center border-theme-border/50 hover:border-gold hover:text-gold hover:bg-gold/5" title="Share Artwork">
                                        <Share2 className="w-5 h-5 mx-auto" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {artwork.description && (
                        <div className="prose prose-invert max-w-none">
                            <h3 className="font-serif font-semibold text-xl text-theme-text mb-3 flex items-center gap-2">
                                <div className="w-1 h-5 bg-gold rounded-full"></div>
                                Description
                            </h3>
                            <p className="text-theme-muted leading-relaxed whitespace-pre-wrap">{artwork.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {artwork.medium && (
                            <div className="bg-theme-surface/40 hover:bg-theme-surface/60 transition-colors border border-theme-border/40 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 font-semibold">Medium</p>
                                <p className="font-medium text-sm text-theme-text line-clamp-2">{artwork.medium}</p>
                            </div>
                        )}
                        {artwork.dimensions && (
                            <div className="bg-theme-surface/40 hover:bg-theme-surface/60 transition-colors border border-theme-border/40 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 font-semibold">Dimensions</p>
                                <p className="font-medium text-sm text-theme-text">
                                    {artwork.dimensions.width}×{artwork.dimensions.height}
                                    {artwork.dimensions.depth ? `×${artwork.dimensions.depth}` : ''} {artwork.dimensions.unit}
                                </p>
                            </div>
                        )}
                        {artwork.year && (
                            <div className="bg-theme-surface/40 hover:bg-theme-surface/60 transition-colors border border-theme-border/40 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 font-semibold">Year</p>
                                <p className="font-medium text-sm text-theme-text">{artwork.year}</p>
                            </div>
                        )}
                        {artwork.createdAt && (
                            <div className="bg-theme-surface/40 hover:bg-theme-surface/60 transition-colors border border-theme-border/40 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                                <p className="text-[10px] uppercase tracking-wider text-theme-muted mb-1 font-semibold">Added</p>
                                <p className="font-medium text-sm text-theme-text">{formatDate(artwork.createdAt)}</p>
                            </div>
                        )}
                    </div>

                    {artwork.isArt && artwork.price && (
                        <Card variant="elevated" className="bg-gradient-to-r from-gold/10 to-gold/5 border-gold/30 mt-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <CardContent className="p-6 md:p-8 relative z-10">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="text-center sm:text-left">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gold/80 mb-1">Current Price</p>
                                        <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                                            <p className="text-4xl font-bold text-gold">{artwork.price}</p>
                                            <p className="text-xl font-medium text-gold/60">{((artwork as any).currency) || 'ETH'}</p>
                                        </div>
                                    </div>
                                    <Button variant="gold" className="w-full sm:w-auto px-8 py-6 text-lg font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-1 transition-all">
                                        Purchase Masterpiece
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

// Museum Detail Page
export function MuseumDetail() {
    const { id } = useParams<{ id: string }>();

    return (
        <PageContainer title="Museum Detail" subtitle="View museum information and collections">
            <Card variant="elevated" className="text-center py-16">
                <Building2 className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-text mb-2">Museum Information</h3>
                <p className="text-theme-muted max-w-sm mx-auto">
                    Loading museum information for ID: {id}
                </p>
            </Card>
        </PageContainer>
    );
}

// NearbyMuseums uses existing component
import { NearbyMuseumsMap } from './components/NearbyMuseumsMap';

export function NearbyMuseums() {
    return (
        <PageContainer className="max-w-7xl mx-auto pt-20 px-4 sm:px-6">
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 py-1 px-3 border border-gold/30 rounded-full bg-gold/5 backdrop-blur-sm mb-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-gold text-xs tracking-wider uppercase font-medium">
                        Discover
                    </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-theme-text mb-4">
                    Nearby <span className="text-gold italic">Museums</span>
                </h1>
                <p className="text-theme-muted text-lg max-w-2xl">
                    Find and explore cultural heritage sites, museums, and galleries in your vicinity.
                </p>
            </div>
            <NearbyMuseumsMap />
        </PageContainer>
    );
}

export default GalleryLayout;
