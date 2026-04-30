import { useState } from 'react';
import { usePendingInstitutions, useAllInstitutions, useVerifyInstitution } from '../../../hooks/useAdmin';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, Button, Avatar, Badge, Modal } from '../../../components/ui';
import { formatDate, extractArray } from '../../../lib/utils';
import { 
    Loader2, Search, Building2, CheckCircle2, XCircle, 
    ExternalLink, MapPin, ChevronLeft, ChevronRight, CheckCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function InstitutionManagement() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    const { data: pendingData, isLoading: isPendingLoading } = usePendingInstitutions();
    const { data: allData, isLoading: isAllLoading } = useAllInstitutions(page, 20); // Add pagination hook logic if available
    
    const extractedPending = extractArray(pendingData);
    const extractedAll = extractArray(allData);

    const verifyMutation = useVerifyInstitution();

    const handleVerify = (id: string, verified: boolean) => {
        if (window.confirm(`Are you sure you want to ${verified ? 'approve' : 'reject'} this institution?`)) {
            verifyMutation.mutate({ id, verified });
        }
    };

    const getInstitutionIcon = (type: string) => {
        return <Building2 className="w-5 h-5" />;
    };

    const getTypeColor = (type: string) => {
        switch(type?.toLowerCase()) {
            case 'museum': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'gallery': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'heritage': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filteredAll = extractedAll.filter((inst: any) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return inst.name?.toLowerCase().includes(q) || inst.city?.toLowerCase().includes(q) || inst.type?.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                    <div>
                        <Badge className="backdrop-blur-md bg-amber-100 text-amber-700 border-amber-200 font-bold px-3 py-1 mb-3">Super Admin · Domains</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Institution Oversight</h1>
                        <p className="text-gray-500 mt-2 font-medium">Verify and manage museums, galleries, and cultural heritage sites.</p>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'pending'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Pending Review
                        {extractedPending.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold shadow-sm">
                                {extractedPending.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'all'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        All Institutions
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    {/* Pending Tab */}
                    {activeTab === 'pending' && (
                        isPendingLoading ? (
                            <div className="flex justify-center p-24"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
                        ) : extractedPending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-24 text-gray-400">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="font-bold text-gray-900 text-lg">All caught up!</p>
                                <p className="text-sm font-medium mt-1 text-gray-500">No institutions are pending approval.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                <AnimatePresence>
                                    {extractedPending.map((inst: any, idx) => (
                                        <motion.div key={inst.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                                            className="p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:bg-gray-50/50 transition-colors">
                                            
                                            <div className="w-20 h-20 bg-gray-100 rounded-[16px] flex items-center justify-center border border-gray-200 shrink-0 overflow-hidden shadow-sm">
                                                {inst.logoUrl ? (
                                                    <img src={inst.logoUrl} alt={inst.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Building2 className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-xl font-bold text-gray-900 truncate">{inst.name}</h3>
                                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${getTypeColor(inst.type)}`}>
                                                                {inst.type || 'Institution'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                                                            {inst.description || 'No description provided for this institution.'}
                                                        </p>
                                                        
                                                        <div className="flex flex-wrap items-center gap-4 mt-3">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                                {inst.city || 'Location N/A'}
                                                            </div>
                                                            <div className="text-xs font-semibold text-gray-500">
                                                                Submitted: <span className="text-gray-900">{formatDate(inst.createdAt)}</span>
                                                            </div>
                                                            <div className="text-xs font-semibold text-gray-500">
                                                                Owner: <span className="text-gray-900">{inst.owner?.display_name || inst.owner?.email || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            className="!rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
                                                            onClick={() => navigate(`/institutions/${inst.slug}`)}
                                                            leftIcon={<ExternalLink className="w-4 h-4" />}
                                                        >
                                                            Preview
                                                        </Button>
                                                        <Button
                                                            className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-md shadow-emerald-600/20"
                                                            onClick={() => handleVerify(inst.id, true)}
                                                            isLoading={verifyMutation.isPending}
                                                            leftIcon={<CheckCircle2 className="w-4 h-4" />}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )
                    )}

                    {/* All Institutions Tab */}
                    {activeTab === 'all' && (
                        <div>
                            {/* Search bar inside tab */}
                            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <div className="relative max-w-sm w-full">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Search institutions..."
                                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm" />
                                </div>
                            </div>
                            
                            {isAllLoading ? (
                                <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
                            ) : filteredAll.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                    <Building2 className="w-14 h-14 text-gray-200 mb-3" />
                                    <p className="font-bold text-gray-900 text-lg">No institutions found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 bg-gray-50/80 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                        <div className="col-span-5">Institution</div>
                                        <div className="col-span-2">Location</div>
                                        <div className="col-span-3">Status</div>
                                        <div className="col-span-2 text-right">Joined</div>
                                    </div>
                                    <AnimatePresence>
                                        {filteredAll.map((inst: any, idx: number) => (
                                            <motion.div key={inst.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                                                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 md:px-8 py-4 items-center hover:bg-indigo-50/20 transition-colors border-b border-gray-50 last:border-0">
                                                
                                                <div className="col-span-1 md:col-span-5 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                                                        {inst.logoUrl ? <img src={inst.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-gray-400" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 truncate flex items-center gap-2">
                                                            {inst.name}
                                                            {inst.is_featured && <span className="w-2 h-2 rounded-full bg-amber-400" title="Featured" />}
                                                        </p>
                                                        <p className="text-xs font-semibold text-gray-500 mt-0.5 truncate">{inst.type?.toUpperCase() || 'INSTITUTION'}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="col-span-1 md:col-span-2">
                                                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5 truncate">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                        {inst.city || 'N/A'}
                                                    </span>
                                                </div>
                                                
                                                <div className="col-span-1 md:col-span-3">
                                                    {inst.is_verified || inst.isVerified
                                                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>
                                                        : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 shadow-sm border border-amber-200"><Loader2 className="w-3.5 h-3.5" />Pending</span>}
                                                </div>
                                                
                                                <div className="col-span-1 md:col-span-2 text-sm text-gray-500 font-medium text-right">
                                                    {formatDate(inst.createdAt || inst.created_at)}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

export default InstitutionManagement;
