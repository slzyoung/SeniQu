/**
 * Genre Identifier Page for User Dashboard
 * AI-powered artwork genre detection
 */

import { useState, useCallback } from 'react';
import {
    Upload,
    Image,
    Sparkles,
    History,
    Loader2,
    CheckCircle,
    X,
    ThumbsUp,
    ThumbsDown,
    Info,
    Camera
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Badge, Input } from '../../../components/ui';
import { useDetectGenre, useDetectionHistory, useSubmitFeedback, useGenres } from '../../../hooks/useAI';

// ============================================
// COMPONENTS
// ============================================

function GenreResultCard({
    genre,
    rank
}: {
    genre: { name: string; confidence: number; description?: string };
    rank: number;
}) {
    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-theme-elevated">
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold">
                {rank}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-theme-text">{genre.name}</h4>
                    <span className="text-sm font-mono text-theme-muted">
                        {(genre.confidence * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="h-2 bg-theme-border rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getConfidenceColor(genre.confidence)} transition-all duration-500`}
                        style={{ width: `${genre.confidence * 100}%` }}
                    />
                </div>
                {genre.description && (
                    <p className="text-xs text-theme-muted mt-2">{genre.description}</p>
                )}
            </div>
        </div>
    );
}

function HistoryItem({
    item,
    onClick
}: {
    item: any;
    onClick: () => void;
}) {
    return (
        <div
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-theme-elevated cursor-pointer transition-colors"
            onClick={onClick}
        >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-theme-elevated flex-shrink-0">
                <img
                    src={item.thumbnailUrl || item.imageUrl}
                    alt="Analyzed artwork"
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-text truncate">
                    {item.result?.genres?.[0]?.name || 'Unknown'}
                </p>
                <p className="text-xs text-theme-muted">
                    {new Date(item.createdAt).toLocaleDateString()}
                </p>
            </div>
            <Badge variant="default" className="text-xs">
                {(item.result?.overallConfidence * 100 || 0).toFixed(0)}%
            </Badge>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GenreIdentifierPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

    // Queries
    const { data: historyData, isLoading: historyLoading } = useDetectionHistory({ limit: 5 });
    const { data: genres } = useGenres();

    // Mutations
    const detectGenre = useDetectGenre();
    const submitFeedback = useSubmitFeedback();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (activeTab === 'upload' && selectedFile) {
            detectGenre.mutate(
                { file: selectedFile, onProgress: setUploadProgress },
                {
                    onSuccess: (data) => {
                        setResult(data);
                        setUploadProgress(0);
                    },
                }
            );
        }
    };

    const handleFeedback = (isAccurate: boolean) => {
        if (result?.id) {
            submitFeedback.mutate({
                detectionId: result.id,
                feedback: { isAccurate },
            });
        }
    };

    const handleClear = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResult(null);
        setUploadProgress(0);
        setImageUrl('');
    };

    const history = historyData?.data || [];

    return (
        <PageContainer
            title="Genre Identifier"
            description="Identify art genres using AI-powered image analysis"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Upload Section */}
                    <Card variant="elevated">
                        <CardHeader title="Analyze Artwork" />
                        <CardContent>
                            {/* Tabs */}
                            <div className="flex gap-2 mb-4">
                                <Button
                                    variant={activeTab === 'upload' ? 'gold' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('upload')}
                                    leftIcon={<Upload className="w-4 h-4" />}
                                >
                                    Upload Image
                                </Button>
                                <Button
                                    variant={activeTab === 'url' ? 'gold' : 'ghost'}
                                    size="sm"
                                    onClick={() => setActiveTab('url')}
                                    leftIcon={<Camera className="w-4 h-4" />}
                                >
                                    Image URL
                                </Button>
                            </div>

                            {activeTab === 'upload' ? (
                                !previewUrl ? (
                                    <div
                                        className="border-2 border-dashed border-theme-border rounded-2xl p-8 text-center hover:border-gold/50 transition-colors cursor-pointer"
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        onClick={() => document.getElementById('file-input')?.click()}
                                    >
                                        <input
                                            id="file-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                        <Image className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                                        <p className="text-theme-text font-medium mb-2">
                                            Drop your artwork here or click to upload
                                        </p>
                                        <p className="text-sm text-theme-muted">
                                            Supports JPG, PNG, WEBP up to 10MB
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full max-h-[400px] object-contain rounded-xl bg-theme-elevated"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                                            onClick={handleClear}
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </Button>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    <Input
                                        placeholder="Paste image URL here..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                    />
                                    {imageUrl && (
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="w-full max-h-[300px] object-contain rounded-xl bg-theme-elevated"
                                            onError={() => setImageUrl('')}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Progress Bar */}
                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-theme-muted mb-1">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 bg-theme-border rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gold transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Analyze Button */}
                            {(previewUrl || imageUrl) && !result && (
                                <Button
                                    variant="gold"
                                    className="w-full mt-4"
                                    onClick={handleAnalyze}
                                    disabled={detectGenre.isPending}
                                    leftIcon={detectGenre.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                >
                                    {detectGenre.isPending ? 'Analyzing...' : 'Analyze Artwork'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {result && (
                        <Card variant="elevated">
                            <CardHeader
                                title="Analysis Results"
                                action={
                                    <div className="flex items-center gap-2">
                                        <Badge variant="success" className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            {(result.overallConfidence * 100).toFixed(0)}% confidence
                                        </Badge>
                                    </div>
                                }
                            />
                            <CardContent className="space-y-4">
                                {/* Detected Genres */}
                                <div>
                                    <h4 className="text-sm font-medium text-theme-muted mb-3">Detected Genres</h4>
                                    <div className="space-y-3">
                                        {result.genres?.map((genre: any, index: number) => (
                                            <GenreResultCard
                                                key={genre.name}
                                                genre={genre}
                                                rank={index + 1}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme-border">
                                    {result.style && (
                                        <div>
                                            <p className="text-xs text-theme-muted">Style</p>
                                            <p className="font-medium text-theme-text">{result.style}</p>
                                        </div>
                                    )}
                                    {result.period && (
                                        <div>
                                            <p className="text-xs text-theme-muted">Period</p>
                                            <p className="font-medium text-theme-text">{result.period}</p>
                                        </div>
                                    )}
                                    {result.medium && (
                                        <div>
                                            <p className="text-xs text-theme-muted">Medium</p>
                                            <p className="font-medium text-theme-text">{result.medium}</p>
                                        </div>
                                    )}
                                    {result.mood?.length > 0 && (
                                        <div>
                                            <p className="text-xs text-theme-muted">Mood</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {result.mood.map((m: string) => (
                                                    <Badge key={m} variant="default" className="text-xs">{m}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Feedback */}
                                <div className="pt-4 border-t border-theme-border">
                                    <p className="text-sm text-theme-muted mb-3">Was this analysis helpful?</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<ThumbsUp className="w-4 h-4" />}
                                            onClick={() => handleFeedback(true)}
                                        >
                                            Accurate
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<ThumbsDown className="w-4 h-4" />}
                                            onClick={() => handleFeedback(false)}
                                        >
                                            Needs Improvement
                                        </Button>
                                    </div>
                                </div>

                                {/* New Analysis */}
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={handleClear}
                                >
                                    Analyze Another Artwork
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Recent History */}
                    <Card variant="elevated">
                        <CardHeader
                            title="Recent Analyses"
                            action={<History className="w-4 h-4 text-theme-muted" />}
                        />
                        <CardContent>
                            {historyLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-8 text-theme-muted">
                                    <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No analysis history yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((item: any) => (
                                        <HistoryItem
                                            key={item.id}
                                            item={item}
                                            onClick={() => setResult(item.result)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Popular Genres */}
                    <Card variant="elevated">
                        <CardHeader
                            title="Popular Genres"
                            action={<Info className="w-4 h-4 text-theme-muted" />}
                        />
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {genres?.slice(0, 12).map((genre: any) => (
                                    <Badge
                                        key={genre.name}
                                        variant="default"
                                        className="cursor-pointer hover:bg-gold/10 hover:text-gold hover:border-gold"
                                    >
                                        {genre.name}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tips */}
                    <Card variant="elevated" className="bg-gold/5 border-gold/20">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-theme-text mb-1">Tips for Best Results</h4>
                                    <ul className="text-sm text-theme-muted space-y-1">
                                        <li>• Use high-resolution images</li>
                                        <li>• Ensure good lighting</li>
                                        <li>• Avoid cropped or partial artworks</li>
                                        <li>• Include the full composition</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}

export default GenreIdentifierPage;
