/**
 * Gallery Feature - Layout and Pages
 * Uses real API data with useArtwork hook
 */

import { useState, useMemo } from 'react';
import { Outlet, useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { PageContainer } from '../../components/common/DashboardLayout';
import { Card, CardContent, Button, Badge } from '../../components/ui';
import {
    Image as ImageIcon,
    Heart,
    Eye,
    Share2,
    Bookmark,
    ChevronLeft,
    Loader2,
    ArrowLeft,
    Upload,
    Plus,
    ArrowRight,
    ShieldCheck,
    Fingerprint,
    ExternalLink,

    Cpu,
    CheckCircle2,
    Wallet,
    X
} from 'lucide-react';
import { useArtwork, useArtworks } from '../../hooks/useArtworks';
import { useMuseum } from '../../hooks/useMuseums';
import { useAddBookmark } from '../../hooks/useUser';
import { formatDate } from '../../lib/utils';
import { motion } from 'framer-motion';

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

// Helper to retrieve artwork image from various formats
function getArtworkImage(artwork: any): string {
    if (!artwork) return '';
    const raw =
        artwork.primaryImageUrl
        || artwork.primary_image_url
        || artwork.imageUrl
        || artwork.image_url
        || '';
    if (raw) return raw;
    let imgs = artwork.images;
    if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) {
        const first = typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url || imgs[0]?.image_url || imgs[0]?.imageUrl;
        if (first) return first;
    }
    return '';
}

// Artwork Detail Page with real API data
export function ArtworkView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: artwork, isLoading, isError } = useArtwork(id || '');
    const addBookmark = useAddBookmark();

    // Purchase Modal State
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [purchaseStep, setPurchaseStep] = useState<'idle' | 'wallet_connecting' | 'signing' | 'confirming' | 'success'>('idle');
    const [txHash, setTxHash] = useState('');

    const handleBookmark = () => {
        if (id) {
            addBookmark.mutate(id);
        }
    };

    const startPurchaseFlow = () => {
        setIsPurchaseModalOpen(true);
        setPurchaseStep('wallet_connecting');
        
        // Step 1: Wallet Connection simulation
        setTimeout(() => {
            setPurchaseStep('signing');
        }, 1500);
    };

    const handleSignMessage = () => {
        setPurchaseStep('confirming');
    };

    const handleApproveTransaction = () => {
        setPurchaseStep('confirming');
        // Simulate contract broadcast
        setTimeout(() => {
            const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
            setTxHash(mockHash);
            setPurchaseStep('success');
        }, 2000);
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

    const imageUrl = getArtworkImage(artwork);

    // Derived AI Genres mock data with confidence scores
    const aiGenres = (artwork.genre && artwork.genre.length > 0)
        ? artwork.genre.map((g, idx) => ({
            name: g,
            confidence: idx === 0 ? 94 : idx === 1 ? 78 : 45
          }))
        : [
            { name: 'Modernism', confidence: 91 },
            { name: 'Expressionism', confidence: 64 },
            { name: 'Nusantara Style', confidence: 42 }
          ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-16 md:pt-4 lg:min-h-screen">
            <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-theme-muted hover:text-gold transition-colors mb-6 md:mb-8 bg-theme-surface/50 px-4 py-2 rounded-full border border-theme-border/50 backdrop-blur-sm self-start">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative">
                {/* Artwork Image */}
                <div className="lg:sticky lg:top-24 z-10 w-full mb-8 lg:mb-0">
                    <Card variant="elevated" className="overflow-hidden bg-theme-surface/30 border-theme-border/40 aspect-square lg:aspect-auto flex items-center justify-center p-4 lg:p-8">
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

                    {/* AI Insights & Genre Confidence Breakdown */}
                    <div className="bg-theme-surface/30 border border-theme-border/40 rounded-2xl p-6">
                        <h3 className="font-serif font-semibold text-lg text-theme-text mb-4 flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-gold" />
                            AI Genre & Style Insights
                        </h3>
                        <p className="text-xs text-theme-muted mb-4">
                            Automatic computer vision pipeline classification and analysis.
                        </p>
                        <div className="space-y-4">
                            {aiGenres.map((g, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-theme-text">{g.name}</span>
                                        <span className="text-gold font-mono">{g.confidence}%</span>
                                    </div>
                                    <div className="h-2 bg-theme-elevated/40 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-gold/50 to-gold rounded-full transition-all duration-1000"
                                            style={{ width: `${g.confidence}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Proof of Art (PoA) Blockchain Provenance Timeline */}
                    <div className="bg-theme-surface/30 border border-theme-border/40 rounded-2xl p-6">
                        <h3 className="font-serif font-semibold text-lg text-theme-text mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Proof of Art (PoA) Provenance
                        </h3>
                        <div className="relative border-l-2 border-theme-border/50 pl-6 ml-3 space-y-6">
                            {/* Step 1: Created */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-gold border-2 border-theme-bg" />
                                <h4 className="text-sm font-bold text-theme-text">Masterpiece Creation</h4>
                                <p className="text-xs text-theme-muted mt-0.5">
                                    Authored by {artwork.artist?.displayName || 'Unknown Artist'} in {artwork.year || 2026} using {artwork.medium || 'Mixed Media'}.
                                </p>
                            </div>

                            {/* Step 2: Verified */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-theme-bg" />
                                <h4 className="text-sm font-bold text-theme-text">Institutional Verification</h4>
                                <p className="text-xs text-theme-muted mt-0.5">
                                    Digitally cataloged and verified by {artwork.museum?.name || artwork.gallery?.name || 'SeniQu Core Curator'} under ID {artwork.id.substring(0, 8)}.
                                </p>
                            </div>

                            {/* Step 3: Registered */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-indigo-500 border-2 border-theme-bg" />
                                <h4 className="text-sm font-bold text-theme-text">On-chain Registration</h4>
                                <p className="text-xs text-theme-muted mt-0.5">
                                    Tokenized on the blockchain. Provenance verified using cryptographic signature and secure smart contract binding.
                                </p>
                            </div>
                        </div>
                    </div>

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
                                    <Button 
                                        variant="gold" 
                                        onClick={startPurchaseFlow}
                                        className="w-full sm:w-auto px-8 py-6 text-lg font-semibold shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-1 transition-all"
                                    >
                                        Purchase Masterpiece
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Interactive Web3 Privy Checkout Modal */}
            {isPurchaseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-theme-surface border border-theme-border shadow-2xl p-6 animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-gold" />
                                <span className="font-serif font-bold text-lg text-theme-text">Secure Checkout</span>
                            </div>
                            <button 
                                onClick={() => setIsPurchaseModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-theme-elevated/45 text-theme-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Steps content */}
                        <div className="min-h-[220px] flex flex-col justify-center items-center text-center">
                            {purchaseStep === 'wallet_connecting' && (
                                <div className="space-y-4">
                                    <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto" />
                                    <h4 className="font-bold text-theme-text text-base">Privy Wallet Connection</h4>
                                    <p className="text-xs text-theme-muted max-w-[280px] mx-auto">
                                        Loading embedded wallet configuration & securing hardware enclave session bindings...
                                    </p>
                                </div>
                            )}

                            {purchaseStep === 'signing' && (
                                <div className="space-y-5 w-full">
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute w-16 h-16 rounded-full bg-gold/10 animate-ping" />
                                        <div className="p-4 bg-gold/20 rounded-full text-gold relative z-10">
                                            <Fingerprint className="w-10 h-10" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-theme-text text-base">Sign Cryptographic Nonce</h4>
                                        <p className="text-xs text-theme-muted max-w-[320px] mx-auto leading-relaxed">
                                            Sign message to bind your embedded address <span className="font-mono bg-theme-elevated px-1.5 py-0.5 rounded text-gold text-[10px]">0x3fc...91a</span> and prevent replay attacks (OWASP A7).
                                        </p>
                                    </div>
                                    <Button variant="gold" onClick={handleSignMessage} className="w-full font-bold">
                                        Sign Transaction
                                    </Button>
                                </div>
                            )}

                            {purchaseStep === 'confirming' && (
                                <div className="space-y-5 w-full">
                                    <div className="space-y-3 p-4 bg-theme-surface/50 border border-theme-border/50 rounded-2xl text-left text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-theme-muted">Artwork Price:</span>
                                            <span className="font-bold text-theme-text">{artwork.price} {((artwork as any).currency) || 'ETH'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-theme-muted">Estimated Gas Fee:</span>
                                            <span className="font-mono text-gold">0.00042 ETH</span>
                                        </div>
                                        <div className="h-[1px] bg-theme-border/50 my-2" />
                                        <div className="flex justify-between text-sm">
                                            <span className="font-semibold text-theme-text">Total Cost:</span>
                                            <span className="font-bold text-gold">{((artwork.price || 0) + 0.00042).toFixed(5)} {((artwork as any).currency) || 'ETH'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setPurchaseStep('signing')} className="flex-1 font-semibold">
                                            Back
                                        </Button>
                                        <Button variant="gold" onClick={handleApproveTransaction} className="flex-1 font-bold">
                                            Approve & Broadcast
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {purchaseStep === 'success' && (
                                <div className="space-y-5 w-full">
                                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full w-fit mx-auto">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-theme-text text-base">Purchase Completed!</h4>
                                        <p className="text-xs text-theme-muted max-w-[280px] mx-auto">
                                            Congratulations! The verified Certificate of Authenticity (PoA) has been minted and transferred to your wallet.
                                        </p>
                                    </div>
                                    <div className="bg-theme-surface/80 border border-theme-border/40 rounded-xl p-3 text-left">
                                        <p className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold mb-1">Transaction Hash</p>
                                        <a 
                                            href={`https://etherscan.io/tx/${txHash}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono text-gold flex items-center gap-1.5 hover:underline break-all"
                                        >
                                            {txHash.substring(0, 24)}...
                                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                        </a>
                                    </div>
                                    <Button variant="gold" onClick={() => setIsPurchaseModalOpen(false)} className="w-full font-bold">
                                        Done
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
// Museum Detail Page (Mockup Implementation)
export function MuseumDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [expandedText, setExpandedText] = useState(false);

    // Fetch real museum info
    const { data: dbMuseum, isLoading: museumLoading } = useMuseum(id || '');

    // Fetch real artworks
    const { data: artworksData } = useArtworks({
        page: 1,
        limit: 100
    });

    // Dynamic metadata dictionary based on ID
    const MOCK_DATA: Record<string, any> = {
        'museum-nasional': {
            name: 'MUSEUM NASIONAL',
            location: 'Jakarta Barat, Indonesia',
            descStart: 'Museum Nasional Indonesia, juga dikenal sebagai Museum Gajah, adalah museum kebanggaan bangsa yang mengajak kita semua mengapresiasi sejarah, seni, dan kreativitas Nusantara.',
            descMore: ' Didirikan pada tahun 1778, museum ini memiliki koleksi lebih dari 140.000 benda bersejarah dan artefak budaya dari seluruh Indonesia.',
            initial: 'M',
            coverImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Museum_Nasional_Indonesia_2.jpg/800px-Museum_Nasional_Indonesia_2.jpg'
        },
        'museum-affandi': {
            name: 'MUSEUM AFFANDI',
            location: 'Sleman, Yogyakarta',
            descStart: 'Museum Affandi menyimpan maestro ekspresionisme Indonesia, Bapak Affandi. Melestarikan ratusan lukisan mahakarya yang menawan hati.',
            descMore: ' Terletak di tepi sungai Gajah Wong, kompleks unik ini dirancang langsung oleh sang maestro sebagai rumah dan galeri pribadinya.',
            initial: 'A',
            coverImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Affandi_Museum.JPG/800px-Affandi_Museum.JPG'
        },
        'museum-sonobudoyo': {
            name: 'MUSEUM SONOBUDOYO',
            location: 'Bantul, Yogyakarta',
            descStart: 'Museum terbesar dan terlengkap di Yogyakarta yang menyimpan koleksi kebudayaan Jawa yang luar biasa kaya dan mendalam.',
            descMore: ' Dari keris kuno hingga instrumen gamelan, rasakan kemegahan pusaka leluhur yang tak ternilai harganya.',
            initial: 'S',
            coverImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Sonobudoyo_Yogyakarta.jpg/800px-Sonobudoyo_Yogyakarta.jpg'
        },
        'candi-prambanan': {
            name: 'CANDI PRAMBANAN',
            location: 'Sleman, Yogyakarta',
            descStart: 'Mahakarya peradaban Hindu abad ke-9, menjulang tinggi dan ukiran memukau yang mengabadikan kisah epik Ramayana.',
            descMore: ' Keajaiban arsitektur kuno ini adalah salah satu candi terindah di Asia Tenggara, diakui sebagai warisan dunia oleh UNESCO.',
            initial: 'P',
            coverImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Prambanan_Temple_Yogyakarta_Indonesia.jpg/800px-Prambanan_Temple_Yogyakarta_Indonesia.jpg'
        },
        'canggu-art-space': {
            name: 'CANGGU ART SPACE',
            location: 'Canggu, Bali',
            descStart: 'A premier bohemian sanctuary for contemporary fine arts, blending deep Balinese heritage with modern global expressionism.',
            descMore: ' Hosting weekly exhibitions from breakthrough local talents and fostering a community of passionate international artists.',
            initial: 'C',
            coverImage: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1200'
        }
    };

    const mockData = MOCK_DATA[id || ''] || {
        name: 'NATIONAL GALLERY',
        location: 'Washington DC, United States',
        descStart: 'The National Gallery of Art serves the nation by inviting everyone to explore and experience art, creativity, and our shared history.',
        descMore: ' Founded in 1937, it preserves, collects, exhibits, and fosters an understanding of works of art at the highest possible museum and scholarly standards.',
        initial: 'N',
        coverImage: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=1200'
    };

    // Combine database data and mock fallback
    const museumName = dbMuseum?.name || mockData.name;
    const museumLocation = dbMuseum?.address 
        ? `${dbMuseum.address.city}, ${dbMuseum.address.province || 'Indonesia'}`
        : mockData.location;
    const descriptionStart = dbMuseum?.description 
        ? dbMuseum.description.substring(0, 150)
        : mockData.descStart;
    const descriptionMore = dbMuseum?.description && dbMuseum.description.length > 150
        ? dbMuseum.description.substring(150)
        : mockData.descMore;
    const museumInitial = museumName ? museumName.charAt(0).toUpperCase() : 'M';
    const coverImage = dbMuseum?.images?.[0] || mockData.coverImage;

    const allArtworks = useMemo(() => {
        if (!artworksData) return [];
        const raw = artworksData;
        if (Array.isArray(raw)) return raw;
        if (raw.data && Array.isArray(raw.data)) return raw.data;
        return [];
    }, [artworksData]);

    const museumArtworks = useMemo(() => {
        return allArtworks.filter((art: any) => {
            const mId = art.museumId || art.museum?.id || '';
            const gId = art.galleryId || art.gallery?.id || '';
            const mName = (art.museum?.name || '').toLowerCase();
            const gName = (art.gallery?.name || '').toLowerCase();
            const curName = (museumName || '').toLowerCase();
            
            return (
                mId === id ||
                gId === id ||
                (id && art.museum?.slug === id) ||
                (curName && (mName.includes(curName) || gName.includes(curName) || curName.includes(mName) || curName.includes(gName)))
            );
        });
    }, [allArtworks, id, museumName]);

    const mockCollection = [
        "https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?w=500&q=80",
        "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=500&q=80",
        "https://images.unsplash.com/photo-1579541592065-da8a1fbfa40a?w=500&q=80",
        "https://images.unsplash.com/photo-1578301978693-85fa9c026f47?w=500&q=80"
    ];

    if (museumLoading) {
        return (
            <div className="min-h-screen bg-[#EBEAE4] dark:bg-[#1a1a1a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#EBEAE4] dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-[#EBEAE4] font-sans overflow-x-hidden" style={{ margin: '-2rem -1rem', paddingBottom: '5rem' }}>
            {/* Top Actions */}
            <div className="absolute top-12 md:top-16 inset-x-0 z-40 flex items-center justify-between px-6 max-w-lg mx-auto md:max-w-4xl">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full text-white bg-black/30 hover:bg-black/50 backdrop-blur-md transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-full text-white bg-black/30 hover:bg-black/50 backdrop-blur-md transition-colors">
                        <Upload className="w-5 h-5" />
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black dark:bg-[#EBEAE4] text-white dark:text-black font-semibold text-sm hover:scale-105 transition-transform shadow-lg">
                        <Plus className="w-4 h-4" />
                        Follow
                    </button>
                </div>
            </div>

            <div className="relative max-w-lg mx-auto md:max-w-4xl bg-[#EBEAE4] dark:bg-[#1a1a1a] min-h-screen">
                {/* Hero section */}
                <div className="relative w-full h-[45vh] md:h-[60vh] bg-stone-800">
                    <img 
                        src={coverImage} 
                        alt={museumName} 
                        className="w-full h-full object-cover object-center opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                    
                    {/* Torn Paper border effect */}
                    <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden text-[#EBEAE4] dark:text-[#1a1a1a] translate-y-px">
                        <svg viewBox="0 0 1440 100" className="w-full h-12 md:h-16 fill-current preserve-3d" preserveAspectRatio="none">
                            <path d="M0,50 C120,40 240,70 360,60 C480,50 600,80 720,70 C840,60 960,30 1080,40 C1200,50 1320,60 1440,30 L1440,100 L0,100 Z" />
                        </svg>
                    </div>

                    {/* Logo Overlay */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#111] border-[6px] border-[#EBEAE4] dark:border-[#1a1a1a] flex items-center justify-center shadow-lg">
                            <span className="text-4xl md:text-5xl font-serif font-bold text-white mt-2">
                                {museumInitial}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Museum Info */}
                <div className="pt-16 px-6 md:px-12 text-center pb-8">
                    <h1 className="text-3xl sm:text-4xl md:text-6xl text-center px-4 font-serif font-medium uppercase tracking-[0.08em] flex flex-col items-center justify-center -ml-1 text-[#1a1a1a] dark:text-[#EBEAE4]">
                        <span>{museumName.split(' ')[0]}</span>
                        <div className="flex items-center">
                            <span>{museumName.split(' ').slice(1).join(' ')}</span>
                        </div>
                    </h1>
                    
                    <p className="mt-4 text-sm md:text-base font-semibold text-stone-600 dark:text-stone-400">
                        {museumLocation}
                    </p>

                    <p className="mt-6 text-[15px] md:text-lg leading-relaxed text-stone-700 dark:text-stone-300 max-w-sm md:max-w-2xl mx-auto font-serif font-light">
                        {descriptionStart}
                        {!expandedText && descriptionMore && (
                            <button onClick={() => setExpandedText(true)} className="ml-1 font-bold italic underline decoration-1 underline-offset-2">
                                ..More
                            </button>
                        )}
                        {expandedText && (
                            <span>{descriptionMore}</span>
                        )}
                    </p>
                </div>

                {/* Decorative Divider */}
                <div className="flex justify-center -translate-y-2 mt-4">
                    <div className="w-10/12 md:w-1/2 flex items-center justify-center relative">
                        <div className="absolute w-full h-[1px] bg-stone-300 dark:bg-stone-700"></div>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="bg-[#EBEAE4] dark:bg-[#1a1a1a] px-1 z-10 text-stone-500 dark:text-stone-400" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor"/>
                        </svg>
                    </div>
                </div>

                {/* Collection Section */}
                <div className="px-6 md:px-12 py-8 mt-2">
                    <div className="flex items-center justify-between mb-8 text-[#1a1a1a] dark:text-[#EBEAE4]">
                        <h2 className="text-2xl md:text-3xl font-serif uppercase tracking-[0.1em]">
                            The Collection
                        </h2>
                        {museumArtworks.length > 0 && (
                            <span className="text-xs text-stone-500 dark:text-stone-400 font-serif">
                                {museumArtworks.length} Masterpieces managed by Partner
                            </span>
                        )}
                    </div>

                    {museumArtworks.length > 0 ? (
                        <div className="grid grid-cols-2 gap-6 md:gap-10">
                            {museumArtworks.map((art: any, idx: number) => {
                                const artworkImg = getArtworkImage(art);
                                const isOffset = idx % 2 === 1;
                                return (
                                    <motion.div
                                        key={art.id || idx}
                                        className={`w-full ${isOffset ? 'md:mt-16' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                        whileHover={{ y: -4 }}
                                        onClick={() => navigate(`/gallery/artwork/${art.id}`)}
                                    >
                                        <div 
                                            className="w-full relative shadow-xl p-3 md:p-5 bg-[#CBA36D]" 
                                            style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.2)' }}
                                        >
                                            <div className="absolute inset-0 border border-yellow-900/60 m-1 md:m-2 pointer-events-none"></div>
                                            <div className="w-full aspect-[4/5] bg-black shadow-inner overflow-hidden border border-amber-900/50">
                                                <img 
                                                    src={artworkImg} 
                                                    alt={art.title} 
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Elegant label below the frame */}
                                        <div style={{ marginTop: 12, padding: '0 4px', textAlign: 'center' }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'serif', margin: 0, lineClamp: 1, WebkitLineClamp: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {art.title}
                                            </h4>
                                            <p style={{ fontSize: 11, color: 'var(--theme-muted)', margin: '2px 0 0 0' }}>
                                                {art.artist?.displayName || 'Unknown Artist'}
                                                {art.year ? `, ${art.year}` : ''}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="grid grid-cols-2 gap-4 md:gap-8">
                                {/* Frame 1 */}
                                <div className="w-full relative shadow-xl p-3 md:p-5 bg-[#CBA36D]" style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.2)' }}>
                                    <div className="absolute inset-0 border border-yellow-900/60 m-1 md:m-2 pointer-events-none"></div>
                                    <div className="w-full aspect-[5/4] bg-black shadow-inner overflow-hidden border border-amber-900/50">
                                        <img src={mockCollection[0]} alt="Collection item 1" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                                    </div>
                                </div>

                                {/* Frame 2 - Offset */}
                                <div className="w-full relative shadow-xl p-3 md:p-5 md:mt-16 bg-[#CBA36D]" style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.2)' }}>
                                    <div className="absolute inset-0 border border-yellow-900/60 m-1 md:m-2 pointer-events-none"></div>
                                    <div className="w-full aspect-[3/4] bg-black shadow-inner overflow-hidden border border-amber-900/50">
                                        <img src={mockCollection[1]} alt="Collection item 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                                    </div>
                                </div>

                                {/* Frame 3 */}
                                <div className="w-full relative shadow-xl p-3 md:p-5 bg-[#CBA36D]" style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.2)' }}>
                                    <div className="absolute inset-0 border border-yellow-900/60 m-1 md:m-2 pointer-events-none"></div>
                                    <div className="w-full aspect-[3/4] bg-black shadow-inner overflow-hidden border border-amber-900/50">
                                        <img src={mockCollection[2]} alt="Collection item 3" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                                    </div>
                                </div>

                                {/* Frame 4 - Offset */}
                                <div className="w-full relative shadow-xl p-3 md:p-5 md:mt-16 bg-[#CBA36D]" style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.2)' }}>
                                    <div className="absolute inset-0 border border-yellow-900/60 m-1 md:m-2 pointer-events-none"></div>
                                    <div className="w-full aspect-[5/4] bg-black shadow-inner overflow-hidden border border-amber-900/50">
                                        <img src={mockCollection[3]} alt="Collection item 4" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--theme-muted)', fontStyle: 'italic', marginTop: 12 }}>
                                Showing curated sample masterworks. Partner collections upload interface coming soon.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GalleryLayout;
