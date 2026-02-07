/**
 * User Settings Page
 * Fully responsive and functional settings management
 */

import React, { useState } from 'react';
import {
    Bell,
    Shield,
    CreditCard,
    Globe,
    Moon,
    Sun,
    Mail,
    Smartphone,
    Key,
    Trash2,
    Check,
    ChevronRight,
    LogOut
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Tabs, TabPanel, Badge } from '../../../components/ui';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../stores/useNotificationStore';
import { authService } from '../../../services/authService';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../lib/constants';

// Toggle switch component with enhanced mobile sizing and animation
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

// Setting Row component with responsive layout
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

export function Settings() {
    const { toggleTheme, isDark } = useTheme();
    const toast = useToast();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');

    // Notification settings state
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        newArtwork: true,
        priceAlerts: false,
        weeklyDigest: true,
    });

    // Security settings state
    const [security, setSecurity] = useState({
        twoFactor: false,
        loginAlerts: true,
    });

    const [language, setLanguage] = useState('en');

    // Handlers
    const handleNotificationChange = (key: keyof typeof notifications) => {
        setNotifications(prev => {
            const next = { ...prev, [key]: !prev[key] };
            // Mock API call to save preferences
            toast.success('Saved', 'Preference updated successfully');
            return next;
        });
    };

    const handleChangePassword = () => {
        // In a real app, this would open a modal or redirect to a secure flow
        toast.info('Check your email', 'We sent you a link to reset your password.');
    };

    const handleDeleteAccount = () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            toast.error('Account Deletion Initiated', 'Your request has been queued for processing.');
            // In reality, we would call an API endpoint here
        }
    };

    const handleLogout = () => {
        authService.logout();
        navigate(ROUTES.HOME);
        toast.success('Logged Out', 'See you next time!');
    };

    const tabs = [
        { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
        { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
    ];

    return (
        <PageContainer
            title="Account Settings"
            subtitle="Manage your preferences and security"
        >
            <div className="max-w-4xl mx-auto pb-20">
                {/* Mobile Scrollable Tabs Container */}
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
                        <Card variant="elevated" className="overflow-hidden">
                            <CardHeader
                                title="Appearance & Language"
                                subtitle="Customize how Seniqu looks and feels"
                            />
                            <CardContent className="divide-y divide-theme-border/50">
                                <SettingRow
                                    icon={isDark ? Moon : Sun}
                                    title="Theme Preference"
                                    description={`Currently using ${isDark ? 'Dark' : 'Light'} Mode`}
                                    action={
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={toggleTheme}
                                            className="min-w-[100px]"
                                            rightIcon={isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                        >
                                            {isDark ? 'Light Mode' : 'Dark Mode'}
                                        </Button>
                                    }
                                />
                                <SettingRow
                                    icon={Globe}
                                    title="Display Language"
                                    description="Select your preferred language interface"
                                    action={
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="px-4 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold appearance-none min-w-[140px]"
                                        >
                                            <option value="en">English (US)</option>
                                            <option value="id">Bahasa Indonesia</option>
                                            <option value="es">Español</option>
                                            <option value="fr">Français</option>
                                        </select>
                                    }
                                />
                            </CardContent>
                        </Card>

                        <div className="mt-8 flex justify-center">
                            <Button
                                variant="outline"
                                className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500"
                                onClick={handleLogout}
                                leftIcon={<LogOut className="w-4 h-4" />}
                            >
                                Sign Out
                            </Button>
                        </div>
                    </TabPanel>

                    {/* Notifications Settings */}
                    <TabPanel value="notifications" activeTab={activeTab}>
                        <div className="space-y-6">
                            <Card variant="elevated">
                                <CardHeader title="Channels" subtitle="Where you receive alerts" />
                                <CardContent>
                                    <SettingRow
                                        icon={Mail}
                                        title="Email Notifications"
                                        description="Receive updates, news, and alerts via email"
                                        action={
                                            <Toggle
                                                enabled={notifications.email}
                                                onChange={() => handleNotificationChange('email')}
                                            />
                                        }
                                    />
                                    <SettingRow
                                        icon={Smartphone}
                                        title="Push Notifications"
                                        description="Receive instant alerts on your mobile device"
                                        action={
                                            <Toggle
                                                enabled={notifications.push}
                                                onChange={() => handleNotificationChange('push')}
                                            />
                                        }
                                    />
                                </CardContent>
                            </Card>

                            <Card variant="elevated">
                                <CardHeader title="Preferences" subtitle="What you want to hear about" />
                                <CardContent>
                                    <SettingRow
                                        icon={Bell}
                                        title="New Artwork Alerts"
                                        description="When artists you follow upload new work"
                                        action={
                                            <Toggle
                                                enabled={notifications.newArtwork}
                                                onChange={() => handleNotificationChange('newArtwork')}
                                            />
                                        }
                                    />
                                    <SettingRow
                                        icon={CreditCard}
                                        title="Price Alerts"
                                        description="When bookmarked NFTs change price"
                                        action={
                                            <Toggle
                                                enabled={notifications.priceAlerts}
                                                onChange={() => handleNotificationChange('priceAlerts')}
                                            />
                                        }
                                    />
                                    <SettingRow
                                        icon={Mail}
                                        title="Weekly Digest"
                                        description="A summary of top art and community news"
                                        action={
                                            <Toggle
                                                enabled={notifications.weeklyDigest}
                                                onChange={() => handleNotificationChange('weeklyDigest')}
                                            />
                                        }
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabPanel>

                    {/* Security Settings */}
                    <TabPanel value="security" activeTab={activeTab}>
                        <div className="space-y-6">
                            <Card variant="elevated">
                                <CardHeader title="Authentication" />
                                <CardContent>
                                    <SettingRow
                                        icon={Key}
                                        title="Password"
                                        description="Last changed 3 months ago"
                                        action={
                                            <Button variant="secondary" size="sm" onClick={handleChangePassword}>
                                                Change Password
                                            </Button>
                                        }
                                    />
                                    <SettingRow
                                        icon={Shield}
                                        title="Two-Factor Authentication"
                                        description="Add an extra layer of security"
                                        action={
                                            <div className="flex items-center gap-3">
                                                {security.twoFactor ? (
                                                    <Badge variant="success" dot>Enabled</Badge>
                                                ) : (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => setSecurity({ ...security, twoFactor: true })}
                                                    >
                                                        Enable 2FA
                                                    </Button>
                                                )}
                                            </div>
                                        }
                                    />
                                    <SettingRow
                                        icon={Bell}
                                        title="Login Alerts"
                                        description="Get notified of new sign-ins from unknown devices"
                                        action={
                                            <Toggle
                                                enabled={security.loginAlerts}
                                                onChange={(v) => setSecurity({ ...security, loginAlerts: v })}
                                            />
                                        }
                                    />
                                </CardContent>
                            </Card>

                            <Card variant="elevated" className="border-red-500/20 bg-red-500/5">
                                <CardHeader
                                    title="Danger Zone"
                                    className="text-red-500"
                                />
                                <CardContent>
                                    <SettingRow
                                        icon={Trash2}
                                        title="Delete Account"
                                        description="Permanently delete your account and all data. This cannot be undone."
                                        destructive
                                        action={
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={handleDeleteAccount}
                                            >
                                                Delete Account
                                            </Button>
                                        }
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabPanel>

                    {/* Billing Settings */}
                    <TabPanel value="billing" activeTab={activeTab}>
                        <div className="space-y-6">
                            <Card variant="elevated" className="border-gold/30 bg-gold/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Shield className="w-32 h-32 text-gold" />
                                </div>
                                <CardHeader title="Active Plan" />
                                <CardContent className="relative z-10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="gold" className="text-sm px-3 py-1">PREMIUM PLAN</Badge>
                                                <span className="text-xs text-gold font-medium uppercase tracking-wider">Active</span>
                                            </div>
                                            <p className="text-3xl font-bold text-theme-text">$9.99<span className="text-base font-normal text-theme-muted">/month</span></p>
                                            <p className="text-sm text-theme-muted mt-2">Next billing date: March 1, 2026</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline">Cancel</Button>
                                            <Button variant="primary">Manage Subscription</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card variant="elevated">
                                <CardHeader title="Payment Method" />
                                <CardContent>
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-10 bg-theme-surface rounded-lg border border-theme-border flex items-center justify-center">
                                                <CreditCard className="w-6 h-6 text-theme-muted" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-theme-text flex items-center gap-2">
                                                    Visa ending in 4242
                                                    <Check className="w-4 h-4 text-green-500" />
                                                </p>
                                                <p className="text-sm text-theme-muted">Expires 12/26</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                                            Update
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card variant="elevated">
                                <CardHeader title="Billing History" />
                                <CardContent>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center justify-between py-2 border-b border-theme-border/50 last:border-0">
                                                <div>
                                                    <p className="font-medium text-theme-text">Premium Subscription</p>
                                                    <p className="text-sm text-theme-muted">Feb {i}, 2026</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-theme-text">$9.99</p>
                                                    <button className="text-xs text-gold hover:underline">Download Invocie</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabPanel>
                </div>
            </div>
        </PageContainer>
    );
}

export default Settings;
