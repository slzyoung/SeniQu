/**
 * Genre Identifier Page — AR-Style Heritage Analyzer
 * Camera-based real-time artwork detection with Gemini AI analysis
 * 
 * Desktop: Accessible via AI Tools sidebar
 * Mobile: Accessible via centered "Analyze" bottom nav button
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    ArrowLeft,
    Settings,
    Share2,
    Volume2,
    VolumeX,
    Loader2,
    CheckCircle,
    X,
    SwitchCamera,
    Upload,
    Image as ImageIcon,
    Zap,
    Eye,
    EyeOff,
    History,
    RefreshCw,
    ShieldAlert,
    ScanLine,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHeritageScan, useScanHistory, useScanQuota } from '../../../../hooks/useAI';
import { compressImage } from '../../../../lib/imageCompressor';
import './GenreIdentifierPage.css';

// ============================================================
// TYPES
// ============================================================

interface DetectionResult {
    id?: string;
    name: string;
    origin: string;
    century: string;
    type: string;
    collection: string;
    patternMeaning: string;
    description: string;
    audioScript: string;
    genres: Array<{ name: string; confidence: number }>;
    style?: string;
    medium?: string;
    tags?: string[];
    confidence: number;
    imageUrl?: string;
    quota?: { used: number; limit: number; remaining: number };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** AR-style scanning overlay border */
function ScanFrame() {
    return (
        <div className="gid-scan-frame">
            <div className="gid-scan-corner gid-scan-corner--tl" />
            <div className="gid-scan-corner gid-scan-corner--tr" />
            <div className="gid-scan-corner gid-scan-corner--bl" />
            <div className="gid-scan-corner gid-scan-corner--br" />
            <div className="gid-scan-line" />
        </div>
    );
}

/** Detection badge floating on camera */
function DetectionBadge({ detected }: { detected: boolean }) {
    return (
        <AnimatePresence>
            {detected && (
                <motion.div
                    className="gid-detection-badge"
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                >
                    Heritage Detected
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Audio Guide Card with TTS */
function AudioGuideCard({ audioScript }: { audioScript?: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const toggleAudio = () => {
        if (!audioScript) return;
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(audioScript.replace(/<[^>]*>/g, ''));
            utterance.lang = 'id-ID';
            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    };

    useEffect(() => {
        return () => { window.speechSynthesis.cancel(); };
    }, []);

    if (!audioScript) return null;

    return (
        <div className="gid-audio-card">
            <button className="gid-audio-play" onClick={toggleAudio}>
                {isPlaying ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
            <div className="gid-audio-info">
                <span className="gid-audio-label">AUDIO GUIDE</span>
                <span className="gid-audio-title">{isPlaying ? 'Mendengarkan...' : 'Dengar Narasi Sejarah'}</span>
            </div>
            {isPlaying && (
                <div className="gid-audio-wave">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="gid-audio-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Result Card — Pattern Meaning Section */
function PatternMeaningCard({ result }: { result: DetectionResult }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <motion.div
            className="gid-pattern-card cursor-pointer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="gid-pattern-header flex items-center justify-between w-full" style={{ marginBottom: isExpanded ? 16 : 0, transition: 'margin 0.2s' }}>
                <div className="flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-purple-400" />
                    <span>AI PATTERN ANALYSIS</span>
                </div>
                <div className="flex items-center justify-center p-1 rounded-full hover:bg-white/5 transition-colors">
                    {isExpanded ? (
                        <EyeOff className="w-4 h-4 text-purple-400" />
                    ) : (
                        <Eye className="w-4 h-4 text-purple-400 animate-pulse" />
                    )}
                </div>
            </div>
            
            <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
            >
                <div className="gid-pattern-body">
                    <div className="gid-pattern-thumb">
                        <Zap className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="gid-pattern-text">{result.patternMeaning}</p>
                </div>
                {/* Genres */}
                <div className="gid-genre-tags">
                    {result.genres.map((g) => (
                        <span key={g.name} className="gid-genre-tag">
                            {g.name} — {(g.confidence * 100).toFixed(0)}%
                        </span>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function GenreIdentifierPage() {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // State
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [detected, setDetected] = useState(false);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [showResult, setShowResult] = useState(false);
    const [mode, setMode] = useState<'camera' | 'upload'>('camera');
    const [showHistory, setShowHistory] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [descExpanded, setDescExpanded] = useState(false);

    // Hooks — real AI
    const scanMutation = useHeritageScan();
    const { data: quotaData } = useScanQuota();
    const { data: historyData } = useScanHistory();
    const history = historyData || [];

    // -------- Camera Functions --------
    const startCamera = useCallback(async () => {
        setCameraError(null);

        if (!window.isSecureContext) {
            setCameraError('Kamera memerlukan koneksi aman (HTTPS). Silakan akses halaman ini melalui HTTPS.');
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError('API Kamera tidak tersedia di perangkat ini. Silakan upload gambar.');
            return;
        }

        try {
            if (navigator.permissions) {
                try {
                    const permStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permStatus.state === 'denied') {
                        setCameraError('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.');
                        return;
                    }
                } catch { /* permissions.query may not support camera */ }
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => setCameraReady(true);
            }
            setCameraActive(true);
            setCameraError(null);
        } catch (err: any) {
            console.error('Camera access error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('Izin kamera ditolak. Silakan izinkan akses kamera.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setCameraError('Tidak ada kamera ditemukan. Silakan upload gambar.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setCameraError('Kamera sedang digunakan aplikasi lain.');
            } else if (err.name === 'OverconstrainedError') {
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    streamRef.current = fallbackStream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream;
                        videoRef.current.onloadedmetadata = () => setCameraReady(true);
                    }
                    setCameraActive(true);
                    setCameraError(null);
                    return;
                } catch {
                    setCameraError('Tidak dapat mengakses kamera. Silakan upload gambar.');
                }
            } else {
                setCameraError(`Tidak dapat mengakses kamera: ${err.message || 'Error tidak dikenal'}`);
            }
        }
    }, [facingMode]);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraActive(false);
        setCameraReady(false);
    }, []);

    const switchCamera = useCallback(() => {
        stopCamera();
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }, [stopCamera]);

    // Auto-start camera when in camera mode
    useEffect(() => {
        if (mode === 'camera' && !result) {
            startCamera();
        }
        return () => { stopCamera(); };
    }, [mode, facingMode]);

    // -------- Capture from camera and send to Gemini --------
    const captureAndAnalyze = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !cameraReady) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
            setIsScanning(true);
            setDetected(true);
            setScanError(null);

            scanMutation.mutate({ file }, {
                onSuccess: (data: any) => {
                    setResult({
                        id: data.id,
                        name: data.name || 'Unknown',
                        origin: data.origin || 'Unknown',
                        century: data.century || 'Unknown',
                        type: data.type || 'Unknown',
                        collection: data.collection || 'SeniQu Archive',
                        patternMeaning: data.patternMeaning || '',
                        description: data.description || '',
                        audioScript: data.audioScript || '',
                        genres: data.genres || [],
                        style: data.style,
                        medium: data.medium,
                        tags: data.tags || [],
                        confidence: (data.confidence || 80) / 100,
                        imageUrl: data.imageUrl,
                        quota: data.quota,
                    });
                    setIsScanning(false);
                    setShowResult(true);
                    stopCamera();
                },
                onError: (error: any) => {
                    setIsScanning(false);
                    setDetected(false);
                    setScanError(error?.response?.data?.message || error.message || 'Gagal menganalisis gambar.');
                },
            });
        }, 'image/jpeg', 0.85);
    }, [cameraReady, scanMutation, stopCamera]);

    // Auto-capture from camera after 3 seconds of being ready
    useEffect(() => {
        if (!cameraActive || !cameraReady || result || scanMutation.isPending) return;

        const detectTimer = setTimeout(() => {
            setDetected(true);
        }, 2000);

        const captureTimer = setTimeout(() => {
            captureAndAnalyze();
        }, 3500);

        return () => {
            clearTimeout(detectTimer);
            clearTimeout(captureTimer);
        };
    }, [cameraActive, cameraReady, result, scanMutation.isPending, captureAndAnalyze]);

    // -------- Upload handler — send file to Gemini --------
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const originalFile = e.target.files?.[0];
        if (originalFile) {
            setPreviewUrl(URL.createObjectURL(originalFile));
            setIsScanning(true);
            setDetected(true);
            setScanError(null);

            let file = originalFile;
            try {
                // Pre-compress the image to reduce transfer times and prevent payload size errors on mobile
                file = await compressImage(originalFile, {
                    maxWidth: 1600,
                    maxHeight: 1600,
                    quality: 0.8,
                    outputType: 'image/jpeg',
                });
                setPreviewUrl(URL.createObjectURL(file));
            } catch (err) {
                console.warn('Gagal melakukan kompresi gambar, menggunakan file asli:', err);
            }

            scanMutation.mutate({ file }, {
                onSuccess: (data: any) => {
                    setResult({
                        id: data.id,
                        name: data.name || 'Unknown',
                        origin: data.origin || 'Unknown',
                        century: data.century || 'Unknown',
                        type: data.type || 'Unknown',
                        collection: data.collection || 'SeniQu Archive',
                        patternMeaning: data.patternMeaning || '',
                        description: data.description || '',
                        audioScript: data.audioScript || '',
                        genres: data.genres || [],
                        style: data.style,
                        medium: data.medium,
                        tags: data.tags || [],
                        confidence: (data.confidence || 80) / 100,
                        imageUrl: data.imageUrl,
                        quota: data.quota,
                    });
                    setIsScanning(false);
                    setShowResult(true);
                },
                onError: (error: any) => {
                    setIsScanning(false);
                    setDetected(false);
                    setScanError(error?.response?.data?.message || error.message || 'Gagal menganalisis gambar.');
                },
            });
        }
        // Reset file input value to allow selecting the same file again
        e.target.value = '';
    };

    // -------- Reset --------
    const handleReset = () => {
        setResult(null);
        setDetected(false);
        setShowResult(false);
        setIsScanning(false);
        setPreviewUrl(null);
        setScanError(null);
        setDescExpanded(false);
        if (mode === 'camera') {
            startCamera();
        }
    };

    return (
        <div className="gid-container">
            {/* ====== AR CAMERA VIEW ====== */}
            <div className="gid-camera-section">
                {/* Header Bar */}
                <div className="gid-header">
                    <button className="gid-header-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="gid-header-center">
                        <h2 className="gid-header-title">Heritage Analyzer</h2>
                        {cameraActive && (
                            <motion.span
                                className="gid-live-badge"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <span className="gid-live-dot" />
                                LIVE
                            </motion.span>
                        )}
                    </div>
                    <button className="gid-header-btn" onClick={() => setShowHistory(!showHistory)}>
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* Quota indicator */}
                {quotaData && (
                    <div className="gid-quota-bar" style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                        <span>Kuota: {quotaData.remaining}/{quotaData.limit}</span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                            <div style={{ width: `${(quotaData.remaining / quotaData.limit) * 100}%`, height: '100%', background: quotaData.remaining > 0 ? '#c9a84c' : '#ef4444', borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                )}

                {/* Camera / Upload Preview */}
                <div className="gid-viewfinder">
                    {mode === 'camera' ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="gid-video" />
                            {!cameraActive && (
                                <div className="gid-camera-placeholder">
                                    {cameraError ? (
                                        <>
                                            <ShieldAlert className="w-12 h-12 text-amber-400/60" />
                                            <p className="text-amber-300/90 text-sm mt-3 text-center px-4 max-w-xs leading-relaxed">{cameraError}</p>
                                            <div className="flex gap-2 mt-4">
                                                <button className="gid-control-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium" onClick={() => { setCameraError(null); startCamera(); }}>
                                                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                                                </button>
                                                <button className="gid-control-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium" onClick={() => { setMode('upload'); stopCamera(); }}>
                                                    <Upload className="w-3.5 h-3.5" /> Upload
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-12 h-12 text-white/30" />
                                            <p className="text-white/50 text-sm mt-3">Memulai kamera...</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    ) : previewUrl ? (
                        <img src={previewUrl} alt="Uploaded artwork" className="gid-preview-img" />
                    ) : (
                        <div className="gid-camera-placeholder" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-12 h-12 text-white/30" />
                            <p className="text-white/50 text-sm mt-3">Ketuk untuk upload gambar</p>
                        </div>
                    )}

                    {/* Scan frame overlay */}
                    {(cameraActive || previewUrl) && <ScanFrame />}

                    {/* Detection badge */}
                    <DetectionBadge detected={detected} />

                    {/* Scanning indicator */}
                    <AnimatePresence>
                        {(isScanning || scanMutation.isPending) && (
                            <motion.div className="gid-scanning-indicator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Menganalisis dengan Gemini AI...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scan error */}
                    <AnimatePresence>
                        {scanError && (
                            <motion.div
                                className="gid-scanning-indicator"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ background: 'rgba(239,68,68,0.85)' }}
                            >
                                <ShieldAlert className="w-5 h-5" />
                                <span>{scanError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Camera controls */}
                    {mode === 'camera' && !result && (
                        <div className="gid-camera-controls">
                            <button className="gid-control-btn" onClick={() => { setMode('upload'); stopCamera(); }}>
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button className="gid-control-btn" onClick={switchCamera}>
                                <SwitchCamera className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* ====== RESULT SECTION ====== */}
            <AnimatePresence>
                {showResult && result && (
                    <motion.div
                        className="gid-result-section"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', damping: 25 }}
                    >
                        {/* Title row */}
                        <div className="gid-result-header">
                            <div>
                                <h2 className="gid-result-title">{result.name}</h2>
                                <p className="gid-result-origin">
                                    {result.origin}, {result.century} • {result.collection}
                                </p>
                            </div>
                            <button className="gid-share-btn">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Confidence Badge */}
                        <div className="gid-confidence-row">
                            <div className="gid-confidence-badge">
                                <CheckCircle className="w-4 h-4" />
                                <span>{(result.confidence * 100).toFixed(0)}% confidence</span>
                            </div>
                            {result.style && (
                                <span className="gid-style-badge">{result.style}</span>
                            )}
                        </div>

                        {/* Audio Guide with TTS */}
                        <AudioGuideCard audioScript={result.audioScript} />

                        {/* Description */}
                        {result.description && (
                            <motion.div
                                className="gid-pattern-card cursor-pointer"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                onClick={() => setDescExpanded(!descExpanded)}
                            >
                                <div className="gid-pattern-header flex items-center justify-between w-full" style={{ marginBottom: descExpanded ? 16 : 0, transition: 'margin 0.2s' }}>
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-purple-400" />
                                        <span>DESKRIPSI HERITAGE</span>
                                    </div>
                                    <div className="flex items-center justify-center p-1 rounded-full hover:bg-white/5 transition-colors">
                                        {descExpanded ? (
                                            <EyeOff className="w-4 h-4 text-purple-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-purple-400 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                                <motion.div
                                    initial={false}
                                    animate={{ height: descExpanded ? 'auto' : 0, opacity: descExpanded ? 1 : 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <p className="gid-pattern-text" style={{ padding: '4px 0 12px 0', fontSize: 13.5, lineHeight: 1.7 }}>
                                        {result.description}
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Pattern Meaning */}
                        <PatternMeaningCard result={result} />

                        {/* Tags */}
                        {result.tags && result.tags.length > 0 && (
                            <div className="gid-genre-tags" style={{ paddingTop: 8 }}>
                                {result.tags.map((tag) => (
                                    <span key={tag} className="gid-genre-tag" style={{ background: 'rgba(124,107,212,0.15)', color: '#a78bfa' }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="gid-actions">
                            <button className="gid-action-primary" onClick={handleReset}>
                                <Camera className="w-4 h-4" />
                                Analisis Lagi
                            </button>
                            <button className="gid-action-secondary" onClick={handleReset}>
                                Deteksi Baru
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== EMPTY STATE (when no camera and no result) ====== */}
            {!cameraActive && !previewUrl && !result && mode === 'upload' && (
                <div className="gid-empty-state">
                    <div className="gid-mode-toggle">
                        <button className="gid-mode-btn" onClick={() => setMode('camera')}>
                            <Camera className="w-4 h-4" /> Kamera
                        </button>
                        <button className="gid-mode-btn gid-mode-btn--active" onClick={() => { setMode('upload'); fileInputRef.current?.click(); }}>
                            <Upload className="w-4 h-4" /> Upload
                        </button>
                    </div>

                    <div className="gid-upload-area" onClick={() => fileInputRef.current?.click()}>
                        <Eye className="w-16 h-16 text-purple-400/30" />
                        <h3 className="gid-upload-title">Arahkan kamera ke karya seni</h3>
                        <p className="gid-upload-subtitle">
                            Atau upload gambar untuk mengidentifikasi genre, pola, dan makna budaya dengan Gemini AI
                        </p>
                    </div>
                </div>
            )}

            {/* ====== HISTORY PANEL ====== */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        className="gid-history-panel"
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                    >
                        <div className="gid-history-header">
                            <h3>Riwayat Analisis</h3>
                            <button onClick={() => setShowHistory(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {history.length === 0 ? (
                            <div className="gid-history-empty">
                                <History className="w-8 h-8 opacity-30" />
                                <p>Belum ada analisis</p>
                            </div>
                        ) : (
                            <div className="gid-history-list">
                                {history.map((item: any) => (
                                    <div key={item.id} className="gid-history-item">
                                        <div className="gid-history-thumb">
                                            <img src={item.image_url} alt="" />
                                        </div>
                                        <div className="gid-history-info">
                                            <p className="gid-history-name">
                                                {item.heritage_name || 'Unknown'}
                                            </p>
                                            <p className="gid-history-date">
                                                {new Date(item.created_at).toLocaleDateString('id-ID')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default GenreIdentifierPage;
