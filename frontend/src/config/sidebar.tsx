import {
    LayoutDashboard,
    User,
    Bookmark,
    FolderHeart,
    Settings,
    Image,
    MapPin,
    Sparkles,
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
    Image as ImageIcon
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
                icon: <Image className="w-5 h-5" />,
                path: ROUTES.USER_GALLERY,
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
                label: 'Arts Marketplace',
                icon: <ShoppingCart className="w-5 h-5" />,
                path: ROUTES.USER_MARKETPLACE,
            },
            {
                id: 'my-arts',
                label: 'My Arts',
                icon: <Wallet className="w-5 h-5" />,
                path: ROUTES.USER_MY_ARTS,
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
                id: 'wallet',
                label: 'Wallet',
                icon: <CreditCard className="w-5 h-5" />,
                path: ROUTES.USER_WALLET,
            },
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
                label: 'Arts Marketplace',
                icon: <Wallet className="w-5 h-5" />,
                path: ROUTES.MARKETPLACE,
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
                id: 'community',
                label: 'Forum',
                icon: <MessageSquare className="w-5 h-5" />,
                path: ROUTES.COMMUNITY,
            },
        ],
    },
];
