import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    X, Upload, CheckCircle2, Image as ImageIcon, FolderPlus
} from 'lucide-react';
import { albumsService } from '../../../../../services/albumsService';
import { uploadFile } from '../../../../../lib/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialTab?: 'artwork' | 'collection';
}

export function AddArtModal({ isOpen, onClose, onSuccess }: Props) {
    const [colTitle, setColTitle] = useState('');
    const [colDesc, setColDesc] = useState('');
    const [colTheme, setColTheme] = useState('general');
    const [colFile, setColFile] = useState<File | null>(null);
    const [colPreview, setColPreview] = useState<string | null>(null);
    const [colDragOver, setColDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleColFile = (f: File) => {
        if (!f.type.startsWith('image/')) {
            setError('Only image files are allowed');
            return;
        }
        if (f.size > 15 * 1024 * 1024) {
            setError('File must be under 15MB');
            return;
        }
        setError('');
        setColFile(f);
        const reader = new FileReader();
        reader.onload = (e) => setColPreview(e.target?.result as string);
        reader.readAsDataURL(f);
    };

    const handleColDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setColDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleColFile(f);
    };

    const resetForm = () => {
        setColTitle('');
        setColDesc('');
        setColTheme('general');
        setColFile(null);
        setColPreview(null);
        setColDragOver(false);
        setUploading(false);
        setSuccess(false);
        setError('');
    };

    const handleCreateCollection = async () => {
        if (!colTitle.trim()) return;
        setUploading(true);
        setError('');

        try {
            let coverUrl: string | undefined = undefined;

            if (colFile) {
                // Upload cover image to storage R2
                const uploaded = await uploadFile(colFile, 'collections');
                coverUrl = uploaded.url;
            }

            await albumsService.createAlbum({
                title: colTitle.trim(),
                description: colDesc.trim(),
                isPublic: true,
                theme: colTheme,
                coverUrl
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                resetForm();
                onSuccess();
            }, 1500);
        } catch (err: any) {
            console.error('Create collection error:', err);
            setError(err?.response?.data?.message || 'Failed to create collection.');
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                onClick={e => e.stopPropagation()}
                className="w-full md:max-w-lg art-modal-sheet rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 art-modal-header">
                    <h3 className="text-lg font-bold art-modal-title flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-[var(--ph-gold,#C9A84C)]" />
                        Create New Album
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full art-modal-close-btn transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto px-6 pt-5 pb-32 space-y-5 hide-scrollbar">
                    {success ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="py-12 text-center space-y-3"
                        >
                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                            <h4 className="text-xl font-bold art-modal-title">Successfully Created!</h4>
                            <p className="text-sm art-modal-label">
                                Your album has been created
                            </p>
                        </motion.div>
                    ) : uploading ? (
                        <div className="py-12 text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="w-12 h-12 border-4 border-[var(--ph-gold,#C9A84C)] border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-sm art-modal-label animate-pulse">
                                Creating album...
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-400 text-xs font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Cover Image Drop zone / Preview */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setColDragOver(true); }}
                                    onDragLeave={() => setColDragOver(false)}
                                    onDrop={handleColDrop}
                                    className={`art-modal-dropzone border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                                        colDragOver ? 'dragging' : ''
                                    } ${colPreview ? '!border-transparent !p-0 overflow-hidden' : 'p-6'}`}
                                    onClick={() => document.getElementById('collection-file-input')?.click()}
                                >
                                    {colPreview ? (
                                        <div className="relative w-full">
                                            <img src={colPreview} alt="Album Cover Preview" className="w-full max-h-52 object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setColPreview(null); setColFile(null); }}
                                                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/85 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                                                <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
                                                {(colFile!.size / 1024 / 1024).toFixed(1)} MB
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <Upload className="w-10 h-10 art-modal-label opacity-60 mx-auto mb-2" />
                                            <p className="text-sm font-bold art-modal-title">Upload Album Cover Image (Optional)</p>
                                            <p className="text-xs art-modal-label mt-1">Supports JPEG, PNG, WebP — Up to 15MB</p>
                                        </div>
                                    )}
                                    <input
                                        id="collection-file-input"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleColFile(f); }}
                                    />
                                </div>

                                {/* Title */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider art-modal-label font-bold">Album Title</label>
                                    <input
                                        type="text"
                                        value={colTitle}
                                        onChange={e => setColTitle(e.target.value)}
                                        placeholder="Enter album name..."
                                        className="w-full px-4 py-3 rounded-xl art-modal-input text-sm"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider art-modal-label font-bold">Album Description</label>
                                    <textarea
                                        value={colDesc}
                                        onChange={e => setColDesc(e.target.value)}
                                        placeholder="Describe the theme or narrative of this album..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl art-modal-textarea text-sm resize-none"
                                    />
                                </div>

                                {/* Collection Theme */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider art-modal-label font-bold">Theme</label>
                                    <select
                                        value={colTheme}
                                        onChange={e => setColTheme(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl art-modal-select text-sm"
                                    >
                                        <option value="general">General Art Exhibition</option>
                                        <option value="landscape">Nature & Landscape Portfolio</option>
                                        <option value="cultural">Heritage & Cultural Artifacts</option>
                                        <option value="abstract">Contemporary Abstract Art</option>
                                    </select>
                                </div>

                                {/* Action button */}
                                <button
                                    onClick={handleCreateCollection}
                                    disabled={!colTitle.trim()}
                                    className="w-full py-3.5 bg-[var(--ph-gold,#C9A84C)] text-[#121214] rounded-xl font-bold text-sm shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                >
                                    Create Album
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
