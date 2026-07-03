/**
 * PhotoUpload — Premium bottom sheet upload with seamless mobile UX
 * Uses createPortal to render above all layout layers (including MobileBottomNav)
 * Flex column layout: fixed header + scrollable content + sticky submit button
 */
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    X, Upload, Camera, MapPin, Tag, DollarSign,
    CheckCircle2, Share2, Image as ImageIcon, Sparkles
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

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                onClick={e => e.stopPropagation()}
                className="w-full md:max-w-md flex flex-col overflow-hidden"
                style={{
                    maxHeight: '92dvh',
                    borderRadius: '24px 24px 0 0',
                    background: 'var(--bg-surface, #1A1A1A)',
                    boxShadow: '0 -12px 48px rgba(0,0,0,0.25), 0 0 0 1px var(--border-color, rgba(255,255,255,0.05))',
                }}
            >
                {/* Drag Handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div
                        className="w-10 h-1 rounded-full"
                        style={{ background: 'var(--border-color, rgba(255,255,255,0.12))' }}
                    />
                </div>

                {/* Header — fixed */}
                <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0"
                     style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.05))' }}>
                    <h3 className="text-base font-bold flex items-center gap-2"
                        style={{ color: 'var(--text-primary, #F5F0E8)' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(201,168,76,0.12)' }}>
                            <Camera className="w-4 h-4" style={{ color: 'var(--text-gold, #C9A84C)' }} />
                        </div>
                        Share Your Shot
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl transition-all duration-200"
                        style={{
                            color: 'var(--text-muted, #C4BEB4)',
                            background: 'var(--bg-elevated, #2A2A2A)',
                        }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div
                    className="flex-1 overflow-y-auto px-5 pt-4 pb-6 space-y-4 hide-scrollbar"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    {/* Success State */}
                    {success ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-16 text-center"
                        >
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                                 style={{ background: 'rgba(16,185,129,0.12)' }}>
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary, #F5F0E8)' }}>Published!</h4>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted, #C4BEB4)' }}>Your photo is now live in the feed</p>
                        </motion.div>

                    /* Uploading State */
                    ) : uploading ? (
                        <div className="py-14 text-center">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-elevated, #2A2A2A)" strokeWidth="5" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="var(--text-gold, #C9A84C)" strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray={264}
                                        strokeDashoffset={264 - (264 * uploadProgress / 100)}
                                        className="transition-all duration-300"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center font-bold text-sm"
                                      style={{ color: 'var(--text-gold, #C9A84C)' }}>
                                    {Math.round(uploadProgress)}%
                                </span>
                            </div>
                            <p className="text-xs animate-pulse" style={{ color: 'var(--text-muted, #C4BEB4)' }}>Uploading to CDN...</p>
                        </div>

                    /* Form */
                    ) : (
                        <>
                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-xl text-xs font-medium"
                                     style={{
                                         background: 'rgba(220,38,38,0.08)',
                                         border: '1px solid rgba(220,38,38,0.2)',
                                         color: '#f87171',
                                     }}>
                                    {error}
                                </div>
                            )}

                            {/* Drop zone / Preview */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                className="rounded-2xl cursor-pointer transition-all duration-200"
                                style={{
                                    border: preview ? 'none' : `2px dashed ${dragOver ? 'var(--text-gold, #C9A84C)' : 'var(--border-color, rgba(255,255,255,0.08))'}`,
                                    background: dragOver ? 'rgba(201,168,76,0.06)' : 'transparent',
                                    padding: preview ? 0 : '24px 16px',
                                    textAlign: 'center' as const,
                                }}
                                onClick={() => document.getElementById('photo-file-input')?.click()}
                            >
                                {preview ? (
                                    <div className="relative rounded-2xl overflow-hidden">
                                        <img src={preview} alt="Preview" className="w-full max-h-44 object-cover" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null); }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full transition-colors"
                                            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-white text-[10px] font-medium flex items-center gap-1"
                                             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                                            <ImageIcon className="w-3 h-3" />
                                            {(file!.size / 1024 / 1024).toFixed(1)} MB
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-40"
                                                style={{ color: 'var(--text-muted, #C4BEB4)' }} />
                                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted, #C4BEB4)' }}>Tap to select or drag a photo</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted, #C4BEB4)', opacity: 0.6 }}>JPEG, PNG, WebP — Max 15MB</p>
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
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                                style={{
                                    background: 'var(--bg-primary, #0D0D0D)',
                                    border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                    color: 'var(--text-primary, #F5F0E8)',
                                }}
                            />

                            {/* Description */}
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Tell the story behind this shot..."
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none"
                                style={{
                                    background: 'var(--bg-primary, #0D0D0D)',
                                    border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                    color: 'var(--text-primary, #F5F0E8)',
                                }}
                            />

                            {/* Category chips */}
                            <div>
                                <label className="text-[10px] uppercase tracking-wider font-bold mb-2 block"
                                       style={{ color: 'var(--text-muted, #C4BEB4)' }}>
                                    Category
                                </label>
                                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                    {PHOTO_THEMES.filter(t => t.id !== 'all').slice(0, 8).map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setCategory(theme.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all"
                                            style={category === theme.id
                                                ? { background: theme.accent, color: '#fff', border: '1px solid transparent', boxShadow: `0 2px 8px ${theme.accent}40` }
                                                : { color: 'var(--text-muted, #C4BEB4)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))' }
                                            }
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
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                                         style={{ color: 'var(--text-muted, #C4BEB4)' }} />
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={e => setTags(e.target.value)}
                                        placeholder="Tags"
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs outline-none transition-colors"
                                        style={{
                                            background: 'var(--bg-primary, #0D0D0D)',
                                            border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                            color: 'var(--text-primary, #F5F0E8)',
                                        }}
                                    />
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                                            style={{ color: 'var(--text-muted, #C4BEB4)' }} />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="Location"
                                        className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs outline-none transition-colors"
                                        style={{
                                            background: 'var(--bg-primary, #0D0D0D)',
                                            border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                            color: 'var(--text-primary, #F5F0E8)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Share / Sell Toggle */}
                            <div>
                                <label className="text-[10px] uppercase tracking-wider font-bold mb-2 block"
                                       style={{ color: 'var(--text-muted, #C4BEB4)' }}>
                                    Listing Type
                                </label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsForSale(false)}
                                        className="p-3.5 rounded-2xl text-left transition-all duration-200"
                                        style={{
                                            border: `1.5px solid ${!isForSale ? 'var(--text-gold, #C9A84C)' : 'var(--border-color, rgba(255,255,255,0.05))'}`,
                                            background: !isForSale ? 'rgba(201,168,76,0.08)' : 'var(--bg-primary, #0D0D0D)',
                                            boxShadow: !isForSale ? '0 0 0 3px rgba(201,168,76,0.08)' : 'none',
                                        }}
                                    >
                                        <div className="p-2 rounded-lg w-fit mb-2" style={{
                                            background: !isForSale ? 'var(--text-gold, #C9A84C)' : 'var(--bg-elevated, #2A2A2A)',
                                            color: !isForSale ? '#1a1a1a' : 'var(--text-muted, #C4BEB4)',
                                        }}>
                                            <Share2 className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary, #F5F0E8)' }}>Free Share</p>
                                        <p className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted, #C4BEB4)' }}>Showcase to community</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsForSale(true)}
                                        className="p-3.5 rounded-2xl text-left transition-all duration-200"
                                        style={{
                                            border: `1.5px solid ${isForSale ? 'var(--text-gold, #C9A84C)' : 'var(--border-color, rgba(255,255,255,0.05))'}`,
                                            background: isForSale ? 'rgba(201,168,76,0.08)' : 'var(--bg-primary, #0D0D0D)',
                                            boxShadow: isForSale ? '0 0 0 3px rgba(201,168,76,0.08)' : 'none',
                                        }}
                                    >
                                        <div className="p-2 rounded-lg w-fit mb-2" style={{
                                            background: isForSale ? 'var(--text-gold, #C9A84C)' : 'var(--bg-elevated, #2A2A2A)',
                                            color: isForSale ? '#1a1a1a' : 'var(--text-muted, #C4BEB4)',
                                        }}>
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary, #F5F0E8)' }}>Sell</p>
                                        <p className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted, #C4BEB4)' }}>List for sale via Solana</p>
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
                                        <label className="text-[10px] uppercase tracking-wider font-bold block mb-1"
                                               style={{ color: 'var(--text-muted, #C4BEB4)' }}>Price (SOL)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                                                  style={{ color: 'var(--text-muted, #C4BEB4)' }}>SOL</span>
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                value={price}
                                                onChange={e => setPrice(e.target.value)}
                                                placeholder="e.g. 0.05"
                                                className="w-full pl-12 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                                                style={{
                                                    background: 'var(--bg-primary, #0D0D0D)',
                                                    border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                                    color: 'var(--text-primary, #F5F0E8)',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider font-bold block mb-1"
                                                   style={{ color: 'var(--text-muted, #C4BEB4)' }}>License</label>
                                            <select
                                                value={licenseType}
                                                onChange={e => setLicenseType(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none transition-colors"
                                                style={{
                                                    background: 'var(--bg-primary, #0D0D0D)',
                                                    border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                                    color: 'var(--text-primary, #F5F0E8)',
                                                }}
                                            >
                                                <option value="personal">Personal</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="editorial">Editorial</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-wider font-bold block mb-1"
                                                   style={{ color: 'var(--text-muted, #C4BEB4)' }}>Resolution</label>
                                            <div className="w-full px-3 py-2.5 rounded-xl text-xs"
                                                 style={{
                                                     background: 'var(--bg-elevated, #2A2A2A)',
                                                     border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                                                     color: 'var(--text-muted, #C4BEB4)',
                                                 }}>
                                                Original High-Res
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!file || !title.trim()}
                                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                                style={{
                                    background: (!file || !title.trim())
                                        ? 'var(--bg-elevated, #2A2A2A)'
                                        : 'linear-gradient(135deg, #C9A84C, #A68A3A)',
                                    color: (!file || !title.trim()) ? 'var(--text-muted, #C4BEB4)' : '#1a1a1a',
                                    opacity: (!file || !title.trim()) ? 0.5 : 1,
                                    cursor: (!file || !title.trim()) ? 'not-allowed' : 'pointer',
                                    boxShadow: (!file || !title.trim()) ? 'none' : '0 4px 20px rgba(201,168,76,0.3)',
                                    border: 'none',
                                }}
                            >
                                <Sparkles className="w-4 h-4" />
                                {isForSale ? 'List for Sale' : 'Upload & Share'}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
