/**
 * Profile Page — Premium Hero + Bottom Sheet Design
 * Collaboration Trip App + Web3 Seamless
 * Mobile-first, dark & light mode safe.
 */

import { useState, useEffect, useRef } from 'react';
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
    Wallet,
    LogOut,
    Shield,
    Copy,
    Check,
    Image as ImageIcon,
    Settings as SettingsIcon,
    User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useCurrentUser, useUpdateProfile, useUserStats, useUploadAvatar } from '../../../../hooks/useUser';
import { usePrivy } from '@privy-io/react-auth';
import { ConnectedWallets } from '../../components/ConnectedWallets';
import { WalletSummaryCard } from '../../components/WalletSummaryCard';
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

const MOCK_ARTS = [
    { id: '1', title: 'Bali Temple Sunrise', img: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400&q=80' },
    { id: '2', title: 'Batik Patterns', img: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=400&q=80' },
    { id: '3', title: 'Wayang Culture', img: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=400&q=80' },
    { id: '4', title: 'Komodo Heritage', img: 'https://images.unsplash.com/photo-1570789210967-2cac24e2beee?w=400&q=80' },
    { id: '5', title: 'Raja Ampat Dive', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80' },
    { id: '6', title: 'Borobudur Dawn', img: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&q=80' },
];

const MOCK_TOKEN_THUMB = 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=200&q=80';

// Recent Visits — Museums, Galleries, Heritage Places
const MOCK_RECENT_VISITS = [
    { id: '1', name: 'Museum Nasional', location: 'Jakarta', date: 'Mar 2026', img: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400&q=80' },
    { id: '2', name: 'Uluwatu Temple', location: 'Bali', date: 'Feb 2026', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
    { id: '3', name: 'Borobudur', location: 'Yogyakarta', date: 'Jan 2026', img: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&q=80' },
    { id: '4', name: 'MACAN Museum', location: 'Jakarta', date: 'Dec 2025', img: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&q=80' },
];

// Chain logos
const CHAIN_LOGOS: Record<string, string> = {
    solana: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    ethereum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
};

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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<TabId>('about');
    const [isEditing, setIsEditing] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
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

    const handleCopyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            // handled
        }
    };

    const displayUser = user || authUser;

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
    const getExternalWallet = () => {
        if (!displayUser?.wallets) return null;
        const loginWallet = displayUser.wallets.find((w: any) => {
            const isEmbedded = w.isEmbedded || w.is_embedded || w.privy_wallet_id || w.walletClientType === 'privy';
            return !isEmbedded;
        });
        if (!loginWallet) return null;
        const walletAny = loginWallet as any;
        return {
            chain: walletAny.chainType || walletAny.chain_type || 'solana',
            address: walletAny.address || walletAny.wallet_address,
        };
    };

    const externalWallet = getExternalWallet();

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
                    src={MOCK_COVER}
                    alt="Cover"
                    className="pv2-hero-img"
                    loading="eager"
                />
                <div className="pv2-hero-gradient" />

                {/* Edit / Save-Cancel buttons */}
                {isEditing ? (
                    <div className="pv2-hero-actions">
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
                    <button className="pv2-hero-edit" onClick={() => setIsEditing(true)}>
                        <Edit2 style={{ width: 14, height: 14 }} /> Edit
                    </button>
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
                                <span className="pv2-badge pv2-badge--premium">★ Premium</span>
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
                            {tab}
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
                                            <p className="pv2-stat-value">{stats?.collectionsCount || 0}</p>
                                            <p className="pv2-stat-label">Collections</p>
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
                        <div className="pv2-fade-in">
                            {/* Arts Summary Card */}
                            <div className="pv2-tokens-card">
                                <div className="pv2-tokens-info">
                                    <h3>My Arts</h3>
                                    <p>{stats?.artworksCount || 0} Art Objects</p>
                                    <div className="pv2-tokens-balance">
                                        <div className="pv2-sol-icon">◎</div>
                                        <span className="pv2-tokens-amount">
                                            {stats?.artworksCount || 0} Artworks
                                        </span>
                                    </div>
                                </div>
                                <div className="pv2-tokens-thumb">
                                    <img src={MOCK_TOKEN_THUMB} alt="Art Preview" />
                                </div>
                            </div>

                            {/* Art Grid */}
                            <div className="pv2-section-header">
                                <h2 className="pv2-section-title">Collection</h2>
                                <button className="pv2-section-more">View All</button>
                            </div>

                            <div className="pv2-art-grid">
                                {MOCK_ARTS.map((art) => (
                                    <div key={art.id} className="pv2-art-card">
                                        <img src={art.img} alt={art.title} loading="lazy" />
                                        <div className="pv2-art-overlay">
                                            <p className="pv2-art-title">{art.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {MOCK_ARTS.length === 0 && (
                                <div className="pv2-empty">
                                    <ImageIcon className="pv2-empty-icon" />
                                    <h3 className="pv2-empty-title">No Art Yet</h3>
                                    <p className="pv2-empty-text">Your collected and created artworks will appear here.</p>
                                </div>
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
        </div>
    );
}

export default Profile;
