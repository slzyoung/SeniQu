import React, { useState, useRef } from 'react';
import { X, Play, Upload } from 'lucide-react';
import { useUploadReel } from '../../../hooks/useReels';
import { useToast } from '../../../stores/useNotificationStore';
import { validateVideo, generateVideoThumbnail, formatFileSize, formatDuration } from '../../../lib/videoCompressor';
import Button from '../../../components/ui/Button';

interface Props { onClose: () => void; }

export default function UploadReelModal({ onClose }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<any>(null);
    const upload = useUploadReel();
    useToast();

    const handleFile = async (f: File) => {
        setError(null); setPreview(null); setMeta(null);
        const v = await validateVideo(f);
        if (!v.valid) { setError(v.error || 'Invalid'); return; }
        setFile(f);
        setMeta(v.metadata);
        try { setPreview(await generateVideoThumbnail(f)); } catch { setPreview(URL.createObjectURL(f)); }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true); setProgress(0);
        const tags = hashtags.split(',').map(h => h.trim()).filter(Boolean);
        upload.mutate({ file, caption, hashtags: tags, onProgress: setProgress }, {
            onSuccess: () => { setUploading(false); onClose(); },
            onError: () => setUploading(false),
        });
    };

    return (
        <div className="reel-upload-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="reel-upload-modal">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                            <Play style={{ width: 16, height: 16, fill: '#C9A84C', color: '#C9A84C' }} />
                        </div>
                        <h3 className="text-theme-text font-bold text-sm">Create Reel</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-theme-border/20 text-theme-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="reel-upload-form">
                    {/* Video Picker */}
                    {file ? (
                        <div className="reel-upload-preview">
                            {preview && <img src={preview} alt="Preview" className="w-full h-full object-cover" />}
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                                <span className="reel-upload-pill">{formatFileSize(file.size)}</span>
                                {meta?.duration && <span className="reel-upload-pill">{formatDuration(meta.duration)}</span>}
                            </div>
                            <button type="button" onClick={() => { setFile(null); setPreview(null); setMeta(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => fileRef.current?.click()} className="reel-upload-dropzone">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 flex items-center justify-center mb-1">
                                <Play style={{ width: 24, height: 24, fill: '#C9A84C', color: '#C9A84C' }} />
                            </div>
                            <span className="text-theme-text text-xs font-semibold mt-1">Select Video</span>
                            <span className="text-theme-muted text-[10px]">Max 60s · 100MB · Portrait recommended</span>
                        </button>
                    )}

                    <input type="file" ref={fileRef} accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                    {error && <p className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">{error}</p>}

                    {/* Caption */}
                    <div>
                        <label className="reel-label">Caption</label>
                        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe your reel..." className="reel-textarea" maxLength={2200} />
                    </div>

                    {/* Hashtags */}
                    <div>
                        <label className="reel-label">Hashtags</label>
                        <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="art, creative, seniqu" className="reel-input" />
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-1.5">
                            <div className="h-1.5 w-full bg-theme-border/30 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-[10px] text-theme-muted text-center">{progress < 100 ? `Uploading ${progress}%` : 'Compressing on server...'}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="reel-upload-actions">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs text-theme-muted hover:text-theme-text transition-colors rounded-xl">Cancel</button>
                        <Button type="submit" variant="gold" isLoading={uploading} disabled={!file || !!error || uploading} className="rounded-xl px-5 text-xs py-2.5 h-auto">
                            <Upload style={{ width: 14, height: 14, marginRight: 4 }} /> Publish
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
