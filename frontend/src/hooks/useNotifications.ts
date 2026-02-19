import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, Notification } from '../services/notificationService';
import { useAuthStore } from '../stores/useAuthStore';

export function useNotifications(limit = 10) {
    const { isAuthenticated } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const fetchNotifications = useCallback(async (isBackground = false) => {
        if (!isAuthenticated) return;

        if (!isBackground) setIsLoading(true);
        try {
            const [listRes, countRes] = await Promise.all([
                notificationService.getAll(1, limit),
                notificationService.getUnreadCount()
            ]);

            // Ensure data is an array and map snake_case to camelCase
            const rawData = listRes.data || [];
            const mappedData = Array.isArray(rawData) ? rawData.map((n: any) => ({
                id: n.id,
                userId: n.user_id,
                type: n.type,
                title: n.title,
                message: n.message,
                referenceId: n.reference_id,
                referenceType: n.reference_type,
                isRead: n.is_read,
                createdAt: n.created_at
            })) : [];

            setNotifications(mappedData);
            setUnreadCount(countRes.count);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch notifications:', err);
            // Don't show error for background polling
            if (!isBackground) setError('Failed to load notifications');
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    }, [isAuthenticated, limit]);

    const markAsRead = useCallback(async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => (prev || []).map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await notificationService.markAsRead(id);
        } catch (err) {
            console.error('Failed to mark as read:', err);
            // Revert on error would go here, but usually fine to just refetch later
            fetchNotifications(true);
        }
    }, [fetchNotifications]);

    const markAllAsRead = useCallback(async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);

            await notificationService.markAllAsRead();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
            fetchNotifications(true);
        }
    }, [fetchNotifications]);

    const deleteNotification = useCallback(async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id));

            await notificationService.delete(id);
        } catch (err) {
            console.error('Failed to delete notification:', err);
            fetchNotifications(true);
        }
    }, [fetchNotifications]);

    // Initial fetch and polling
    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();

            // Poll every 30 seconds
            pollingRef.current = setInterval(() => {
                fetchNotifications(true);
            }, 30000);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [isAuthenticated, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        refresh: () => fetchNotifications(false),
        markAsRead,
        markAllAsRead,
        deleteNotification
    };
}
