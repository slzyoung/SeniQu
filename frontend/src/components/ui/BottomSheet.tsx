/**
 * BottomSheet Component
 * Mobile-friendly modal that slides up from the bottom
 * Includes touch gestures for closing
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** Height as percentage of viewport (0.3 = 30vh, 0.9 = 90vh) */
    height?: number;
    /** Show drag handle indicator */
    showHandle?: boolean;
    /** Close on backdrop click */
    closeOnBackdrop?: boolean;
}

export function BottomSheet({
    isOpen,
    onClose,
    title,
    children,
    height = 0.6,
    showHandle = true,
    closeOnBackdrop = true,
}: BottomSheetProps) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [sheetHeight, setSheetHeight] = useState(0);

    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll when sheet is open
            document.body.style.overflow = 'hidden';
            setSheetHeight(window.innerHeight * height);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, height]);

    const handleDragEnd = (_event: any, info: PanInfo) => {
        // Close if dragged down more than 100px or velocity is high
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={closeOnBackdrop ? onClose : undefined}
                    />

                    {/* Sheet */}
                    <motion.div
                        ref={sheetRef}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        style={{ height: sheetHeight, maxHeight: '90vh' }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-theme-surface rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Handle */}
                        {showHandle && (
                            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                                <div className="w-10 h-1 bg-theme-border rounded-full" />
                            </div>
                        )}

                        {/* Header */}
                        {title && (
                            <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
                                <h2 className="text-lg font-semibold text-theme-text">{title}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 -mr-2 text-theme-muted hover:text-theme-text rounded-full hover:bg-theme-elevated transition-colors touch-manipulation"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                            {children}
                        </div>

                        {/* Safe area for iOS */}
                        <div className="h-safe-area-inset-bottom bg-theme-surface" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default BottomSheet;
