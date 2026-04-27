/**
 * Genre Identifier Page — AR-Style Auto-Scan
 * Camera-based real-time artwork detection with AI pattern analysis
 * 
 * Desktop: Accessible via AI Tools sidebar
 * Mobile: Accessible via centered "Learn" bottom nav button
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Sparkles,
    ArrowLeft,
    Settings,
    Share2,
    Volume2,
    Loader2,
    CheckCircle,
    X,
    SwitchCamera,
    Upload,
    Image as ImageIcon,
    Zap,
    Eye,
    History,
    RefreshCw,
    ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDetectionHistory } from '../../../../hooks/useAI';
import './GenreIdentifierPage.css';

// ============================================================
// TYPES
// ============================================================

interface DetectionResult {
    title: string;
    origin: string;
    period: string;
    collection: string;
    patternMeaning: string;
    genres: Array<{ name: string; confidence: number }>;
    style?: string;
    medium?: string;
    mood?: string[];
    overallConfidence: number;
}

// Mock detection results for demo (when AI service isn't available)
const DEMO_DETECTIONS: DetectionResult[] = [
    {
        title: 'Batik Parang Rusak',
        origin: 'Yogyakarta',
        period: '18th Century',
        collection: 'Royal Archives',
        patternMeaning: 'The "Parang" motif symbolizes continuous improvement, like waves crashing against a cliff. Historically reserved for royalty, it embodies the spirit of never giving up.',
        genres: [{ name: 'Traditional Textile', confidence: 0.94 }, { name: 'Indonesian Heritage', confidence: 0.88 }],
        style: 'Javanese Royal',
        medium: 'Wax-resist dyeing on cotton',
        overallConfidence: 0.94,
    },
    {
        title: 'Wayang Kulit Shadow',
        origin: 'Central Java',
        period: '15th Century',
        collection: 'National Museum',
        patternMeaning: 'Shadow puppet artistry depicting Mahabharata epic. The intricate leather carving represents the eternal battle between good and evil in Javanese cosmology.',
        genres: [{ name: 'Shadow Puppet Art', confidence: 0.91 }, { name: 'Performing Arts', confidence: 0.85 }],
        style: 'Classical Javanese',
        medium: 'Buffalo hide leather',
        overallConfidence: 0.91,
    },
    {
        title: 'Songket Palembang',
        origin: 'South Sumatra',
        period: '17th Century',
        collection: 'Textile Heritage',
        patternMeaning: 'Gold-threaded weaving symbolizing prosperity and nobility. Each motif tells stories of Sriwijaya kingdom\'s maritime glory.',
        genres: [{ name: 'Woven Textile', confidence: 0.89 }, { name: 'Royal Craft', confidence: 0.82 }],
        style: 'Sumatran Royal',
        medium: 'Gold thread on silk',
        overallConfidence: 0.89,
    },
];

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
                    <Sparkles className="w-3 h-3" />
                    Motif Detected
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Audio Guide Card */
function AudioGuideCard() {
    return (
        <div className="gid-audio-card">
            <button className="gid-audio-play">
                <Volume2 className="w-5 h-5 text-white" />
            </button>
            <div className="gid-audio-info">
                <span className="gid-audio-label">AUDIO GUIDE</span>
                <span className="gid-audio-title">Listen to the Legend</span>
            </div>
            <div className="gid-audio-wave">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="gid-audio-wave-bar"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    />
                ))}
            </div>
        </div>
    );
}

/** Result Card — Pattern Meaning Section */
function PatternMeaningCard({ result }: { result: DetectionResult }) {
    return (
        <motion.div
            className="gid-pattern-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <div className="gid-pattern-header">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>AI PATTERN MEANING</span>
            </div>
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

    // Hooks
    const { data: historyData } = useDetectionHistory({ limit: 5 });
    const history = historyData?.data || [];

    // -------- Camera Functions --------
    const startCamera = useCallback(async () => {
        setCameraError(null);

        // Check if we're on a secure context (HTTPS or localhost)
        if (!window.isSecureContext) {
            setCameraError('Camera requires a secure connection (HTTPS). Please access this page via HTTPS.');
            return;
        }

        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError('Camera API is not available on this device or browser. Please try uploading an image instead.');
            return;
        }

        try {
            // Check permission status first (if supported)
            if (navigator.permissions) {
                try {
                    const permStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    if (permStatus.state === 'denied') {
                        setCameraError('Camera permission was denied. Please allow camera access in your browser settings and try again.');
                        return;
                    }
                } catch {
                    // permissions.query for camera may not be supported in all browsers — continue
                }
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setCameraReady(true);
                };
            }
            setCameraActive(true);
            setCameraError(null);
        } catch (err: any) {
            console.error('Camera access error:', err);

            // Provide specific, actionable error messages
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('Camera permission was denied. Please allow camera access in your browser settings and reload the page.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setCameraError('No camera found on this device. Please try uploading an image instead.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setCameraError('Camera is already in use by another app. Please close other apps using the camera and try again.');
            } else if (err.name === 'OverconstrainedError') {
                setCameraError('Camera does not support the requested settings. Trying with default settings...');
                // Retry with minimal constraints
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
                    setCameraError('Unable to access camera. Please try uploading an image instead.');
                }
            } else if (err.name === 'SecurityError') {
                setCameraError('Camera access blocked by security policy. This may be a server configuration issue. Please try uploading an image.');
            } else {
                setCameraError(`Unable to access camera: ${err.message || 'Unknown error'}. Please try uploading an image.`);
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
        return () => {
            stopCamera();
        };
    }, [mode, facingMode]);

    // -------- Auto-Scan Simulation --------
    // In production, this would use TensorFlow.js or a real-time API
    useEffect(() => {
        if (!cameraActive || !cameraReady || result) return;

        // Simulate auto-detection after 2.5 seconds
        const scanTimer = setTimeout(() => {
            setIsScanning(true);
        }, 1000);

        const detectTimer = setTimeout(() => {
            setDetected(true);
        }, 2500);

        const resultTimer = setTimeout(() => {
            const randomResult = DEMO_DETECTIONS[Math.floor(Math.random() * DEMO_DETECTIONS.length)];
            setResult(randomResult);
            setIsScanning(false);
            setShowResult(true);
        }, 4000);

        return () => {
            clearTimeout(scanTimer);
            clearTimeout(detectTimer);
            clearTimeout(resultTimer);
        };
    }, [cameraActive, cameraReady, result]);

    // -------- Upload handler --------
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewUrl(URL.createObjectURL(file));
            setIsScanning(true);

            // Simulate analysis
            setTimeout(() => {
                setDetected(true);
            }, 1500);

            setTimeout(() => {
                const randomResult = DEMO_DETECTIONS[Math.floor(Math.random() * DEMO_DETECTIONS.length)];
                setResult(randomResult);
                setIsScanning(false);
                setShowResult(true);
            }, 3000);

            // Real API call (kept for when backend is ready)
            // detectGenre.mutate({ file, onProgress: () => {} }, {
            //     onSuccess: (data) => { setResult(data); setShowResult(true); }
            // });
        }
    };

    // -------- Reset --------
    const handleReset = () => {
        setResult(null);
        setDetected(false);
        setShowResult(false);
        setIsScanning(false);
        setPreviewUrl(null);
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
                        <h2 className="gid-header-title">AR Mode</h2>
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

                {/* Camera / Upload Preview */}
                <div className="gid-viewfinder">
                    {mode === 'camera' ? (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="gid-video"
                            />
                            {!cameraActive && (
                                <div className="gid-camera-placeholder">
                                    {cameraError ? (
                                        <>
                                            <ShieldAlert className="w-12 h-12 text-amber-400/60" />
                                            <p className="text-amber-300/90 text-sm mt-3 text-center px-4 max-w-xs leading-relaxed">{cameraError}</p>
                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    className="gid-control-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
                                                    onClick={() => { setCameraError(null); startCamera(); }}
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    Retry
                                                </button>
                                                <button
                                                    className="gid-control-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
                                                    onClick={() => { setMode('upload'); stopCamera(); }}
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Upload Instead
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-12 h-12 text-white/30" />
                                            <p className="text-white/50 text-sm mt-3">Starting camera...</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    ) : previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Uploaded artwork"
                            className="gid-preview-img"
                        />
                    ) : (
                        <div className="gid-camera-placeholder" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-12 h-12 text-white/30" />
                            <p className="text-white/50 text-sm mt-3">Tap to upload artwork image</p>
                        </div>
                    )}

                    {/* Scan frame overlay */}
                    {(cameraActive || previewUrl) && <ScanFrame />}

                    {/* Detection badge */}
                    <DetectionBadge detected={detected} />

                    {/* Scanning indicator */}
                    <AnimatePresence>
                        {isScanning && (
                            <motion.div
                                className="gid-scanning-indicator"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Analyzing...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Camera controls */}
                    {mode === 'camera' && !result && (
                        <div className="gid-camera-controls">
                            <button
                                className="gid-control-btn"
                                onClick={() => { setMode('upload'); stopCamera(); }}
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button className="gid-control-btn" onClick={switchCamera}>
                                <SwitchCamera className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
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
                                <h2 className="gid-result-title">{result.title}</h2>
                                <p className="gid-result-origin">
                                    {result.origin}, {result.period} • {result.collection}
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
                                <span>{(result.overallConfidence * 100).toFixed(0)}% confidence</span>
                            </div>
                            {result.style && (
                                <span className="gid-style-badge">{result.style}</span>
                            )}
                        </div>

                        {/* Audio Guide */}
                        <AudioGuideCard />

                        {/* Pattern Meaning */}
                        <PatternMeaningCard result={result} />

                        {/* Actions */}
                        <div className="gid-actions">
                            <button className="gid-action-primary" onClick={handleReset}>
                                <Camera className="w-4 h-4" />
                                Scan Again
                            </button>
                            <button className="gid-action-secondary" onClick={handleReset}>
                                New Detection
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== EMPTY STATE (when no camera and no result) ====== */}
            {!cameraActive && !previewUrl && !result && mode === 'upload' && (
                <div className="gid-empty-state">
                    <div className="gid-mode-toggle">
                        <button
                            className="gid-mode-btn"
                            onClick={() => setMode('camera')}
                        >
                            <Camera className="w-4 h-4" />
                            Camera
                        </button>
                        <button
                            className="gid-mode-btn gid-mode-btn--active"
                            onClick={() => { setMode('upload'); fileInputRef.current?.click(); }}
                        >
                            <Upload className="w-4 h-4" />
                            Upload
                        </button>
                    </div>

                    <div className="gid-upload-area" onClick={() => fileInputRef.current?.click()}>
                        <Eye className="w-16 h-16 text-purple-400/30" />
                        <h3 className="gid-upload-title">Point camera at artwork</h3>
                        <p className="gid-upload-subtitle">
                            Or upload an image to identify genres, patterns, and cultural meaning
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
                            <h3>Recent Detections</h3>
                            <button onClick={() => setShowHistory(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {history.length === 0 ? (
                            <div className="gid-history-empty">
                                <History className="w-8 h-8 opacity-30" />
                                <p>No detections yet</p>
                            </div>
                        ) : (
                            <div className="gid-history-list">
                                {history.map((item: any) => (
                                    <div key={item.id} className="gid-history-item">
                                        <div className="gid-history-thumb">
                                            <img src={item.thumbnailUrl || item.imageUrl} alt="" />
                                        </div>
                                        <div className="gid-history-info">
                                            <p className="gid-history-name">
                                                {item.result?.genres?.[0]?.name || 'Unknown'}
                                            </p>
                                            <p className="gid-history-date">
                                                {new Date(item.createdAt).toLocaleDateString()}
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
