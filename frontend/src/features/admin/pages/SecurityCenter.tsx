import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge } from '../../../components/ui';
import { Shield, Lock, AlertTriangle, CheckCircle2, Globe, Key, Users, FileWarning } from 'lucide-react';
import { motion } from 'framer-motion';

const SECURITY_ITEMS = [
    { title: 'Row Level Security', status: 'active', detail: 'All tables enforced with RLS policies.', icon: Lock, color: 'bg-emerald-50 text-emerald-700', statusColor: 'bg-emerald-100 text-emerald-700' },
    { title: 'Rate Limiting', status: 'active', detail: 'API endpoints protected against abuse.', icon: Shield, color: 'bg-blue-50 text-blue-700', statusColor: 'bg-emerald-100 text-emerald-700' },
    { title: 'RBAC Enforcement', status: 'active', detail: 'Role-based access via admin_role_permissions.', icon: Key, color: 'bg-purple-50 text-purple-700', statusColor: 'bg-emerald-100 text-emerald-700' },
    { title: 'CORS Policy', status: 'active', detail: 'Strict origin checks on all API calls.', icon: Globe, color: 'bg-indigo-50 text-indigo-700', statusColor: 'bg-emerald-100 text-emerald-700' },
    { title: 'Input Validation', status: 'active', detail: 'Server-side DTO validation on all endpoints.', icon: FileWarning, color: 'bg-amber-50 text-amber-700', statusColor: 'bg-emerald-100 text-emerald-700' },
    { title: 'Brute Force Protection', status: 'active', detail: 'Account lockout after 5 failed attempts.', icon: Users, color: 'bg-red-50 text-red-700', statusColor: 'bg-emerald-100 text-emerald-700' },
];

const RECENT_THREATS = [
    { time: '2 hours ago', event: 'Rate limit exceeded from 103.45.xx.xx', severity: 'warning' },
    { time: '5 hours ago', event: 'Failed login attempt (5x) for user bebek445', severity: 'warning' },
    { time: '1 day ago', event: 'Unauthorized RLS bypass attempt blocked', severity: 'critical' },
    { time: '2 days ago', event: 'SQL injection attempt filtered on /api/artworks', severity: 'critical' },
];

export function SecurityCenter() {
    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Badge className="bg-red-100 text-red-700 border-red-200 font-bold px-3 py-1 mb-3">Security</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Security Center</h1>
                    <p className="text-gray-500 mt-2 font-medium">Monitor platform security posture and threat activity.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {SECURITY_ITEMS.map((item, i) => (
                        <motion.div key={item.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="bg-white rounded-[20px] border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}><item.icon className="w-5 h-5" /></div>
                                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${item.statusColor}`}><CheckCircle2 className="w-3 h-3 inline mr-1" />Active</span>
                                </div>
                                <h4 className="font-bold text-gray-900">{item.title}</h4>
                                <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Threat Activity</h3>
                    <div className="space-y-3">
                        {RECENT_THREATS.map((t, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                                <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${t.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">{t.event}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{t.time}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${t.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{t.severity}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default SecurityCenter;
