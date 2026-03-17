/**
 * Real-time Data Hook
 * WebSocket/SSE connection for live data updates
 * Enterprise-grade with auto-reconnection and error handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { API_BASE_URL } from '../lib/constants';

// ============================================
// TYPES
// ============================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeMessage<T = unknown> {
    type: string;
    channel: string;
    payload: T;
    timestamp: string;
}

export interface RealtimeConfig {
    autoReconnect?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    heartbeatInterval?: number;
}

const DEFAULT_CONFIG: Required<RealtimeConfig> = {
    autoReconnect: true,
    maxRetries: 5,
    retryDelay: 1000,
    heartbeatInterval: 30000,
};

// ============================================
// REALTIME HOOK
// ============================================

export function useRealtime<T = unknown>(
    channel: string,
    config: RealtimeConfig = {}
) {
    const { isAuthenticated } = useAuthStore();
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const retryCountRef = useRef(0);
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (!isAuthenticated) return;

        try {
            setStatus('connecting');
            setError(null);

            const wsUrl = API_BASE_URL.replace('http', 'ws') + '/realtime';
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setStatus('connected');
                retryCountRef.current = 0;

                // Subscribe to channel
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    channel,
                }));

                // Start heartbeat
                if (mergedConfig.heartbeatInterval > 0) {
                    heartbeatRef.current = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, mergedConfig.heartbeatInterval);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const message: RealtimeMessage<T> = JSON.parse(event.data);

                    if (message.type === 'pong') return;

                    if (message.channel === channel) {
                        setData(message.payload);
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onerror = () => {
                setError(new Error('WebSocket connection error'));
                setStatus('error');
            };

            ws.onclose = () => {
                setStatus('disconnected');
                cleanup();

                // Auto-reconnect with exponential backoff
                if (mergedConfig.autoReconnect && retryCountRef.current < mergedConfig.maxRetries) {
                    const delay = mergedConfig.retryDelay * Math.pow(2, retryCountRef.current);
                    retryCountRef.current++;

                    setTimeout(connect, delay);
                }
            };

            wsRef.current = ws;
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Failed to connect'));
            setStatus('error');
        }
    }, [channel, isAuthenticated, mergedConfig]);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    }, []);

    // Disconnect
    const disconnect = useCallback(() => {
        cleanup();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setStatus('disconnected');
    }, [cleanup]);

    // Send message
    const send = useCallback((message: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        status,
        data,
        error,
        send,
        connect,
        disconnect,
        isConnected: status === 'connected',
    };
}

// ============================================
// SSE HOOK (Server-Sent Events Alternative)
// ============================================

export function useSSE<T = unknown>(
    endpoint: string,
    config: RealtimeConfig = {}
) {
    const { isAuthenticated } = useAuthStore();
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryCountRef = useRef(0);

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    const connect = useCallback(() => {
        if (!isAuthenticated) return;

        try {
            setStatus('connecting');
            setError(null);

            const sseUrl = `${API_BASE_URL}${endpoint}`;
            const eventSource = new EventSource(sseUrl, { withCredentials: true });

            eventSource.onopen = () => {
                setStatus('connected');
                retryCountRef.current = 0;
            };

            eventSource.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as T;
                    setData(payload);
                } catch (e) {
                    console.error('Failed to parse SSE message:', e);
                }
            };

            eventSource.onerror = () => {
                setStatus('error');
                eventSource.close();

                // Auto-reconnect
                if (mergedConfig.autoReconnect && retryCountRef.current < mergedConfig.maxRetries) {
                    const delay = mergedConfig.retryDelay * Math.pow(2, retryCountRef.current);
                    retryCountRef.current++;
                    setTimeout(connect, delay);
                }
            };

            eventSourceRef.current = eventSource;
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Failed to connect'));
            setStatus('error');
        }
    }, [endpoint, isAuthenticated, mergedConfig]);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        status,
        data,
        error,
        connect,
        disconnect,
        isConnected: status === 'connected',
    };
}

// ============================================
// CHANNEL SUBSCRIPTIONS
// ============================================

export type RealtimeChannel =
    | 'notifications'
    | 'artworks:updates'
    | 'art:transactions'
    | 'forum:updates'
    | 'system:alerts'
    | 'admin:stats';

export function useNotificationsRealtime() {
    return useRealtime<Notification[]>('notifications');
}

export function useSystemAlertsRealtime() {
    return useRealtime<SystemAlert[]>('system:alerts');
}

interface SystemAlert {
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    createdAt: string;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}
