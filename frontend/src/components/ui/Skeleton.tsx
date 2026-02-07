/**
 * Skeleton Component - Loading placeholder
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className = '',
    variant = 'text',
    width,
    height,
    animation = 'pulse',
}: SkeletonProps) {
    const baseClass = 'bg-theme-elevated';

    const animationClass = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer bg-gradient-to-r from-theme-elevated via-theme-surface to-theme-elevated bg-[length:200%_100%]',
        none: '',
    };

    const variantClass = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'text' ? '1em' : undefined),
    };

    return (
        <div
            className={`
        ${baseClass}
        ${animationClass[animation]}
        ${variantClass[variant]}
        ${className}
      `}
            style={style}
        />
    );
}

// Common skeleton patterns
export function SkeletonText({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={14}
                    width={i === lines - 1 ? '60%' : '100%'}
                />
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-5 space-y-4">
            <Skeleton variant="rectangular" height={160} />
            <Skeleton height={20} width="70%" />
            <SkeletonText lines={2} />
            <div className="flex gap-2">
                <Skeleton variant="circular" width={32} height={32} />
                <div className="flex-1 space-y-2">
                    <Skeleton height={14} width="50%" />
                    <Skeleton height={12} width="30%" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
    return <Skeleton variant="circular" width={size} height={size} />;
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 py-3 border-b border-theme-border">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} height={14} className="flex-1" />
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 py-3">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={colIndex} height={14} className="flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Skeleton;
