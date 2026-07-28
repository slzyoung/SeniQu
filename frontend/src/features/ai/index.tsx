/**
 * AI Feature - AI Curation and Genre Identifier
 * Uses real API data with artwork analysis hooks
 */

import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, Button } from '../../components/ui';
import {
    Image as ImageIcon,
    Loader2,
    Eye,
    Heart,
} from 'lucide-react';

import { useArtworks } from '../../hooks/useArtworks';
import { Link } from 'react-router-dom';
import { SEOHead } from '../../components/common/SEOHead';

import GenreIdentifierPage from '../user/pages/GenreIdentifierPage/GenreIdentifierPage';

export { GenreIdentifierPage as GenreIdentifier };

export function AICuration() {
    // Fetch recommended artworks using real API
    const { data: artworkData, isLoading } = useArtworks({
        limit: 8,
        page: 1,
    });

    const recommendations = artworkData?.data || [];

    return (
        <PageContainer
            className="max-w-7xl mx-auto"
            title="AI Curation"
            subtitle="Personalized art recommendations powered by AI"
            actions={
                <Button variant="gold">
                    Refresh
                </Button>
            }
        >
            <SEOHead
                title="AI Curation"
                description="Personalized artwork recommendations using AI technology. Discover artworks that match your taste and artistic interests."
                canonical="/ai/curation"
            />
            {/* Personalized For You */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-theme-text mb-4">
                    Curated For You
                </h3>

                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    </div>
                ) : recommendations.length === 0 ? (
                    <Card variant="elevated" className="text-center py-16">
                        <ImageIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-theme-text mb-2">No Recommendations Yet</h3>
                        <p className="text-theme-muted max-w-sm mx-auto">
                            Browse more artworks to get personalized recommendations.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recommendations.map((artwork: any) => (
                            <Card key={artwork.id} variant="elevated" hover padding="none" className="group overflow-hidden">
                                <div className="relative aspect-[4/3] bg-theme-elevated">
                                    {artwork.imageUrl || artwork.images?.[0]?.url ? (
                                        <img
                                            src={artwork.imageUrl || artwork.images?.[0]?.url}
                                            alt={artwork.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-theme-muted/40" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h4 className="font-medium text-theme-text truncate">{artwork.title}</h4>
                                    <p className="text-sm text-theme-muted">{artwork.artist?.displayName || 'Unknown'}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-theme-muted">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3.5 h-3.5" /> {artwork.views || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-3.5 h-3.5" /> {artwork.likes || 0}
                                        </span>
                                    </div>
                                </div>
                                <Link to={`/gallery/artwork/${artwork.id}`} className="absolute inset-0" />
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default { GenreIdentifier: GenreIdentifierPage, AICuration };

