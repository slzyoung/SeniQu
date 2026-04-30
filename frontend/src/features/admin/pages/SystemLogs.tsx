import { useState } from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Badge, Button } from '../../../components/ui';
import { FileText, Search, RefreshCw, AlertCircle, Info, AlertTriangle, Bug, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSystemLogs } from '../../../hooks/useAdmin';
import { formatDate, extractArray, extractPagination } from '../../../lib/utils';
import { SystemLog } from '../../../lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export function SystemLogs() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<{ level?: string; source?: string }>({});
    const [searchQuery, setSearchQuery] = useState('');

    const { data: logsData, isLoading, refetch, isRefetching } = useSystemLogs(page, 50, filters);

    const logs = extractArray<SystemLog>(logsData);
    const totalPages = extractPagination(logsData).totalPages || 1;

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <AlertCircle className="w-4 h-4" />;
            case 'warn': return <AlertTriangle className="w-4 h-4" />;
            case 'debug': return <Bug className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    const getLevelBadge = (level: string) => {
        const variants: Record<string, string> = {
            error: 'bg-red-100 text-red-700 border-red-200',
            warn: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            debug: 'bg-purple-100 text-purple-700 border-purple-200',
            info: 'bg-blue-100 text-blue-700 border-blue-200',
        };
        return variants[level] || variants.info;
    };

    const filteredLogs = logs.filter((log: SystemLog) =>
        log.message?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <Badge className="bg-gray-100 text-gray-700 border-gray-200 font-bold px-3 py-1 mb-3">System</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">System Logs</h1>
                        <p className="text-gray-500 mt-2 font-medium">Real-time monitoring of platform activity and errors.</p>
                    </div>
                    <Button 
                        className="!rounded-xl !px-5 !py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm font-bold"
                        leftIcon={<RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />}
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        Refresh
                    </Button>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-4 p-5 border-b border-gray-100 bg-gray-50/30">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search logs..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                            />
                        </div>
                        <select
                            value={filters.level || ''}
                            onChange={(e) => setFilters({ ...filters, level: e.target.value || undefined })}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            <option value="">All Levels</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                            <option value="debug">Debug</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-gray-400" /></div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-24 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-bold">No logs found</p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/60 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                <div className="col-span-2">Level</div>
                                <div className="col-span-3">Time</div>
                                <div className="col-span-2">Source</div>
                                <div className="col-span-5">Message</div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                <AnimatePresence>
                                    {filteredLogs.map((log: SystemLog, idx: number) => (
                                        <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                                            className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50/50 transition-colors">
                                            <div className="col-span-1 md:col-span-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-bold ${getLevelBadge(log.level)}`}>
                                                    {getLevelIcon(log.level)} {log.level.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="col-span-1 md:col-span-3 font-mono text-xs text-gray-500">
                                                {formatDate(log.timestamp)}
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <span className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs font-bold text-gray-600">
                                                    {(log.context?.source as string) || 'system'}
                                                </span>
                                            </div>
                                            <div className="col-span-1 md:col-span-5 text-sm font-medium text-gray-900 truncate">
                                                {log.message}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors">
                                <ChevronLeft className="w-4 h-4" />Previous
                            </button>
                            <span className="text-sm font-bold text-gray-500">Page {page} / {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors">
                                Next<ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

export default SystemLogs;
