import { useState } from 'react';
import { useUsers } from '../../../hooks/useAdmin';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Avatar } from '../../../components/ui';
import { formatDate } from '../../../lib/utils';
import { Loader2, Search, MoreVertical } from 'lucide-react';

/** Normalize snake_case backend response to camelCase */
function mapUser(raw: any) {
    return {
        id: raw.id,
        displayName: raw.displayName || raw.display_name || '',
        username: raw.username || '',
        email: raw.email || '',
        avatarUrl: raw.avatarUrl || raw.avatar_url || '',
        role: raw.role || 'user',
        isVerified: raw.isVerified ?? raw.is_verified ?? false,
        isActive: raw.isActive ?? raw.is_active ?? true,
        isPremium: raw.isPremium ?? raw.is_premium ?? false,
        createdAt: raw.createdAt || raw.created_at || '',
    };
}

export function AdminManagement() {
    const [page, setPage] = useState(1);
    const { data: response, isLoading } = useUsers(page);
    const users = (response?.data || []).map(mapUser);
    const meta = response?.meta;

    return (
        <PageContainer
            title="User Management"
            description="Manage system users and roles"
            actions={
                <Button variant="gold" leftIcon={<Search className="w-4 h-4" />}>
                    Search Users
                </Button>
            }
        >
            <Card variant="elevated">
                <CardHeader title="All Users" />
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-gold" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* Mobile View */}
                            <div className="block sm:hidden">
                                {users.length === 0 ? (
                                    <div className="p-8 text-center text-theme-muted">No users found</div>
                                ) : (
                                    users.map((user: any) => (
                                        <div key={user.id} className="p-4 border-b border-theme-border last:border-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={user.displayName || user.username} src={user.avatarUrl} size="sm" />
                                                    <div>
                                                        <p className="font-medium text-theme-text">{user.displayName || user.username}</p>
                                                        <p className="text-xs text-theme-muted">{user.email}</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' || user.role === 'super_admin'
                                                    ? 'bg-purple-500/10 text-purple-500'
                                                    : user.role === 'artist'
                                                        ? 'bg-blue-500/10 text-blue-500'
                                                        : 'bg-theme-border text-theme-muted'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.isVerified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    {user.isVerified ? 'Verified' : 'Unverified'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Desktop View */}
                            <table className="hidden sm:table w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-theme-border text-theme-muted text-sm">
                                        <th className="p-4 font-medium">User</th>
                                        <th className="p-4 font-medium">Role</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Joined</th>
                                        <th className="p-4 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-theme-text text-sm">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-theme-muted">
                                                No users found
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user: any) => (
                                            <tr key={user.id} className="border-b border-theme-border last:border-0 hover:bg-theme-surface/50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={user.displayName || user.username} src={user.avatarUrl} size="sm" />
                                                        <div>
                                                            <p className="font-medium">{user.displayName || user.username}</p>
                                                            <p className="text-xs text-theme-muted">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' || user.role === 'super_admin'
                                                        ? 'bg-purple-500/10 text-purple-500'
                                                        : user.role === 'artist'
                                                            ? 'bg-blue-500/10 text-blue-500'
                                                            : 'bg-theme-border text-theme-muted'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.isVerified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                                        }`}>
                                                        {user.isVerified ? 'Verified' : 'Unverified'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-theme-muted">
                                                    {formatDate(user.createdAt)}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination - Simple Implementation */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-theme-border">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-theme-muted">
                                Page {page} of {meta.totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page >= meta.totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}

export default AdminManagement;
