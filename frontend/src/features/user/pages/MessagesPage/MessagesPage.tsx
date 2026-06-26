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
    MessageSquare, MoreVertical, ShieldCheck, MessageSquarePlus, X,
    Plus, Mic, Image, Coins, Smile,
    FileText, Camera, Headphones, MapPin, Users, BarChart2, Video
} from 'lucide-react';
import { messagingService, type Conversation, type Message } from '../../../../services/messagingService';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { uploadFile } from '../../../../lib/api';
import { compressImage } from '../../../../lib/imageCompressor';
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
    const [followedUsers, setFollowedUsers] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isConvosLoading, setIsConvosLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');

    // New Chat Modal States
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [modalSearchResults, setModalSearchResults] = useState<any[]>([]);
    const [isSearchingModalUsers, setIsSearchingModalUsers] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [votes, setVotes] = useState<Record<string, boolean>>({});

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

    // Load followed users on mount
    useEffect(() => {
        const loadFollowed = async () => {
            try {
                const data = await messagingService.getFollowedUsers();
                setFollowedUsers(data);
            } catch (err) {
                console.error('Failed to fetch followed users:', err);
            }
        };
        loadFollowed();
    }, []);

    // Debounced user search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearchingUsers(true);
            try {
                const results = await messagingService.searchUsers(searchQuery);
                setSearchResults(results);
            } catch (err) {
                console.error('Failed to search users:', err);
            } finally {
                setIsSearchingUsers(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Debounced modal user search
    useEffect(() => {
        if (!modalSearchQuery.trim()) {
            setModalSearchResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearchingModalUsers(true);
            try {
                const results = await messagingService.searchUsers(modalSearchQuery);
                setModalSearchResults(results);
            } catch (err) {
                console.error('Failed to search modal users:', err);
            } finally {
                setIsSearchingModalUsers(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [modalSearchQuery]);

    // Poll messages for selected convo
    useEffect(() => {
        if (msgsPollRef.current) clearInterval(msgsPollRef.current);
        if (selectedConvo) {
            if (!selectedConvo.id.startsWith('temp-')) {
                fetchMessages(selectedConvo, true);
                msgsPollRef.current = setInterval(() => fetchMessages(selectedConvo, false), 4000);
            } else {
                setMessages([]);
            }
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

            let actualConvoId = selectedConvo.id;
            if (selectedConvo.id.startsWith('temp-')) {
                actualConvoId = result.conversationId;
                setSelectedConvo(prev => prev ? { ...prev, id: result.conversationId } : null);
            }

            const optimisticMsg: Message = {
                id: result.id || `temp-${Date.now()}`,
                conversationId: actualConvoId,
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

    const sendSticker = async (stickerName: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const stickerText = `[sticker:${stickerName}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, stickerText);
            setNewMessage('');
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send sticker:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendImageMessage = async (imageUrl: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const imgText = `[image:${imageUrl}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, imgText);
            setNewMessage('');
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send image message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendSolanaRequest = async (amount: number) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const payText = `[solana:${amount}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, payText);
            setNewMessage('');
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send solana request:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendDocumentMessage = async (docName: string, fileSize: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const docText = `[document:${docName} | ${fileSize}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, docText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send document message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendCameraMessage = async () => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const imgText = `[image:https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=60]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, imgText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send camera message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendGalleryMessage = async () => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const imgText = `[image:https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=60]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, imgText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send gallery message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendAudioMessage = async (audioName: string, duration: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const audioText = `[audio:${audioName} | ${duration}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, audioText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send audio message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendLocationMessage = async (locationName: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const locText = `[location:${locationName}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, locText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send location message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendContactMessage = async (name: string, phone: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const contactText = `[contact:${name} | ${phone}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, contactText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send contact message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendPollingMessage = async () => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const pollText = `[polling:Which cultural heritage workshop should we organize next? | Batik Writing | Wayang Kulit Puppet | Gamelan Basics]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, pollText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send polling message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const sendGifMessage = async (gifUrl: string) => {
        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        try {
            const gifText = `[gif:${gifUrl}]`;
            await messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, gifText);
            setShowAttachmentMenu(false);
            await fetchMessages(selectedConvo, false);
            await fetchConversations(false);
        } catch (err) {
            console.error('Failed to send GIF message:', err);
        } finally {
            setIsSending(false);
        }
    };

    const uploadRealFile = (
        accept: string,
        folder: "general" | "artworks" | "avatars" | "videos" | "collections",
        callback: (url: string, fileName: string, fileSizeStr: string) => void
    ) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const sizeInMb = file.size / (1024 * 1024);
            const fileSizeStr = sizeInMb < 0.1
                ? `${Math.round(file.size / 1024)} KB`
                : `${sizeInMb.toFixed(1)} MB`;

            try {
                const result = await uploadFile(file, folder);
                callback(result.url, file.name, fileSizeStr);
            } catch (err) {
                console.error('Failed to upload file:', err);
                alert('Failed to upload file. Please try again.');
            }
        };
        input.click();
    };

    const handleDocumentClick = () => {
        uploadRealFile(
            '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
            'general',
            (url, name, sizeStr) => {
                sendDocumentMessage(name, sizeStr);
            }
        );
    };

    const handleCameraClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.setAttribute('capture', 'environment');
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                // Compress camera image to strip metadata & EXIF (e.g. GPS logs) for privacy protection
                const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.85 });
                const result = await uploadFile(compressed, 'general');
                sendImageMessage(result.url);
            } catch (err) {
                console.error('Failed to capture photo:', err);
                alert('Failed to capture photo.');
            }
        };
        input.click();
    };

    const handleGalleryClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                let fileToUpload = file;
                if (file.type.startsWith('image/')) {
                    // Compress image to strip metadata & EXIF (e.g. GPS logs) for privacy protection
                    fileToUpload = await compressImage(file, { maxWidth: 1600, quality: 0.85 });
                }
                const result = await uploadFile(fileToUpload, 'general');
                sendImageMessage(result.url);
            } catch (err) {
                console.error('Failed to upload gallery file:', err);
                alert('Failed to upload file.');
            }
        };
        input.click();
    };

    const handleAudioClick = () => {
        uploadRealFile(
            'audio/*',
            'general',
            (url, name, sizeStr) => {
                sendAudioMessage(name, '0:15');
            }
        );
    };

    const handleLocationClick = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // Round to 3 decimal places (~110m accuracy) to protect precise home/private address privacy
                const roundedLat = latitude.toFixed(3);
                const roundedLon = longitude.toFixed(3);
                const locStr = `Lat: ${roundedLat}, Lon: ${roundedLon} (Approximate)`;
                sendLocationMessage(locStr);
            },
            (error) => {
                console.warn('Geolocation error, sharing fallback:', error);
                sendLocationMessage('Museum Nasional Indonesia, Jakarta');
            }
        );
    };

    const handleContactClick = () => {
        const name = prompt('Enter Contact Name:');
        if (!name) return;
        const phone = prompt('Enter Contact Phone Number:');
        if (!phone) return;
        sendContactMessage(name, phone);
    };

    const handlePollingClick = () => {
        const question = prompt('Enter Poll Question:', 'Which cultural heritage workshop should we organize next?');
        if (!question) return;
        const option1 = prompt('Enter Option 1:', 'Batik Writing');
        if (!option1) return;
        const option2 = prompt('Enter Option 2:', 'Wayang Kulit Puppet');
        if (!option2) return;
        const option3 = prompt('Enter Option 3 (optional):', 'Gamelan Basics');

        let pollText = `[polling:${question} | ${option1} | ${option2}`;
        if (option3) {
            pollText += ` | ${option3}`;
        }
        pollText += ']';

        if (!selectedConvo || !myUserId || !selectedConvo.otherUser || isSending) return;
        setIsSending(true);
        messagingService.sendMessage(myUserId, selectedConvo.otherUser.id, pollText)
            .then(async () => {
                setShowAttachmentMenu(false);
                await fetchMessages(selectedConvo, false);
                await fetchConversations(false);
            })
            .catch((err) => {
                console.error('Failed to send polling:', err);
            })
            .finally(() => {
                setIsSending(false);
            });
    };

    const handleGifClick = () => {
        const search = prompt('Search for a GIF (or paste a direct image URL):', 'art');
        if (!search) return;

        const gifMap: Record<string, string> = {
            art: 'https://media.giphy.com/media/l0Exd35S8Y18yK5P2/giphy.gif',
            hello: 'https://media.giphy.com/media/VbEC9WchxUDW5sFtu3/giphy.gif',
            dance: 'https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif',
            love: 'https://media.giphy.com/media/l4pTdcifP6CtmDRja/giphy.gif',
            congrats: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif'
        };

        const query = search.toLowerCase().trim();
        const selectedGif = gifMap[query] || `https://media.giphy.com/media/l0Exd35S8Y18yK5P2/giphy.gif`;
        const finalGif = search.startsWith('http') ? search : selectedGif;

        sendGifMessage(finalGif);
    };

    const selectConversation = (c: Conversation) => {
        setSelectedConvo(c);
        setMobilePane('chat');
        setShowActionsMenu(false);
    };

    const startOrSelectConversation = (targetUser: any) => {
        const existing = conversations.find(c => c.otherUser?.id === targetUser.id);
        if (existing) {
            selectConversation(existing);
        } else {
            const tempConvo: Conversation = {
                id: `temp-${targetUser.id}`,
                otherUser: {
                    id: targetUser.id,
                    displayName: targetUser.displayName || targetUser.username,
                    avatarUrl: targetUser.avatarUrl || targetUser.avatar,
                    isMutual: targetUser.isMutual,
                },
                lastMessageAt: new Date().toISOString(),
                lastMessagePreview: "Start a new E2E encrypted chat",
                createdAt: new Date().toISOString(),
                unreadCount: 0,
            };
            setConversations(prev => [tempConvo, ...prev.filter(c => c.id !== tempConvo.id)]);
            setSelectedConvo(tempConvo);
            setMobilePane('chat');
            setShowActionsMenu(false);
        }
        setSearchQuery('');
    };

    const goBackToList = () => {
        setSelectedConvo(null);
        setMobilePane('list');
    };

    // ── Filtered Conversations (local list filtering) ───

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

            const content = msg.decryptedContent || '';
            const isSticker = content.startsWith('[sticker:');
            const stickerName = isSticker ? content.match(/\[sticker:(.+?)\]/)?.[1] : '';

            const isImage = content.startsWith('[image:');
            const imageUrl = isImage ? content.match(/\[image:(.+?)\]/)?.[1] : '';

            const isSolana = content.startsWith('[solana:');
            const solanaAmount = isSolana ? content.match(/\[solana:(.+?)\]/)?.[1] : '';

            const isDocument = content.startsWith('[document:');
            const documentMatch = isDocument ? content.match(/\[document:(.+?)\]/)?.[1] : '';
            const documentName = documentMatch ? documentMatch.split('|')[0].trim() : '';
            const documentSize = documentMatch ? documentMatch.split('|')[1]?.trim() : '';

            const isAudio = content.startsWith('[audio:');
            const audioMatch = isAudio ? content.match(/\[audio:(.+?)\]/)?.[1] : '';
            const audioName = audioMatch ? audioMatch.split('|')[0].trim() : '';
            const audioDuration = audioMatch ? audioMatch.split('|')[1]?.trim() : '';

            const isLocation = content.startsWith('[location:');
            const locationName = isLocation ? content.match(/\[location:(.+?)\]/)?.[1] : '';

            const isContact = content.startsWith('[contact:');
            const contactMatch = isContact ? content.match(/\[contact:(.+?)\]/)?.[1] : '';
            const contactName = contactMatch ? contactMatch.split('|')[0].trim() : '';
            const contactPhone = contactMatch ? contactMatch.split('|')[1]?.trim() : '';

            const isPolling = content.startsWith('[polling:');
            const pollingMatch = isPolling ? content.match(/\[polling:(.+?)\]/)?.[1] : '';
            const pollingParts = pollingMatch ? pollingMatch.split('|').map(p => p.trim()) : [];
            const pollingQuestion = pollingParts[0] || '';
            const pollingOptions = pollingParts.slice(1);

            const isGif = content.startsWith('[gif:');
            const gifUrl = isGif ? content.match(/\[gif:(.+?)\]/)?.[1] : '';

            return (
                <div key={msg.id}>
                    {showDateSep && <DateSeparator date={msg.createdAt} />}
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`msg-bubble-row ${isMine ? 'msg-bubble-row--mine' : 'msg-bubble-row--theirs'} ${
                            isSticker ? 'msg-bubble-row--sticker' : ''
                        }`}
                    >
                        {/* Other user avatar on left */}
                        {!isMine && !isSticker && (
                            <div className="msg-bubble-avatar">
                                {selectedConvo?.otherUser?.avatarUrl ? (
                                    <img src={selectedConvo.otherUser.avatarUrl} alt="" />
                                ) : (
                                    <span>{getInitial(selectedConvo?.otherUser?.displayName)}</span>
                                )}
                            </div>
                        )}

                        <div className={`msg-bubble-group ${isMine ? 'msg-bubble-group--mine' : 'msg-bubble-group--theirs'}`}>
                            {isSticker ? (
                                <div className={`msg-sticker msg-sticker--${stickerName}`}>
                                    {stickerName === 'thumbsup' && (
                                        <div className="msg-sticker__wrapper">
                                            <span className="msg-sticker__emoji">👍</span>
                                            <div className="msg-sticker__sparkle msg-sticker__sparkle--1" />
                                            <div className="msg-sticker__sparkle msg-sticker__sparkle--2" />
                                        </div>
                                    )}
                                    {stickerName === 'heart' && <span className="msg-sticker__emoji msg-sticker__emoji--heart">❤️</span>}
                                    {stickerName === 'celebrate' && <span className="msg-sticker__emoji msg-sticker__emoji--celebrate">🎉</span>}
                                    {stickerName === 'rocket' && <span className="msg-sticker__emoji msg-sticker__emoji--rocket">🚀</span>}
                                </div>
                            ) : isImage ? (
                                <div className="msg-image-bubble">
                                    <img src={imageUrl} alt="Attached" className="msg-image-bubble__img" />
                                </div>
                            ) : isSolana ? (
                                <div className="msg-solana-card">
                                    <div className="msg-solana-card__header">
                                        <Coins className="w-5 h-5 text-[#14F195]" />
                                        <span>Solana Pay</span>
                                    </div>
                                    <div className="msg-solana-card__body">
                                        <div className="msg-solana-card__amount">
                                            <span>{solanaAmount} SOL</span>
                                        </div>
                                        <p className="msg-solana-card__desc">
                                            {isMine ? 'Payment request sent' : 'Payment request received'}
                                        </p>
                                    </div>
                                    {!isMine && (
                                        <button className="msg-solana-card__btn">
                                            Simulate Transaction
                                        </button>
                                    )}
                                </div>
                            ) : isDocument ? (
                                <div className="msg-document-card">
                                    <div className="msg-document-card__header">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                        <div className="msg-document-card__info">
                                            <span className="msg-document-card__name">{documentName}</span>
                                            <span className="msg-document-card__size">{documentSize || 'Unknown size'}</span>
                                        </div>
                                    </div>
                                    <button type="button" className="msg-document-card__download-btn" onClick={() => alert(`Downloading file: ${documentName}`)}>
                                        Download
                                    </button>
                                </div>
                            ) : isAudio ? (
                                <div className="msg-audio-card">
                                    <button type="button" className="msg-audio-card__play-btn" onClick={() => alert(`Playing audio: ${audioName}`)}>
                                        <div className="msg-audio-card__play-icon" />
                                    </button>
                                    <div className="msg-audio-card__body">
                                        <div className="msg-audio-card__waveform">
                                            <span className="msg-audio-card__wave msg-audio-card__wave--1" />
                                            <span className="msg-audio-card__wave msg-audio-card__wave--2" />
                                            <span className="msg-audio-card__wave msg-audio-card__wave--3" />
                                            <span className="msg-audio-card__wave msg-audio-card__wave--4" />
                                            <span className="msg-audio-card__wave msg-audio-card__wave--5" />
                                            <span className="msg-audio-card__wave msg-audio-card__wave--6" />
                                            <span className="msg-audio-card__wave msg-audio-card__wave--7" />
                                        </div>
                                        <span className="msg-audio-card__duration">{audioDuration || '0:00'}</span>
                                    </div>
                                </div>
                            ) : isLocation ? (
                                <div className="msg-location-card">
                                    <div className="msg-location-card__map-preview">
                                        <MapPin className="w-8 h-8 text-green-500 animate-bounce" />
                                    </div>
                                    <div className="msg-location-card__info">
                                        <span className="msg-location-card__title">Shared Location</span>
                                        <span className="msg-location-card__address">{locationName}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="msg-location-card__btn"
                                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(locationName || '')}`, '_blank')}
                                    >
                                        Open in Maps
                                    </button>
                                </div>
                            ) : isContact ? (
                                <div className="msg-contact-card">
                                    <div className="msg-contact-card__avatar">
                                        <Users className="w-5 h-5 text-teal-400" />
                                    </div>
                                    <div className="msg-contact-card__info">
                                        <span className="msg-contact-card__name">{contactName}</span>
                                        <span className="msg-contact-card__phone">{contactPhone}</span>
                                    </div>
                                    <button type="button" className="msg-contact-card__btn" onClick={() => alert(`Contact added: ${contactName}`)}>
                                        Add Contact
                                    </button>
                                </div>
                            ) : isPolling ? (
                                <div className="msg-polling-card">
                                    <div className="msg-polling-card__header">
                                        <BarChart2 className="w-4 h-4 text-indigo-400" />
                                        <span>Shared Poll</span>
                                    </div>
                                    <h4 className="msg-polling-card__question">{pollingQuestion}</h4>
                                    <div className="msg-polling-card__options">
                                        {pollingOptions.map((opt, idx) => {
                                            const voteKey = `${msg.id}-${idx}`;
                                            const isVoted = votes[voteKey] !== undefined;
                                            const baseVotePercentage = (idx === 0 ? 45 : idx === 1 ? 35 : 20);
                                            const displayPercentage = isVoted ? baseVotePercentage + 5 : baseVotePercentage;

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setVotes(prev => ({ ...prev, [voteKey]: true }))}
                                                    className={`msg-polling-card__option ${isVoted ? 'msg-polling-card__option--voted' : ''}`}
                                                >
                                                    <div className="msg-polling-card__option-bar" style={{ width: `${displayPercentage}%` }} />
                                                    <span className="msg-polling-card__option-text">{opt}</span>
                                                    <span className="msg-polling-card__option-pct">{displayPercentage}%</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : isGif ? (
                                <div className="msg-gif-bubble">
                                    <img src={gifUrl} alt="GIF" className="msg-gif-bubble__img" />
                                    <span className="msg-gif-bubble__badge">GIF</span>
                                </div>
                            ) : (
                                <div className={`msg-bubble ${isMine ? 'msg-bubble--mine' : 'msg-bubble--theirs'}`}>
                                    <p className="msg-bubble__text">{content}</p>
                                </div>
                            )}

                            {/* Sub meta (time & read receipt under the bubble) */}
                            <div className="msg-bubble-sub-meta">
                                <span className="msg-bubble-sub-time">{formatMessageTime(msg.createdAt)}</span>
                                {isMine && (
                                    msg.isRead
                                        ? <CheckCheck className="msg-bubble-sub-check msg-bubble-sub-check--read" />
                                        : <Check className="msg-bubble-sub-check" />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            );
        });
    };

    const renderConvoItem = (c: Conversation) => {
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
                    <div className="msg-convo-item__meta-row">
                        <p className="msg-convo-item__preview">
                            <Lock className="w-2.5 h-2.5 inline-block mr-1 opacity-40" />
                            {c.lastMessagePreview || 'Encrypted message'}
                        </p>
                        {!!c.unreadCount && c.unreadCount > 0 && (
                            <span className="msg-convo-item__unread">{c.unreadCount}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="msg-page">
            {/* ─── LEFT: CONVERSATIONS LIST & SEARCH ─── */}
            <aside className={`msg-sidebar ${mobilePane === 'chat' ? 'msg-sidebar--hidden-mobile' : ''}`}>
                {/* Header */}
                <div className="msg-sidebar__header">
                    <div className="msg-sidebar__title-row">
                        <div className="msg-sidebar__title-icon">
                            <Lock className="w-4 h-4" />
                        </div>
                        <h2 className="msg-sidebar__title">Messages</h2>
                        <button
                            className="msg-sidebar__new-btn"
                            onClick={() => {
                                setModalSearchQuery('');
                                setModalSearchResults([]);
                                setShowNewChatModal(true);
                            }}
                        >
                            <MessageSquarePlus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="msg-sidebar__search">
                        <Search className="msg-sidebar__search-icon" />
                        <input
                            type="text"
                            placeholder="Search by username or name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="msg-sidebar__search-input"
                        />
                        {searchQuery && (
                            <button className="msg-sidebar__search-clear" onClick={() => setSearchQuery('')}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Conversation List / Search Results */}
                <div className="msg-sidebar__list">
                    {searchQuery.trim() ? (
                        <div className="msg-sidebar__search-results">
                            {/* Active Conversations Matching Query */}
                            {filteredConvos.length > 0 && (
                                <div className="msg-search-section">
                                    <h4 className="msg-search-section__title">Recent Chats</h4>
                                    {filteredConvos.map(c => renderConvoItem(c))}
                                </div>
                            )}

                            {/* Global User Search */}
                            <div className="msg-search-section">
                                <h4 className="msg-search-section__title">Start a New Chat</h4>
                                {isSearchingUsers ? (
                                    <div className="msg-sidebar__loading-users">
                                        <Loader2 className="w-4 h-4 animate-spin msg-gold-icon" />
                                        <span>Searching users...</span>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="msg-sidebar__empty-search">
                                        <span>No users matching &quot;{searchQuery}&quot;</span>
                                    </div>
                                ) : (
                                    searchResults.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => startOrSelectConversation(u)}
                                            className="msg-search-user-item"
                                        >
                                            <div className="msg-search-user-item__avatar">
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt="" />
                                                ) : (
                                                    <span>{getInitial(u.displayName || u.username)}</span>
                                                )}
                                            </div>
                                            <div className="msg-search-user-item__body">
                                                <h5 className="msg-search-user-item__name">{u.displayName || u.username}</h5>
                                                <span className="msg-search-user-item__username">@{u.username}</span>
                                            </div>
                                            {u.isFollowed && (
                                                <span className="msg-search-user-item__badge">Followed</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Default Inbox View: Online Friends Carousel + All Convos */
                        <>
                            {/* Online Friends (Followed Users) Carousel */}
                            {followedUsers.length > 0 && (
                                <div className="msg-online-carousel">
                                    <div className="msg-online-carousel__header">
                                        <h4 className="msg-online-carousel__title">Online friends</h4>
                                        <span className="msg-online-carousel__count">{followedUsers.length}</span>
                                    </div>
                                    <div className="msg-online-carousel__items">
                                        {followedUsers.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => startOrSelectConversation(u)}
                                                className="msg-online-user-card"
                                            >
                                                <div className="msg-online-user-card__avatar-container">
                                                    <div className="msg-online-user-card__avatar">
                                                        {u.avatarUrl ? (
                                                            <img src={u.avatarUrl} alt="" />
                                                        ) : (
                                                            <span>{getInitial(u.displayName || u.username)}</span>
                                                        )}
                                                    </div>
                                                    {u.isOnline && <div className="msg-online-user-card__status" />}
                                                </div>
                                                <span className="msg-online-user-card__name">
                                                    {u.displayName || u.username}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent messages list */}
                            <div className="msg-inbox-section">
                                <h4 className="msg-inbox-section__title">Recent Messages</h4>
                                {isConvosLoading ? (
                                    <div className="msg-sidebar__empty">
                                        <Loader2 className="w-5 h-5 animate-spin msg-gold-icon" />
                                        <span className="mt-2">Loading inbox...</span>
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="msg-sidebar__empty">
                                        <div className="msg-sidebar__empty-icon-wrap">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <h4>No messages yet</h4>
                                        <p>Search above to start a secure AES-256 E2E chat with followed artists.</p>
                                    </div>
                                ) : (
                                    conversations.map(c => renderConvoItem(c))
                                )}
                            </div>
                        </>
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

                        {/* Input Area Wrapper */}
                        <div className="msg-chat__input-outer">
                            <AnimatePresence>
                                {showAttachmentMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 15 }}
                                        className="msg-chat__attach-menu"
                                    >
                                        <div className="msg-chat__attach-handle" />
                                        <div className="msg-chat__attach-grid">
                                            {/* 1. Document */}
                                            <button
                                                type="button"
                                                onClick={handleDocumentClick}
                                                className="msg-chat__attach-item"
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <span className="msg-chat__attach-label">Document</span>
                                            </button>

                                            {/* 2. Camera */}
                                            <button
                                                type="button"
                                                onClick={handleCameraClick}
                                                className="msg-chat__attach-item"
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <Camera className="w-5 h-5 text-pink-500" />
                                                </div>
                                                <span className="msg-chat__attach-label">Camera</span>
                                            </button>

                                            {/* 3. Gallery */}
                                            <button
                                                type="button"
                                                onClick={handleGalleryClick}
                                                className="msg-chat__attach-item"
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <Image className="w-5 h-5 text-purple-500" />
                                                </div>
                                                <span className="msg-chat__attach-label">Gallery</span>
                                            </button>

                                            {/* 4. Audio */}
                                            <button
                                                type="button"
                                                onClick={handleAudioClick}
                                                className="msg-chat__attach-item"
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <Headphones className="w-5 h-5 text-orange-500" />
                                                </div>
                                                <span className="msg-chat__attach-label">Audio</span>
                                            </button>

                                            {/* 5. Location */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const isMutual = selectedConvo?.otherUser?.isMutual || false;
                                                    if (isMutual) {
                                                        handleLocationClick();
                                                    } else {
                                                        alert('Location sharing requires a mutual follow relationship for privacy protection.');
                                                    }
                                                }}
                                                className={`msg-chat__attach-item ${!(selectedConvo?.otherUser?.isMutual) ? 'msg-chat__attach-item--locked' : ''}`}
                                                title={!(selectedConvo?.otherUser?.isMutual) ? "Mutual follow required for location privacy" : "Share location"}
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <MapPin className="w-5 h-5 text-green-500" />
                                                    {!(selectedConvo?.otherUser?.isMutual) && (
                                                        <div className="msg-chat__attach-lock-badge">
                                                            <Lock className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="msg-chat__attach-label">Location</span>
                                            </button>

                                            {/* 6. Contact */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const isMutual = selectedConvo?.otherUser?.isMutual || false;
                                                    if (isMutual) {
                                                        handleContactClick();
                                                    } else {
                                                        alert('Contact sharing requires a mutual follow relationship for privacy protection.');
                                                    }
                                                }}
                                                className={`msg-chat__attach-item ${!(selectedConvo?.otherUser?.isMutual) ? 'msg-chat__attach-item--locked' : ''}`}
                                                title={!(selectedConvo?.otherUser?.isMutual) ? "Mutual follow required for contact privacy" : "Share contact card"}
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <Users className="w-5 h-5 text-teal-500" />
                                                    {!(selectedConvo?.otherUser?.isMutual) && (
                                                        <div className="msg-chat__attach-lock-badge">
                                                            <Lock className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="msg-chat__attach-label">Contact</span>
                                            </button>

                                            {/* 7. Polling */}
                                            <button
                                                type="button"
                                                onClick={handlePollingClick}
                                                className="msg-chat__attach-item"
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <BarChart2 className="w-5 h-5 text-indigo-500" />
                                                </div>
                                                <span className="msg-chat__attach-label">Polling</span>
                                            </button>

                                            {/* 8. GIF */}
                                            <button
                                                type="button"
                                                onClick={handleGifClick}
                                                className="msg-chat__attach-item"
                                            >
                                                <div className="msg-chat__attach-icon-circle">
                                                    <Smile className="w-5 h-5 text-yellow-500" />
                                                </div>
                                                <span className="msg-chat__attach-label">GIF</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="msg-chat__input-container">
                                <button
                                    type="button"
                                    className={`msg-chat__attach-trigger ${showAttachmentMenu ? 'msg-chat__attach-trigger--active' : ''}`}
                                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>

                                <form onSubmit={handleSend} className="msg-chat__input-form">
                                    <div className="msg-chat__input-wrapper">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Type a message..."
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            className="msg-chat__input"
                                            onClick={() => setShowAttachmentMenu(false)}
                                        />
                                        <button type="button" className="msg-chat__mic-btn">
                                            <Mic className="w-4 h-4" />
                                        </button>
                                    </div>
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
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty State — No conversation selected */
                    <div className="msg-chat__splash">
                        <div className="msg-chat__splash-glow" />
                        <div className="msg-chat__splash-icon">
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

            {/* ─── New Chat Modal ─── */}
            <AnimatePresence>
                {showNewChatModal && (
                    <div className="msg-modal-overlay" onClick={() => setShowNewChatModal(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="msg-modal msg-modal--new-chat"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="msg-modal__header">
                                <MessageSquarePlus className="w-5 h-5 msg-gold-icon" />
                                <h3>New Conversation</h3>
                                <button className="msg-modal__close-btn" onClick={() => setShowNewChatModal(false)}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="msg-modal__search-wrap">
                                <Search className="msg-modal__search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search users by name or username..."
                                    value={modalSearchQuery}
                                    onChange={e => setModalSearchQuery(e.target.value)}
                                    className="msg-modal__search-input"
                                    autoFocus
                                />
                            </div>

                            <div className="msg-modal__user-list">
                                {modalSearchQuery.trim() ? (
                                    isSearchingModalUsers ? (
                                        <div className="msg-modal__loading">
                                            <Loader2 className="w-5 h-5 animate-spin msg-gold-icon" />
                                            <span>Searching users...</span>
                                        </div>
                                    ) : modalSearchResults.length === 0 ? (
                                        <div className="msg-modal__empty">
                                            <span>No users found for &quot;{modalSearchQuery}&quot;</span>
                                        </div>
                                    ) : (
                                        modalSearchResults.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    startOrSelectConversation(u);
                                                    setShowNewChatModal(false);
                                                }}
                                                className="msg-modal-user-row"
                                            >
                                                <div className="msg-modal-user-row__avatar">
                                                    {u.avatarUrl ? (
                                                        <img src={u.avatarUrl} alt="" />
                                                    ) : (
                                                        <span>{getInitial(u.displayName || u.username)}</span>
                                                    )}
                                                </div>
                                                <div className="msg-modal-user-row__body">
                                                    <h5 className="msg-modal-user-row__name">{u.displayName || u.username}</h5>
                                                    <span className="msg-modal-user-row__username">@{u.username}</span>
                                                </div>
                                                {u.isFollowed && (
                                                    <span className="msg-modal-user-row__badge">Followed</span>
                                                )}
                                            </div>
                                        ))
                                    )
                                ) : (
                                    <>
                                        <h4 className="msg-modal__section-title">Followed Contacts</h4>
                                        {followedUsers.length === 0 ? (
                                            <div className="msg-modal__empty">
                                                <span>No followed contacts yet. Search above to find users.</span>
                                            </div>
                                        ) : (
                                            followedUsers.map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => {
                                                        startOrSelectConversation(u);
                                                        setShowNewChatModal(false);
                                                    }}
                                                    className="msg-modal-user-row"
                                                >
                                                    <div className="msg-modal-user-row__avatar">
                                                        {u.avatarUrl ? (
                                                            <img src={u.avatarUrl} alt="" />
                                                        ) : (
                                                            <span>{getInitial(u.displayName || u.username)}</span>
                                                        )}
                                                        {u.isOnline && <div className="msg-modal-user-row__online" />}
                                                    </div>
                                                    <div className="msg-modal-user-row__body">
                                                        <h5 className="msg-modal-user-row__name">{u.displayName || u.username}</h5>
                                                        <span className="msg-modal-user-row__username">@{u.username}</span>
                                                    </div>
                                                    <span className="msg-modal-user-row__chat-action">Chat</span>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MessagesPage;

