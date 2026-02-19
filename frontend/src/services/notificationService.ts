/**
 * Notification Service
 * Handles API calls for user notifications
 */

import api from '../lib/api';

export interface Notification {
    id: string;
    userId: string;
    type: 'system' | 'artwork' | 'nft' | 'forum' | 'follow' | 'sale' | 'alert';
    title: string;
    message?: string;
    referenceId?: string;
    referenceType?: string;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationsResponse {
    data: Notification[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const notificationService = {
    /**
     * Get user notifications
     */
    getAll: async (page = 1, limit = 20, unreadOnly = false): Promise<NotificationsResponse> => {
        const response = await api.get('/notifications', {
            params: { page, limit, unreadOnly }
        });
        return response.data;
    },

    /**
     * Get unread count
     */
    getUnreadCount: async (): Promise<{ count: number }> => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    /**
     * Mark a notification as read
     */
    markAsRead: async (id: string): Promise<Notification> => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<{ success: boolean }> => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },

    /**
     * Delete a notification
     */
    delete: async (id: string): Promise<{ success: boolean }> => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    }
};
