/**
 * Profile Page — Premium Hero + Bottom Sheet Design
 * Collaboration Trip App + Web3 Seamless
 * Mobile-first, dark & light mode safe.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Edit2,
    Instagram,
    X,
    Loader2,
    Save,
    Send,
    MapPin,
    ChevronRight,
    Mail,
    Calendar,
    LogOut,
    Shield,
    Settings as SettingsIcon,
    Plus,
    Trash2,
    Upload,
    Image as ImageIcon,
    Eye,
    EyeOff,
    CheckCircle2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useCurrentUser, useUpdateProfile, useUserStats, useUploadAvatar, useUploadProfileBackground } from '../../../../hooks/useUser';
import { usePrivy } from '@privy-io/react-auth';
import UploadReelModal from '../../../reels/components/UploadReelModal';
import { photosService } from '../../../../services/photosService';
import { albumsService } from '../../../../services/albumsService';
import { AddArtModal } from './components/AddArtModal';
import { PhotoLightbox } from '../MyCollectionsPage/components/PhotoLightbox';
import { PhotoUpload } from '../MyCollectionsPage/components/PhotoUpload';
import './Profile.css';

// ============================================
// Real SVG Social Icons
// ============================================

const XLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
);

const InstagramLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);

const TelegramLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

// ============================================
// Mock Data — Unsplash + Sample
// ============================================

const MOCK_COVER = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80&auto=format';

const MOCK_TOKEN_THUMB = 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=200&q=80';

// Recent Visits — Museums, Galleries, Heritage Places
const MOCK_RECENT_VISITS = [
    { id: '1', name: 'Museum Nasional', location: 'Jakarta', date: 'Mar 2026', img: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400&q=80' },
    { id: '2', name: 'Uluwatu Temple', location: 'Bali', date: 'Feb 2026', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
    { id: '3', name: 'Borobudur', location: 'Yogyakarta', date: 'Jan 2026', img: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&q=80' },
    { id: '4', name: 'MACAN Museum', location: 'Jakarta', date: 'Dec 2025', img: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&q=80' },
];

// ============================================
// TYPES
// ============================================

type TabId = 'about' | 'arts' | 'settings';

// ============================================
// MAIN COMPONENT
// ============================================

export function Profile() {
    const { user: authUser } = useAuthStore();
    const { user: privyUser, logout } = usePrivy();
    const { data: user, isLoading: userLoading } = useCurrentUser();
    const { data: stats } = useUserStats();
    const updateProfile = useUpdateProfile();
    const uploadAvatar = useUploadAvatar();
    const uploadBackground = useUploadProfileBackground();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<TabId>('about');
    const [isEditing, setIsEditing] = useState(false);
    const [showUploadReel, setShowUploadReel] = useState(false);

    // Dynamic arts/collections states
    const [userPhotos, setUserPhotos] = useState<any[]>([]);
    const [userAlbums, setUserAlbums] = useState<any[]>([]);
    const [isLoadingArts, setIsLoadingArts] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addModalTab, setAddModalTab] = useState<'artwork' | 'collection'>('artwork');
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
    const [confirmDeleteCollection, setConfirmDeleteCollection] = useState<{ id: string; title: string } | null>(null);
    const [isDeletingCollection, setIsDeletingCollection] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
    const [albumItems, setAlbumItems] = useState<any[]>([]);
    const [loadingAlbumItems, setLoadingAlbumItems] = useState(false);

    // Add Item to Album states
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [addItemType, setAddItemType] = useState<'artwork' | 'photo'>('photo');
    const [addItemIsPublic, setAddItemIsPublic] = useState(false);
    const [addItemFile, setAddItemFile] = useState<File | null>(null);
    const [addItemPreview, setAddItemPreview] = useState<string | null>(null);
    const [addItemTitle, setAddItemTitle] = useState('');
    const [addItemDescription, setAddItemDescription] = useState('');
    const [addItemUploading, setAddItemUploading] = useState(false);
    const [addItemProgress, setAddItemProgress] = useState(0);
    const [addItemSuccess, setAddItemSuccess] = useState(false);
    const [addItemError, setAddItemError] = useState('');

    const displayUser = user || authUser;

    const renderEmptyUploadCard = (title: string, subtitle: string, onClick: () => void) => (
        <div className="pv2-art-grid">
            <div 
                onClick={onClick}
                className="pv2-upload-card"
            >
                <div className="pv2-upload-icon-wrap">
                    <Plus className="w-5 h-5 text-[var(--ph-gold,#C9A84C)]" />
                </div>
                <h4 className="pv2-upload-title">{title}</h4>
                <p className="pv2-upload-subtitle">{subtitle}</p>
            </div>
        </div>
    );

    const fetchArts = async () => {
        if (!displayUser?.id) return;
        setIsLoadingArts(true);
        try {
            const [photosRes, albumsRes] = await Promise.all([
                photosService.getPhotos({ userId: displayUser.id, limit: 50 }),
                albumsService.getUserAlbums(displayUser.id),
            ]);

            const photosData = Array.isArray((photosRes as any)?.data?.data)
                ? (photosRes as any).data.data
                : Array.isArray((photosRes as any)?.data)
                    ? (photosRes as any).data
                    : Array.isArray(photosRes)
                        ? photosRes
                        : [];

            const albumsData = Array.isArray((albumsRes as any)?.data?.data)
                ? (albumsRes as any).data.data
                : Array.isArray((albumsRes as any)?.data)
                    ? (albumsRes as any).data
                    : Array.isArray(albumsRes)
                        ? albumsRes
                        : [];

            setUserPhotos(photosData);
            setUserAlbums(albumsData);
        } catch (err) {
            console.error('Error fetching profile arts:', err);
        } finally {
            setIsLoadingArts(false);
        }
    };

    const resetAddItemForm = () => {
        setShowAddItemForm(false);
        setAddItemType('photo');
        setAddItemIsPublic(false);
        setAddItemFile(null);
        setAddItemPreview(null);
        setAddItemTitle('');
        setAddItemDescription('');
        setAddItemUploading(false);
        setAddItemProgress(0);
        setAddItemSuccess(false);
        setAddItemError('');
    };

    const handleAddItemFile = (f: File) => {
        if (!f.type.startsWith('image/')) {
            setAddItemError('Only image files are allowed');
            return;
        }
        if (f.size > 15 * 1024 * 1024) {
            setAddItemError('File must be under 15MB');
            return;
        }
        setAddItemError('');
        setAddItemFile(f);
        const reader = new FileReader();
        reader.onload = (e) => setAddItemPreview(e.target?.result as string);
        reader.readAsDataURL(f);
    };

    const handleAddItemToAlbum = async () => {
        if (!addItemFile || !addItemTitle.trim() || !selectedAlbum) return;
        setAddItemUploading(true);
        setAddItemError('');
        try {
            const albumId = selectedAlbum.id;
            // 1. Upload to CDN and add to album in one call
            await albumsService.uploadAlbumItem(
                albumId,
                addItemFile,
                {
                    title: addItemTitle.trim(),
                    description: addItemDescription.trim() || undefined,
                    itemType: addItemType, // 'photo' | 'artwork'
                    isPublic: addItemIsPublic,
                },
                (progress) => setAddItemProgress(progress)
            );

            // 2. Refresh album items
            const refreshed = await albumsService.getAlbumItems(albumId);
            const items = Array.isArray((refreshed as any)?.data)
                ? (refreshed as any).data
                : Array.isArray(refreshed)
                    ? refreshed
                    : [];
            setAlbumItems(items);

            setAddItemSuccess(true);
            setTimeout(() => {
                resetAddItemForm();
                fetchArts();
            }, 1500);
        } catch (err: any) {
            console.error('Failed to add item to album:', err);
            setAddItemError(err?.message || 'Failed to upload. Please try again.');
        } finally {
            setAddItemUploading(false);
        }
    };

    useEffect(() => {
        if (displayUser?.id) {
            fetchArts();
        }
    }, [displayUser?.id]);

    const handleLikePhoto = async (photoId: string) => {
        try {
            const result = await photosService.toggleLike(photoId);
            setUserPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, isLikedByMe: result.liked, likesCount: result.count } : p
            ));
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    };

    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        bio: '',
        twitter: '',
        instagram: '',
        telegram: '',
    });

    // Initialize form data when user loads
    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                username: user.username || '',
                bio: user.bio || '',
                twitter: user.socialLinks?.twitter || '',
                instagram: user.socialLinks?.instagram || '',
                telegram: user.socialLinks?.telegram || '',
            });
        }
    }, [user]);

    const handleSave = async () => {
        await updateProfile.mutateAsync({
            displayName: formData.displayName,
            bio: formData.bio,
            socialLinks: {
                twitter: formData.twitter || undefined,
                instagram: formData.instagram || undefined,
                telegram: formData.telegram || undefined,
            },
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                username: user.username || '',
                bio: user.bio || '',
                twitter: user.socialLinks?.twitter || '',
                instagram: user.socialLinks?.instagram || '',
                telegram: user.socialLinks?.telegram || '',
            });
        }
        setIsEditing(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { url } = await uploadAvatar.mutateAsync(file);
            await updateProfile.mutateAsync({ avatarUrl: url });
        } catch (error) {
            console.error('Failed to upload and update avatar:', error);
        }
    };

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { url } = await uploadBackground.mutateAsync(file);
            await updateProfile.mutateAsync({ profileBackgroundUrl: url });
        } catch (error) {
            console.error('Failed to upload and update background:', error);
        }
    };



    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            // handled
        }
    };

    // Get social avatar if user logged in via social providers
    const socialAvatar = (privyUser?.google as any)?.profilePictureUrl
        || (privyUser?.twitter as any)?.profilePictureUrl
        || (privyUser?.discord as any)?.profilePictureUrl;

    const finalAvatar = displayUser?.avatar || socialAvatar;

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    // Get external wallet for compact display


    // ============================================
    // LOADING STATE
    // ============================================

    if (userLoading) {
        return (
            <div className="profile-v2">
                <div className="pv2-skeleton-hero" />
                <div className="pv2-sheet">
                    <div className="pv2-sheet-handle"><span /></div>
                    <div className="pv2-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                        <Loader2 className="w-7 h-7 text-gold animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="profile-v2">
            {/* ========== HERO SECTION ========== */}
            <div className="pv2-hero">
                <img
                    src={displayUser?.profileBackgroundUrl || MOCK_COVER}
                    alt="Cover"
                    className="pv2-hero-img"
                    loading="eager"
                />
                <div className="pv2-hero-gradient" />

                {/* Edit / Save-Cancel buttons */}
                {isEditing ? (
                    <div className="pv2-hero-actions">
                        <button
                            className="pv2-hero-edit-btn"
                            onClick={() => backgroundInputRef.current?.click()}
                            disabled={uploadBackground.isPending}
                            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                            {uploadBackground.isPending ? (
                                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Camera style={{ width: 14, height: 14 }} />
                            )}
                            {uploadBackground.isPending ? 'Uploading...' : 'Change Cover'}
                        </button>
                        <button
                            className="pv2-btn-cancel"
                            onClick={handleCancel}
                            disabled={updateProfile.isPending}
                        >
                            <X style={{ width: 14, height: 14 }} /> Cancel
                        </button>
                        <button
                            className="pv2-btn-save"
                            onClick={handleSave}
                            disabled={updateProfile.isPending}
                        >
                            {updateProfile.isPending
                                ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                : <Save style={{ width: 14, height: 14 }} />
                            }
                            {updateProfile.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                ) : (
                    <div className="pv2-hero-actions">
                        <button className="pv2-hero-create-reel" onClick={() => setShowUploadReel(true)}>
                            <Plus style={{ width: 14, height: 14 }} /> Add Reel
                        </button>
                        <button className="pv2-hero-edit-btn" onClick={() => setIsEditing(true)}>
                            <Edit2 style={{ width: 14, height: 14 }} /> Edit
                        </button>
                    </div>
                )}

                {/* Identity — Avatar + Name */}
                <div className="pv2-hero-identity">
                    <div className="pv2-avatar-wrap">
                        <div className="pv2-avatar-ring">
                            {finalAvatar ? (
                                <img
                                    src={finalAvatar}
                                    alt={displayUser?.displayName || 'Avatar'}
                                />
                            ) : (
                                <div className="pv2-avatar-fallback">
                                    {getInitials(displayUser?.displayName || displayUser?.username || 'U')}
                                </div>
                            )}
                        </div>
                        {isEditing && (
                            <>
                                <button
                                    className="pv2-avatar-camera"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadAvatar.isPending}
                                >
                                    {uploadAvatar.isPending
                                        ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                        : <Camera style={{ width: 14, height: 14 }} />
                                    }
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleAvatarUpload}
                                />
                                <input
                                    type="file"
                                    ref={backgroundInputRef}
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleBackgroundUpload}
                                />
                            </>
                        )}
                    </div>

                    <h1 className="pv2-hero-name">
                        {displayUser?.displayName || displayUser?.username || 'Explorer'}
                    </h1>

                    <p className="pv2-hero-username">@{displayUser?.username || 'username'}</p>

                    <div className="pv2-hero-location">
                        <MapPin style={{ width: 13, height: 13, opacity: 0.7 }} />
                        Indonesia
                    </div>

                    {(displayUser?.isVerified || displayUser?.isPremium) && (
                        <div className="pv2-hero-badges">
                            {displayUser?.isVerified && (
                                <span className="pv2-badge pv2-badge--verified">✦ Verified</span>
                            )}
                            {displayUser?.isPremium && (
                                <span className="pv2-badge pv2-badge--premium">Premium</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ========== BOTTOM SHEET ========== */}
            <div className="pv2-sheet">
                <div className="pv2-sheet-handle"><span /></div>

                {/* Tab Navigation */}
                <div className="pv2-tabs">
                    {(['about', 'arts', 'settings'] as TabId[]).map((tab) => (
                        <button
                            key={tab}
                            className={`pv2-tab ${activeTab === tab ? 'pv2-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'arts' ? 'portfolio' : tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="pv2-content">
                    {/* ====== ABOUT TAB ====== */}
                    {activeTab === 'about' && (
                        <div className="pv2-fade-in">
                            {isEditing ? (
                                /* Edit Mode */
                                <>
                                    <div className="pv2-edit-field">
                                        <label className="pv2-edit-label">Display Name</label>
                                        <input
                                            type="text"
                                            className="pv2-edit-input"
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            placeholder="Your display name"
                                        />
                                    </div>

                                    <div className="pv2-edit-field">
                                        <label className="pv2-edit-label">Bio</label>
                                        <textarea
                                            className="pv2-edit-textarea"
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            placeholder="Tell us about yourself, your journey, your art..."
                                            rows={4}
                                            maxLength={500}
                                        />
                                        <p className="pv2-edit-char-count">{formData.bio.length}/500</p>
                                    </div>

                                    <div className="pv2-edit-field">
                                        <label className="pv2-edit-label">Social Links</label>
                                        <div className="pv2-edit-social-row">
                                            <div className="pv2-edit-social-icon">
                                                <XLogo style={{ width: 14, height: 14 }} />
                                            </div>
                                            <input
                                                type="text"
                                                className="pv2-edit-input"
                                                value={formData.twitter}
                                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value.replace(/^@/, '') })}
                                                placeholder="username"
                                            />
                                        </div>
                                        <div className="pv2-edit-social-row">
                                            <div className="pv2-edit-social-icon">
                                                <Instagram style={{ width: 14, height: 14 }} />
                                            </div>
                                            <input
                                                type="text"
                                                className="pv2-edit-input"
                                                value={formData.instagram}
                                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace(/^@/, '') })}
                                                placeholder="username"
                                            />
                                        </div>
                                        <div className="pv2-edit-social-row">
                                            <div className="pv2-edit-social-icon">
                                                <Send style={{ width: 14, height: 14 }} />
                                            </div>
                                            <input
                                                type="text"
                                                className="pv2-edit-input"
                                                value={formData.telegram}
                                                onChange={(e) => setFormData({ ...formData, telegram: e.target.value.replace(/^@/, '') })}
                                                placeholder="username"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* View Mode */
                                <>
                                    {/* Social Links — Centered */}
                                    {(displayUser?.socialLinks?.twitter ||
                                        displayUser?.socialLinks?.instagram ||
                                        displayUser?.socialLinks?.telegram) ? (
                                        <div className="pv2-socials-centered">
                                            {displayUser?.socialLinks?.twitter && (
                                                <a
                                                    href={`https://x.com/${displayUser.socialLinks.twitter}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pv2-social-circle pv2-social--x"
                                                    title={`@${displayUser.socialLinks.twitter}`}
                                                >
                                                    <XLogo />
                                                </a>
                                            )}
                                            {displayUser?.socialLinks?.instagram && (
                                                <a
                                                    href={`https://instagram.com/${displayUser.socialLinks.instagram}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pv2-social-circle pv2-social--ig"
                                                    title={`@${displayUser.socialLinks.instagram}`}
                                                >
                                                    <InstagramLogo />
                                                </a>
                                            )}
                                            {displayUser?.socialLinks?.telegram && (
                                                <a
                                                    href={`https://t.me/${displayUser.socialLinks.telegram}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="pv2-social-circle pv2-social--tg"
                                                    title={`@${displayUser.socialLinks.telegram}`}
                                                >
                                                    <TelegramLogo />
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="pv2-no-socials">No social links added yet</p>
                                    )}

                                    {/* Bio — Centered */}
                                    <p className={`pv2-bio-centered ${!displayUser?.bio ? 'pv2-bio--empty' : ''}`}>
                                        {displayUser?.bio || 'No bio yet. Tap Edit to tell the world about your journey.'}
                                    </p>

                                    {/* Stats */}
                                    <div className="pv2-stats">
                                        <div className="pv2-stat">
                                            <p className="pv2-stat-value">{stats?.bookmarksCount || 0}</p>
                                            <p className="pv2-stat-label">Bookmarks</p>
                                        </div>
                                        <div className="pv2-stat">
                                            <p className="pv2-stat-value">{stats?.albumsCount || 0}</p>
                                            <p className="pv2-stat-label">Albums</p>
                                        </div>
                                        <div className="pv2-stat">
                                            <p className="pv2-stat-value">{stats?.artworksCount || 0}</p>
                                            <p className="pv2-stat-label">Arts</p>
                                        </div>
                                    </div>

                                    {/* Recent Visits — Pro Trip Style */}
                                    <div className="pv2-section-header" style={{ marginTop: 4 }}>
                                        <h2 className="pv2-section-title">Recent Visits</h2>
                                        <button className="pv2-section-more">See All</button>
                                    </div>
                                    <div className="pv2-recent-visits">
                                        {MOCK_RECENT_VISITS.map((visit) => (
                                            <div key={visit.id} className="pv2-visit-card">
                                                <img src={visit.img} alt={visit.name} loading="lazy" />
                                                <span className="pv2-visit-date">{visit.date}</span>
                                                <div className="pv2-visit-overlay">
                                                    <p className="pv2-visit-name">{visit.name}</p>
                                                    <p className="pv2-visit-location">
                                                        <MapPin style={{ width: 10, height: 10 }} />
                                                        {visit.location}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ====== ARTS TAB ====== */}
                    {activeTab === 'arts' && (
                        <div className="pv2-fade-in space-y-6">
                            {/* Arts Summary Card */}
                            <div className="pv2-tokens-card">
                                <div className="pv2-tokens-info">
                                    <h3>My Portfolio</h3>
                                    <p>
                                        {userPhotos.length} Photography &bull; {userAlbums.length} Albums
                                    </p>
                                    <div className="pv2-tokens-balance">
                                        <div className="pv2-sol-icon">◎</div>
                                        <span className="pv2-tokens-amount">
                                            {userPhotos.length + userAlbums.length} Total Items
                                        </span>
                                    </div>
                                </div>
                                <div className="pv2-tokens-thumb">
                                    <img
                                        src={userPhotos[0]?.mediumUrl || userPhotos[0]?.thumbnailUrl || userPhotos[0]?.originalUrl || MOCK_TOKEN_THUMB}
                                        alt="Art Preview"
                                    />
                                </div>
                            </div>

                            {/* Photography Section */}
                            <div className="pv2-section-header mt-8">
                                <h2 className="pv2-section-title">Photography</h2>
                                <div className="flex items-center gap-2">
                                    {displayUser?.id === authUser?.id && (
                                        <button
                                            onClick={() => {
                                                setShowPhotoUpload(true);
                                            }}
                                            className="p-1.5 rounded-full bg-[var(--ph-gold,#C9A84C)] hover:opacity-90 text-[#121214] font-bold shadow-md transition-all flex items-center justify-center cursor-pointer"
                                            title="Upload Photography"
                                        >
                                            <Plus style={{ width: 14, height: 14 }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isLoadingArts ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-6 h-6 text-[var(--ph-gold,#C9A84C)] animate-spin" />
                                </div>
                            ) : userPhotos.length > 0 ? (
                                <div className="pv2-art-grid">
                                    {userPhotos.map((art) => (
                                        <div
                                            key={art.id}
                                            className="pv2-art-card cursor-pointer"
                                            onClick={() => setSelectedPhoto(art)}
                                        >
                                            <img src={art.mediumUrl || art.thumbnailUrl || art.originalUrl} alt={art.title} loading="lazy" />
                                            <div className="pv2-art-overlay">
                                                <p className="pv2-art-title">{art.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                renderEmptyUploadCard(
                                    "Upload Photography",
                                    "Share premium high-res photography",
                                    () => setShowPhotoUpload(true)
                                )
                            )}

                            {/* Collections Section — Personal albums (artworks, photos, digital art) */}
                            <div className="pv2-section-header mt-8">
                                <h2 className="pv2-section-title">My Albums</h2>
                                <div className="flex items-center gap-2">
                                    {displayUser?.id === authUser?.id && (
                                        <button
                                            onClick={() => {
                                                setAddModalTab('collection');
                                                setShowAddModal(true);
                                            }}
                                            className="p-1.5 rounded-full bg-[var(--ph-gold,#C9A84C)] hover:opacity-90 text-[#121214] font-bold shadow-md transition-all flex items-center justify-center cursor-pointer"
                                            title="Create New Album"
                                        >
                                            <Plus style={{ width: 14, height: 14 }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isLoadingArts ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-6 h-6 text-[var(--ph-gold,#C9A84C)] animate-spin" />
                                </div>
                            ) : (
                                (() => {
                                    const combinedCollections = userAlbums;

                                    return combinedCollections.length > 0 ? (
                                        <div className="pv2-art-grid">
                                            {combinedCollections.map((col) => {
                                                const coverImg = col.cover_url || col.coverUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';
                                                const title = col.title || 'Untitled Album';
                                                const description = col.description || 'Album';

                                                return (
                                                    <div 
                                                        key={col.id} 
                                                        className="pv2-art-card cursor-pointer relative group/col" 
                                                        onClick={async () => {
                                                            setSelectedAlbum({ ...col, coverImg, albumTitle: title, albumDescription: description });
                                                            setLoadingAlbumItems(true);
                                                            setAlbumItems([]);
                                                            try {
                                                                const items = await albumsService.getAlbumItems(col.id);
                                                                setAlbumItems(items || []);
                                                            } catch (err) {
                                                                 console.error('Failed to load album items:', err);
                                                            } finally {
                                                                setLoadingAlbumItems(false);
                                                            }
                                                        }}
                                                    >
                                                        <div className="pv2-collection-badge pv2-collection-badge--artwork">
                                                            Album
                                                        </div>
                                                        {/* Delete button — visible on hover, owner only */}
                                                        {displayUser?.id === authUser?.id && (
                                                            <button
                                                                className="pv2-collection-delete-btn"
                                                                title="Delete Album"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteCollection({ id: col.id, title });
                                                                }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <img
                                                            src={coverImg}
                                                            alt={title}
                                                            loading="lazy"
                                                        />
                                                        <div className="pv2-art-overlay">
                                                            <p className="pv2-art-title">{title}</p>
                                                            <p className="text-[10px] text-[#f4f4f5]/70 mt-0.5 line-clamp-1">{description}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        renderEmptyUploadCard(
                                            "Create Album",
                                            "Group your creations, artworks, photos, or digital art into albums",
                                            () => {
                                                setAddModalTab('collection');
                                                setShowAddModal(true);
                                            }
                                        )
                                    );
                                })()
                            )}
                        </div>
                    )}

                    {/* ====== SETTINGS TAB ====== */}
                    {activeTab === 'settings' && (
                        <div className="pv2-fade-in">
                            {/* Account Section */}
                            <div className="pv2-settings-section">
                                <p className="pv2-settings-label">Account</p>
                                <div className="pv2-settings-card">
                                    <div className="pv2-settings-item">
                                        <div className="pv2-settings-icon">
                                            <Mail />
                                        </div>
                                        <div className="pv2-settings-info">
                                            <p className="pv2-settings-title">Email</p>
                                            <p className="pv2-settings-desc">{displayUser?.email || 'Not set'}</p>
                                        </div>
                                        <span className="pv2-badge pv2-badge--verified" style={{ fontSize: 9, padding: '2px 8px' }}>Verified</span>
                                    </div>
                                    <div className="pv2-settings-item">
                                        <div className="pv2-settings-icon">
                                            <Calendar />
                                        </div>
                                        <div className="pv2-settings-info">
                                            <p className="pv2-settings-title">Member Since</p>
                                            <p className="pv2-settings-desc">
                                                {displayUser?.createdAt
                                                    ? new Date(displayUser.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pv2-settings-item">
                                        <div className="pv2-settings-icon">
                                            <Shield />
                                        </div>
                                        <div className="pv2-settings-info">
                                            <p className="pv2-settings-title">Username</p>
                                            <p className="pv2-settings-desc">@{displayUser?.username || 'not-set'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>



                            {/* Quick Actions */}
                            <div className="pv2-settings-section">
                                <p className="pv2-settings-label">Quick Actions</p>
                                <div className="pv2-settings-card">
                                    <div
                                        className="pv2-settings-item"
                                        onClick={() => { setActiveTab('about'); setIsEditing(true); }}
                                    >
                                        <div className="pv2-settings-icon">
                                            <Edit2 />
                                        </div>
                                        <div className="pv2-settings-info">
                                            <p className="pv2-settings-title">Edit Profile</p>
                                            <p className="pv2-settings-desc">Update your name, bio, and social links</p>
                                        </div>
                                        <ChevronRight className="pv2-settings-arrow" style={{ width: 16, height: 16 }} />
                                    </div>

                                    <div
                                        className="pv2-settings-item"
                                        onClick={() => window.location.href = '/dashboard/settings'}
                                    >
                                        <div className="pv2-settings-icon">
                                            <SettingsIcon />
                                        </div>
                                        <div className="pv2-settings-info">
                                            <p className="pv2-settings-title">App Settings</p>
                                            <p className="pv2-settings-desc">Theme, notifications, security</p>
                                        </div>
                                        <ChevronRight className="pv2-settings-arrow" style={{ width: 16, height: 16 }} />
                                    </div>

                                    <div
                                        className="pv2-settings-item pv2-settings-item--danger"
                                        onClick={handleLogout}
                                    >
                                        <div className="pv2-settings-icon">
                                            <LogOut />
                                        </div>
                                        <div className="pv2-settings-info">
                                            <p className="pv2-settings-title">Sign Out</p>
                                            <p className="pv2-settings-desc">Log out of your account</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showUploadReel && (
                <UploadReelModal onClose={() => setShowUploadReel(false)} />
            )}

            <AnimatePresence>
                {showAddModal && (
                    <AddArtModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={fetchArts}
                        initialTab={addModalTab}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPhotoUpload && (
                    <PhotoUpload
                        isOpen={showPhotoUpload}
                        onClose={() => setShowPhotoUpload(false)}
                        onUploadSuccess={() => {
                            setShowPhotoUpload(false);
                            fetchArts();
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedAlbum && (
                    <div className="pv2-confirm-modal-overlay" onClick={() => setSelectedAlbum(null)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="pv2-album-detail-card"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pv2-album-detail-header">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="flex items-center gap-2">
                                        {selectedAlbum.albumTitle}
                                    </h3>
                                    <p className="pv2-album-description">{selectedAlbum.albumDescription}</p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    {displayUser?.id === authUser?.id && (
                                        <button 
                                            onClick={() => setShowAddItemForm(!showAddItemForm)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ph-gold,#C9A84C)]/10 text-[var(--ph-gold,#C9A84C)] border border-[var(--ph-gold,#C9A84C)]/20 hover:bg-[var(--ph-gold,#C9A84C)]/25 transition-all text-xs font-bold"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {showAddItemForm ? 'View Items' : 'Add Item'}
                                        </button>
                                    )}
                                    <button 
                                        className="pv2-album-close-btn"
                                        onClick={() => {
                                            setSelectedAlbum(null);
                                            resetAddItemForm();
                                        }}
                                        aria-label="Close album details"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="pv2-album-detail-content">
                                {showAddItemForm ? (
                                    <div className="pv2-add-item-form space-y-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-[var(--ph-gold,#C9A84C)]" />
                                            Add New Item to Album
                                        </h4>

                                        {addItemError && (
                                            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-400 text-xs font-medium">
                                                {addItemError}
                                            </div>
                                        )}

                                        {addItemSuccess ? (
                                            <div className="py-8 text-center space-y-2">
                                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                                                <p className="text-sm font-bold text-white">Item added successfully!</p>
                                            </div>
                                        ) : addItemUploading ? (
                                            <div className="py-8 text-center space-y-3">
                                                <div className="w-8 h-8 border-2 border-[var(--ph-gold,#C9A84C)] border-t-transparent rounded-full animate-spin mx-auto" />
                                                <p className="text-xs text-zinc-400">Uploading item... {addItemProgress}%</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Drag and Drop Zone */}
                                                <div
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const f = e.dataTransfer.files[0];
                                                        if (f) handleAddItemFile(f);
                                                    }}
                                                    onClick={() => document.getElementById('album-item-file-input')?.click()}
                                                    className="border border-dashed border-zinc-700 hover:border-[var(--ph-gold,#C9A84C)]/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-950/20"
                                                >
                                                    {addItemPreview ? (
                                                        <div className="relative w-full max-h-40 overflow-hidden rounded-lg">
                                                            <img src={addItemPreview} alt="Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                                                            <p className="text-xs text-zinc-300 font-medium">Select or drag image file</p>
                                                            <p className="text-[10px] text-zinc-500">Supports JPEG, PNG, WebP — Up to 15MB</p>
                                                        </div>
                                                    )}
                                                    <input
                                                        id="album-item-file-input"
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            if (f) handleAddItemFile(f);
                                                        }}
                                                    />
                                                </div>

                                                {/* Title */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Item Title</label>
                                                    <input
                                                        type="text"
                                                        value={addItemTitle}
                                                        onChange={(e) => setAddItemTitle(e.target.value)}
                                                        placeholder="Enter item name..."
                                                        className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--ph-gold,#C9A84C)]/50"
                                                    />
                                                </div>

                                                {/* Description */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Description (Optional)</label>
                                                    <textarea
                                                        value={addItemDescription}
                                                        onChange={(e) => setAddItemDescription(e.target.value)}
                                                        placeholder="Describe this photo/artwork..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[var(--ph-gold,#C9A84C)]/50 resize-none"
                                                    />
                                                </div>

                                                {/* Item Type & Privacy row */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Item Type */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Type</label>
                                                        <select
                                                            value={addItemType}
                                                            onChange={(e) => setAddItemType(e.target.value as any)}
                                                            className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-[var(--ph-gold,#C9A84C)]/50"
                                                        >
                                                            <option value="photo">Photo</option>
                                                            <option value="artwork">Artwork / Digital Art</option>
                                                        </select>
                                                    </div>

                                                    {/* Privacy */}
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Privacy</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAddItemIsPublic(!addItemIsPublic)}
                                                            className={`w-full px-3 py-2 border rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                                addItemIsPublic 
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                                    : 'bg-zinc-800/40 border-zinc-800 text-zinc-400'
                                                            }`}
                                                        >
                                                            {addItemIsPublic ? (
                                                                <>
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    Public (Publish)
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <EyeOff className="w-3.5 h-3.5" />
                                                                    Private (Owner only)
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Action button */}
                                                <button
                                                    onClick={handleAddItemToAlbum}
                                                    disabled={!addItemFile || !addItemTitle.trim() || addItemUploading}
                                                    className="w-full py-2.5 bg-[var(--ph-gold,#C9A84C)] text-[#121214] rounded-lg font-bold text-xs shadow-md hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                                >
                                                    Add to Album
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : loadingAlbumItems ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-6 h-6 text-[var(--ph-gold,#C9A84C)] animate-spin" />
                                    </div>
                                ) : albumItems.length > 0 ? (
                                    <div className="pv2-album-grid">
                                        {albumItems.map((item: any) => {
                                            const itemTitle = item.title || item.name || 'Untitled';
                                            const itemImg = item.medium_url || item.mediumUrl || item.thumbnail_url || item.thumbnailUrl || item.original_url || item.originalUrl || item.coverImageUrl || item.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';
                                            const isPrivate = item.is_public === false || item.isPublic === false;
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    className="pv2-album-item-card relative group/item"
                                                    onClick={() => {
                                                        setSelectedPhoto({
                                                            ...item,
                                                            userId: item.userId || item.user_id || displayUser?.id || authUser?.id,
                                                            user: item.user || (displayUser ? { displayName: displayUser.displayName, avatarUrl: displayUser.avatar } : undefined),
                                                            originalUrl: item.originalUrl || item.original_url || itemImg,
                                                            mediumUrl: item.mediumUrl || item.medium_url || itemImg,
                                                            thumbnailUrl: item.thumbnailUrl || item.thumbnail_url || itemImg,
                                                            title: itemTitle,
                                                            description: item.description,
                                                        });
                                                    }}
                                                >
                                                    <img src={itemImg} alt={itemTitle} loading="lazy" />
                                                    {isPrivate && (
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-bold text-zinc-400 flex items-center gap-1">
                                                            <EyeOff className="w-2.5 h-2.5" />
                                                            Private
                                                        </div>
                                                    )}
                                                    <div className="pv2-album-item-overlay">
                                                        <span>{itemTitle}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-[#f4f4f5]/60 text-sm">
                                        No items in this album yet.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {confirmDeleteCollection && (
                    <div className="pv2-confirm-modal-overlay">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="pv2-confirm-modal-card"
                        >
                            <h3>Delete Album</h3>
                            <p>Are you sure you want to delete <strong>"{confirmDeleteCollection.title}"</strong>? This action cannot be undone.</p>
                            <div className="pv2-confirm-modal-actions">
                                <button 
                                    className="pv2-confirm-btn pv2-confirm-btn--cancel" 
                                    disabled={isDeletingCollection}
                                    onClick={() => setConfirmDeleteCollection(null)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="pv2-confirm-btn pv2-confirm-btn--danger" 
                                    disabled={isDeletingCollection}
                                    onClick={async () => {
                                        setIsDeletingCollection(true);
                                        try {
                                            await albumsService.deleteAlbum(confirmDeleteCollection.id);
                                            fetchArts();
                                            setConfirmDeleteCollection(null);
                                        } catch (err) {
                                            console.error('Failed to delete album:', err);
                                        } finally {
                                            setIsDeletingCollection(false);
                                        }
                                    }}
                                >
                                    {isDeletingCollection ? (
                                        <span className="flex items-center gap-1">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                                        </span>
                                    ) : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedPhoto && (
                    <PhotoLightbox
                        photo={selectedPhoto}
                        isOwner={displayUser?.id === authUser?.id}
                        onClose={() => setSelectedPhoto(null)}
                        onLike={handleLikePhoto}
                        onDelete={async (photoId) => {
                            if (selectedAlbum) {
                                try {
                                    await albumsService.deleteAlbumItem(selectedAlbum.id, photoId);
                                    setAlbumItems(prev => prev.filter(p => p.id !== photoId));
                                } catch (err) {
                                    console.error("Failed to delete album item:", err);
                                }
                            } else {
                                setUserPhotos(prev => prev.filter(p => p.id !== photoId));
                            }
                            setSelectedPhoto(null);
                        }}
                        onViewProfile={(uid) => {
                            setSelectedPhoto(null);
                            if (displayUser && uid !== displayUser.id) {
                                window.location.href = `/profile/${uid}`;
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default Profile;
