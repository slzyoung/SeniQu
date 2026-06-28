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
    Film,
    BookOpen,
    Bookmark,
    Folder,
    Camera,
    X,
    EyeOff,
} from 'lucide-react';
import { usePublicProfile, useFollowUser, useUnfollowUser } from '../../../../hooks/useUser';
import { useReelsFeed, useSavedReels } from '../../../../hooks/useReels';
import { useForumThreads } from '../../../../hooks/useForum';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useToast } from '../../../../stores/useNotificationStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { photosService } from '../../../../services/photosService';
import { albumsService } from '../../../../services/albumsService';
import { PhotoLightbox } from '../MyCollectionsPage/components/PhotoLightbox';
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

    const [activeTab, setActiveTab] = useState<'photography' | 'reels' | 'posts' | 'saved' | 'albums'>('photography');

    const { data: profile, isLoading, isError } = usePublicProfile(userId || '');
    const followUser = useFollowUser();
    const unfollowUser = useUnfollowUser();

    const queryClient = useQueryClient();
    const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

    // Album detail states
    const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
    const [albumItems, setAlbumItems] = useState<any[]>([]);
    const [loadingAlbumItems, setLoadingAlbumItems] = useState(false);

    // Content Queries
    const { data: photosRes, isLoading: isPhotosLoading } = useQuery({
        queryKey: ['photos', { userId }],
        queryFn: () => photosService.getPhotos({ userId }),
        enabled: !!userId,
    });
    const { data: reelsData, isLoading: isReelsLoading } = useReelsFeed(12, userId);
    const { data: threadsRes, isLoading: isThreadsLoading } = useForumThreads({ authorId: userId });
    const { data: savedReelsRes, isLoading: isSavedLoading } = useSavedReels();

    const { data: albumsRes, isLoading: isAlbumsLoading } = useQuery({
        queryKey: ['userAlbums', { userId }],
        queryFn: () => albumsService.getUserAlbums(userId || ''),
        enabled: !!userId,
    });



    const handleLikePhoto = async (photoId: string) => {
        try {
            await photosService.toggleLike(photoId);
            queryClient.invalidateQueries({ queryKey: ['photos', { userId }] });
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    };

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

    const photosList = Array.isArray((photosRes as any)?.data?.data)
        ? (photosRes as any).data.data
        : Array.isArray((photosRes as any)?.data)
            ? (photosRes as any).data
            : Array.isArray(photosRes)
                ? photosRes
                : [];
    const reelsList = reelsData?.pages.flatMap((page: any) => page.data || []) || [];
    const threadsList = Array.isArray((threadsRes as any)?.data?.data)
        ? (threadsRes as any).data.data
        : Array.isArray((threadsRes as any)?.data)
            ? (threadsRes as any).data
            : Array.isArray(threadsRes)
                ? threadsRes
                : [];

    const rawUserAlbums = Array.isArray((albumsRes as any)?.data?.data)
        ? (albumsRes as any).data.data
        : Array.isArray((albumsRes as any)?.data)
            ? (albumsRes as any).data
            : Array.isArray(albumsRes)
                ? albumsRes
                : [];
    const userAlbums = rawUserAlbums.filter((col: any) => col.is_public !== false && col.isPublic !== false);

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
                    {profile.profileBackgroundUrl || profile.profile_background_url ? (
                        <img src={profile.profileBackgroundUrl || profile.profile_background_url} alt="Profile Cover" className="pp-banner-img" />
                    ) : profile.avatar ? (
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
                    className={`pp-tab-btn ${activeTab === 'photography' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('photography'); }}
                    aria-label="Photography"
                >
                    <Camera style={{ width: 20, height: 20 }} />
                </button>
                <button 
                    className={`pp-tab-btn ${activeTab === 'reels' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('reels'); }}
                    aria-label="Reels"
                >
                    <Film style={{ width: 20, height: 20 }} />
                </button>
                <button 
                    className={`pp-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('posts'); }}
                    aria-label="Forum Posts"
                >
                    <BookOpen style={{ width: 20, height: 20 }} />
                </button>
                <button 
                    className={`pp-tab-btn ${activeTab === 'albums' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('albums'); }}
                    aria-label="Albums"
                >
                    <Folder style={{ width: 20, height: 20 }} />
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
                {activeTab === 'photography' && (
                    <div className="pp-tab-content">
                        {isPhotosLoading ? (
                            <div className="pp-tab-loading">
                                <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                            </div>
                        ) : photosList.length > 0 ? (
                            <div className="pp-artworks-grid">
                                {photosList.map((item: any) => {
                                    const imageUrl = item.mediumUrl || item.thumbnailUrl || item.originalUrl || item.imageUrl;
                                    return (
                                        <div 
                                            key={item.id} 
                                            className="pp-artwork-card cursor-pointer"
                                            onClick={() => {
                                                setSelectedPhoto(item);
                                            }}
                                        >
                                            <img src={imageUrl} alt={item.title} className="pp-artwork-img" />
                                            <div className="pp-artwork-overlay">
                                                <span className="pp-artwork-title">{item.title}</span>
                                                <span className="pp-artwork-price">
                                                    {item.price ? `${item.price} SOL` : 'Not for sale'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="pp-empty-state">
                                <Camera style={{ width: 36, height: 36, opacity: 0.4 }} />
                                <p>No photography published yet</p>
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
                                        onClick={() => navigate(`/community/thread/${thread.id}`)}
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

                {activeTab === 'albums' && (
                    <div className="pp-tab-content px-4 py-4">
                        {isAlbumsLoading ? (
                            <div className="pp-tab-loading">
                                <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                            </div>
                        ) : userAlbums.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {userAlbums.map((col: any) => {
                                    const coverImg = col.cover_url || col.coverUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';
                                    const title = col.title || 'Untitled Album';
                                    const description = col.description || 'Album';
                                    const countText = `${col.item_count || col.itemCount || 0} items`;

                                    return (
                                        <div 
                                            key={col.id} 
                                            className="pp-artwork-card relative cursor-pointer"
                                            onClick={async () => {
                                                setSelectedAlbum({ ...col, coverImg, albumTitle: title, albumDescription: description });
                                                setLoadingAlbumItems(true);
                                                setAlbumItems([]);
                                                try {
                                                    const items = await albumsService.getAlbumItems(col.id);
                                                    const parsed = Array.isArray((items as any)?.data)
                                                        ? (items as any).data
                                                        : Array.isArray(items) ? items : [];
                                                    setAlbumItems(parsed);
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
                                            <img 
                                                src={coverImg} 
                                                alt={title} 
                                                className="pp-artwork-img" 
                                            />
                                            <div className="pp-artwork-overlay opacity-100 flex flex-col justify-end p-3" style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.2) 70%)' }}>
                                                <span className="pp-artwork-title text-sm font-bold text-white block truncate">{title}</span>
                                                <span className="text-[10px] text-[#f4f4f5]/70 block truncate mt-0.5">{description}</span>
                                                <span className="text-[9px] text-[var(--ph-gold,#C9A84C)] font-bold block mt-1">{countText}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="pp-empty-state py-12 border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl">
                                <Folder style={{ width: 36, height: 36, opacity: 0.3 }} />
                                <p className="text-xs">No albums published yet</p>
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

            <AnimatePresence>
                {selectedPhoto && (
                    <PhotoLightbox
                        photo={selectedPhoto}
                        onClose={() => setSelectedPhoto(null)}
                        onLike={handleLikePhoto}
                        onViewProfile={(uid) => {
                            setSelectedPhoto(null);
                            if (uid !== userId) {
                                navigate(`/profile/${uid}`);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Album Detail Overlay */}
            <AnimatePresence>
                {selectedAlbum && (
                    <div 
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md"
                        onClick={() => setSelectedAlbum(null)}
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-2xl flex flex-col"
                            style={{ background: 'linear-gradient(135deg, #18181b 0%, #1c1c20 100%)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="text-base font-bold text-white truncate">{selectedAlbum.albumTitle}</h3>
                                    <p className="text-xs text-[#f4f4f5]/50 mt-0.5 truncate">{selectedAlbum.albumDescription}</p>
                                </div>
                                <button 
                                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-[#f4f4f5]/60"
                                    onClick={() => setSelectedAlbum(null)}
                                    aria-label="Close album details"
                                >
                                    <X style={{ width: 20, height: 20 }} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                                {loadingAlbumItems ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#C9A84C' }} />
                                    </div>
                                ) : albumItems.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {albumItems.map((item: any) => {
                                            const itemTitle = item.title || 'Untitled';
                                            const itemImg = item.medium_url || item.mediumUrl || item.thumbnail_url || item.thumbnailUrl || item.original_url || item.originalUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80';
                                            const isPrivate = item.is_public === false || item.isPublic === false;
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    className="relative rounded-lg overflow-hidden cursor-pointer group aspect-square"
                                                    onClick={() => {
                                                        setSelectedPhoto({
                                                            ...item,
                                                            originalUrl: item.originalUrl || item.original_url,
                                                            mediumUrl: item.mediumUrl || item.medium_url,
                                                            thumbnailUrl: item.thumbnailUrl || item.thumbnail_url,
                                                            title: item.title,
                                                            description: item.description,
                                                        });
                                                    }}
                                                >
                                                    <img src={itemImg} alt={itemTitle} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    {isPrivate && (
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[8px] font-bold text-zinc-400 flex items-center gap-1">
                                                            <EyeOff style={{ width: 10, height: 10 }} />
                                                            Private
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                                                        <span className="text-[10px] font-bold text-white truncate">{itemTitle}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-[#f4f4f5]/40 text-sm">
                                        No items in this album yet.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
