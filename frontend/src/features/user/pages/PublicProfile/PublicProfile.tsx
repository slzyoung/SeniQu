/**
 * PublicProfile — Premium public user profile page
 * Accessible from Photography, Reels, Forum, AI sections
 * Supports Follow/Unfollow with real-time follower count updates
 */

import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { usePublicProfile, useFollowUser, useUnfollowUser } from '../../../../hooks/useUser';
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

    const { data: profile, isLoading, isError } = usePublicProfile(userId || '');
    const followUser = useFollowUser();
    const unfollowUser = useUnfollowUser();

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

    return (
        <div className="pp-page">
            {/* Navigation */}
            <div className="pp-nav">
                <button className="pp-nav-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft style={{ width: 20, height: 20 }} />
                </button>
                <button className="pp-nav-btn" onClick={handleShare}>
                    <Share2 style={{ width: 18, height: 18 }} />
                </button>
            </div>

            {/* Hero */}
            <div className="pp-hero">
                <div className="pp-hero-bg" />

                {/* Avatar */}
                <div className="pp-avatar-wrap">
                    <div className="pp-avatar-ring">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.displayName} />
                        ) : (
                            <div className="pp-avatar-fallback">{initial}</div>
                        )}
                    </div>
                    <div className="pp-verified">
                        <Check style={{ width: 12, height: 12 }} />
                    </div>
                </div>

                {/* Name */}
                <h1 className="pp-name">{profile.displayName || profile.username}</h1>
                {profile.username && <p className="pp-username">@{profile.username}</p>}
                <p className="pp-role">◈ {getRoleLabel(profile.userType)}</p>
                {profile.bio && <p className="pp-bio">{profile.bio}</p>}
            </div>

            {/* Stats */}
            <div className="pp-stats">
                <div className="pp-stat">
                    <div className="pp-stat-value">{formatCount(profile.followersCount)}</div>
                    <div className="pp-stat-label">Followers</div>
                </div>
                <div className="pp-stat">
                    <div className="pp-stat-value">{formatCount(profile.followingCount)}</div>
                    <div className="pp-stat-label">Following</div>
                </div>
                <div className="pp-stat">
                    <div className="pp-stat-value">{formatCount(profile.postsCount)}</div>
                    <div className="pp-stat-label">Posts</div>
                </div>
            </div>

            {/* Actions */}
            {!isOwnProfile && (
                <div className="pp-actions">
                    <button
                        className={`pp-btn-follow ${profile.isFollowing ? 'secondary' : 'primary'}`}
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
                    <button className="pp-btn-follow secondary" onClick={handleMessage}>
                        <MessageSquare style={{ width: 16, height: 16 }} /> Message
                    </button>
                </div>
            )}

            {isOwnProfile && (
                <div className="pp-actions">
                    <button className="pp-btn-follow primary" onClick={() => navigate('/dashboard/profile')}>
                        Edit Profile
                    </button>
                </div>
            )}

            {/* Social Links */}
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

            {/* Member Since */}
            <div className="pp-member-since">
                <Calendar style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 6 }} />
                Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
        </div>
    );
}
