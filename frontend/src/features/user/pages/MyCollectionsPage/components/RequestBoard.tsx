/**
 * RequestBoard — Photography Requests & Editing Commissions
 * 
 * Premium modern design supporting:
 * - Full Light / Dark mode responsiveness using theme tokens
 * - Multi-currency support (SOL / IDR / USD)
 * - Seamless E2E encrypted direct messaging between client and photographer
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, Calendar, Plus, X, CheckCircle2,
    ChevronRight, Loader2, Coins, Wallet, Globe
} from 'lucide-react';
import { photosService, type PhotoRequest, type PhotoRequestSubmission } from '../../../../../services/photosService';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { ChatDrawer } from './ChatDrawer';

interface Props {
    isAuthenticated: boolean;
}

export function RequestBoard({}: Props) {
    const { user, isAuthenticated } = useAuthStore();
    const [requests, setRequests] = useState<PhotoRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PhotoRequest | null>(null);
    const [submissions, setSubmissions] = useState<PhotoRequestSubmission[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);

    // Chat states
    const [activeChatUser, setActiveChatUser] = useState<{
        id: string;
        name: string;
        avatar?: string;
    } | null>(null);

    // Create Request form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
    const [currency, setCurrency] = useState('IDR');
    const [deadline, setDeadline] = useState('');
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

    // Submit Proposal form state
    const [showSubmitProposalModal, setShowSubmitProposalModal] = useState(false);
    const [submissionMessage, setSubmissionMessage] = useState('');
    const [submissionPrice, setSubmissionPrice] = useState('');
    const [myPhotos, setMyPhotos] = useState<any[]>([]);
    const [selectedPhotoId, setSelectedPhotoId] = useState<string>('');
    const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const res = await photosService.getRequests();
            setRequests(res);
        } catch (err) {
            console.error('Failed to load requests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleSelectRequest = async (req: PhotoRequest) => {
        setSelectedRequest(req);
        if (isAuthenticated) {
            setSubmissionsLoading(true);
            try {
                const subs = await photosService.getSubmissions(req.id);
                setSubmissions(subs);
            } catch (err) {
                console.error('Failed to load submissions:', err);
            } finally {
                setSubmissionsLoading(false);
            }
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        setIsSubmittingRequest(true);
        try {
            await photosService.createRequest(
                title,
                description,
                budget ? parseFloat(budget) : undefined,
                currency,
                deadline || undefined
            );
            setTitle('');
            setDescription('');
            setBudget('');
            setCurrency('IDR');
            setDeadline('');
            setShowCreateModal(false);
            loadRequests();
        } catch (err) {
            console.error('Failed to create request:', err);
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    const handleOpenSubmitProposal = async () => {
        setShowSubmitProposalModal(true);
        try {
            const photosRes = await photosService.getMyPhotos(1, 20);
            setMyPhotos(photosRes.data);
            if (photosRes.data.length > 0) {
                setSelectedPhotoId(photosRes.data[0].id);
            }
        } catch (err) {
            console.error('Failed to load my photos for proposal:', err);
        }
    };

    const handleSubmitProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;

        setIsSubmittingProposal(true);
        try {
            await photosService.createSubmission(selectedRequest.id, {
                photoId: selectedPhotoId || undefined,
                message: submissionMessage || undefined,
                price: submissionPrice ? parseFloat(submissionPrice) : undefined
            });

            setSubmissionMessage('');
            setSubmissionPrice('');
            setShowSubmitProposalModal(false);

            // Reload submissions
            const subs = await photosService.getSubmissions(selectedRequest.id);
            setSubmissions(subs);
        } catch (err) {
            console.error('Failed to submit proposal:', err);
        } finally {
            setIsSubmittingProposal(false);
        }
    };

    const formatBudget = (amount?: number, curr?: string) => {
        if (amount === undefined || amount === null) return 'Open Budget';
        const c = curr || 'IDR';
        if (c === 'SOL') return `${amount} SOL`;
        if (c === 'USD') return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        return `Rp ${amount.toLocaleString()}`;
    };

    const getCurrencySymbol = (c: string) => {
        if (c === 'SOL') return 'SOL';
        if (c === 'USD') return '$';
        return 'Rp';
    };

    return (
        <div className="space-y-6">
            {/* Header info card */}
            <div
                className="relative overflow-hidden rounded-[24px] p-6 border transition-all"
                style={{
                    background: 'var(--glow-gold)',
                    borderColor: 'var(--glass-border)',
                    boxShadow: 'var(--ph-shadow-sm)'
                }}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <MessageSquare className="w-24 h-24" style={{ color: 'var(--text-gold)' }} />
                </div>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <MessageSquare className="w-4 h-4" style={{ color: 'var(--text-gold)' }} />
                    Photography & Editing Requests
                </h3>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Post a detailed brief for local photoshoot sessions, custom heritage research, landmarks wishlist, or specialized editing tasks. Photographers will respond directly with quotes and sample portfolios.
                </p>

                {isAuthenticated && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(135deg, var(--text-gold), #b8963f)',
                            color: '#0D0D0D',
                            boxShadow: '0 4px 14px rgba(201,168,76,0.2)'
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Create Request
                    </button>
                )}
            </div>

            {/* Requests board list */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-gold)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div
                    className="py-16 text-center border-2 border-dashed rounded-[24px]"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-25" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No open requests right now</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Be the first to post a custom brief!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            onClick={() => handleSelectRequest(req)}
                            className="p-4 rounded-[20px] border transition-all cursor-pointer flex justify-between items-start gap-4 hover:translate-y-[-1px]"
                            style={{
                                background: 'var(--bg-surface)',
                                borderColor: 'var(--border-color)',
                                boxShadow: 'var(--ph-shadow-sm)'
                            }}
                        >
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                    {req.title}
                                </h4>
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                    {req.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] font-semibold">
                                    <span
                                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border"
                                        style={{
                                            color: 'var(--text-gold)',
                                            background: 'var(--glow-gold)',
                                            borderColor: 'var(--glass-border)'
                                        }}
                                    >
                                        {req.currency === 'SOL' ? (
                                            <Coins className="w-3 h-3" />
                                        ) : req.currency === 'USD' ? (
                                            <Globe className="w-3 h-3" />
                                        ) : (
                                            <Wallet className="w-3 h-3" />
                                        )}
                                        {formatBudget(req.budget, req.currency)}
                                    </span>
                                    {req.deadline && (
                                        <span
                                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border"
                                            style={{
                                                color: 'var(--text-primary)',
                                                background: 'var(--bg-elevated)',
                                                borderColor: 'var(--border-color)'
                                            }}
                                        >
                                            <Calendar className="w-3 h-3" />
                                            {new Date(req.deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        by @{req.users?.displayName || 'User'}
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    ))}
                </div>
            )}

            {/* Request Detail Panel */}
            <AnimatePresence>
                {selectedRequest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex justify-end"
                        style={{ background: 'var(--overlay)', backdropFilter: 'blur(8px)' }}
                        onClick={() => setSelectedRequest(null)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                            className="w-full max-w-lg h-full flex flex-col shadow-2xl"
                            style={{
                                background: 'var(--bg-primary)',
                                borderLeft: '1px solid var(--border-color)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Panel Header */}
                            <div
                                className="px-5 py-4 flex items-center justify-between"
                                style={{ borderBottom: '1px solid var(--border-color)' }}
                            >
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Request Details</h3>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-1.5 rounded-full transition-all"
                                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                                <div>
                                    <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {selectedRequest.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            Requested by @{selectedRequest.users?.displayName}
                                        </p>
                                        {isAuthenticated && selectedRequest.userId !== user?.id && (
                                            <button
                                                onClick={() => setActiveChatUser({
                                                    id: selectedRequest.userId,
                                                    name: selectedRequest.users?.displayName || 'Client',
                                                    avatar: selectedRequest.users?.avatarUrl
                                                })}
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
                                                style={{
                                                    background: 'var(--glow-gold)',
                                                    color: 'var(--text-gold)',
                                                    border: '1px solid var(--glass-border)'
                                                }}
                                            >
                                                Chat with Client
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm mt-4 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                        {selectedRequest.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-6">
                                    {selectedRequest.budget && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Budget</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-gold)' }}>
                                                {formatBudget(selectedRequest.budget, selectedRequest.currency)}
                                            </p>
                                        </div>
                                    )}
                                    {selectedRequest.deadline && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {new Date(selectedRequest.deadline).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Proposals section */}
                                <div className="pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Responses & submissions</h5>
                                        {isAuthenticated && selectedRequest.userId !== user?.id && (
                                            <button
                                                onClick={handleOpenSubmitProposal}
                                                className="text-xs font-bold hover:underline"
                                                style={{ color: 'var(--text-gold)' }}
                                            >
                                                Submit Offer
                                            </button>
                                        )}
                                    </div>

                                    {!isAuthenticated ? (
                                        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                                            Please log in to see responses.
                                        </p>
                                    ) : submissionsLoading ? (
                                        <div className="py-6 flex justify-center">
                                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-gold)' }} />
                                        </div>
                                    ) : submissions.length === 0 ? (
                                        <p className="text-xs py-6 text-center border border-dashed rounded-2xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
                                            No responses submitted yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {submissions.map((sub) => (
                                                <div
                                                    key={sub.id}
                                                    className="p-4 rounded-2xl border space-y-3"
                                                    style={{
                                                        background: 'var(--bg-surface)',
                                                        borderColor: 'var(--border-color)'
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                @{sub.users?.displayName}
                                                            </span>
                                                            {selectedRequest.userId === user?.id && (
                                                                <button
                                                                    onClick={() => setActiveChatUser({
                                                                        id: sub.userId,
                                                                        name: sub.users?.displayName || 'Photographer',
                                                                        avatar: sub.users?.avatarUrl
                                                                    })}
                                                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
                                                                    style={{
                                                                        background: 'var(--glow-gold)',
                                                                        color: 'var(--text-gold)',
                                                                        border: '1px solid var(--glass-border)'
                                                                    }}
                                                                >
                                                                    Chat
                                                                </button>
                                                            )}
                                                        </div>
                                                        {sub.price && (
                                                            <span className="text-xs font-bold" style={{ color: 'var(--text-gold)' }}>
                                                                {formatBudget(sub.price, selectedRequest.currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {sub.message && (
                                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                                            {sub.message}
                                                        </p>
                                                    )}
                                                    {sub.photos && (
                                                        <div className="relative aspect-video rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                                                            <img
                                                                src={sub.photos.thumbnailUrl || sub.photos.originalUrl}
                                                                alt="Submission sample"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Request Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'var(--overlay)', backdropFilter: 'blur(8px)' }}
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="w-full max-w-md p-6 rounded-3xl border relative overflow-hidden"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-color)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full transition-all"
                                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                              >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Post Custom Request</h3>

                            <form onSubmit={handleCreateRequest} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Jakarta street architecture photoshoot"
                                        className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Detail requirements: location, preferred style, deliverables..."
                                        rows={4}
                                        className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border resize-none"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Currency</label>
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border cursor-pointer"
                                            style={{
                                                background: 'var(--bg-surface)',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <option value="IDR">IDR (Rupiah)</option>
                                            <option value="USD">USD (Dollar)</option>
                                            <option value="SOL">Solana (SOL)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Budget ({getCurrencySymbol(currency)})</label>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={e => setBudget(e.target.value)}
                                            placeholder="e.g. 500000"
                                            className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border"
                                            style={{
                                                background: 'var(--bg-surface)',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Deadline</label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingRequest}
                                    className="w-full mt-4 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01]"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--text-gold), #b8963f)',
                                        color: '#0D0D0D',
                                        boxShadow: '0 4px 16px rgba(201,168,76,0.3)'
                                    }}
                                >
                                    {isSubmittingRequest ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Submit Request'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Proposal Modal */}
            <AnimatePresence>
                {showSubmitProposalModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'var(--overlay)', backdropFilter: 'blur(8px)' }}
                        onClick={() => setShowSubmitProposalModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="w-full max-w-md p-6 rounded-3xl border relative overflow-hidden"
                            style={{
                                background: 'var(--bg-primary)',
                                borderColor: 'var(--border-color)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowSubmitProposalModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full transition-all"
                                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Submit Proposal</h3>

                            <form onSubmit={handleSubmitProposal} className="space-y-4">
                                {myPhotos.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Attach photo from library</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 pr-1 hide-scrollbar">
                                            {myPhotos.map((photo) => {
                                                const isSelected = selectedPhotoId === photo.id;
                                                return (
                                                    <div
                                                        key={photo.id}
                                                        onClick={() => setSelectedPhotoId(photo.id)}
                                                        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 relative transition-all"
                                                        style={{
                                                            borderColor: isSelected ? 'var(--text-gold)' : 'transparent',
                                                            transform: isSelected ? 'scale(0.95)' : 'none'
                                                        }}
                                                    >
                                                        <img
                                                            src={photo.thumbnailUrl || photo.originalUrl}
                                                            alt={photo.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                <CheckCircle2 className="w-4 h-4 text-gold" style={{ color: 'var(--text-gold)' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>Message / Proposal Brief</label>
                                    <textarea
                                        value={submissionMessage}
                                        onChange={e => setSubmissionMessage(e.target.value)}
                                        placeholder="Explain why you're a good fit, or details about the attached work..."
                                        rows={3}
                                        className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border resize-none"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                        Proposed Price ({selectedRequest ? getCurrencySymbol(selectedRequest.currency) : ''})
                                    </label>
                                    <input
                                        type="number"
                                        value={submissionPrice}
                                        onChange={e => setSubmissionPrice(e.target.value)}
                                        placeholder="e.g. 450000"
                                        className="w-full text-sm outline-none px-4 py-2.5 rounded-xl border"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingProposal}
                                    className="w-full mt-4 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01]"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--text-gold), #b8963f)',
                                        color: '#0D0D0D',
                                        boxShadow: '0 4px 16px rgba(201,168,76,0.3)'
                                    }}
                                >
                                    {isSubmittingProposal ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Submit Proposal'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Drawer */}
            {activeChatUser && (
                <ChatDrawer
                    isOpen={!!activeChatUser}
                    onClose={() => setActiveChatUser(null)}
                    recipientId={activeChatUser.id}
                    recipientName={activeChatUser.name}
                    recipientAvatar={activeChatUser.avatar}
                />
            )}
        </div>
    );
}
