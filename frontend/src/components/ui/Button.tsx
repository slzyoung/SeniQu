/**
 * Button Component - Multiple variants and sizes
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-gold text-charcoal hover:bg-gold-light active:bg-gold-dim shadow-lg shadow-gold/20',
    secondary: 'bg-theme-elevated text-theme-text border border-theme-border hover:bg-theme-surface',
    ghost: 'bg-transparent text-theme-text hover:bg-theme-elevated/50',
    outline: 'bg-transparent border-2 border-gold text-gold hover:bg-gold/10',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    gold: 'bg-gradient-to-r from-gold to-gold-light text-charcoal hover:opacity-90 shadow-lg shadow-gold/30',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
    xl: 'px-8 py-4 text-lg rounded-2xl gap-3',
    icon: 'p-2.5 rounded-xl aspect-square',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children,
    className = '',
    ...props
}, ref) => {
    const isDisabled = disabled || isLoading;

    return (
        <motion.button
            ref={ref}
            whileHover={isDisabled ? {} : { scale: 1.02 }}
            whileTap={isDisabled ? {} : { scale: 0.98 }}
            disabled={isDisabled}
            className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-theme-bg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                leftIcon
            )}
            {children}
            {!isLoading && rightIcon}
        </motion.button>
    );
});

Button.displayName = 'Button';

export default Button;
