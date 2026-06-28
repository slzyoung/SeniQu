/**
 * PhotoUpload — Premium bottom sheet upload with seamless mobile UX
 * Drag-drop, preview, metadata form, share/sell toggle, progress animation
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    X, Upload, Camera, MapPin, Tag, DollarSign,
    CheckCircle2, Share2, Image as ImageIcon
} from 'lucide-react';
import { PHOTO_THEMES } from './ThemeSelector';
import { photosService } from '../../../../../services/photosService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess?: () => void;
}

export function PhotoUpload({ isOpen, onClose, onUploadSuccess }: Props) {
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [tags, setTags] = useState('');
    const [isForSale, setIsForSale] = useState(false);
    const [price, setPrice] = useState('');
    const [licenseType, setLicenseType] = useState('personal');
    const [location, setLocation] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleFile = useCallback((f: File) => {
        if (!f.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        if (f.size > 15 * 1024 * 1024) {
            setError('File must be under 15MB');
            return;
        }
        setError('');
        setFile(f);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const resetForm = () => {
        setPreview(null); setFile(null); setTitle(''); setDescription('');
        setCategory('general'); setTags(''); setIsForSale(false); setPrice('');
        setLicenseType('personal'); setLocation(''); setUploading(false);
        setUploadProgress(0); setSuccess(false); setError('');
    };

    const handleSubmit = async () => {
        if (!file || !title.trim()) return;
        setUploading(true);
        setUploadProgress(0);
        setError('');

        try {
            const parsedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            await photosService.uploadPhoto(
                file,
                {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    category,
                    theme: category,
                    tags: parsedTags,
                    isForSale,
                    price: isForSale && price ? parseFloat(price) : undefined,
                    currency: isForSale ? 'SOL' : undefined,
                    locationName: location.trim() || undefined
                },
                (progress: number) => setUploadProgress(progress)
            );


            setSuccess(true);
            setTimeout(() => {
                onClose();
                resetForm();
                onUploadSuccess?.();
            }, 1500);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err?.response?.data?.message || 'Upload failed. Please try again.');
            setUploading(false);
            setUploadProgress(0);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                onClick={e => e.stopPropagation()}
                className="ph-sheet w-full md:max-w-md"
            >
                <div className="ph-sheet-handle" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <h3 className="text-base font-bold text-[var(--ph-text)] flex items-center gap-2">
                        <Camera className="w-4.5 h-4.5 text-[var(--ph-gold)]" />
                        Share Your Shot
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-[var(--ph-surface-alt)] text-[var(--ph-text-muted)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 pb-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 60px)' }}>
                    {/* Success */}
                    {success ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-12 text-center"
                        >
                            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                            <h4 className="text-lg font-bold text-[var(--ph-text)]">Published!</h4>
                            <p className="text-xs text-[var(--ph-text-muted)] mt-1">Your photo is now live in the feed</p>
                        </motion.div>

                    /* Uploading */
                    ) : uploading ? (
                        <div className="py-10 text-center">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ph-surface-alt)" strokeWidth="5" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="var(--ph-gold)" strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray={264}
                                        strokeDashoffset={264 - (264 * uploadProgress / 100)}
                                        className="transition-all duration-300"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[var(--ph-gold)] font-bold text-sm">
                                    {Math.round(uploadProgress)}%
                                </span>
                            </div>
                            <p className="text-xs text-[var(--ph-text-muted)] animate-pulse">Uploading to CDN...</p>
                        </div>

                    /* Form */
                    ) : (
                        <>
                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Drop zone / Preview */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                className={`ph-dropzone ${dragOver ? 'dragging' : ''} ${preview ? '!border-transparent !p-0' : ''}`}
                                onClick={() => document.getElementById('photo-file-input')?.click()}
                            >
                                {preview ? (
                                    <div className="relative">
                                        <img src={preview} alt="Preview" className="w-full max-h-44 object-cover rounded-xl" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null); }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium">
                                            <ImageIcon className="w-3 h-3 inline mr-1" />
                                            {(file!.size / 1024 / 1024).toFixed(1)} MB
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-6">
                                        <Upload className="w-8 h-8 text-[var(--ph-text-muted)] opacity-40 mx-auto mb-2" />
                                        <p className="text-xs font-medium text-[var(--ph-text-secondary)]">Tap to select or drag a photo</p>
                                        <p className="text-[10px] text-[var(--ph-text-muted)] mt-0.5">JPEG, PNG, WebP — Max 15MB</p>
                                    </div>
                                )}
                                <input
                                    id="photo-file-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                                />
                            </div>

                            {/* Title */}
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Give your photo a title..."
                                className="w-full px-4 py-3 rounded-xl bg-[var(--ph-surface)] border border-[var(--ph-border-light)] text-[var(--ph-text)] text-sm placeholder:text-[var(--ph-text-muted)] outline-none focus:border-[var(--ph-gold)] transition-colors"
                            />

                            {/* Description */}
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Tell the story behind this shot..."
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--ph-surface)] border border-[var(--ph-border-light)] text-[var(--ph-text)] text-sm placeholder:text-[var(--ph-text-muted)] outline-none focus:border-[var(--ph-gold)] transition-colors resize-none"
                            />

                            {/* Category chips */}
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--ph-text-muted)] font-bold mb-2 block">Category</label>
                                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                    {PHOTO_THEMES.filter(t => t.id !== 'all').slice(0, 8).map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setCategory(theme.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                                                category === theme.id
                                                    ? 'text-white border-transparent shadow-sm'
                                                    : 'text-[var(--ph-text-muted)] border-[var(--ph-border-light)] hover:border-[var(--ph-gold)]'
                                            }`}
                                            style={category === theme.id ? { background: theme.accent } : undefined}
                                        >
                                            <theme.icon className="w-3 h-3" />
                                            {theme.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags & Location */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ph-text-muted)]" />
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={e => setTags(e.target.value)}
                                        placeholder="Tags"
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[var(--ph-surface)] border border-[var(--ph-border-light)] text-[var(--ph-text)] text-xs outline-none focus:border-[var(--ph-gold)] transition-colors"
                                    />
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ph-text-muted)]" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="Location"
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[var(--ph-surface)] border border-[var(--ph-border-light)] text-[var(--ph-text)] text-xs outline-none focus:border-[var(--ph-gold)] transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Share / Sell Toggle */}
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--ph-text-muted)] font-bold mb-2 block">Listing Type</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsForSale(false)}
                                        className={`ph-type-card ${!isForSale ? 'selected' : ''}`}
                                    >
                                        <div className={`p-2 rounded-lg w-fit mb-2 ${!isForSale ? 'bg-[var(--ph-gold)] text-[#1a1a1a]' : 'bg-[var(--ph-surface-alt)] text-[var(--ph-text-muted)]'}`}>
                                            <Share2 className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold text-[var(--ph-text)]">Free Share</p>
                                        <p className="text-[9px] text-[var(--ph-text-muted)] mt-0.5 leading-tight">Showcase to community</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsForSale(true)}
                                        className={`ph-type-card ${isForSale ? 'selected' : ''}`}
                                    >
                                        <div className={`p-2 rounded-lg w-fit mb-2 ${isForSale ? 'bg-[var(--ph-gold)] text-[#1a1a1a]' : 'bg-[var(--ph-surface-alt)] text-[var(--ph-text-muted)]'}`}>
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold text-[var(--ph-text)]">Sell</p>
                                        <p className="text-[9px] text-[var(--ph-text-muted)] mt-0.5 leading-tight">List for sale via Solana</p>
                                    </button>
                                </div>
                            </div>

                            {/* Price section */}
                            {isForSale && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="space-y-3"
                                >
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-[var(--ph-text-muted)] font-bold block mb-1">Price (SOL)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--ph-text-muted)]">SOL</span>
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                value={price}
                                                onChange={e => setPrice(e.target.value)}
                                                placeholder="e.g. 0.05"
                                                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-[var(--ph-surface)] border border-[var(--ph-border-light)] text-[var(--ph-text)] text-sm outline-none focus:border-[var(--ph-gold)] transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-[var(--ph-text-muted)] font-bold block mb-1">License</label>
                                            <select
                                                value={licenseType}
                                                onChange={e => setLicenseType(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl bg-[var(--ph-surface)] border border-[var(--ph-border-light)] text-[var(--ph-text)] text-xs outline-none focus:border-[var(--ph-gold)] transition-colors"
                                            >
                                                <option value="personal">Personal</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="editorial">Editorial</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider text-[var(--ph-text-muted)] font-bold block mb-1">Resolution</label>
                                            <div className="w-full px-3 py-2.5 rounded-xl bg-[var(--ph-surface-alt)] border border-[var(--ph-border-light)] text-[var(--ph-text-muted)] text-xs">
                                                Original High-Res
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={!file || !title.trim()}
                                className="ph-submit-btn"
                            >
                                {isForSale ? 'List for Sale' : 'Upload & Share'}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
