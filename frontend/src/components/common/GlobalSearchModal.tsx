/**
 * Global Search Modal Component
 * 
 * Mobile-first premium search experience that searches across:
 * - Cities from CITY_WHITELIST (local, instant)
 * - Museums from backend API (debounced)
 * - Artworks from backend API (debounced)
 * 
 * Best practices:
 * - Debounced API calls (400ms) to avoid excessive requests
 * - Local city search is instant (no debounce needed)
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Mobile-optimized: full-screen on mobile, centered modal on desktop
 * - Accessible: aria-labels, role="dialog", focus management
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Building2, User, Package, Image, Compass, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useNavigate } from 'react-router-dom';
import { CITY_WHITELIST } from '../../features/gallery/data/citiesRegistry';
import { museumService } from '../../services/museumService';

// ── Types ──

interface SearchResult {
    id: string;
    type: 'city' | 'museum' | 'artwork' | 'artist' | 'collection';
    title: string;
    subtitle?: string;
    image?: string;
    url: string;
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
    city: { icon: MapPin, color: 'bg-amber-500/10 text-amber-500', label: 'City' },
    museum: { icon: Building2, color: 'bg-blue-500/10 text-blue-500', label: 'Museum' },
    artwork: { icon: Image, color: 'bg-purple-500/10 text-purple-500', label: 'Artwork' },
    artist: { icon: User, color: 'bg-green-500/10 text-green-500', label: 'Artist' },
    collection: { icon: Package, color: 'bg-orange-500/10 text-orange-500', label: 'Collection' },
};

// ── City Search (instant, local) ──

const CITY_SEARCH_DATA: SearchResult[] = Object.entries(CITY_WHITELIST).map(([id, meta]) => ({
    id: `city-${id}`,
    type: 'city' as const,
    title: meta.name,
    subtitle: meta.description?.substring(0, 60) + (meta.description?.length > 60 ? '...' : ''),
    image: meta.image,
    url: `/gallery/city/${id}`,
}));

// ── Debounce hook ──

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

// ── Component ──

export function GlobalSearchModal() {
    const { searchOpen, setSearchOpen, searchQuery, setSearchQuery } = useUIStore();
    const [localResults, setLocalResults] = useState<SearchResult[]>([]);
    const [apiResults, setApiResults] = useState<SearchResult[]>([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const debouncedQuery = useDebounce(searchQuery, 400);

    // All results combined: cities first, then API results
    const allResults = useMemo(() => {
        const combined = [...localResults, ...apiResults];
        // De-duplicate by url
        const seen = new Set<string>();
        return combined.filter((r) => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
        });
    }, [localResults, apiResults]);

    // Focus input when modal opens
    useEffect(() => {
        if (searchOpen) {
            // Small delay for mobile keyboard focus
            const t = setTimeout(() => inputRef.current?.focus(), 100);
            setSelectedIndex(0);
            return () => clearTimeout(t);
        } else {
            // Reset state on close
            setLocalResults([]);
            setApiResults([]);
            setApiLoading(false);
        }
    }, [searchOpen]);

    // Keyboard shortcut: Cmd/Ctrl+K
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

    // ── Instant local city search ──
    useEffect(() => {
        if (!searchQuery.trim()) {
            setLocalResults([]);
            return;
        }
        const q = searchQuery.toLowerCase();
        const cityMatches = CITY_SEARCH_DATA.filter((c) => {
            const titleMatch = c.title.toLowerCase().includes(q);
            const subtitleMatch = c.subtitle?.toLowerCase().includes(q) || false;
            return titleMatch || subtitleMatch;
        });
        setLocalResults(cityMatches.slice(0, 5));
    }, [searchQuery]);

    // ── Debounced API search (museums) ──
    useEffect(() => {
        if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
            setApiResults([]);
            setApiLoading(false);
            return;
        }

        let cancelled = false;
        setApiLoading(true);

        (async () => {
            try {
                const response = await museumService.getMuseums({
                    search: debouncedQuery,
                    limit: 5,
                });
                if (cancelled) return;

                const museumResults: SearchResult[] = (response.data || []).map((m: any) => ({
                    id: `museum-${m.id}`,
                    type: 'museum' as const,
                    title: m.name,
                    subtitle: m.address?.city || 'Indonesia',
                    image: m.images?.[0] || undefined,
                    url: `/gallery/museum/${m.slug || m.id}`,
                }));
                setApiResults(museumResults);
            } catch (err) {
                if (!cancelled) {
                    console.warn('[GlobalSearch] API search failed:', err);
                    setApiResults([]);
                }
            } finally {
                if (!cancelled) setApiLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [debouncedQuery]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [allResults.length]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current && allResults.length > 0) {
            const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    const handleSelect = useCallback((result: SearchResult) => {
        navigate(result.url);
        setSearchOpen(false);
        setSearchQuery('');
    }, [navigate, setSearchOpen, setSearchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && allResults[selectedIndex]) {
            e.preventDefault();
            handleSelect(allResults[selectedIndex]);
        }
    };

    const handleClose = useCallback(() => {
        setSearchOpen(false);
        setSearchQuery('');
    }, [setSearchOpen, setSearchQuery]);

    const hasQuery = searchQuery.trim().length > 0;
    const showLoading = apiLoading && hasQuery;
    const showNoResults = hasQuery && !apiLoading && allResults.length === 0;

    return (
        <AnimatePresence>
            {searchOpen && (
                /* Unified backdrop+container: click anywhere outside modal = close */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleClose}
                    className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex flex-col items-center pt-[60px] md:pt-[12vh] px-4 md:px-6"
                    style={{ touchAction: 'none' }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        role="dialog"
                        aria-label="Search"
                        className={`
                            w-full max-w-[340px] md:max-w-lg
                            bg-white dark:bg-[#181818]
                            border border-black/8 dark:border-white/10
                            rounded-2xl
                            shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)] dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)]
                            overflow-hidden
                            flex flex-col max-h-[70vh] md:max-h-[65vh]
                        `}
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-2.5 px-3.5 md:px-4 py-3 border-b border-black/5 dark:border-white/8">
                            <Search className="w-4.5 h-4.5 text-theme-muted flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search cities, museums..."
                                className="flex-1 bg-transparent text-theme-text text-[15px] md:text-base placeholder:text-theme-muted/50 focus:outline-none min-w-0"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                            {hasQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="p-1 rounded-md text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors flex-shrink-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="p-1.5 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-elevated/60 transition-colors flex-shrink-0"
                                aria-label="Close search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                            {/* Results */}
                            <div ref={resultsRef} className="flex-1 overflow-y-auto overscroll-contain">
                                {/* Seamless empty state — just a hint */}
                                {!hasQuery && (
                                    <div className="py-10 text-center">
                                        <Search className="w-6 h-6 mx-auto mb-2 text-theme-muted/20" />
                                        <p className="text-[13px] text-theme-muted/50">Type to search cities, museums...</p>
                                    </div>
                                )}

                                {/* Loading indicator */}
                                {showLoading && localResults.length === 0 && (
                                    <div className="py-8 flex flex-col items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                                        <p className="text-[11px] text-theme-muted mt-2.5">Searching...</p>
                                    </div>
                                )}

                                {/* Results list */}
                                {allResults.length > 0 && (
                                    <div className="py-1">
                                        {/* Group: Cities */}
                                        {localResults.length > 0 && (
                                            <>
                                                <p className="px-4 md:px-5 pt-2 pb-1 text-[10px] font-bold text-theme-muted uppercase tracking-widest">
                                                    Cities
                                                </p>
                                                {localResults.map((result, idx) => {
                                                    const globalIdx = idx;
                                                    const config = typeConfig[result.type];
                                                    const Icon = config.icon;
                                                    return (
                                                        <button
                                                            key={result.id}
                                                            data-index={globalIdx}
                                                            onClick={() => handleSelect(result)}
                                                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                            className={`
                                                                w-full flex items-center gap-3 px-4 md:px-5 py-2.5 text-left
                                                                transition-colors active:bg-theme-elevated
                                                                ${globalIdx === selectedIndex ? 'bg-gold/[0.06] dark:bg-gold/[0.08]' : 'hover:bg-theme-elevated/50'}
                                                            `}
                                                        >
                                                            {result.image ? (
                                                                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-theme-elevated">
                                                                    <img src={result.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                                </div>
                                                            ) : (
                                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-theme-text text-[13px] truncate">
                                                                    {result.title}
                                                                </p>
                                                                {result.subtitle && (
                                                                    <p className="text-[11px] text-theme-muted truncate mt-0.5 leading-snug">
                                                                        {result.subtitle}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-theme-subtle/40 flex-shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {/* Group: Museums */}
                                        {apiResults.length > 0 && (
                                            <>
                                                <p className="px-4 md:px-5 pt-3 pb-1 text-[10px] font-bold text-theme-muted uppercase tracking-widest">
                                                    Museums & Galleries
                                                </p>
                                                {apiResults.map((result, idx) => {
                                                    const globalIdx = localResults.length + idx;
                                                    const config = typeConfig[result.type];
                                                    const Icon = config.icon;
                                                    return (
                                                        <button
                                                            key={result.id}
                                                            data-index={globalIdx}
                                                            onClick={() => handleSelect(result)}
                                                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                            className={`
                                                                w-full flex items-center gap-3 px-4 md:px-5 py-2.5 text-left
                                                                transition-colors active:bg-theme-elevated
                                                                ${globalIdx === selectedIndex ? 'bg-gold/[0.06] dark:bg-gold/[0.08]' : 'hover:bg-theme-elevated/50'}
                                                            `}
                                                        >
                                                            {result.image ? (
                                                                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-theme-elevated">
                                                                    <img src={result.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                                </div>
                                                            ) : (
                                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-theme-text text-[13px] truncate">
                                                                    {result.title}
                                                                </p>
                                                                {result.subtitle && (
                                                                    <p className="text-[11px] text-theme-muted truncate mt-0.5 leading-snug">
                                                                        {result.subtitle}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-theme-subtle/40 flex-shrink-0" />
                                                        </button>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {/* Inline loading for API while local results shown */}
                                        {showLoading && localResults.length > 0 && (
                                            <div className="px-5 py-2.5 flex items-center gap-2 text-theme-muted">
                                                <div className="w-3.5 h-3.5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                                                <span className="text-[11px]">Searching museums...</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* No results */}
                                {showNoResults && (
                                    <div className="py-10 px-6 text-center">
                                        <Compass className="w-8 h-8 mx-auto mb-3 text-theme-muted/20" />
                                        <p className="text-[13px] font-medium text-theme-text">
                                            No results for &ldquo;{searchQuery}&rdquo;
                                        </p>
                                        <p className="text-[11px] text-theme-muted mt-1 max-w-[240px] mx-auto">
                                            Try a city name, museum, or heritage site
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer — minimal */}
                            <div className="px-4 py-2 border-t border-black/5 dark:border-white/8 flex items-center justify-between text-[10px] text-theme-muted/60">
                                <div className="hidden md:flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-theme-elevated rounded font-bold">↑↓</kbd>
                                        navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-theme-elevated rounded font-bold">Enter</kbd>
                                        select
                                    </span>
                                </div>
                                <span className="md:hidden text-theme-muted/40 text-[10px]">Tap result to explore</span>
                                <span className="hidden md:flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-theme-elevated rounded font-bold">Esc</kbd>
                                    close
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
            )}
        </AnimatePresence>
    );
}

export default GlobalSearchModal;
