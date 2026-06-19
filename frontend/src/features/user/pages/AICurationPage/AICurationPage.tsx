/**
 * AI Curation Page — Heritage Restoration & Curation Lab
 * Premium immersive artwork curation, Dublin Core metadata,
 * interactive Before/After image restoration slider, TTS narration,
 * and certificate export.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    Play,
    Pause,
    Download,
    Share2,
    FileText,
    User,
    Calendar,
    Award,
    Info,
    Sliders,
    Loader2,
    Eye,
    EyeOff,
    FileJson,
    Plus,
    Search,
    X,
    Heart,
    Film,
    Box
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useToast } from '../../../../stores/useNotificationStore';
import {
    useHeritageCuration,
    useCurationQuota,
    useCurationHistory,
    usePublicCurations,
    usePublishCuration,
    useHeritageCurationComments,
    useAddHeritageCurationComment,
    useLikeHeritageCuration
} from '../../../../hooks/useAI';

import './AICurationPage.css';

export function AICurationPage() {
    const currentUser = useAuthStore((s) => s.user);
    const toast = useToast();

    // Tab state: 'masterpieces' (Galeri Komunitas), 'lab' (Lab Restorasi), 'animate' (AI Motion Studio)
    const [activeTab, setActiveTab] = useState<'masterpieces' | 'lab' | 'animate'>('masterpieces');

    // UI state for Lab
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [curationResult, setCurationResult] = useState<any>(null);

    // Collapsible states
    const [descExpanded, setDescExpanded] = useState(false);

    // Advanced Interactive Curation States
    const [isInspectorMode, setIsInspectorMode] = useState(false);
    const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [warmth, setWarmth] = useState(0);
    const [saturation, setSaturation] = useState(100);
    const [significanceExpanded, setSignificanceExpanded] = useState(false);
    const [metadataExpanded, setMetadataExpanded] = useState(false);

    // Selected masterpiece detail modal state
    const [selectedDetailCuration, setSelectedDetailCuration] = useState<any>(null);
    const [modalActiveTab, setModalActiveTab] = useState<'details' | 'restoration' | 'metadata'>('details');
    const [modalWarmth, setModalWarmth] = useState(0);
    const [modalSaturation, setModalSaturation] = useState(100);
    const [modalSliderPosition, setModalSliderPosition] = useState(50);
    const [isModalDragging, setIsModalDragging] = useState(false);
    const modalContainerRef = useRef<HTMLDivElement>(null);
    const simulationCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // AI Motion Studio client-side simulation state
    const [motionSourceUrl, setMotionSourceUrl] = useState<string | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<'zoom' | 'pan' | 'rotate'>('zoom');
    const [isPlayingSimulation, setIsPlayingSimulation] = useState(false);
    const [isGeneratingSimulation, setIsGeneratingSimulation] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [showSimulationOverlay, setShowSimulationOverlay] = useState(true);

    // Interactive Brush Reveal Mode state
    const [isBrushMode, setIsBrushMode] = useState(false);

    // Likes and comments state
    const [likesState, setLikesState] = useState<{ count: number; liked: boolean }>({ count: 0, liked: false });
    const [newCommentText, setNewCommentText] = useState('');

    // Modal Before/After slider handlers
    const handleModalMove = (clientX: number) => {
        if (!modalContainerRef.current) return;
        const rect = modalContainerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setModalSliderPosition(percentage);
    };

    const handleModalTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            handleModalMove(e.touches[0].clientX);
        }
    };

    const handleModalMouseMove = (e: React.MouseEvent) => {
        if (e.buttons === 1 || isModalDragging) {
            handleModalMove(e.clientX);
        }
    };    // Load likes when detail curation opens, and query comments from DB
    useEffect(() => {
        if (selectedDetailCuration) {
            setLikesState({
                count: selectedDetailCuration.likes_count || 0,
                liked: !!selectedDetailCuration.liked
            });
        }
    }, [selectedDetailCuration]);

    const handleToggleLike = () => {
        if (!selectedDetailCuration) return;

        // Optimistically update
        const newLiked = !likesState.liked;
        const newCount = newLiked ? likesState.count + 1 : Math.max(0, likesState.count - 1);
        setLikesState({
            count: newCount,
            liked: newLiked
        });

        likeMutation.mutate(selectedDetailCuration.id, {
            onSuccess: (data) => {
                setLikesState({
                    count: data.likesCount,
                    liked: data.isLiked
                });
            },
            onError: () => {
                // Revert
                setLikesState({
                    count: likesState.count,
                    liked: likesState.liked
                });
            }
        });
    };

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim() || !selectedDetailCuration) return;

        addCommentMutation.mutate({
            curationId: selectedDetailCuration.id,
            content: newCommentText.trim()
        }, {
            onSuccess: () => {
                setNewCommentText('');
            }
        });
    };

    // Queries and Mutations
    const quotaQuery = useCurationQuota();
    const historyQuery = useCurationHistory();
    const publicQuery = usePublicCurations();
    const curationMutation = useHeritageCuration();
    const publishMutation = usePublishCuration();

    const { data: serverComments = [] } = useHeritageCurationComments(selectedDetailCuration?.id || '');
    const likeMutation = useLikeHeritageCuration();
    const addCommentMutation = useAddHeritageCurationComment();

    // Drag handler refs for Before/After slider
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Web Speech API Ref
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Handle Before/After slider drag/move
    const handleMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (e.buttons === 1 || isDragging) {
            handleMove(e.clientX);
        }
    };

    // Magnifying Lens Handlers for X-Ray Spectral Inspector
    const handleLensMove = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const boundedX = Math.max(0, Math.min(rect.width, x));
        const boundedY = Math.max(0, Math.min(rect.height, y));
        setLensPosition({ x: boundedX, y: boundedY });
        setContainerSize({ width: rect.width, height: rect.height });
    };

    const handleTouchMoveLens = (e: React.TouchEvent) => {
        if (isInspectorMode && e.touches.length > 0) {
            handleLensMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleMouseMoveLens = (e: React.MouseEvent) => {
        if (isInspectorMode) {
            handleLensMove(e.clientX, e.clientY);
        }
    };

    // Text to Speech (TTS) Audio Guide
    const handleToggleAudio = (text: string) => {
        if (!text) return;
        if (isPlayingAudio) {
            window.speechSynthesis.cancel();
            setIsPlayingAudio(false);
        } else {
            window.speechSynthesis.cancel();
            // Clean text slightly for clearer voice
            const cleanText = text.replace(/<[^>]*>/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'en-US';
            utterance.onend = () => setIsPlayingAudio(false);
            utterance.onerror = () => setIsPlayingAudio(false);
            synthRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setIsPlayingAudio(true);
        }
    };

    // Cancel audio guide on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // File Upload Handler
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setCurationResult(null);
            setIsPlayingAudio(false);
            setDescExpanded(false);
            setSignificanceExpanded(false);
            setMetadataExpanded(false);
            window.speechSynthesis.cancel();
        }
    };

    // Curate Cagar Budaya Mutation Call
    const handleCurate = () => {
        if (!selectedFile) return;

        setUploadProgress(10);
        const interval = setInterval(() => {
            setUploadProgress((p) => (p >= 90 ? 90 : p + 15));
        }, 600);

        curationMutation.mutate(
            { file: selectedFile },
            {
                onSuccess: (data) => {
                    clearInterval(interval);
                    setUploadProgress(100);
                    setTimeout(() => {
                        setCurationResult(data);
                        setUploadProgress(0);
                    }, 500);
                },
                onError: () => {
                    clearInterval(interval);
                    setUploadProgress(0);
                }
            }
        );
    };

    // Publish Curation
    const handlePublishCuration = () => {
        if (!curationResult?.id) return;
        publishMutation.mutate(curationResult.id, {
            onSuccess: (updated) => {
                setCurationResult(updated);
            }
        });
    };

    // Download restorer raw WebP image
    const handleDownloadImage = () => {
        if (!curationResult?.image_url) return;
        const link = document.createElement('a');
        link.href = curationResult.image_url;
        link.download = `SeniQu_Restorasi_${curationResult.curation_name.replace(/\s+/g, '_')}.webp`;
        link.target = '_blank';
        link.click();
        toast.success('Image Downloaded', 'Restored image successfully downloaded.');
    };

    // Download Curatorial Notes (TXT)
    const handleDownloadReportTxt = () => {
        if (!curationResult) return;
        const metadata = curationResult.metadata || {};
        const report = `LAPORAN KURASI & RESTORASI DIGITAL SENIQU AI
===================================================
ID Kurasi     : ${curationResult.id}
Nama Objek    : ${curationResult.curation_name}
Era/Periode   : ${curationResult.original_era}
Taksiran Nilai: ${curationResult.valuation_estimate}
Tanggal Kurasi: ${new Date(curationResult.created_at).toLocaleString('id-ID')}
Kurator       : ${currentUser?.displayName || currentUser?.username}

DESKRIPSI KURATORIAL:
${curationResult.curation_description}

NILAI SIGNIFIKANSI HISTORIS:
${curationResult.historical_significance}

LANGKAH RESTORASI DIGITAL:
${(curationResult.restoration_steps || []).map((s: any) => `${s.step}. ${s.title}: ${s.description}`).join('\n')}

DUBLIN CORE METADATA:
- Title       : ${metadata.Title || curationResult.curation_name}
- Creator     : ${metadata.Creator || 'Unknown'}
- Subject     : ${metadata.Subject || 'Arsip Sejarah'}
- Description : ${metadata.Description || curationResult.curation_description}
- Date        : ${metadata.Date || curationResult.original_era}
- Type        : ${metadata.Type || 'Physical Object'}
- Format      : ${metadata.Format || 'Image'}
- Source      : ${metadata.Source || 'SeniQu Lab'}
- Language    : ${metadata.Language || 'id'}
- Coverage    : ${metadata.Coverage || 'Indonesia'}
- Rights      : ${metadata.Rights || 'Creative Commons'}
===================================================
Dibuat secara otomatis menggunakan SeniQu Digital Curation Engine.`;

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Laporan_Kurasi_${curationResult.curation_name.replace(/\s+/g, '_')}.txt`;
        link.click();
        toast.success('Report Downloaded', 'Complete curation notes successfully downloaded as TXT.');
    };

    // Download Metadata JSON-LD
    const handleDownloadJsonLd = () => {
        if (!curationResult) return;
        const metadata = curationResult.metadata || {};
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "VisualArtwork",
            "name": curationResult.curation_name,
            "creator": {
                "@type": "Person",
                "name": metadata.Creator || "Unknown"
            },
            "dateCreated": metadata.Date || curationResult.original_era,
            "description": curationResult.curation_description,
            "material": metadata.Format || "Image",
            "publisher": {
                "@type": "Organization",
                "name": "SeniQu Digital Archive"
            },
            "license": metadata.Rights || "Creative Commons",
            "dublinCore": {
                "title": metadata.Title || curationResult.curation_name,
                "creator": metadata.Creator || "Unknown",
                "subject": metadata.Subject || "Cagar Budaya",
                "description": metadata.Description || curationResult.curation_description,
                "date": metadata.Date || curationResult.original_era,
                "type": metadata.Type || "Physical Object",
                "format": metadata.Format || "Image",
                "source": metadata.Source || "SeniQu Digital Archive",
                "rights": metadata.Rights || "Public Domain"
            }
        };

        const blob = new Blob([JSON.stringify(jsonLd, null, 2)], { type: 'application/ld+json;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Metadata_LD_${curationResult.curation_name.replace(/\s+/g, '_')}.json`;
        link.click();
        toast.success('Metadata Exported', 'JSON-LD metadata file successfully downloaded.');
    };

    // Canvas Certificate Generator & Exporter
    const handleDownloadCertificate = () => {
        if (!curationResult) return;
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw luxury dark gold gradients
        const grad = ctx.createLinearGradient(0, 0, 1200, 800);
        grad.addColorStop(0, '#0a0a0d');
        grad.addColorStop(0.5, '#121217');
        grad.addColorStop(1, '#0a0a0d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, 800);

        // Draw outer luxury gold frame
        ctx.strokeStyle = '#c9a84c';
        ctx.lineWidth = 14;
        ctx.strokeRect(35, 35, 1130, 730);

        ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, 1104, 704);

        // Heading title
        ctx.fillStyle = '#c9a84c';
        ctx.font = 'bold 44px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('HERITAGE CURATION CERTIFICATE', 600, 140);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('For dedication to the digital preservation of cultural heritage, presented to:', 600, 190);

        // Curator profile name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Georgia, serif';
        ctx.fillText(currentUser?.displayName || currentUser?.username || 'Kurator SeniQu', 600, 240);

        // Ornate separator
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.3)';
        ctx.beginPath();
        ctx.moveTo(420, 280);
        ctx.lineTo(780, 280);
        ctx.stroke();

        // Object Details
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Nama Objek Cagar Budaya Curated:', 600, 320);

        ctx.fillStyle = '#c9a84c';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.fillText(curationResult.curation_name, 600, 360);

        // Metadata grid values
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Era/Period of Origin:', 420, 430);
        ctx.fillText('Estimated Cultural Appreciation:', 780, 430);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText(curationResult.original_era || 'Unknown', 420, 460);
        ctx.fillText(curationResult.valuation_estimate || 'Unknown', 780, 460);

        // Brief Historical Significance text wrap
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Historical Significance Summary:', 600, 520);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'italic 16px Georgia, serif';
        const words = (curationResult.historical_significance || '').split(' ');
        let line = '';
        let y = 550;
        const maxWidth = 800;
        const lineHeight = 24;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, 600, y);
                line = words[n] + ' ';
                y += lineHeight;
                if (y > 600) break;
            } else {
                line = testLine;
            }
        }
        if (y <= 600) {
            ctx.fillText(line, 600, y);
        }

        // Circular seal
        ctx.strokeStyle = '#c9a84c';
        ctx.fillStyle = 'rgba(201, 168, 76, 0.08)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(600, 650, 40, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#c9a84c';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('SENIQU AI', 600, 646);
        ctx.fillText('SECURED', 600, 658);

        // Footer details
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`ID Kurasi: ${curationResult.id}`, 600, 715);
        ctx.fillText(`Digitally Certified On: ${new Date(curationResult.created_at).toLocaleDateString('id-ID')}`, 600, 732);

        // Trigger download
        const link = document.createElement('a');
        link.download = `Sertifikat_SeniQu_${curationResult.curation_name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Certificate Downloaded', 'Heritage curation certificate successfully downloaded.');
    };

    // Load selected curation into Lab from history or masterpiece feed
    const handleLoadCuration = (curation: any) => {
        setCurationResult(curation);
        setPreviewUrl(curation.image_url);
        setSelectedFile(null);
        setSliderPosition(50);
        setIsPlayingAudio(false);
        setDescExpanded(false);
        setSignificanceExpanded(false);
        setMetadataExpanded(false);
        window.speechSynthesis.cancel();
        setActiveTab('lab');
    };

    // AI Motion Studio Simulation Handlers
    const handleGenerateSimulation = () => {
        if (!motionSourceUrl) return;

        // Daily Limit Check (Max 3/day)
        const remaining = quotaQuery.data ? quotaQuery.data.remaining : 3;
        if (remaining <= 0) {
            toast.error(
                'Daily Quota Limit Reached',
                'You have reached the limit of 3 curations/animations per day. Upgrade to Premium for unlimited access!'
            );
            return;
        }

        setIsGeneratingSimulation(true);
        setSimulationProgress(0);

        const interval = setInterval(() => {
            setSimulationProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsGeneratingSimulation(false);
                    setIsPlayingSimulation(true);
                    toast.success(
                        'AI Motion Generated',
                        'Simulated Cinematic Motion clip successfully generated using client GPU resources.'
                    );
                    return 100;
                }
                return prev + 5;
            });
        }, 120);
    };

    const handleDownloadMotionClip = () => {
        if (!motionSourceUrl) return;
        const link = document.createElement('a');
        link.download = `SeniQu_Motion_${selectedPreset}.png`;
        link.href = motionSourceUrl;
        link.click();
        toast.success(
            'Motion Clip Exported',
            'Successfully saved the cinematic video template frames to local storage.'
        );
    };

    // Canvas particle engine for AI Motion Studio simulated video playback
    useEffect(() => {
        if (!isPlayingSimulation || !simulationCanvasRef.current || activeTab !== 'animate') return;
        const canvas = simulationCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{ x: number; y: number; size: number; speedY: number; opacity: number; color: string }> = [];

        const colors = [
            'rgba(139, 92, 246, ALPHA)', // Purple
            'rgba(6, 214, 160, ALPHA)',  // Teal
            'rgba(255, 255, 255, ALPHA)' // White dust
        ];

        const resize = () => {
            canvas.width = canvas.parentElement?.clientWidth || 500;
            canvas.height = canvas.parentElement?.clientHeight || 400;
        };
        resize();

        // Initialize particles
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedY: Math.random() * 0.4 + 0.1,
                opacity: Math.random() * 0.6 + 0.1,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color.replace('ALPHA', p.opacity.toString());
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'rgba(6, 214, 160, 0.5)';
                ctx.fill();

                // Drifting motion
                p.y -= p.speedY;
                if (p.y < 0) {
                    p.y = canvas.height;
                    p.x = Math.random() * canvas.width;
                }
            });
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlayingSimulation, activeTab, motionSourceUrl]);

    return (
        <motion.div
            className="curator-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ====== HEADER ====== */}
            <div className="curator-header">
                <div className="curator-header-top">
                    <div className="curator-header-symbol">
                        <Box className="w-4 h-4 curator-3d-glow" />
                    </div>
                    <motion.h1 
                        className="curator-header__title"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        Curation Lab
                    </motion.h1>
                </div>
                <p className="curator-header__subtitle">
                    Preserve, restore, and animate cultural masterpieces using advanced AI tools.
                </p>
            </div>

            {/* ====== TABS SECTION ====== */}
            <div className="curator-tabs-container">
                <button
                    className={`curator-tab-btn ${activeTab === 'masterpieces' ? 'curator-tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('masterpieces')}
                    style={{ position: 'relative' }}
                >
                    {activeTab === 'masterpieces' && (
                        <motion.div
                            layoutId="activeCurationTab"
                            className="curator-tab-active-bg"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="tab-btn-content">
                        <Award className="w-4 h-4" />
                        <span className="tab-text-desktop">Community Masterpieces</span>
                        <span className="tab-text-mobile">Masterpieces</span>
                    </span>
                </button>
                <button
                    className={`curator-tab-btn ${activeTab === 'lab' ? 'curator-tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('lab')}
                    style={{ position: 'relative' }}
                >
                    {activeTab === 'lab' && (
                        <motion.div
                            layoutId="activeCurationTab"
                            className="curator-tab-active-bg"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="tab-btn-content">
                        <Sliders className="w-4 h-4" />
                        <span className="tab-text-desktop">AI Restoration Lab</span>
                        <span className="tab-text-mobile">Restoration</span>
                    </span>
                </button>
                <button
                    className={`curator-tab-btn ${activeTab === 'animate' ? 'curator-tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('animate')}
                    style={{ position: 'relative' }}
                >
                    {activeTab === 'animate' && (
                        <motion.div
                            layoutId="activeCurationTab"
                            className="curator-tab-active-bg"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="tab-btn-content">
                        <Film className="w-4 h-4" />
                        <span className="tab-text-desktop">AI Motion Studio</span>
                        <span className="tab-text-mobile">Motion</span>
                    </span>
                </button>
            </div>

            {/* ====== MAIN VIEWS ====== */}
            <div className="curator-content-wrap">
                {activeTab === 'masterpieces' && (
                    <div className="curator-masterpieces-view">
                        {/* Summary / Description */}
                        <div className="curator-masterpieces-intro curator-fade-in">
                            <h2 className="section-title">Nusantara Masterpieces Feed</h2>
                            <p className="section-subtitle">
                                Explore regional historical archives and national heritage items curated and digitally restored by the SeniQu community using Gemini AI.
                            </p>
                        </div>

                        {/* Public Masterpieces Feed Grid */}
                        {publicQuery.isLoading ? (
                            <div className="curator-loading">
                                <Loader2 className="curator-loading__spinner" />
                                <p className="curator-loading__text">Loading Masterpieces...</p>
                            </div>
                        ) : publicQuery.data && publicQuery.data.length > 0 ? (
                            <div className="curator-masterpieces-grid">
                                {publicQuery.data.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="masterpiece-card curator-fade-in"
                                        onClick={() => setSelectedDetailCuration(item)}
                                    >
                                        <div className="masterpiece-card__img-wrap">
                                            <img
                                                src={item.image_url}
                                                alt={item.curation_name}
                                                className="masterpiece-card__img"
                                                loading="lazy"
                                            />
                                            <div className="masterpiece-card__badge">
                                                Terkurasi
                                            </div>
                                        </div>
                                        <div className="masterpiece-card__body">
                                            <span className="masterpiece-card__era">{item.original_era}</span>
                                            <h3 className="masterpiece-card__title">{item.curation_name}</h3>
                                            <p className="masterpiece-card__desc">
                                                {item.curation_description || item.historical_significance}
                                            </p>

                                            {/* Curator Badge */}
                                            {item.users && (
                                                <div className="masterpiece-card__curator">
                                                    {item.users.avatar_url ? (
                                                        <img
                                                            src={item.users.avatar_url}
                                                            alt={item.users.display_name}
                                                            className="curator-avatar"
                                                        />
                                                    ) : (
                                                        <div className="curator-avatar-placeholder">
                                                            <User className="w-3 h-3 text-gold" />
                                                        </div>
                                                    )}
                                                    <span className="curator-name">
                                                        @{item.users.username || item.users.display_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="curator-empty">
                                <Award className="curator-empty__icon" />
                                <h3 className="curator-empty__title">No Masterpieces Published Yet</h3>
                                <p className="curator-empty__text">
                                    Be the first to curate a historical archive and publish it to the community feed!
                                </p>
                                <button className="curator-empty__action" onClick={() => setActiveTab('lab')}>
                                    Open Restoration Lab
                                </button>
                            </div>
                        )}

                        {/* User's Curation History Section */}
                        <div className="curator-history-section">
                            <h2 className="section-title">Your Restoration History</h2>
                            <p className="section-subtitle">List of historical archives you have curated.</p>

                            {historyQuery.isLoading ? (
                                <div className="curator-loading">
                                    <Loader2 className="curator-loading__spinner" />
                                </div>
                            ) : historyQuery.data && historyQuery.data.length > 0 ? (
                                <div className="curator-history-grid">
                                    {historyQuery.data.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="history-row-card"
                                            onClick={() => setSelectedDetailCuration(item)}
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={item.curation_name}
                                                className="history-row-card__img"
                                            />
                                            <div className="history-row-card__content">
                                                <h4 className="history-row-card__title">{item.curation_name}</h4>
                                                <span className="history-row-card__meta">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(item.created_at).toLocaleDateString('id-ID')}
                                                </span>
                                            </div>
                                            <div className="history-row-card__status">
                                                {item.is_public ? (
                                                    <span className="status-badge status-badge--public">Public</span>
                                                ) : (
                                                    <span className="status-badge status-badge--private">Draft</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="history-empty-card">
                                    <ClockIconPlaceholder />
                                    <p className="text-sm text-theme-muted">You do not have any restoration history yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'lab' && (
                    // RESTORATION LAB VIEW
                    <div className="curator-lab-view">
                        {/* Quota Progress Bar Banner */}
                        <div className="curator-quota-banner">
                            <div className="quota-info">
                                <span className="quota-label">Your Daily Curation Quota</span>
                                <span className="quota-value">
                                    {quotaQuery.data ? quotaQuery.data.remaining : 3} / 3 remaining
                                </span>
                            </div>
                            <div className="quota-bar-outer">
                                <div
                                    className="quota-bar-inner"
                                    style={{
                                        width: `${((quotaQuery.data ? quotaQuery.data.remaining : 3) / 3) * 100}%`
                                    }}
                                />
                            </div>
                            <p className="quota-note">
                                *The system limits to 3 curations per day to maintain model quality. Quota resets at midnight.
                            </p>
                        </div>

                        {/* Interactive Laboratory workspace split layout */}
                        <div className="curator-lab-workspace">
                            {/* LEFT COLUMN: Uploader or Before/After slider viewer */}
                            <div className="workspace-view-column">
                                {!previewUrl ? (
                                    <div className="lab-upload-card">
                                        <label className="upload-zone-label">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                            <Upload className="upload-icon-pulse" />
                                            <h3 className="upload-title">Upload Historical Archive</h3>
                                            <p className="upload-desc">
                                                Select or upload an old monochrome or faded historical archive photo to analyze & restore its colors.
                                            </p>
                                            <span className="upload-limit-tag font-semibold">Max file size 8MB (PNG, JPG, WebP)</span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="lab-viewer-card">
                                        {/* Before/After slider screen container */}
                                        <div
                                            className="restoration-slider-container"
                                            ref={containerRef}
                                            onMouseMove={(e) => {
                                                if (isInspectorMode) {
                                                    handleMouseMoveLens(e);
                                                } else {
                                                    handleMouseMove(e);
                                                }
                                            }}
                                            onTouchMove={(e) => {
                                                if (isInspectorMode) {
                                                    handleTouchMoveLens(e);
                                                } else {
                                                    handleTouchMove(e);
                                                }
                                            }}
                                            onMouseDown={() => {
                                                if (!isInspectorMode) setIsDragging(true);
                                            }}
                                            onMouseUp={() => {
                                                if (!isInspectorMode) setIsDragging(false);
                                            }}
                                            onMouseLeave={() => {
                                                if (!isInspectorMode) setIsDragging(false);
                                            }}
                                        >
                                            {/* Bottom Layer: Restored Colorized image */}
                                            {isBrushMode ? (
                                                <TactileBrushCanvas imageUrl={previewUrl} />
                                            ) : (
                                                <>
                                                    <img
                                                        src={previewUrl}
                                                        alt="Restorasi Berwarna"
                                                        className="restoration-img-base"
                                                        style={{
                                                            filter: `saturate(${saturation}%) hue-rotate(${warmth}deg)`
                                                        }}
                                                        draggable={false}
                                                    />

                                                    {/* Top Layer: Grayscale Unrestored original image (Clipped) */}
                                                    {!isInspectorMode && (
                                                        <div
                                                            className="restoration-img-overlay-wrapper"
                                                            style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                                                        >
                                                            <img
                                                                src={previewUrl}
                                                                alt="Monokrom Sebelum"
                                                                className="restoration-img-overlay"
                                                                draggable={false}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Slider drag bar handle */}
                                                    {!isInspectorMode && (
                                                        <div
                                                            className="restoration-slider-handle"
                                                            style={{ left: `${sliderPosition}%` }}
                                                        >
                                                            <div className="handle-knob">
                                                                <span className="knob-arrow-left">◀</span>
                                                                <span className="knob-arrow-right">▶</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Spectral Lens Magnifier */}
                                            {isInspectorMode && (
                                                <div
                                                    className="spectral-lens-overlay"
                                                    style={{
                                                        left: `${lensPosition.x}px`,
                                                        top: `${lensPosition.y}px`,
                                                    }}
                                                >
                                                    <div
                                                        className="spectral-lens-content"
                                                        style={{
                                                            backgroundImage: `url(${previewUrl})`,
                                                            backgroundPosition: `-${lensPosition.x * 1.5 - 75}px -${lensPosition.y * 1.5 - 75}px`,
                                                            backgroundSize: `${containerSize.width * 1.5}px ${containerSize.height * 1.5}px`
                                                        }}
                                                    />
                                                    <div className="spectral-lens-reticle" />
                                                </div>
                                            )}

                                            {/* Labels overlay */}
                                            {!isInspectorMode && (
                                                <>
                                                    <span className="slider-label slider-label--before">Original (Monochrome)</span>
                                                    <span className="slider-label slider-label--after">AI Colorized</span>
                                                </>
                                            )}
                                            {isInspectorMode && (
                                                <span className="slider-label slider-label--inspector">
                                                    Spectral X-Ray Inspector Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Action buttons under viewer */}
                                        {selectedFile && !curationResult && (
                                            <div className="lab-process-actions">
                                                <button
                                                    className="curator-actions__primary"
                                                    style={{ width: '100%', justifyContent: 'center' }}
                                                    onClick={handleCurate}
                                                    disabled={curationMutation.isPending}
                                                >
                                                    {curationMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                            Analyzing & Restoring...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Start Curation & Restoration
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    className="curator-actions__secondary"
                                                    style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                                                    onClick={() => {
                                                        setPreviewUrl(null);
                                                        setSelectedFile(null);
                                                        setCurationResult(null);
                                                    }}
                                                    disabled={curationMutation.isPending}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        {curationResult && (
                                            <div className="curator-interactive-tools">
                                                <div className="tools-header">
                                                    <span className="tools-label">Digital Lab Control Desk</span>
                                                </div>
                                                
                                                <div className="tools-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                      <button 
                                                          className={`tool-toggle-btn ${isInspectorMode ? 'tool-toggle-btn--active' : ''}`}
                                                          onClick={() => {
                                                              setIsInspectorMode(!isInspectorMode);
                                                              setIsBrushMode(false);
                                                          }}
                                                      >
                                                          <Search className="w-4 h-4 mr-2" />
                                                          {isInspectorMode ? 'Inspector: ON' : 'Inspector: OFF'}
                                                      </button>
                                                      <button 
                                                          className={`tool-toggle-btn ${isBrushMode ? 'tool-toggle-btn--active' : ''}`}
                                                          onClick={() => {
                                                              setIsBrushMode(!isBrushMode);
                                                              setIsInspectorMode(false);
                                                          }}
                                                      >
                                                          <Sliders className="w-4 h-4 mr-2" />
                                                          {isBrushMode ? 'Brush Reveal: ON' : 'Brush Reveal: OFF'}
                                                      </button>
                                                 </div>

                                                <div className="sliders-section">
                                                     <div className="slider-item">
                                                         <div className="slider-info">
                                                             <span className="slider-title">Restoration Saturation</span>
                                                             <span className="slider-num">{saturation}%</span>
                                                         </div>
                                                         <input 
                                                             type="range"
                                                             min="50"
                                                             max="150"
                                                             value={saturation}
                                                             onChange={(e) => setSaturation(Number(e.target.value))}
                                                             className="curator-range-slider"
                                                         />
                                                     </div>

                                                     <div className="slider-item">
                                                         <div className="slider-info">
                                                             <span className="slider-title">Color Warmth / Age Tone</span>
                                                             <span className="slider-num">{warmth}</span>
                                                         </div>
                                                         <input 
                                                             type="range"
                                                             min="-30"
                                                             max="30"
                                                             value={warmth}
                                                             onChange={(e) => setWarmth(Number(e.target.value))}
                                                             className="curator-range-slider"
                                                         />
                                                     </div>
                                                </div>

                                                <button
                                                    className="curator-actions__secondary"
                                                    style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                                                    onClick={() => {
                                                        setPreviewUrl(null);
                                                        setSelectedFile(null);
                                                        setCurationResult(null);
                                                        setUploadProgress(0);
                                                        setIsPlayingAudio(false);
                                                        setDescExpanded(false);
                                                        setSignificanceExpanded(false);
                                                        setMetadataExpanded(false);
                                                        setIsInspectorMode(false);
                                                        setWarmth(0);
                                                        setSaturation(100);
                                                        window.speechSynthesis.cancel();
                                                    }}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Curate Another Image
                                                </button>
                                            </div>
                                        )}

                                        {/* Loading progress bar overlay */}
                                        {uploadProgress > 0 && uploadProgress < 100 && (
                                            <div className="lab-progress-overlay">
                                                <div className="progress-content">
                                                    <Loader2 className="progress-spinner" />
                                                    <h4 className="progress-title">AI Spectral Restoration</h4>
                                                    <p className="progress-desc">
                                                        Extracting historical pigments and composing curatorial audio guide script...
                                                    </p>
                                                    <div className="progress-bar-outer">
                                                        <div
                                                            className="progress-bar-inner"
                                                            style={{ width: `${uploadProgress}%` }}
                                                        />
                                                    </div>
                                                    <span className="progress-percentage">{uploadProgress}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Curation results details */}
                            <div className="workspace-info-column">
                                {!curationResult ? (
                                    <div className="lab-info-placeholder">
                                        <Info className="info-icon" />
                                        <h3 className="placeholder-title">Digital Curation Results</h3>
                                        <p className="placeholder-desc">
                                            Detailed curation results, including audio narration, authentic color palette, and restoration steps, will be displayed here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="lab-info-content curator-fade-in">
                                        {/* Object Identity Title */}
                                        <div className="info-header">
                                            <span className="info-era-tag">{curationResult.original_era}</span>
                                            <h2 className="info-title">{curationResult.curation_name}</h2>
                                            <div className="info-meta-row">
                                                <span className="meta-item">
                                                    <Award className="w-4 h-4 mr-1 text-gold" />
                                                    {curationResult.valuation_estimate || 'Cultural Value A'}
                                                </span>
                                                <span className="meta-item">
                                                    <User className="w-4 h-4 mr-1 text-gold" />
                                                    Curated by @
                                                    {currentUser?.id === curationResult.user_id
                                                        ? 'You'
                                                        : curationResult.users?.username || 'Curator'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Immersive AI Heritage Diagnostics */}
                                        <div className="info-section diagnostic-metrics-wrapper">
                                            <h3 className="section-title-small">AI Curation Diagnostics</h3>
                                            <div className="diagnostics-grid">
                                                <div className="diagnostic-card">
                                                    <div className="diagnostic-ring-container">
                                                        <svg className="diagnostic-ring" width="64" height="64">
                                                            <circle className="ring-track" cx="32" cy="32" r="28" />
                                                            <circle 
                                                                className="ring-bar"
                                                                cx="32" 
                                                                cy="32" 
                                                                r="28" 
                                                                strokeDasharray="175.9"
                                                                strokeDashoffset={175.9 - (175.9 * Number(curationResult.metadata?.EraConfidence || 92)) / 100}
                                                            />
                                                        </svg>
                                                        <span className="ring-text">{curationResult.metadata?.EraConfidence || 92}%</span>
                                                    </div>
                                                    <span className="diagnostic-label">Era Confidence</span>
                                                </div>

                                                <div className="diagnostic-card">
                                                    <div className="diagnostic-ring-container">
                                                        <svg className="diagnostic-ring" width="64" height="64">
                                                            <circle className="ring-track" cx="32" cy="32" r="28" />
                                                            <circle 
                                                                className="ring-bar"
                                                                cx="32" 
                                                                cy="32" 
                                                                r="28" 
                                                                strokeDasharray="175.9"
                                                                strokeDashoffset={175.9 - (175.9 * Number(curationResult.metadata?.PreservationState || 88)) / 100}
                                                            />
                                                        </svg>
                                                        <span className="ring-text">{curationResult.metadata?.PreservationState || 88}%</span>
                                                    </div>
                                                    <span className="diagnostic-label">Restoration Clarity</span>
                                                </div>

                                                <div className="diagnostic-card">
                                                    <div className="diagnostic-ring-container">
                                                        <svg className="diagnostic-ring" width="64" height="64">
                                                            <circle className="ring-track" cx="32" cy="32" r="28" />
                                                            <circle 
                                                                className="ring-bar"
                                                                cx="32" 
                                                                cy="32" 
                                                                r="28" 
                                                                strokeDasharray="175.9"
                                                                strokeDashoffset={175.9 - (175.9 * Number(curationResult.metadata?.CulturalSignificanceScore || 95)) / 100}
                                                            />
                                                        </svg>
                                                        <span className="ring-text">{curationResult.metadata?.CulturalSignificanceScore || 95}%</span>
                                                    </div>
                                                    <span className="diagnostic-label">Historical Value</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Premium color palette recommendations */}
                                        <div className="info-section">
                                            <h3 className="section-title-small">Authentic Color Palette</h3>
                                            <p className="section-desc-small">
                                                Historical colors extracted from the temporal context of the heritage artwork:
                                            </p>
                                            <div className="color-palette-grid">
                                                {(curationResult.color_palette || []).map((color: string, idx: number) => (
                                                    <div key={idx} className="color-palette-item">
                                                        <div
                                                            className="color-box"
                                                            style={{ backgroundColor: color }}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(color);
                                                                toast.success('HEX Color Copied', `Color code ${color} copied to clipboard.`);
                                                            }}
                                                            title="Salin Hex"
                                                        />
                                                        <span className="color-hex">{color}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Immersive Audio guide player section */}
                                        {curationResult.audio_script && (
                                            <div className="info-section curator-audio-guide-player">
                                                <button
                                                    className={`audio-play-btn ${isPlayingAudio ? 'audio-play-btn--playing' : ''}`}
                                                    onClick={() => handleToggleAudio(curationResult.audio_script)}
                                                >
                                                    {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                                                </button>
                                                <div className="audio-player-info">
                                                    <span className="audio-label">TTS AUDIO GUIDE</span>
                                                    <h4 className="audio-title">Listen to Audio Curation</h4>
                                                </div>

                                                {/* Waveform visualizer simulation when playing */}
                                                {isPlayingAudio && (
                                                    <div className="audio-waveform-waves">
                                                        <div className="waveform-bar waveform-bar--1" />
                                                        <div className="waveform-bar waveform-bar--2" />
                                                        <div className="waveform-bar waveform-bar--3" />
                                                        <div className="waveform-bar waveform-bar--4" />
                                                        <div className="waveform-bar waveform-bar--5" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Curatorial description */}
                                        <div 
                                            className={`info-section collapsible-section ${descExpanded ? 'is-expanded' : ''}`}
                                            onClick={() => setDescExpanded(!descExpanded)}
                                        >
                                            <div className="section-header-trigger">
                                                <h3 className="section-title-small">Curatorial Description</h3>
                                                <div className="toggle-icon-wrap">
                                                    {descExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </div>
                                            </div>
                                            <motion.div
                                                initial={false}
                                                animate={{ height: descExpanded ? 'auto' : 0, opacity: descExpanded ? 1 : 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div onClick={(e) => e.stopPropagation()} style={{ paddingTop: 12 }}>
                                                    <p className="section-text">{curationResult.curation_description}</p>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Historical Significance */}
                                        <div 
                                            className={`info-section collapsible-section ${significanceExpanded ? 'is-expanded' : ''}`}
                                            onClick={() => setSignificanceExpanded(!significanceExpanded)}
                                        >
                                            <div className="section-header-trigger">
                                                <h3 className="section-title-small">Historical Significance</h3>
                                                <div className="toggle-icon-wrap">
                                                    {significanceExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </div>
                                            </div>
                                            <motion.div
                                                initial={false}
                                                animate={{ height: significanceExpanded ? 'auto' : 0, opacity: significanceExpanded ? 1 : 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div onClick={(e) => e.stopPropagation()} style={{ paddingTop: 12 }}>
                                                    <p className="section-text">{curationResult.historical_significance}</p>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Restoration steps list */}
                                        <div className="info-section">
                                            <h3 className="section-title-small">Digital Restoration Steps</h3>
                                            <div className="restoration-steps-timeline">
                                                {(curationResult.restoration_steps || []).map((step: any, idx: number) => (
                                                    <div key={idx} className="step-timeline-item">
                                                        <div className="step-number-circle">{step.step}</div>
                                                        <div className="step-content">
                                                            <h4 className="step-title">{step.title}</h4>
                                                            <p className="step-desc">{step.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dublin Core Metadata table grid standard */}
                                        <div 
                                            className={`info-section collapsible-section ${metadataExpanded ? 'is-expanded' : ''}`}
                                            onClick={() => setMetadataExpanded(!metadataExpanded)}
                                        >
                                            <div className="section-header-trigger">
                                                <h3 className="section-title-small">Dublin Core Metadata Standard</h3>
                                                <div className="toggle-icon-wrap">
                                                    {metadataExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </div>
                                            </div>
                                            <motion.div
                                                initial={false}
                                                animate={{ height: metadataExpanded ? 'auto' : 0, opacity: metadataExpanded ? 1 : 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div onClick={(e) => e.stopPropagation()} style={{ paddingTop: 12 }}>
                                                    <div className="dublin-core-grid">
                                                        <div className="dc-row">
                                                            <span className="dc-label">Title</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Title || curationResult.curation_name}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Creator</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Creator || 'Unknown'}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Subject</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Subject || 'Cagar Budaya'}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Description</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Description ||
                                                                    curationResult.curation_description}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Date</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Date || curationResult.original_era}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Format</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Format || 'Image'}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Source</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Source || 'SeniQu Digital Archive'}
                                                            </span>
                                                        </div>
                                                        <div className="dc-row">
                                                            <span className="dc-label">Rights</span>
                                                            <span className="dc-value">
                                                                {curationResult.metadata?.Rights || 'Public Domain'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Exports download control grid */}
                                        <div className="info-section">
                                            <h3 className="section-title-small">Export Curation Results</h3>
                                            <div className="exports-action-grid">
                                                <button className="export-btn" onClick={handleDownloadCertificate}>
                                                    <Award className="w-4 h-4 mr-2" /> Curation Certificate
                                                </button>
                                                <button className="export-btn" onClick={handleDownloadImage}>
                                                    <Download className="w-4 h-4 mr-2" /> Restored Image
                                                </button>
                                                <button className="export-btn" onClick={handleDownloadReportTxt}>
                                                    <FileText className="w-4 h-4 mr-2" /> Curator Notes (TXT)
                                                </button>
                                                <button className="export-btn" onClick={handleDownloadJsonLd}>
                                                    <FileJson className="w-4 h-4 mr-2" /> Metadata JSON-LD
                                                </button>
                                                <button className="export-btn" onClick={() => window.print()}>
                                                    <Share2 className="w-4 h-4 mr-2" /> Print Report (PDF)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action buttons to publish */}
                                        {(!curationResult.user_id || curationResult.user_id === currentUser?.id) && (
                                            <div className="lab-publish-wrapper">
                                                <button
                                                    className="curator-actions__primary"
                                                    style={{
                                                        width: '100%',
                                                        justifyContent: 'center',
                                                        opacity: (curationResult.is_public || publishMutation.isPending) ? 0.7 : 1
                                                    }}
                                                    onClick={handlePublishCuration}
                                                    disabled={curationResult.is_public || publishMutation.isPending}
                                                >
                                                    {publishMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : curationResult.is_public ? (
                                                        <>✓ Published in Masterpieces</>
                                                    ) : (
                                                        <>
                                                            <Share2 className="w-4 h-4 mr-2" />
                                                            Publish Artwork to Community
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'animate' && (
                    // AI MOTION STUDIO VIEW
                    <div className="curator-animate-view">
                        {/* Quota Progress Bar Banner */}
                        <div className="curator-quota-banner">
                            <div className="quota-info">
                                <span className="quota-label">Daily Curation & Motion Quota</span>
                                <span className="quota-value">
                                    {quotaQuery.data ? quotaQuery.data.remaining : 3} / 3 remaining
                                </span>
                            </div>
                            <div className="quota-bar-outer">
                                <div
                                    className="quota-bar-inner"
                                    style={{
                                        width: `${((quotaQuery.data ? quotaQuery.data.remaining : 3) / 3) * 100}%`
                                    }}
                                />
                            </div>
                            <p className="quota-note">
                                *AI Motion rendering uses client-side WebGL acceleration to optimize cost & daily quota.
                            </p>
                        </div>

                        <div className="curator-lab-workspace">
                            {/* LEFT COLUMN: Cinematic Animation Frame */}
                            <div className="workspace-view-column">
                                {!motionSourceUrl ? (
                                    <div className="lab-upload-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
                                        <Film className="upload-icon-pulse" style={{ width: '48px', height: '48px', color: 'var(--accent-purple)', marginBottom: '16px' }} />
                                        <h3 className="upload-title">No Artwork Selected</h3>
                                        <p className="upload-desc" style={{ maxWidth: '320px', textAlign: 'center' }}>
                                            Select one of your restored items from the history panel below or go back to the Restoration Lab.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="lab-viewer-card" style={{ overflow: 'hidden' }}>
                                        <div 
                                            className="restoration-slider-container"
                                            style={{
                                                position: 'relative',
                                                overflow: 'hidden',
                                                aspectRatio: '4/3',
                                                borderRadius: '12px',
                                                background: '#09080d'
                                            }}
                                        >
                                            {/* Main Image being animated */}
                                            <img
                                                src={motionSourceUrl}
                                                alt="Animated Archive"
                                                className={`restoration-img-base ${isPlayingSimulation ? `motion-${selectedPreset}` : ''}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: isPlayingSimulation ? 'none' : 'transform 5s linear',
                                                    transformOrigin: 'center center'
                                                }}
                                                draggable={false}
                                            />

                                            {/* Canvas particles overlay */}
                                            <canvas
                                                ref={simulationCanvasRef}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    pointerEvents: 'none',
                                                    zIndex: 10,
                                                    opacity: isPlayingSimulation ? 1 : 0,
                                                    transition: 'opacity 0.4s ease'
                                                }}
                                            />

                                            {/* Scanning effect during generation */}
                                            {isGeneratingSimulation && (
                                                <div 
                                                    className="scanner-bar"
                                                    style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 0,
                                                        width: '100%',
                                                        height: '4px',
                                                        background: 'linear-gradient(90deg, transparent, var(--accent-teal), var(--accent-purple), transparent)',
                                                        boxShadow: '0 0 15px var(--accent-teal)',
                                                        animation: 'scan-down 2s linear infinite',
                                                        zIndex: 20
                                                    }}
                                                />
                                            )}

                                            {/* Preset Watermark Overlay */}
                                            <span 
                                                className="slider-label slider-label--inspector"
                                                style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    left: '12px',
                                                    zIndex: 15,
                                                    background: 'rgba(9, 8, 13, 0.65)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    backdropFilter: 'blur(8px)',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}
                                            >
                                                Preset: {selectedPreset === 'zoom' ? 'Cinematic Zoom' : selectedPreset === 'pan' ? 'Vintage Pan' : '3D Rotate'}
                                            </span>

                                            {/* Playback Glassmorphic Controller */}
                                            {!isGeneratingSimulation && !isPlayingSimulation && (
                                                <div 
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(9, 8, 13, 0.4)',
                                                        backdropFilter: 'blur(3px)',
                                                        zIndex: 12
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => setIsPlayingSimulation(true)}
                                                        style={{
                                                            background: 'var(--accent-gradient)',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '64px',
                                                            height: '64px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#fff',
                                                            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
                                                            cursor: 'pointer',
                                                            transform: 'scale(1)',
                                                            transition: 'transform 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        <Play className="w-6 h-6 fill-current" style={{ marginLeft: '4px' }} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Playback control overlay when active */}
                                            {isPlayingSimulation && (
                                                <button
                                                    onClick={() => setIsPlayingSimulation(false)}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '16px',
                                                        right: '16px',
                                                        background: 'rgba(9, 8, 13, 0.75)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '50%',
                                                        width: '40px',
                                                        height: '40px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        zIndex: 15,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Pause className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Progress Bar (simulated render) */}
                                        {isGeneratingSimulation && (
                                            <div 
                                                style={{
                                                    padding: '16px',
                                                    background: 'var(--card-glass)',
                                                    borderTop: '1px solid var(--card-glass-border)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Generating AI Motion Frames...</span>
                                                    <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>{simulationProgress}%</span>
                                                </div>
                                                <div className="quota-bar-outer" style={{ height: '6px' }}>
                                                    <div className="quota-bar-inner animate-pulse" style={{ width: `${simulationProgress}%`, background: 'var(--accent-gradient)' }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Studio Controls Panel */}
                            <div className="workspace-info-column">
                                <div className="curator-interactive-tools" style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-glass)', border: '1px solid var(--card-glass-border)' }}>
                                    <div className="tools-header" style={{ marginBottom: '16px' }}>
                                        <span className="tools-label">AI Motion Control Desk</span>
                                    </div>

                                    {/* Preset Option Selection Card Grid */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                        <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                            Select Motion Pattern
                                        </label>
                                        
                                        <div 
                                            onClick={() => {
                                                setSelectedPreset('zoom');
                                                setIsPlayingSimulation(true);
                                            }}
                                            className={`motion-preset-option ${selectedPreset === 'zoom' ? 'motion-preset-option--zoom-active' : ''}`}
                                        >
                                            <div className="preset-icon-container">
                                                <Film className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                                            </div>
                                            <div className="preset-text-container">
                                                <span className="preset-title-text">Cinematic Zoom</span>
                                                <span className="preset-desc-text">Slow immersive push forward with light rays</span>
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => {
                                                setSelectedPreset('pan');
                                                setIsPlayingSimulation(true);
                                            }}
                                            className={`motion-preset-option ${selectedPreset === 'pan' ? 'motion-preset-option--pan-active' : ''}`}
                                        >
                                            <div className="preset-icon-container">
                                                <Sliders className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
                                            </div>
                                            <div className="preset-text-container">
                                                <span className="preset-title-text">Vintage Pan</span>
                                                <span className="preset-desc-text">Classic horizontal movement with temporal dust</span>
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => {
                                                setSelectedPreset('rotate');
                                                setIsPlayingSimulation(true);
                                            }}
                                            className={`motion-preset-option ${selectedPreset === 'rotate' ? 'motion-preset-option--rotate-active' : ''}`}
                                        >
                                            <div className="preset-icon-container">
                                                <Search className="w-4 h-4" style={{ color: 'rgb(244, 63, 94)' }} />
                                            </div>
                                            <div className="preset-text-container">
                                                <span className="preset-title-text">3D Rotate / Parallax</span>
                                                <span className="preset-desc-text">Depth shift simulation using 3D matrix scaling</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action triggers */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <button
                                            className="curator-actions__primary"
                                            style={{ width: '100%', justifyContent: 'center' }}
                                            onClick={handleGenerateSimulation}
                                            disabled={isGeneratingSimulation || !motionSourceUrl}
                                        >
                                            {isGeneratingSimulation ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Rendering Animation...
                                                </>
                                            ) : (
                                                <>
                                                    <Film className="w-4 h-4 mr-2" />
                                                    Generate Motion Video
                                                </>
                                            )}
                                        </button>

                                        {isPlayingSimulation && (
                                            <button
                                                className="curator-actions__secondary"
                                                style={{ width: '100%', justifyContent: 'center' }}
                                                onClick={handleDownloadMotionClip}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Export MP4 Video
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* HORIZONTAL SELECTED ARTWORK FEED PANEL */}
                        <div className="curator-history-section" style={{ marginTop: '32px' }}>
                            <h2 className="section-title">Select restored artwork to animate</h2>
                            <p className="section-subtitle">Choose one of your curated images from your digital archive below.</p>

                            {historyQuery.isLoading ? (
                                <div className="curator-loading">
                                    <Loader2 className="curator-loading__spinner" />
                                </div>
                            ) : historyQuery.data && historyQuery.data.length > 0 ? (
                                <div className="curator-history-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                    {historyQuery.data.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className={`history-row-card ${motionSourceUrl === item.image_url ? 'history-row-card--active' : ''}`}
                                            onClick={() => {
                                                setMotionSourceUrl(item.image_url);
                                                setIsPlayingSimulation(false);
                                                setIsGeneratingSimulation(false);
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                border: motionSourceUrl === item.image_url ? '2px solid var(--accent-purple)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                padding: '8px'
                                            }}
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={item.curation_name}
                                                style={{
                                                    width: '100%',
                                                    height: '120px',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    marginBottom: '8px'
                                                }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 4px' }}>
                                                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.curation_name}</h4>
                                                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>{item.original_era}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="history-empty-card" style={{ padding: '32px' }}>
                                    <ClockIconPlaceholder />
                                    <p className="text-sm text-theme-muted" style={{ textAlign: 'center' }}>No restoration history found. Please curate/restore an image first.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ====== CURATION DETAIL MODAL ====== */}
            <AnimatePresence>
                {selectedDetailCuration && (
                    <motion.div
                        className="curation-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setSelectedDetailCuration(null);
                            window.speechSynthesis.cancel();
                            setIsPlayingAudio(false);
                        }}
                    >
                        <motion.div
                            className="curation-modal-container"
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Close Button */}
                            <button
                                className="curation-modal-close"
                                onClick={() => {
                                    setSelectedDetailCuration(null);
                                    window.speechSynthesis.cancel();
                                    setIsPlayingAudio(false);
                                }}
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="curation-modal-layout">
                                {/* Left side: Image and Restoration Viewer */}
                                <div className="curation-modal-left">
                                    <div className="modal-slider-box">
                                        <div
                                            className="modal-slider-container"
                                            ref={modalContainerRef}
                                            onMouseMove={handleModalMouseMove}
                                            onTouchMove={handleModalTouchMove}
                                            onMouseDown={() => setIsModalDragging(true)}
                                            onMouseUp={() => setIsModalDragging(false)}
                                            onMouseLeave={() => setIsModalDragging(false)}
                                        >
                                            {/* Restored image (After) */}
                                            <img
                                                src={selectedDetailCuration.image_url}
                                                alt={selectedDetailCuration.curation_name}
                                                className="modal-slider-img base"
                                                style={{ filter: `hue-rotate(${modalWarmth}deg) saturate(${modalSaturation}%)` }}
                                            />

                                            {/* Original image (Before - Grayscale simulation) */}
                                            <div
                                                className="modal-slider-img overlay-wrap"
                                                style={{ clipPath: `polygon(0 0, ${modalSliderPosition}% 0, ${modalSliderPosition}% 100%, 0 100%)` }}
                                            >
                                                <img
                                                    src={selectedDetailCuration.image_url}
                                                    alt={selectedDetailCuration.curation_name}
                                                    className="modal-slider-img overlay"
                                                />
                                            </div>

                                            {/* Slider handle */}
                                            <div
                                                className="modal-slider-handle"
                                                style={{ left: `${modalSliderPosition}%` }}
                                            >
                                                <div className="modal-handle-knob">
                                                    <span className="knob-arrow-left">◀</span>
                                                    <span className="knob-arrow-right">▶</span>
                                                </div>
                                            </div>

                                            <span className="modal-slider-label label-before">Before (Historical Archive)</span>
                                            <span className="modal-slider-label label-after">After (Restored by AI)</span>
                                        </div>
                                    </div>

                                    {/* Quick Info Badges */}
                                    <div className="modal-quick-info">
                                        <div className="quick-info-card">
                                            <span className="info-title-lbl">Original Era</span>
                                            <span className="info-val-lbl text-gold">{selectedDetailCuration.original_era}</span>
                                        </div>
                                        <div className="quick-info-card">
                                            <span className="info-title-lbl">Cultural Valuation</span>
                                            <span className="info-val-lbl">{selectedDetailCuration.valuation_estimate || 'Rarity Grade A'}</span>
                                        </div>
                                        <div className="quick-info-card">
                                            <span className="info-title-lbl">Curation Status</span>
                                            <span className="info-val-lbl text-green-500">Verified Nusantara</span>
                                        </div>
                                    </div>

                                    {/* Spectral / X-Ray Tools for detail modal */}
                                    <div className="modal-adjustment-panel">
                                        <h4 className="adjustment-title">Archive Restoration Inspector</h4>
                                        <div className="adjustment-row">
                                            <span>Spectral Warmth</span>
                                            <input
                                                type="range"
                                                min="-40"
                                                max="40"
                                                value={modalWarmth}
                                                onChange={(e) => setModalWarmth(parseInt(e.target.value))}
                                                className="adjustment-slider"
                                            />
                                        </div>
                                        <div className="adjustment-row">
                                            <span>Restoration Saturation</span>
                                            <input
                                                type="range"
                                                min="40"
                                                max="160"
                                                value={modalSaturation}
                                                onChange={(e) => setModalSaturation(parseInt(e.target.value))}
                                                className="adjustment-slider"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right side: Details, Audio guide, Likes, Comments */}
                                <div className="curation-modal-right">
                                    <div className="modal-right-header">
                                        <span className="modal-era-badge">{selectedDetailCuration.original_era}</span>
                                        <h2 className="modal-curation-title">{selectedDetailCuration.curation_name}</h2>
                                        
                                        {/* Curator Info */}
                                        <div className="modal-curator-profile">
                                            {selectedDetailCuration.users?.avatar_url ? (
                                                <img
                                                    src={selectedDetailCuration.users.avatar_url}
                                                    alt={selectedDetailCuration.users.display_name}
                                                    className="modal-curator-avatar"
                                                />
                                            ) : (
                                                <div className="modal-curator-avatar-placeholder">
                                                    <User className="w-4 h-4 text-gold" />
                                                </div>
                                            )}
                                            <div className="modal-curator-text">
                                                <p className="modal-curator-name">
                                                    @{selectedDetailCuration.users?.username || selectedDetailCuration.users?.display_name || 'slzyoung'}
                                                </p>
                                                <p className="modal-curator-role">Nusantara Heritage Curator</p>
                                            </div>

                                            {/* Action Button to Load in Lab */}
                                            <button
                                                className="modal-open-lab-btn"
                                                onClick={() => {
                                                    handleLoadCuration(selectedDetailCuration);
                                                    setSelectedDetailCuration(null);
                                                }}
                                            >
                                                <Sliders className="w-4 h-4 mr-1.5" /> Restore Lab
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Stats (Likes & Comments counts) */}
                                    <div className="modal-action-bar">
                                        <button
                                            className={`modal-action-btn ${likesState.liked ? 'modal-action-btn--liked' : ''}`}
                                            onClick={handleToggleLike}
                                        >
                                            <Heart
                                                className="w-5 h-5 heart-icon"
                                                fill={likesState.liked ? 'currentColor' : 'none'}
                                            />
                                            <span>{likesState.count} Likes</span>
                                        </button>
                                        
                                        <div className="modal-action-btn">
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                                />
                                            </svg>
                                            <span>{serverComments.length} Comments</span>
                                        </div>
                                    </div>

                                    {/* Audio Guide Card */}
                                    <div className="modal-audio-guide">
                                        <div className="audio-guide-header">
                                            <h4 className="audio-title">AI Museum Audio Guide</h4>
                                            <button
                                                className={`audio-play-btn ${isPlayingAudio ? 'playing' : ''}`}
                                                onClick={() => handleToggleAudio(selectedDetailCuration.audio_script)}
                                            >
                                                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                <span>{isPlayingAudio ? 'Pause Narration' : 'Listen Narration'}</span>
                                            </button>
                                        </div>
                                        {isPlayingAudio && (
                                            <div className="audio-wave-animation">
                                                <span className="wave-bar bar-1" />
                                                <span className="wave-bar bar-2" />
                                                <span className="wave-bar bar-3" />
                                                <span className="wave-bar bar-4" />
                                                <span className="wave-bar bar-5" />
                                            </div>
                                        )}
                                        <p className="audio-description-preview">
                                            {selectedDetailCuration.curation_description || selectedDetailCuration.historical_significance}
                                        </p>
                                    </div>

                                    {/* Tabs for detailed content */}
                                    <div className="modal-tabs">
                                        <button
                                            className={`modal-tab-trigger ${modalActiveTab === 'details' ? 'active' : ''}`}
                                            onClick={() => setModalActiveTab('details')}
                                        >
                                            Curation Details
                                        </button>
                                        <button
                                            className={`modal-tab-trigger ${modalActiveTab === 'restoration' ? 'active' : ''}`}
                                            onClick={() => setModalActiveTab('restoration')}
                                        >
                                            Restoration Timeline
                                        </button>
                                        <button
                                            className={`modal-tab-trigger ${modalActiveTab === 'metadata' ? 'active' : ''}`}
                                            onClick={() => setModalActiveTab('metadata')}
                                        >
                                            Dublin Core Metadata
                                        </button>
                                    </div>

                                    {/* Tab content panel */}
                                    <div className="modal-tab-panel">
                                        {modalActiveTab === 'details' && (
                                            <div className="modal-details-view animate-fade-in">
                                                <div className="details-block">
                                                    <h5 className="details-section-title">Historical Significance</h5>
                                                    <p className="details-text">{selectedDetailCuration.historical_significance}</p>
                                                </div>
                                                <div className="details-block" style={{ marginTop: 16 }}>
                                                    <h5 className="details-section-title">Valuation & Cultural Rarity</h5>
                                                    <p className="details-text">
                                                        Estimated scarcity rank is rated at <strong>{selectedDetailCuration.valuation_estimate || 'Rarity Grade A'}</strong>. 
                                                        This represents priceless cultural heritage value contributing to Nusantara's historical archive.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {modalActiveTab === 'restoration' && (
                                            <div className="modal-timeline-view animate-fade-in">
                                                <div className="restoration-timeline">
                                                    {(selectedDetailCuration.restoration_steps || [
                                                        { step: 1, title: 'Damage Assessment', description: 'AI scanned archive and marked scratches, mold spots, and physical tear regions.' },
                                                        { step: 2, title: 'Color Infilling', description: 'Generative algorithms reconstructed missing chroma bands based on historical region models.' },
                                                        { step: 3, title: 'Contrast & Enhancement', description: 'Equalized local histograms to reveal hidden architectural or facial details.' }
                                                    ]).map((step: any, index: number) => (
                                                        <div key={index} className="timeline-step-item">
                                                            <div className="step-number-bullet">{step.step}</div>
                                                            <div className="step-content">
                                                                <h6 className="step-title">{step.title}</h6>
                                                                <p className="step-description">{step.description}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {modalActiveTab === 'metadata' && (
                                            <div className="modal-metadata-view animate-fade-in">
                                                <div className="metadata-grid">
                                                    <div className="meta-row">
                                                        <span className="meta-label">Title (dc:title)</span>
                                                        <span className="meta-val">{selectedDetailCuration.metadata?.Title || selectedDetailCuration.curation_name}</span>
                                                    </div>
                                                    <div className="meta-row">
                                                        <span className="meta-label">Creator (dc:creator)</span>
                                                        <span className="meta-val">{selectedDetailCuration.metadata?.Creator || 'Historical Archive'}</span>
                                                    </div>
                                                    <div className="meta-row">
                                                        <span className="meta-label">Publisher (dc:publisher)</span>
                                                        <span className="meta-val">{selectedDetailCuration.metadata?.Publisher || 'SeniQu AI Curation Lab'}</span>
                                                    </div>
                                                    <div className="meta-row">
                                                        <span className="meta-label">Format (dc:format)</span>
                                                        <span className="meta-val">{selectedDetailCuration.metadata?.Format || 'image/jpeg'}</span>
                                                    </div>
                                                    <div className="meta-row">
                                                        <span className="meta-label">Language (dc:language)</span>
                                                        <span className="meta-val">{selectedDetailCuration.metadata?.Language || 'id, en'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Discussion / Comments Section */}
                                    <div className="modal-discussion-section">
                                        <h4 className="discussion-title">Community Discussion</h4>
                                        
                                        {/* Post comment form */}
                                        <form onSubmit={handleSubmitComment} className="comment-form-box">
                                            <textarea
                                                className="comment-textarea"
                                                placeholder="Write your curatorial analysis comment..."
                                                value={newCommentText}
                                                onChange={(e) => setNewCommentText(e.target.value)}
                                                rows={2}
                                                maxLength={500}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newCommentText.trim()}
                                                className="comment-submit-btn"
                                            >
                                                Send
                                            </button>
                                        </form>

                                        {/* Comments list */}
                                        <div className="comments-list-box">
                                            {serverComments.length > 0 ? (
                                                serverComments.map((comment) => (
                                                    <div key={comment.id} className="comment-bubble-item">
                                                        <div className="comment-header-row">
                                                            <div className="commenter-avatar-box">
                                                                {comment.user.avatar_url ? (
                                                                    <img src={comment.user.avatar_url} alt="" />
                                                                ) : (
                                                                    <User className="w-3.5 h-3.5 text-gold" />
                                                                )}
                                                            </div>
                                                            <span className="commenter-name">{comment.user.display_name}</span>
                                                            <span className="comment-date">
                                                                {new Date(comment.created_at).toLocaleDateString('id-ID', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <p className="comment-body-text">{comment.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="no-comments-fallback text-center py-4 text-theme-muted text-xs">
                                                    No comments yet. Start the conversation!
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Simple clock icon placeholder for history section
function ClockIconPlaceholder() {
    return (
        <svg
            className="w-12 h-12 text-theme-muted mx-auto mb-3 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
        </svg>
    );
}

interface TactileBrushCanvasProps {
    imageUrl: string;
}

function TactileBrushCanvas({ imageUrl }: TactileBrushCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Array<{ x: number; y: number; size: number; alpha: number; vx: number; vy: number; color: string }>>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Create offscreen mask canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvasRef.current = maskCanvas;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        const initCanvas = () => {
            const w = container.clientWidth || 400;
            const h = container.clientHeight || 300;
            canvas.width = w;
            canvas.height = h;
            maskCanvas.width = w;
            maskCanvas.height = h;

            // Draw image on mask canvas in Grayscale
            maskCtx.drawImage(img, 0, 0, w, h);
            const imgData = maskCtx.getImageData(0, 0, w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
                data[i] = brightness;     // red
                data[i + 1] = brightness; // green
                data[i + 2] = brightness; // blue
            }
            maskCtx.putImageData(imgData, 0, 0);

            // Draw initial grayscale overlay
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(maskCanvas, 0, 0);
        };

        img.onload = initCanvas;
        if (img.complete) {
            initCanvas();
        }

        // Particle system loop
        let animId: number;
        const drawLoop = () => {
            if (!canvasRef.current) return;
            const context = canvasRef.current.getContext('2d');
            if (!context) return;

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(maskCanvas, 0, 0);

            // Update and draw sparkles particles
            const particles = particlesRef.current;
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                context.beginPath();
                context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                context.fillStyle = p.color.replace('ALPHA', p.alpha.toString());
                context.shadowBlur = 8;
                context.shadowColor = 'rgba(6, 214, 160, 0.8)';
                context.fill();

                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.04;
                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                }
            }

            animId = requestAnimationFrame(drawLoop);
        };
        drawLoop();

        return () => {
            cancelAnimationFrame(animId);
        };
    }, [imageUrl]);

    const handleStart = () => {
        setIsDrawing(true);
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    const handleDraw = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas || !isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        // Clear a circle on offscreen mask canvas (destination-out)
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.beginPath();
        maskCtx.arc(x, y, 28, 0, Math.PI * 2);
        maskCtx.fill();

        // Add sparkling particles (drifting dust)
        const colors = [
            'rgba(139, 92, 246, ALPHA)', // purple accent
            'rgba(6, 214, 160, ALPHA)',  // teal accent
            'rgba(244, 63, 94, ALPHA)'   // pink accent
        ];
        for (let i = 0; i < 3; i++) {
            particlesRef.current.push({
                x,
                y,
                size: Math.random() * 3 + 1.5,
                alpha: 1.0,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 0.5,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        handleDraw(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            handleDraw(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full relative overflow-hidden"
            style={{ minHeight: '300px' }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-10 cursor-crosshair touch-none"
                onMouseDown={handleStart}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onMouseMove={handleMouseMove}
                onTouchStart={handleStart}
                onTouchEnd={handleEnd}
                onTouchMove={handleTouchMove}
            />
        </div>
    );
}

export default AICurationPage;
