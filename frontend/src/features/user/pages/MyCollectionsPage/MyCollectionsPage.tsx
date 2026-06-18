/**
 * Photography Hub — Premium Social Media & Marketplace
 * Instagram-meets-Shutterstock-meets-OpenSea design
 * Mobile-first, no duplicate header/bottom nav (handled by DashboardLayout)
 * Features: masonry feed, upload bottom-sheet, lightbox, profile drawer, requests
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, Loader2, Eye, Camera, TrendingUp,
    Clock, ShoppingBag, Sparkles, User, Grid3X3,
    Mountain, Bird, UserCircle, Building2, Palette, Layers
} from 'lucide-react';
import { SEOHead } from '../../../../components/common/SEOHead';
import { PhotoCard, type PhotoData } from './components/PhotoCard';
import { PhotoLightbox } from './components/PhotoLightbox';
import { PhotoUpload } from './components/PhotoUpload';
import { PhotographerProfile } from './components/PhotographerProfile';
import { RequestBoard } from './components/RequestBoard';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { photosService, type SearchPhotosParams } from '../../../../services/photosService';
import './MyCollectionsPage.css';

// Category chips with icons
const CATEGORIES = [
    { id: '', label: 'All', icon: Grid3X3 },
    { id: 'landscape', label: 'Nature', icon: Mountain },
    { id: 'wildlife', label: 'Wildlife', icon: Bird },
    { id: 'portrait', label: 'Portrait', icon: UserCircle },
    { id: 'street', label: 'Street', icon: Layers },
    { id: 'abstract', label: 'Abstract', icon: Palette },
    { id: 'architecture', label: 'Architecture', icon: Building2 },
];

// Tab definitions
const TABS = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'for-sale', label: 'For Sale', icon: ShoppingBag },
    { id: 'requests', label: 'Requests', icon: Sparkles },
];

export default function CollectionsPage() {
    const [activeTab, setActiveTab] = useState('trending');
    const [activeCategory, setActiveCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [photos, setPhotos] = useState<PhotoData[]>([]);
    const [activePhotographerId, setActivePhotographerId] = useState<string | null>(null);
    const { user, isAuthenticated } = useAuthStore();
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    // Debounced search
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            // Trigger re-fetch via effect
        }, 350);
    }, []);

    const fetchPhotos = useCallback(async () => {
        if (activeTab === 'requests') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const params: SearchPhotosParams = {
                page: 1,
                limit: 30,
                category: activeCategory || undefined,
                query: searchQuery || undefined,
            };

            let response;
            if (activeTab === 'for-sale') {
                response = await photosService.getMarketplace(params);
            } else if (activeTab === 'trending') {
                params.sort = 'trending';
                response = await photosService.getPhotos(params);
            } else if (activeTab === 'latest') {
                params.sort = 'latest';
                response = await photosService.getPhotos(params);
            } else {
                response = await photosService.getPhotos(params);
            }

            const data = response?.data;
            setPhotos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching photos:', err);
            setPhotos([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeCategory, activeTab, searchQuery]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    const handleLike = useCallback(async (photoId: string) => {
        try {
            const result = await photosService.toggleLike(photoId);
            setPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, isLikedByMe: result.liked, likesCount: result.count } : p
            ));
            setSelectedPhoto(prev =>
                prev && prev.id === photoId ? { ...prev, isLikedByMe: result.liked, likesCount: result.count } : prev
            );
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    }, []);

    const handleUploadSuccess = useCallback(() => {
        setShowUpload(false);
        fetchPhotos();
    }, [fetchPhotos]);

    // Skeleton placeholders for loading state
    const renderSkeletons = () => (
        <div className="ph-grid">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="ph-grid-item" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="ph-shimmer" style={{ height: i % 3 === 0 ? 260 : i % 3 === 1 ? 200 : 230 }} />
                </div>
            ))}
        </div>
    );

    return (
        <div className="photo-hub">
            <SEOHead
                title="Photography — Social & Marketplace"
                description="Share, discover and sell photography. A premium community for photographers to showcase, trade and license their best work."
                canonical="/photography"
            />

            {/* ===== SEARCH BAR ===== */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ph-text-muted)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Search photographers, photos, tags..."
                        className="ph-search"
                    />
                </div>
            </div>

            {/* ===== CATEGORY CHIPS ===== */}
            <div className="mb-4">
                <div className="ph-categories hide-scrollbar">
                    {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(isActive && cat.id ? '' : cat.id)}
                                className={`ph-cat-chip ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ===== FILTER TABS ===== */}
            <div className="mb-5">
                <div className="ph-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`ph-tab ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== REQUESTS TAB ===== */}
            {activeTab === 'requests' ? (
                <RequestBoard isAuthenticated={isAuthenticated} />
            ) : (
                <>
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="ph-section-title">
                            {activeCategory
                                ? CATEGORIES.find(c => c.id === activeCategory)?.label
                                : activeTab === 'for-sale' ? 'Marketplace' : activeTab === 'trending' ? 'Trending' : 'Latest'}
                        </h2>
                        {activeCategory && (
                            <button
                                onClick={() => setActiveCategory('')}
                                className="text-xs font-semibold text-[var(--ph-gold)] hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Photo Feed */}
                    {isLoading ? (
                        renderSkeletons()
                    ) : photos.length === 0 ? (
                        <div className="ph-empty">
                            <Eye className="w-10 h-10 text-[var(--ph-text-muted)] opacity-30 mx-auto mb-3" />
                            <p className="text-sm font-medium text-[var(--ph-text-secondary)]">No photos found</p>
                            <p className="text-xs text-[var(--ph-text-muted)] mt-1">Try a different filter or upload your own work</p>
                            <button
                                onClick={() => { setActiveCategory(''); setSearchQuery(''); setActiveTab('trending'); }}
                                className="mt-4 text-xs font-bold text-[var(--ph-gold)] hover:underline"
                            >
                                Reset all filters
                            </button>
                        </div>
                    ) : (
                        <div className="ph-grid">
                            {photos.map((photo, i) => (
                                <PhotoCard
                                    key={photo.id}
                                    photo={photo}
                                    index={i}
                                    onSelect={setSelectedPhoto}
                                    onLike={handleLike}
                                    onViewProfile={setActivePhotographerId}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ===== UPLOAD FAB ===== */}
            {isAuthenticated && (
                <button
                    onClick={() => setShowUpload(true)}
                    className="ph-fab"
                    aria-label="Upload photo"
                >
                    <Plus className="w-6 h-6" />
                </button>
            )}

            {/* ===== LIGHTBOX ===== */}
            <AnimatePresence>
                {selectedPhoto && (
                    <PhotoLightbox
                        photo={selectedPhoto}
                        onClose={() => setSelectedPhoto(null)}
                        onLike={handleLike}
                        onViewProfile={setActivePhotographerId}
                    />
                )}
            </AnimatePresence>

            {/* ===== PHOTOGRAPHER PROFILE ===== */}
            <AnimatePresence>
                {activePhotographerId && (
                    <PhotographerProfile
                        userId={activePhotographerId}
                        onClose={() => setActivePhotographerId(null)}
                        onSelectPhoto={setSelectedPhoto}
                        onLikePhoto={handleLike}
                    />
                )}
            </AnimatePresence>

            {/* ===== UPLOAD MODAL ===== */}
            <AnimatePresence>
                {showUpload && (
                    <PhotoUpload
                        isOpen={showUpload}
                        onClose={() => setShowUpload(false)}
                        onUploadSuccess={handleUploadSuccess}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
