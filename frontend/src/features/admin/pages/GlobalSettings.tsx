import React, { useState } from 'react';
import { Save, Globe, Shield, Database, Mail, Server, CreditCard, AlertTriangle, Settings, Building2, Bell } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Button, Badge } from '../../../components/ui';
import { useToast } from '../../../stores/useNotificationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../stores/useAuthStore';

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${enabled ? 'bg-indigo-500' : 'bg-gray-200'}`}
        >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    );
}

function SettingRow({ icon: Icon, title, description, action, destructive = false }: { icon: React.ElementType, title: string, description: string, action: React.ReactNode, destructive?: boolean }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors px-4 -mx-4 rounded-xl">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${destructive ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="font-bold text-gray-900 text-sm">{title}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>
            <div>{action}</div>
        </div>
    );
}

export function GlobalSettings() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('general');

    const [settings, setSettings] = useState({
        maintenanceMode: false,
        registrationEnabled: true,
        requireEmailVerification: true,
        enableArtMarketplace: true,
        enableForums: true,
        debugMode: false,
    });

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => {
            const next = { ...prev, [key]: !prev[key] };
            toast.success('Settings Updated', `${key} has been ${next[key] ? 'enabled' : 'disabled'}`);
            return next;
        });
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'features', label: 'Features', icon: Database },
        { id: 'system', label: 'System', icon: Server },
    ];

    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'super_admin';

    const visibleTabs = isSuperAdmin 
        ? tabs 
        : [
            { id: 'general', label: 'Institution Settings', icon: Building2 },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ];

    // If non-super admin and tries to access a hidden tab, reset to general
    if (!isSuperAdmin && !['general', 'notifications'].includes(activeTab)) {
        setActiveTab('general');
    }

    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-bold px-3 py-1 mb-3">Configuration</Badge>
                        <h1 className="text-4xl font-bold text-gray-900 font-serif tracking-tight">
                            {isSuperAdmin ? 'Global Settings' : 'Institution Settings'}
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">
                            {isSuperAdmin ? 'Manage core platform behavior and features.' : 'Configure your institution preferences.'}
                        </p>
                    </div>
                    <Button className="!rounded-xl !px-6 !py-2.5 !bg-indigo-600 hover:!bg-indigo-700 !text-white shadow-lg font-bold" leftIcon={<Save className="w-4 h-4" />}>
                        Save Changes
                    </Button>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
                        {visibleTabs.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-indigo-600' : 'text-gray-400'}`} /> {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'general' && isSuperAdmin && (
                                    <div className="space-y-2">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Platform Controls</h3>
                                            <p className="text-sm text-gray-500">Operational settings for the entire platform.</p>
                                        </div>
                                        <SettingRow icon={Globe} title="Maintenance Mode" description="Put site in maintenance mode. Only admins can access." destructive action={<Toggle enabled={settings.maintenanceMode} onChange={() => handleToggle('maintenanceMode')} />} />
                                        <SettingRow icon={Server} title="User Registration" description="Allow new users to sign up via public registration." action={<Toggle enabled={settings.registrationEnabled} onChange={() => handleToggle('registrationEnabled')} />} />
                                    </div>
                                )}

                                {activeTab === 'general' && !isSuperAdmin && (
                                    <div className="space-y-2">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Institution Configuration</h3>
                                            <p className="text-sm text-gray-500">Manage visibility and access to your institutional profile.</p>
                                        </div>
                                        <SettingRow icon={Globe} title="Public Profile" description="Allow your institution to be discovered by the public." action={<Toggle enabled={true} onChange={() => {}} />} />
                                        <SettingRow icon={Mail} title="Contact Form" description="Enable public users to send inquiries to your institution." action={<Toggle enabled={true} onChange={() => {}} />} />
                                    </div>
                                )}

                                {activeTab === 'notifications' && !isSuperAdmin && (
                                    <div className="space-y-2">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Notification Preferences</h3>
                                            <p className="text-sm text-gray-500">Configure how you receive alerts.</p>
                                        </div>
                                        <SettingRow icon={Bell} title="Email Alerts" description="Receive emails for new ticket purchases or bookings." action={<Toggle enabled={true} onChange={() => {}} />} />
                                    </div>
                                )}

                                {activeTab === 'security' && isSuperAdmin && (
                                    <div className="space-y-2">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Access Control</h3>
                                            <p className="text-sm text-gray-500">Security and verification policies.</p>
                                        </div>
                                        <SettingRow icon={Mail} title="Require Email Verification" description="Users must verify their email address before accessing features." action={<Toggle enabled={settings.requireEmailVerification} onChange={() => handleToggle('requireEmailVerification')} />} />
                                    </div>
                                )}

                                {activeTab === 'features' && isSuperAdmin && (
                                    <div className="space-y-2">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Feature Management</h3>
                                            <p className="text-sm text-gray-500">Enable or disable specific platform modules.</p>
                                        </div>
                                        <SettingRow icon={CreditCard} title="Art Marketplace" description="Enable Art trading, minting, and wallet features." action={<Toggle enabled={settings.enableArtMarketplace} onChange={() => handleToggle('enableArtMarketplace')} />} />
                                        <SettingRow icon={Database} title="Community Forums" description="Enable public discussion forums and topics." action={<Toggle enabled={settings.enableForums} onChange={() => handleToggle('enableForums')} />} />
                                    </div>
                                )}

                                {activeTab === 'system' && isSuperAdmin && (
                                    <div className="space-y-2">
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">System Configuration</h3>
                                            <p className="text-sm text-gray-500">Advanced settings and debugging.</p>
                                        </div>
                                        <SettingRow icon={AlertTriangle} title="Debug Mode" description="Enable verbose logging across the platform. (Affects performance)" destructive action={<Toggle enabled={settings.debugMode} onChange={() => handleToggle('debugMode')} />} />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

export default GlobalSettings;
