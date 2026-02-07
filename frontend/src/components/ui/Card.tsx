/**
 * Card Component - Elevated container with hover effects
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

interface CardProps extends HTMLMotionProps<'div'> {
    variant?: CardVariant;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles: Record<CardVariant, string> = {
    default: 'bg-theme-surface border border-theme-border',
    elevated: 'bg-theme-elevated shadow-xl shadow-black/5 border border-theme-border',
    outlined: 'bg-transparent border-2 border-theme-border',
    glass: 'bg-theme-glass/50 backdrop-blur-xl border border-theme-glass-border',
};

const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
};

export function Card({
    variant = 'default',
    hover = false,
    padding = 'md',
    children,
    className = '',
    ...props
}: CardProps) {
    return (
        <motion.div
            whileHover={hover ? { y: -2, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)' } : {}}
            className={`
        rounded-2xl overflow-hidden
        transition-all duration-300
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </motion.div>
    );
}

// Card Header
interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
    return (
        <div className={`flex items-start justify-between mb-4 ${className}`}>
            <div>
                <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-theme-muted mt-0.5">{subtitle}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// Card Content
export function CardContent({
    children,
    className = ''
}: { children: React.ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}

// Card Footer
export function CardFooter({
    children,
    className = ''
}: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`mt-4 pt-4 border-t border-theme-border ${className}`}>
            {children}
        </div>
    );
}

export default Card;
