/**
 * Tabs Component - Tab navigation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
    disabled?: boolean;
}

interface TabsProps {
    tabs: Tab[];
    activeTab?: string;
    onChange?: (tabId: string) => void;
    variant?: 'underline' | 'pills' | 'enclosed';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    className?: string;
}

export function Tabs({
    tabs,
    activeTab: controlledActiveTab,
    onChange,
    variant = 'underline',
    size = 'md',
    fullWidth = false,
    className = '',
}: TabsProps) {
    const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);
    const activeTab = controlledActiveTab ?? internalActiveTab;

    const handleTabClick = (tabId: string) => {
        setInternalActiveTab(tabId);
        onChange?.(tabId);
    };

    const sizeStyles = {
        sm: 'text-sm px-3 py-1.5 gap-1.5',
        md: 'text-sm px-4 py-2 gap-2',
        lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    const variantContainerStyles = {
        underline: 'border-b border-theme-border',
        pills: 'bg-theme-elevated p-1 rounded-xl',
        enclosed: 'border border-theme-border rounded-xl p-1',
    };

    return (
        <div className={`${variantContainerStyles[variant]} ${className}`}>
            <div className={`flex ${fullWidth ? '' : 'inline-flex'}`}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && handleTabClick(tab.id)}
                            disabled={tab.disabled}
                            className={`
                relative flex items-center justify-center
                font-medium transition-all
                ${sizeStyles[size]}
                ${fullWidth ? 'flex-1' : ''}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${variant === 'underline'
                                    ? isActive
                                        ? 'text-gold'
                                        : 'text-theme-muted hover:text-theme-text'
                                    : variant === 'pills' || variant === 'enclosed'
                                        ? isActive
                                            ? 'text-gold'
                                            : 'text-theme-muted hover:text-theme-text'
                                        : ''
                                }
              `}
                        >
                            {/* Active indicator */}
                            {isActive && variant === 'underline' && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold"
                                    initial={false}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                />
                            )}

                            {isActive && (variant === 'pills' || variant === 'enclosed') && (
                                <motion.div
                                    layoutId="activeTabPill"
                                    className="absolute inset-0 bg-gold/10 border border-gold/20 rounded-lg"
                                    initial={false}
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                />
                            )}

                            <span className="relative flex items-center gap-2">
                                {tab.icon}
                                {tab.label}
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-gold/20 text-gold rounded-full">
                                        {tab.badge > 99 ? '99+' : tab.badge}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Tab Panel
interface TabPanelProps {
    children: React.ReactNode;
    value: string;
    activeTab: string;
    className?: string;
}

export function TabPanel({ children, value, activeTab, className = '' }: TabPanelProps) {
    if (value !== activeTab) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export default Tabs;
