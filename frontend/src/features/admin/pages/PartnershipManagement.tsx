import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge, Button } from '../../../components/ui';
import { Handshake, Plus, Calendar, Globe, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_PARTNERS = [
    { id: '1', name: 'Museum Nasional Indonesia', type: 'Cultural', contact: 'info@museum-nasional.id', status: 'active', value: '$12,000', start: '2026-01-15' },
    { id: '2', name: 'Galeri Seni Jakarta', type: 'Gallery', contact: 'partner@galerijk.com', status: 'active', value: '$8,500', start: '2026-02-20' },
    { id: '3', name: 'Bali Heritage Foundation', type: 'Heritage', contact: 'admin@baliheritage.org', status: 'pending', value: '$5,000', start: '2026-04-01' },
    { id: '4', name: 'Digital Art Asia', type: 'Media', contact: 'collab@dart.asia', status: 'active', value: '$15,000', start: '2025-11-10' },
];

export function PartnershipManagement() {
    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-3 py-1 mb-3">Partnerships</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Partnership Management</h1>
                        <p className="text-gray-500 mt-2 font-medium">Manage institutional partnerships and collaborations.</p>
                    </div>
                    <Button className="!rounded-xl !px-5 !py-2.5 !bg-amber-600 hover:!bg-amber-700 !text-white shadow-lg font-bold" leftIcon={<Plus className="w-4 h-4" />}>
                        Add Partner
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {MOCK_PARTNERS.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <div className="bg-white rounded-[20px] border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Handshake className="w-6 h-6 text-amber-600" /></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{p.name}</h4>
                                            <p className="text-xs text-gray-500">{p.type} · {p.contact}</p>
                                        </div>
                                    </div>
                                    {p.status === 'active'
                                        ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3" />Active</span>
                                        : <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Clock className="w-3 h-3" />Pending</span>}
                                </div>
                                <div className="flex items-center gap-6 text-sm text-gray-500 font-semibold">
                                    <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-gray-400" />{p.value}</span>
                                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{p.start}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </PageContainer>
    );
}

export default PartnershipManagement;
