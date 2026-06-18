/**
 * MessagesPage — Premium E2E Encrypted Inbox Dashboard
 * 
 * Professional dual-pane messenger with:
 * - Glassmorphic conversation list with online indicators
 * - Real-time polling for multi-user conversations
 * - E2E decryption with Web Crypto API
 * - Anti-scam shield (block / report)
 * - Responsive: single-pane on mobile, dual-pane on desktop
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Lock, Shield, Send, ArrowLeft, Ban,
    Flag, Check, CheckCheck, Loader2, AlertTriangle,
    MessageSquare, MoreVertical, ShieldCheck, Sparkles
} from 'lucide-react';
import { messagingService, type Conversation, type Message } from '../../../../services/messagingService';
import { useAuthStore } from '../../../../stores/useAuthStore';
import './MessagesPage.css';

// ── Helpers ────────────────────────────────────────────

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitial(name?: string): string {
    return name?.charAt(0).toUpperCase() || '?';
}

// ── DateSeparator ──────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
    const d = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === now.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    return (
        <div className="msg-date-separator">
            <span>{label}</span>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────

export function MessagesPage() {
    const { user } = useAuthStore();
    const myUserId = user?.id || '';

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isConvosLoading, setIsConvosLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const convosPollRef = useRef<ReturnType<typeof setInterval>>();
    const msgsPollRef = useRef<ReturnType<typeof setInterval>>();
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Data Fetching ──────────────────────────────────

    const fetchConversations = useCallback(async (showLoading = false) => {
        if (!myUserId) return;
        if (showLoading) setIsConvosLoading(true);
        try {
            const data = await messagingService.getConversations();
            setConversations(data);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            if (showLoading) setIsConvosLoading(false);
        }
    }, [myUserId]);

    const fetchMessages = useCallback(async (convo: Conversation, showLoading = false) => {
        if (!myUserId || !convo.otherUser) return;
        if (showLoading) setIsMessagesLoading(true);
        try {
            const data = await messagingService.getMessages(myUserId, convo.id, convo.otherUser.id);
            setMessages(data.reverse());
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            if (showLoading) setIsMessagesLoading(false);
        }
    }, [myUserId]);

    // Poll conversations
    useEffect(() => {
        fetchConversations(true);
        convosPollRef.current = setInterval(() => fetchConversations(false), 5000);
        return () => { if (convosPollRef.current) clearInterval(convosPollRef.current); };
    }, [fetchConversations]);

    // Poll messages for selected convo
    useEffect(() => {
        if (msgsPollRef.current) clearInterval(msgsPollRef.current);
        if (selectedConvo) {
            fetchMessages(selectedConvo, true);
            msgsPollRef.current = setInterval(() => fetchMessages(selectedConvo, false), 4000);
        } else {
            setMessages([]);
        }
        return () => { if (msgsPollRef.current) clearInterval(msgsPollRef.current); };
    }, [selectedConvo, fetchMessages]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input
    useEffect(() => {
        if (selectedConvo) setTimeout(() => inputRef.current?.focus(), 300);
    }, [selectedConvo]);

    // ── Actions ────────────────────────────────────────

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = newMessage.trim();
        if (!text || isSending || !myUserId || !selectedConvo?.otherUser) return;

        setIsSending(true);
        setNewMessage('');

        try {
            const recipientId = selectedConvo.otherUser.id;
            const result = await messagingService.sendMessage(myUserId, recipientId, text);

            const optimisticMsg: Message = {
                id: result.id || `temp-${Date.now()}`,
                conversationId: selectedConvo.id,
                senderId: myUserId,
                recipientId,
                encryptedContent: '',
                iv: '',
                createdAt: new Date().toISOString(),
                isRead: false,
                decryptedContent: text,
            };
            setMessages(prev => [...prev, optimisticMsg]);
            fetchConversations(false);
        } catch (err) {
            console.error('Failed to send message:', err);
            setNewMessage(text);
        } finally {
            setIsSending(false);
        }
    };

    const handleBlock = async () => {
        if (!selectedConvo?.otherUser) return;
        try {
            await messagingService.blockUser(selectedConvo.otherUser.id);
            setShowActionsMenu(false);
            setSelectedConvo(null);
            setMobilePane('list');
            fetchConversations(true);
        } catch (err) {
            console.error('Failed to block:', err);
        }
    };

    const handleReport = async () => {
        if (!reportReason.trim() || !selectedConvo?.otherUser) return;
        try {
            const lastOtherMsg = messages.filter(m => m.senderId === selectedConvo.otherUser?.id).pop();
            if (lastOtherMsg) await messagingService.reportMessage(lastOtherMsg.id, reportReason);
            setShowReportModal(false);
            setReportReason('');
        } catch (err) {
            console.error('Failed to report:', err);
        }
    };

    const selectConversation = (c: Conversation) => {
        setSelectedConvo(c);
        setMobilePane('chat');
        setShowActionsMenu(false);
    };

    const goBackToList = () => {
        setSelectedConvo(null);
        setMobilePane('list');
    };

    // ── Filtered Conversations ─────────────────────────

    const filteredConvos = conversations.filter(c => {
        const name = c.otherUser?.displayName?.toLowerCase() || '';
        return name.includes(searchQuery.toLowerCase());
    });

    // ── Render helpers ─────────────────────────────────

    // Group messages by date for date separators
    const renderMessages = () => {
        let lastDateStr = '';
        return messages.map((msg) => {
            const isMine = msg.senderId === myUserId;
            const msgDate = new Date(msg.createdAt).toDateString();
            let showDateSep = false;
            if (msgDate !== lastDateStr) {
                showDateSep = true;
                lastDateStr = msgDate;
            }

            return (
                <div key={msg.id}>
                    {showDateSep && <DateSeparator date={msg.createdAt} />}
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`msg-bubble-row ${isMine ? 'msg-bubble-row--mine' : 'msg-bubble-row--theirs'}`}
                    >
                        {/* Other user avatar on left */}
                        {!isMine && (
                            <div className="msg-bubble-avatar">
                                {selectedConvo?.otherUser?.avatarUrl ? (
                                    <img src={selectedConvo.otherUser.avatarUrl} alt="" />
                                ) : (
                                    <span>{getInitial(selectedConvo?.otherUser?.displayName)}</span>
                                )}
                            </div>
                        )}
                        <div className={`msg-bubble ${isMine ? 'msg-bubble--mine' : 'msg-bubble--theirs'}`}>
                            <p className="msg-bubble__text">{msg.decryptedContent || '[Encrypted]'}</p>
                            <div className="msg-bubble__meta">
                                <span className="msg-bubble__time">{formatMessageTime(msg.createdAt)}</span>
                                {isMine && (
                                    msg.isRead
                                        ? <CheckCheck className="msg-bubble__check msg-bubble__check--read" />
                                        : <Check className="msg-bubble__check" />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            );
        });
    };

    return (
        <div className="msg-page">
            {/* ─── LEFT: CONVERSATIONS LIST ─── */}
            <aside className={`msg-sidebar ${mobilePane === 'chat' ? 'msg-sidebar--hidden-mobile' : ''}`}>
                {/* Header */}
                <div className="msg-sidebar__header">
                    <div className="msg-sidebar__title-row">
                        <div className="msg-sidebar__title-icon">
                            <Lock className="w-4 h-4" />
                        </div>
                        <h2 className="msg-sidebar__title">Messages</h2>
                        <span className="msg-sidebar__badge">{conversations.length}</span>
                    </div>

                    <div className="msg-sidebar__search">
                        <Search className="msg-sidebar__search-icon" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="msg-sidebar__search-input"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="msg-sidebar__list">
                    {isConvosLoading ? (
                        <div className="msg-sidebar__empty">
                            <Loader2 className="w-6 h-6 animate-spin msg-gold-icon" />
                            <span>Loading conversations...</span>
                        </div>
                    ) : filteredConvos.length === 0 ? (
                        <div className="msg-sidebar__empty">
                            <div className="msg-sidebar__empty-icon-wrap">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h4>No conversations yet</h4>
                            <p>Start chatting from a photographer&apos;s profile or the Request Board.</p>
                        </div>
                    ) : (
                        filteredConvos.map(c => {
                            const isActive = selectedConvo?.id === c.id;
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => selectConversation(c)}
                                    className={`msg-convo-item ${isActive ? 'msg-convo-item--active' : ''}`}
                                >
                                    <div className="msg-convo-item__avatar">
                                        {c.otherUser?.avatarUrl ? (
                                            <img src={c.otherUser.avatarUrl} alt={c.otherUser.displayName} />
                                        ) : (
                                            <span>{getInitial(c.otherUser?.displayName)}</span>
                                        )}
                                        <div className="msg-convo-item__online" />
                                    </div>

                                    <div className="msg-convo-item__body">
                                        <div className="msg-convo-item__top">
                                            <h4 className="msg-convo-item__name">{c.otherUser?.displayName}</h4>
                                            <span className="msg-convo-item__time">{formatTime(c.lastMessageAt)}</span>
                                        </div>
                                        <p className="msg-convo-item__preview">
                                            <Lock className="w-2.5 h-2.5 inline-block mr-1 opacity-40" />
                                            {c.lastMessagePreview || 'Encrypted message'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="msg-sidebar__footer">
                    <ShieldCheck className="w-3.5 h-3.5 msg-gold-icon" />
                    <span>Protected by SeniQu Anti-Scam Shield</span>
                </div>
            </aside>

            {/* ─── RIGHT: CHAT PANEL ─── */}
            <main className={`msg-chat ${mobilePane === 'list' ? 'msg-chat--hidden-mobile' : ''}`}>
                {selectedConvo ? (
                    <>
                        {/* Chat Header */}
                        <header className="msg-chat__header">
                            <div className="msg-chat__header-left">
                                <button onClick={goBackToList} className="msg-chat__back-btn">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                <div className="msg-chat__header-avatar">
                                    {selectedConvo.otherUser?.avatarUrl ? (
                                        <img src={selectedConvo.otherUser.avatarUrl} alt="" />
                                    ) : (
                                        <span>{getInitial(selectedConvo.otherUser?.displayName)}</span>
                                    )}
                                </div>

                                <div className="msg-chat__header-info">
                                    <h3>{selectedConvo.otherUser?.displayName}</h3>
                                    <div className="msg-chat__e2e-badge">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>End-to-end encrypted</span>
                                    </div>
                                </div>
                            </div>

                            {/* Anti-Scam Actions */}
                            <div className="msg-chat__actions">
                                <button
                                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                                    className="msg-chat__action-btn"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                <AnimatePresence>
                                    {showActionsMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="msg-chat__dropdown"
                                        >
                                            <button onClick={() => { setShowReportModal(true); setShowActionsMenu(false); }}>
                                                <Flag className="w-3.5 h-3.5 text-amber-500" />
                                                Report suspicious activity
                                            </button>
                                            <div className="msg-chat__dropdown-divider" />
                                            <button onClick={handleBlock} className="msg-chat__dropdown-danger">
                                                <Ban className="w-3.5 h-3.5" />
                                                Block this user
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </header>

                        {/* E2E Banner */}
                        <div className="msg-chat__e2e-banner">
                            <Shield className="w-3 h-3 msg-gold-icon" />
                            <span>Zero-knowledge encryption active. The server cannot read these messages.</span>
                        </div>

                        {/* Messages Area */}
                        <div className="msg-chat__messages">
                            {isMessagesLoading ? (
                                <div className="msg-chat__loading">
                                    <Loader2 className="w-6 h-6 animate-spin msg-gold-icon" />
                                    <span>Decrypting messages...</span>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="msg-chat__empty-chat">
                                    <div className="msg-chat__empty-icon">
                                        <Lock className="w-7 h-7" />
                                    </div>
                                    <h4>Secure channel ready</h4>
                                    <p>Send your first encrypted message to {selectedConvo.otherUser?.displayName}.</p>
                                </div>
                            ) : (
                                renderMessages()
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="msg-chat__input-area">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Type a secure message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                className="msg-chat__input"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="msg-chat__send-btn"
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    /* Empty State — No conversation selected */
                    <div className="msg-chat__splash">
                        <div className="msg-chat__splash-glow" />
                        <div className="msg-chat__splash-icon">
                            <Sparkles className="w-5 h-5 msg-chat__splash-sparkle" />
                            <Lock className="w-10 h-10" />
                        </div>
                        <h3>SeniQu Secure Messaging</h3>
                        <p>
                            Coordinate photo shoots, negotiate commissions, and chat with artists
                            — all end-to-end encrypted using Web Crypto API standards.
                        </p>
                        <div className="msg-chat__splash-badges">
                            <div className="msg-chat__splash-badge">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Anti-Scam Shield</span>
                            </div>
                            <div className="msg-chat__splash-badge">
                                <Lock className="w-3.5 h-3.5" />
                                <span>AES-256-GCM</span>
                            </div>
                            <div className="msg-chat__splash-badge">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Zero-Knowledge</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ─── Report Modal ─── */}
            <AnimatePresence>
                {showReportModal && (
                    <div className="msg-modal-overlay" onClick={() => setShowReportModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="msg-modal"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="msg-modal__header">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <h3>Report Suspicious Activity</h3>
                            </div>
                            <textarea
                                placeholder="Describe the suspicious behavior (e.g. scam links, harassment, impersonation)..."
                                value={reportReason}
                                onChange={e => setReportReason(e.target.value)}
                                rows={4}
                                className="msg-modal__textarea"
                            />
                            <div className="msg-modal__actions">
                                <button onClick={() => setShowReportModal(false)} className="msg-modal__cancel">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReport}
                                    disabled={!reportReason.trim()}
                                    className="msg-modal__submit"
                                >
                                    Submit Report
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MessagesPage;
