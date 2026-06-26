import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Play, Pause, Upload, Music, Search, Scissors, 
    Sparkles, AlertCircle, Video, FastForward, Crop, LogOut
} from 'lucide-react';
import '../reels.css';
import { useUploadReel } from '../../../hooks/useReels';
import { validateVideo, generateVideoThumbnail, formatFileSize } from '../../../lib/videoCompressor';
import Button from '../../../components/ui/Button';

interface Props { onClose: () => void; }

const CURATED_TRACKS = [
    { id: '1', title: 'Gending Sriwijaya Lofi', artist: 'SeniQu Heritage', artwork: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=100&q=80', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 180 },
    { id: '2', title: 'Bali Chill Beats', artist: 'Dewa Gamelan', artwork: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=100&q=80', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 210 },
    { id: '3', title: 'Borobudur Sunset', artist: 'For Revenge Acoustic', artwork: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=100&q=80', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 240 },
    { id: '4', title: 'Lathi (Traditional Mix)', artist: 'Weird Genius ft. Sara Fajira', artwork: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=100&q=80', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 195 },
    { id: '5', title: 'Indonesian Chillhop', artist: 'Lofi Culture', artwork: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&q=80', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 220 },
];

const FILTERS = [
    { name: 'none', label: 'Original' },
    { name: 'cinematic', label: 'Cinematic' },
    { name: 'vintage', label: 'Vintage' },
    { name: 'mono', label: 'Mono' },
    { name: 'warm', label: 'Warm' },
    { name: 'cool', label: 'Cool' },
    { name: 'vibrant', label: 'Vibrant' },
];

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

function generateRandomString(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data as any);
    const bytes = new Uint8Array(digest);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export default function UploadReelModal({ onClose }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const audioFileRef = useRef<HTMLInputElement>(null);
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const audioPreviewRef = useRef<HTMLAudioElement>(null);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [meta, setMeta] = useState<any>(null);

    // Video editing states
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(15);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [selectedFilter, setSelectedFilter] = useState('none');
    const [aspectRatio, setAspectRatio] = useState('9/16');
    const [originalVolume, setOriginalVolume] = useState(1);

    // Audio selection states
    const [audioSource, setAudioSource] = useState<'original' | 'spotify' | 'internal'>('original');

    // Spotify states & handlers
    const [spotifyToken, setSpotifyToken] = useState<string | null>(localStorage.getItem('spotify_token'));
    const [spotifyUser, setSpotifyUser] = useState<{name: string, image: string} | null>(null);
    const [liveSpotifyTracks, setLiveSpotifyTracks] = useState<any[]>([]);
    const [searchingSpotify, setSearchingSpotify] = useState(false);
    const [customClientId, setCustomClientId] = useState<string>(
        (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string) || localStorage.getItem('spotify_client_id') || ''
    );
    const [showDevSettings, setShowDevSettings] = useState(false);

    const [spotifySearch, setSpotifySearch] = useState('');
    const [selectedSpotifyTrack, setSelectedSpotifyTrack] = useState<any>(null);
    const [spotifyOffset, setSpotifyOffset] = useState(0);
    const [musicVolume, setMusicVolume] = useState(0.8);
    const [isPlayingSpotifyPreview, setIsPlayingSpotifyPreview] = useState(false);

    // Internal audio states
    const [internalAudioFile, setInternalAudioFile] = useState<File | null>(null);
    const [internalAudioUrl, setInternalAudioUrl] = useState<string | null>(null);
    const [internalAudioOffset, setInternalAudioOffset] = useState(0);
    const [isPlayingInternalPreview, setIsPlayingInternalPreview] = useState(false);

    const upload = useUploadReel();

    // On mount, listen to global Spotify token updates and check url params
    useEffect(() => {
        const handleTokenUpdate = () => {
            const token = localStorage.getItem('spotify_token');
            setSpotifyToken(token);
            if (token) {
                setAudioSource('spotify');
            }
        };

        window.addEventListener('spotify_token_updated', handleTokenUpdate);

        // Check hash (Implicit Grant flow callback)
        const hash = window.location.hash;
        if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
                localStorage.setItem('spotify_token', token);
                localStorage.setItem('spotify_token_expires', String(Date.now() + 3600 * 1000));
                setSpotifyToken(token);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setAudioSource('spotify');
            }
        }

        // Check search params (Authorization Code Flow with PKCE)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            const codeVerifier = localStorage.getItem('spotify_code_verifier') || '';
            const clientId = localStorage.getItem('spotify_client_id') || '581c7f9994c944439c279c93df32d3d3';
            const redirectUri = window.location.origin + '/';

            // Clean query parameters from URL immediately
            window.history.replaceState(null, '', window.location.pathname + window.location.hash);

            const payload = new URLSearchParams({
                client_id: clientId,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            });

            fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: payload,
            })
            .then(res => res.json())
            .then(data => {
                if (data.access_token) {
                    localStorage.setItem('spotify_token', data.access_token);
                    localStorage.setItem('spotify_token_expires', String(Date.now() + (data.expires_in || 3600) * 1000));
                    setSpotifyToken(data.access_token);
                    setAudioSource('spotify');
                    window.dispatchEvent(new Event('spotify_token_updated'));
                } else {
                    console.error('Spotify token exchange failed:', data);
                }
            })
            .catch(err => {
                console.error('Error exchanging Spotify authorization code:', err);
            });
        }

        return () => {
            window.removeEventListener('spotify_token_updated', handleTokenUpdate);
        };
    }, []);

    // Check token expiration & fetch profile
    useEffect(() => {
        if (!spotifyToken) return;
        
        const expires = localStorage.getItem('spotify_token_expires');
        if (expires && Date.now() > Number(expires)) {
            handleSpotifyDisconnect();
            return;
        }

        fetchSpotifyProfile(spotifyToken);
    }, [spotifyToken]);

    const fetchSpotifyProfile = async (token: string) => {
        try {
            const res = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSpotifyUser({
                    name: data.display_name,
                    image: data.images?.[0]?.url || ''
                });
            } else if (res.status === 401) {
                handleSpotifyDisconnect();
            }
        } catch (err) {
            console.error('Error fetching Spotify profile:', err);
        }
    };

    const handleSpotifyDisconnect = () => {
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('spotify_token_expires');
        setSpotifyToken(null);
        setSpotifyUser(null);
        setLiveSpotifyTracks([]);
        setSelectedSpotifyTrack(null);
        window.dispatchEvent(new Event('spotify_token_updated'));
    };

    const handleSpotifyConnect = async () => {
        const clientId = customClientId.trim() || '581c7f9994c944439c279c93df32d3d3'; // Fallback Client ID
        localStorage.setItem('spotify_client_id', clientId);
        localStorage.setItem('spotify_redirect_back', window.location.pathname);

        const redirectUri = window.location.origin + '/';
        const scopes = 'user-read-private user-read-email';
        
        // PKCE generation
        const codeVerifier = generateRandomString(128);
        localStorage.setItem('spotify_code_verifier', codeVerifier);

        try {
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
            
            // Redirect
            window.location.href = authUrl;
        } catch (err) {
            console.error('Failed to generate PKCE challenge', err);
            // Fallback to implicit grant if Web Crypto fails
            const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
            window.location.href = authUrl;
        }
    };

    const handlePasteToken = (token: string) => {
        const cleaned = token.trim();
        if (!cleaned) return;
        localStorage.setItem('spotify_token', cleaned);
        localStorage.setItem('spotify_token_expires', String(Date.now() + 3600 * 1000));
        setSpotifyToken(cleaned);
        fetchSpotifyProfile(cleaned);
    };

    // Spotify & Free iTunes Music Library search API call
    useEffect(() => {
        if (!spotifySearch.trim()) {
            setLiveSpotifyTracks([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearchingSpotify(true);

            // Helper to fetch from iTunes Music Library (Free, complete catalog, no token/login/premium required)
            const fetchFromITunes = async () => {
                try {
                    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(spotifySearch)}&media=music&limit=15`);
                    if (res.ok) {
                        const data = await res.json();
                        const tracks = (data.results || []).map((item: any) => ({
                            id: `itunes_${item.trackId}`,
                            title: item.trackName,
                            artist: item.artistName,
                            artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&q=80',
                            url: item.previewUrl,
                            duration: Math.round(item.trackTimeMillis / 1000)
                        }));
                        setLiveSpotifyTracks(tracks);
                    }
                } catch (err) {
                    console.error('Error searching iTunes:', err);
                }
            };

            if (spotifyToken) {
                try {
                    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(spotifySearch)}&type=track&limit=15`, {
                        headers: { 'Authorization': `Bearer ${spotifyToken}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const tracks = (data.tracks?.items || []).map((item: any) => ({
                            id: item.id,
                            title: item.name,
                            artist: item.artists.map((a: any) => a.name).join(', '),
                            artwork: item.album?.images?.[0]?.url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&q=80',
                            url: item.preview_url,
                            duration: Math.round(item.duration_ms / 1000)
                        }));
                        setLiveSpotifyTracks(tracks);
                    } else if (res.status === 403 || res.status === 401) {
                        console.warn(`Spotify search returned status ${res.status}. Falling back to iTunes Free Music Library...`);
                        await fetchFromITunes();
                    } else {
                        await fetchFromITunes();
                    }
                } catch (err) {
                    console.error('Spotify search failed, falling back to iTunes:', err);
                    await fetchFromITunes();
                } finally {
                    setSearchingSpotify(false);
                }
            } else {
                await fetchFromITunes();
                setSearchingSpotify(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [spotifySearch, spotifyToken]);

    // Reset video time to trimStart on loop
    useEffect(() => {
        const video = videoPreviewRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.currentTime < trimStart) {
                video.currentTime = trimStart;
            }
            if (video.currentTime >= trimEnd) {
                video.currentTime = trimStart;
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [trimStart, trimEnd, step]);

    // Handle speed change
    useEffect(() => {
        if (videoPreviewRef.current) {
            videoPreviewRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, step]);

    // Handle original volume change
    useEffect(() => {
        if (videoPreviewRef.current) {
            videoPreviewRef.current.volume = originalVolume;
        }
    }, [originalVolume, step]);

    // Handle audio previews
    useEffect(() => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.volume = musicVolume;
        }
    }, [musicVolume]);

    // Handle stop previews on step change
    useEffect(() => {
        stopAudioPreviews();
    }, [step]);

    const stopAudioPreviews = () => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.pause();
        }
        setIsPlayingSpotifyPreview(false);
        setIsPlayingInternalPreview(false);
    };

    const handleFile = async (f: File) => {
        setError(null); setPreview(null); setMeta(null); setWarning(null);
        const v = await validateVideo(f);
        if (!v.valid) { setError(v.error || 'Invalid video format or size'); return; }
        if (v.warning) { setWarning(v.warning); }
        setFile(f);
        setMeta(v.metadata);
        setTrimStart(0);
        setTrimEnd(Math.min(v.metadata?.duration || 15, 60));
        try { setPreview(await generateVideoThumbnail(f)); } catch { setPreview(URL.createObjectURL(f)); }
        setStep(2); // Go to edit step
    };

    const handleInternalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setInternalAudioFile(file);
        const url = URL.createObjectURL(file);
        setInternalAudioUrl(url);
        setInternalAudioOffset(0);
        setSelectedSpotifyTrack(null);
        setAudioSource('internal');
    };

    const playSpotifyPreview = (track: any) => {
        if (selectedSpotifyTrack?.id === track.id && isPlayingSpotifyPreview) {
            audioPreviewRef.current?.pause();
            setIsPlayingSpotifyPreview(false);
        } else {
            setSelectedSpotifyTrack(track);
            setInternalAudioFile(null);
            setInternalAudioUrl(null);
            if (!track.url) {
                setIsPlayingSpotifyPreview(false);
                return;
            }
            setIsPlayingSpotifyPreview(true);
            setTimeout(() => {
                if (audioPreviewRef.current) {
                    audioPreviewRef.current.src = track.url;
                    audioPreviewRef.current.currentTime = spotifyOffset;
                    audioPreviewRef.current.play().catch(err => console.log('Audio playback blocked', err));
                }
            }, 50);
        }
    };

    const playInternalAudioPreview = () => {
        if (!internalAudioUrl) return;
        if (isPlayingInternalPreview) {
            audioPreviewRef.current?.pause();
            setIsPlayingInternalPreview(false);
        } else {
            setIsPlayingInternalPreview(true);
            if (audioPreviewRef.current) {
                audioPreviewRef.current.src = internalAudioUrl;
                audioPreviewRef.current.currentTime = internalAudioOffset;
                audioPreviewRef.current.play().catch(err => console.log('Audio playback blocked', err));
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true); setProgress(0); setUploadStatus('Preparing...');
        const tags = hashtags.split(',').map(h => h.trim()).filter(Boolean);

        // Bundle audio metadata & editing parameters
        const audioMetadata = {
            source: audioSource,
            volume: audioSource === 'original' ? 0 : musicVolume,
            originalVolume: originalVolume,
            trackId: audioSource === 'spotify' ? selectedSpotifyTrack?.id : null,
            title: audioSource === 'spotify' ? selectedSpotifyTrack?.title : (audioSource === 'internal' ? internalAudioFile?.name : 'Original Audio'),
            artist: audioSource === 'spotify' ? selectedSpotifyTrack?.artist : (audioSource === 'internal' ? 'Local Upload' : ''),
            url: audioSource === 'spotify' ? selectedSpotifyTrack?.url : (audioSource === 'internal' ? internalAudioUrl : null),
            offset: audioSource === 'spotify' ? spotifyOffset : (audioSource === 'internal' ? internalAudioOffset : 0),
            editing: {
                trimStart,
                trimEnd,
                playbackSpeed,
                filter: selectedFilter,
                aspectRatio,
            }
        };

        upload.mutate({
            file,
            caption,
            hashtags: tags,
            audioMetadata,
            onProgress: setProgress,
            onStatus: setUploadStatus,
        }, {
            onSuccess: () => { setUploading(false); setUploadStatus(''); onClose(); },
            onError: () => { setUploading(false); setUploadStatus(''); },
        });
    };

    // Curated filtering
    const filteredTracks = CURATED_TRACKS.filter(t => 
        t.title.toLowerCase().includes(spotifySearch.toLowerCase()) || 
        t.artist.toLowerCase().includes(spotifySearch.toLowerCase())
    );

    const displayTracks = spotifySearch.trim() ? liveSpotifyTracks : CURATED_TRACKS;

    return createPortal(
        <div className="reel-upload-overlay" onClick={e => { if (e.target === e.currentTarget && !uploading) onClose(); }}>
            <div className="reel-upload-modal !max-w-xl md:!max-w-2xl" style={{ height: 'auto', maxHeight: '90dvh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                            <Play style={{ width: 16, height: 16, fill: '#C9A84C', color: '#C9A84C' }} />
                        </div>
                        <h3 className="text-theme-text font-bold text-sm">
                            {step === 1 ? 'Create Reel' : step === 2 ? 'Edit Reel & Soundtrack' : 'Post Details'}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-full hover:bg-theme-border/20 text-theme-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto flex flex-col md:flex-row" style={{ maxHeight: 'calc(90dvh - 140px)' }}>
                    
                    {/* STEP 1: Select Video */}
                    {step === 1 && (
                        <div className="w-full p-8 flex flex-col items-center justify-center min-h-[300px]">
                            <button type="button" onClick={() => fileRef.current?.click()} className="reel-upload-dropzone w-full max-w-sm flex-1 flex flex-col justify-center items-center py-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 flex items-center justify-center mb-3">
                                    <Upload style={{ width: 28, height: 28, color: '#C9A84C' }} />
                                </div>
                                <span className="text-theme-text text-sm font-semibold mt-1">Upload short video</span>
                                <span className="text-theme-muted text-[11px] text-center max-w-[220px] mt-1">Max 60s · 100MB · Portrait ratio recommended</span>
                            </button>
                            {error && <p className="text-xs text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 mt-4 w-full max-w-sm text-center">{error}</p>}
                        </div>
                    )}

                    {/* STEP 2: Edit & Audio Selection */}
                    {step === 2 && file && (
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full">
                            {/* Left: Video Preview with filters applied */}
                            <div className="w-full md:w-1/2 p-4 flex flex-col items-center justify-center bg-black/40 border-r border-theme-border/20">
                                <div 
                                    className="relative rounded-2xl overflow-hidden border border-theme-border/30 bg-black flex items-center justify-center w-full max-w-[240px] shadow-lg"
                                    style={{ 
                                        aspectRatio: aspectRatio === 'original' ? undefined : aspectRatio,
                                        maxHeight: '320px'
                                    }}
                                >
                                    <video
                                        ref={videoPreviewRef}
                                        src={URL.createObjectURL(file)}
                                        loop
                                        autoPlay
                                        muted={audioSource !== 'original' || originalVolume === 0}
                                        playsInline
                                        style={{ filter: getFilterCss(selectedFilter) }}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="mt-3 flex gap-2 text-[10px] text-theme-muted">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>·</span>
                                    <span>Trim: {trimStart.toFixed(1)}s - {trimEnd.toFixed(1)}s</span>
                                </div>
                            </div>

                            {/* Right: Detailed Editor */}
                            <div className="w-full md:w-1/2 p-5 overflow-y-auto space-y-5 max-h-[420px] md:max-h-none">
                                {/* Trimming controls */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5 uppercase tracking-wider">
                                        <Scissors className="w-3.5 h-3.5 text-amber-500" /> Video Trim
                                    </h4>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-theme-muted">
                                            <span>Start: {trimStart.toFixed(1)}s</span>
                                            <span>End: {trimEnd.toFixed(1)}s</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-theme-muted">Start Offset</label>
                                                <input 
                                                    type="range" 
                                                    min={0} 
                                                    max={meta?.duration || 10} 
                                                    step={0.5}
                                                    value={trimStart} 
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        if (val < trimEnd) setTrimStart(val);
                                                    }}
                                                    className="w-full accent-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-theme-muted">End Offset</label>
                                                <input 
                                                    type="range" 
                                                    min={0} 
                                                    max={meta?.duration || 10} 
                                                    step={0.5}
                                                    value={trimEnd} 
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        if (val > trimStart) setTrimEnd(val);
                                                    }}
                                                    className="w-full accent-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters Carousel */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5 uppercase tracking-wider">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Aesthetic Filters
                                    </h4>
                                    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                                        {FILTERS.map(f => (
                                            <button
                                                key={f.name}
                                                type="button"
                                                onClick={() => setSelectedFilter(f.name)}
                                                className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all whitespace-nowrap ${
                                                    selectedFilter === f.name 
                                                        ? 'bg-amber-500 text-black border-transparent font-bold' 
                                                        : 'bg-theme-border/20 text-theme-muted border-theme-border/30 hover:text-theme-text'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Speed & Aspect Ratio */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1"><FastForward className="w-3 h-3"/> Speed</label>
                                        <div className="flex rounded-lg overflow-hidden border border-theme-border/30">
                                            {[0.5, 1, 1.5, 2].map(speed => (
                                                <button
                                                    key={speed}
                                                    type="button"
                                                    onClick={() => setPlaybackSpeed(speed)}
                                                    className={`flex-1 py-1 text-xs transition-colors ${
                                                        playbackSpeed === speed 
                                                            ? 'bg-amber-500 text-black font-bold' 
                                                            : 'bg-theme-border/10 text-theme-muted hover:bg-theme-border/20'
                                                    }`}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider flex items-center gap-1"><Crop className="w-3 h-3"/> Crop</label>
                                        <select 
                                            value={aspectRatio} 
                                            onChange={e => setAspectRatio(e.target.value)}
                                            className="w-full bg-theme-border/15 border border-theme-border/30 text-theme-text rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="9/16">9:16 Portrait</option>
                                            <option value="1/1">1:1 Square</option>
                                            <option value="16/9">16:9 Landscape</option>
                                            <option value="original">Original Size</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Audio Source Picker */}
                                <div className="space-y-3 pt-3 border-t border-theme-border/20">
                                    <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5 uppercase tracking-wider">
                                        <Music className="w-3.5 h-3.5 text-amber-500" /> Audio Soundtrack
                                    </h4>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setAudioSource('original'); stopAudioPreviews(); }}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                                audioSource === 'original'
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                    : 'bg-theme-border/10 text-theme-muted border-transparent hover:bg-theme-border/20'
                                            }`}
                                        >
                                            Original Video Sound
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setAudioSource('spotify'); stopAudioPreviews(); }}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                                audioSource === 'spotify'
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                    : 'bg-theme-border/10 text-theme-muted border-transparent hover:bg-theme-border/20'
                                            }`}
                                        >
                                            Search Soundtrack
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setAudioSource('internal'); stopAudioPreviews(); }}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                                                audioSource === 'internal'
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                                    : 'bg-theme-border/10 text-theme-muted border-transparent hover:bg-theme-border/20'
                                            }`}
                                        >
                                            Internal Device Audio
                                        </button>
                                    </div>

                                    {/* Sub-panels based on selection */}
                                    {audioSource === 'original' && (
                                        <div className="p-3.5 rounded-2xl bg-theme-border/10 border border-theme-border/20 space-y-2">
                                            <div className="flex justify-between text-xs text-theme-muted">
                                                <span>Original Soundtrack Volume</span>
                                                <span>{Math.round(originalVolume * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min={0} 
                                                max={1} 
                                                step={0.05}
                                                value={originalVolume} 
                                                onChange={e => setOriginalVolume(parseFloat(e.target.value))}
                                                className="w-full accent-amber-500"
                                            />
                                        </div>
                                    )}

                                    {audioSource === 'spotify' && (
                                        <div className="space-y-3 p-3.5 rounded-2xl bg-theme-border/10 border border-theme-border/20">
                                            {/* Spotify Connection Header / Auth Prompt */}
                                            {!spotifyToken ? (
                                                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center space-y-2.5">
                                                    <div className="flex justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 flex items-center justify-center text-[#1DB954]">
                                                            <Music className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-theme-text">Connect to Live Spotify</h4>
                                                        <p className="text-[10px] text-theme-muted mt-0.5">Search millions of live tracks from Spotify's global database</p>
                                                    </div>
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={handleSpotifyConnect}
                                                            className="px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-black text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                                        >
                                                            <Music className="w-3.5 h-3.5 fill-black text-black" />
                                                            Connect Spotify
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowDevSettings(!showDevSettings)}
                                                            className="px-3 py-1.5 bg-theme-border/20 hover:bg-theme-border/30 text-theme-text text-[10px] font-semibold rounded-lg transition-colors"
                                                        >
                                                            Token Options
                                                        </button>
                                                    </div>

                                                    {showDevSettings && (
                                                        <div className="text-left pt-2.5 border-t border-theme-border/20 space-y-2.5 animate-fadeIn">
                                                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-500 leading-normal space-y-1">
                                                                <p className="font-bold">⚠️ Redirect URI Config Required:</p>
                                                                <p>To avoid Spotify <strong>400 Bad Request</strong>, make sure to add <code>{window.location.origin}/</code> in your Spotify Developer Dashboard under <strong>Settings &gt; Redirect URIs</strong>.</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-theme-muted uppercase tracking-wider">Spotify Client ID</label>
                                                                <input 
                                                                    type="text"
                                                                    value={customClientId}
                                                                    onChange={e => setCustomClientId(e.target.value)}
                                                                    placeholder="Paste Client ID (e.g. from developer dashboard)"
                                                                    className="w-full bg-theme-surface border border-theme-border/25 rounded-lg px-2.5 py-1.5 text-[10px] text-theme-text focus:outline-none focus:border-amber-500"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-theme-muted uppercase tracking-wider">Or Paste Access Token Directly</label>
                                                                <div className="flex gap-1.5">
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="BQB_..."
                                                                        id="pastedSpotifyTokenInput"
                                                                        className="flex-1 bg-theme-surface border border-theme-border/25 rounded-lg px-2.5 py-1.5 text-[10px] text-theme-text focus:outline-none focus:border-amber-500"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const val = (document.getElementById('pastedSpotifyTokenInput') as HTMLInputElement)?.value;
                                                                            if (val) handlePasteToken(val);
                                                                        }}
                                                                        className="px-2.5 py-1.5 bg-amber-500 text-black text-[10px] font-bold rounded-lg hover:bg-amber-400 transition-colors"
                                                                    >
                                                                        Apply
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <p className="text-[9px] text-theme-muted leading-relaxed">
                                                                💡 <strong>Tip:</strong> You can get a temporary token instantly from Spotify's <a href="https://developer.spotify.com/documentation/web-api/reference/search" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Web API Console</a>.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1DB954]/5 border border-[#1DB954]/25">
                                                    <div className="flex items-center gap-2">
                                                        {spotifyUser?.image ? (
                                                            <img src={spotifyUser.image} alt={spotifyUser.name} className="w-6 h-6 rounded-full object-cover border border-[#1DB954]/30" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center text-black text-[9px] font-bold">
                                                                {spotifyUser?.name ? spotifyUser.name.substring(0, 1).toUpperCase() : 'S'}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-[10px] font-bold text-theme-text leading-none flex items-center gap-1">
                                                                Connected to Spotify
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] inline-block animate-pulse"></span>
                                                            </p>
                                                            <p className="text-[9px] text-theme-muted leading-none mt-0.5">{spotifyUser?.name || 'Spotify Session'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleSpotifyDisconnect}
                                                        className="p-1 text-theme-muted hover:text-red-500 transition-colors rounded-lg hover:bg-theme-border/20 flex items-center gap-0.5 text-[9px] font-semibold"
                                                    >
                                                        <LogOut className="w-3.5 h-3.5" />
                                                        Disconnect
                                                    </button>
                                                </div>
                                            )}

                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-theme-muted" />
                                                <input
                                                    type="text"
                                                    value={spotifySearch}
                                                    onChange={e => setSpotifySearch(e.target.value)}
                                                    placeholder="Search songs, artists, or albums..."
                                                    className="w-full bg-theme-surface/50 border border-theme-border/20 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-amber-500 text-theme-text"
                                                />
                                            </div>

                                            {/* Search List */}
                                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                                {searchingSpotify ? (
                                                    <div className="flex items-center justify-center py-6 gap-2">
                                                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-[10px] text-theme-muted font-medium">Searching Spotify database...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {displayTracks.map(track => (
                                                            <div 
                                                                key={track.id} 
                                                                onClick={() => playSpotifyPreview(track)}
                                                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-theme-border/20 transition-all border ${
                                                                    selectedSpotifyTrack?.id === track.id 
                                                                        ? 'border-amber-500/40 bg-amber-500/5' 
                                                                        : 'border-transparent'
                                                                }`}
                                                            >
                                                                <img src={track.artwork} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-theme-text truncate">{track.title}</p>
                                                                    <p className="text-[10px] text-theme-muted truncate flex items-center gap-1.5">
                                                                        {track.artist}
                                                                        {!track.url && (
                                                                            <span className="text-[8px] bg-theme-border/30 px-1 py-0.5 rounded text-theme-muted font-semibold">
                                                                                No Preview
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    className="w-7 h-7 rounded-full bg-theme-border/30 hover:bg-theme-border/50 flex items-center justify-center text-amber-500"
                                                                >
                                                                    {selectedSpotifyTrack?.id === track.id && isPlayingSpotifyPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {displayTracks.length === 0 && (
                                                            <p className="text-center text-[10px] text-theme-muted py-4">No results found on Spotify</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Track specific editing */}
                                            {selectedSpotifyTrack && (
                                                <div className="space-y-2 pt-2 border-t border-theme-border/20">
                                                    <div className="flex justify-between text-[10px] text-theme-muted">
                                                        <span>Music Start Offset</span>
                                                        <span>{spotifyOffset}s</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min={0} 
                                                        max={30} 
                                                        step={1}
                                                        value={spotifyOffset} 
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value);
                                                            setSpotifyOffset(val);
                                                            if (audioPreviewRef.current && selectedSpotifyTrack?.url) {
                                                                audioPreviewRef.current.currentTime = val;
                                                            }
                                                        }}
                                                        className="w-full accent-amber-500"
                                                    />

                                                    <div className="flex justify-between text-[10px] text-theme-muted">
                                                        <span>Music Volume</span>
                                                        <span>{Math.round(musicVolume * 100)}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min={0} 
                                                        max={1} 
                                                        step={0.05}
                                                        value={musicVolume} 
                                                        onChange={e => setMusicVolume(parseFloat(e.target.value))}
                                                        className="w-full accent-amber-500"
                                                    />

                                                    {/* Auto Mute original sound when using spotify music */}
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <input 
                                                            type="checkbox" 
                                                            id="muteOriginal"
                                                            checked={originalVolume === 0} 
                                                            onChange={e => setOriginalVolume(e.target.checked ? 0 : 0.8)}
                                                            className="rounded border-theme-border/30 accent-amber-500"
                                                        />
                                                        <label htmlFor="muteOriginal" className="text-[10px] text-theme-muted cursor-pointer">Mute original video sound</label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {audioSource === 'internal' && (
                                        <div className="space-y-3 p-3.5 rounded-2xl bg-theme-border/10 border border-theme-border/20">
                                            <input 
                                                type="file" 
                                                ref={audioFileRef} 
                                                accept="audio/*" 
                                                className="hidden" 
                                                onChange={handleInternalAudioUpload} 
                                            />
                                            
                                            {internalAudioFile ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between bg-theme-surface/50 border border-theme-border/20 p-2.5 rounded-xl">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                                                                <Music className="w-5 h-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-theme-text truncate">{internalAudioFile.name}</p>
                                                                <p className="text-[10px] text-theme-muted">{formatFileSize(internalAudioFile.size)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                type="button" 
                                                                onClick={playInternalAudioPreview}
                                                                className="w-7 h-7 rounded-full bg-theme-border/30 hover:bg-theme-border/50 flex items-center justify-center text-amber-500"
                                                            >
                                                                {isPlayingInternalPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => { setInternalAudioFile(null); setInternalAudioUrl(null); stopAudioPreviews(); }}
                                                                className="w-7 h-7 rounded-full bg-theme-border/30 hover:bg-red-500/20 flex items-center justify-center text-red-500"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 pt-1">
                                                        <div className="flex justify-between text-[10px] text-theme-muted">
                                                            <span>Audio Start Offset</span>
                                                            <span>{internalAudioOffset}s</span>
                                                        </div>
                                                        <input 
                                                            type="range" 
                                                            min={0} 
                                                            max={30} 
                                                            step={1}
                                                            value={internalAudioOffset} 
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setInternalAudioOffset(val);
                                                                if (audioPreviewRef.current) {
                                                                    audioPreviewRef.current.currentTime = val;
                                                                }
                                                            }}
                                                            className="w-full accent-amber-500"
                                                        />

                                                        <div className="flex justify-between text-[10px] text-theme-muted">
                                                            <span>Audio Volume</span>
                                                            <span>{Math.round(musicVolume * 100)}%</span>
                                                        </div>
                                                        <input 
                                                            type="range" 
                                                            min={0} 
                                                            max={1} 
                                                            step={0.05}
                                                            value={musicVolume} 
                                                            onChange={e => setMusicVolume(parseFloat(e.target.value))}
                                                            className="w-full accent-amber-500"
                                                        />

                                                        <div className="flex items-center gap-2 pt-1">
                                                            <input 
                                                                type="checkbox" 
                                                                id="muteOriginalInternal"
                                                                checked={originalVolume === 0} 
                                                                onChange={e => setOriginalVolume(e.target.checked ? 0 : 0.8)}
                                                                className="rounded border-theme-border/30 accent-amber-500"
                                                            />
                                                            <label htmlFor="muteOriginalInternal" className="text-[10px] text-theme-muted cursor-pointer">Mute original video sound</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    type="button" 
                                                    onClick={() => audioFileRef.current?.click()} 
                                                    className="w-full py-4 border border-dashed border-theme-border/30 hover:border-amber-500/40 rounded-xl flex flex-col items-center justify-center bg-theme-border/5 hover:bg-amber-500/5 transition-all"
                                                >
                                                    <Upload className="w-5 h-5 text-amber-500 mb-1" />
                                                    <span className="text-xs font-semibold text-theme-text">Select audio file from phone/device</span>
                                                    <span className="text-[10px] text-theme-muted">Supports MP3, WAV, M4A, OGG</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Caption, Hashtags & Publish */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="reel-upload-form flex-1 w-full">
                            {/* Summary of edits */}
                            <div className="p-4 rounded-2xl bg-theme-border/10 border border-theme-border/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/25 flex items-center justify-center text-amber-500">
                                        <Video className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-theme-text">Video Configured</p>
                                        <p className="text-[10px] text-theme-muted">Speed: {playbackSpeed}x · Crop: {aspectRatio} · Filter: {selectedFilter}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-right">
                                    {audioSource !== 'original' && (
                                        <div className="text-xs text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                            <Music className="w-3 h-3" /> Soundtrack
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Caption with Thumbnail Preview */}
                            <div>
                                <label className="reel-label">Caption</label>
                                <div className="flex gap-4 items-start">
                                    {preview && (
                                        <div className="w-20 h-28 rounded-xl overflow-hidden border border-theme-border/30 bg-black flex-shrink-0 shadow-md">
                                            <img src={preview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write an inspiring caption for your art heritage reel..." className="reel-textarea !h-[112px]" maxLength={2200} />
                                    </div>
                                </div>
                            </div>

                            {/* Hashtags */}
                            <div>
                                <label className="reel-label">Hashtags</label>
                                <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="indonesia, heritage, digitalart, seniqu" className="reel-input" />
                            </div>

                            {/* Warning message if any */}
                            {warning && (
                                <p className="text-[11px] text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{warning}</span>
                                </p>
                            )}

                            {/* Upload Progress */}
                            {uploading && (
                                <div className="space-y-1.5">
                                    <div className="h-2 w-full bg-theme-border/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 transition-all duration-500 ease-out rounded-full" style={{ width: `${progress}%`, backgroundSize: '200% 100%', animation: progress < 100 ? 'shimmer 1.5s ease-in-out infinite' : 'none' }} />
                                    </div>
                                    <p className="text-[10px] text-theme-muted text-center">
                                        {uploadStatus || (progress < 100 ? `Uploading ${progress}%` : 'Processing...')}
                                        {progress > 0 && progress < 100 && <span className="ml-1 opacity-60">({progress}%)</span>}
                                    </p>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="px-5 py-4 border-t border-theme-border/30 flex justify-between items-center bg-theme-surface/50">
                    <div>
                        {step === 2 && (
                            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-xs text-theme-muted hover:text-theme-text transition-colors">
                                Back to File
                            </button>
                        )}
                        {step === 3 && (
                            <button type="button" onClick={() => setStep(2)} className="px-4 py-2 text-xs text-theme-muted hover:text-theme-text transition-colors">
                                Back to Edit
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} disabled={uploading} className="px-4 py-2 text-xs text-theme-muted hover:text-theme-text transition-colors rounded-xl">
                            Cancel
                        </button>

                        {step === 1 && (
                            <Button 
                                type="button" 
                                variant="gold" 
                                disabled={!file} 
                                onClick={() => setStep(2)} 
                                className="rounded-xl px-5 text-xs py-2 h-auto"
                            >
                                Edit Video & Audio
                            </Button>
                        )}

                        {step === 2 && (
                            <Button 
                                type="button" 
                                variant="gold" 
                                onClick={() => setStep(3)} 
                                className="rounded-xl px-5 text-xs py-2 h-auto"
                            >
                                Add Details
                            </Button>
                        )}

                        {step === 3 && (
                            <Button 
                                type="button" 
                                onClick={handleSubmit} 
                                variant="gold" 
                                isLoading={uploading} 
                                disabled={!file || uploading} 
                                className="rounded-xl px-5 text-xs py-2 h-auto"
                            >
                                <Upload style={{ width: 14, height: 14, marginRight: 4 }} /> Publish Reel
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden inputs & audio elements for preview */}
            <input type="file" ref={fileRef} accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <audio ref={audioPreviewRef} className="hidden" loop />
        </div>,
        document.body
    );
}
