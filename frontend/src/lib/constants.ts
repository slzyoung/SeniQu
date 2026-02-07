// API Configuration and Route Constants
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Security Configuration from Environment
export const SECURITY_CONFIG = {
    CSRF_ENABLED: import.meta.env.VITE_SECURITY_CSRF_ENABLED === 'true',
    FINGERPRINT_ENABLED: import.meta.env.VITE_SECURITY_FINGERPRINT_ENABLED === 'true',
    MAX_PAYLOAD_SIZE: parseInt(import.meta.env.VITE_SECURITY_MAX_PAYLOAD_SIZE || '10485760'),
    RESPONSE_TIMEOUT: parseInt(import.meta.env.VITE_SECURITY_RESPONSE_TIMEOUT || '30000'),
} as const;

// User Roles
export const ROLES = {
    USER: 'user',
    COLLECTOR: 'collector',
    ARTIST: 'artist',
    INSTITUTION: 'institution',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Route Paths
export const ROUTES = {
    // Public Routes
    HOME: '/',
    GALLERY: '/gallery',
    GALLERY_MUSEUM: '/gallery/museum/:id',
    GALLERY_ARTWORK: '/gallery/artwork/:id',
    NEARBY: '/gallery/nearby',
    MARKETPLACE: '/marketplace',
    MARKETPLACE_NFT: '/marketplace/nft/:id',
    COMMUNITY: '/community',
    COMMUNITY_THREAD: '/community/thread/:id',

    // Auth Routes
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    CALLBACK: '/auth/callback',

    // User/Collector Routes
    USER_DASHBOARD: '/dashboard',
    USER_PROFILE: '/dashboard/profile',
    USER_BOOKMARKS: '/dashboard/bookmarks',
    USER_COLLECTIONS: '/dashboard/collections',
    USER_SETTINGS: '/dashboard/settings',
    // New User Dashboard Routes
    USER_GALLERY: '/dashboard/gallery',
    USER_NEARBY: '/dashboard/nearby',
    USER_GENRE_IDENTIFIER: '/dashboard/genre-identifier',
    USER_AI_CURATION: '/dashboard/ai-curation',
    USER_MARKETPLACE: '/dashboard/marketplace',
    USER_MY_NFTS: '/dashboard/my-nfts',
    USER_COMMUNITY: '/dashboard/community',

    // Artist/Institution Routes
    ARTIST_DASHBOARD: '/artist',
    ARTIST_ARTWORKS: '/artist/artworks',
    ARTIST_UPLOAD: '/artist/upload',
    ARTIST_ANALYTICS: '/artist/analytics',
    ARTIST_PERFORMANCE: '/artist/performance',
    ARTIST_ENGAGEMENT: '/artist/engagement',
    ARTIST_INSTITUTION: '/artist/institution',
    ARTIST_SETTINGS: '/artist/settings',
    ARTIST_NFT: '/artist/nft',

    // Admin Routes
    ADMIN_DASHBOARD: '/admin',
    ADMIN_INSTITUTIONS: '/admin/institutions',
    ADMIN_USERS: '/admin/users',
    ADMIN_ANALYTICS: '/admin/analytics',
    ADMIN_DATABASE: '/admin/database',
    ADMIN_LOGS: '/admin/logs',
    ADMIN_SECURITY: '/admin/security',
    ADMIN_MARKETPLACE: '/admin/marketplace',
    ADMIN_PREMIUM: '/admin/premium',
    ADMIN_SETTINGS: '/admin/settings',
    ADMIN_HEALTH: '/admin/health',
    ADMIN_REPORTS: '/admin/reports',
    ADMIN_PARTNERSHIPS: '/admin/partnerships',
    ADMIN_ALERTS: '/admin/alerts',
    ADMIN_PROFILE: '/admin/profile',

    // AI Features
    AI_GENRE: '/ai/genre',
    AI_CURATION: '/ai/curation',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_GOOGLE: '/auth/google',
    AUTH_CALLBACK: '/auth/callback',
    AUTH_REFRESH: '/auth/refresh',
    AUTH_LOGOUT: '/auth/logout',
    AUTH_ME: '/auth/me',

    // Users
    USERS: '/users',
    USER_PROFILE: '/users/profile',
    USER_BOOKMARKS: '/users/bookmarks',
    USER_COLLECTIONS: '/users/collections',

    // Artworks
    ARTWORKS: '/artworks',
    ARTWORKS_FEATURED: '/artworks/featured',
    ARTWORKS_SEARCH: '/artworks/search',

    // Museums & Galleries
    MUSEUMS: '/museums',
    MUSEUMS_NEARBY: '/museums/nearby',
    GALLERIES: '/galleries',

    // NFTs
    NFTS: '/nfts',
    NFTS_MARKETPLACE: '/nfts/marketplace',

    // Community
    FORUM_THREADS: '/forum/threads',
    FORUM_POSTS: '/forum/posts',

    // Admin
    ADMIN_INSTITUTIONS: '/admin/institutions',
    ADMIN_USERS: '/admin/users',
    ADMIN_ANALYTICS: '/admin/analytics',
    ADMIN_LOGS: '/admin/logs',
    ADMIN_HEALTH: '/admin/health',
    ADMIN_ALERTS: '/admin/alerts',

    // AI
    AI_DETECT_GENRE: '/ai/detect-genre',
    AI_CURATE: '/ai/curate',
} as const;

// Theme Constants
export const THEME = {
    DARK: 'dark',
    LIGHT: 'light',
} as const;

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
} as const;

// Rate Limiting
export const RATE_LIMIT = {
    MAX_REQUESTS_PER_MINUTE: 60,
    RETRY_DELAY_MS: 1000,
    MAX_RETRIES: 3,
} as const;
