/**
 * User Profile Page
 * Uses real API data with useUpdateProfile hook
 */

import { useState, useEffect, useRef } from 'react';
import {
    Camera,
    Edit2,
    Instagram,
    X,
    Loader2,
    Save,
    Send
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardHeader, CardContent, Button, Input, Textarea, Avatar, Badge } from '../../../components/ui';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useCurrentUser, useUpdateProfile, useUserStats, useUploadAvatar } from '../../../hooks/useUser';
import { usePrivy } from '@privy-io/react-auth';
import { ConnectedWallets } from '../components/ConnectedWallets';
import { WalletSummaryCard } from '../components/WalletSummaryCard';

const XLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
);

export function Profile() {
    const { user: authUser } = useAuthStore();
    const { user: privyUser } = usePrivy();
    const { data: user, isLoading: userLoading } = useCurrentUser();
    const { data: stats } = useUserStats();
    const updateProfile = useUpdateProfile();
    const uploadAvatar = useUploadAvatar();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        bio: '',
        twitter: '',
        instagram: '',
        telegram: '',
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
                telegram: user.socialLinks?.telegram || '',
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
                telegram: formData.telegram || undefined,
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
                telegram: user.socialLinks?.telegram || '',
            });
        }
        setIsEditing(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Upload the file to the backend
            const { url } = await uploadAvatar.mutateAsync(file);

            // Once uploaded, save the avatar URL to the user's profile
            await updateProfile.mutateAsync({
                avatarUrl: url,
            });
        } catch (error) {
            console.error('Failed to upload and update avatar:', error);
        }
    };

    const displayUser = user || authUser;

    // Get social avatar if user logged in via social providers
    const socialAvatar = (privyUser?.google as any)?.profilePictureUrl
        || (privyUser?.twitter as any)?.profilePictureUrl
        || (privyUser?.discord as any)?.profilePictureUrl;

    const finalAvatar = displayUser?.avatar || socialAvatar;

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
                        <div className="relative inline-block mb-6 group">
                            <div className="rounded-full p-1 border-2 border-theme-border/50 group-hover:border-gold/80 transition-colors shadow-xl shadow-gold/5">
                                <Avatar
                                    src={finalAvatar}
                                    name={displayUser?.displayName || displayUser?.username || 'User'}
                                    size="2xl"
                                />
                            </div>
                            {isEditing && (
                                <>
                                    <button
                                        className="absolute bottom-1 right-1 p-2 bg-theme-bg shadow-md border border-theme-border text-gold rounded-full hover:bg-theme-elevated transition-colors z-10"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadAvatar.isPending}
                                    >
                                        {uploadAvatar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleAvatarUpload}
                                    />
                                </>
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
                                    <p className="text-xs text-theme-muted">Arts</p>
                                </div>
                            </div>
                        )}

                        {/* Social Links */}
                        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-theme-border">
                            {displayUser?.socialLinks?.twitter && (
                                <a
                                    href={`https://x.com/${displayUser.socialLinks.twitter}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                >
                                    <XLogo className="w-5 h-5" />
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
                            {displayUser?.socialLinks?.telegram && (
                                <a
                                    href={`https://t.me/${displayUser.socialLinks.telegram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-theme-elevated text-theme-muted hover:text-theme-text transition-colors"
                                >
                                    <Send className="w-5 h-5 -ml-0.5" />
                                </a>
                            )}
                            {!displayUser?.socialLinks?.twitter && !displayUser?.socialLinks?.instagram && !displayUser?.socialLinks?.telegram && (
                                <p className="text-xs text-theme-muted">No social links added</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Profile Form */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <Card variant="elevated" className={`transition-all duration-300 ${isEditing ? "ring-1 ring-gold/30 shadow-lg shadow-gold/5" : "border-theme-border/30 shadow-sm"}`}>
                        <CardHeader title="Basic Information" />
                        <CardContent className="space-y-5">
                            {isEditing ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Input
                                            label="Display Name"
                                            value={formData.displayName}
                                            onChange={(e: any) => setFormData({ ...formData, displayName: e.target.value })}
                                            placeholder="Your display name"
                                            className="transition-all"
                                        />
                                        <Input
                                            label="Username"
                                            value={formData.username}
                                            onChange={(e: any) => setFormData({ ...formData, username: e.target.value.replace(/^@/, '') })}
                                            placeholder="username"
                                            leftIcon={<span className="text-theme-muted font-medium">@</span>}
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            className="transition-all"
                                        />
                                    </div>

                                    <Textarea
                                        label="Bio"
                                        value={formData.bio}
                                        onChange={(e: any) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Tell us about yourself..."
                                        hint={`${formData.bio.length}/500 characters`}
                                        rows={4}
                                        className="transition-all"
                                    />
                                </>
                            ) : (
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="p-4 rounded-xl bg-theme-bg/40 border border-theme-border/30 backdrop-blur-xl hover:bg-theme-bg/60 transition-colors group">
                                            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-theme-muted font-bold mb-1.5 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gold/50 group-hover:bg-gold transition-colors"></span>
                                                Display Name
                                            </p>
                                            <p className="text-theme-text font-medium text-base sm:text-lg">{displayUser?.displayName || <span className="text-theme-muted/50 font-light">Not set</span>}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-theme-bg/40 border border-theme-border/30 backdrop-blur-xl hover:bg-theme-bg/60 transition-colors group">
                                            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-theme-muted font-bold mb-1.5 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gold/50 group-hover:bg-gold transition-colors"></span>
                                                Username
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-theme-muted/50 font-light">@</span>
                                                <p className="text-theme-text font-medium text-base sm:text-lg">{displayUser?.username || <span className="text-theme-muted/50 font-light">Not set</span>}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-theme-bg/40 border border-theme-border/30 backdrop-blur-xl hover:bg-theme-bg/60 transition-colors group">
                                        <p className="text-[11px] sm:text-xs uppercase tracking-wider text-theme-muted font-bold mb-2.5 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gold/50 group-hover:bg-gold transition-colors"></span>
                                            Bio
                                        </p>
                                        <p className="text-theme-text/90 leading-relaxed font-light text-sm sm:text-base">
                                            {displayUser?.bio || <span className="text-theme-muted/50 italic">No bio yet. Click Edit Profile to add one.</span>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card variant="elevated" className={`transition-all duration-300 ${isEditing ? "ring-1 ring-gold/30 shadow-lg shadow-gold/5" : "border-theme-border/30 shadow-sm"}`}>
                        <CardHeader title="Social Links" />
                        <CardContent className="space-y-5">
                            {isEditing ? (
                                <>
                                    <Input
                                        label="X"
                                        value={formData.twitter}
                                        onChange={(e: any) => setFormData({ ...formData, twitter: e.target.value.replace(/^@/, '') })}
                                        placeholder="username"
                                        leftIcon={
                                            <div className="flex items-center gap-1.5">
                                                <XLogo className="w-4 h-4 text-theme-text" />
                                                <span className="text-theme-muted font-medium">@</span>
                                            </div>
                                        }
                                        inputMode="text"
                                        autoCapitalize="none"
                                        className="!pl-16 transition-all"
                                    />
                                    <Input
                                        label="Instagram"
                                        value={formData.instagram}
                                        onChange={(e: any) => setFormData({ ...formData, instagram: e.target.value.replace(/^@/, '') })}
                                        placeholder="username"
                                        leftIcon={
                                            <div className="flex items-center gap-1.5">
                                                <Instagram className="w-4 h-4 text-pink-500" />
                                                <span className="text-theme-muted font-medium">@</span>
                                            </div>
                                        }
                                        inputMode="text"
                                        autoCapitalize="none"
                                        className="!pl-16 transition-all"
                                    />
                                    <Input
                                        label="Telegram"
                                        value={formData.telegram}
                                        onChange={(e: any) => setFormData({ ...formData, telegram: e.target.value.replace(/^@/, '') })}
                                        placeholder="username"
                                        leftIcon={
                                            <div className="flex items-center gap-1.5">
                                                <Send className="w-4 h-4 text-[#2AABEE]" />
                                                <span className="text-theme-muted font-medium">@</span>
                                            </div>
                                        }
                                        inputMode="text"
                                        className="!pl-16 transition-all"
                                    />
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-3.5 sm:p-4 rounded-xl bg-theme-bg/40 border border-theme-border/30 backdrop-blur-xl hover:bg-theme-bg/60 hover:border-theme-border/80 transition-all duration-300 group">
                                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-theme-elevated to-theme-bg group-hover:scale-105 transition-all duration-300 shadow-sm border border-theme-border/30">
                                            <XLogo className="w-5 h-5 text-theme-text transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] sm:text-xs text-theme-muted font-bold tracking-wider uppercase mb-0.5">X</p>
                                            <p className="text-theme-text font-medium text-sm sm:text-base">
                                                {displayUser?.socialLinks?.twitter 
                                                    ? <span className="flex items-center gap-0.5"><span className="text-theme-muted font-light">@</span>{displayUser.socialLinks.twitter.replace(/^@/, '')}</span> 
                                                    : <span className="text-theme-muted/50 font-light">Not added</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3.5 sm:p-4 rounded-xl bg-theme-bg/40 border border-theme-border/30 backdrop-blur-xl hover:bg-pink-500/5 hover:border-pink-500/30 transition-all duration-300 group">
                                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-theme-elevated to-theme-bg group-hover:from-pink-500/10 group-hover:to-orange-500/10 group-hover:scale-105 transition-all duration-300 shadow-sm border border-theme-border/30">
                                            <Instagram className="w-5 h-5 text-pink-500 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] sm:text-xs text-theme-muted font-bold tracking-wider uppercase mb-0.5">Instagram</p>
                                            <p className="text-theme-text font-medium text-sm sm:text-base">
                                                {displayUser?.socialLinks?.instagram 
                                                    ? <span className="flex items-center gap-0.5"><span className="text-theme-muted font-light">@</span>{displayUser.socialLinks.instagram.replace(/^@/, '')}</span> 
                                                    : <span className="text-theme-muted/50 font-light">Not added</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3.5 sm:p-4 rounded-xl bg-theme-bg/40 border border-theme-border/30 backdrop-blur-xl hover:bg-[#2AABEE]/5 hover:border-[#2AABEE]/30 transition-all duration-300 group">
                                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-theme-elevated to-theme-bg group-hover:from-[#2AABEE]/10 group-hover:to-[#2AABEE]/5 group-hover:scale-105 transition-all duration-300 shadow-sm border border-theme-border/30">
                                            <Send className="w-5 h-5 text-[#2AABEE] transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] sm:text-xs text-theme-muted font-bold tracking-wider uppercase mb-0.5">Telegram</p>
                                            <p className="text-theme-text font-medium text-sm sm:text-base">
                                                {displayUser?.socialLinks?.telegram 
                                                    ? <span className="flex items-center gap-0.5"><span className="text-theme-muted font-light">@</span>{displayUser.socialLinks.telegram.replace(/^@/, '')}</span> 
                                                    : <span className="text-theme-muted/50 font-light">Not added</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>


                    <WalletSummaryCard />
                    <ConnectedWallets user={displayUser} />

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

                            {/* Connected Login Wallet (External Only) */}
                            {displayUser?.wallets && (() => {
                                // Robust check for external wallets (exclude embedded/privy)
                                const loginWallet = displayUser.wallets.find((w: any) => {
                                    const isEmbedded = w.isEmbedded || w.is_embedded || w.privy_wallet_id || w.walletClientType === 'privy';
                                    return !isEmbedded;
                                });

                                if (!loginWallet) return null;

                                const walletAny = loginWallet as any;
                                const chainType = walletAny.chainType || walletAny.chain_type || 'solana';
                                const address = walletAny.address || walletAny.wallet_address;

                                if (!address) return null;

                                return (
                                    <div className="py-3 border-t border-theme-border">
                                        <p className="text-sm font-medium text-theme-text mb-2">Connected Wallet</p>
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-theme-bg">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={chainType === 'solana' ? 'primary' : 'default'}
                                                    className="text-[10px] px-1.5 py-0 h-4 uppercase"
                                                >
                                                    {chainType}
                                                </Badge>
                                                <p className="text-xs text-theme-muted font-mono">
                                                    {address.slice(0, 6)}...{address.slice(-4)}
                                                </p>
                                                <Badge variant="gold" className="text-[9px] px-1 py-0 h-3">Login</Badge>
                                            </div>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(address)}
                                                className="text-xs text-gold hover:text-gold-light transition-colors"
                                                title="Copy address"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div >
            </div >
        </PageContainer >
    );
}

export default Profile;
