import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge } from '../../../components/ui';
import { Activity, Server, Cpu, HardDrive, Wifi, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const SERVICES = [
    { name: 'API Server (NestJS)', status: 'healthy', uptime: '99.97%', latency: '45ms', icon: Server },
    { name: 'Database (Supabase)', status: 'healthy', uptime: '99.99%', latency: '12ms', icon: HardDrive },
    { name: 'Realtime (WebSocket)', status: 'healthy', uptime: '99.90%', latency: '8ms', icon: Wifi },
    { name: 'CDN / Storage', status: 'healthy', uptime: '100%', latency: '22ms', icon: Cpu },
    { name: 'Auth Service (Privy)', status: 'healthy', uptime: '99.95%', latency: '180ms', icon: Clock },
    { name: 'Solana RPC', status: 'degraded', uptime: '98.50%', latency: '350ms', icon: Activity },
];

export function SystemHealth() {
    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <Badge className="bg-teal-100 text-teal-700 border-teal-200 font-bold px-3 py-1 mb-3">Monitoring</Badge>
                    <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">System Health</h1>
                    <p className="text-gray-500 mt-2 font-medium">Real-time service status and infrastructure monitoring.</p>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-emerald-700 text-lg">All Systems Operational</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SERVICES.map((s, i) => (
                            <motion.div key={s.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <div className={`rounded-[20px] border p-5 ${s.status === 'healthy' ? 'border-gray-100 bg-gray-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <s.icon className={`w-6 h-6 ${s.status === 'healthy' ? 'text-gray-600' : 'text-amber-600'}`} />
                                        {s.status === 'healthy'
                                            ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3" />Healthy</span>
                                            : <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><AlertTriangle className="w-3 h-3" />Degraded</span>}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-semibold">
                                        <span>Uptime: {s.uptime}</span>
                                        <span>Latency: {s.latency}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default SystemHealth;
