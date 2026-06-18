/**
 * RequestBoard — Photography Requests & Editing Commissions
 * Allows users to request specific photography/editing work, and photographers to submit offers/submissions
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, DollarSign, Calendar, Plus, X, Sparkles, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { photosService, type PhotoRequest, type PhotoRequestSubmission } from '../../../../../services/photosService';
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface Props {
    isAuthenticated: boolean;
}

export function RequestBoard({ isAuthenticated }: Props) {
    const [requests, setRequests] = useState<PhotoRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PhotoRequest | null>(null);
    const [submissions, setSubmissions] = useState<PhotoRequestSubmission[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);

    // Create Request form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
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
                deadline || undefined
            );
            setTitle('');
            setDescription('');
            setBudget('');
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

    return (
        <div className="space-y-6">
            {/* Header info card */}
            <div className="bg-gradient-to-br from-gold/15 to-purple/5 border border-gold/20 rounded-3xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Sparkles className="w-20 h-20 text-gold" />
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-gold" />
                    Photography & Editing Commissions
                </h3>
                <p className="text-xs text-theme-muted mt-1.5 leading-relaxed">
                    Post custom photography requests, local landmarks wishlist, or photo editing jobs. Photographers can respond directly with custom quotes or portfolios.
                </p>

                {isAuthenticated && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-charcoal text-xs font-bold hover:shadow-lg hover:shadow-gold/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Create Request
                    </button>
                )}
            </div>

            {/* Requests board list */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    <p className="text-sm text-theme-muted">Loading requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-theme-border/30 rounded-3xl">
                    <MessageSquare className="w-10 h-10 text-theme-muted/20 mx-auto mb-2" />
                    <p className="text-sm text-theme-muted">No open requests right now</p>
                    <p className="text-xs text-theme-muted/50 mt-1">Be the first to post a request!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            onClick={() => handleSelectRequest(req)}
                            className="p-4 bg-theme-surface/60 border border-theme-border/50 hover:border-gold/30 rounded-2xl cursor-pointer transition-all flex justify-between items-start gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white truncate">{req.title}</h4>
                                <p className="text-xs text-theme-muted mt-1 line-clamp-2">{req.description}</p>
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-theme-muted font-medium">
                                    {req.budget && (
                                        <span className="flex items-center gap-0.5 text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/10">
                                            <DollarSign className="w-3 h-3" />
                                            Rp {req.budget.toLocaleString()}
                                        </span>
                                    )}
                                    {req.deadline && (
                                        <span className="flex items-center gap-0.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(req.deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-white/40">by @{req.users?.displayName || 'User'}</span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-theme-muted flex-shrink-0 mt-1" />
                        </div>
                    ))}
                </div>
            )}

            {/* Request Detail Panel (Slide-up modal on mobile) */}
            <AnimatePresence>
                {selectedRequest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex justify-end"
                        onClick={() => setSelectedRequest(null)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="w-full max-w-lg bg-theme-background h-[90vh] mt-[10vh] rounded-t-[32px] border-t border-theme-border/50 flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Panel Header */}
                            <div className="px-5 py-4 border-b border-theme-border/30 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white">Request details</h3>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                                <div>
                                    <h4 className="text-base font-bold text-white">{selectedRequest.title}</h4>
                                    <p className="text-xs text-theme-muted/50 mt-1">Requested by @{selectedRequest.users?.displayName}</p>
                                    <p className="text-sm text-white/90 mt-3 whitespace-pre-wrap leading-relaxed">{selectedRequest.description}</p>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-semibold">
                                    {selectedRequest.budget && (
                                        <div>
                                            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-0.5">Budget</p>
                                            <p className="text-gold text-sm font-bold">Rp {selectedRequest.budget.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {selectedRequest.deadline && (
                                        <div>
                                            <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-0.5">Deadline</p>
                                            <p className="text-white text-sm">{new Date(selectedRequest.deadline).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Proposals section */}
                                <div className="border-t border-theme-border/30 pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className="text-sm font-bold text-white">Responses & submissions</h5>
                                        {isAuthenticated && selectedRequest.userId !== useAuthStore.getState().user?.id && (
                                            <button
                                                onClick={handleOpenSubmitProposal}
                                                className="text-xs font-bold text-gold hover:underline"
                                            >
                                                Submit Offer
                                            </button>
                                        )}
                                    </div>

                                    {!isAuthenticated ? (
                                        <p className="text-xs text-theme-muted py-4 text-center">Please log in to see responses.</p>
                                    ) : submissionsLoading ? (
                                        <div className="py-6 flex justify-center">
                                            <Loader2 className="w-5 h-5 text-gold animate-spin" />
                                        </div>
                                    ) : submissions.length === 0 ? (
                                        <p className="text-xs text-theme-muted py-6 text-center border border-dashed border-theme-border/20 rounded-2xl">
                                            No responses submitted yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {submissions.map((sub) => (
                                                <div key={sub.id} className="p-4 bg-theme-surface/40 border border-theme-border/30 rounded-2xl space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-white">@{sub.users?.displayName}</span>
                                                        {sub.price && (
                                                            <span className="text-xs font-bold text-gold">Rp {sub.price.toLocaleString()}</span>
                                                        )}
                                                    </div>
                                                    {sub.message && (
                                                        <p className="text-xs text-theme-muted leading-relaxed">{sub.message}</p>
                                                    )}
                                                    {sub.photos && (
                                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10">
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
                        className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="w-full max-w-md bg-theme-background border border-theme-border/50 rounded-3xl p-6 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold text-white mb-4">Post custom request</h3>

                            <form onSubmit={handleCreateRequest} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-theme-muted mb-1.5">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Jakarta street architecture photoshoot"
                                        className="w-full bg-theme-surface/50 border border-theme-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-gold/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-theme-muted mb-1.5">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Detail your requirements: location, style, deadline, deliverables..."
                                        rows={4}
                                        className="w-full bg-theme-surface/50 border border-theme-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-gold/50 resize-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-theme-muted mb-1.5">Budget (Rp)</label>
                                        <input
                                            type="number"
                                            value={budget}
                                            onChange={e => setBudget(e.target.value)}
                                            placeholder="e.g. 500000"
                                            className="w-full bg-theme-surface/50 border border-theme-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-gold/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-theme-muted mb-1.5">Deadline</label>
                                        <input
                                            type="date"
                                            value={deadline}
                                            onChange={e => setDeadline(e.target.value)}
                                            className="w-full bg-theme-surface/50 border border-theme-border/30 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-gold/50"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingRequest}
                                    className="w-full mt-4 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gold text-charcoal font-bold text-sm hover:shadow-lg hover:shadow-gold/25 transition-all disabled:opacity-50"
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

            {/* Submit Proposal/Offer Modal */}
            <AnimatePresence>
                {showSubmitProposalModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSubmitProposalModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="w-full max-w-md bg-theme-background border border-theme-border/50 rounded-3xl p-6 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowSubmitProposalModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-base font-bold text-white mb-4">Submit proposal</h3>

                            <form onSubmit={handleSubmitProposal} className="space-y-4">
                                {myPhotos.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-theme-muted mb-1.5">Select photo to attach</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 pr-1">
                                            {myPhotos.map((photo) => {
                                                const isSelected = selectedPhotoId === photo.id;
                                                return (
                                                    <div
                                                        key={photo.id}
                                                        onClick={() => setSelectedPhotoId(photo.id)}
                                                        className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 relative transition-all ${
                                                            isSelected ? 'border-gold scale-95' : 'border-transparent'
                                                        }`}
                                                    >
                                                        <img
                                                            src={photo.thumbnailUrl || photo.originalUrl}
                                                            alt={photo.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-charcoal/20 flex items-center justify-center">
                                                                <CheckCircle2 className="w-4 h-4 text-gold fill-charcoal" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-theme-muted mb-1.5">Message / proposal</label>
                                    <textarea
                                        value={submissionMessage}
                                        onChange={e => setSubmissionMessage(e.target.value)}
                                        placeholder="Explain your approach, why you're a good fit, or details about the attached work..."
                                        rows={3}
                                        className="w-full bg-theme-surface/50 border border-theme-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-gold/50 resize-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-theme-muted mb-1.5">Proposed Price (Rp)</label>
                                    <input
                                        type="number"
                                        value={submissionPrice}
                                        onChange={e => setSubmissionPrice(e.target.value)}
                                        placeholder="e.g. 450000"
                                        className="w-full bg-theme-surface/50 border border-theme-border/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-gold/50"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingProposal}
                                    className="w-full mt-4 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gold text-charcoal font-bold text-sm hover:shadow-lg hover:shadow-gold/25 transition-all disabled:opacity-50"
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
        </div>
    );
}
