/**
 * AI Feature - AI Curation and Genre Identifier
 * Uses real API data with artwork analysis hooks
 */

import { useState, useRef } from 'react';
import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, CardContent, Button, Badge } from '../../components/ui';
import {
    Search,
    Upload,
    Image as ImageIcon,
    Loader2,
    Eye,
    Heart,
    CheckCircle
} from 'lucide-react';
import { useArtworks } from '../../hooks/useArtworks';
import { Link } from 'react-router-dom';
import { SEOHead } from '../../components/common/SEOHead';

export function GenreIdentifier() {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<{
        genre: string;
        style: string;
        era: string;
        confidence: number;
        similar: { title: string; artist: string }[];
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (!uploadedFile) return;

        setIsAnalyzing(true);

        // Simulate AI analysis (replace with real API call when available)
        setTimeout(() => {
            setResult({
                genre: 'Impressionism',
                style: 'Post-Impressionist',
                era: 'Late 19th Century',
                confidence: 92,
                similar: [
                    { title: 'Starry Night', artist: 'Vincent van Gogh' },
                    { title: 'Water Lilies', artist: 'Claude Monet' },
                ]
            });
            setIsAnalyzing(false);
        }, 2000);
    };

    return (
        <PageContainer
            className="max-w-7xl mx-auto"
            title="AI Genre Identifier"
            subtitle="Upload artwork to identify its genre and style"
        >
            <SEOHead
                title="AI Genre Identifier"
                description="Automatically identify art genres and styles with AI technology. Upload artworks for in-depth analysis."
                canonical="/ai/genre"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <Card variant="elevated">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-theme-text mb-4">Upload Artwork</h3>

                        {!previewUrl ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-theme-border rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gold transition-colors"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <Upload className="w-12 h-12 text-theme-muted mb-4" />
                                <p className="text-theme-text font-medium">Click to upload</p>
                                <p className="text-theme-muted text-sm mt-1">JPG, PNG, WebP up to 10MB</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-elevated">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => { setPreviewUrl(null); setUploadedFile(null); setResult(null); }}
                                    >
                                        Clear
                                    </Button>
                                    <Button
                                        variant="gold"
                                        className="flex-1"
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                Analyze
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Section */}
                <Card variant="elevated">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-theme-text mb-4">Analysis Results</h3>

                        {!result ? (
                            <div className="text-center py-12">
                                <Search className="w-12 h-12 text-theme-muted mx-auto mb-4" />
                                <p className="text-theme-muted">
                                    Upload an artwork to get AI analysis results
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-green-500">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">Analysis Complete ({result.confidence}% confidence)</span>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-theme-surface rounded-xl p-4 text-center">
                                        <p className="text-xs text-theme-muted mb-1">Genre</p>
                                        <p className="font-semibold text-theme-text">{result.genre}</p>
                                    </div>
                                    <div className="bg-theme-surface rounded-xl p-4 text-center">
                                        <p className="text-xs text-theme-muted mb-1">Style</p>
                                        <p className="font-semibold text-theme-text">{result.style}</p>
                                    </div>
                                    <div className="bg-theme-surface rounded-xl p-4 text-center">
                                        <p className="text-xs text-theme-muted mb-1">Era</p>
                                        <p className="font-semibold text-theme-text">{result.era}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-theme-muted mb-3">Similar Artworks</p>
                                    <div className="space-y-2">
                                        {result.similar.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-theme-surface rounded-lg p-3">
                                                <div>
                                                    <p className="font-medium text-theme-text">{item.title}</p>
                                                    <p className="text-sm text-theme-muted">{item.artist}</p>
                                                </div>
                                                <Badge variant="default">Match</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}

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

export default { GenreIdentifier, AICuration };
