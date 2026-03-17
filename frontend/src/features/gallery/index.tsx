/**
 * Gallery Feature - Layout and Pages
 * Uses real API data with useArtwork hook
 */

import { Outlet, useParams, Link } from 'react-router-dom';
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
        <PageContainer title={artwork.title} subtitle="">
            <Link to="/gallery" className="inline-flex items-center text-theme-muted hover:text-gold mb-6">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Gallery
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Artwork Image */}
                <Card variant="elevated" className="overflow-hidden aspect-square">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={artwork.title}
                            className="w-full h-full object-contain bg-theme-elevated"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-theme-elevated">
                            <ImageIcon className="w-16 h-16 text-theme-muted/40" />
                        </div>
                    )}
                </Card>

                {/* Artwork Details */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {artwork.isArt && <Badge variant="gold">Art</Badge>}
                            <Badge variant="default">{artwork.genre?.[0] || 'Art'}</Badge>
                        </div>
                        <h1 className="text-3xl font-bold text-theme-text">{artwork.title}</h1>
                        <p className="text-lg text-gold mt-2">
                            by {artwork.artist?.displayName || 'Unknown Artist'}
                        </p>
                    </div>

                    <Card variant="default">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-theme-muted">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {artwork.views || 0} views
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-4 h-4" />
                                        {artwork.likes || 0} likes
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        onClick={handleBookmark}
                                        disabled={addBookmark.isPending}
                                    >
                                        <Bookmark className="w-4 h-4" />
                                    </Button>
                                    <Button variant="secondary" size="icon">
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {artwork.description && (
                        <div>
                            <h3 className="font-semibold text-theme-text mb-2">Description</h3>
                            <p className="text-theme-muted">{artwork.description}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {artwork.medium && (
                            <div className="bg-theme-surface rounded-xl p-4">
                                <p className="text-xs text-theme-muted mb-1">Medium</p>
                                <p className="font-medium text-theme-text">{artwork.medium}</p>
                            </div>
                        )}
                        {artwork.dimensions && (
                            <div className="bg-theme-surface rounded-xl p-4">
                                <p className="text-xs text-theme-muted mb-1">Dimensions</p>
                                <p className="font-medium text-theme-text">
                                    {artwork.dimensions.width} × {artwork.dimensions.height}
                                    {artwork.dimensions.depth ? ` × ${artwork.dimensions.depth}` : ''} {artwork.dimensions.unit}
                                </p>
                            </div>
                        )}
                        {artwork.year && (
                            <div className="bg-theme-surface rounded-xl p-4">
                                <p className="text-xs text-theme-muted mb-1">Year</p>
                                <p className="font-medium text-theme-text">{artwork.year}</p>
                            </div>
                        )}
                        {artwork.createdAt && (
                            <div className="bg-theme-surface rounded-xl p-4">
                                <p className="text-xs text-theme-muted mb-1">Added</p>
                                <p className="font-medium text-theme-text">{formatDate(artwork.createdAt)}</p>
                            </div>
                        )}
                    </div>

                    {artwork.isArt && artwork.price && (
                        <Card variant="elevated" className="bg-gold/5 border-gold/20">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-theme-muted">Price</p>
                                        <p className="text-2xl font-bold text-gold">{artwork.price} ETH</p>
                                    </div>
                                    <Button variant="gold">Purchase Art</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </PageContainer>
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
