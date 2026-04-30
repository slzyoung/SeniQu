import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../../services/adminService';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge } from '../../../components/ui';
import { Database, Table, HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export function DatabaseManagement() {
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['admin', 'database'],
        queryFn: () => adminService.getDatabaseStats(),
    });

    const tables = data?.tables || [];

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-bold px-3 py-1 mb-3">System</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Database Overview</h1>
                        <p className="text-gray-500 mt-2 font-medium">Live row counts from all platform tables.</p>
                    </div>
                    <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tables.map((t: any, i: number) => (
                            <motion.div key={t.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <div className="bg-white rounded-[20px] border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><Table className="w-5 h-5 text-orange-600" /></div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                                            <p className="text-xs text-gray-400">PostgreSQL</p>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-3xl font-bold text-gray-900">{t.rowCount.toLocaleString()}</p>
                                            <p className="text-xs font-semibold text-gray-500 mt-1">rows</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${t.rowCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {t.rowCount > 0 ? 'Active' : 'Empty'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}

export default DatabaseManagement;
