/**
 * AI Curation Page — Heritage Restoration & Curation Lab
 * Premium immersive artwork curation, Dublin Core metadata,
 * interactive Before/After image restoration slider, TTS narration,
 * and certificate export.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Sparkles,
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
    Copy,
    FileJson,
    Plus,
    Search
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useToast } from '../../../../stores/useNotificationStore';
import {
    useHeritageCuration,
    useCurationQuota,
    useCurationHistory,
    usePublicCurations,
    usePublishCuration
} from '../../../../hooks/useAI';
import { ROUTES } from '../../../../lib/constants';
import './AICurationPage.css';

export function AICurationPage() {
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const toast = useToast();

    // Tab state: 'masterpieces' (Galeri Komunitas) vs 'lab' (Lab Restorasi)
    const [activeTab, setActiveTab] = useState<'masterpieces' | 'lab'>('masterpieces');

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

    // Queries and Mutations
    const quotaQuery = useCurationQuota();
    const historyQuery = useCurationHistory();
    const publicQuery = usePublicCurations();
    const curationMutation = useHeritageCuration();
    const publishMutation = usePublishCuration();

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

    return (
        <motion.div
            className="curator-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* ====== HEADER ====== */}
            <div className="curator-header">
                <motion.h1 
                    className="curator-header__title"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    AI Curation Lab
                </motion.h1>
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
                        <span>Community Masterpieces</span>
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
                        <span>AI Restoration Lab</span>
                    </span>
                </button>
            </div>

            {/* ====== MAIN VIEWS ====== */}
            <div className="curator-content-wrap">
                {activeTab === 'masterpieces' ? (
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
                                        onClick={() => handleLoadCuration(item)}
                                    >
                                        <div className="masterpiece-card__img-wrap">
                                            <img
                                                src={item.image_url}
                                                alt={item.curation_name}
                                                className="masterpiece-card__img"
                                                loading="lazy"
                                            />
                                            <div className="masterpiece-card__badge">
                                                <Sparkles className="w-3.5 h-3.5" /> Terkurasi
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
                                            onClick={() => handleLoadCuration(item)}
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
                ) : (
                    // RESTORATION LAB VIEW
                    <div className="curator-lab-view">
                        {/* Quota Progress Bar Banner */}
                        <div className="curator-quota-banner">
                            <div className="quota-info">
                                <span className="quota-label">Your Daily Curation Quota</span>
                                <span className="quota-value">
                                    {quotaQuery.data ? quotaQuery.data.remaining : 5} / 5 remaining
                                </span>
                            </div>
                            <div className="quota-bar-outer">
                                <div
                                    className="quota-bar-inner"
                                    style={{
                                        width: `${((quotaQuery.data ? quotaQuery.data.remaining : 5) / 5) * 100}%`
                                    }}
                                />
                            </div>
                            <p className="quota-note">
                                *The system limits to 5 curations per day to maintain model quality. Quota resets at midnight.
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
                                                            <Sparkles className="w-5 h-5 mr-2" />
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
                                                
                                                <div className="tools-row">
                                                     <button 
                                                         className={`tool-toggle-btn ${isInspectorMode ? 'tool-toggle-btn--active' : ''}`}
                                                         onClick={() => setIsInspectorMode(!isInspectorMode)}
                                                     >
                                                         <Search className="w-4 h-4 mr-2" />
                                                         {isInspectorMode ? 'X-Ray Inspector: ON' : 'X-Ray Inspector: OFF'}
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
            </div>
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

export default AICurationPage;
