import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge } from '../../../components/ui';
import { Flag, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { extractArray } from '../../../lib/utils';
import { motion } from 'framer-motion';

const STATUS_MAP: Record<string, { color: string; icon: any }> = {
    pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
    investigating: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    resolved: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    dismissed: { color: 'bg-gray-100 text-gray-500', icon: Flag },
};

export function ReportsIssues() {
    const [filter, setFilter] = useState('all');
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'reports'],
        queryFn: () => adminService.getReports(1, 50),
    });

    const reports = extractArray(data);

    // Use mock if empty
    const items = reports.length > 0 ? reports : [
        { id: '1', reason: 'Inappropriate artwork content', targetType: 'artwork', status: 'pending', createdAt: '2026-04-29T10:00:00Z', reporter: { display_name: 'galon223' } },
        { id: '2', reason: 'Spam in forum thread', targetType: 'forum_thread', status: 'investigating', createdAt: '2026-04-28T14:00:00Z', reporter: { display_name: 'bebek445' } },
        { id: '3', reason: 'Fake institution profile', targetType: 'institution', status: 'resolved', createdAt: '2026-04-27T08:00:00Z', reporter: { display_name: 'Foxy' } },
        { id: '4', reason: 'Copyright violation on artwork', targetType: 'artwork', status: 'pending', createdAt: '2026-04-26T16:00:00Z', reporter: { display_name: 'Dimas' } },
    ];

    const filtered = filter === 'all' ? items : items.filter((r: any) => r.status === filter);

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Badge className="bg-red-100 text-red-700 border-red-200 font-bold px-3 py-1 mb-3">Moderation</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Reports & Issues</h1>
                    <p className="text-gray-500 mt-2 font-medium">Review user-submitted reports and content flags.</p>
                </div>

                <div className="flex gap-2 mb-6">
                    {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all ${filter === f ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {f}
                        </button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-red-500" /></div>
                ) : (
                    <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
                        {filtered.map((r: any, i: number) => {
                            const cfg = STATUS_MAP[r.status] || STATUS_MAP.pending;
                            const Icon = cfg.icon;
                            return (
                                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                    className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-red-50/20 transition-colors">
                                    <Icon className={`w-5 h-5 shrink-0 ${cfg.color.split(' ')[1]}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm">{r.reason}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Target: {r.targetType} · Reported by: {r.reporter?.display_name || 'Unknown'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.color} capitalize`}>{r.status}</span>
                                </motion.div>
                            );
                        })}
                        {filtered.length === 0 && <div className="py-16 text-center text-gray-400 font-bold">No reports match this filter.</div>}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default ReportsIssues;
