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
                    <ScanLine className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>AI PATTERN ANALYSIS</span>
                </div>
                <div className="flex items-center justify-center p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    {isExpanded ? (
                        <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                        <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
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
                        <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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

function cleanArtworkTitle(rawName: string) {
    if (!rawName) return { mainTitle: 'Artefak Teridentifikasi', subTitle: '' };
    const parts = rawName.split('/').map(p => p.trim());
    if (parts.length > 1) {
        const cleanSub = parts[0].replace(/[\(\)]/g, '').trim();
        const cleanMain = parts[1].replace(/[\(\)]/g, '').trim();
        return { mainTitle: cleanMain || cleanSub, subTitle: cleanSub !== cleanMain ? cleanSub : '' };
    }
    return { mainTitle: rawName.replace(/[\(\)]/g, '').trim(), subTitle: '' };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function GenreIdentifierPage() {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraFileInputRef = useRef<HTMLInputElement>(null);
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
            setCameraError('API Kamera tidak tersedia di perangkat ini. Silakan upload gambar dari galeri.');
            return;
        }

        try {
            if (navigator.permissions) {
                try {
                    const permStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permStatus.state === 'denied') {
                        setCameraError('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser atau pilih gambar dari galeri.');
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
                setCameraError('Izin kamera ditolak. Silakan pilih foto dari galeri.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setCameraError('Kamera tidak ditemukan. Silakan upload gambar dari galeri.');
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
                    setCameraError('Tidak dapat mengakses kamera. Silakan upload dari galeri.');
                }
            } else {
                setCameraError(`Akses kamera gagal: ${err.message || 'Error tidak dikenal'}`);
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
        if (!videoRef.current || !canvasRef.current || !cameraReady || scanMutation.isPending) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], 'camera_scan.jpg', { type: 'image/jpeg' });
            setIsScanning(true);
            setDetected(true);
            setScanError(null);

            scanMutation.mutate({ file }, {
                onSuccess: (data: any) => {
                    setResult({
                        id: data.id,
                        name: data.name || 'Teridentifikasi',
                        origin: data.origin || 'Nusantara',
                        century: data.century || 'Klasik',
                        type: data.type || 'Artefak',
                        collection: data.collection || 'SeniQu Archive',
                        patternMeaning: data.patternMeaning || '',
                        description: data.description || '',
                        audioScript: data.audioScript || '',
                        genres: data.genres || [],
                        style: data.style,
                        medium: data.medium,
                        tags: data.tags || [],
                        confidence: (data.confidence || 85) / 100,
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
                    setScanError(error?.response?.data?.message || error.message || 'Gagal menganalisis gambar dengan Gemini AI.');
                },
            });
        }, 'image/jpeg', 0.88);
    }, [cameraReady, scanMutation, stopCamera]);

    // Auto-detect and optional auto-capture timer
    useEffect(() => {
        if (!cameraActive || !cameraReady || result || scanMutation.isPending || isScanning) return;

        const detectTimer = setTimeout(() => {
            setDetected(true);
        }, 1800);

        return () => {
            clearTimeout(detectTimer);
        };
    }, [cameraActive, cameraReady, result, scanMutation.isPending, isScanning]);

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
                file = await compressImage(originalFile, {
                    maxWidth: 1600,
                    maxHeight: 1600,
                    quality: 0.85,
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
                        name: data.name || 'Teridentifikasi',
                        origin: data.origin || 'Nusantara',
                        century: data.century || 'Klasik',
                        type: data.type || 'Artefak',
                        collection: data.collection || 'SeniQu Archive',
                        patternMeaning: data.patternMeaning || '',
                        description: data.description || '',
                        audioScript: data.audioScript || '',
                        genres: data.genres || [],
                        style: data.style,
                        medium: data.medium,
                        tags: data.tags || [],
                        confidence: (data.confidence || 85) / 100,
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

    const titleParts = result ? cleanArtworkTitle(result.name) : { mainTitle: '', subTitle: '' };

    return (
        <div className="gid-container">
            {/* ====== AR CAMERA VIEW ====== */}
            <div className="gid-camera-section">
                {/* Header Bar */}
                <div className="gid-header flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full">
                        <button className="gid-header-btn" onClick={() => navigate(-1)} aria-label="Kembali">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="gid-header-center">
                            <h2 className="gid-header-title">Heritage Scanner</h2>
                            {cameraActive && (
                                <motion.span
                                    className="gid-live-badge"
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <span className="gid-live-dot" />
                                    REALTIME AR
                                </motion.span>
                            )}
                        </div>
                        <button className="gid-header-btn" onClick={() => setShowHistory(!showHistory)} aria-label="Riwayat">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Integrated Sleek Quota Bar inside Header */}
                    {quotaData && (
                        <div className="gid-quota-pill self-center px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 text-[11px] text-white/80">
                            <span>Kuota Scan: <strong className="text-amber-300">{quotaData.remaining}/{quotaData.limit}</strong></span>
                            <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(quotaData.remaining / quotaData.limit) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>


                {/* Camera / Upload Preview */}
                <div className="gid-viewfinder">
                    {mode === 'camera' ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="gid-video" />
                            {!cameraActive && (
                                <div className="gid-camera-placeholder">
                                    {cameraError ? (
                                        <>
                                            <ShieldAlert className="w-12 h-12 text-amber-400/80" />
                                            <p className="text-amber-200/90 text-xs mt-3 text-center px-4 max-w-xs leading-relaxed">{cameraError}</p>
                                            <div className="flex gap-2 mt-4">
                                                <button className="gid-control-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-gold/20 text-gold border border-gold/40 rounded-xl hover:bg-gold/30 transition-all" onClick={() => { setCameraError(null); startCamera(); }}>
                                                    <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                                                </button>
                                                <button className="gid-control-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all" onClick={() => { setMode('upload'); stopCamera(); fileInputRef.current?.click(); }}>
                                                    <ImageIcon className="w-3.5 h-3.5" /> Buka Galeri
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-12 h-12 text-gold/50 animate-pulse" />
                                            <p className="text-white/70 text-xs mt-3">Menghubungkan ke kamera...</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    ) : previewUrl ? (
                        <img src={previewUrl} alt="Uploaded artwork" className="gid-preview-img" />
                    ) : (
                        <div className="gid-camera-placeholder cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-12 h-12 text-gold/60 mb-2" />
                            <p className="text-white/80 text-sm font-medium">Pilih foto dari Galeri HP</p>
                            <p className="text-white/40 text-xs mt-1">Mendukung JPG, PNG, WEBP, HEIC</p>
                        </div>
                    )}

                    {/* Scan frame overlay */}
                    {(cameraActive || previewUrl) && <ScanFrame />}

                    {/* Detection badge */}
                    <DetectionBadge detected={detected} />

                    {/* Scanning indicator */}
                    <AnimatePresence>
                        {(isScanning || scanMutation.isPending) && (
                            <motion.div className="gid-scanning-indicator" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                                <Loader2 className="w-5 h-5 animate-spin text-gold" />
                                <span>Menganalisis karya budaya dengan Gemini 3.6 Flash...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Real-time Scan Action Button over camera */}
                    {mode === 'camera' && cameraActive && !result && !isScanning && !scanMutation.isPending && (
                        <motion.div
                            className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-4"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <button
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold via-amber-400 to-yellow-500 text-slate-950 font-bold text-sm rounded-full shadow-lg shadow-gold/30 hover:scale-105 active:scale-95 transition-all"
                                onClick={captureAndAnalyze}
                            >
                                <Camera className="w-4 h-4" />
                                <span>Scan Realtime (Gemini AI)</span>
                            </button>
                        </motion.div>
                    )}

                    {/* Scan error */}
                    <AnimatePresence>
                        {scanError && (
                            <motion.div
                                className="gid-scanning-indicator"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                style={{ background: 'rgba(239,68,68,0.92)', border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                <span className="text-xs">{scanError}</span>
                                <button className="ml-2 px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold uppercase" onClick={handleReset}>Coba lagi</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Camera mode controls */}
                    {mode === 'camera' && !result && (
                        <div className="gid-camera-controls">
                            <button className="gid-control-btn" title="Pilih dari Galeri Foto" onClick={() => { setMode('upload'); stopCamera(); fileInputRef.current?.click(); }}>
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button className="gid-control-btn" title="Ganti Kamera" onClick={switchCamera}>
                                <SwitchCamera className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Hidden file inputs: Gallery picker & direct mobile camera input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,image/heic,image/heif"
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <input
                    ref={cameraFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                />
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
                                <h2 className="gid-result-title">{titleParts.mainTitle}</h2>
                                {titleParts.subTitle && (
                                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1 italic font-serif">
                                        "{titleParts.subTitle}"
                                    </p>
                                )}
                                <p className="gid-result-origin">
                                    {result.origin}, {result.century} • {result.collection}
                                </p>
                            </div>
                            <button className="gid-share-btn" title="Bagikan">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Confidence Badge */}
                        <div className="gid-confidence-row">
                            <div className="gid-confidence-badge">
                                <CheckCircle className="w-4 h-4" />
                                <span>{(result.confidence * 100).toFixed(0)}% Akurasi Identifikasi</span>
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
                                        <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <span>DESKRIPSI HERITAGE</span>
                                    </div>
                                    <div className="flex items-center justify-center p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        {descExpanded ? (
                                            <EyeOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
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
                                Scan Lagi
                            </button>
                            <button className="gid-action-secondary" onClick={() => { handleReset(); setMode('upload'); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                                <ImageIcon className="w-4 h-4" />
                                Galeri Foto
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== MODE TOGGLE & MOBILE GALLERY OPTIONS ====== */}
            {!result && (
                <div className="gid-empty-state" style={{ paddingTop: 16 }}>
                    <div className="gid-mode-toggle">
                        <button className={`gid-mode-btn ${mode === 'camera' ? 'gid-mode-btn--active' : ''}`} onClick={() => { setMode('camera'); startCamera(); }}>
                            <Camera className="w-4 h-4" /> Realtime AR
                        </button>
                        <button className={`gid-mode-btn ${mode === 'upload' ? 'gid-mode-btn--active' : ''}`} onClick={() => { setMode('upload'); stopCamera(); fileInputRef.current?.click(); }}>
                            <ImageIcon className="w-4 h-4" /> Galeri HP
                        </button>
                    </div>

                    {mode === 'upload' && !previewUrl && (
                        <div className="gid-upload-area flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-all cursor-pointer text-center" onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon className="w-14 h-14 text-gold/60 mb-3" />
                            <h3 className="gid-upload-title text-base font-semibold text-white">Buka Galeri Foto</h3>
                            <p className="gid-upload-subtitle text-xs text-gray-400 mt-1 max-w-xs">
                                Ketuk di sini untuk memilih foto artefak, batik, relief, atau karya seni dari galeri perangkat Anda
                            </p>
                            <div className="flex items-center gap-3 mt-4">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-xs font-semibold bg-gold/20 text-gold border border-gold/30 rounded-xl hover:bg-gold/30 transition-all flex items-center gap-1.5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <ImageIcon className="w-3.5 h-3.5" /> Pilih dari Galeri
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 text-xs font-semibold bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center gap-1.5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        cameraFileInputRef.current?.click();
                                    }}
                                >
                                    <Camera className="w-3.5 h-3.5" /> Ambil Foto
                                </button>
                            </div>
                        </div>
                    )}
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
                            <h3>Riwayat Analisis Gemini AI</h3>
                            <button onClick={() => setShowHistory(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {history.length === 0 ? (
                            <div className="gid-history-empty">
                                <History className="w-8 h-8 opacity-30" />
                                <p>Belum ada riwayat analisis</p>
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
                                                {item.heritage_name || 'Artefak Nusantara'}
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
