/**
 * DataTable Component - Sortable, paginated data table
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Skeleton, SkeletonTable } from './Skeleton';

export interface Column<T> {
    key: keyof T | string;
    title: string;
    width?: string;
    sortable?: boolean;
    render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    pageSize?: number;
    searchable?: boolean;
    searchPlaceholder?: string;
    onRowClick?: (row: T, index: number) => void;
    emptyMessage?: string;
    className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    loading = false,
    pageSize = 10,
    searchable = false,
    searchPlaceholder = 'Search...',
    onRowClick,
    emptyMessage = 'No data available',
    className = '',
}: DataTableProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter data by search
    const filteredData = useMemo(() => {
        if (!searchQuery) return data;

        return data.filter((row) =>
            Object.values(row).some((value) =>
                String(value).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [data, searchQuery]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey || !sortDirection) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortKey, sortDirection]);

    // Paginate
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const paginatedData = sortedData.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection((prev) =>
                prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
            );
            if (sortDirection === 'desc') setSortKey(null);
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    if (loading) {
        return <SkeletonTable rows={pageSize} columns={columns.length} />;
    }

    return (
        <div className={`w-full ${className}`}>
            {/* Search */}
            {searchable && (
                <div className="mb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder={searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme-border rounded-lg text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-gold"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-theme-border">
                <table className="w-full">
                    <thead>
                        <tr className="bg-theme-elevated border-b border-theme-border">
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    style={{ width: column.width }}
                                    className={`
                    px-4 py-3 text-left text-sm font-semibold text-theme-text
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-theme-surface' : ''}
                  `}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.title}
                                        {column.sortable && (
                                            <span className="flex flex-col">
                                                <ChevronUp
                                                    className={`w-3 h-3 -mb-1 ${sortKey === column.key && sortDirection === 'asc'
                                                            ? 'text-gold'
                                                            : 'text-theme-muted'
                                                        }`}
                                                />
                                                <ChevronDown
                                                    className={`w-3 h-3 ${sortKey === column.key && sortDirection === 'desc'
                                                            ? 'text-gold'
                                                            : 'text-theme-muted'
                                                        }`}
                                                />
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-theme-muted">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <motion.tr
                                    key={rowIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: rowIndex * 0.02 }}
                                    onClick={() => onRowClick?.(row, rowIndex)}
                                    className={`
                    border-b border-theme-border last:border-b-0
                    bg-theme-surface hover:bg-theme-elevated
                    transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={String(column.key)}
                                            className="px-4 py-3 text-sm text-theme-text"
                                        >
                                            {column.render
                                                ? column.render(row[column.key as keyof T], row, rowIndex)
                                                : String(row[column.key as keyof T] ?? '')}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-theme-muted">
                        Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                        {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
                        {sortedData.length} results
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-theme-surface border border-theme-border hover:bg-theme-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`
                    w-8 h-8 rounded-lg text-sm font-medium transition-colors
                    ${currentPage === pageNum
                                            ? 'bg-gold text-charcoal'
                                            : 'bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-elevated'
                                        }
                  `}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-theme-surface border border-theme-border hover:bg-theme-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;
