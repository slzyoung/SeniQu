/**
 * My Artworks Page
 * Uses real API data with useMyArtworks hook
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Grid,
    List,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    Eye,
    Heart,
    Share2,
    ExternalLink,
    Loader2,
    Image as ImageIcon
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Badge, Tabs } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useMyArtworks, useDeleteArtwork } from '../../../hooks/useArtist';

interface ArtworkType {
    id: string;
    title: string;
    images?: { url: string }[];
    imageUrl?: string;
    status: string;
    category?: string;
    medium?: string;
    views: number;
    likes: number;
    isNFT: boolean;
    createdAt: string;
}

function ArtworkGridCard({
    artwork,
    onEdit,
    onDelete,
    onView,
    isDeleting
}: {
    artwork: ArtworkType;
    onEdit: () => void;
    onDelete: () => void;
    onView: () => void;
    isDeleting?: boolean;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const imageUrl = artwork.imageUrl || artwork.images?.[0]?.url;

    const statusColors: Record<string, string> = {
        PUBLISHED: 'bg-green-500/10 text-green-500 border-green-500/20',
        DRAFT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        REVIEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    const statusLabels: Record<string, string> = {
        PUBLISHED: 'Published',
        DRAFT: 'Draft',
        REVIEW: 'In Review',
        REJECTED: 'Rejected',
    };

    return (
        <motion.div layout className={isDeleting ? 'opacity-50 pointer-events-none' : ''}>
            <Card variant="elevated" hover padding="none" className="group overflow-hidden">
                <div className="relative aspect-[4/3] bg-theme-elevated">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={artwork.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-theme-muted/40" />
                        </div>
                    )}

                    {/* Status Badge */}
                    <Badge
                        className={`absolute top-3 left-3 capitalize ${statusColors[artwork.status] || statusColors.DRAFT}`}
                    >
                        {statusLabels[artwork.status] || artwork.status}
                    </Badge>

                    {artwork.isNFT && (
                        <Badge variant="gold" className="absolute top-3 right-3">NFT</Badge>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            onClick={onView}
                            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onEdit}
                            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                        >
                            <Edit2 className="w-5 h-5" />
                        </button>
                        <button className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-medium text-theme-text truncate">{artwork.title}</h3>
                            <p className="text-sm text-theme-muted">{artwork.category || artwork.medium || 'Artwork'}</p>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 text-theme-muted hover:text-theme-text hover:bg-theme-elevated rounded-lg transition-colors"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="absolute right-0 mt-1 w-36 bg-theme-surface border border-theme-border rounded-xl shadow-xl overflow-hidden z-10"
                                    >
                                        <button
                                            onClick={() => { onEdit(); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-text hover:bg-theme-elevated"
                                        >
                                            <Edit2 className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => { onView(); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-text hover:bg-theme-elevated"
                                        >
                                            <ExternalLink className="w-4 h-4" /> View
                                        </button>
                                        <button
                                            onClick={() => { onDelete(); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-theme-elevated"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                        <button
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-text hover:bg-theme-elevated"
                                            onClick={() => setShowMenu(false)}
                                        >
                                            <Share2 className="w-4 h-4" /> Share
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-theme-border">
                        <span className="flex items-center gap-1 text-xs text-theme-muted">
                            <Eye className="w-3.5 h-3.5" /> {(artwork.views || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-theme-muted">
                            <Heart className="w-3.5 h-3.5" /> {(artwork.likes || 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

export function MyArtworks() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch artworks with real API
    const { data: artworkData, isLoading, isError } = useMyArtworks(
        currentPage,
        12,
        {
            status: activeTab === 'all' ? undefined : activeTab.toUpperCase(),
        }
    );

    const deleteMutation = useDeleteArtwork();

    const artworks: ArtworkType[] = artworkData?.data || [];
    const totalArtworks = artworkData?.meta?.total || 0;
    const totalPages = artworkData?.meta?.totalPages || 1;

    const tabs = [
        { id: 'all', label: 'All', badge: totalArtworks },
        { id: 'published', label: 'Published' },
        { id: 'draft', label: 'Drafts' },
        { id: 'nft', label: 'NFTs' },
    ];

    const filteredArtworks = artworks.filter(artwork =>
        artwork.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this artwork?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const handleEdit = (id: string) => {
        navigate(`/artist/artworks/${id}/edit`);
    };

    const handleView = (id: string) => {
        navigate(`/gallery/artwork/${id}`);
    };

    return (
        <PageContainer
            title="My Artworks"
            description={isLoading ? 'Loading...' : `${totalArtworks} total artworks`}
            actions={
                <Button
                    variant="gold"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => navigate('/artist/upload')}
                >
                    <span className="hidden sm:inline">Upload Artwork</span>
                    <span className="sm:hidden">Upload</span>
                </Button>
            }
        >
            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }} className="mb-6" />

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search artworks..."
                        className="w-full pl-10 pr-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-gold"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
                        <span className="hidden sm:inline">Filter</span>
                    </Button>
                    <div className="flex items-center border border-theme-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 ${viewMode === 'grid' ? 'bg-gold/10 text-gold' : 'text-theme-muted hover:text-theme-text'}`}
                        >
                            <Grid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2.5 ${viewMode === 'table' ? 'bg-gold/10 text-gold' : 'text-theme-muted hover:text-theme-text'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : isError ? (
                <div className="py-20 text-center text-red-400">
                    Failed to load artworks. Please try again.
                </div>
            ) : filteredArtworks.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <ImageIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-theme-text mb-2">No artworks found</h3>
                    <p className="text-theme-muted mb-6 max-w-sm mx-auto">
                        {searchQuery ? 'Try adjusting your search' : 'Start by uploading your first artwork'}
                    </p>
                    {!searchQuery && (
                        <Button
                            variant="gold"
                            leftIcon={<Plus className="w-4 h-4" />}
                            onClick={() => navigate('/artist/upload')}
                        >
                            Upload Artwork
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredArtworks.map((artwork) => (
                        <ArtworkGridCard
                            key={artwork.id}
                            artwork={artwork}
                            onEdit={() => handleEdit(artwork.id)}
                            onDelete={() => handleDelete(artwork.id)}
                            onView={() => handleView(artwork.id)}
                            isDeleting={deleteMutation.isPending}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
                <div className="mt-8 flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-theme-muted">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}

export default MyArtworks;
