/**
 * Admin Global Settings Page
 * Manage platform-wide configurations
 */

import React, { useState } from 'react';
import {
    Save,
    Globe,
    Shield,
    Database,
    Mail,
    Server,
    CreditCard,
    AlertTriangle
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Tabs, TabPanel } from '../../../components/ui';
import { useToast } from '../../../stores/useNotificationStore';

// Toggle switch component (reused locally for now)
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`
                relative w-12 h-7 md:w-14 md:h-8 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold/50
                ${enabled ? 'bg-gold' : 'bg-theme-border'}
            `}
            aria-checked={enabled}
            role="switch"
        >
            <span className="sr-only">Toggle setting</span>
            <div
                className={`
                    absolute top-1 left-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full 
                    transition-transform duration-200 ease-in-out shadow-sm
                    ${enabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}
                `}
            />
        </button>
    );
}

// Setting Row component
function SettingRow({
    icon: Icon,
    title,
    description,
    action,
    destructive = false
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    action: React.ReactNode;
    destructive?: boolean;
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between py-5 border-b border-theme-border last:border-b-0 gap-4 md:gap-0">
            <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${destructive ? 'bg-red-500/10 text-red-500' : 'bg-theme-elevated text-gold'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className={`font-medium text-base ${destructive ? 'text-red-500' : 'text-theme-text'}`}>{title}</p>
                    <p className="text-sm text-theme-muted mt-0.5 leading-relaxed">{description}</p>
                </div>
            </div>
            <div className="flex items-center justify-end md:justify-start pl-[3.25rem] md:pl-0">
                {action}
            </div>
        </div>
    );
}

export default function GlobalSettings() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('general');

    // MOCK STATE (In real app, fetch from backend)
    const [settings, setSettings] = useState({
        maintenanceMode: false,
        registrationEnabled: true,
        requireEmailVerification: true,
        enableNFTMarketplace: true,
        enableForums: true,
        debugMode: false,
    });

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => {
            const next = { ...prev, [key]: !prev[key] };
            toast.success('Setting Updated', `${key} has been ${next[key] ? 'enabled' : 'disabled'}`);
            return next;
        });
    };

    const tabs = [
        { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
        { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
        { id: 'features', label: 'Features', icon: <Database className="w-4 h-4" /> },
        { id: 'system', label: 'System', icon: <Server className="w-4 h-4" /> },
    ];

    return (
        <PageContainer
            title="Global Settings"
            subtitle="Configure platform-wide parameters and features"
            actions={
                <Button leftIcon={<Save className="w-4 h-4" />}>
                    Save Changes
                </Button>
            }
        >
            <div className="max-w-4xl mx-auto pb-20">
                <div className="sticky top-0 z-10 bg-theme-bg/95 backdrop-blur-sm -mx-4 px-4 md:mx-0 md:px-0 pt-2 pb-4 overflow-x-auto no-scrollbar">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        variant="pills"
                        className="min-w-max"
                    />
                </div>

                <div className="mt-4">
                    {/* General Settings */}
                    <TabPanel value="general" activeTab={activeTab}>
                        <Card variant="elevated">
                            <CardHeader title="Platform Controls" subtitle="Operational settings for Seniqu" />
                            <CardContent>
                                <SettingRow
                                    icon={Globe}
                                    title="Maintenance Mode"
                                    description="Put the site in maintenance mode. Only admins can access."
                                    destructive
                                    action={
                                        <Toggle
                                            enabled={settings.maintenanceMode}
                                            onChange={() => handleToggle('maintenanceMode')}
                                        />
                                    }
                                />
                                <SettingRow
                                    icon={Server}
                                    title="User Registration"
                                    description="Allow new users to sign up"
                                    action={
                                        <Toggle
                                            enabled={settings.registrationEnabled}
                                            onChange={() => handleToggle('registrationEnabled')}
                                        />
                                    }
                                />
                            </CardContent>
                        </Card>
                    </TabPanel>

                    {/* Security Settings */}
                    <TabPanel value="security" activeTab={activeTab}>
                        <Card variant="elevated">
                            <CardHeader title="Access Control" subtitle="Security and verification policies" />
                            <CardContent>
                                <SettingRow
                                    icon={Mail}
                                    title="Require Email Verification"
                                    description="Users must verify email before accessing features"
                                    action={
                                        <Toggle
                                            enabled={settings.requireEmailVerification}
                                            onChange={() => handleToggle('requireEmailVerification')}
                                        />
                                    }
                                />
                            </CardContent>
                        </Card>
                    </TabPanel>

                    {/* Feature Flags */}
                    <TabPanel value="features" activeTab={activeTab}>
                        <Card variant="elevated">
                            <CardHeader title="Feature Management" subtitle="Enable or disable specific modules" />
                            <CardContent>
                                <SettingRow
                                    icon={CreditCard}
                                    title="NFT Marketplace"
                                    description="Enable NFT trading and minting features"
                                    action={
                                        <Toggle
                                            enabled={settings.enableNFTMarketplace}
                                            onChange={() => handleToggle('enableNFTMarketplace')}
                                        />
                                    }
                                />
                                <SettingRow
                                    icon={Database}
                                    title="Community Forums"
                                    description="Enable public discussion forums"
                                    action={
                                        <Toggle
                                            enabled={settings.enableForums}
                                            onChange={() => handleToggle('enableForums')}
                                        />
                                    }
                                />
                            </CardContent>
                        </Card>
                    </TabPanel>

                    {/* System Settings */}
                    <TabPanel value="system" activeTab={activeTab}>
                        <Card variant="elevated">
                            <CardHeader title="System Configuration" />
                            <CardContent>
                                <SettingRow
                                    icon={AlertTriangle}
                                    title="Debug Mode"
                                    description="Enable verbose logging (Performance impact)"
                                    action={
                                        <Toggle
                                            enabled={settings.debugMode}
                                            onChange={() => handleToggle('debugMode')}
                                        />
                                    }
                                />
                            </CardContent>
                        </Card>
                    </TabPanel>
                </div>
            </div>
        </PageContainer>
    );
}
