import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Heart, MessageCircle, ShoppingBag, Info,
    Camera, Aperture, Timer, Sun, MapPin, Download, Send,
    Loader2, Gavel, Check, Ban, AlertCircle, Coins
} from 'lucide-react';
import type { PhotoData } from './PhotoCard';
import { photosService } from '../../../../../services/photosService';
import { SolanaPurchaseModal } from './SolanaPurchaseModal';
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface Props {
    photo: PhotoData | null;
    onClose: () => void;
    onLike?: (photoId: string) => void;
    onViewProfile?: (userId: string) => void;
}

export function PhotoLightbox({ photo, onClose, onLike, onViewProfile }: Props) {
    const [showExif, setShowExif] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'offers'>('comments');
    const [commentText, setCommentText] = useState('');
    const [liked, setLiked] = useState(photo?.isLikedByMe || false);
    const [likeCount, setLikeCount] = useState(photo?.likesCount || 0);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    // Offers state
    const [offers, setOffers] = useState<any[]>([]);
    const [offersLoading, setOffersLoading] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [submittingOffer, setSubmittingOffer] = useState(false);
    const [offerError, setOfferError] = useState('');
    const [offerSuccess, setOfferSuccess] = useState(false);

    const { user, isAuthenticated } = useAuthStore();

    const isOwner = photo?.userId === user?.id;

    useEffect(() => {
        if (photo) {
            setLiked(photo.isLikedByMe || false);
            setLikeCount(photo.likesCount || 0);
            setActiveTab('comments');
        }
    }, [photo]);

    // Fetch comments
    useEffect(() => {
        if (photo?.id) {
            setCommentsLoading(true);
            photosService.getComments(photo.id)
                .then(setComments)
                .catch((err: any) => console.error('Error fetching comments:', err))
                .finally(() => setCommentsLoading(false));
        }
    }, [photo?.id]);

    // Fetch offers
    const fetchOffers = async () => {
        if (!photo?.id || !isAuthenticated) return;
        setOffersLoading(true);
        try {
            const data = await photosService.getOffers(photo.id);
            setOffers(data || []);
        } catch (err) {
            console.error('Error fetching offers:', err);
        } finally {
            setOffersLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
    }, [photo?.id, isAuthenticated]);

    if (!photo) return null;

    const handleLike = () => {
        setLiked(!liked);
        setLikeCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
        onLike?.(photo.id);
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || !photo.id) return;
        try {
            const newComment = await photosService.addComment(photo.id, commentText);
            setComments(prev => [...prev, newComment]);
            setCommentText('');
            photo.commentsCount = (photo.commentsCount || 0) + 1;
        } catch (err) {
            console.error('Error adding comment:', err);
        }
    };

    const handleMakeOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(offerAmount);
        if (!amount || amount <= 0 || !photo.id) return;

        setSubmittingOffer(true);
        setOfferError('');
        setOfferSuccess(false);

        try {
            const newOffer = await photosService.makeOffer(photo.id, amount, 'SOL');
            setOffers(prev => [newOffer, ...prev]);
            setOfferAmount('');
            setOfferSuccess(true);
            setTimeout(() => setOfferSuccess(false), 3000);
        } catch (err: any) {
            setOfferError(err?.response?.data?.message || 'Failed to place offer.');
        } finally {
            setSubmittingOffer(false);
        }
    };

    const handleUpdateOfferStatus = async (offerId: string, status: 'accepted' | 'rejected' | 'cancelled') => {
        try {
            await photosService.updateOfferStatus(offerId, status);
            fetchOffers();
        } catch (err) {
            console.error('Failed to update offer status:', err);
        }
    };

    const exifItems = [
        { icon: Camera, label: 'Camera', value: [photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ') || 'Unknown Make' },
        { icon: Aperture, label: 'Aperture', value: photo.aperture || 'f/2.8' },
        { icon: Timer, label: 'Shutter', value: photo.shutterSpeed || '1/250s' },
        { icon: Sun, label: 'ISO', value: photo.iso ? String(photo.iso) : '400' },
        { icon: MapPin, label: 'Location', value: photo.locationName || 'Unknown Location' },
    ];

    const handleDownload = async () => {
        if (photo.isForSale) {
            setCheckoutOpen(true);
            return;
        }

        try {
            const response = await fetch(photo.originalUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${photo.title.replace(/\s+/g, '_')}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            window.open(photo.originalUrl, '_blank');
        }
    };

    const authorAvatar = photo.user?.avatarUrl || photo.user?.avatar;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="photo-hub fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 md:p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-5xl h-full sm:h-[90vh] md:h-[80vh] bg-theme-bg border-0 sm:border border-theme-border rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        aria-label="Close details"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>

                    {/* Left Panel: Media Showcase */}
                    <div className="flex-1 bg-black flex items-center justify-center relative p-3 sm:p-6 h-[40vh] sm:h-[45vh] md:h-full shrink-0">
                        <img
                            src={photo.originalUrl}
                            alt={photo.title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            onDoubleClick={handleLike}
                        />

                        {/* Top bar over photo */}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <button
                                onClick={handleDownload}
                                className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                title="Download / Buy"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Social & Web3 Interactions */}
                    <div className="flex-1 md:w-[420px] md:max-w-[420px] border-t md:border-t-0 md:border-l border-theme-border flex flex-col bg-theme-surface overflow-hidden">
                        {/* Author info */}
                        <div className="p-4 border-b border-theme-border flex items-center gap-3">
                            {authorAvatar ? (
                                <img
                                    src={authorAvatar}
                                    alt={photo.user?.displayName || 'User'}
                                    className="w-10 h-10 rounded-full object-cover border border-gold/20 shrink-0 cursor-pointer"
                                    onClick={() => onViewProfile?.(photo.userId)}
                                />
                            ) : (
                                <div
                                    onClick={() => onViewProfile?.(photo.userId)}
                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center text-gold font-bold text-sm border border-gold/20 shrink-0 cursor-pointer"
                                >
                                    {photo.user?.displayName?.charAt(0) || '?'}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h4 className="font-serif font-bold text-theme-text text-sm truncate leading-tight">{photo.title}</h4>
                                <p
                                    onClick={() => onViewProfile?.(photo.userId)}
                                    className="text-theme-muted text-[11px] cursor-pointer hover:text-gold transition-colors truncate mt-0.5"
                                >
                                    @{photo.user?.displayName || 'Anonymous'}
                                </p>
                            </div>
                            <div className="text-right">
                                {photo.isForSale ? (
                                    <>
                                        <span className="text-[9px] text-theme-muted uppercase tracking-wider block font-bold">List Price</span>
                                        <span className="text-xs font-black text-gold flex items-center gap-0.5 justify-end mt-0.5">
                                            <Coins className="w-3.5 h-3.5" />
                                            {photo.price} SOL
                                        </span>
                                    </>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-theme-bg border border-theme-border text-[10px] text-theme-muted font-medium">
                                        Not Listed
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Description & EXIF Toggler */}
                        <div className="p-4 border-b border-theme-border space-y-2 max-h-36 overflow-y-auto shrink-0">
                            {photo.description && (
                                <p className="text-xs text-theme-text/80 leading-relaxed">{photo.description}</p>
                            )}

                            <button
                                onClick={() => setShowExif(!showExif)}
                                className="flex items-center gap-1 text-[10px] font-bold text-gold hover:underline"
                            >
                                <Info className="w-3.5 h-3.5" />
                                {showExif ? 'Hide Technical Metadata' : 'Show Technical Metadata'}
                            </button>

                            {/* EXIF details */}
                            <AnimatePresence>
                                {showExif && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-theme-border/50">
                                            {exifItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <item.icon className="w-3.5 h-3.5 text-theme-muted shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="text-[9px] text-theme-muted uppercase block leading-none">{item.label}</span>
                                                        <span className="text-[11px] font-semibold text-theme-text truncate block mt-0.5">{item.value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Social Buttons */}
                        <div className="px-4 py-2 border-b border-theme-border bg-theme-bg/10 flex items-center gap-4 shrink-0">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleLike}
                                className="flex items-center gap-1.5 text-xs font-semibold"
                            >
                                <Heart className={`w-4 h-4 transition-all ${liked ? 'text-red-500 fill-red-500' : 'text-theme-muted'}`} />
                                <span className="text-theme-text">{likeCount}</span>
                            </motion.button>

                            <button className="flex items-center gap-1.5 text-xs font-semibold text-theme-muted">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-theme-text">{comments.length}</span>
                            </button>
                        </div>

                        {/* Tabs: Comments vs Offers */}
                        <div className="flex border-b border-theme-border text-center shrink-0">
                            <button
                                onClick={() => setActiveTab('comments')}
                                className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'comments' ? 'border-gold text-theme-text' : 'border-transparent text-theme-muted'}`}
                            >
                                Comments
                            </button>
                            <button
                                onClick={() => setActiveTab('offers')}
                                className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'offers' ? 'border-gold text-theme-text' : 'border-transparent text-theme-muted'}`}
                            >
                                Offers ({offers.length})
                            </button>
                        </div>

                        {/* Interactive Content area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {activeTab === 'comments' ? (
                                <>
                                    {commentsLoading ? (
                                        <div className="py-8 flex justify-center">
                                            <Loader2 className="w-5 h-5 text-gold animate-spin" />
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="text-center py-8">
                                            <MessageCircle className="w-8 h-8 text-theme-muted opacity-30 mx-auto mb-2" />
                                            <p className="text-xs text-theme-muted font-medium">No comments yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {comments.map((comment) => {
                                                const commentAvatar = comment.user?.avatarUrl || comment.user?.avatar || comment.user?.avatar_url;
                                                return (
                                                    <div key={comment.id} className="flex gap-2.5 text-xs leading-relaxed">
                                                        {commentAvatar ? (
                                                            <img
                                                                src={commentAvatar}
                                                                alt={comment.user?.displayName || 'User'}
                                                                className="w-7 h-7 rounded-full object-cover border border-theme-border shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-theme-bg flex items-center justify-center text-gold font-bold text-[10px] border border-theme-border shrink-0">
                                                                {comment.user?.displayName?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p>
                                                                <span className="font-bold text-theme-text mr-1.5">@{comment.user?.displayName || 'User'}</span>
                                                                <span className="text-theme-text/85">{comment.content}</span>
                                                            </p>
                                                            <span className="text-[9px] text-theme-muted block mt-0.5">
                                                                {new Date(comment.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Web3 Negotiation & Offer placement - SHOWN FOR ALL PHOTO Hub listings */}
                                    {isAuthenticated ? (
                                        !isOwner && (
                                            <form onSubmit={handleMakeOffer} className="space-y-2.5 bg-theme-bg/40 p-3.5 rounded-xl border border-theme-border/60">
                                                <p className="text-[11px] font-bold text-theme-text flex items-center gap-1.5">
                                                    <Gavel className="w-3.5 h-3.5 text-gold" />
                                                    {!photo.isForSale ? 'Propose Purchase Offer in SOL' : 'Make an Offer in SOL'}
                                                </p>
                                                
                                                {!photo.isForSale && (
                                                    <p className="text-[10px] text-theme-muted leading-tight">
                                                        This creation is currently not marked for sale, but you can send a bid to purchase a license.
                                                    </p>
                                                )}
                                                
                                                {offerError && (
                                                    <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[10px] flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                                        <span>{offerError}</span>
                                                    </div>
                                                )}

                                                {offerSuccess && (
                                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px]">
                                                        Offer submitted successfully!
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-theme-muted">SOL</span>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            min="0.001"
                                                            value={offerAmount}
                                                            onChange={e => setOfferAmount(e.target.value)}
                                                            placeholder="0.05"
                                                            className="w-full pl-11 pr-3 py-2 rounded-lg bg-theme-surface border border-theme-border text-xs text-theme-text outline-none focus:border-gold"
                                                        />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={submittingOffer || !offerAmount}
                                                        className="px-4 py-2 rounded-lg bg-gold text-[#1a1a1a] font-bold text-xs hover:bg-gold-dark transition-all disabled:opacity-40"
                                                    >
                                                        {submittingOffer ? 'Sending...' : 'Place Offer'}
                                                    </button>
                                                </div>
                                            </form>
                                        )
                                    ) : (
                                        <div className="p-3 bg-theme-bg/50 border border-theme-border rounded-xl text-center">
                                            <p className="text-xs text-theme-muted font-medium">Please sign in to place offers on collections.</p>
                                        </div>
                                    )}

                                    {/* Offers List */}
                                    {offersLoading ? (
                                        <div className="py-6 flex justify-center">
                                            <Loader2 className="w-5 h-5 text-gold animate-spin" />
                                        </div>
                                    ) : offers.length === 0 ? (
                                        <div className="text-center py-6">
                                            <Gavel className="w-7 h-7 text-theme-muted opacity-30 mx-auto mb-1.5" />
                                            <p className="text-xs text-theme-muted font-medium">No active offers yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {offers.map((offer) => {
                                                const isOfferBuyer = offer.buyer_id === user?.id;
                                                const offerAvatar = offer.users?.avatar_url || offer.users?.avatar;
                                                return (
                                                    <div key={offer.id} className="p-3 bg-theme-bg/20 border border-theme-border/50 rounded-xl flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            {offerAvatar ? (
                                                                <img
                                                                    src={offerAvatar}
                                                                    alt={offer.users?.display_name || 'User'}
                                                                    className="w-8 h-8 rounded-full object-cover border border-theme-border shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center text-gold font-bold text-xs border border-theme-border shrink-0">
                                                                    {offer.users?.display_name?.charAt(0) || 'U'}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-xs text-theme-text truncate">
                                                                        @{offer.users?.display_name || 'User'}
                                                                    </span>
                                                                    {isOfferBuyer && (
                                                                        <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-[9px] font-medium">You</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="text-xs font-black text-gold">
                                                                        {offer.amount} SOL
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                                        offer.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                        offer.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                                                        offer.status === 'cancelled' ? 'bg-theme-bg border border-theme-border text-theme-muted' :
                                                                        'bg-gold/10 text-gold'
                                                                    }`}>
                                                                        {offer.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        {offer.status === 'pending' && (
                                                            <div className="flex gap-1 shrink-0">
                                                                {isOwner ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleUpdateOfferStatus(offer.id, 'accepted')}
                                                                            className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                                                            title="Accept Offer"
                                                                        >
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUpdateOfferStatus(offer.id, 'rejected')}
                                                                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                                            title="Reject Offer"
                                                                        >
                                                                            <Ban className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    isOfferBuyer && (
                                                                        <button
                                                                            onClick={() => handleUpdateOfferStatus(offer.id, 'cancelled')}
                                                                            className="px-2.5 py-1 rounded bg-theme-bg border border-theme-border hover:bg-theme-surface text-theme-muted text-[10px] font-bold transition-all"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Interactive Footer (Add Comment / Purchase Trigger) */}
                        <div className="p-4 border-t border-theme-border bg-theme-bg/10 shrink-0">
                            {activeTab === 'comments' ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-xs text-theme-text placeholder-theme-muted outline-none focus:border-gold"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim()}
                                        className="p-2 rounded-xl bg-gold text-[#1a1a1a] hover:bg-gold-dark transition-all disabled:opacity-40 shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                photo.isForSale ? (
                                    <button
                                        onClick={() => setCheckoutOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gold text-[#1a1a1a] font-bold text-xs hover:bg-gold-dark transition-all shadow-md shadow-gold/10"
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                        Buy Instantly for {photo.price} SOL
                                    </button>
                                ) : (
                                    <div className="text-center text-xs text-theme-muted py-2">
                                        This photo is only open to negotiation offers.
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            <SolanaPurchaseModal
                isOpen={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                photo={photo}
                onPurchaseSuccess={() => {
                    photo.downloadsCount = (photo.downloadsCount || 0) + 1;
                }}
            />
        </AnimatePresence>
    );
}
