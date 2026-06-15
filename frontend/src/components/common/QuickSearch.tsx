/**
 * Quick Search Component
 * Integrated search for Artworks and Museums
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image as ImageIcon, X, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ROUTES } from '../../lib/constants';
import { artworkService } from '../../services/artworkService';
import { useQuery } from '@tanstack/react-query';

// Inline debounce hook if missing
function useDebounceValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export function QuickSearch() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounceValue(query, 500);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Artworks
    const { data: artworkResults, isLoading: artworksLoading } = useQuery({
        queryKey: ['search', 'artworks', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return [];
            const response = await artworkService.getArtworks({ search: debouncedQuery, limit: 3 });
            return response.data;
        },
        enabled: debouncedQuery.length > 2,
    });

    const isLoading = artworksLoading;
    const hasResults = (artworkResults?.length || 0) > 0;

    return (
        <div ref={containerRef} className="relative z-50 w-full max-w-sm ml-auto mr-4 hidden md:block">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search artworks..."
                    className="w-full pl-10 pr-4 py-2 bg-theme-surface/50 border border-theme-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setIsOpen(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (query.length > 2) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 left-0 mt-2 bg-theme-elevated border border-theme-border rounded-xl shadow-2xl overflow-hidden"
                    >
                        {isLoading ? (
                            <div className="p-4 text-center text-theme-muted">
                                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                                <span>Searching...</span>
                            </div>
                        ) : hasResults ? (
                            <div className="py-2">
                                <div className="px-3 py-1.5 text-xs font-medium text-theme-muted uppercase tracking-wider">
                                    Artworks
                                </div>
                                {artworkResults?.map((art) => (
                                    <button
                                        key={art.id}
                                        onClick={() => {
                                            navigate(ROUTES.GALLERY_ARTWORK.replace(':id', art.id));
                                            setIsOpen(false);
                                        }}
                                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-theme-surface transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded bg-theme-surface overflow-hidden flex-shrink-0">
                                            {art.images[0] ? (
                                                <img src={art.images[0].url} alt={art.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-4 h-4 m-auto mt-2 text-theme-muted" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-theme-text truncate">{art.title}</p>
                                            <p className="text-xs text-theme-muted truncate">{art.artist?.displayName || 'Unknown Artist'}</p>
                                        </div>
                                        <ArrowRight className="w-3 h-3 text-theme-muted opacity-0 group-hover:opacity-100" />
                                    </button>
                                ))}
                                <div className="border-t border-theme-border mt-2 pt-2 px-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        fullWidth
                                        onClick={() => {
                                            navigate(ROUTES.GALLERY);
                                            setIsOpen(false);
                                        }}
                                        className="text-xs justify-between"
                                    >
                                        View all results <ArrowRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-theme-muted">
                                <p>No results found for "{query}"</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
