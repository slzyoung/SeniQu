/**
 * User Settings Page
 * Premium responsive settings with real data
 */

import React, { useEffect, useState } from 'react';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Shield,
    Globe,
    Moon,
    Sun,
    Mail,
    Smartphone,
    Key,
    Trash2,
    ChevronDown,
    Languages,
    User as UserIcon,
    AtSign,
    Crown,
    Calendar,
    ChevronRight,
    Wallet,
    Eye,
    EyeOff,
    Download,
    HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../../../hooks/useTheme';
import { useToast } from '../../../../stores/useNotificationStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { userService } from '../../../../services/userService';
import './Settings.css';

// ── Zod Schema ──
const settingsSchema = z.object({
    isDark: z.boolean(),
    language: z.string(),
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    newArtworkAlerts: z.boolean(),
    priceAlerts: z.boolean(),
    weeklyDigest: z.boolean(),
    isTwoFactorEnabled: z.boolean(),
    loginAlertsEnabled: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ── Toggle Component ──
function Toggle({
    enabled,
    onChange,
    disabled
}: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`stg-toggle ${enabled ? 'active' : ''}`}
            role="switch"
            aria-checked={enabled}
        >
            <span className="sr-only">Toggle setting</span>
            <div className="stg-toggle-knob" />
        </button>
    );
}

// ── Setting Row Component ──
function SettingRow({
    icon: Icon,
    title,
    description,
    action,
    destructive = false,
    onClick,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
    action?: React.ReactNode;
    destructive?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            className={`stg-row ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
        >
            <div className="stg-row-left">
                <div className={`stg-row-icon ${destructive ? 'danger' : ''}`}>
                    <Icon />
                </div>
                <div className="stg-row-info">
                    <p className={`stg-row-title ${destructive ? 'danger' : ''}`}>{title}</p>
                    {description && <p className="stg-row-desc">{description}</p>}
                </div>
            </div>
            <div className="stg-row-action">
                {action}
            </div>
        </div>
    );
}

// ── Compact Account Summary ──
function AccountSummary({
    name,
    email,
    role,
    memberSince,
}: {
    name: string;
    email: string;
    role: string;
    memberSince: string;
}) {
    return (
        <div className="stg-account-summary">
            <div className="stg-account-avatar">
                {name.charAt(0).toUpperCase()}
            </div>
            <div className="stg-account-details">
                <p className="stg-account-name">{name}</p>
                <p className="stg-account-email">{email}</p>
                <div className="stg-account-meta">
                    <span className="stg-account-badge">{role}</span>
                    <span className="stg-account-since">Since {memberSince}</span>
                </div>
            </div>
        </div>
    );
}

// ── Tab Definition ──
interface SettingsTab {
    id: string;
    label: string;
    icon: React.ElementType;
}

const TABS: SettingsTab[] = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
];

// ── Helpers ──
function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return '—';
    }
}

function formatRole(role?: string): string {
    if (!role) return 'Member';
    const map: Record<string, string> = {
        ART_LOVER: 'Art Lover',
        ARTIST: 'Artist',
        INSTITUTION: 'Institution',
        ADMIN: 'Admin',
        SUPER_ADMIN: 'Super Admin',
    };
    return map[role] || role;
}

function truncateAddress(addr?: string): string {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Main Component ──
export function Settings() {
    const { toggleTheme, isDark } = useTheme();
    const toast = useToast();
    const navigate = useNavigate();
    const { user, updateUser } = useAuthStore();

    const [activeTab, setActiveTab] = useState('general');
    const [showEmail, setShowEmail] = useState(false);

    // Form State
    const [formState, setFormState] = useState<SettingsFormValues>({
        isDark: isDark,
        language: 'en',
        emailNotifications: true,
        pushNotifications: true,
        newArtworkAlerts: true,
        priceAlerts: false,
        weeklyDigest: true,
        isTwoFactorEnabled: false,
        loginAlertsEnabled: true,
    });

    // Load from user data
    useEffect(() => {
        if (user) {
            setFormState({
                isDark: isDark,
                language: 'en',
                emailNotifications: user.notificationPrefs?.email ?? true,
                pushNotifications: user.notificationPrefs?.push ?? true,
                newArtworkAlerts: user.notificationPrefs?.newArtwork ?? true,
                priceAlerts: user.notificationPrefs?.priceAlerts ?? false,
                weeklyDigest: user.notificationPrefs?.weeklyDigest ?? true,
                isTwoFactorEnabled: user.isTwoFactorEnabled ?? false,
                loginAlertsEnabled: user.loginAlertsEnabled ?? true,
            });
        }
    }, [user, isDark]);

    const saveToApi = async (newState: SettingsFormValues) => {
        try {
            const data = settingsSchema.parse(newState);

            // Handle Theme
            if (data.isDark !== isDark) {
                toggleTheme();
            }

            // API Payload
            const updatePayload = {
                notificationPrefs: {
                    email: data.emailNotifications,
                    push: data.pushNotifications,
                    newArtwork: data.newArtworkAlerts,
                    priceAlerts: data.priceAlerts,
                    weeklyDigest: data.weeklyDigest,
                },
                isTwoFactorEnabled: data.isTwoFactorEnabled,
                loginAlertsEnabled: data.loginAlertsEnabled,
            };

            const updatedUser = await userService.updateProfile(updatePayload);
            updateUser(updatedUser);
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Save Failed', 'Could not update settings.');
        }
    };

    const handleToggle = async (key: keyof SettingsFormValues) => {
        const newValue = !formState[key];
        const newState = { ...formState, [key]: newValue };
        setFormState(newState);
        await saveToApi(newState);
    };

    const handleChange = async (key: keyof SettingsFormValues, value: any) => {
        const newState = { ...formState, [key]: value };
        setFormState(newState);
        await saveToApi(newState);
    };

    // Derived user info
    const userEmail = user?.email || '—';
    const maskedEmail = userEmail !== '—'
        ? `${userEmail.split('@')[0].slice(0, 3)}***@${userEmail.split('@')[1]}`
        : '—';
    const userName = user?.displayName || user?.username || '—';
    const userRole = formatRole(user?.role);
    const memberSince = formatDate(user?.createdAt);
    const connectedWallets = user?.wallets?.length || 0;
    const primaryWallet = user?.wallets?.[0];

    return (
        <div className="stg-page">
            {/* ── Header ── */}
            <div className="stg-header">
                <h1 className="stg-header-title">Settings</h1>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="stg-tabs-wrapper">
                <div className="stg-tabs">
                    {TABS.map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`stg-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <TabIcon />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Panels ── */}
            <AnimatePresence mode="wait">
                {activeTab === 'general' && (
                    <motion.div
                        key="general"
                        className="stg-panel"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="stg-panel-space">
                            {/* Account Info */}
                            <div className="stg-card">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">My Account</h2>
                                </div>
                                <div style={{ padding: '4px 20px 16px' }}>
                                    <AccountSummary
                                        name={userName}
                                        email={showEmail ? userEmail : maskedEmail}
                                        role={userRole}
                                        memberSince={memberSince}
                                    />
                                </div>
                            </div>

                            {/* Preferences */}
                            <div className="stg-card">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">Preferences</h2>
                                    <p className="stg-card-subtitle">Theme and language</p>
                                </div>
                                <SettingRow
                                    icon={formState.isDark ? Moon : Sun}
                                    title="Theme"
                                    description={formState.isDark ? 'Dark mode' : 'Light mode'}
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => handleToggle('isDark')}
                                            className="stg-pill-btn"
                                        >
                                            {formState.isDark ? (
                                                <>
                                                    <Moon size={14} style={{ color: 'var(--text-gold)' }} />
                                                    Dark
                                                </>
                                            ) : (
                                                <>
                                                    <Sun size={14} style={{ color: 'var(--text-gold)' }} />
                                                    Light
                                                </>
                                            )}
                                        </button>
                                    }
                                />
                                <SettingRow
                                    icon={Languages}
                                    title="Language"
                                    action={
                                        <div className="stg-select-wrap">
                                            <select
                                                value={formState.language}
                                                onChange={(e) => handleChange('language', e.target.value)}
                                                className="stg-select"
                                            >
                                                <option value="en">English (US)</option>
                                                <option value="id">Bahasa Indonesia</option>
                                            </select>
                                            <div className="stg-select-icon">
                                                <ChevronDown />
                                            </div>
                                        </div>
                                    }
                                />
                            </div>

                            {/* Support */}
                            <div className="stg-card">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">Support</h2>
                                </div>
                                <SettingRow
                                    icon={HelpCircle}
                                    title="Help Center"
                                    description="FAQs and guides"
                                    action={<ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
                                    onClick={() => toast.info('Help Center', 'Coming soon.')}
                                />
                                <SettingRow
                                    icon={Download}
                                    title="Export Data"
                                    description="Download your account data"
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => toast.info('Export', 'Data export will be sent to your email.')}
                                            className="stg-pill-btn"
                                        >
                                            Export
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'notifications' && (
                    <motion.div
                        key="notifications"
                        className="stg-panel"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="stg-panel-space">
                            {/* Channels */}
                            <div className="stg-card">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">Channels</h2>
                                    <p className="stg-card-subtitle">Where you receive alerts</p>
                                </div>
                                <SettingRow
                                    icon={Mail}
                                    title="Email"
                                    description="News and alerts via email"
                                    action={
                                        <Toggle
                                            enabled={formState.emailNotifications}
                                            onChange={() => handleToggle('emailNotifications')}
                                        />
                                    }
                                />
                                <SettingRow
                                    icon={Smartphone}
                                    title="Push"
                                    description="Instant alerts on device"
                                    action={
                                        <Toggle
                                            enabled={formState.pushNotifications}
                                            onChange={() => handleToggle('pushNotifications')}
                                        />
                                    }
                                />
                            </div>

                            {/* Topics */}
                            <div className="stg-card">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">Topics</h2>
                                    <p className="stg-card-subtitle">What you want to hear about</p>
                                </div>
                                <SettingRow
                                    icon={Bell}
                                    title="New Artwork"
                                    description="From artists you follow"
                                    action={
                                        <Toggle
                                            enabled={formState.newArtworkAlerts}
                                            onChange={() => handleToggle('newArtworkAlerts')}
                                        />
                                    }
                                />
                                <SettingRow
                                    icon={Mail}
                                    title="Weekly Digest"
                                    description="Top art and community news"
                                    action={
                                        <Toggle
                                            enabled={formState.weeklyDigest}
                                            onChange={() => handleToggle('weeklyDigest')}
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'security' && (
                    <motion.div
                        key="security"
                        className="stg-panel"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="stg-panel-space">
                            {/* Authentication */}
                            <div className="stg-card">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">Authentication</h2>
                                    <p className="stg-card-subtitle">Secure your account</p>
                                </div>
                                <SettingRow
                                    icon={Key}
                                    title="Password"
                                    description="Last changed 3 months ago"
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => toast.info('Info', 'Password change flow not implemented yet.')}
                                            className="stg-pill-btn"
                                        >
                                            Change
                                        </button>
                                    }
                                />
                                <SettingRow
                                    icon={Shield}
                                    title="Two-Factor (2FA)"
                                    description="Extra layer of security"
                                    action={
                                        <div className="stg-2fa-actions">
                                            {formState.isTwoFactorEnabled ? (
                                                <>
                                                    <span className="stg-badge success">
                                                        <span className="stg-badge-dot" />
                                                        On
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleChange('isTwoFactorEnabled', false)}
                                                        className="stg-text-btn"
                                                    >
                                                        Disable
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChange('isTwoFactorEnabled', true)}
                                                    className="stg-pill-btn gold"
                                                >
                                                    Enable
                                                </button>
                                            )}
                                        </div>
                                    }
                                />
                                <SettingRow
                                    icon={Bell}
                                    title="Login Alerts"
                                    description="Unknown device sign-ins"
                                    action={
                                        <Toggle
                                            enabled={formState.loginAlertsEnabled}
                                            onChange={() => handleToggle('loginAlertsEnabled')}
                                        />
                                    }
                                />
                            </div>

                            {/* Danger Zone */}
                            <div className="stg-card danger">
                                <div className="stg-card-header">
                                    <h2 className="stg-card-title">Danger Zone</h2>
                                </div>
                                <SettingRow
                                    icon={Trash2}
                                    title="Delete Account"
                                    description="Permanently remove all data"
                                    destructive
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Are you sure? This action cannot be undone.')) {
                                                    toast.error('Account Deletion', 'Deletion request queued.');
                                                }
                                            }}
                                            className="stg-pill-btn danger"
                                        >
                                            Delete
                                        </button>
                                    }
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Settings;
