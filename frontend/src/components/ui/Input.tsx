/**
 * Input Component - Form inputs with validation states
 */

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    success?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({
        label,
        error,
        success,
        hint,
        leftIcon,
        rightIcon,
        isPassword = false,
        className = '',
        type,
        ...props
    }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false);

        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        const stateStyles = error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : success
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                : 'border-theme-border focus:border-gold focus:ring-gold/20';

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-theme-text mb-1.5">
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted">
                            {leftIcon}
                        </div>
                    )}

                    <motion.input
                        ref={ref}
                        type={inputType}
                        whileFocus={{ scale: 1.01 }}
                        className={`
              w-full px-4 py-3
              bg-theme-surface text-theme-text
              border rounded-xl
              placeholder:text-theme-muted
              transition-all duration-200
              focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || isPassword ? 'pr-10' : ''}
              ${stateStyles}
              ${className}
            `}
                        {...props}
                    />

                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text transition-colors"
                        >
                            {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    )}

                    {!isPassword && rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted">
                            {rightIcon}
                        </div>
                    )}

                    {(error || success) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {error ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                        </div>
                    )}
                </div>

                {(error || success || hint) && (
                    <p className={`mt-1.5 text-sm ${error ? 'text-red-500' : success ? 'text-green-500' : 'text-theme-muted'
                        }`}>
                        {error || success || hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-theme-text mb-1.5">
                        {label}
                    </label>
                )}

                <textarea
                    ref={ref}
                    className={`
            w-full px-4 py-3 min-h-[120px]
            bg-theme-surface text-theme-text
            border border-theme-border rounded-xl
            placeholder:text-theme-muted
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:border-gold focus:ring-gold/20
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
                    {...props}
                />

                {(error || hint) && (
                    <p className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-theme-muted'}`}>
                        {error || hint}
                    </p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Input;
