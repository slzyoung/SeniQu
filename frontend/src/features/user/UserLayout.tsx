/**
 * User Dashboard Layout
 */

import {
    LayoutDashboard,
    User,
    Bookmark,
    FolderHeart,
    Settings,
    LogOut,
    Image,
    MapPin,
    Sparkles,
    Brain,
    ShoppingCart,
    Wallet,
    MessageSquare
} from 'lucide-react';
import { DashboardLayout } from '../../components/common/DashboardLayout';
import { SidebarSection } from '../../components/ui/Sidebar';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar } from '../../components/ui';
import { ROUTES } from '../../lib/constants';

const sidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: <LayoutDashboard className="w-5 h-5" />,
                path: ROUTES.USER_DASHBOARD,
            },
        ],
    },
    {
        title: 'Explore',
        items: [
            {
                id: 'gallery',
                label: 'Art Gallery',
                icon: <Image className="w-5 h-5" />,
                path: ROUTES.GALLERY,
            },
            {
                id: 'nearby',
                label: 'Nearby Museums',
                icon: <MapPin className="w-5 h-5" />,
                path: ROUTES.USER_NEARBY,
            },
        ],
    },
    {
        title: 'AI Tools',
        items: [
            {
                id: 'genre-identifier',
                label: 'Genre Identifier',
                icon: <Sparkles className="w-5 h-5" />,
                path: ROUTES.USER_GENRE_IDENTIFIER,
            },
            {
                id: 'ai-curation',
                label: 'AI Curation',
                icon: <Brain className="w-5 h-5" />,
                path: ROUTES.USER_AI_CURATION,
            },
        ],
    },
    {
        title: 'Marketplace',
        items: [
            {
                id: 'marketplace',
                label: 'NFT Marketplace',
                icon: <ShoppingCart className="w-5 h-5" />,
                path: ROUTES.USER_MARKETPLACE,
            },
            {
                id: 'my-nfts',
                label: 'My NFTs',
                icon: <Wallet className="w-5 h-5" />,
                path: ROUTES.USER_MY_NFTS,
            },
        ],
    },
    {
        title: 'Community',
        items: [
            {
                id: 'community',
                label: 'Forum',
                icon: <MessageSquare className="w-5 h-5" />,
                path: ROUTES.USER_COMMUNITY,
            },
        ],
    },
    {
        title: 'Collections',
        items: [
            {
                id: 'bookmarks',
                label: 'Bookmarks',
                icon: <Bookmark className="w-5 h-5" />,
                path: ROUTES.USER_BOOKMARKS,
            },
            {
                id: 'collections',
                label: 'My Collections',
                icon: <FolderHeart className="w-5 h-5" />,
                path: ROUTES.USER_COLLECTIONS,
            },
        ],
    },
    {
        title: 'Account',
        items: [
            {
                id: 'profile',
                label: 'Profile',
                icon: <User className="w-5 h-5" />,
                path: ROUTES.USER_PROFILE,
            },
            {
                id: 'settings',
                label: 'Settings',
                icon: <Settings className="w-5 h-5" />,
                path: ROUTES.USER_SETTINGS,
            },
        ],
    },
];

function SidebarFooter() {
    const { user, logout } = useAuthStore();

    return (
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-theme-elevated transition-colors">
            <Avatar
                src={user?.avatar}
                name={user?.displayName || user?.username || 'User'}
                size="sm"
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-text truncate">
                    {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-theme-muted truncate">{user?.email}</p>
            </div>
            <button
                onClick={logout}
                className="p-2 text-theme-muted hover:text-red-500 transition-colors"
                title="Sign out"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
    );
}

export function UserLayout() {
    return (
        <DashboardLayout
            sections={sidebarSections}
            footer={<SidebarFooter />}
        />
    );
}

export default UserLayout;
