/**
 * Toast Container Component - Display notifications
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { Toast as ToastType } from '../../lib/types';

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const colorMap = {
    success: 'bg-green-500/10 border-green-500/30 text-green-500',
    error: 'bg-red-500/10 border-red-500/30 text-red-500',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
};

const ToastItem = React.forwardRef<HTMLDivElement, { toast: ToastType; onRemove: () => void }>(
    function ToastItem({ toast, onRemove }, ref) {
        const Icon = iconMap[toast.type];

        return (
            <motion.div
                ref={ref}
                layout
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                className={`
        relative flex items-start gap-3 p-4
        bg-theme-surface border rounded-xl shadow-xl
        ${colorMap[toast.type]}
        min-w-[300px] max-w-[400px]
      `}
            >
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />

                <div className="flex-1 min-w-0">
                    <p className="font-medium text-theme-text">{toast.title}</p>
                    {toast.message && (
                        <p className="text-sm text-theme-muted mt-1">{toast.message}</p>
                    )}
                </div>

                <button
                    onClick={onRemove}
                    className="flex-shrink-0 p-1 text-theme-muted hover:text-theme-text transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </motion.div>
        );
    }
);

export function ToastContainer() {
    const { toasts, removeToast } = useNotificationStore();

    return (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

export default ToastContainer;
