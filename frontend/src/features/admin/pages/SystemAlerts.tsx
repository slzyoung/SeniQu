import React, { useState } from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Badge } from '../../../components/ui';
import { Bell, AlertTriangle, CheckCircle, Info, Plus, Megaphone, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { useToast } from '../../../stores/useNotificationStore';
import { formatDate, extractArray } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function SystemAlerts() {
    const { data: alertsData, isLoading } = useQuery({
        queryKey: ['admin', 'alerts'],
        queryFn: () => adminService.getSystemAlerts(),
    });

    const alerts = extractArray(alertsData);

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
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBadgeStyle = (severity: string) => {
        switch (severity) {
            case 'error': case 'critical': return 'bg-red-100 text-red-700';
            case 'warning': return 'bg-amber-100 text-amber-700';
            case 'success': return 'bg-emerald-100 text-emerald-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold px-3 py-1 mb-3">Broadcasts</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">System Alerts</h1>
                        <p className="text-gray-500 mt-2 font-medium">Manage platform-wide announcements and alerts.</p>
                    </div>
                    <Button 
                        className="!rounded-xl !px-5 !py-2.5 !bg-rose-600 hover:!bg-rose-700 !text-white shadow-lg font-bold" 
                        onClick={() => setIsCreating(!isCreating)}
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        New Alert
                    </Button>
                </div>

                <AnimatePresence>
                    {isCreating && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                            <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4"><Megaphone className="w-5 h-5 text-rose-500" /> Broadcast New Alert</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-2 space-y-1.5">
                                            <label className="text-sm font-bold text-gray-700">Alert Title</label>
                                            <input type="text" required value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-medium" placeholder="E.g. Scheduled Maintenance" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-gray-700">Severity</label>
                                            <select value={newAlert.severity} onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-bold text-gray-700">
                                                <option value="info">Information</option>
                                                <option value="warning">Warning</option>
                                                <option value="error">Error</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-gray-700">Message Content</label>
                                        <textarea required rows={3} value={newAlert.message} onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-medium resize-none" placeholder="Provide details about the alert..." />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button type="button" variant="ghost" className="!rounded-xl font-bold" onClick={() => setIsCreating(false)}>Cancel</Button>
                                        <Button type="submit" className="!rounded-xl !bg-gray-900 !text-white font-bold" isLoading={createMutation.isPending}>Broadcast Now</Button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-500" />
                        <h3 className="font-bold text-gray-900 text-sm">Active Alerts</h3>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {isLoading ? (
                            <div className="flex justify-center py-20 text-gray-400 font-bold">Loading...</div>
                        ) : alerts?.length === 0 || !alerts ? (
                            <div className="text-center py-20">
                                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="font-bold text-gray-500">No active system alerts.</p>
                            </div>
                        ) : (
                            alerts.map((alert: any, i: number) => (
                                <motion.div key={alert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                    className="p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                                    <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getBadgeStyle(alert.type || 'info').replace('text', 'bg-opacity-50 text')}`}>
                                        {getIcon(alert.type || 'info')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{alert.title}</h4>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getBadgeStyle(alert.type || 'info')}`}>
                                                    {alert.type || 'info'}
                                                </span>
                                            </div>
                                            <span className="flex items-center gap-1 text-xs font-semibold text-gray-400"><Clock className="w-3.5 h-3.5" />{formatDate(alert.createdAt || new Date().toISOString())}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-600 leading-relaxed">{alert.message}</p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default SystemAlerts;
