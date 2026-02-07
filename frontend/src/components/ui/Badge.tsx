/**
 * Badge Component - Status badges and tags
 */

import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    removable?: boolean;
    onRemove?: () => void;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-theme-elevated text-theme-text border-theme-border',
    primary: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    info: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    gold: 'bg-gold/10 text-gold border-gold/20',
};

const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-theme-muted',
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-cyan-500',
    gold: 'bg-gold',
};

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
};

export function Badge({
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    removable = false,
    onRemove,
    className = '',
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
            )}
            {children}
            {removable && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                    }}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            )}
        </span>
    );
}

// Status Badge - Common presets
interface StatusBadgeProps {
    status: 'active' | 'inactive' | 'pending' | 'verified' | 'premium';
    size?: BadgeSize;
}

const statusConfig = {
    active: { variant: 'success' as BadgeVariant, label: 'Active' },
    inactive: { variant: 'default' as BadgeVariant, label: 'Inactive' },
    pending: { variant: 'warning' as BadgeVariant, label: 'Pending' },
    verified: { variant: 'primary' as BadgeVariant, label: 'Verified' },
    premium: { variant: 'gold' as BadgeVariant, label: 'Premium' },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const config = statusConfig[status];
    return (
        <Badge variant={config.variant} size={size} dot>
            {config.label}
        </Badge>
    );
}

export default Badge;
