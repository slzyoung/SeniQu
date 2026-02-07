/**
 * Upload Artwork Page
 * Uses real API data with useCreateArtwork hook
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Upload,
    Image as ImageIcon,
    X,
    Check,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Input, Textarea, Select, Badge } from '../../../components/ui';
import { useToast } from '../../../stores/useNotificationStore';
import { useCreateArtwork } from '../../../hooks/useArtist';

const genres = [
    { value: 'abstract', label: 'Abstract' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'contemporary', label: 'Contemporary' },
    { value: 'traditional', label: 'Traditional' },
    { value: 'digital', label: 'Digital Art' },
];

const mediums = [
    { value: 'oil', label: 'Oil on Canvas' },
    { value: 'acrylic', label: 'Acrylic' },
    { value: 'watercolor', label: 'Watercolor' },
    { value: 'digital', label: 'Digital' },
    { value: 'mixed', label: 'Mixed Media' },
    { value: 'photography', label: 'Photography' },
];

export function UploadArtwork() {
    const toast = useToast();
    const navigate = useNavigate();
    const createArtwork = useCreateArtwork();

    const [step, setStep] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        genre: '',
        medium: '',
        year: '',
        dimensions: '',
        tags: [] as string[],
        isNFT: false,
        price: '',
    });

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            toast.error('Invalid file', 'Please upload an image file');
        }
    }, [toast]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (saveAsDraft = false) => {
        if (!uploadedFile) {
            toast.error('No image', 'Please upload an artwork image');
            return;
        }
        if (!formData.title) {
            toast.error('Title required', 'Please enter a title for your artwork');
            return;
        }

        try {
            // For demo: use previewUrl as imageUrl (in production, upload to cloud storage first)
            // TODO: Implement proper file upload to cloud storage (S3, Cloudinary, etc.)
            const artworkData = {
                title: formData.title,
                description: formData.description,
                category: formData.genre || 'contemporary',
                medium: formData.medium,
                dimensions: formData.dimensions,
                imageUrl: previewUrl || '',  // In production, this should be the uploaded URL
                status: saveAsDraft ? 'DRAFT' : 'PUBLISHED',
            };

            await createArtwork.mutateAsync(artworkData);
            toast.success(
                saveAsDraft ? 'Draft Saved' : 'Artwork Published!',
                saveAsDraft ? 'Your artwork has been saved as a draft' : 'Your artwork is now live'
            );
            navigate('/artist/artworks');
        } catch (error) {
            // Error handled by mutation hook
        }
    };

    const handleAddTag = (tag: string) => {
        if (tag && !formData.tags.includes(tag)) {
            setFormData({ ...formData, tags: [...formData.tags, tag] });
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    return (
        <PageContainer
            title="Upload Artwork"
            description="Share your artwork with the world"
        >
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div className="flex items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${step >= s
                                    ? 'bg-gold text-charcoal'
                                    : 'bg-theme-elevated text-theme-muted'
                                    }`}
                            >
                                {step > s ? <Check className="w-5 h-5" /> : s}
                            </div>
                            <span className={`ml-2 text-sm font-medium hidden sm:block ${step >= s ? 'text-theme-text' : 'text-theme-muted'
                                }`}>
                                {s === 1 ? 'Upload' : s === 2 ? 'Details' : 'Publish'}
                            </span>
                        </div>
                        {s < 3 && (
                            <div className={`w-16 h-0.5 mx-4 ${step > s ? 'bg-gold' : 'bg-theme-border'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Step 1: Upload */}
                {step === 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card variant="elevated">
                            <CardHeader title="Upload Your Artwork" />
                            <CardContent>
                                {!previewUrl ? (
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        className={`
                      relative border-2 border-dashed rounded-2xl p-12
                      flex flex-col items-center justify-center text-center
                      transition-colors cursor-pointer
                      ${isDragging
                                                ? 'border-gold bg-gold/5'
                                                : 'border-theme-border hover:border-theme-subtle'
                                            }
                    `}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="p-4 bg-theme-elevated rounded-full mb-4">
                                            <Upload className="w-8 h-8 text-gold" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-theme-text mb-2">
                                            Drag and drop your artwork
                                        </h3>
                                        <p className="text-theme-muted mb-4">
                                            or click to browse from your device
                                        </p>
                                        <p className="text-sm text-theme-muted">
                                            Supports: JPG, PNG, GIF, WebP (Max 50MB)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full max-h-96 object-contain rounded-xl"
                                        />
                                        <button
                                            onClick={() => { setUploadedFile(null); setPreviewUrl(null); }}
                                            className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="mt-4 p-3 bg-theme-elevated rounded-lg flex items-center gap-3">
                                            <ImageIcon className="w-5 h-5 text-theme-muted" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-theme-text truncate">
                                                    {uploadedFile?.name}
                                                </p>
                                                <p className="text-xs text-theme-muted">
                                                    {(uploadedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end mt-6">
                                    <Button
                                        variant="gold"
                                        onClick={() => setStep(2)}
                                        disabled={!uploadedFile}
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card variant="elevated">
                            <CardHeader title="Artwork Details" />
                            <CardContent className="space-y-6">
                                <Input
                                    label="Title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Enter artwork title"
                                    required
                                />

                                <Textarea
                                    label="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your artwork, its inspiration, and story..."
                                    rows={4}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Genre"
                                        options={genres}
                                        value={formData.genre}
                                        onChange={(v) => setFormData({ ...formData, genre: v as string })}
                                        placeholder="Select genre"
                                    />
                                    <Select
                                        label="Medium"
                                        options={mediums}
                                        value={formData.medium}
                                        onChange={(v) => setFormData({ ...formData, medium: v as string })}
                                        placeholder="Select medium"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Year Created"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        placeholder="e.g. 2024"
                                        type="number"
                                    />
                                    <Input
                                        label="Dimensions"
                                        value={formData.dimensions}
                                        onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                                        placeholder="e.g. 24 x 36 inches"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-theme-text mb-2">
                                        Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.tags.map((tag) => (
                                            <Badge key={tag} variant="default" removable onRemove={() => handleRemoveTag(tag)}>
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Input
                                        placeholder="Add tags (press Enter)"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                        hint="Press Enter to add tag"
                                    />
                                </div>

                                <div className="flex justify-between pt-4 border-t border-theme-border">
                                    <Button variant="ghost" onClick={() => setStep(1)}>
                                        Back
                                    </Button>
                                    <Button variant="gold" onClick={() => setStep(3)}>
                                        Continue
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Step 3: Publish Options */}
                {step === 3 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card variant="elevated">
                            <CardHeader title="Publish Options" />
                            <CardContent className="space-y-6">
                                {/* NFT Toggle */}
                                <div className="p-4 bg-theme-elevated rounded-xl">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-gold/10 rounded-lg">
                                                <ImageIcon className="w-5 h-5 text-gold" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-theme-text">
                                                    Mint as NFT
                                                </p>
                                                <p className="text-sm text-theme-muted">
                                                    Create an NFT and list it on the marketplace
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, isNFT: !formData.isNFT })}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${formData.isNFT ? 'bg-gold' : 'bg-theme-border'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isNFT ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {formData.isNFT && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className="mt-4 pt-4 border-t border-theme-border"
                                        >
                                            <Input
                                                label="Price (ETH)"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                placeholder="0.1"
                                                type="number"
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Preview */}
                                <div className="p-4 bg-theme-elevated rounded-xl">
                                    <h3 className="font-medium text-theme-text mb-4">Preview</h3>
                                    <div className="flex items-start gap-4">
                                        {previewUrl && (
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="w-24 h-24 object-cover rounded-lg"
                                            />
                                        )}
                                        <div>
                                            <p className="font-semibold text-theme-text">{formData.title || 'Untitled'}</p>
                                            <p className="text-sm text-theme-muted">{formData.genre || 'No genre'} • {formData.medium || 'No medium'}</p>
                                            {formData.isNFT && (
                                                <p className="text-sm text-gold mt-1">{formData.price || '0'} ETH</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4 border-t border-theme-border">
                                    <Button variant="ghost" onClick={() => setStep(2)} disabled={createArtwork.isPending}>
                                        Back
                                    </Button>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleSubmit(true)}
                                            disabled={createArtwork.isPending}
                                            className="w-full sm:w-auto"
                                        >
                                            {createArtwork.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Save as Draft
                                        </Button>
                                        <Button
                                            variant="gold"
                                            onClick={() => handleSubmit(false)}
                                            disabled={createArtwork.isPending}
                                            className="w-full sm:w-auto"
                                        >
                                            {createArtwork.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Publish Artwork
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </PageContainer>
    );
}

export default UploadArtwork;
