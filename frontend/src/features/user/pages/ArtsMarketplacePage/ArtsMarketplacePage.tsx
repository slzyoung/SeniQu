/**
 * Arts Marketplace
 * Premium implementation matching SeniQu layout with live database indexing,
 * Cloudflare R2 CDN upload, and Solana checkout simulation with delivery details.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Heart,
    Bell,
    ArrowRight,
    Plus,
    Upload,
    X,
    Check,
    Loader2,
    Coins,
    Truck,
    Sparkles,
    Palette
} from 'lucide-react';
import { uploadFile } from '../../../../lib/api';
import { artworkService } from '../../../../services/artworkService';
import { useAuthStore } from '../../../../stores/useAuthStore';
import './ArtsMarketplacePage.css';

// Curated Premium Dummy Artworks
export const CURATED_DUMMY_ARTS = [
    {
        id: 'dummy-1',
        title: 'Bold Gaze',
        description: 'A vivid portrayal of modern strength and identity.',
        medium: 'Oil on Canvas',
        dimensions: '60 cm x 80 cm',
        year: '2023',
        price: 1.2,
        imageUrl: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=800&q=80',
        category: 'Abstract',
        artist: { displayName: 'Elena Rostova', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
        isForSale: true,
        institution: 'Nusantara Contemporary Gallery',
    },
    {
        id: 'dummy-2',
        title: 'Mona Grace',
        description: 'An elegant, enigmatic interpretation of classic Renaissance beauty.',
        medium: 'Oil on Poplar Wood',
        dimensions: '77 cm × 53 cm',
        year: '1503',
        price: 450,
        imageUrl: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80',
        category: 'Classic',
        artist: { displayName: 'Leonardo da Vinci', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leonardo' },
        isForSale: true,
        institution: 'The Louvre Museum, Paris',
    },
    {
        id: 'dummy-3',
        title: 'Starry Symphony',
        description: 'Swirling night skies expressing a tempestuous, beautiful universe.',
        medium: 'Oil on Linen',
        dimensions: '73 cm × 92 cm',
        year: '1889',
        price: 320,
        imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
        category: 'Classic',
        artist: { displayName: 'Vincent van Gogh', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vincent' },
        isForSale: true,
        institution: 'Museum of Modern Art (MoMA), New York',
    },
    {
        id: 'dummy-4',
        title: 'Quantum Horizon',
        description: 'A generative journey exploring digital dimensions and fractal horizons.',
        medium: 'Digital / WebGL',
        dimensions: '3840px × 2160px',
        year: '2024',
        price: 8.5,
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
        category: 'Digital',
        artist: { displayName: 'Aria Sterling', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria' },
        isForSale: true,
        institution: 'SeniQu Verified Creator',
    },
    {
        id: 'dummy-5',
        title: 'Silent Reflection',
        description: 'A peaceful portrait study in light, shadow, and deep quiet contemplation.',
        medium: 'Charcoal & Acrylic',
        dimensions: '50 cm x 70 cm',
        year: '2022',
        price: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28e50b84bc5?w=800&q=80',
        category: 'Portraits',
        artist: { displayName: 'Muhammad Yusuf', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yusuf' },
        isForSale: true,
        institution: 'Jogja Fine Art Society',
    }
];

const CATEGORIES = ['All', 'Abstract', 'Portraits', 'Digital', 'Classic'];

export function ArtsMarketplacePage() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();
    const [activeCategory, setActiveCategory] = useState('All');
    
    // Core states
    const [artworks, setArtworks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [likes, setLikes] = useState<Record<string, boolean>>({});
    
    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [selectedArt, setSelectedArt] = useState<any | null>(null);

    // Form inputs for listing a new artwork
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Abstract');
    const [medium, setMedium] = useState('');
    const [dimensions, setDimensions] = useState('');
    const [price, setPrice] = useState('');
    const [isForSale, setIsForSale] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form inputs for simulated delivery
    const [recipientName, setRecipientName] = useState(user?.display_name || 'Guest User');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [courier, setCourier] = useState('Solana Air Cargo (Express)');
    const [checkoutStep, setCheckoutStep] = useState<'details' | 'simulating' | 'success'>('details');
    const [simSteps, setSimSteps] = useState<any[]>([]);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [simulatedTxHash, setSimulatedTxHash] = useState('');

    // Load artworks from DB + Curated dummies
    const fetchArtworks = async () => {
        setIsLoading(true);
        try {
            const res = await artworkService.getArtworks({ limit: 50 });
            // Filter out duplicates if any match the dummy IDs
            const dbArts = (res.data || []).filter((item: any) => !item.id.startsWith('dummy-'));
            
            // Map db structure to match
            const mappedDbArts = dbArts.map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                medium: item.medium || 'N/A',
                dimensions: item.dimensions || 'N/A',
                year: item.yearCreated || '2024',
                price: item.price || 0,
                imageUrl: item.primaryImageUrl || item.imageUrl || '',
                category: item.category || 'Abstract',
                artist: {
                    displayName: item.artist?.displayName || 'Unknown Artist',
                    avatarUrl: item.artist?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.title}`
                },
                isForSale: item.isForSale ?? true,
                institution: item.institutionId ? 'Verified Institution' : 'SeniQu Creator'
            }));

            // Combine both DB items and custom Curated Dummies
            setArtworks([...mappedDbArts, ...CURATED_DUMMY_ARTS]);
        } catch (error) {
            console.error('Failed to load artworks from DB, showing dummies only:', error);
            setArtworks(CURATED_DUMMY_ARTS);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArtworks();
    }, []);

    // Toggle likes in local state
    const toggleLike = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setLikes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Handle File Drop / Select
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFilePreview(URL.createObjectURL(selectedFile));
        }
    };

    // Upload artwork details to CDN + Index in Database
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            alert('Please select an artwork image to upload.');
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(10);

        try {
            // Step 1: Upload file to Cloudflare R2 bucket via storage service
            const uploadRes = await uploadFile(file, 'artworks', (progress) => {
                setUploadProgress(10 + Math.round(progress * 0.8)); // map 0-100% to 10-90%
            });

            const uploadedImageUrl = uploadRes.url;
            setUploadProgress(95);

            // Step 2: Index metadata to the Supabase database
            // Note: createArtwork maps fields to match database columns
            await artworkService.createArtwork({
                title,
                description,
                medium,
                dimensions,
                year: new Date().getFullYear(),
                price: price ? parseFloat(price) : 0,
                images: [uploadedImageUrl],
                isArt: true
            });

            setUploadProgress(100);
            alert('Artwork successfully uploaded to R2 and indexed to the Supabase database!');
            
            // Reset form
            setTitle('');
            setDescription('');
            setMedium('');
            setDimensions('');
            setPrice('');
            setFile(null);
            setFilePreview(null);
            setShowUploadModal(false);
            
            // Reload list
            fetchArtworks();
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`Failed to list artwork: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    // Open Checkout SOL Modal
    const openCheckout = (e: React.MouseEvent, art: any) => {
        e.stopPropagation();
        setSelectedArt(art);
        setCheckoutStep('details');
        setPhone('');
        setAddress('');
        setShowCheckoutModal(true);
    };

    // Run simulated Solana signature & delivery logging
    const handleCheckoutSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!address || !phone) {
            alert('Please enter delivery address and phone number.');
            return;
        }

        setCheckoutStep('simulating');
        setActiveStepIndex(0);

        // Define step-by-step transaction logs
        const steps = [
            { id: 1, text: 'Connecting to Solana RPC Network...' },
            { id: 2, text: 'Calculating gas limit & fee estimations...' },
            { id: 3, text: 'Awaiting signature from Privy wallet auth...' },
            { id: 4, text: 'Broadcasting transaction payload...' },
            { id: 5, text: 'Validating block on-chain (confirming block)...' },
            { id: 6, text: 'Writing transaction metadata to Supabase DB...' }
        ];
        setSimSteps(steps);

        let currentStep = 0;
        const interval = setInterval(async () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                setActiveStepIndex(currentStep);
            } else {
                clearInterval(interval);
                
                // Generate a real-looking simulated Tx Hash
                const randomHex = Array.from({ length: 32 }, () =>
                    Math.floor(Math.random() * 16).toString(16)
                ).join('');
                const mockHash = `SolTx${randomHex.substring(0, 18)}Confirmed`;
                setSimulatedTxHash(mockHash);

                // Save transaction metadata into database table `marketplace_transactions`
                try {
                    await artworkService.recordTransaction({
                        sellerId: selectedArt.artistId || null,
                        artworkId: selectedArt.id.startsWith('dummy-') ? null : selectedArt.id,
                        artworkTitle: selectedArt.title,
                        artworkImage: selectedArt.imageUrl,
                        amount: selectedArt.price,
                        currency: 'SOL',
                        txHash: mockHash,
                        status: 'completed'
                    });
                } catch (err) {
                    console.error('Failed to log transaction details to DB, proceeding with checkout success:', err);
                }

                setCheckoutStep('success');
            }
        }, 1200);
    };

    // Filter displayed artworks based on Category
    const filteredArtworks = artworks.filter(art => {
        if (activeCategory === 'All') return true;
        return art.category?.toLowerCase() === activeCategory.toLowerCase();
    });

    // Partition grid items into Left/Right masonry columns
    const colLeftItems = filteredArtworks.filter((_, idx) => idx % 2 === 0);
    const colRightItems = filteredArtworks.filter((_, idx) => idx % 2 !== 0);

    return (
        <div className="art-market-mockup">
            
            {/* ====== TITLE ====== */}
            <h1 className="art-market-mockup__title art-market-mockup__fade-in" style={{ animationDelay: '0.1s' }}>
                Your Art<br />Marketplace
            </h1>

            {/* ====== CATEGORIES ====== */}
            <div className="art-market-mockup__categories art-market-mockup__fade-in" style={{ animationDelay: '0.2s' }}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        className={`art-market-mockup__pill ${activeCategory === cat ? 'art-market-mockup__pill--active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ====== SECTION HEADER ====== */}
            <div className="art-market-mockup__section-header art-market-mockup__fade-in" style={{ animationDelay: '0.3s' }}>
                <h2 className="art-market-mockup__section-title">Trending Art</h2>
                <span className="art-market-mockup__see-all" onClick={() => fetchArtworks()}>Refresh</span>
            </div>

            {/* ====== LOADER / EMPTY STATE ====== */}
            {isLoading && (
                <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <Loader2 className="animate-spin" style={{ color: 'var(--mk-accent)', width: 32, height: 32 }} />
                    <span style={{ fontSize: 14, color: 'var(--mk-text-muted)' }}>Querying Supabase database...</span>
                </div>
            )}

            {!isLoading && filteredArtworks.length === 0 && (
                <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--mk-surface)', borderRadius: 24, border: '1px solid var(--mk-border)' }}>
                    <Palette style={{ width: 44, height: 44, color: 'var(--mk-text-muted)', margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0' }}>No Artworks Found</h3>
                    <p style={{ fontSize: 13, color: 'var(--mk-text-muted)', margin: 0 }}>Be the first to list an artwork in the {activeCategory} category!</p>
                </div>
            )}

            {/* ====== MASONRY GRID ====== */}
            {!isLoading && filteredArtworks.length > 0 && (
                <div className="art-market-mockup__grid">
                    
                    {/* Left Column */}
                    <div className="art-market-mockup__col-left art-market-mockup__fade-in" style={{ animationDelay: '0.4s' }}>
                        {colLeftItems.map((art) => (
                            <div key={art.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div 
                                    className="art-market-mockup__card"
                                    style={{ height: art.id === 'dummy-1' ? '320px' : '220px' }}
                                    onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                >
                                    <img src={art.imageUrl} alt={art.title} className="art-market-mockup__card-img" />
                                    
                                    <button 
                                        className={`art-market-mockup__card-heart ${likes[art.id] ? 'art-market-mockup__card-heart--active' : ''}`}
                                        onClick={(e) => toggleLike(e, art.id)}
                                    >
                                        <Heart />
                                    </button>
                                    
                                    <div className="art-market-mockup__card-info">
                                        <h3 className="art-market-mockup__card-title">{art.title}</h3>
                                        <p className="art-market-mockup__card-subtitle">{art.description?.substring(0, 32)}...</p>
                                        {art.id.startsWith('dummy-') && (
                                            <div className="art-market-poa-badge">PoA Verified</div>
                                        )}
                                    </div>
                                </div>

                                {art.isForSale && (
                                    <button className="art-market-mockup__buy-btn" onClick={(e) => openCheckout(e, art)}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: 10, color: 'var(--mk-text-muted)', fontWeight: 500 }}>Buy Now</span>
                                            <span style={{ fontSize: 14, fontWeight: 700 }}>{art.price} SOL</span>
                                        </div>
                                        <ArrowRight style={{ width: 18, height: 18 }} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right Column */}
                    <div className="art-market-mockup__col-right art-market-mockup__fade-in" style={{ animationDelay: '0.5s' }}>
                        {colRightItems.map((art) => (
                            <div key={art.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div 
                                    className="art-market-mockup__card"
                                    style={{ height: '200px' }}
                                    onClick={() => navigate(`/marketplace/art/${art.id}`)}
                                >
                                    <img src={art.imageUrl} alt={art.title} className="art-market-mockup__card-img" />
                                    
                                    <button 
                                        className={`art-market-mockup__card-heart ${likes[art.id] ? 'art-market-mockup__card-heart--active' : ''}`}
                                        onClick={(e) => toggleLike(e, art.id)}
                                    >
                                        <Heart />
                                    </button>
                                    
                                    <div className="art-market-mockup__card-info">
                                        <h3 className="art-market-mockup__card-title">{art.title}</h3>
                                        <p className="art-market-mockup__card-subtitle">{art.description?.substring(0, 32)}...</p>
                                        {art.id.startsWith('dummy-') && (
                                            <div className="art-market-poa-badge">PoA Verified</div>
                                        )}
                                    </div>
                                </div>

                                {art.isForSale && (
                                    <button className="art-market-mockup__buy-btn" onClick={(e) => openCheckout(e, art)}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: 10, color: 'var(--mk-text-muted)', fontWeight: 500 }}>Buy Now</span>
                                            <span style={{ fontSize: 14, fontWeight: 700 }}>{art.price} SOL</span>
                                        </div>
                                        <ArrowRight style={{ width: 18, height: 18 }} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {/* ====== MODAL: UPLOAD ARTWORK ====== */}
            {showUploadModal && (
                <div className="art-market-modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="art-market-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="art-market-modal-header">
                            <h3 className="art-market-modal-title">List Artwork</h3>
                            <button className="art-market-modal-close" onClick={() => setShowUploadModal(false)}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="art-market-input-group">
                                <label className="art-market-input-label">Artwork Image</label>
                                <input 
                                    type="file" 
                                    id="artFile" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    style={{ display: 'none' }} 
                                />
                                {filePreview ? (
                                    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 180 }}>
                                        <img src={filePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button 
                                            type="button" 
                                            onClick={() => { setFile(null); setFilePreview(null); }}
                                            style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <X style={{ width: 16, height: 16 }} />
                                        </button>
                                    </div>
                                ) : (
                                    <label htmlFor="artFile" className="art-market-dropzone">
                                        <Upload style={{ width: 32, height: 32, color: 'var(--mk-text-muted)', marginBottom: 8 }} />
                                        <span style={{ fontSize: 14, fontWeight: 600 }}>Click to Select File</span>
                                        <span style={{ fontSize: 11, color: 'var(--mk-text-muted)', marginTop: 4 }}>WebP, PNG, or JPG (up to 10MB)</span>
                                    </label>
                                )}
                            </div>

                            <div className="art-market-input-group">
                                <label className="art-market-input-label">Artwork Title</label>
                                <input 
                                    type="text" 
                                    className="art-market-input" 
                                    placeholder="e.g. Majestic Nusantara" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="art-market-input-group">
                                <label className="art-market-input-label">Description</label>
                                <textarea 
                                    className="art-market-textarea" 
                                    placeholder="Tell the story behind this masterpiece..." 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    required 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Category</label>
                                    <select 
                                        className="art-market-select" 
                                        value={category} 
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="Abstract">Abstract</option>
                                        <option value="Portraits">Portraits</option>
                                        <option value="Digital">Digital</option>
                                        <option value="Classic">Classic</option>
                                    </select>
                                </div>
                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Price (SOL)</label>
                                    <input 
                                        type="number" 
                                        step="0.001"
                                        className="art-market-input" 
                                        placeholder="0.5" 
                                        value={price} 
                                        onChange={(e) => setPrice(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Medium</label>
                                    <input 
                                        type="text" 
                                        className="art-market-input" 
                                        placeholder="e.g. Oil on Canvas" 
                                        value={medium} 
                                        onChange={(e) => setMedium(e.target.value)} 
                                    />
                                </div>
                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Dimensions</label>
                                    <input 
                                        type="text" 
                                        className="art-market-input" 
                                        placeholder="e.g. 60cm x 80cm" 
                                        value={dimensions} 
                                        onChange={(e) => setDimensions(e.target.value)} 
                                    />
                                </div>
                            </div>

                            {uploadProgress > 0 && (
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mk-text-muted)', marginBottom: 4 }}>
                                        <span>Uploading to Cloudflare CDN...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--mk-border)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--mk-accent)', transition: 'width 0.2s' }} />
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="art-market-btn-primary" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                                        Processing Listing...
                                    </>
                                ) : 'List for Sale'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ====== MODAL: SOLANA SOL CHECKOUT SIMULATION ====== */}
            {showCheckoutModal && selectedArt && (
                <div className="art-market-modal-overlay" onClick={() => setShowCheckoutModal(false)}>
                    <div className="art-market-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="art-market-modal-header">
                            <h3 className="art-market-modal-title">
                                {checkoutStep === 'details' && 'Secure SOL Checkout'}
                                {checkoutStep === 'simulating' && 'Processing Transaction'}
                                {checkoutStep === 'success' && 'Purchase Complete! 🎉'}
                            </h3>
                            <button className="art-market-modal-close" onClick={() => setShowCheckoutModal(false)}>
                                <X style={{ width: 20, height: 20 }} />
                            </button>
                        </div>

                        {checkoutStep === 'details' && (
                            <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--mk-bg)', padding: 12, borderRadius: 16 }}>
                                    <img 
                                        src={selectedArt.imageUrl} 
                                        alt={selectedArt.title} 
                                        style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} 
                                    />
                                    <div>
                                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{selectedArt.title}</h4>
                                        <p style={{ fontSize: 12, color: 'var(--mk-text-muted)', margin: '2px 0 0 0' }}>By {selectedArt.artist.displayName}</p>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--mk-accent)', display: 'block', marginTop: 4 }}>{selectedArt.price} SOL</span>
                                    </div>
                                </div>

                                <div className="art-market-receipt">
                                    <div className="art-market-receipt-row">
                                        <span className="art-market-receipt-label">Wallet Engine</span>
                                        <span className="art-market-receipt-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Sparkles style={{ width: 12, height: 12, color: 'var(--mk-accent)' }} /> Privy Embedded
                                        </span>
                                    </div>
                                    <div className="art-market-receipt-row">
                                        <span className="art-market-receipt-label">Account Balance</span>
                                        <span className="art-market-receipt-value">24.52 SOL</span>
                                    </div>
                                    <div className="art-market-receipt-row">
                                        <span className="art-market-receipt-label">Transaction Gas</span>
                                        <span className="art-market-receipt-value">~0.00005 SOL</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--mk-border)', paddingBottom: 6 }}>
                                    Shipping & Delivery Details
                                </div>

                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Recipient Name</label>
                                    <input 
                                        type="text" 
                                        className="art-market-input" 
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        required 
                                    />
                                </div>

                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Contact Phone</label>
                                    <input 
                                        type="tel" 
                                        className="art-market-input" 
                                        placeholder="e.g. +62 812-3456-789" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required 
                                    />
                                </div>

                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Full Shipping Address</label>
                                    <textarea 
                                        className="art-market-textarea" 
                                        placeholder="Address, City, State, Postcode" 
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        required 
                                    />
                                </div>

                                <div className="art-market-input-group">
                                    <label className="art-market-input-label">Delivery Courier</label>
                                    <select 
                                        className="art-market-select"
                                        value={courier}
                                        onChange={(e) => setCourier(e.target.value)}
                                    >
                                        <option value="Solana Air Cargo (Express)">Solana Air Cargo (Express, 1-2 days)</option>
                                        <option value="DHL Express International">DHL Express International (3-5 days)</option>
                                        <option value="JNE YES (Indonesia Wide)">JNE YES (Indonesia, 1-2 days)</option>
                                    </select>
                                </div>

                                <button type="submit" className="art-market-btn-primary">
                                    <Coins style={{ width: 18, height: 18 }} />
                                    Sign Wallet & Pay {selectedArt.price} SOL
                                </button>
                            </form>
                        )}

                        {checkoutStep === 'simulating' && (
                            <div className="art-market-tx-loader">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '12px 0' }}>
                                    <Loader2 className="animate-spin" style={{ color: 'var(--mk-accent)', width: 36, height: 36 }} />
                                    <span style={{ fontSize: 13, color: 'var(--mk-text-muted)' }}>Broadcasting to blockchain...</span>
                                </div>
                                {simSteps.map((step, idx) => (
                                    <div key={step.id} className="art-market-tx-step">
                                        <div className={`art-market-tx-step-dot 
                                            ${idx === activeStepIndex ? 'art-market-tx-step-dot--active' : ''} 
                                            ${idx < activeStepIndex ? 'art-market-tx-step-dot--completed' : ''}
                                        `} />
                                        <span className={`art-market-tx-step-text 
                                            ${idx === activeStepIndex ? 'art-market-tx-step-text--active' : ''} 
                                            ${idx < activeStepIndex ? 'art-market-tx-step-text--completed' : ''}
                                        `}>
                                            {step.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {checkoutStep === 'success' && (
                            <div className="art-market-confetti-container">
                                <div className="art-market-confetti-badge">
                                    <Check style={{ width: 36, height: 36 }} />
                                </div>
                                <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Payment Confirmed</h4>
                                <p style={{ fontSize: 13, color: 'var(--mk-text-muted)', margin: 0 }}>
                                    Your order for <strong>{selectedArt.title}</strong> has been logged. The museum/creator has been notified for shipping preparation.
                                </p>

                                <div className="art-market-receipt">
                                    <div className="art-market-receipt-row">
                                        <span className="art-market-receipt-label">Amount Paid</span>
                                        <span className="art-market-receipt-value" style={{ color: '#10B981' }}>{selectedArt.price} SOL</span>
                                    </div>
                                    <div className="art-market-receipt-row">
                                        <span className="art-market-receipt-label">Courier Service</span>
                                        <span className="art-market-receipt-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Truck style={{ width: 12, height: 12 }} /> {courier}
                                        </span>
                                    </div>
                                    <div className="art-market-receipt-row">
                                        <span className="art-market-receipt-label">Recipient</span>
                                        <span className="art-market-receipt-value">{recipientName}</span>
                                    </div>
                                    <div className="art-market-receipt-row" style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                        <span className="art-market-receipt-label">On-chain Transaction Hash</span>
                                        <span 
                                            className="art-market-receipt-hash" 
                                            onClick={() => window.open(`https://solscan.io/tx/${simulatedTxHash}?cluster=devnet`, '_blank')}
                                        >
                                            {simulatedTxHash}
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    className="art-market-btn-primary" 
                                    onClick={() => { setShowCheckoutModal(false); fetchArtworks(); }}
                                    style={{ marginTop: 8 }}
                                >
                                    Return to Marketplace
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ArtsMarketplacePage;
