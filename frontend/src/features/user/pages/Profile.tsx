/**
 * User Profile Page
 * Uses real API data with useUpdateProfile hook
 */

import { useState, useEffect } from 'react';
import {
    Camera,
    Edit2,
    Twitter,
    Instagram,
    Globe,
    X,
    Loader2,
    Save
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Input, Textarea, Avatar, Badge } from '../../../components/ui';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useCurrentUser, useUpdateProfile, useUserStats } from '../../../hooks/useUser';

export function Profile() {
    const { user: authUser } = useAuthStore();
    const { data: user, isLoading: userLoading } = useCurrentUser();
    const { data: stats } = useUserStats();
    const updateProfile = useUpdateProfile();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        bio: '',
        twitter: '',
        instagram: '',
        website: '',
    });

    // Initialize form data when user loads
    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                username: user.username || '',
                bio: user.bio || '',
                twitter: user.socialLinks?.twitter || '',
                instagram: user.socialLinks?.instagram || '',
                website: user.socialLinks?.website || '',
            });
        }
    }, [user]);

    const handleSave = async () => {
        await updateProfile.mutateAsync({
            displayName: formData.displayName,
            bio: formData.bio,
            socialLinks: {
                twitter: formData.twitter || undefined,
                instagram: formData.instagram || undefined,
                website: formData.website || undefined,
            },
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        // Reset form to original values
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                username: user.username || '',
                bio: user.bio || '',
                twitter: user.socialLinks?.twitter || '',
                instagram: user.socialLinks?.instagram || '',
                website: user.socialLinks?.website || '',
            });
        }
        setIsEditing(false);
    };

    const displayUser = user || authUser;

    if (userLoading) {
        return (
            <PageContainer title="Profile" subtitle="Loading...">
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Profile"
            subtitle="Manage your public profile information"
            actions={
                isEditing ? (
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            leftIcon={<X className="w-4 h-4" />}
                            disabled={updateProfile.isPending}
                        >
                            <span className="hidden sm:inline">Cancel</span>
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            leftIcon={updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            isLoading={updateProfile.isPending}
                        >
                            <span className="hidden sm:inline">Save Changes</span>
                            <span className="sm:hidden">Save</span>
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="secondary"
                        onClick={() => setIsEditing(true)}
                        leftIcon={<Edit2 className="w-4 h-4" />}
                    >
                        <span className="hidden sm:inline">Edit Profile</span>
                        <span className="sm:hidden">Edit</span>
                    </Button>
                )
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Avatar & Quick Info */}
                <Card variant="elevated">
                    <CardContent className="text-center">
                        <div className="relative inline-block mb-4">
                            <Avatar
                                src={displayUser?.avatar}
                                name={displayUser?.displayName || displayUser?.username || 'User'}
                                size="2xl"
                            />
                            {isEditing && (
                                <button className="absolute bottom-0 right-0 p-2 bg-gold text-charcoal rounded-full hover:bg-gold-light transition-colors">
                                    <Camera className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <h2 className="text-lg sm:text-xl font-bold text-theme-text">
                            {displayUser?.displayName || displayUser?.username}
                        </h2>
                        <p className="text-theme-muted text-sm">@{displayUser?.username}</p>

                        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                            {displayUser?.isVerified && (
                                <Badge variant="primary" dot>Verified</Badge>
                            )}
                            {displayUser?.isPremium && (
                                <Badge variant="gold">Premium</Badge>
                            )}
                        </div>

                        <p className="text-sm text-theme-muted mt-4 line-clamp-3">
                            {displayUser?.bio || 'No bio yet'}
                        </p>

                        {/* Stats Summary */}
                        {stats && (
                            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-theme-border">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-theme-text">{stats.bookmarksCount || 0}</p>
                                    <p className="text-xs text-theme-muted">Bookmarks</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-theme-text">{stats.collectionsCount || 0}</p>
                                    <p className="text-xs text-theme-muted">Collections</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-theme-text">{stats.nftCount || 0}</p>
                                    <p className="text-xs text-theme-muted">NFTs</p>
                                </div>
                            </div>
                        )}

                        {/* Social Links */}
                        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-theme-border">
                            {displayUser?.socialLinks?.twitter && (
                                <a
                                    href={`https://twitter.com/${displayUser.socialLinks.twitter}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                >
                                    <Twitter className="w-5 h-5" />
                                </a>
                            )}
                            {displayUser?.socialLinks?.instagram && (
                                <a
                                    href={`https://instagram.com/${displayUser.socialLinks.instagram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                >
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {displayUser?.socialLinks?.website && (
                                <a
                                    href={displayUser.socialLinks.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                >
                                    <Globe className="w-5 h-5" />
                                </a>
                            )}
                            {!displayUser?.socialLinks?.twitter && !displayUser?.socialLinks?.instagram && !displayUser?.socialLinks?.website && (
                                <p className="text-xs text-theme-muted">No social links added</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Profile Form */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <Card variant="elevated">
                        <CardHeader title="Basic Information" />
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Display Name"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="Your display name"
                                />
                                <Input
                                    label="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="username"
                                    leftIcon={<span className="text-theme-muted">@</span>}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                />
                            </div>

                            <Textarea
                                label="Bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                disabled={!isEditing}
                                placeholder="Tell us about yourself..."
                                hint={`${formData.bio.length}/500 characters`}
                            />
                        </CardContent>
                    </Card>

                    <Card variant="elevated">
                        <CardHeader title="Social Links" />
                        <CardContent className="space-y-4">
                            <Input
                                label="Twitter"
                                value={formData.twitter}
                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                disabled={!isEditing}
                                placeholder="username"
                                leftIcon={<Twitter className="w-4 h-4 text-theme-muted" />}
                                inputMode="text"
                                autoCapitalize="none"
                            />
                            <Input
                                label="Instagram"
                                value={formData.instagram}
                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                disabled={!isEditing}
                                placeholder="username"
                                leftIcon={<Instagram className="w-4 h-4 text-theme-muted" />}
                                inputMode="text"
                                autoCapitalize="none"
                            />
                            <Input
                                label="Website"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                disabled={!isEditing}
                                placeholder="https://yourwebsite.com"
                                leftIcon={<Globe className="w-4 h-4 text-theme-muted" />}
                                inputMode="url"
                                type="url"
                            />
                        </CardContent>
                    </Card>

                    <Card variant="elevated">
                        <CardHeader title="Account Information" />
                        <CardContent className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-theme-border gap-2">
                                <div>
                                    <p className="text-sm font-medium text-theme-text">Email</p>
                                    <p className="text-sm text-theme-muted break-all">{displayUser?.email}</p>
                                </div>
                                <Badge variant="success" dot className="self-start sm:self-center">Verified</Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-theme-border gap-2">
                                <div>
                                    <p className="text-sm font-medium text-theme-text">Wallet Address</p>
                                    <p className="text-sm text-theme-muted font-mono">
                                        {displayUser?.walletAddress
                                            ? `${displayUser.walletAddress.slice(0, 6)}...${displayUser.walletAddress.slice(-4)}`
                                            : 'Not connected'
                                        }
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" className="self-start sm:self-center">
                                    {displayUser?.walletAddress ? 'Change' : 'Connect'}
                                </Button>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                                <div>
                                    <p className="text-sm font-medium text-theme-text">Member Since</p>
                                    <p className="text-sm text-theme-muted">
                                        {displayUser?.createdAt
                                            ? new Date(displayUser.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : 'N/A'
                                        }
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}

export default Profile;
