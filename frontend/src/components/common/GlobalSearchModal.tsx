/**
 * Global Search Modal Component
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Image, Building2, User, Package } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
    id: string;
    type: 'artwork' | 'museum' | 'artist' | 'collection';
    title: string;
    subtitle?: string;
    image?: string;
    url: string;
}

const typeIcons = {
    artwork: Image,
    museum: Building2,
    artist: User,
    collection: Package,
};

const typeColors = {
    artwork: 'bg-purple-500/10 text-purple-500',
    museum: 'bg-blue-500/10 text-blue-500',
    artist: 'bg-green-500/10 text-green-500',
    collection: 'bg-orange-500/10 text-orange-500',
};

export function GlobalSearchModal() {
    const { searchOpen, setSearchOpen, searchQuery, setSearchQuery } = useUIStore();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Focus input when modal opens
    useEffect(() => {
        if (searchOpen) {
            inputRef.current?.focus();
            setSelectedIndex(0);
        }
    }, [searchOpen]);

    // Handle keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(!searchOpen);
            }

            if (e.key === 'Escape' && searchOpen) {
                setSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchOpen, setSearchOpen]);

    // Mock search - replace with actual API call
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        // Simulate API delay
        const timer = setTimeout(() => {
            setResults([
                {
                    id: '1',
                    type: 'artwork',
                    title: 'Starry Night Over Java',
                    subtitle: 'Raden Saleh',
                    url: '/gallery/artwork/1',
                },
                {
                    id: '2',
                    type: 'museum',
                    title: 'Museum Nasional Indonesia',
                    subtitle: 'Jakarta',
                    url: '/gallery/museum/2',
                },
                {
                    id: '3',
                    type: 'artist',
                    title: 'Affandi',
                    subtitle: '250 artworks',
                    url: '/artist/affandi',
                },
            ].filter(r =>
                r.title.toLowerCase().includes(searchQuery.toLowerCase())
            ));
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelect = (result: SearchResult) => {
        navigate(result.url);
        setSearchOpen(false);
        setSearchQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    return (
        <AnimatePresence>
            {searchOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSearchOpen(false)}
                        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[151] flex items-start justify-center pt-[15vh] px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Search Input */}
                            <div className="flex items-center gap-3 p-4 border-b border-theme-border">
                                <Search className="w-5 h-5 text-theme-muted" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search artworks, museums, artists..."
                                    className="flex-1 bg-transparent text-theme-text text-lg placeholder:text-theme-muted focus:outline-none"
                                />
                                <button
                                    onClick={() => setSearchOpen(false)}
                                    className="p-1.5 text-theme-muted hover:text-theme-text transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Results */}
                            <div className="max-h-96 overflow-y-auto">
                                {loading ? (
                                    <div className="p-8 text-center">
                                        <div className="w-6 h-6 mx-auto border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="py-2">
                                        {results.map((result, index) => {
                                            const Icon = typeIcons[result.type];
                                            return (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelect(result)}
                                                    onMouseEnter={() => setSelectedIndex(index)}
                                                    className={`
                            w-full flex items-center gap-4 px-4 py-3 text-left
                            transition-colors
                            ${index === selectedIndex ? 'bg-theme-elevated' : ''}
                          `}
                                                >
                                                    <div className={`p-2 rounded-lg ${typeColors[result.type]}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-theme-text truncate">
                                                            {result.title}
                                                        </p>
                                                        {result.subtitle && (
                                                            <p className="text-sm text-theme-muted truncate">
                                                                {result.subtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : searchQuery ? (
                                    <div className="p-8 text-center text-theme-muted">
                                        No results found for "{searchQuery}"
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-theme-muted">
                                        Start typing to search...
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-theme-border flex items-center justify-between text-xs text-theme-muted">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-theme-elevated rounded">↑↓</kbd>
                                        to navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-theme-elevated rounded">Enter</kbd>
                                        to select
                                    </span>
                                </div>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-theme-elevated rounded">Esc</kbd>
                                    to close
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

export default GlobalSearchModal;
