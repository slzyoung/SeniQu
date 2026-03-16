/**
 * My Arts Page for User Dashboard
 * View and manage owned artworks — Proof of Art (PoA)
 */

import { useState } from 'react';
import {
    Wallet,
    Grid3X3,
    List,
    Sparkles,
    Send,
    Tag,
    Eye,
    Loader2,
    Plus,
    ExternalLink
} from 'lucide-react';
import { PageContainer, StatsGrid } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button, Badge, Tabs } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useOwnedNFTs, useCreatedNFTs, useUnlistNFT } from '../../../hooks/useNFT';

// ============================================
// TYPES
// ============================================

type ViewMode = 'grid' | 'list';
type TabValue = 'owned' | 'created';

// ============================================
// COMPONENTS
// ============================================

function NFTCard({
    nft,
    viewMode,
    isOwned,
    onList,
    onUnlist,
    onTransfer
}: {
    nft: any;
    viewMode: ViewMode;
    isOwned: boolean;
    onList?: (nft: any) => void;
    onUnlist?: (nftId: string) => void;
    onTransfer?: (nft: any) => void;
}) {
    const navigate = useNavigate();

    if (viewMode === 'list') {
        return (
            <Card variant="default" hover className="cursor-pointer touch-manipulation active:bg-theme-elevated/50 transition-colors" onClick={() => navigate(`/marketplace/nft/${nft.id}`)}>
                <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className="w-full xs:w-20 xs:h-20 sm:w-28 sm:h-28 aspect-square rounded-xl overflow-hidden flex-shrink-0 bg-theme-elevated">
                        <img
                            src={nft.artwork?.primaryImageUrl || '/placeholder-nft.jpg'}
                            alt={nft.artwork?.title || 'Artwork'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="font-medium text-theme-text truncate text-sm sm:text-base">{nft.artwork?.title || 'Untitled'}</h3>
                                    <p className="text-xs sm:text-sm text-theme-muted truncate">
                                        {isOwned ? `by ${nft.creator?.displayName || 'Unknown'}` : 'Created by you'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge variant={nft.isListed ? 'success' : 'default'} className="scale-90 sm:scale-100 origin-right">
                                        {nft.isListed ? 'Listed' : nft.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-theme-muted">
                                <Badge variant="default" className="scale-90 origin-left">{nft.blockchain || 'Solana'}</Badge>
                                <span>Token #{nft.tokenId?.slice(-6) || '???'}</span>
                            </div>
                            {nft.isListed && (
                                <p className="font-mono text-sm sm:text-lg font-bold text-gold mt-2">
                                    {nft.listingPrice} {nft.currency || 'SOL'}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Actions Row for Mobile, Column for Desktop/Tablet if space permits, but responsive row is safer */}
                    <div className="flex flex-row xs:flex-col gap-2 mt-2 xs:mt-0 pt-2 xs:pt-0 border-t xs:border-t-0 border-theme-border">
                        {isOwned && (
                            <>
                                {nft.isListed ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 xs:flex-none"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUnlist?.(nft.id);
                                        }}
                                    >
                                        Unlist
                                    </Button>
                                ) : (
                                    <Button
                                        variant="gold"
                                        size="sm"
                                        className="flex-1 xs:flex-none"
                                        leftIcon={<Tag className="w-4 h-4" />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onList?.(nft);
                                        }}
                                    >
                                        List
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 xs:flex-none"
                                    leftIcon={<Send className="w-4 h-4" />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTransfer?.(nft);
                                    }}
                                >
                                    Transfer
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card variant="default" hover padding="none" className="group cursor-pointer overflow-hidden touch-manipulation active:scale-[0.98] transition-all duration-200" onClick={() => navigate(`/marketplace/nft/${nft.id}`)}>
            <div className="relative aspect-square overflow-hidden bg-theme-elevated">
                <img
                    src={nft.artwork?.primaryImageUrl || '/placeholder-nft.jpg'}
                    alt={nft.artwork?.title || 'Artwork'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                />
                <Badge
                    variant={nft.isListed ? 'success' : 'default'}
                    className="absolute top-3 left-3 shadow-md"
                >
                    {nft.isListed ? 'Listed' : nft.status}
                </Badge>
                <Badge variant="gold" className="absolute top-3 right-3 flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3" />
                    PoA
                </Badge>
                {/* Desktop Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                        {isOwned && (
                            <>
                                {nft.isListed ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-white border-white/50"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUnlist?.(nft.id);
                                        }}
                                    >
                                        Unlist
                                    </Button>
                                ) : (
                                    <Button
                                        variant="gold"
                                        size="sm"
                                        className="flex-1"
                                        leftIcon={<Tag className="w-4 h-4" />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onList?.(nft);
                                        }}
                                    >
                                        List
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTransfer?.(nft);
                                    }}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-3 sm:p-4">
                <h3 className="font-medium text-theme-text truncate group-hover:text-gold transition-colors text-sm sm:text-base">
                    {nft.artwork?.title || 'Untitled'}
                </h3>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-theme-border">
                    <Badge variant="default" className="text-[10px] sm:text-xs scale-90 sm:scale-100 origin-left">{nft.blockchain || 'SOL'}</Badge>
                    {nft.isListed && (
                        <p className="font-mono font-bold text-gold text-sm sm:text-base">
                            {nft.listingPrice} {nft.currency || 'SOL'}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MyNFTsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabValue>('owned');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [, setSelectedNFT] = useState<any>(null);
    const [, setShowListModal] = useState(false);
    const [, setShowTransferModal] = useState(false);

    // Tab configuration
    const tabs = [
        { id: 'owned', label: 'Owned', icon: <Wallet className="w-4 h-4" /> },
        { id: 'created', label: 'Created', icon: <Sparkles className="w-4 h-4" /> },
    ];

    // Queries
    const { data: ownedData, isLoading: ownedLoading } = useOwnedNFTs();
    const { data: createdData, isLoading: createdLoading } = useCreatedNFTs();

    // Mutations
    const unlistNFT = useUnlistNFT();

    const ownedNFTs = ownedData?.data || [];
    const createdNFTs = createdData?.data || [];
    const isLoading = activeTab === 'owned' ? ownedLoading : createdLoading;
    const currentNFTs = activeTab === 'owned' ? ownedNFTs : createdNFTs;

    // Stats
    const totalOwned = ownedNFTs.length;
    const totalCreated = createdNFTs.length;
    const totalListed = ownedNFTs.filter((n: any) => n.isListed).length;
    const totalValue = ownedNFTs.reduce((sum: number, n: any) => sum + (n.listingPrice || n.price || 0), 0);

    const handleList = (nft: any) => {
        setSelectedNFT(nft);
        setShowListModal(true);
    };

    const handleUnlist = (nftId: string) => {
        unlistNFT.mutate(nftId);
    };

    const handleTransfer = (nft: any) => {
        setSelectedNFT(nft);
        setShowTransferModal(true);
    };

    return (
        <PageContainer
            title="My Arts"
            subtitle="Manage your digital art collection"
            actions={
                <Button
                    variant="gold"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => navigate('/dashboard/marketplace')}
                >
                    <span className="hidden sm:inline">Browse Marketplace</span>
                    <span className="sm:hidden">Browse</span>
                </Button>
            }
        >
            {/* Stats */}
            <StatsGrid>
                <Card variant="elevated">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-500/10">
                            <Wallet className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm text-theme-muted">Owned</p>
                            <p className="text-2xl font-bold text-theme-text">{totalOwned}</p>
                        </div>
                    </div>
                </Card>
                <Card variant="elevated">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-theme-muted">Created</p>
                            <p className="text-2xl font-bold text-theme-text">{totalCreated}</p>
                        </div>
                    </div>
                </Card>
                <Card variant="elevated">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/10">
                            <Tag className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-theme-muted">Listed</p>
                            <p className="text-2xl font-bold text-theme-text">{totalListed}</p>
                        </div>
                    </div>
                </Card>
                <Card variant="elevated">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gold/10">
                            <Eye className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-sm text-theme-muted">Total Value</p>
                            <p className="text-2xl font-bold text-gold">{totalValue.toFixed(2)} SOL</p>
                        </div>
                    </div>
                </Card>
            </StatsGrid>

            {/* Tabs & View Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <Tabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={(tabId) => setActiveTab(tabId as TabValue)}
                    variant="pills"
                />
                <div className="flex items-center gap-1">
                    <Button
                        variant={viewMode === 'grid' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* NFT Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : currentNFTs.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <Sparkles className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">
                        {activeTab === 'owned' ? 'No Arts Owned Yet' : 'No Arts Created Yet'}
                    </h3>
                    <p className="text-theme-muted mb-4 max-w-md mx-auto">
                        {activeTab === 'owned'
                            ? 'Start your collection by collecting artworks from the marketplace.'
                            : 'You have not created any artworks yet.'}
                    </p>
                    {activeTab === 'owned' && (
                        <Button
                            variant="gold"
                            onClick={() => navigate('/dashboard/marketplace')}
                        >
                            Browse Marketplace
                        </Button>
                    )}
                </Card>
            ) : (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                    : "flex flex-col gap-4"
                }>
                    {currentNFTs.map((nft: any) => (
                        <NFTCard
                            key={nft.id}
                            nft={nft}
                            viewMode={viewMode}
                            isOwned={activeTab === 'owned'}
                            onList={handleList}
                            onUnlist={handleUnlist}
                            onTransfer={handleTransfer}
                        />
                    ))}
                </div>
            )}

            {/* Blockchain Info */}
            <Card variant="elevated" className="mt-6 bg-gold/5 border-gold/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <ExternalLink className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-theme-text">Blockchain Explorer</h4>
                            <p className="text-sm text-theme-muted mt-1">
                                View your artwork transactions and ownership history on the blockchain explorer.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}

export default MyNFTsPage;
