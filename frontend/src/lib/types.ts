// Global TypeScript Types and Interfaces

import { ROLES } from './constants';

// User Types
export interface User {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    role: typeof ROLES[keyof typeof ROLES];
    // walletAddress removed
    createdAt: string;
    updatedAt: string;
    isVerified: boolean;
    isPremium: boolean;
    socialLinks?: SocialLinks;
    notificationPrefs?: Record<string, boolean>;
    isTwoFactorEnabled?: boolean;
    loginAlertsEnabled?: boolean;
    // embeddedWalletAddress removed
    wallets?: {
        chainType: 'solana' | 'ethereum' | 'polygon';
        address: string;
        verifiedAt: string;
        isEmbedded?: boolean;
    }[];
}

export interface SocialLinks {
    twitter?: string;
    instagram?: string;
    website?: string;
    linkedin?: string;
    telegram?: string;
}

// Auth Types
export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials extends LoginCredentials {
    username: string;
    displayName?: string;
}

// Artwork Types
export interface Artwork {
    id: string;
    title: string;
    description: string;
    artist: Artist;
    images: ArtworkImage[];
    genre: string[];
    medium: string;
    dimensions?: Dimensions;
    year?: number;
    price?: number;
    isArt: boolean;
    artTokenId?: string;
    museum?: Museum;
    gallery?: Gallery;
    createdAt: string;
    updatedAt: string;
    views: number;
    likes: number;
    isBookmarked?: boolean;
    artworkType?: 'physical' | 'digital';
    poaCertificate?: any;
}

export interface ArtworkImage {
    id: string;
    url: string;
    alt?: string;
    isPrimary: boolean;
}

export interface Dimensions {
    width: number;
    height: number;
    depth?: number;
    unit: 'cm' | 'in';
}

// Artist Types
export interface Artist {
    id: string;
    userId: string;
    displayName: string;
    bio?: string;
    avatar?: string;
    artworks: number;
    followers: number;
    isVerified: boolean;
    socialLinks?: SocialLinks;
}

// Address & Coordinates Types
export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Address {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
}

// Museum & Gallery Types
export interface Museum {
    id: string;
    slug?: string;
    name: string;
    description: string;
    address: Address;
    coordinates: Coordinates;
    images: string[];
    artworksCount: number;
    rating?: number;
    openingHours?: OpeningHours;
    contactInfo?: ContactInfo;
    isVerified: boolean;
    reviews?: any[];
    type?: string;
    total_ratings?: number;
    cover_image_url?: string;
}

export interface Gallery {
    id: string;
    name: string;
    description: string;
    owner: Artist;
    address: Address;
    coordinates: Coordinates;
    images: string[];
    artworksCount: number;
    isVerified: boolean;
}


export interface OpeningHours {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
}

export interface ContactInfo {
    phone?: string;
    email?: string;
    website?: string;
}

// Art Types
export interface Art {
    id: string;
    tokenId: string;
    contractAddress: string;
    artwork: Artwork;
    owner: User;
    creator: Artist;
    price: number;
    currency: 'ETH' | 'MATIC' | 'SOL';
    isListed: boolean;
    listingPrice?: number;
    royaltyPercentage: number;
    history: ArtTransaction[];
    createdAt: string;
}

export interface ArtTransaction {
    id: string;
    type: 'mint' | 'transfer' | 'sale' | 'bid';
    from: string;
    to: string;
    price?: number;
    timestamp: string;
    txHash: string;
}

// Collection Types
export interface Collection {
    id: string;
    name: string;
    description?: string;
    owner: User;
    coverImage?: string;
    artworks: Artwork[];
    artworksCount: number;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

// Forum Types
export interface ForumThread {
    id: string;
    title: string;
    content: string;
    author: User;
    category: ForumCategory;
    tags: string[];
    posts: ForumPost[];
    postsCount: number;
    views: number;
    likes: number;
    isPinned: boolean;
    isLocked: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ForumPost {
    id: string;
    content: string;
    author: User;
    threadId: string;
    parentId?: string;
    likes: number;
    createdAt: string;
    updatedAt: string;
}

export interface ForumCategory {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    threadsCount: number;
}

// Analytics Types
export interface AnalyticsData {
    views: TimeSeriesData[];
    likes: TimeSeriesData[];
    sales: TimeSeriesData[];
    revenue: TimeSeriesData[];
}

export interface TimeSeriesData {
    date: string;
    value: number;
}

export interface PerformanceMetrics {
    totalViews: number;
    totalLikes: number;
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
    engagementRate: number;
}

// Admin Types
export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    cpu: number;
    memory: number;
    disk: number;
    lastChecked: string;
}

export interface SystemLog {
    id: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: Record<string, unknown>;
    timestamp: string;
}

export interface SystemAlert {
    id: string;
    type: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

export interface ApiError {
    message: string;
    statusCode: number;
    errors?: Record<string, string[]>;
}

// UI Types
export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

export interface ModalState {
    isOpen: boolean;
    content?: React.ReactNode;
    title?: string;
}

// Search & Filter Types
export interface SearchFilters {
    query?: string;
    genre?: string[];
    medium?: string[];
    priceRange?: [number, number];
    sortBy?: 'newest' | 'oldest' | 'popular' | 'price_asc' | 'price_desc';
    isArt?: boolean;
}

export interface LocationSearch {
    query?: string;
    coordinates?: Coordinates;
    radius?: number; // in km
    type?: 'museum' | 'gallery' | 'all';
}
