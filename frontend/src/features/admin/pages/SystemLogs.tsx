/**
 * System Logs Page
 * View and filter system activity logs
 */

import { useState } from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button } from '../../../components/ui';
import {
    FileText,
    Search,
    RefreshCw,
    AlertCircle,
    Info,
    AlertTriangle,
    Bug,
    Loader2
} from 'lucide-react';
import { useSystemLogs } from '../../../hooks/useAdmin';
import { formatDate } from '../../../lib/utils';
import { SystemLog } from '../../../lib/types';


export function SystemLogs() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<{ level?: string; source?: string }>({});
    const [searchQuery, setSearchQuery] = useState('');

    const { data: logsData, isLoading, refetch, isRefetching } = useSystemLogs(page, 50, filters);

    const logs = logsData?.data || [];
    const totalPages = logsData?.meta?.totalPages || 1;

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'debug': return <Bug className="w-4 h-4 text-purple-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getLevelBadge = (level: string) => {
        const variants: Record<string, string> = {
            error: 'bg-red-500/10 text-red-500',
            warn: 'bg-yellow-500/10 text-yellow-500',
            debug: 'bg-purple-500/10 text-purple-500',
            info: 'bg-blue-500/10 text-blue-500',
        };
        return variants[level] || variants.info;
    };

    const filteredLogs = logs.filter((log: SystemLog) =>
        log.message?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageContainer
            title="System Logs"
            description="View and filter system activity logs"
            actions={
                <Button
                    variant="secondary"
                    onClick={() => refetch()}
                    leftIcon={<RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />}
                    disabled={isRefetching}
                >
                    Refresh
                </Button>
            }
        >
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search logs..."
                        className="w-full pl-10 pr-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-gold"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={filters.level || ''}
                        onChange={(e) => setFilters({ ...filters, level: e.target.value || undefined })}
                        className="px-4 py-3 bg-theme-surface border border-theme-border rounded-xl text-theme-text focus:outline-none focus:border-gold"
                    >
                        <option value="">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                        <option value="debug">Debug</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <Card variant="elevated">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-gold animate-spin" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-theme-muted">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No logs found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Mobile View */}
                            <div className="block sm:hidden">
                                {filteredLogs.map((log: SystemLog) => (
                                    <div key={log.id} className="p-4 border-b border-theme-border last:border-0 hover:bg-theme-surface/50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getLevelBadge(log.level)}`}>
                                                {getLevelIcon(log.level)}
                                                {log.level.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-theme-muted font-mono whitespace-nowrap">
                                                {formatDate(log.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-theme-text break-words mb-2">
                                            {log.message}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-theme-surface rounded text-xs font-mono text-theme-muted">
                                                {log.context?.source as string || 'system'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View */}
                            <table className="hidden sm:table w-full text-left">
                                <thead>
                                    <tr className="border-b border-theme-border text-theme-muted text-xs uppercase">
                                        <th className="p-4 font-medium">Level</th>
                                        <th className="p-4 font-medium">Time</th>
                                        <th className="p-4 font-medium">Source</th>
                                        <th className="p-4 font-medium">Message</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {filteredLogs.map((log: SystemLog) => (
                                        <tr key={log.id} className="border-b border-theme-border last:border-0 hover:bg-theme-surface/50 transition-colors">
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getLevelBadge(log.level)}`}>
                                                    {getLevelIcon(log.level)}
                                                    {log.level.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-theme-muted whitespace-nowrap font-mono text-xs">
                                                {formatDate(log.timestamp)}
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-theme-surface rounded text-xs font-mono text-theme-muted">
                                                    {log.context?.source as string || 'system'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-theme-text max-w-md truncate">
                                                {log.message}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-theme-muted">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </PageContainer>
    );
}

export default SystemLogs;
