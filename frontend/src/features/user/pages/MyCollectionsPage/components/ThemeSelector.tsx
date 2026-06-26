/**
 * ThemeSelector — Horizontal scrollable photography theme chips
 * Mobile-first with vibrant accent colors per category
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Mountain, User, Building2, Bug, Landmark, Palette, Search, Plane,
    Moon, UtensilsCrossed, MapPin, Heart, CircleDot, Fish, Shirt, Newspaper, Layers
} from 'lucide-react';

export interface ThemeOption {
    id: string;
    label: string;
    icon: any;
    accent: string;
    emoji: string;
}

export const PHOTO_THEMES: ThemeOption[] = [
    { id: 'all', label: 'All', icon: Layers, accent: '#C9A84C', emoji: '✨' },
    { id: 'landscape', label: 'Landscape', icon: Mountain, accent: '#2D6A4F', emoji: '🏔️' },
    { id: 'portrait', label: 'Portrait', icon: User, accent: '#E76F51', emoji: '👤' },
    { id: 'street', label: 'Street', icon: Building2, accent: '#264653', emoji: '🏙️' },
    { id: 'wildlife', label: 'Wildlife', icon: Bug, accent: '#F4A261', emoji: '🦁' },
    { id: 'architecture', label: 'Architecture', icon: Landmark, accent: '#6C757D', emoji: '🏛️' },
    { id: 'abstract', label: 'Abstract', icon: Palette, accent: '#9B5DE5', emoji: '🎨' },
    { id: 'macro', label: 'Macro', icon: Search, accent: '#00BBF9', emoji: '🔍' },
    { id: 'aerial', label: 'Aerial', icon: Plane, accent: '#00F5D4', emoji: '🛸' },
    { id: 'night', label: 'Night', icon: Moon, accent: '#4A4E69', emoji: '🌙' },
    { id: 'food', label: 'Food', icon: UtensilsCrossed, accent: '#E63946', emoji: '🍜' },
    { id: 'travel', label: 'Travel', icon: MapPin, accent: '#F77F00', emoji: '✈️' },
    { id: 'wedding', label: 'Wedding', icon: Heart, accent: '#FFB4A2', emoji: '💍' },
    { id: 'black-white', label: 'B&W', icon: CircleDot, accent: '#555555', emoji: '⬛' },
    { id: 'underwater', label: 'Underwater', icon: Fish, accent: '#0077B6', emoji: '🐠' },
    { id: 'fashion', label: 'Fashion', icon: Shirt, accent: '#D4A373', emoji: '👗' },
    { id: 'documentary', label: 'Documentary', icon: Newspaper, accent: '#606C38', emoji: '📰' },
];

interface Props {
    activeTheme: string;
    onThemeChange: (theme: string) => void;
}

export function ThemeSelector({ activeTheme, onThemeChange }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
            <div
                ref={scrollRef}
                className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory"
            >
                {PHOTO_THEMES.map((theme) => {
                    const isActive = activeTheme === theme.id;
                    const Icon = theme.icon;
                    return (
                        <motion.button
                            key={theme.id}
                            onClick={() => onThemeChange(theme.id)}
                            whileTap={{ scale: 0.92 }}
                            className={`theme-chip theme-${theme.id} relative flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap border snap-center transition-all duration-300 ${
                                isActive
                                    ? 'text-white border-transparent shadow-lg'
                                    : 'text-theme-muted border-theme-border/50 bg-theme-surface/50 hover:border-theme-border'
                            }`}
                            style={isActive ? {
                                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`,
                                boxShadow: `0 4px 20px ${theme.accent}40`,
                            } : undefined}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeThemeGlow"
                                    className="absolute inset-0 rounded-full -z-10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                            <Icon className="w-3.5 h-3.5" />
                            <span>{theme.label}</span>
                        </motion.button>
                    );
                })}
            </div>
            {/* Fade edges */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none md:hidden" />
        </div>
    );
}
