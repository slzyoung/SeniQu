/**
 * PhotographerProfile — Modern, Premium Web3 Photographer Profile
 * Seamless light/dark theme integration, mobile-first design, SOL earnings metrics,
 * elegant horizontal brands widget, and responsive masonry work showcase.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Camera, FolderHeart, Loader2, Folder,
    Phone, MessageSquare, Share2, Coins, Award, Heart, CheckCircle
} from 'lucide-react';
import { photosService, type PhotographerStats } from '../../../../../services/photosService';
import { albumsService } from '../../../../../services/albumsService';
import { PhotoCard, type PhotoData } from './PhotoCard';
import { ChatDrawer } from './ChatDrawer';
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface Props {
    userId: string;
    onClose: () => void;
    onSelectPhoto: (photo: PhotoData) => void;
    onLikePhoto: (photoId: string) => void;
}

export function PhotographerProfile({ userId, onClose, onSelectPhoto, onLikePhoto }: Props) {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<PhotographerStats | null>(null);
    const [photos, setPhotos] = useState<PhotoData[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
    const [albumPhotos, setAlbumPhotos] = useState<PhotoData[]>([]);
    const [isLoadingAlbumPhotos, setIsLoadingAlbumPhotos] = useState(false);
    const [activeTab, setActiveTab] = useState<'photos' | 'collections'>('photos');
    const [isLoading, setIsLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        if (!selectedCollection) {
            setAlbumPhotos([]);
            return;
        }
        const loadAlbumPhotos = async () => {
            setIsLoadingAlbumPhotos(true);
            try {
                const rawItems = await albumsService.getAlbumItems(selectedCollection.id);
                const parsed: PhotoData[] = (rawItems || []).map((item: any) => ({
                    id: item.id,
                    userId: item.userId || item.user_id || userId,
                    title: item.title || 'Untitled',
                    description: item.description,
                    originalUrl: item.originalUrl || item.original_url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                    mediumUrl: item.mediumUrl || item.medium_url,
                    thumbnailUrl: item.thumbnailUrl || item.thumbnail_url,
                    isPublic: item.isPublic !== false && item.is_public !== false,
                    isForSale: false,
                    price: 0,
                    likesCount: 0,
                    commentsCount: 0,
                    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
                }));
                setAlbumPhotos(parsed);
            } catch (err) {
                console.error('Failed to load collection photos:', err);
            } finally {
                setIsLoadingAlbumPhotos(false);
            }
        };
        loadAlbumPhotos();
    }, [selectedCollection, userId]);

    useEffect(() => {
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const [statsRes, photosRes, collectionsRes] = await Promise.all([
                    photosService.getPhotographerStats(userId),
                    photosService.getPhotos({ userId, limit: 30 }),
                    albumsService.getUserAlbums(userId)
                ]);
                setStats(statsRes);
                setPhotos(photosRes.data);
                const publicAlbums = (collectionsRes || []).filter((c: any) => c.isPublic !== false && c.is_public !== false);
                setCollections(publicAlbums);
            } catch (err) {
                console.error('Failed to load photographer profile:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [userId]);

    const displayName = stats?.displayName || 'Photographer';
    const initial = displayName.charAt(0).toUpperCase();

    return createPortal(
        <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed inset-0 z-[100] overflow-y-auto"
            style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}
        >
            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-[var(--text-gold)] animate-spin" />
                    <p className="text-sm text-[var(--text-muted)]">Loading premium profile...</p>
                </div>
            ) : (
                <div className="pb-28">
                    {/* Header Banner area with Blur Background */}
                    <div className="relative pt-16 pb-8 px-5 overflow-hidden">
                        {/* Background glassmorphic circles */}
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square rounded-full bg-[var(--text-gold)]/10 blur-[80px]" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-orange-400/5 blur-[80px]" />

                        {/* Top navigation actions */}
                        <div className="absolute top-5 left-4 right-4 flex items-center justify-between z-30">
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-full backdrop-blur-md shadow-sm transition-all"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button
                                className="p-2.5 rounded-full backdrop-blur-md shadow-sm transition-all"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Centered Avatar and credentials */}
                        <div className="flex flex-col items-center relative z-10">
                            <div className="relative">
                                <div
                                    className="w-28 h-28 rounded-full p-1 shadow-xl flex items-center justify-center overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--text-gold), #FFF3C4)',
                                    }}
                                >
                                    <div
                                        className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold font-serif overflow-hidden"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        {stats?.avatarUrl ? (
                                            <img src={stats.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                        ) : initial}
                                    </div>
                                </div>
                                <span className="absolute bottom-1 right-1 bg-emerald-500 border-2 border-white dark:border-[#0D0D0D] w-5 h-5 rounded-full flex items-center justify-center" title="Verified Creator">
                                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold font-serif mt-4 text-center tracking-tight flex items-center gap-1.5">
                                {displayName}
                            </h2>
                            <p className="text-xs text-[var(--text-muted)] font-medium mt-1 uppercase tracking-widest flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-[var(--text-gold)]" />
                                Professional Photographer
                            </p>

                            {/* Mobile action bar */}
                            {user?.id !== userId && (
                                <div className="flex items-center gap-3 mt-5">
                                    <button
                                        onClick={() => setShowChat(true)}
                                        className="px-5 py-2.5 rounded-full font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                                        style={{
                                            background: 'linear-gradient(135deg, var(--text-gold), var(--text-gold))',
                                            color: '#0D0D0D'
                                        }}
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Send Message
                                    </button>
                                    <button
                                        className="px-5 py-2.5 rounded-full font-bold text-xs border transition-all flex items-center gap-1.5"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        Contact
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Web3 Solana Earnings Card */}
                    <div className="max-w-sm mx-auto px-5 mt-2">
                        <div
                            className="relative overflow-hidden rounded-[20px] p-5 flex items-center justify-between shadow-sm"
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="absolute top-[-10px] right-[-10px] w-20 h-20 rounded-full bg-[var(--text-gold)]/5 blur-xl pointer-events-none" />
                            <div className="min-w-0 flex-1 pr-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-gold)', lineHeight: '1.4' }}>
                                    Solana Marketplace Earnings
                                </span>
                                <span className="text-2xl font-black block mt-1 tracking-tight flex items-baseline gap-1" style={{ lineHeight: '1.2' }}>
                                    {(stats?.solEarnings || 0).toFixed(2)}
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-gold)' }}>SOL</span>
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block" style={{ lineHeight: '1.3' }}>
                                    Earned directly from digital assets sales
                                </span>
                            </div>
                            <div
                                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-inner"
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <Coins className="w-5.5 h-5.5" style={{ color: 'var(--text-gold)' }} />
                            </div>
                        </div>
                    </div>

                    {/* Statistics Row */}
                    <div className="max-w-sm mx-auto px-5 mt-4">
                        <div
                            className="rounded-[20px] shadow-sm p-4 grid grid-cols-4 gap-2 text-center"
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            {[
                                {value: stats?.photosCount || 0, label: 'Photos', icon: Camera},
                                {value: stats?.collectionsCount || 0, label: 'Albums', icon: Folder},
                                {value: stats?.likesReceived || 0, label: 'Likes', icon: Heart},
                                {value: photos.filter(p => p.isForSale).length, label: 'Listed', icon: Coins},
                            ].map((item) => (
                                <div key={item.label} className="flex flex-col items-center justify-center">
                                    <span className="text-base font-extrabold tracking-tight">
                                        {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}K` : item.value}
                                    </span>
                                    <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Brands Worked With widget */}
                    <div className="max-w-sm mx-auto px-5 mt-4">
                        <div
                            className="rounded-[20px] shadow-sm p-4"
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-extrabold uppercase tracking-wide">Brand Cooperations</h4>
                                <span className="text-[10px] font-bold" style={{ color: 'var(--text-gold)' }}>Active Creator</span>
                            </div>
                            <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar">
                                {['Studio A', 'Focal Lab', 'LensCo'].map((brand) => (
                                    <span
                                        key={brand}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                                        style={{
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <span
                                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                                            style={{
                                                background: 'var(--text-gold)',
                                                color: '#0D0D0D'
                                            }}
                                        >
                                            {brand.charAt(0)}
                                        </span>
                                        {brand}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Showcase Tab Control */}
                    <div className="max-w-sm mx-auto px-5 mt-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-extrabold font-serif tracking-tight">Showcase Gallery</h3>
                            <div
                                className="flex rounded-full p-1 border"
                                style={{
                                    background: 'var(--bg-surface)',
                                    borderColor: 'var(--border-color)'
                                }}
                            >
                                <button
                                    onClick={() => { setActiveTab('photos'); setSelectedCollection(null); }}
                                    className={`px-5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                        activeTab === 'photos' && !selectedCollection
                                            ? 'text-[#0D0D0D]'
                                            : 'text-[var(--text-muted)]'
                                    }`}
                                    style={activeTab === 'photos' && !selectedCollection ? {
                                        background: 'var(--text-gold)',
                                    } : {}}
                                >
                                    Photos
                                </button>
                                <button
                                    onClick={() => setActiveTab('collections')}
                                    className={`px-5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                        activeTab === 'collections' || selectedCollection
                                            ? 'text-[#0D0D0D]'
                                            : 'text-[var(--text-muted)]'
                                    }`}
                                    style={activeTab === 'collections' || selectedCollection ? {
                                        background: 'var(--text-gold)',
                                    } : {}}
                                >
                                    Albums
                                </button>
                            </div>
                        </div>

                        {/* Photos Grid */}
                        {activeTab === 'photos' && !selectedCollection && (
                            <div>
                                {photos.length === 0 ? (
                                    <div
                                        className="py-16 text-center border-2 border-dashed rounded-[20px]"
                                        style={{
                                            borderColor: 'var(--border-color)',
                                            background: 'var(--bg-surface)'
                                        }}
                                    >
                                        <Camera className="w-8 h-8 text-[var(--text-muted)]/30 mx-auto mb-2" />
                                        <p className="text-xs text-[var(--text-muted)]">No creations published yet</p>
                                    </div>
                                ) : (
                                    <div className="coll-masonry">
                                        {photos.map((photo, i) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                index={i}
                                                onSelect={onSelectPhoto}
                                                onLike={onLikePhoto}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Albums Grid */}
                        {activeTab === 'collections' && (
                            <div className="space-y-4">
                                {selectedCollection ? (
                                    <div>
                                        <button
                                            onClick={() => setSelectedCollection(null)}
                                            className="text-xs flex items-center gap-1 mb-4 font-semibold hover:underline"
                                            style={{ color: 'var(--text-gold)' }}
                                        >
                                            <ArrowLeft className="w-3 h-3" /> Back to Albums
                                        </button>
                                        <h4 className="text-sm font-bold mb-1">{selectedCollection.title}</h4>
                                        <p className="text-xs text-[var(--text-muted)] mb-4">{selectedCollection.description || 'No description'}</p>
                                        
                                        {isLoadingAlbumPhotos ? (
                                            <div className="flex justify-center py-12">
                                                <Loader2 className="w-6 h-6 text-[var(--text-gold)] animate-spin" />
                                            </div>
                                        ) : albumPhotos.length === 0 ? (
                                            <div
                                                className="py-12 text-center border-2 border-dashed rounded-[20px]"
                                                style={{
                                                    borderColor: 'var(--border-color)',
                                                    background: 'var(--bg-surface)'
                                                }}
                                            >
                                                <Camera className="w-8 h-8 text-[var(--text-muted)]/30 mx-auto mb-2" />
                                                <p className="text-xs text-[var(--text-muted)]">No photos in this album yet</p>
                                            </div>
                                        ) : (
                                            <div className="coll-masonry">
                                                {albumPhotos.map((photo, i) => (
                                                    <PhotoCard
                                                        key={photo.id}
                                                        photo={photo}
                                                        index={i}
                                                        onSelect={onSelectPhoto}
                                                        onLike={onLikePhoto}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : collections.length === 0 ? (
                                    <div
                                        className="py-16 text-center border-2 border-dashed rounded-[20px]"
                                        style={{
                                            borderColor: 'var(--border-color)',
                                            background: 'var(--bg-surface)'
                                        }}
                                    >
                                        <FolderHeart className="w-8 h-8 text-[var(--text-muted)]/30 mx-auto mb-2" />
                                        <p className="text-xs text-[var(--text-muted)]">No albums created yet</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {collections.map((col) => (
                                            <div
                                                key={col.id}
                                                onClick={() => setSelectedCollection(col)}
                                                className="rounded-[20px] overflow-hidden cursor-pointer hover:shadow-md transition-all group border"
                                                style={{
                                                    background: 'var(--bg-surface)',
                                                    borderColor: 'var(--border-color)'
                                                }}
                                            >
                                                <div className="aspect-square relative overflow-hidden bg-black/10">
                                                    {col.coverUrl || col.cover_url || col.cover_photo?.thumbnail_url ? (
                                                        <img src={col.coverUrl || col.cover_url || col.cover_photo?.thumbnail_url} alt={col.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]/40">
                                                            <Folder className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-white">
                                                        {col.itemCount ?? col.item_count ?? col.photo_count ?? 0} items
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <h4 className="text-xs font-bold truncate">{col.title}</h4>
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{col.description || 'No description'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showChat && (
                <ChatDrawer
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                    recipientId={userId}
                    recipientName={displayName}
                    recipientAvatar={stats?.avatarUrl}
                />
            )}
        </motion.div>,
        document.body
    );
}
