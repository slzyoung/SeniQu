/**
 * My Arts Page — Personal Collection Experience
 * Implements the premium aesthetic from the design mockup:
 * Art Stories hero, Today's Art Highlight horizontal scroll, and Masterpieces masonry.
 */

import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Send,
    Tag,
    Loader2,
    Image as ImageIcon,
    Plus,
    X,
} from 'lucide-react';
import { useOwnedArts, useCreatedArts, useUnlistArt } from '../../../../hooks/useArt';
import { useCreateArtwork, useDeleteArtwork } from '../../../../hooks/useArtist';
import { uploadFile } from '../../../../lib/api';
import './MyArtsPage.css';

// ============================================================
// HELPERS
// ============================================================

function getArtImage(art: any, fallback = '/placeholder-art.jpg'): string {
    if (!art) return fallback;
    const artwork = art.artwork || art;
    if (artwork.primaryImageUrl) return artwork.primaryImageUrl;
    if (artwork.primary_image_url) return artwork.primary_image_url;
    if (artwork.imageUrl) return artwork.imageUrl;
    let imgs = artwork.images;
    if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) {
        return typeof imgs[0] === 'string' ? imgs[0] : imgs[0]?.url || fallback;
    }
    return fallback;
}

const HERO_MOCKUP_IMAGE = 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80&auto=format';

// ============================================================
// MAIN COMPONENT
// ============================================================

// ============================================================
// CREATE ART MODAL (Bottom Sheet)
// ============================================================

function CreateArtModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const createArtwork = useCreateArtwork();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(selected);
    };

    const handleSubmit = async () => {
        if (!title || !file) return;
        try {
            setIsUploading(true);
            const uploadResult = await uploadFile(file, 'artworks');
            createArtwork.mutate({ title, description, images: [uploadResult.url], category: 'art' } as any, {
                onSuccess: () => { onClose(); setTitle(''); setDescription(''); setFile(null); setPreview(null); }
            });
        } catch (error: any) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full md:max-w-md md:mx-4 bg-white dark:bg-[#151515] md:rounded-2xl rounded-t-2xl md:rounded-b-2xl border-t md:border border-gray-200/60 dark:border-white/[0.08] shadow-2xl overflow-hidden" style={{ maxHeight: '92vh', animation: 'forum-fadeInUp 0.25s ease-out' }}>
                <div className="flex justify-center pt-3 pb-1 md:hidden"><div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/15" /></div>
                <div className="flex items-center justify-between px-5 pt-3 md:pt-5 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                    <div><h2 className="text-lg font-serif font-bold text-gray-900 dark:text-white">Add Artwork</h2><p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Upload your creation</p></div>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all"><X className="w-4 h-4" /></button>
                </div>
                <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: 'calc(92vh - 140px)' }}>
                    {preview ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200/50 dark:border-white/[0.06]">
                            <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                            <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-gray-400 dark:text-gray-500 hover:border-amber-400 dark:hover:border-gold/30 hover:text-amber-500 dark:hover:text-gold transition-all flex flex-col items-center justify-center gap-2">
                            <ImageIcon className="w-8 h-8" /><span className="text-sm font-medium">Tap to upload artwork</span><span className="text-[10px] text-gray-300 dark:text-gray-600">JPEG, PNG, GIF, WebP</span>
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <div><label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Title *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your artwork" className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-amber-500 dark:focus:border-gold transition-all text-sm outline-none" required /></div>
                    <div><label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-[0.1em]">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your artwork..." rows={3} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-amber-500 dark:focus:border-gold transition-all resize-none text-sm outline-none" /></div>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between bg-white dark:bg-[#151515]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={isUploading || createArtwork.isPending || !title || !file} className="px-6 py-2.5 rounded-full text-sm font-bold text-charcoal disabled:opacity-40 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #C9A84C, #B08D57)', boxShadow: '0 2px 12px rgba(201,168,76,0.3)' }}>{isUploading ? 'Uploading...' : createArtwork.isPending ? 'Creating...' : 'Create'}</button>
                </div>
            </div>
        </div>
    );
}

export function MyNFTsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'owned' | 'created'>('owned');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Queries
    const { data: ownedData, isLoading: ownedLoading } = useOwnedArts();
    const { data: createdData, isLoading: createdLoading } = useCreatedArts();

    // Mutations
    const unlistArt = useUnlistArt();
    const deleteArtwork = useDeleteArtwork();

    const handleDeleteArt = async (artId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this artwork? This cannot be undone.')) return;
        setDeletingId(artId);
        try { await deleteArtwork.mutateAsync(artId); } finally { setDeletingId(null); }
    };

    const ownedNFTs = ownedData?.data || [];
    const createdNFTs = createdData?.data || [];
    const isLoading = activeTab === 'owned' ? ownedLoading : createdLoading;
    const currentNFTs = activeTab === 'owned' ? ownedNFTs : createdNFTs;

    // Derived states
    const highlights = useMemo(() => {
        return currentNFTs.slice(0, 3);
    }, [currentNFTs]);

    const masterpieces = useMemo(() => {
        return currentNFTs.slice(3);
    }, [currentNFTs]);

    const handleList = (art: any, e: React.MouseEvent) => {
        e.stopPropagation();
        // Open list modal (mocked for now, assumes handled via contexts/modals normally)
        alert('List art triggered for: ' + art.id);
    };

    const handleUnlist = (artId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        unlistArt.mutate(artId);
    };

    const handleTransfer = (art: any, e: React.MouseEvent) => {
        e.stopPropagation();
        alert('Transfer art triggered for: ' + art.id);
    };

    return (
        <motion.div
            className="my-arts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* ====== TOP NAV (Optional, per mockup style) ====== */}
            <div className="my-arts__top-nav">
                <div className="my-arts__profile-pill">
                    <div className="my-arts__profile-avatar">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
                            alt="avatar"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <span className="my-arts__profile-name">My Studio</span>
                </div>
                {/* 
                // Settings/menu button removed to avoid redirect conflict, 
                // but kept the styling concept 
                <button className="my-arts__menu-btn">
                    <span style={{ fontSize: 18, lineHeight: 1 }}>≡</span>
                </button>
                */}
            </div>

            {/* ====== HERO: ART STORIES ====== */}
            <div className="my-arts__hero">
                <img
                    src={HERO_MOCKUP_IMAGE}
                    alt="Art Stories"
                    className="my-arts__hero-bg"
                />
                {/* Two side blurred panels per mockup vibe */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '25%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '25%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }} />

                {/* Central Title */}
                <div style={{ position: 'absolute', top: '15%', left: 0, width: '100%', textAlign: 'center', zIndex: 2 }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: 2, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        ART<br />STORIES
                    </h2>
                </div>

                <div className="my-arts__hero-glass">
                    <h1 className="my-arts__hero-title">Hello Art Lover</h1>
                    <p className="my-arts__hero-desc">
                        Explore your collected masterpieces, verified on the blockchain.
                        Your personal gallery awaits.
                    </p>
                    <button
                        className="my-arts__hero-btn"
                        onClick={() => navigate('/dashboard/marketplace')}
                    >
                        Explore Marketplace
                    </button>
                </div>
            </div>

            {/* ====== HEADER & TABS ====== */}
            <div className="my-arts__section">
                <div className="my-arts__tabs">
                    <button
                        className={`my-arts__tab ${activeTab === 'owned' ? 'my-arts__tab--active' : ''}`}
                        onClick={() => setActiveTab('owned')}
                    >
                        Owned Masterpieces
                    </button>
                    <button
                        className={`my-arts__tab ${activeTab === 'created' ? 'my-arts__tab--active' : ''}`}
                        onClick={() => setActiveTab('created')}
                    >
                        Created by Me
                    </button>
                    {activeTab === 'created' && (
                        <button
                            className="my-arts__tab my-arts__tab--active"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg, #C9A84C, #B08D57)', color: '#1a1a1a', borderColor: '#C9A84C' }}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus style={{ width: 14, height: 14 }} /> Add
                        </button>
                    )}
                </div>
            </div>

            {/* ====== LOADING / EMPTY ====== */}
            {isLoading ? (
                <div className="my-arts-loader">
                    <Loader2 />
                </div>
            ) : currentNFTs.length === 0 ? (
                <div className="my-arts__section">
                    <div className="my-arts__empty">
                        <ImageIcon className="my-arts__empty-icon" />
                        <h3 className="my-arts__empty-title">Gallery is Empty</h3>
                        <p className="my-arts__empty-text">
                            {activeTab === 'owned'
                                ? 'You haven\'t collected any artworks yet. Visit the marketplace to start your collection.'
                                : 'You haven\'t created any artworks yet.'}
                        </p>
                        {activeTab === 'owned' && (
                            <button
                                className="my-arts__action-btn my-arts__action-btn--primary"
                                style={{ padding: '12px 24px', fontSize: 14, width: 'auto' }}
                                onClick={() => navigate('/dashboard/marketplace')}
                            >
                                Browse Marketplace
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* ====== TODAY'S HIGHLIGHT ====== */}
                    {highlights.length > 0 && (
                        <div className="my-arts__section">
                            <div className="my-arts__section-header">
                                <h2 className="my-arts__section-title">
                                    Today's Art<br />Highlight
                                </h2>
                                {/* Decorative elements could go here */}
                            </div>
                            <div className="my-arts__highlights">
                                {highlights.map((art: any, i: number) => {
                                    const artwork = art.artwork || art;
                                    return (
                                        <div
                                            key={art.id}
                                            className="my-arts__highlight-card my-arts__fade-in"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                            onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                        >
                                            <img
                                                src={getArtImage(art)}
                                                alt={artwork.title}
                                                className="my-arts__highlight-img"
                                            />
                                            {art.isListed && (
                                                <span className="my-arts__badge my-arts__badge--listed">Listed</span>
                                            )}
                                            {!art.isListed && activeTab !== 'created' && (
                                                <span className="my-arts__badge">Collected</span>
                                            )}
                                            {/* Delete button for Created by Me */}
                                            {activeTab === 'created' && (
                                                <button
                                                    onClick={(e) => handleDeleteArt(art.id, e)}
                                                    disabled={deletingId === art.id}
                                                    style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5, transition: 'all 0.2s' }}
                                                >
                                                    {deletingId === art.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <X style={{ width: 14, height: 14 }} />}
                                                </button>
                                            )}
                                            <div className="my-arts__highlight-content">
                                                <h4 className="my-arts__highlight-title">{artwork.title || 'Untitled'}</h4>
                                                <p className="my-arts__highlight-subtitle">
                                                    by {art.creator?.displayName || artwork.artist?.displayName || 'Unknown Artist'}
                                                </p>

                                                {/* Actions */}
                                                <div className="my-arts__btn-group">
                                                    {art.isListed ? (
                                                        <button
                                                            className="my-arts__action-btn"
                                                            onClick={(e) => handleUnlist(art.id, e)}
                                                        >
                                                            Unlist
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="my-arts__action-btn my-arts__action-btn--primary"
                                                            onClick={(e) => handleList(art, e)}
                                                        >
                                                            <Tag style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> List
                                                        </button>
                                                    )}
                                                    <button
                                                        className="my-arts__action-btn"
                                                        onClick={(e) => handleTransfer(art, e)}
                                                    >
                                                        <Send style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Transfer
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ====== MASTERPIECES (MASONRY) ====== */}
                    {masterpieces.length > 0 && (
                        <div className="my-arts__section">
                            <div className="my-arts__section-header">
                                <h2 className="my-arts__section-title" style={{ fontSize: 24 }}>Masterpieces</h2>
                                <button className="my-arts__see-all">Explore all</button>
                            </div>

                            <div className="my-arts__masonry">
                                {masterpieces.map((art: any, i: number) => {
                                    const artwork = art.artwork || art;
                                    return (
                                        <div
                                            key={art.id}
                                            className="my-arts__masonry-item my-arts__fade-in"
                                            style={{ animationDelay: `${(i % 5) * 0.1}s` }}
                                            onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                        >
                                            <img
                                                src={getArtImage(art)}
                                                alt={artwork.title}
                                                className="my-arts__masonry-img"
                                                loading="lazy"
                                            />
                                            {art.isListed && (
                                                <span className="my-arts__badge my-arts__badge--listed" style={{ fontSize: 8, padding: '2px 6px' }}>Listed</span>
                                            )}
                                            {/* Delete button for Created by Me */}
                                            {activeTab === 'created' && (
                                                <button
                                                    onClick={(e) => handleDeleteArt(art.id, e)}
                                                    disabled={deletingId === art.id}
                                                    style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}
                                                >
                                                    {deletingId === art.id ? <Loader2 style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }} /> : <X style={{ width: 12, height: 12 }} />}
                                                </button>
                                            )}
                                            <div className="my-arts__masonry-overlay">
                                                <h4 className="my-arts__masonry-title">{artwork.title || 'Untitled'}</h4>

                                                <div className="my-arts__btn-group" style={{ marginTop: 4 }}>
                                                    {art.isListed ? (
                                                        <button
                                                            className="my-arts__action-btn"
                                                            onClick={(e) => handleUnlist(art.id, e)}
                                                        >
                                                            Unlist
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="my-arts__action-btn my-arts__action-btn--primary"
                                                            onClick={(e) => handleList(art, e)}
                                                        >
                                                            List
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
            {/* Create Art Modal */}
            <CreateArtModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
        </motion.div>
    );
}

export default MyNFTsPage;
