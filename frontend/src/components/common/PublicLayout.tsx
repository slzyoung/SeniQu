/**
 * Public Layout Component
 * Wraps public pages (Marketplace, AI, etc.) with the standard DashboardLayout
 * to ensure consistent Sidebar and Header behavior.
 */

import {
    Home,
    Image,
    MapPin,
    Sparkles,
    Brain,
    ShoppingCart,
    MessageSquare,
    LogIn
} from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';
import { SidebarSection } from '../ui/Sidebar';
import { ROUTES } from '../../lib/constants';
import { useAuthStore } from '../../stores/useAuthStore';
import { Avatar } from '../ui';
import { Link } from 'react-router-dom';
import { adminSidebarSections } from '../../features/admin/AdminLayout';
import { getArtistSidebarSections } from '../../features/artist/ArtistLayout';
import { userSidebarSections } from '../../features/user/UserLayout';

const publicSidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            {
                id: 'home',
                label: 'Home',
                icon: <Home className="w-5 h-5" />,
                path: ROUTES.HOME,
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
                path: ROUTES.NEARBY,
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
                path: ROUTES.AI_GENRE,
            },
            {
                id: 'ai-curation',
                label: 'AI Curation',
                icon: <Brain className="w-5 h-5" />,
                path: ROUTES.AI_CURATION,
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
                path: ROUTES.MARKETPLACE,
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
                path: ROUTES.COMMUNITY,
            },
        ],
    },
];

function PublicSidebarFooter() {
    const { user, isAuthenticated } = useAuthStore();

    if (isAuthenticated && user) {
        return (
            <Link to={ROUTES.USER_DASHBOARD} className="flex items-center justify-center md:justify-start gap-3 p-2 rounded-xl hover:bg-theme-elevated transition-colors">
                <Avatar
                    src={user.avatar}
                    name={user.displayName || user.username || 'User'}
                    size="sm"
                />
                <div className="flex-1 min-w-0 hidden md:block">
                    <p className="text-sm font-medium text-theme-text truncate">
                        {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-theme-muted truncate">Go to Dashboard</p>
                </div>
            </Link>
        );
    }

    return (
        <Link to={ROUTES.LOGIN} className="flex items-center justify-center md:justify-start gap-3 p-2 rounded-xl text-theme-muted hover:text-theme-text hover:bg-theme-elevated transition-colors" title="Log In / Register">
            <LogIn className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:block">Log In / Register</span>
        </Link>
    );
}

export function PublicLayout() {
    const { user, isAuthenticated, isInstitution, isAdmin, isArtist } = useAuthStore();

    let sections = publicSidebarSections;

    if (isAuthenticated && user) {
        if (isAdmin()) {
            sections = adminSidebarSections;
        } else if (isArtist() || isInstitution()) {
            sections = getArtistSidebarSections(isInstitution());
        } else {
            sections = userSidebarSections;
        }
    }

    return (
        <DashboardLayout
            sections={sections}
            footer={<PublicSidebarFooter />}
        />
    );
}

export default PublicLayout;
