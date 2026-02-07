import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreVertical, Edit2, Trash2, Lock, FolderHeart, Image, Loader2 } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Badge, Modal, Input, Textarea } from '../../../components/ui';
import { useToast } from '../../../stores/useNotificationStore';
import { useMyCollections, useCreateCollection } from '../../../hooks/useCollections';
import { Collection } from '../../../services/collectionsService';
import { extractArray } from '../../../lib/utils';

function CollectionCard({
    collection,
    onEdit,
    onDelete
}: {
    collection: Collection;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Card variant="elevated" hover padding="none" className="group overflow-hidden">
                <div className="relative aspect-[3/2]">
                    <div className="w-full h-full bg-theme-elevated flex items-center justify-center">
                        <FolderHeart className="w-12 h-12 text-theme-muted" />
                    </div>

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {/* 
                         * TODO: Add isPublic to backend schema 
                         * For now assume all are private or check description
                         */}
                        <Badge variant="default" size="sm">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                        </Badge>

                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1.5 bg-black/40 backdrop-blur-sm text-white rounded-lg hover:bg-black/60 transition-colors"
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
                                            onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-text hover:bg-theme-elevated transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-theme-elevated transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-semibold text-white text-lg">{collection.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Image className="w-3.5 h-3.5 text-white/70" />
                            <span className="text-sm text-white/70">{collection.artworkCount || 0} artworks</span>
                        </div>
                    </div>
                </div>

                {collection.description && (
                    <div className="p-4">
                        <p className="text-sm text-theme-muted line-clamp-2">{collection.description}</p>
                    </div>
                )}
            </Card>
        </motion.div>
    );
}

export function MyCollections() {
    const { data: collectionsData, isLoading } = useMyCollections();
    const createMutation = useCreateCollection();

    // Safely extract collections array from API response
    const collections = extractArray<Collection>(collectionsData);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', description: '' });
    const toast = useToast();

    const handleCreate = async () => {
        if (!newCollection.name.trim()) {
            toast.error('Name required', 'Please enter a collection name');
            return;
        }

        try {
            await createMutation.mutateAsync(newCollection);
            setShowCreateModal(false);
            setNewCollection({ name: '', description: '' });
        } catch (error) {
            // Handled by mutation hook
        }
    };

    const handleDelete = (_id: string) => {
        // TODO: Implement delete in service/hook
        toast.info('Delete feature coming soon');
    };

    return (
        <PageContainer
            title="My Collections"
            description={!isLoading ? `${collections?.length || 0} collections` : 'Loading...'}
            actions={
                <Button
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowCreateModal(true)}
                >
                    New Collection
                </Button>
            }
        >
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : !collections || collections.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <FolderHeart className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-theme-text mb-2">No collections yet</h3>
                    <p className="text-theme-muted mb-6 max-w-sm mx-auto">
                        Create your first collection to organize and showcase your favorite artworks
                    </p>
                    <Button
                        variant="gold"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowCreateModal(true)}
                    >
                        Create Collection
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map((collection) => (
                        <CollectionCard
                            key={collection.id}
                            collection={collection}
                            onEdit={() => toast.info('Edit feature coming soon')}
                            onDelete={() => handleDelete(collection.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Collection Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create New Collection"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreate}
                            isLoading={createMutation.isPending}
                        >
                            Create Collection
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Collection Name"
                        value={newCollection.name}
                        onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                        placeholder="My Art Collection"
                    />
                    <Textarea
                        label="Description (Optional)"
                        value={newCollection.description}
                        onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                        placeholder="Describe your collection..."
                    />
                </div>
            </Modal>
        </PageContainer>
    );
}

export default MyCollections;
