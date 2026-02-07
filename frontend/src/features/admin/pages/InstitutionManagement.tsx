import { useState } from 'react';
import { usePendingInstitutions, useAllInstitutions, useVerifyInstitution } from '../../../hooks/useAdmin';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button } from '../../../components/ui';
import { formatDate } from '../../../lib/utils';
import { Loader2, Building2, CheckCircle, XCircle, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function InstitutionManagement() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

    const { data: pendingData, isLoading: isPendingLoading } = usePendingInstitutions();
    const { data: allData, isLoading: isAllLoading } = useAllInstitutions();
    const verifyMutation = useVerifyInstitution();

    const handleVerify = (id: string, verified: boolean) => {
        if (window.confirm(`Are you sure you want to ${verified ? 'approve' : 'reject'} this institution?`)) {
            verifyMutation.mutate({ id, verified });
        }
    };

    return (
        <PageContainer
            title="Institution Management"
            description="Manage museums and galleries"
            actions={
                <Button variant="gold" leftIcon={<Search className="w-4 h-4" />}>
                    Find Institution
                </Button>
            }
        >
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending'
                        ? 'border-gold text-gold'
                        : 'border-transparent text-theme-muted hover:text-theme-text'
                        }`}
                >
                    Pending Review
                    {(pendingData?.length ?? 0) > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-gold/20 text-gold rounded-full">
                            {pendingData?.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
                        ? 'border-gold text-gold'
                        : 'border-transparent text-theme-muted hover:text-theme-text'
                        }`}
                >
                    All Institutions
                </button>
            </div>

            <Card variant="elevated">
                <CardContent className="p-0">
                    {/* Pending Tab */}
                    {activeTab === 'pending' && (
                        isPendingLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                            </div>
                        ) : pendingData?.length === 0 ? (
                            <div className="p-8 text-center text-theme-muted">
                                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/20" />
                                <p>No pending approvals. All caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-theme-border">
                                {pendingData?.map((inst: any) => (
                                    <div key={inst.id} className="p-6 flex items-start gap-4 hover:bg-theme-surface/30 transition-colors">
                                        <div className="w-16 h-16 bg-theme-surface rounded-lg flex items-center justify-center border border-theme-border">
                                            {inst.logoUrl ? (
                                                <img src={inst.logoUrl} alt={inst.name} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <Building2 className="w-8 h-8 text-theme-muted" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-theme-text">{inst.name}</h3>
                                                    <p className="text-sm text-theme-muted mt-1 line-clamp-2">{inst.description || 'No description provided'}</p>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-theme-muted">
                                                        <span>ID: {inst.id}</span>
                                                        <span>Submitted: {formatDate(inst.createdAt)}</span>
                                                        <span>City: {inst.city || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(`/museums/${inst.slug}`)}
                                                        leftIcon={<ExternalLink className="w-4 h-4" />}
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mt-4">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleVerify(inst.id, true)}
                                                    isLoading={verifyMutation.isPending}
                                                    leftIcon={<CheckCircle className="w-4 h-4" />}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleVerify(inst.id, false)} // Implementation note: verify(false) is not delete, just unverify. Rejection might need delete in future.
                                                    disabled={verifyMutation.isPending}
                                                    leftIcon={<XCircle className="w-4 h-4" />}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* All Institutions Tab */}
                    {activeTab === 'all' && (
                        isAllLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                            </div>
                        ) : (
                            <>
                                {/* Mobile View */}
                                <div className="block sm:hidden">
                                    {allData?.data?.map((inst: any) => (
                                        <div key={inst.id} className="p-4 border-b border-theme-border last:border-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-theme-surface rounded flex items-center justify-center flex-shrink-0">
                                                        <Building2 className="w-5 h-5 text-theme-muted" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-theme-text">{inst.name}</p>
                                                        <p className="text-sm text-theme-muted">{inst.city}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${inst.isVerified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    {inst.isVerified ? 'Verified' : 'Pending'}
                                                </span>
                                                <span className="text-xs text-theme-muted">{formatDate(inst.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop View */}
                                <table className="hidden sm:table w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-theme-border text-theme-muted text-sm">
                                            <th className="p-4 font-medium">Name</th>
                                            <th className="p-4 font-medium">City</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-theme-text text-sm">
                                        {allData?.data?.map((inst: any) => (
                                            <tr key={inst.id} className="border-b border-theme-border last:border-0 hover:bg-theme-surface/50">
                                                <td className="p-4 font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-theme-surface rounded flex items-center justify-center">
                                                            <Building2 className="w-4 h-4 text-theme-muted" />
                                                        </div>
                                                        {inst.name}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-theme-muted">{inst.city}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${inst.isVerified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                                        }`}>
                                                        {inst.isVerified ? 'Verified' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-theme-muted">{formatDate(inst.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}

export default InstitutionManagement;
