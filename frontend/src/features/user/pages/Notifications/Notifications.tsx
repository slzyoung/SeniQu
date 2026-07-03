import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, 
    MessageSquare, 
    Heart, 
    Info, 
    UserPlus, 
    AlertTriangle, 
    Trash2, 
    CheckCheck, 
    Megaphone,
    ArrowLeft,
    Sparkles
} from 'lucide-react';
import { useNotifications } from '../../../../hooks/useNotifications';
import './Notifications.css';

type FilterType = 'all' | 'messages' | 'interactions' | 'alerts';

export function Notifications() {
    const navigate = useNavigate();
    const { 
        notifications, 
        isLoading, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification 
    } = useNotifications();

    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [dismissedSystemAlert, setDismissedSystemAlert] = useState(false);

    // Filter notifications based on active tab
    const filteredNotifications = useMemo(() => {
        return (notifications || []).filter(n => {
            const lowerTitle = (n.title || '').toLowerCase();
            const lowerMsg = (n.message || '').toLowerCase();
            const isMsg = n.referenceType === 'message' || lowerTitle.includes('pesan') || lowerTitle.includes('message');
            const isInteraction = n.type === 'follow' || n.type === 'artwork' || n.type === 'forum' || n.type === 'sale' || n.referenceType === 'reel' || lowerTitle.includes('sukai') || lowerTitle.includes('komentar') || lowerTitle.includes('like') || lowerTitle.includes('comment');
            const isAlert = n.type === 'alert' || (n.type === 'system' && n.referenceType !== 'message');

            if (activeFilter === 'messages') return isMsg;
            if (activeFilter === 'interactions') return isInteraction && !isMsg;
            if (activeFilter === 'alerts') return isAlert;
            return true;
        });
    }, [notifications, activeFilter]);

    // Active maintenance or critical alerts to display in a prominent top banner
    const systemMaintenanceAlert = useMemo(() => {
        // Find any alert or system notification that mentions maintenance/perbaikan/system
        return (notifications || []).find(n => {
            const text = `${n.title} ${n.message || ''}`.toLowerCase();
            return (n.type === 'alert' || n.type === 'system') && 
                   (text.includes('maintenance') || text.includes('perbaikan') || text.includes('system update') || text.includes('pemeliharaan'));
        });
    }, [notifications]);

    // Group filtered notifications by date
    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: typeof notifications } = {
            'Today': [],
            'Yesterday': [],
            'Earlier': []
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        filteredNotifications.forEach(n => {
            const date = new Date(n.createdAt);
            if (date.toDateString() === today.toDateString()) {
                groups['Today'].push(n);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups['Yesterday'].push(n);
            } else {
                groups['Earlier'].push(n);
            }
        });

        // Filter out empty groups
        return Object.keys(groups).reduce((acc, key) => {
            if (groups[key].length > 0) {
                acc[key] = groups[key];
            }
            return acc;
        }, {} as { [key: string]: typeof notifications });
    }, [filteredNotifications]);

    // Helper to get matching icon and style
    const getNotificationStyle = (n: any) => {
        const lowerTitle = (n.title || '').toLowerCase();
        
        if (n.referenceType === 'message' || lowerTitle.includes('pesan') || lowerTitle.includes('message')) {
            return {
                icon: <MessageSquare className="w-5 h-5" />,
                className: 'message'
            };
        }
        if (lowerTitle.includes('sukai') || lowerTitle.includes('like') || lowerTitle.includes('favorit')) {
            return {
                icon: <Heart className="w-5 h-5" />,
                className: 'like'
            };
        }
        if (lowerTitle.includes('komentar') || lowerTitle.includes('comment')) {
            return {
                icon: <MessageSquare className="w-5 h-5" />,
                className: 'comment'
            };
        }
        if (n.type === 'follow') {
            return {
                icon: <UserPlus className="w-5 h-5" />,
                className: 'follow'
            };
        }
        if (n.type === 'sale') {
            return {
                icon: <Megaphone className="w-5 h-5" />,
                className: 'sale'
            };
        }
        if (n.type === 'alert' || lowerTitle.includes('maintenance') || lowerTitle.includes('perbaikan')) {
            return {
                icon: <AlertTriangle className="w-5 h-5" />,
                className: 'system'
            };
        }
        return {
            icon: <Bell className="w-5 h-5" />,
            className: 'system'
        };
    };

    // Handle clicking a notification
    const handleNotificationClick = async (n: any) => {
        if (!n.isRead) {
            await markAsRead(n.id);
        }

        // Navigate based on referenceType/type
        if (n.referenceType === 'message') {
            navigate('/dashboard/messages');
        } else if (n.referenceType === 'reel') {
            navigate(`/reels?v=${n.referenceId}`);
        } else if (n.referenceType === 'artwork') {
            navigate(`/marketplace/art/${n.referenceId}`);
        } else if (n.referenceType === 'thread') {
            navigate(`/community/thread/${n.referenceId}`);
        }
    };

    // Count counts for tabs
    const counts = useMemo(() => {
        const result = { all: 0, messages: 0, interactions: 0, alerts: 0 };
        if (!notifications) return result;

        notifications.forEach(n => {
            const lowerTitle = (n.title || '').toLowerCase();
            const isMsg = n.referenceType === 'message' || lowerTitle.includes('pesan') || lowerTitle.includes('message');
            const isInteraction = n.type === 'follow' || n.type === 'artwork' || n.type === 'forum' || n.type === 'sale' || n.referenceType === 'reel' || lowerTitle.includes('sukai') || lowerTitle.includes('komentar') || lowerTitle.includes('like') || lowerTitle.includes('comment');
            const isAlert = n.type === 'alert' || (n.type === 'system' && n.referenceType !== 'message');

            result.all++;
            if (isMsg) result.messages++;
            if (isInteraction && !isMsg) result.interactions++;
            if (isAlert) result.alerts++;
        });

        return result;
    }, [notifications]);

    return (
        <div className="notif-page">
            {/* Page Header */}
            <div className="notif-page-header">
                <div className="notif-header-info">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="md:hidden mb-4 p-2 -ml-2 rounded-full hover:bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors flex items-center gap-1.5"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-semibold">Back</span>
                    </button>
                    <h1 className="notif-page-title">Notifications</h1>
                    <p className="notif-page-subtitle">
                        {unreadCount > 0 
                            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` 
                            : 'Stay updated with your latest activities'}
                    </p>
                </div>

                <div className="notif-header-actions">
                    {unreadCount > 0 && (
                        <button 
                            onClick={() => markAllAsRead()} 
                            className="notif-btn-secondary"
                        >
                            <CheckCheck className="w-4 h-4 text-gold" />
                            <span>Mark all as read</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Maintenance Alert Banner */}
            {systemMaintenanceAlert && !dismissedSystemAlert && (
                <div className="notif-alert-banner">
                    <div className="notif-alert-icon-wrapper animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="notif-alert-content">
                        <h4 className="notif-alert-title">{systemMaintenanceAlert.title}</h4>
                        <p className="notif-alert-message">{systemMaintenanceAlert.message}</p>
                    </div>
                    <button 
                        onClick={() => setDismissedSystemAlert(true)}
                        className="p-1 rounded-lg text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors"
                        title="Dismiss alert"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="notif-filters">
                <button 
                    onClick={() => setActiveFilter('all')}
                    className={`notif-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
                >
                    <span>All</span>
                    {counts.all > 0 && <span className="notif-filter-count">{counts.all}</span>}
                </button>
                <button 
                    onClick={() => setActiveFilter('messages')}
                    className={`notif-filter-tab ${activeFilter === 'messages' ? 'active' : ''}`}
                >
                    <span>Messages</span>
                    {counts.messages > 0 && <span className="notif-filter-count">{counts.messages}</span>}
                </button>
                <button 
                    onClick={() => setActiveFilter('interactions')}
                    className={`notif-filter-tab ${activeFilter === 'interactions' ? 'active' : ''}`}
                >
                    <span>Interactions</span>
                    {counts.interactions > 0 && <span className="notif-filter-count">{counts.interactions}</span>}
                </button>
                <button 
                    onClick={() => setActiveFilter('alerts')}
                    className={`notif-filter-tab ${activeFilter === 'alerts' ? 'active' : ''}`}
                >
                    <span>Alerts & System</span>
                    {counts.alerts > 0 && <span className="notif-filter-count">{counts.alerts}</span>}
                </button>
            </div>

            {/* Notifications Content */}
            {isLoading ? (
                <div className="notif-loading">
                    <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
            ) : Object.keys(groupedNotifications).length === 0 ? (
                <div className="notif-empty">
                    <div className="notif-empty-icon">
                        <Bell className="w-8 h-8" />
                    </div>
                    <h3>All caught up!</h3>
                    <p>No notifications found in this category. We'll alert you when something new arrives.</p>
                </div>
            ) : (
                <div className="notif-groups-container">
                    {Object.entries(groupedNotifications).map(([groupTitle, list]) => (
                        <div key={groupTitle} className="notif-group">
                            <h3 className="notif-group-title">{groupTitle}</h3>
                            <div className="notif-list">
                                {list.map(n => {
                                    const { icon, className } = getNotificationStyle(n);
                                    return (
                                        <div 
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                                        >
                                            <div className={`notif-icon-wrapper ${className}`}>
                                                {icon}
                                            </div>
                                            <div className="notif-item-body">
                                                <h4 className="notif-item-title">{n.title}</h4>
                                                {n.message && (
                                                    <p className="notif-item-message">{n.message}</p>
                                                )}
                                                <span className="notif-item-meta">
                                                    {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="notif-item-actions">
                                                {!n.isRead && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(n.id);
                                                        }}
                                                        className="notif-item-btn"
                                                        title="Mark as read"
                                                    >
                                                        <CheckCheck className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(n.id);
                                                    }}
                                                    className="notif-item-btn delete"
                                                    title="Delete notification"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Notifications;
