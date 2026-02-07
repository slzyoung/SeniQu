/**
 * Notification Store - Toast Notifications
 */

import { create } from 'zustand';
import { Toast } from '../lib/types';

interface NotificationState {
    toasts: Toast[];

    // Actions
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearToasts: () => void;

    // Convenience methods
    success: (title: string, message?: string) => string;
    error: (title: string, message?: string) => string;
    warning: (title: string, message?: string) => string;
    info: (title: string, message?: string) => string;
}

let toastId = 0;
const generateId = () => `toast-${++toastId}`;

export const useNotificationStore = create<NotificationState>((set, get) => ({
    toasts: [],

    addToast: (toast) => {
        const id = generateId();
        const duration = toast.duration ?? 5000;

        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                get().removeToast(id);
            }, duration);
        }

        return id;
    },

    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),

    clearToasts: () => set({ toasts: [] }),

    success: (title, message) => get().addToast({ type: 'success', title, message }),
    error: (title, message) => get().addToast({ type: 'error', title, message }),
    warning: (title, message) => get().addToast({ type: 'warning', title, message }),
    info: (title, message) => get().addToast({ type: 'info', title, message }),
}));

// Hook for easy access
export function useToast() {
    const { success, error, warning, info, removeToast } = useNotificationStore();
    return { success, error, warning, info, dismiss: removeToast };
}
