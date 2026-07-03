import {
    LayoutDashboard,
    User,
    Bookmark,
    FolderHeart,
    Settings,
    MapPin,
    ScanLine,
    Brain,
    ShoppingCart,
    Wallet,
    MessageSquare,
    CreditCard,
    Building2,
    Users,
    BarChart3,
    Database,
    FileText,
    Shield,
    ShoppingBag,
    Crown,
    Activity,
    Flag,
    Handshake,
    Bell,
    Home,
    Upload,
    TrendingUp,
    Image as ImageIcon,
    Palette,
    Wand2,
    Ticket,
    Megaphone,
    Images,
    Camera,
    Mail,
    Play,
    GalleryHorizontal,
    Library
} from 'lucide-react';
import { SidebarSection } from '../components/ui/Sidebar';
import { ROUTES } from '../lib/constants';

export const userSidebarSections: SidebarSection[] = [
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
                icon: <GalleryHorizontal className="w-5 h-5" />,
                path: ROUTES.USER_GALLERY,
            },
            {
                id: 'public-collections',
                label: 'Collections',
                icon: <Library className="w-5 h-5" />,
                path: ROUTES.COLLECTIONS,
            },
            {
                id: 'nearby',
                label: 'Nearby Museums',
                icon: <MapPin className="w-5 h-5" />,
                path: ROUTES.USER_NEARBY,
            },
            {
                id: 'collections',
                label: 'Photography Hub',
                icon: <Camera className="w-5 h-5" />,
                path: ROUTES.USER_COLLECTIONS,
            },
        ],
    },
    {
        title: 'AI Studio',
        items: [
            {
                id: 'ai-curation',
                label: 'AI Curation',
                icon: <Brain className="w-5 h-5" />,
                path: ROUTES.USER_AI_CURATION,
            },
            {
                id: 'ai-create',
                label: 'Create with AI',
                icon: <Wand2 className="w-5 h-5" />,
                path: ROUTES.USER_AI_CREATE,
            },
            {
                id: 'genre-identifier',
                label: 'Analyze',
                icon: <ScanLine className="w-5 h-5" />,
                path: ROUTES.USER_GENRE_IDENTIFIER,
            },
        ],
    },
    {
        title: 'Commerce',
        items: [
            {
                id: 'marketplace',
                label: 'Arts Marketplace',
                icon: <ShoppingCart className="w-5 h-5" />,
                path: ROUTES.USER_MARKETPLACE,
            },
            {
                id: 'my-arts',
                label: 'My Arts',
                icon: <Palette className="w-5 h-5" />,
                path: ROUTES.USER_MY_ARTS,
            },
        ],
    },
    {
        title: 'Community',
        items: [
            {
                id: 'reels',
                label: 'Reels',
                icon: <Play className="w-5 h-5" />,
                path: ROUTES.REELS,
            },
            {
                id: 'community',
                label: 'Forum',
                icon: (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 9V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1.5l2 2 2-2H16a2 2 0 0 0 2-2z" />
                        <circle cx="9.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
                        <circle cx="14.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
                        <circle cx="7" cy="16" r="1.75" />
                        <path d="M4 21.5a3 3 0 0 1 6 0" />
                        <circle cx="17" cy="16" r="1.75" />
                        <path d="M14 21.5a3 3 0 0 1 6 0" />
                        <circle cx="12" cy="15" r="2" />
                        <path d="M8.5 21.5a3.5 3.5 0 0 1 7 0" />
                    </svg>
                ),
                path: ROUTES.USER_COMMUNITY,
            },
            {
                id: 'messages',
                label: 'Messages',
                icon: <MessageSquare className="w-5 h-5" />,
                path: ROUTES.USER_MESSAGES,
            },
        ],
    },
    {
        title: 'Library',
        items: [
            {
                id: 'bookmarks',
                label: 'Bookmarks',
                icon: <Bookmark className="w-5 h-5" />,
                path: ROUTES.USER_BOOKMARKS,
            },
            {
                id: 'wallet',
                label: 'Wallet',
                icon: <CreditCard className="w-5 h-5" />,
                path: ROUTES.USER_WALLET,
            },
        ],
    },
    {
        title: 'Settings',
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

export const adminSidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: <LayoutDashboard className="w-5 h-5" />,
                path: ROUTES.ADMIN_DASHBOARD,
            },
            {
                id: 'analytics',
                label: 'System Analytics',
                icon: <BarChart3 className="w-5 h-5" />,
                path: ROUTES.ADMIN_ANALYTICS,
            },
        ],
    },
    {
        title: 'Management',
        items: [
            {
                id: 'institutions',
                label: 'Institutions',
                icon: <Building2 className="w-5 h-5" />,
                path: ROUTES.ADMIN_INSTITUTIONS,
                badge: 3,
            },
            {
                id: 'users',
                label: 'Users & Admins',
                icon: <Users className="w-5 h-5" />,
                path: ROUTES.ADMIN_USERS,
            },
            {
                id: 'marketplace',
                label: 'Arts Marketplace',
                icon: <ShoppingBag className="w-5 h-5" />,
                path: ROUTES.ADMIN_MARKETPLACE,
            },
            {
                id: 'premium',
                label: 'Premium',
                icon: <Crown className="w-5 h-5" />,
                path: ROUTES.ADMIN_PREMIUM,
            },
            {
                id: 'wallets',
                label: 'Wallet & Finance',
                icon: <Wallet className="w-5 h-5" />,
                path: ROUTES.ADMIN_WALLETS,
            },
            {
                id: 'partnerships',
                label: 'Partnerships',
                icon: <Handshake className="w-5 h-5" />,
                path: ROUTES.ADMIN_PARTNERSHIPS,
            },
        ],
    },
    {
        title: 'System',
        items: [
            {
                id: 'database',
                label: 'Database',
                icon: <Database className="w-5 h-5" />,
                path: ROUTES.ADMIN_DATABASE,
            },
            {
                id: 'logs',
                label: 'System Logs',
                icon: <FileText className="w-5 h-5" />,
                path: ROUTES.ADMIN_LOGS,
            },
            {
                id: 'health',
                label: 'System Health',
                icon: <Activity className="w-5 h-5" />,
                path: ROUTES.ADMIN_HEALTH,
            },
            {
                id: 'alerts',
                label: 'Alerts',
                icon: <Bell className="w-5 h-5" />,
                path: ROUTES.ADMIN_ALERTS,
                badge: 5,
            },
        ],
    },
    {
        title: 'Security & Reports',
        items: [
            {
                id: 'security',
                label: 'Security Center',
                icon: <Shield className="w-5 h-5" />,
                path: ROUTES.ADMIN_SECURITY,
            },
            {
                id: 'reports',
                label: 'Reports & Issues',
                icon: <Flag className="w-5 h-5" />,
                path: ROUTES.ADMIN_REPORTS,
                badge: 12,
            },
        ],
    },
    {
        title: 'Account',
        items: [
            {
                id: 'my-wallet',
                label: 'My Wallet',
                icon: <Wallet className="w-5 h-5" />,
                path: ROUTES.ADMIN_MY_WALLET,
            },
            {
                id: 'settings',
                label: 'Global Settings',

                icon: <Settings className="w-5 h-5" />,
                path: ROUTES.ADMIN_SETTINGS,
            },
            {
                id: 'profile',
                label: 'My Profile',
                icon: <User className="w-5 h-5" />,
                path: ROUTES.ADMIN_PROFILE,
            },
        ],
    },
];

// ============================================
// MUSEUM ADMIN SIDEBAR
// ============================================
export const museumSidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: ROUTES.ADMIN_DASHBOARD },
        ],
    },
    {
        title: 'Museum Management',
        items: [
            { id: 'artworks', label: 'Collection & Arts', icon: <FolderHeart className="w-5 h-5" />, path: '/admin/artworks' },
            { id: 'tickets', label: 'Ticketing & Pricing', icon: <Ticket className="w-5 h-5" />, path: '/admin/tickets' },
            { id: 'promotions', label: 'Exhibitions & Events', icon: <Megaphone className="w-5 h-5" />, path: '/admin/promotions' },
            { id: 'banners', label: 'Banner & Branding', icon: <Images className="w-5 h-5" />, path: '/admin/banners' },
        ],
    },
    {
        title: 'Insights',
        items: [
            { id: 'visitors', label: 'Visitor Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/admin/analytics' },
        ],
    },
    {
        title: 'Account',
        items: [
            { id: 'my-wallet', label: 'My Wallet', icon: <Wallet className="w-5 h-5" />, path: ROUTES.ADMIN_MY_WALLET },
            { id: 'profile', label: 'Museum Profile', icon: <Building2 className="w-5 h-5" />, path: ROUTES.ADMIN_PROFILE },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: ROUTES.ADMIN_SETTINGS },
        ],
    },
];

// ============================================
// GALLERY ADMIN SIDEBAR
// ============================================
export const gallerySidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: ROUTES.ADMIN_DASHBOARD },
        ],
    },
    {
        title: 'Gallery Management',
        items: [
            { id: 'artworks', label: 'Art Submissions', icon: <FolderHeart className="w-5 h-5" />, path: '/admin/artworks' },
            { id: 'marketplace', label: 'Gallery Marketplace', icon: <ShoppingBag className="w-5 h-5" />, path: '/admin/marketplace' },
            { id: 'promotions', label: 'Featured & Promos', icon: <Megaphone className="w-5 h-5" />, path: '/admin/promotions' },
            { id: 'banners', label: 'Gallery Branding', icon: <Images className="w-5 h-5" />, path: '/admin/banners' },
        ],
    },
    {
        title: 'Insights',
        items: [
            { id: 'analytics', label: 'Sales Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/admin/analytics' },
        ],
    },
    {
        title: 'Account',
        items: [
            { id: 'my-wallet', label: 'My Wallet', icon: <Wallet className="w-5 h-5" />, path: ROUTES.ADMIN_MY_WALLET },
            { id: 'profile', label: 'Gallery Profile', icon: <Building2 className="w-5 h-5" />, path: ROUTES.ADMIN_PROFILE },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: ROUTES.ADMIN_SETTINGS },
        ],
    },
];

// ============================================
// HERITAGE / SITES ADMIN SIDEBAR
// ============================================
export const heritageSidebarSections: SidebarSection[] = [
    {
        title: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: ROUTES.ADMIN_DASHBOARD },
        ],
    },
    {
        title: 'Heritage Management',
        items: [
            { id: 'artifacts', label: 'Artifacts & Records', icon: <FolderHeart className="w-5 h-5" />, path: '/admin/artworks' },
            { id: 'tours', label: 'Virtual Tours', icon: <MapPin className="w-5 h-5" />, path: '/admin/banners' },
            { id: 'tickets', label: 'Site Admission', icon: <Ticket className="w-5 h-5" />, path: '/admin/tickets' },
        ],
    },
    {
        title: 'Insights',
        items: [
            { id: 'analytics', label: 'Site Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/admin/analytics' },
        ],
    },
    {
        title: 'Account',
        items: [
            { id: 'my-wallet', label: 'My Wallet', icon: <Wallet className="w-5 h-5" />, path: ROUTES.ADMIN_MY_WALLET },
            { id: 'profile', label: 'Heritage Profile', icon: <Building2 className="w-5 h-5" />, path: ROUTES.ADMIN_PROFILE },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: ROUTES.ADMIN_SETTINGS },
        ],
    },
];

// ============================================
// HELPER: Get institution sidebar by admin role
// ============================================
export function getInstitutionSidebar(adminRole?: string): SidebarSection[] {
    switch (adminRole) {
        case 'MUSEUM_ADMIN': return museumSidebarSections;
        case 'GALLERY_ADMIN': return gallerySidebarSections;
        case 'HERITAGE_ADMIN': return heritageSidebarSections;
        default: return museumSidebarSections; // Fallback
    }
}

// Legacy alias for backward compatibility
export const institutionSidebarSections = museumSidebarSections;

export const getArtistSidebarSections = (isInstitution: boolean): SidebarSection[] => [
    {
        title: 'Overview',
        items: [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: <LayoutDashboard className="w-5 h-5" />,
                path: ROUTES.ARTIST_DASHBOARD,
            },
        ],
    },
    {
        title: 'Content',
        items: [
            {
                id: 'artworks',
                label: 'My Artworks',
                icon: <ImageIcon className="w-5 h-5" />,
                path: ROUTES.ARTIST_ARTWORKS,
            },
            {
                id: 'upload',
                label: 'Upload Artwork',
                icon: <Upload className="w-5 h-5" />,
                path: ROUTES.ARTIST_UPLOAD,
            },
            {
                id: 'marketplace',
                label: 'Artist Marketplace',
                icon: <ShoppingBag className="w-5 h-5" />,
                path: '/artist/marketplace',
            },
        ],
    },
    {
        title: 'Analytics',
        items: [
            {
                id: 'analytics',
                label: 'Analytics',
                icon: <BarChart3 className="w-5 h-5" />,
                path: ROUTES.ARTIST_ANALYTICS,
            },
            {
                id: 'performance',
                label: 'Performance',
                icon: <TrendingUp className="w-5 h-5" />,
                path: ROUTES.ARTIST_PERFORMANCE,
            },
            {
                id: 'engagement',
                label: 'Engagement',
                icon: <Users className="w-5 h-5" />,
                path: ROUTES.ARTIST_ENGAGEMENT,
            },
        ],
    },
    {
        title: 'Account',
        items: [
            ...(isInstitution ? [{
                id: 'institution',
                label: 'Institution Profile',
                icon: <Building2 className="w-5 h-5" />,
                path: ROUTES.ARTIST_INSTITUTION,
            }] : []),
            {
                id: 'wallet',
                label: 'My Wallet',
                icon: <Wallet className="w-5 h-5" />,
                path: '/artist/wallet',
            },
            {
                id: 'settings',
                label: 'Settings',
                icon: <Settings className="w-5 h-5" />,
                path: ROUTES.ARTIST_SETTINGS,
            },
        ],
    },
];

export const publicSidebarSections: SidebarSection[] = [
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
                icon: <GalleryHorizontal className="w-5 h-5" />,
                path: ROUTES.GALLERY,
            },
            {
                id: 'public-collections',
                label: 'Collections',
                icon: <Library className="w-5 h-5" />,
                path: ROUTES.COLLECTIONS,
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
        title: 'AI Studio',
        items: [
            {
                id: 'ai-curation',
                label: 'AI Curation',
                icon: <Brain className="w-5 h-5" />,
                path: ROUTES.AI_CURATION,
            },
            {
                id: 'genre-identifier',
                label: 'Analyze',
                icon: <ScanLine className="w-5 h-5" />,
                path: ROUTES.AI_GENRE,
            },
        ],
    },
    {
        title: 'Commerce',
        items: [
            {
                id: 'marketplace',
                label: 'Arts Marketplace',
                icon: <ShoppingCart className="w-5 h-5" />,
                path: ROUTES.MARKETPLACE,
            },
        ],
    },
    {
        title: 'Community',
        items: [
            {
                id: 'reels',
                label: 'Reels',
                icon: <Play className="w-5 h-5" />,
                path: ROUTES.REELS,
            },
            {
                id: 'community',
                label: 'Forum',
                icon: (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 9V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1.5l2 2 2-2H16a2 2 0 0 0 2-2z" />
                        <circle cx="9.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
                        <circle cx="12" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
                        <circle cx="14.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
                        <circle cx="7" cy="16" r="1.75" />
                        <path d="M4 21.5a3 3 0 0 1 6 0" />
                        <circle cx="17" cy="16" r="1.75" />
                        <path d="M14 21.5a3 3 0 0 1 6 0" />
                        <circle cx="12" cy="15" r="2" />
                        <path d="M8.5 21.5a3.5 3.5 0 0 1 7 0" />
                    </svg>
                ),
                path: ROUTES.COMMUNITY,
            },
        ],
    },
];
