import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Context to share state
interface DropdownContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export const useDropdown = () => {
    const context = useContext(DropdownContext);
    if (!context) throw new Error('useDropdown must be used within a DropdownMenu');
    return context;
};

interface DropdownMenuProps {
    children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownContext.Provider>
    );
}

interface DropdownMenuTriggerProps {
    children: React.ReactElement;
    asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
    const { isOpen, setIsOpen } = useDropdown();
    const triggerRef = useRef<HTMLDivElement>(null);

    // Handle click outside is handled by Content or global listeners mostly,
    // so we keep this component simple for now.

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    if (asChild) {
        return React.cloneElement(children, {
            onClick: handleClick,
            // Merge refs if needed, but for now specific ref handling is simplified
            ref: triggerRef
        } as any);
    }

    return (
        <div ref={triggerRef} onClick={handleClick}>
            {children}
        </div>
    );
}

interface DropdownMenuContentProps {
    children: React.ReactNode;
    align?: 'start' | 'end' | 'center';
    className?: string;
}

export function DropdownMenuContent({ children, align = 'start', className }: DropdownMenuContentProps) {
    const { isOpen, setIsOpen } = useDropdown();
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && contentRef.current && !contentRef.current.contains(event.target as Node)) {
                // Also check if valid trigger click (which is handled by bubbling usually, but safe to close if outside content)
                // We depend on trigger's stopPropagation to prevent immediate re-closing if clicking trigger again
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setIsOpen]);

    const alignmentClasses = {
        start: 'left-0 origin-top-left',
        end: 'right-0 origin-top-right',
        center: 'left-1/2 -translate-x-1/2 origin-top',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={contentRef}
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className={cn(
                        "absolute z-50 mt-2 w-56 rounded-xl bg-theme-elevated border border-theme-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden",
                        alignmentClasses[align],
                        className
                    )}
                >
                    <div className="py-1">
                        {children}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface DropdownMenuItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export function DropdownMenuItem({ children, onClick, className, disabled }: DropdownMenuItemProps) {
    const { setIsOpen } = useDropdown();

    const handleClick = () => {
        if (disabled) return;
        if (onClick) onClick();
        setIsOpen(false);
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                "w-full text-left px-4 py-2 text-sm text-theme-text hover:bg-theme-border/50 transition-colors flex items-center gap-2",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    );
}
