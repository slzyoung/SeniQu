/**
 * PublicProfile — Premium public user profile page
 * Accessible from Photography, Reels, Forum, AI sections
 * Supports Follow/Unfollow with real-time follower count updates
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    ArrowLeft,
    Share2,
    UserPlus,
    UserCheck,
    MessageSquare,
    Calendar,
    Check,
    Loader2,
    AlertCircle,
    LayoutGrid,
    Film,
    BookOpen,
    Bookmark,
} from 'lucide-react';
import { usePublicProfile, useFollowUser, useUnfollowUser } from '../../../../hooks/useUser';
import { usePublicArtistArtworks } from '../../../../hooks/useArtist';
import { useReelsFeed, useSavedReels } from '../../../../hooks/useReels';
import { useForumThreads } from '../../../../hooks/useForum';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useToast } from '../../../../stores/useNotificationStore';
import './PublicProfile.css';

// SVG social icons (inline for zero-dep)
const XIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);
const InstagramIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);
const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
);

function formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

function getRoleLabel(userType: string): string {
    switch (userType) {
        case 'ARTIST': return 'Artist';
        case 'COLLECTOR': return 'Collector';
        case 'INSTITUTION': return 'Institution';
        default: return 'Art Enthusiast';
    }
}

export default function PublicProfile() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<'artworks' | 'reels' | 'posts' | 'saved'>('artworks');

    const { data: profile, isLoading, isError } = usePublicProfile(userId || '');
    const followUser = useFollowUser();
    const unfollowUser = useUnfollowUser();

    // Content Queries
    const { data: artworksRes, isLoading: isArtworksLoading } = usePublicArtistArtworks(userId || '');
    const { data: reelsData, isLoading: isReelsLoading } = useReelsFeed(12, userId);
    const { data: threadsRes, isLoading: isThreadsLoading } = useForumThreads({ authorId: userId });
    const { data: savedReelsRes, isLoading: isSavedLoading } = useSavedReels();

    const handleFollow = () => {
        if (!currentUser) {
            toast.error('Login Required', 'Sign in to follow users');
            return;
        }
        if (!userId) return;

        if (profile?.isFollowing) {
            unfollowUser.mutate(userId);
        } else {
            followUser.mutate(userId);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: profile?.displayName || 'SeniQu Profile', url });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            toast.success('Copied!', 'Profile link copied to clipboard');
        }
    };

    const handleMessage = () => {
        if (!currentUser) {
            toast.error('Login Required', 'Sign in to send messages');
            return;
        }
        navigate('/dashboard/messages');
    };

    if (isLoading) {
        return (
            <div className="pp-page">
                <div className="pp-loading">
                    <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                    <span style={{ color: 'var(--text-muted, #888)', fontSize: 13 }}>Loading profile...</span>
                </div>
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div className="pp-page">
                <div className="pp-nav">
                    <button className="pp-nav-btn" onClick={() => navigate(-1)} style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--text-primary, #333)' }}>
                        <ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                </div>
                <div className="pp-error">
                    <AlertCircle style={{ width: 48, height: 48, color: '#C9A84C' }} />
                    <h3>User Not Found</h3>
                    <p>This profile may have been removed or the link is invalid.</p>
                </div>
            </div>
        );
    }

    const initial = (profile.displayName || profile.username || '?')[0]?.toUpperCase();
    const isFollowLoading = followUser.isPending || unfollowUser.isPending;
    const isOwnProfile = profile.isOwnProfile;

    const socialEntries = Object.entries(profile.socialLinks || {}).filter(([_, url]) => url);
    const socialIcons: Record<string, React.ReactNode> = {
        twitter: <XIcon />,
        instagram: <InstagramIcon />,
        telegram: <TelegramIcon />,
    };

    // Safely extract lists
    const artworksList = artworksRes?.data || [];
    const reelsList = reelsData?.pages.flatMap((page: any) => page.data || []) || [];
    const threadsList = threadsRes?.data || [];

    let savedReelsList: any[] = [];
    const savedRes: any = savedReelsRes;
    if (savedRes) {
        if (Array.isArray(savedRes)) {
            savedReelsList = savedRes;
        } else if (Array.isArray(savedRes.data)) {
            savedReelsList = savedRes.data;
        } else if (Array.isArray(savedRes.data?.data)) {
            savedReelsList = savedRes.data.data;
        }
    }

    return (
        <div className="pp-page">
            {/* Header Actions */}
            <div className="pp-nav">
                <button className="pp-nav-btn" onClick={() => navigate(-1)} aria-label="Go Back">
                    <ArrowLeft style={{ width: 20, height: 20 }} />
                </button>
                <button className="pp-nav-btn" onClick={handleShare} aria-label="Share Profile">
                    <Share2 style={{ width: 18, height: 18 }} />
                </button>
            </div>

            {/* Profile Header Block */}
            <div className="pp-header-card">
                {/* Banner / Cover */}
                <div className="pp-banner">
                    {profile.avatar ? (
                        <img src={profile.avatar} alt="Profile Cover" className="pp-banner-img blurred" />
                    ) : (
                        <img 
                            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" 
                            alt="Default Cover" 
                            className="pp-banner-img" 
                        />
                    )}
                    <div className="pp-banner-overlay" />
                </div>

                {/* Avatar Centered */}
                <div className="pp-avatar-wrap">
                    <div className="pp-avatar-ring">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.displayName} className="pp-avatar-img-core" />
                        ) : (
                            <div className="pp-avatar-fallback">{initial}</div>
                        )}
                    </div>
                    <div className="pp-verified">
                        <Check style={{ width: 12, height: 12 }} />
                    </div>
                </div>

                {/* Profile Identity */}
                <div className="pp-info">
                    <div className="pp-name-row">
                        <h1 className="pp-name">{profile.displayName || profile.username}</h1>
                    </div>
                    {profile.username && <p className="pp-username">@{profile.username}</p>}
                    <p className="pp-role-badge">◈ {getRoleLabel(profile.userType)} ◈</p>
                    {profile.bio && <p className="pp-bio">{profile.bio}</p>}
                </div>

                {/* Profile Stats */}
                <div className="pp-stats-row">
                    <div className="pp-stat-item">
                        <div className="pp-stat-num">{formatCount(profile.followersCount || 0)}</div>
                        <div className="pp-stat-lbl">Followers</div>
                    </div>
                    <div className="pp-stat-item">
                        <div className="pp-stat-num">{formatCount(profile.followingCount || 0)}</div>
                        <div className="pp-stat-lbl">Following</div>
                    </div>
                    <div className="pp-stat-item">
                        <div className="pp-stat-num">{formatCount(profile.postsCount || 0)}</div>
                        <div className="pp-stat-lbl">Posts</div>
                    </div>
                </div>

                {/* Profile Actions */}
                <div className="pp-actions-row">
                    {!isOwnProfile ? (
                        <>
                            <button
                                className={`pp-action-btn ${profile.isFollowing ? 'secondary' : 'primary'}`}
                                onClick={handleFollow}
                                disabled={isFollowLoading}
                            >
                                {isFollowLoading ? (
                                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                                ) : profile.isFollowing ? (
                                    <><UserCheck style={{ width: 16, height: 16 }} /> Following</>
                                ) : (
                                    <><UserPlus style={{ width: 16, height: 16 }} /> Follow</>
                                )}
                            </button>
                            <button className="pp-action-btn secondary" onClick={handleMessage}>
                                <MessageSquare style={{ width: 16, height: 16 }} /> Message
                            </button>
                        </>
                    ) : (
                        <button className="pp-action-btn primary full-width" onClick={() => navigate('/dashboard/profile')}>
                            Edit Profile
                        </button>
                    )}
                </div>

                {/* Social links & Member Info */}
                {socialEntries.length > 0 && (
                    <div className="pp-socials">
                        {socialEntries.map(([platform, url]) => (
                            <a
                                key={platform}
                                href={url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pp-social-btn"
                            >
                                {socialIcons[platform] || platform[0].toUpperCase()}
                            </a>
                        ))}
                    </div>
                )}

                <div className="pp-member-since">
                    <Calendar style={{ width: 13, height: 13, display: 'inline', verticalAlign: -2, marginRight: 5 }} />
                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Profile Tabs Navigation */}
            <div className="pp-tabs-bar">
                <button 
                    className={`pp-tab-btn ${activeTab === 'artworks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('artworks')}
                    aria-label="Artworks"
                >
                    <LayoutGrid style={{ width: 20, height: 20 }} />
                </button>
                <button 
                    className={`pp-tab-btn ${activeTab === 'reels' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reels')}
                    aria-label="Reels"
                >
                    <Film style={{ width: 20, height: 20 }} />
                </button>
                <button 
                    className={`pp-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                    aria-label="Forum Posts"
                >
                    <BookOpen style={{ width: 20, height: 20 }} />
                </button>
                {isOwnProfile && (
                    <button 
                        className={`pp-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                        aria-label="Saved Reels"
                    >
                        <Bookmark style={{ width: 20, height: 20 }} />
                    </button>
                )}
            </div>

            {/* Tabs Content */}
            <div className="pp-tab-viewport">
                {activeTab === 'artworks' && (
                    <div className="pp-tab-content">
                        {isArtworksLoading ? (
                            <div className="pp-tab-loading">
                                <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                            </div>
                        ) : artworksList.length > 0 ? (
                            <div className="pp-artworks-grid">
                                {artworksList.map((art: any) => (
                                    <div 
                                        key={art.id} 
                                        className="pp-artwork-card"
                                        onClick={() => navigate(`/marketplace/artwork/${art.id}`)}
                                    >
                                        <img src={art.imageUrl || art.thumbnailUrl} alt={art.title} className="pp-artwork-img" />
                                        <div className="pp-artwork-overlay">
                                            <span className="pp-artwork-title">{art.title}</span>
                                            <span className="pp-artwork-price">
                                                {art.price ? `${art.price} SOL` : 'Not for sale'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pp-empty-state">
                                <LayoutGrid style={{ width: 36, height: 36, opacity: 0.4 }} />
                                <p>No artworks published yet</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reels' && (
                    <div className="pp-tab-content">
                        {isReelsLoading ? (
                            <div className="pp-tab-loading">
                                <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                            </div>
                        ) : reelsList.length > 0 ? (
                            <div className="pp-reels-grid">
                                {reelsList.map((reel: any) => (
                                    <div 
                                        key={reel.id} 
                                        className="pp-reel-card"
                                        onClick={() => navigate('/reels', { state: { initialReelId: reel.id } })}
                                    >
                                        <img src={reel.thumbnailUrl || reel.thumbnail_url} alt={reel.caption} className="pp-reel-thumb" />
                                        <div className="pp-reel-overlay">
                                            <Film style={{ width: 14, height: 14 }} />
                                            <span>{formatCount(reel.viewCount ?? reel.view_count ?? 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pp-empty-state">
                                <Film style={{ width: 36, height: 36, opacity: 0.4 }} />
                                <p>No reels shared yet</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="pp-tab-content">
                        {isThreadsLoading ? (
                            <div className="pp-tab-loading">
                                <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                            </div>
                        ) : threadsList.length > 0 ? (
                            <div className="pp-posts-list">
                                {threadsList.map((thread: any) => (
                                    <div 
                                        key={thread.id} 
                                        className="pp-post-card"
                                        onClick={() => navigate(`/forum/thread/${thread.slug || thread.id}`)}
                                    >
                                        <div className="pp-post-header">
                                            <span className="pp-post-category">{thread.category?.name}</span>
                                            <span className="pp-post-time">
                                                {new Date(thread.created_at || thread.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h4 className="pp-post-title">{thread.title}</h4>
                                        <div className="pp-post-footer">
                                            <span>{formatCount(thread.likes || 0)} likes</span>
                                            <span>•</span>
                                            <span>{formatCount(thread.reply_count || thread.replies || 0)} replies</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pp-empty-state">
                                <BookOpen style={{ width: 36, height: 36, opacity: 0.4 }} />
                                <p>No forum discussions started yet</p>
                            </div>
                        )}
                    </div>
                )}

                {isOwnProfile && activeTab === 'saved' && (
                    <div className="pp-tab-content">
                        {isSavedLoading ? (
                            <div className="pp-tab-loading">
                                <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                            </div>
                        ) : savedReelsList.length > 0 ? (
                            <div className="pp-reels-grid">
                                {savedReelsList.map((reel: any) => (
                                    <div 
                                        key={reel.id} 
                                        className="pp-reel-card"
                                        onClick={() => navigate('/reels', { state: { initialReelId: reel.id } })}
                                    >
                                        <img src={reel.thumbnailUrl || reel.thumbnail_url} alt={reel.caption} className="pp-reel-thumb" />
                                        <div className="pp-reel-overlay">
                                            <Film style={{ width: 14, height: 14 }} />
                                            <span>{formatCount(reel.viewCount ?? reel.view_count ?? 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pp-empty-state">
                                <Bookmark style={{ width: 36, height: 36, opacity: 0.4 }} />
                                <p>No bookmarked reels yet</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
