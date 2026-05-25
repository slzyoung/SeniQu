import { useState } from 'react';
import { useUsers, useCreateAdminUser, useUpdateUserRole, useDeleteUser } from '../../../hooks/useAdmin';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Avatar, Modal, Input, Select, Badge } from '../../../components/ui';
import { formatDate, extractArray, extractPagination } from '../../../lib/utils';
import {
    Loader2, Search, MoreVertical, Building2,
    Shield, Mail, Calendar, CheckCircle2, XCircle, UserPlus, Crown,
    Palette, Lock, Eye, ChevronLeft, ChevronRight, Hash, Trash2, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// ── Role badge renderer ──
function RoleBadge({ role }: { role: string }) {
    const map: Record<string, { bg: string; text: string; icon: any }> = {
        super_admin: { bg: 'bg-gradient-to-r from-red-500 to-rose-600', text: 'text-white', icon: Crown },
        admin: { bg: 'bg-gradient-to-r from-purple-500 to-indigo-600', text: 'text-white', icon: Shield },
        artist: { bg: 'bg-gradient-to-r from-emerald-400 to-teal-500', text: 'text-white', icon: Palette },
        collector: { bg: 'bg-gradient-to-r from-amber-400 to-orange-500', text: 'text-white', icon: Crown },
        user: { bg: 'bg-gray-100 border border-gray-200', text: 'text-gray-600', icon: Eye },
    };
    const cfg = map[role] || map.user;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} shadow-sm`}>
            <Icon className="w-3 h-3" /> {role.replace('_', ' ').toUpperCase()}
        </span>
    );
}

// ── Provision step wizard ──
const STEPS = ['Account Type', 'Identity', 'Domain Config', 'Review'] as const;

export function AdminManagement() {
    const [page, setPage] = useState(1);
    const { data: response, isLoading } = useUsers(page);
    const users = extractArray(response).map(mapUser);
    const meta = extractPagination(response);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const createAdminMutation = useCreateAdminUser();
    const updateRoleMutation = useUpdateUserRole();
    const deleteUserMutation = useDeleteUser();

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editRoleUser, setEditRoleUser] = useState<any>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    // ── Wizard state ──
    const [step, setStep] = useState(0);
    const [createType, setCreateType] = useState<'admin' | 'artist'>('admin');
    const [formData, setFormData] = useState({
        email: '', username: '', displayName: '',
        role: 'admin', adminRoleTyped: 'MUSEUM_ADMIN', scopeId: '',
        institutionName: '', city: '', category: 'museum',
    });
    const [provisionMode, setProvisionMode] = useState<'existing' | 'new'>('existing');

    const resetWizard = () => {
        setStep(0);
        setCreateType('admin');
        setProvisionMode('existing');
        setFormData({ email: '', username: '', displayName: '', role: 'admin', adminRoleTyped: 'MUSEUM_ADMIN', scopeId: '', institutionName: '', city: '', category: 'museum' });
    };

    const handleCreateSubmit = async () => {
        const payload = { ...formData };
        if (createType === 'artist') {
            payload.role = 'artist';
            payload.adminRoleTyped = 'ARTIST_ADMIN';
            payload.scopeId = '';
        }
        if (provisionMode === 'new') {
            payload.scopeId = ''; // backend will auto-create
        }
        await createAdminMutation.mutateAsync(payload);
        setIsCreateModalOpen(false);
        resetWizard();
    };

    const canProceed = () => {
        if (step === 0) return true;
        if (step === 1) return formData.email && formData.username && formData.displayName;
        if (step === 2) {
            if (createType === 'artist') return true;
            if (provisionMode === 'existing') return !!formData.scopeId;
            return formData.institutionName && formData.city;
        }
        return true;
    };

    // ── Filter users ──
    const filteredUsers = users.filter(u => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
        }
        return true;
    });

    const handleDeleteUser = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to permanently delete user ${name}? This action cannot be undone.`)) {
            await deleteUserMutation.mutateAsync(id);
            setOpenMenuId(null);
        }
    };

    const handleEditRoleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editRoleUser) {
            await updateRoleMutation.mutateAsync({ userId: editRoleUser.id, role: editRoleUser.newRole });
            setEditRoleUser(null);
            setOpenMenuId(null);
        }
    };

    const roleCounts = users.reduce((acc: Record<string, number>, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {});

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-7xl mx-auto">
                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                    <div>
                        <Badge className="backdrop-blur-md bg-indigo-100 text-indigo-700 border-indigo-200 font-bold px-3 py-1 mb-3">Super Admin · Access Control</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">Access Management</h1>
                        <p className="text-gray-500 mt-2 font-medium">Provision, oversee, and manage every account on the platform.</p>
                    </div>
                    <Button
                        className="!rounded-xl !px-6 !py-2.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white shadow-lg shadow-indigo-600/20 font-bold"
                        leftIcon={<UserPlus className="w-4 h-4" />}
                        onClick={() => { resetWizard(); setIsCreateModalOpen(true); }}
                    >
                        Provision Account
                    </Button>
                </div>

                {/* ── Role Summary Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'Total Users', value: meta?.total || users.length, filter: 'all', color: 'from-gray-600 to-gray-800', bg: 'bg-gray-50' },
                        { label: 'Admins', value: (roleCounts['admin'] || 0) + (roleCounts['super_admin'] || 0), filter: 'admin', color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50' },
                        { label: 'Artists', value: roleCounts['artist'] || 0, filter: 'artist', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
                        { label: 'Collectors', value: roleCounts['collector'] || 0, filter: 'collector', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
                        { label: 'Regular', value: roleCounts['user'] || 0, filter: 'user', color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50' },
                    ].map((c, i) => (
                        <motion.button key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            onClick={() => setRoleFilter(c.filter)}
                            className={`text-left p-4 rounded-[20px] border transition-all ${roleFilter === c.filter ? 'border-indigo-300 shadow-md ring-2 ring-indigo-100' : 'border-gray-100 hover:shadow-sm'} ${c.bg}`}>
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white mb-3 shadow`}>
                                <Hash className="w-4 h-4" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                            <p className="text-sm font-semibold text-gray-500 mt-0.5">{c.label}</p>
                        </motion.button>
                    ))}
                </div>

                {/* ── Search ── */}
                <div className="relative mb-5 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search by name, email, or username..."
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm" />
                </div>

                {/* ── User Table ── */}
                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-24"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <Shield className="w-14 h-14 text-gray-200 mb-3" />
                            <p className="font-bold text-gray-900 text-lg">No accounts match</p>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 bg-gray-50/60 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                <div className="col-span-4">Identity</div>
                                <div className="col-span-3">Role</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Registered</div>
                                <div className="col-span-1 text-right">More</div>
                            </div>
                            <AnimatePresence>
                                {filteredUsers.map((user, idx) => (
                                    <motion.div key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 md:px-8 py-4 items-center hover:bg-indigo-50/20 transition-colors border-b border-gray-50 last:border-0">
                                        <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                                            <Avatar name={user.displayName || user.username} src={user.avatarUrl} size="md" className="ring-2 ring-white shadow-sm" />
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{user.displayName || user.username}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate"><Mail className="w-3 h-3 shrink-0" /> {user.email}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-1 md:col-span-3"><RoleBadge role={user.role} /></div>
                                        <div className="col-span-1 md:col-span-2">
                                            {user.isVerified
                                                ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckCircle2 className="w-4 h-4" />Verified</span>
                                                : <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500"><XCircle className="w-4 h-4" />Pending</span>}
                                        </div>
                                        <div className="col-span-1 md:col-span-2 text-sm text-gray-500 font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" />{formatDate(user.createdAt)}</div>
                                        <div className="col-span-1 md:col-span-1 flex justify-end relative">
                                            <button 
                                                onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            
                                            <AnimatePresence>
                                                {openMenuId === user.id && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                                                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                        className="absolute right-0 top-10 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 py-1"
                                                    >
                                                        <button 
                                                            onClick={() => { setEditRoleUser({ ...user, newRole: user.role }); setOpenMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" /> Edit Role
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUser(user.id, user.displayName)}
                                                            className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete User
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </>
                    )}

                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100 bg-gray-50/50">
                            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors">
                                <ChevronLeft className="w-4 h-4" />Previous
                            </button>
                            <span className="text-sm font-bold text-gray-500">Page {page} / {meta.totalPages}</span>
                            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors">
                                Next<ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                 EDIT ROLE MODAL
               ═══════════════════════════════════════════════ */}
            <Modal isOpen={!!editRoleUser} onClose={() => setEditRoleUser(null)} title="Change User Role" size="md">
                {editRoleUser && (
                    <form onSubmit={handleEditRoleSubmit} className="space-y-5">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <Avatar name={editRoleUser.displayName} src={editRoleUser.avatarUrl} size="md" />
                            <div>
                                <p className="font-bold text-gray-900">{editRoleUser.displayName}</p>
                                <p className="text-xs text-gray-500">{editRoleUser.email}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Assign New Role</label>
                            <Select
                                value={editRoleUser.newRole}
                                onChange={(val) => setEditRoleUser({ ...editRoleUser, newRole: val as string })}
                                options={[
                                    { label: 'Regular User', value: 'user' },
                                    { label: 'Collector', value: 'collector' },
                                    { label: 'Artist / Creator', value: 'artist' },
                                    { label: 'Administrator (Institution)', value: 'admin' },
                                    { label: 'Super Admin', value: 'super_admin' },
                                ]}
                            />
                            <p className="text-xs text-gray-500 mt-1">Changing this role will immediately affect the user's access level across the platform.</p>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setEditRoleUser(null)} type="button">Cancel</Button>
                            <Button 
                                variant="gold" 
                                type="submit" 
                                className="!bg-indigo-600 hover:!bg-indigo-700 !text-white !border-0"
                                isLoading={updateRoleMutation.isPending}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ═══════════════════════════════════════════════
                 PROVISION WIZARD MODAL
               ═══════════════════════════════════════════════ */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="" size="lg">
                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
                            <span className={`text-xs font-bold hidden sm:inline ${i <= step ? 'text-indigo-700' : 'text-gray-400'}`}>{s}</span>
                            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-indigo-500' : 'bg-gray-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* Best Practice Notice */}
                <div className="mb-6 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-3">
                    <Lock className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-indigo-800 leading-relaxed">
                        <strong>Auto-Verified:</strong> Accounts provisioned by Super Admin are pre-verified. The user receives a temporary password via email and must change it on first login.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── Step 0: Account Type ── */}
                    {step === 0 && (
                        <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Select Account Type</h3>
                            <p className="text-sm text-gray-500 mb-6">Choose the kind of role you want to provision.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setCreateType('admin')}
                                    className={`p-5 rounded-[20px] border-2 text-left transition-all ${createType === 'admin' ? 'border-indigo-500 bg-indigo-50/50 shadow-lg' : 'border-gray-200 hover:border-indigo-200'}`}>
                                    <Building2 className={`w-8 h-8 mb-3 ${createType === 'admin' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <h4 className="font-bold text-gray-900">Institution Admin</h4>
                                    <p className="text-xs text-gray-500 mt-1">Museum, Gallery, or Heritage site administrator.</p>
                                </button>
                                <button onClick={() => setCreateType('artist')}
                                    className={`p-5 rounded-[20px] border-2 text-left transition-all ${createType === 'artist' ? 'border-emerald-500 bg-emerald-50/50 shadow-lg' : 'border-gray-200 hover:border-emerald-200'}`}>
                                    <Palette className={`w-8 h-8 mb-3 ${createType === 'artist' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    <h4 className="font-bold text-gray-900">Artist / Creator</h4>
                                    <p className="text-xs text-gray-500 mt-1">Independent artist who mints and manages artworks.</p>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 1: Identity ── */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Account Identity</h3>
                            <p className="text-sm text-gray-500 mb-6">Enter the person's credentials. A temporary password will be generated.</p>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Email Address" type="email" placeholder="user@example.com" required
                                        value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
                                    <Input label="Username" placeholder="unique_handle" required
                                        value={formData.username} onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))} />
                                </div>
                                <Input label="Display Name" placeholder="Full name or entity name" required
                                    value={formData.displayName} onChange={(e) => setFormData(p => ({ ...p, displayName: e.target.value }))} />
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 2: Domain Config ── */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            {createType === 'admin' ? (
                                <>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Domain Allocation</h3>
                                    <p className="text-sm text-gray-500 mb-6">Assign an institution scope for this administrator.</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Admin Domain</label>
                                            <Select value={formData.adminRoleTyped}
                                                onChange={(v) => setFormData(p => ({ ...p, adminRoleTyped: v as string }))}
                                                options={[
                                                    { label: 'Museum Administrator', value: 'MUSEUM_ADMIN' },
                                                    { label: 'Gallery Administrator', value: 'GALLERY_ADMIN' },
                                                    { label: 'Heritage Site Administrator', value: 'HERITAGE_ADMIN' },
                                                ]} />
                                        </div>
                                        <div className="flex bg-gray-100 p-1 rounded-xl">
                                            <button type="button" onClick={() => setProvisionMode('existing')}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${provisionMode === 'existing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
                                                Link Existing
                                            </button>
                                            <button type="button" onClick={() => setProvisionMode('new')}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${provisionMode === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
                                                Create New
                                            </button>
                                        </div>
                                        {provisionMode === 'existing' ? (
                                            <Input label="Scope ID (Institution UUID)" placeholder="Paste existing institution ID"
                                                value={formData.scopeId} onChange={(e) => setFormData(p => ({ ...p, scopeId: e.target.value }))} />
                                        ) : (
                                            <div className="space-y-3">
                                                <Input label="Institution Name" placeholder="e.g. Museum Nasional Indonesia"
                                                    value={formData.institutionName} onChange={(e) => setFormData(p => ({ ...p, institutionName: e.target.value }))} />
                                                <Input label="City" placeholder="e.g. Jakarta"
                                                    value={formData.city} onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} />
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">Artist Privileges</h3>
                                    <p className="text-sm text-gray-500 mb-6">This account will be granted full artist capabilities.</p>
                                    <div className="bg-emerald-50 p-5 rounded-[20px] border border-emerald-100 space-y-3">
                                        <Palette className="w-8 h-8 text-emerald-600" />
                                        <p className="text-sm font-medium text-emerald-800 leading-relaxed">
                                            The artist will be able to upload artworks, create collections, list on the marketplace, and track analytics — all pre-verified with no further approval needed.
                                        </p>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* ── Step 3: Review ── */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Review & Confirm</h3>
                            <p className="text-sm text-gray-500 mb-6">Double-check before provisioning.</p>
                            <div className="bg-gray-50 rounded-[20px] p-5 space-y-3 border border-gray-100">
                                <Row label="Type" value={createType === 'admin' ? 'Institution Admin' : 'Artist / Creator'} />
                                <Row label="Email" value={formData.email} />
                                <Row label="Username" value={formData.username} />
                                <Row label="Display Name" value={formData.displayName} />
                                {createType === 'admin' && <Row label="Domain" value={formData.adminRoleTyped.replace('_', ' ')} />}
                                {createType === 'admin' && provisionMode === 'existing' && <Row label="Scope ID" value={formData.scopeId || '—'} />}
                                {createType === 'admin' && provisionMode === 'new' && <Row label="New Institution" value={formData.institutionName} />}
                                <Row label="Verification" value="Auto-verified (Super Admin)" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Navigation Buttons ── */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                    <Button variant="outline" className="!rounded-xl font-bold border-gray-200"
                        onClick={() => step === 0 ? setIsCreateModalOpen(false) : setStep(s => s - 1)}>
                        {step === 0 ? 'Cancel' : 'Back'}
                    </Button>
                    {step < 3 ? (
                        <Button className="!rounded-xl font-bold !bg-indigo-600 hover:!bg-indigo-700 !text-white shadow-lg shadow-indigo-600/20"
                            disabled={!canProceed()} onClick={() => setStep(s => s + 1)}>
                            Continue
                        </Button>
                    ) : (
                        <Button className={`!rounded-xl font-bold shadow-lg ${createType === 'admin' ? '!bg-indigo-600 hover:!bg-indigo-700 !text-white shadow-indigo-600/20' : '!bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-emerald-600/20'}`}
                            disabled={createAdminMutation.isPending} onClick={handleCreateSubmit}>
                            {createAdminMutation.isPending ? 'Provisioning…' : `Provision ${createType === 'admin' ? 'Admin' : 'Artist'}`}
                        </Button>
                    )}
                </div>
            </Modal>
        </PageContainer>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">{label}</span>
            <span className="font-bold text-gray-900">{value}</span>
        </div>
    );
}

export default AdminManagement;
