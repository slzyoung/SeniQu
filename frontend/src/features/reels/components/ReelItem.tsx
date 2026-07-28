import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, Trash2, Bookmark, MoreVertical, Music, X, Plus, MapPin } from 'lucide-react';
import { useToggleReelLike, useToggleReelReshare, useRecordReelView, useDeleteReel } from '../../../hooks/useReels';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useToast } from '../../../stores/useNotificationStore';
import { useAuthModalStore } from '../../../stores/useAuthModalStore';
import { useFollowUser, useUnfollowUser } from '../../../hooks/useUser';
import Avatar from '../../../components/ui/Avatar';
import { useNavigate } from 'react-router-dom';

function formatCount(n: number): string {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

function timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd';
    return Math.floor(diff / 604800) + 'w';
}

interface Props {
    reel: any;
    isActive: boolean;
    isMuted: boolean;
    onMuteToggle: () => void;
    onOpenComments: () => void;
    onShare: () => void;
    observerRef: (el: HTMLDivElement | null) => void;
    onCreateClick?: () => void;
}

export default function ReelItem({ reel, isActive, isMuted, onMuteToggle, onOpenComments, onShare, observerRef, onCreateClick }: Props) {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioTrackRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isFollowing, setIsFollowing] = useState(reel.is_following || reel.isFollowing || false);
    const [showOptions, setShowOptions] = useState(false);
    const lastTapRef = useRef(0);
    const viewRecordedRef = useRef(false);

    useEffect(() => {
        setIsFollowing(reel.is_following || reel.isFollowing || false);
    }, [reel.is_following, reel.isFollowing]);

    const toggleLike = useToggleReelLike();
    const toggleReshare = useToggleReelReshare();
    const deleteReel = useDeleteReel();
    const recordView = useRecordReelView();
    const followUser = useFollowUser();
    const unfollowUser = useUnfollowUser();
    const { user } = useAuthStore();
    const { openAuthModal } = useAuthModalStore();
    const toast = useToast();

    // Resolve snake_case vs camelCase from DB
    const videoUrl = reel.video_url || reel.videoUrl || '';
    const thumbUrl = reel.thumbnail_url || reel.thumbnailUrl || '';
    const userName = reel.user?.display_name || reel.user?.displayName || 'Anonymous';
    const userAvatar = reel.user?.avatar_url || reel.user?.avatarUrl;
    const createdAt = reel.created_at || reel.createdAt || '';
    const likeCount = reel.like_count ?? reel.likeCount ?? 0;
    const commentCount = reel.comment_count ?? reel.commentCount ?? 0;

    const shareCount = reel.share_count ?? reel.shareCount ?? 0;
    const viewCount = reel.view_count ?? reel.viewCount ?? 0;
    const isLiked = reel.is_liked || reel.isLiked || false;
    const isReshared = reel.is_reshared || reel.isReshared || false;
    const reelUserId = reel.user_id || reel.userId;
    const dur = reel.duration || 0;

    // Parse audio metadata & editing parameters
    const audioMeta = reel.audio_metadata || reel.audioMetadata || {};
    const editing = audioMeta.editing || {};
    const selectedFilter = editing.filter || 'none';
    const playbackSpeed = editing.playbackSpeed || 1;
    const aspectRatio = editing.aspectRatio || '9/16';
    const trimStart = editing.trimStart || 0;
    const trimEnd = editing.trimEnd || 60;
    const originalVolume = editing.originalVolume ?? 1;

    const trackTitle = audioMeta.title || 'Soundtrack';
    const trackArtist = audioMeta.artist || 'Artist';

    const getFilterCss = (filterName: string) => {
        switch (filterName) {
            case 'cinematic': return 'contrast(1.2) brightness(0.95) saturate(1.2) sepia(0.05)';
            case 'vintage': return 'contrast(0.9) brightness(1.05) saturate(0.85) sepia(0.35) hue-rotate(5deg)';
            case 'mono': return 'grayscale(1) contrast(1.1) brightness(0.95)';
            case 'warm': return 'sepia(0.15) saturate(1.1) hue-rotate(5deg)';
            case 'cool': return 'hue-rotate(-10deg) saturate(0.95) brightness(1.02)';
            case 'vibrant': return 'contrast(1.1) saturate(1.4) brightness(1.0)';
            default: return 'none';
        }
    };

    // Auto-play/pause on visibility
    useEffect(() => {
        if (!videoRef.current) return;
        if (isActive) {
            videoRef.current.currentTime = trimStart;
            viewRecordedRef.current = false;
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive, trimStart]);

    // Sync muted state, speed, and volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted || originalVolume === 0 || !!audioMeta.url;
            videoRef.current.volume = originalVolume * (isMuted ? 0 : 1);
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [isMuted, originalVolume, playbackSpeed, isActive, audioMeta.url]);

    // Sync external soundtrack
    useEffect(() => {
        if (!audioMeta.url) {
            if (audioTrackRef.current) {
                audioTrackRef.current.pause();
                audioTrackRef.current = null;
            }
            return;
        }

        // Initialize or update source
        if (!audioTrackRef.current) {
            audioTrackRef.current = new Audio(audioMeta.url);
            audioTrackRef.current.loop = false;
        } else if (audioTrackRef.current.src !== audioMeta.url) {
            audioTrackRef.current.pause();
            audioTrackRef.current.src = audioMeta.url;
            audioTrackRef.current.load();
            audioTrackRef.current.loop = false;
        }

        const audio = audioTrackRef.current;
        audio.volume = (audioMeta.volume ?? 0.8) * (isMuted ? 0 : 1);

        const syncAndPlay = () => {
            const targetTime = (audioMeta.offset || 0) + (videoRef.current?.currentTime || 0) - trimStart;
            if (audio.readyState >= 1) { // HAVE_METADATA or higher
                try {
                    audio.currentTime = targetTime;
                } catch (e) {
                    console.warn("Failed to set audio currentTime:", e);
                }
            } else {
                const onLoadedMetadata = () => {
                    try {
                        audio.currentTime = targetTime;
                    } catch (e) {
                        console.warn("Failed to set audio currentTime on loadedmetadata:", e);
                    }
                    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                };
                audio.addEventListener('loadedmetadata', onLoadedMetadata);
            }
            audio.play().catch(err => console.warn("Failed to play audio:", err));
        };

        if (isActive && isPlaying) {
            syncAndPlay();
        } else {
            audio.pause();
        }

        return () => {
            audio.pause();
        };
    }, [isActive, isPlaying, isMuted, audioMeta.url, audioMeta.offset, audioMeta.volume, trimStart]);

    // Handle loop limits for trimmed video and sync loops/seeks
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let prevTime = video.currentTime;

        const handleTimeUpdateLoop = () => {
            // Trim bounds enforcement
            if (video.currentTime < trimStart) {
                video.currentTime = trimStart;
            }
            let looped = false;
            if (video.currentTime >= trimEnd) {
                video.currentTime = trimStart;
                looped = true;
            }

            // Natural loop detection (currentTime jumping backwards)
            if (video.currentTime < prevTime && prevTime - video.currentTime > 1) {
                looped = true;
            }
            prevTime = video.currentTime;

            if (looped) {
                if (audioTrackRef.current) {
                    try {
                        audioTrackRef.current.currentTime = audioMeta.offset || 0;
                        if (isPlaying && isActive) {
                            audioTrackRef.current.play().catch(() => {});
                        }
                    } catch (e) {
                        console.warn("Failed to reset audio on loop:", e);
                    }
                }
            }
        };

        const handleSeeked = () => {
            // Ensure audio is synced on manual seeks
            if (audioTrackRef.current) {
                const targetTime = (audioMeta.offset || 0) + video.currentTime - trimStart;
                try {
                    audioTrackRef.current.currentTime = targetTime;
                } catch (e) {
                    console.warn("Failed to sync audio on seeked:", e);
                }
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdateLoop);
        video.addEventListener('seeked', handleSeeked);
        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdateLoop);
            video.removeEventListener('seeked', handleSeeked);
        };
    }, [trimStart, trimEnd, audioMeta.offset, isPlaying, isActive]);

    // Cleanup audio track on unmount
    useEffect(() => {
        return () => {
            if (audioTrackRef.current) {
                audioTrackRef.current.pause();
                audioTrackRef.current = null;
            }
        };
    }, []);

    // Double-tap to like, single-tap to play/pause
    const handleTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            // Double tap — like
            if (!user) {
                toast.error('Login Required', 'Sign in to like this reel');
                openAuthModal();
                lastTapRef.current = 0;
                return;
            }
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 900);
            if (!isLiked) toggleLike.mutate(reel.id);
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
            setTimeout(() => {
                if (lastTapRef.current === now) {
                    if (!videoRef.current) return;
                    if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                    } else {
                        videoRef.current.play();
                        setIsPlaying(true);
                    }
                    setShowPlayIcon(true);
                    setTimeout(() => setShowPlayIcon(false), 500);
                }
            }, 310);
        }
    }, [isPlaying, isLiked, reel.id, user, openAuthModal]);

    // Track progress + view recording
    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(pct || 0);
        setCurrentTime(videoRef.current.currentTime);
        if (!viewRecordedRef.current && videoRef.current.currentTime > 3) {
            viewRecordedRef.current = true;
            recordView.mutate({ reelId: reel.id, watchDuration: 3, completed: false });
        }
    };

    const isOwner = user?.id === reelUserId;
    const isAdmin = ['admin', 'super_admin'].includes(user?.role || '');
    const durStr = dur > 0 ? `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}` : '';
    const curStr = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;

    return (
        <div ref={observerRef} data-reel-id={reel.id} className="reel-item">
            {/* Video Player */}
            <video
                ref={videoRef}
                src={videoUrl}
                loop
                playsInline
                preload="metadata"
                muted={isMuted || originalVolume === 0 || !!audioMeta.url}
                onClick={handleTap}
                onTimeUpdate={handleTimeUpdate}
                className="reel-video"
                poster={thumbUrl}
                style={{
                    filter: getFilterCss(selectedFilter),
                    objectFit: aspectRatio === '1/1' || aspectRatio === '9/16' ? 'cover' : 'contain'
                }}
            />

            {/* Gradient Overlays */}
            <div className="reel-gradient-top" />
            <div className="reel-gradient-bottom" />

            {/* Play/Pause Center Indicator */}
            {showPlayIcon && (
                <div className="reel-center-indicator">
                    {isPlaying
                        ? <Play style={{ width: 48, height: 48, fill: '#fff', color: '#fff' }} />
                        : <Pause style={{ width: 48, height: 48, fill: '#fff', color: '#fff' }} />
                    }
                </div>
            )}

            {/* Heart Double-Tap Animation */}
            {showHeart && (
                <div className="reel-center-indicator">
                    <Heart style={{ width: 80, height: 80, fill: '#ef4444', color: '#ef4444' }} className="reel-heart-pop" />
                </div>
            )}

            {/* Progress Bar */}
            <div className="reel-progress-track">
                <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* ═══════════ Bottom Info ═══════════ */}
            <div className="reel-bottom-info">
                {/* User Row */}
                <div className="reel-user-row">
                    <div
                        className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
                        style={{ minWidth: 0, flex: '0 1 auto' }}
                        onClick={() => {
                            if (!user) {
                                toast.error('Login Required', 'Sign in to view creator profiles');
                                openAuthModal();
                                return;
                            }
                            if (reelUserId) navigate(`/profile/${reelUserId}`);
                        }}
                    >
                        <Avatar
                            name={userName}
                            src={userAvatar}
                            size="sm"
                            className="!w-[38px] !h-[38px] !ring-2 !ring-white flex-shrink-0"
                        />
                        <div style={{ minWidth: 0, flex: '0 1 auto' }}>
                            <div className="reel-user-name">{userName}</div>
                            <div className="reel-user-time">{timeAgo(createdAt)}</div>
                        </div>
                    </div>

                    {reel.user?.role === 'artist' && <span className="reel-badge-artist">Artist</span>}

                    {!isOwner && (
                        <button
                            onClick={async () => {
                                if (!user) { 
                                    toast.error('Login Required', 'Sign in to follow creators'); 
                                    openAuthModal(); 
                                    return; 
                                }
                                const targetFollowState = !isFollowing;
                                setIsFollowing(targetFollowState);
                                try {
                                    if (targetFollowState) {
                                        await followUser.mutateAsync(reelUserId);
                                        toast.success('Following', `You are now following ${userName}.`);
                                    } else {
                                        await unfollowUser.mutateAsync(reelUserId);
                                        toast.success('Unfollowed', `You unfollowed ${userName}.`);
                                    }
                                } catch (err: any) {
                                    setIsFollowing(!targetFollowState);
                                    toast.error('Error', err.message || 'Failed to update follow status.');
                                }
                            }}
                            className={`reel-follow-btn ${isFollowing ? 'reel-following' : ''}`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}

                    <button
                        onClick={() => setShowOptions(true)}
                        className="reel-options-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            marginLeft: '4px',
                            opacity: 0.85,
                            transition: 'opacity 0.2s, transform 0.2s',
                        }}
                    >
                        <MoreVertical style={{ width: 18, height: 18 }} />
                    </button>

                    <div style={{ flex: 1 }} />
                </div>

                {/* Location Badge */}
                {(reel.locationName || reel.location_name) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const locName = reel.locationName || reel.location_name;
                            const lat = reel.locationLat ?? reel.location_lat;
                            const lng = reel.locationLng ?? reel.location_lng;
                            if (lat !== undefined && lng !== undefined) {
                                navigate(`/nearby?lat=${lat}&lng=${lng}&query=${encodeURIComponent(locName)}`);
                            } else {
                                navigate(`/nearby?query=${encodeURIComponent(locName)}`);
                            }
                        }}
                        className="reel-location-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium transition-all mb-1.5 w-fit"
                    >
                        <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{reel.locationName || reel.location_name}</span>
                    </button>
                )}

                {/* Caption */}
                {reel.caption && <p className="reel-caption">{reel.caption}</p>}

                {/* Hashtags */}
                {reel.hashtags?.length > 0 && (
                    <div className="reel-hashtags">
                        {reel.hashtags.slice(0, 5).map((t: string) => (
                            <span key={t} className="reel-hashtag">#{t}</span>
                        ))}
                    </div>
                )}

                {/* Duration */}
                {durStr && <div className="reel-duration">{curStr} / {durStr}</div>}

                {/* Music Pill */}
                <div className="reel-music-pill">
                    <Music style={{ width: 14, height: 14 }} className="reel-music-icon" />
                    <div className="reel-music-track-wrap">
                        <span className="reel-music-track-text">
                            {audioMeta.source && audioMeta.source !== 'original'
                                ? `${trackTitle} — ${trackArtist} • ${audioMeta.source === 'spotify' ? 'Spotify' : 'Device'} Audio`
                                : `Original Audio — ${userName} • ${userName} Original Audio`
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* ═══════════ Right Sidebar Actions ═══════════ */}
            <div className="reel-sidebar">
                {/* Mute Button */}
                <button onClick={onMuteToggle} className="reel-mute-btn">
                    {isMuted
                        ? <VolumeX style={{ width: 18, height: 18 }} />
                        : <Volume2 style={{ width: 18, height: 18 }} />
                    }
                </button>

                {/* Glassmorphic Action Card */}
                <div className="reel-actions-card">
                    {/* Like */}
                    <button
                        onClick={() => {
                            if (!user) { 
                                toast.error('Login Required', 'Sign in to like'); 
                                openAuthModal();
                                return; 
                            }
                            toggleLike.mutate(reel.id);
                        }}
                        className={`reel-action-btn ${isLiked ? 'reel-liked' : ''}`}
                    >
                        <div className="reel-action-icon">
                            <Heart style={{ width: 20, height: 20, fill: isLiked ? '#ef4444' : 'none', color: isLiked ? '#ef4444' : '#fff' }} />
                        </div>
                        <span className="reel-action-count">{formatCount(likeCount)}</span>
                    </button>

                    {/* Comment */}
                    <button 
                        onClick={() => {
                            if (!user) {
                                toast.error('Login Required', 'Sign in to view or post comments');
                                openAuthModal();
                                return;
                            }
                            onOpenComments();
                        }} 
                        className="reel-action-btn"
                    >
                        <div className="reel-action-icon">
                            <MessageCircle style={{ width: 20, height: 20 }} />
                        </div>
                        <span className="reel-action-count">{formatCount(commentCount)}</span>
                    </button>

                    {/* Save / Bookmark */}
                    <button
                        onClick={() => {
                            if (!user) { 
                                toast.error('Login Required', 'Sign in to save'); 
                                openAuthModal();
                                return; 
                            }
                            toggleReshare.mutate({ reelId: reel.id });
                        }}
                        className={`reel-action-btn ${isReshared ? 'reel-saved' : ''}`}
                    >
                        <div className="reel-action-icon">
                            <Bookmark style={{ width: 20, height: 20, fill: isReshared ? '#C9A84C' : 'none', color: isReshared ? '#C9A84C' : '#fff' }} />
                        </div>
                        <span className="reel-action-count">{isReshared ? 'Saved' : 'Save'}</span>
                    </button>

                    {/* Share */}
                    <button 
                        onClick={() => {
                            if (!user) {
                                toast.error('Login Required', 'Sign in to share');
                                openAuthModal();
                                return;
                            }
                            onShare();
                        }} 
                        className="reel-action-btn"
                    >
                        <div className="reel-action-icon">
                            <Share2 style={{ width: 18, height: 18 }} />
                        </div>
                        <span className="reel-action-count">{formatCount(shareCount + viewCount)}</span>
                    </button>
                </div>
            </div>

            {/* ═══════════ Options Bottom Sheet ═══════════ */}
            {showOptions && (
                <>
                    <div className="reel-drawer-backdrop" onClick={() => setShowOptions(false)} />
                    <div className="reel-drawer">
                        <div className="reel-drawer-handle" />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #fff)' }}>Options</h3>
                            <button onClick={() => setShowOptions(false)} style={{ padding: 6, borderRadius: '50%', background: 'none', border: 'none', color: 'var(--text-muted, #888)', cursor: 'pointer' }}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>
                            {(isOwner || isAdmin) && (
                                <button
                                    onClick={() => { setShowOptions(false); if (confirm('Delete this reel?')) deleteReel.mutate(reel.id); }}
                                    className="reel-option-item reel-option-danger"
                                >
                                    <Trash2 style={{ width: 18, height: 18 }} /> Delete Reel
                                </button>
                            )}
                            {!isOwner && (
                                <button
                                    onClick={() => { setShowOptions(false); toast.success('Report Submitted', 'Thank you for reporting.'); }}
                                    className="reel-option-item reel-option-danger"
                                >
                                    Report Reel
                                </button>
                            )}
                            <button onClick={() => { setShowOptions(false); onMuteToggle(); }} className="reel-option-item reel-option-normal">
                                {isMuted ? 'Unmute Video' : 'Mute Video'}
                            </button>
                            <button onClick={() => { setShowOptions(false); onShare(); }} className="reel-option-item reel-option-normal">
                                Share Reel Link
                            </button>
                            <button onClick={() => setShowOptions(false)} className="reel-option-item reel-option-cancel">
                                Cancel
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
