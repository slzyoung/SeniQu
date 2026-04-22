import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCollections, useCreateCollection } from '../../../../hooks/useCollections';
import { extractArray } from '../../../../lib/utils';
import {
    Loader2
} from 'lucide-react';
import './MyCollectionsPage.css';
import { Modal, Input, Textarea, Button } from '../../../../components/ui';
import { useToast } from '../../../../stores/useNotificationStore';

// Mockup Data
const MOCK_PHOTOS = [
    { id: 1, type: 'tall', img: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80' },
    { id: 2, type: 'short', img: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&q=80' },
    { id: 3, type: 'short', img: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&q=80' },
    { id: 4, type: 'tall', img: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=600&q=80' }
];

export function MyCollections() {
    const navigate = useNavigate();
    const { data: collectionsData, isLoading } = useMyCollections();
    const createMutation = useCreateCollection();
    const toast = useToast();
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', description: '' });

    const collections = extractArray<any>(collectionsData) || [];

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
            // Handled
        }
    };

    return (
        <div className="mc-page">
            <div className="mc-container">


                {/* Photos Section */}
                <div className="mc-section mc-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="mc-section-header">
                        <h2 className="mc-section-title">Photos</h2>
                        <span className="mc-section-more">More</span>
                    </div>
                    <div className="mc-grid">
                        <div className="mc-col">
                            {MOCK_PHOTOS.slice(0, 2).map((p) => (
                                <div key={p.id} className={`mc-photo-card ${p.type === 'tall' ? 'mc-photo-card--tall' : 'mc-photo-card--short'}`}>
                                    <img src={p.img} alt="Photo" />
                                </div>
                            ))}
                        </div>
                        <div className="mc-col">
                            {MOCK_PHOTOS.slice(2, 4).map((p) => (
                                <div key={p.id} className={`mc-photo-card ${p.type === 'tall' ? 'mc-photo-card--tall' : 'mc-photo-card--short'}`}>
                                    <img src={p.img} alt="Photo" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collections Section */}
                <div className="mc-section mc-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="mc-section-header">
                        <h2 className="mc-section-title">Collections</h2>
                        <span className="mc-section-more">All</span>
                    </div>
                    
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                            <Loader2 className="animate-spin" style={{ color: 'var(--mc-primary)' }} />
                        </div>
                    ) : collections.length > 0 ? (
                        <div className="mc-h-scroll">
                            {collections.map((col: any, i: number) => (
                                <div key={col.id} className="mc-collection-card">
                                    <img 
                                        src={MOCK_PHOTOS[i % MOCK_PHOTOS.length].img} 
                                        alt={col.name} 
                                    />
                                    <div className="mc-collection-overlay">
                                        <span className="mc-collection-title">{col.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mc-h-scroll">
                            <div className="mc-collection-card" onClick={() => setShowCreateModal(true)}>
                                <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80" alt="Nature" />
                                <div className="mc-collection-overlay">
                                    <span className="mc-collection-title">NATURE</span>
                                </div>
                            </div>
                            <div className="mc-collection-card" onClick={() => setShowCreateModal(true)}>
                                <img src="https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=400&q=80" alt="Animals" />
                                <div className="mc-collection-overlay">
                                    <span className="mc-collection-title">ANIMALS</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Create New Collection"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        </div>
    );
}

export default MyCollections;
