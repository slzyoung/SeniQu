/**
 * Artist Settings Page
 * Manage artist profile and notification settings
 */

import { useState, useEffect } from 'react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button, Input } from '../../../components/ui';
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Shield,
    Save,
    Loader2
} from 'lucide-react';
import { useCurrentUser, useUpdateProfile } from '../../../hooks/useUser';
import { useAuthStore } from '../../../stores/useAuthStore';

export function ArtistSettings() {
    const { user } = useAuthStore();
    const { data: currentUser, isLoading } = useCurrentUser();
    const updateProfile = useUpdateProfile();

    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        email: '',
        website: '',
        twitter: '',
        instagram: '',
    });

    const [notifications, setNotifications] = useState({
        emailSales: true,
        emailComments: true,
        emailNewFollowers: false,
        pushNotifications: true,
    });

    useEffect(() => {
        if (currentUser || user) {
            const userData = currentUser || user;
            setFormData({
                displayName: userData?.displayName || '',
                bio: userData?.bio || '',
                email: userData?.email || '',
                website: userData?.socialLinks?.website || '',
                twitter: userData?.socialLinks?.twitter || '',
                instagram: userData?.socialLinks?.instagram || '',
            });
        }
    }, [currentUser, user]);

    const handleSave = async () => {
        await updateProfile.mutateAsync({
            displayName: formData.displayName,
            bio: formData.bio,
            socialLinks: {
                website: formData.website || undefined,
                twitter: formData.twitter || undefined,
                instagram: formData.instagram || undefined,
            },
        });
    };

    if (isLoading) {
        return (
            <PageContainer title="Settings" subtitle="Manage your artist account settings">
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Settings"
            subtitle="Manage your artist account settings"
            actions={
                <Button
                    variant="gold"
                    leftIcon={updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                >
                    Save Changes
                </Button>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <Card variant="elevated">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gold/10 rounded-lg">
                                    <User className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-text">Profile Information</h3>
                                    <p className="text-sm text-theme-muted">Update your public profile</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Display Name"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    placeholder="Your artist name"
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-text/80">Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Tell us about yourself..."
                                        rows={4}
                                        className="w-full p-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text focus:outline-none focus:ring-2 focus:ring-gold/50"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="elevated">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <SettingsIcon className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-text">Social Links</h3>
                                    <p className="text-sm text-theme-muted">Connect your social profiles</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Website"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://yourwebsite.com"
                                    inputMode="url"
                                    type="url"
                                />
                                <Input
                                    label="Twitter"
                                    value={formData.twitter}
                                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                    placeholder="https://twitter.com/username"
                                    inputMode="url"
                                    type="url"
                                    autoCapitalize="none"
                                />
                                <Input
                                    label="Instagram"
                                    value={formData.instagram}
                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                    placeholder="https://instagram.com/username"
                                    inputMode="url"
                                    type="url"
                                    autoCapitalize="none"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Notification Settings */}
                <div className="space-y-6">
                    <Card variant="elevated">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Bell className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-text">Notifications</h3>
                                    <p className="text-sm text-theme-muted">Manage alerts</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { key: 'emailSales', label: 'Email on sales' },
                                    { key: 'emailComments', label: 'Email on comments' },
                                    { key: 'emailNewFollowers', label: 'Email on new followers' },
                                    { key: 'pushNotifications', label: 'Push notifications' },
                                ].map(item => (
                                    <label key={item.key} className="flex items-center justify-between">
                                        <span className="text-sm text-theme-text">{item.label}</span>
                                        <input
                                            type="checkbox"
                                            checked={notifications[item.key as keyof typeof notifications]}
                                            onChange={(e) => setNotifications({
                                                ...notifications,
                                                [item.key]: e.target.checked
                                            })}
                                            className="w-5 h-5 rounded border-theme-border text-gold focus:ring-gold"
                                        />
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="elevated">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <Shield className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-text">Security</h3>
                                    <p className="text-sm text-theme-muted">Account security</p>
                                </div>
                            </div>

                            <Button variant="secondary" className="w-full">
                                Change Password
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}

export default ArtistSettings;
