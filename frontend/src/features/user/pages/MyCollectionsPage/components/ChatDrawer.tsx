/**
 * ChatDrawer — Premium In-App Messaging UI
 * 
 * Secure E2E encrypted chat between users and photographers
 * Features:
 * - Glassmorphic slide-up drawer
 * - Real-time message display with decryption
 * - Anti-scam reporting & blocking
 * - Light/dark mode seamless support
 * - Typing indicator + message status
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Send, Shield, AlertTriangle, Ban, Loader2,
    Lock, MoreVertical, Flag, CheckCheck, Check
} from 'lucide-react';
import { messagingService, type Message } from '../../../../../services/messagingService';
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface Props {
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ChatDrawer({ recipientId, recipientName, recipientAvatar, isOpen, onClose }: Props) {
    const { user } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval>>();

    const myUserId = user?.id || '';
    const initial = recipientName.charAt(0).toUpperCase();

    // Load conversation & messages
    const loadMessages = useCallback(async () => {
        if (!myUserId || !recipientId) return;

        try {
            // First get conversations to find existing one
            const convos = await messagingService.getConversations();
            const existingConvo = convos.find(
                c => c.otherUser?.id === recipientId
            );

            if (existingConvo) {
                setConversationId(existingConvo.id);
                const msgs = await messagingService.getMessages(
                    myUserId,
                    existingConvo.id,
                    recipientId
                );
                setMessages(msgs.reverse()); // Show oldest first
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setIsLoading(false);
        }
    }, [myUserId, recipientId]);

    useEffect(() => {
        if (isOpen) {
            loadMessages();
            // Poll for new messages every 5 seconds
            pollRef.current = setInterval(loadMessages, 5000);
        }

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isOpen, loadMessages]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    const handleSend = async () => {
        const text = newMessage.trim();
        if (!text || isSending || !myUserId) return;

        setIsSending(true);
        setNewMessage('');

        try {
            const result = await messagingService.sendMessage(myUserId, recipientId, text);
            
            // Add optimistic message
            const optimisticMsg: Message = {
                id: result.id || `temp-${Date.now()}`,
                conversationId: result.conversationId || conversationId || '',
                senderId: myUserId,
                recipientId,
                encryptedContent: '',
                iv: '',
                createdAt: new Date().toISOString(),
                isRead: false,
                decryptedContent: text,
            };

            setMessages(prev => [...prev, optimisticMsg]);
            if (!conversationId && result.conversationId) {
                setConversationId(result.conversationId);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setNewMessage(text); // Restore failed message
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleBlock = async () => {
        try {
            await messagingService.blockUser(recipientId);
            setShowMenu(false);
            onClose();
        } catch (err) {
            console.error('Failed to block user:', err);
        }
    };

    const handleReport = async () => {
        if (!reportReason.trim()) return;
        try {
            // Report the last message from recipient
            const lastRecipientMsg = messages.filter(m => m.senderId === recipientId).pop();
            if (lastRecipientMsg) {
                await messagingService.reportMessage(lastRecipientMsg.id, reportReason);
            }
            setShowReportModal(false);
            setReportReason('');
        } catch (err) {
            console.error('Failed to report:', err);
        }
    };

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60]"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    className="absolute bottom-0 inset-x-0 flex flex-col"
                    style={{
                        height: '85vh',
                        maxHeight: '85dvh',
                        borderRadius: '28px 28px 0 0',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderBottom: 'none',
                        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ─── Header ─── */}
                    <div
                        className="flex items-center gap-3 px-5 py-4"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                    >
                        {/* Drag handle */}
                        <div
                            className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
                            style={{ background: 'var(--bg-elevated)' }}
                        />

                        {/* Avatar */}
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, var(--text-gold), #FFF3C4)',
                                color: '#0D0D0D',
                            }}
                        >
                            {recipientAvatar ? (
                                <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
                            ) : initial}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                {recipientName}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Lock className="w-2.5 h-2.5" style={{ color: 'var(--text-gold)' }} />
                                <span className="text-[10px] font-medium" style={{ color: 'var(--text-gold)' }}>
                                    End-to-end encrypted
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2 rounded-full transition-all"
                                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown menu */}
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                        className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden shadow-xl z-10"
                                        style={{
                                            background: 'var(--bg-surface)',
                                            border: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <button
                                            onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold hover:opacity-80 transition-opacity"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            <Flag className="w-3.5 h-3.5 text-amber-500" />
                                            Report as scam
                                        </button>
                                        <div style={{ borderTop: '1px solid var(--border-color)' }} />
                                        <button
                                            onClick={handleBlock}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold hover:opacity-80 transition-opacity text-red-500"
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            Block user
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-full transition-all"
                            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ─── E2E Notice ─── */}
                    <div className="flex items-center justify-center gap-1.5 py-2.5" style={{ background: 'var(--bg-surface)' }}>
                        <Shield className="w-3 h-3" style={{ color: 'var(--text-gold)' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            Messages are encrypted. Only you and {recipientName} can read them.
                        </span>
                    </div>

                    {/* ─── Messages Area ─── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-gold)' }} />
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading messages...</span>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--glow-gold)' }}
                                >
                                    <Lock className="w-7 h-7" style={{ color: 'var(--text-gold)' }} />
                                </div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    Start a secure conversation
                                </p>
                                <p className="text-xs text-center max-w-[240px]" style={{ color: 'var(--text-muted)' }}>
                                    All messages with {recipientName} are end-to-end encrypted and stored securely.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMine = msg.senderId === myUserId;
                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className="max-w-[80%] px-4 py-2.5 rounded-2xl"
                                            style={isMine ? {
                                                background: 'linear-gradient(135deg, var(--text-gold), #b8963f)',
                                                color: '#0D0D0D',
                                                borderBottomRightRadius: '6px',
                                            } : {
                                                background: 'var(--bg-surface)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderBottomLeftRadius: '6px',
                                            }}
                                        >
                                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                                                {msg.decryptedContent || '[Encrypted]'}
                                            </p>
                                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                                                <span className="text-[9px] font-medium" style={{ opacity: 0.6 }}>
                                                    {formatTime(msg.createdAt)}
                                                </span>
                                                {isMine && (
                                                    msg.isRead ? (
                                                        <CheckCheck className="w-3 h-3" style={{ opacity: 0.7 }} />
                                                    ) : (
                                                        <Check className="w-3 h-3" style={{ opacity: 0.5 }} />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ─── Input Area ─── */}
                    <div
                        className="px-4 py-3 flex items-end gap-2"
                        style={{
                            borderTop: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 resize-none text-sm outline-none px-4 py-2.5 rounded-2xl transition-all"
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                maxHeight: '100px',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending}
                            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                            style={{
                                background: 'linear-gradient(135deg, var(--text-gold), #b8963f)',
                                color: '#0D0D0D',
                                boxShadow: newMessage.trim() ? '0 4px 16px rgba(201,168,76,0.3)' : 'none',
                            }}
                        >
                            {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* ─── Report Modal ─── */}
            <AnimatePresence>
                {showReportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                        onClick={() => setShowReportModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="w-full max-w-sm rounded-3xl p-6"
                            style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    Report Scam / Suspicious Activity
                                </h3>
                            </div>

                            <textarea
                                value={reportReason}
                                onChange={e => setReportReason(e.target.value)}
                                placeholder="Describe why you think this is suspicious..."
                                rows={3}
                                className="w-full text-sm outline-none px-4 py-3 rounded-xl resize-none"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                }}
                            />

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                                    style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReport}
                                    disabled={!reportReason.trim()}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-40"
                                >
                                    Submit Report
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}
