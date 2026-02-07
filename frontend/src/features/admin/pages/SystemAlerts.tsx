/**
 * System Alerts Page
 * Manage system-wide notifications and alerts
 */

import React, { useState } from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Input } from '../../../components/ui';
import { Bell, AlertTriangle, CheckCircle, Info, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { useToast } from '../../../stores/useNotificationStore';

import { formatDate } from '../../../lib/utils';
import { motion } from 'framer-motion';

export function SystemAlerts() {
    const { data: alerts, isLoading } = useQuery({
        queryKey: ['admin', 'alerts'],
        queryFn: () => adminService.getSystemAlerts(),
    });

    const [isCreating, setIsCreating] = useState(false);
    const [newAlert, setNewAlert] = useState({ title: '', message: '', severity: 'info' });
    const toast = useToast();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: (data: { title: string; message: string; severity: 'info' | 'warning' | 'error' | 'critical'; isGlobal?: boolean }) =>
            adminService.createSystemAlert(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
            toast.success('Alert Created', 'The system alert has been broadcasted.');
            setIsCreating(false);
            setNewAlert({ title: '', message: '', severity: 'info' });
        },
        onError: () => toast.error('Error', 'Failed to create alert')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            title: newAlert.title,
            message: newAlert.message,
            severity: newAlert.severity as 'info' | 'warning' | 'error' | 'critical',
            isGlobal: true
        });
    };

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'error': case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <PageContainer
            title="System Alerts"
            description="Manage platform-wide announcements and alerts"
            actions={
                <Button variant="gold" onClick={() => setIsCreating(!isCreating)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Alert
                </Button>
            }
        >
            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Card variant="elevated">
                        <CardHeader title="Broadcast New Alert" />
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Title"
                                    value={newAlert.title}
                                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                                    required
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-text/80">Message</label>
                                    <textarea
                                        className="w-full p-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text focus:outline-none focus:ring-2 focus:ring-gold/50"
                                        rows={3}
                                        value={newAlert.message}
                                        onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-text/80">Severity</label>
                                    <select
                                        className="w-full p-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text"
                                        value={newAlert.severity}
                                        onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                                    >
                                        <option value="info">Info</option>
                                        <option value="warning">Warning</option>
                                        <option value="error">Error</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                    <Button variant="gold" type="submit" isLoading={createMutation.isPending}>Broadcast</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <div className="grid gap-4">
                {isLoading ? (
                    <div className="text-center py-12 text-theme-muted">Loading alerts...</div>
                ) : alerts?.map((alert) => (
                    <Card key={alert.id} variant="default" className="border-l-4 border-l-gold">
                        <CardContent className="flex items-start gap-4 p-4">
                            <div className="mt-1">{getIcon(alert.type || 'info')}</div>
                            <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-0">
                                    <h4 className="font-medium text-theme-text">{alert.title}</h4>
                                    <span className="text-xs text-theme-muted whitespace-nowrap">{formatDate(alert.createdAt || new Date().toISOString())}</span>
                                </div>
                                <p className="text-sm text-theme-muted mt-1">{alert.message}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {alerts?.length === 0 && (
                    <div className="text-center py-12 text-theme-muted bg-theme-surface/30 rounded-xl border border-theme-border border-dashed">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No active system alerts</p>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default SystemAlerts;
