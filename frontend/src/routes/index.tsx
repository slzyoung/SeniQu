/**
 * Main Router Configuration
 */

import { lazy } from 'react';
import { lazyWithRetry } from '../utils/lazyImport';
import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    RouterProvider
} from 'react-router-dom';
import { ROUTES, ROLES } from '../lib/constants';
import { ProtectedRoute, PublicOnlyRoute } from '../components/common/ProtectedRoute';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// Landing page components (keep existing)
import { LandingPage } from './LandingPage';

// Lazy load dashboard pages
const UserDashboard = lazyWithRetry(() => import('../features/user/pages/UserDashboard'));
const UserProfile = lazyWithRetry(() => import('../features/user/pages/Profile'));
const UserBookmarks = lazyWithRetry(() => import('../features/user/pages/Bookmarks'));
const UserCollections = lazyWithRetry(() => import('../features/user/pages/MyCollectionsPage'));
const UserSettings = lazyWithRetry(() => import('../features/user/pages/Settings'));
// New User Dashboard Pages
const UserGallery = lazyWithRetry(() => import('../features/user/pages/GalleryPage'));
const UserNearby = lazyWithRetry(() => import('../features/user/pages/NearbyMuseumsPage'));
const UserGenreIdentifier = lazyWithRetry(() => import('../features/user/pages/GenreIdentifierPage'));
const UserAICuration = lazyWithRetry(() => import('../features/user/pages/AICurationPage'));
const UserMarketplace = lazyWithRetry(() => import('../features/user/pages/ArtsMarketplacePage'));
const UserMyArts = lazyWithRetry(() => import('../features/user/pages/MyArtsPage'));
const UserWallet = lazyWithRetry(() => import('../features/user/pages/WalletPage'));
const UserCommunity = lazyWithRetry(() => import('../features/user/pages/CommunityPage'));

// Lazy load gallery pages
// Lazy load collections page
const CollectionsPage = lazyWithRetry(() => import('../features/gallery/pages/CollectionsPage'));

// ... (in routes)

const PublicGallery = lazyWithRetry(() => import('../features/gallery/pages/PublicGallery'));
const MuseumDetail = lazyWithRetry(() => import('../features/gallery/pages/MuseumDetail'));
const ArtworkView = lazyWithRetry(() => import('../features/gallery/pages/ArtworkView'));
const NearbyMuseums = lazyWithRetry(() => import('../features/gallery/pages/NearbyMuseums'));
const PublicNearbyPage = lazyWithRetry(() => import('../features/gallery/pages/PublicNearbyPage'));
const CityRegions = lazyWithRetry(() => import('../features/gallery/pages/CityRegions'));
const RegionMuseums = lazyWithRetry(() => import('../features/gallery/pages/RegionMuseums'));

// Lazy load marketplace pages
const Marketplace = lazyWithRetry(() => import('../features/marketplace/pages/Marketplace'));
const ArtDetail = lazyWithRetry(() => import('../features/marketplace/pages/ArtDetail'));

// Lazy load community pages
const CommunityForum = lazyWithRetry(() => import('../features/community/pages/CommunityForum'));
const ThreadView = lazyWithRetry(() => import('../features/community/pages/ThreadView'));

// Lazy load AI pages
const GenreIdentifier = lazyWithRetry(() => import('../features/ai/pages/GenreIdentifier'));
const AICuration = lazyWithRetry(() => import('../features/ai/pages/AICuration'));
const AIDashboardPage = lazyWithRetry(() => import('../features/ai/pages/AIDashboardPage'));

// Lazy load artist pages
const ArtistDashboard = lazyWithRetry(() => import('../features/artist/pages/ArtistDashboard'));
const MyArtworks = lazyWithRetry(() => import('../features/artist/pages/MyArtworks'));
const UploadArtwork = lazyWithRetry(() => import('../features/artist/pages/UploadArtwork'));
const ArtistAnalytics = lazyWithRetry(() => import('../features/artist/pages/Analytics'));
const ArtistPerformance = lazyWithRetry(() => import('../features/artist/pages/Performance'));
const ArtistEngagement = lazyWithRetry(() => import('../features/artist/pages/Engagement'));
const InstitutionProfile = lazyWithRetry(() => import('../features/artist/pages/InstitutionProfile'));
const ArtistSettings = lazyWithRetry(() => import('../features/artist/pages/ArtistSettings'));

// Lazy load admin pages
const AdminDashboard = lazyWithRetry(() => import('../features/admin/pages/AdminDashboard'));
const InstitutionManagement = lazyWithRetry(() => import('../features/admin/pages/InstitutionManagement'));
const AdminManagement = lazyWithRetry(() => import('../features/admin/pages/AdminManagement'));
const SystemAnalytics = lazyWithRetry(() => import('../features/admin/pages/SystemAnalytics'));
const DatabaseManagement = lazyWithRetry(() => import('../features/admin/pages/DatabaseManagement'));
const SystemLogs = lazyWithRetry(() => import('../features/admin/pages/SystemLogs'));
const SecurityCenter = lazyWithRetry(() => import('../features/admin/pages/SecurityCenter'));
const ArtsOversight = lazyWithRetry(() => import('../features/admin/pages/ArtsOversight'));
const PremiumManagement = lazyWithRetry(() => import('../features/admin/pages/PremiumManagement'));
const GlobalSettings = lazyWithRetry(() => import('../features/admin/pages/GlobalSettings'));
const SystemHealth = lazyWithRetry(() => import('../features/admin/pages/SystemHealth'));
const ReportsIssues = lazyWithRetry(() => import('../features/admin/pages/ReportsIssues'));
const PartnershipManagement = lazyWithRetry(() => import('../features/admin/pages/PartnershipManagement'));
const SystemAlerts = lazyWithRetry(() => import('../features/admin/pages/SystemAlerts'));
const AdminAlerts = lazyWithRetry(() => import('../features/admin/pages/SystemAlerts'));
const AdminProfile = lazyWithRetry(() => import('../features/admin/pages/AdminProfile'));
const AdminWalletPage = lazyWithRetry(() => import('../features/admin/pages/AdminWalletPage'));
// Lazy load layouts
const UserLayout = lazyWithRetry(() => import('../features/user/UserLayout'));
const ArtistLayout = lazyWithRetry(() => import('../features/artist/ArtistLayout'));
const AdminLayout = lazyWithRetry(() => import('../features/admin/AdminLayout'));

// Legal Pages
const TermsOfService = lazyWithRetry(() => import('../components/common/Legal').then(module => ({ default: module.TermsOfService })));
const PrivacyPolicy = lazyWithRetry(() => import('../components/common/Legal').then(module => ({ default: module.PrivacyPolicy })));


// Auth callback (still needed for OAuth)
const AuthCallback = lazyWithRetry(() => import('../features/auth/pages/AuthCallback'));
const CompleteProfilePage = lazyWithRetry(() => import('../features/auth/pages/CompleteProfilePage'));
const VerifyEmailPage = lazyWithRetry(() => import('../pages/VerifyEmailPage'));

import { GlobalLayout } from '../components/common/GlobalLayout';
import { PublicLayout } from '../components/common/PublicLayout';

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<GlobalLayout />} errorElement={<ErrorBoundary><div>Error loading page</div></ErrorBoundary>}>
            {/* Public Routes - Landing - Redirects to dashboard if logged in */}
            <Route path={ROUTES.HOME} element={
                <PublicOnlyRoute>
                    <LandingPage />
                </PublicOnlyRoute>
            } />

            {/* Auth Routes - Login/Register now use AuthModal on landing page */}
            {/* Redirect old login/register routes to home */}
            <Route path={ROUTES.LOGIN} element={<LandingPage openAuthModal />} />
            <Route path={ROUTES.REGISTER} element={<LandingPage openAuthModal />} />
            <Route path={ROUTES.CALLBACK} element={<AuthCallback />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />

            {/* Public Layout Routes - Marketplace, Community, AI, Gallery */}
            <Route element={<PublicLayout />}>
                {/* Marketplace Routes */}
                <Route path={ROUTES.MARKETPLACE} element={<Marketplace />} />
                <Route path={ROUTES.MARKETPLACE_ART} element={<ArtDetail />} />

                {/* Community Routes */}
                <Route path={ROUTES.COMMUNITY} element={<CommunityForum />} />
                <Route path={ROUTES.COMMUNITY_THREAD} element={<ThreadView />} />

                {/* AI Routes */}
                <Route path={ROUTES.AI_GENRE} element={<GenreIdentifier />} />
                <Route path={ROUTES.AI_CURATION} element={<AICuration />} />

                {/* Gallery Routes */}
                <Route path={ROUTES.GALLERY} element={<PublicGallery />} />
                <Route path={ROUTES.COLLECTIONS} element={<CollectionsPage />} />
                <Route path={ROUTES.GALLERY_CITY_REGIONS} element={<CityRegions />} />
                <Route path={ROUTES.GALLERY_REGION_MUSEUMS} element={<RegionMuseums />} />
                <Route path={ROUTES.GALLERY_MUSEUM} element={<MuseumDetail />} />
                <Route path={ROUTES.GALLERY_ARTWORK} element={<ArtworkView />} />
                <Route path={ROUTES.NEARBY} element={<NearbyMuseums />} />
                <Route path={ROUTES.NEARBY_PUBLIC} element={<PublicNearbyPage />} />

                {/* Legal Routes */}
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
            </Route>

            {/* User/Collector Dashboard Routes */}
            <Route element={
                <ProtectedRoute roles={[ROLES.USER, ROLES.COLLECTOR]}>
                    <UserLayout />
                </ProtectedRoute>
            }>
                <Route path={ROUTES.USER_DASHBOARD} element={<UserDashboard />} />
                <Route path={ROUTES.USER_PROFILE} element={<UserProfile />} />
                <Route path={ROUTES.USER_BOOKMARKS} element={<UserBookmarks />} />
                <Route path={ROUTES.USER_COLLECTIONS} element={<UserCollections />} />
                <Route path={ROUTES.USER_SETTINGS} element={<UserSettings />} />
                {/* New User Dashboard Routes */}
                <Route path={ROUTES.USER_GALLERY} element={<UserGallery />} />
                <Route path={ROUTES.USER_NEARBY} element={<UserNearby />} />
                <Route path={ROUTES.USER_GENRE_IDENTIFIER} element={<UserGenreIdentifier />} />
                <Route path={ROUTES.USER_AI_CURATION} element={<UserAICuration />} />
                <Route path={ROUTES.USER_AI_CREATE} element={<AIDashboardPage />} />
                <Route path={ROUTES.USER_MARKETPLACE} element={<UserMarketplace />} />
                <Route path={ROUTES.USER_MY_ARTS} element={<UserMyArts />} />
                <Route path={ROUTES.USER_WALLET} element={<UserWallet />} />
                <Route path={ROUTES.USER_COMMUNITY} element={<UserCommunity />} />
            </Route>

            {/* Artist/Institution Dashboard Routes */}
            <Route element={
                <ProtectedRoute roles={[ROLES.ARTIST, ROLES.INSTITUTION]}>
                    <ArtistLayout />
                </ProtectedRoute>
            }>
                <Route path={ROUTES.ARTIST_DASHBOARD} element={<ArtistDashboard />} />
                <Route path={ROUTES.ARTIST_ARTWORKS} element={<MyArtworks />} />
                <Route path={ROUTES.ARTIST_UPLOAD} element={<UploadArtwork />} />
                <Route path={ROUTES.ARTIST_ANALYTICS} element={<ArtistAnalytics />} />
                <Route path={ROUTES.ARTIST_PERFORMANCE} element={<ArtistPerformance />} />
                <Route path={ROUTES.ARTIST_ENGAGEMENT} element={<ArtistEngagement />} />
                <Route path={ROUTES.ARTIST_INSTITUTION} element={<InstitutionProfile />} />
                <Route path={ROUTES.ARTIST_SETTINGS} element={<ArtistSettings />} />
            </Route>

            {/* Super Admin Dashboard Routes */}
            <Route element={
                <ProtectedRoute roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                    <AdminLayout />
                </ProtectedRoute>
            }>
                <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
                <Route path={ROUTES.ADMIN_INSTITUTIONS} element={<InstitutionManagement />} />
                <Route path={ROUTES.ADMIN_USERS} element={<AdminManagement />} />
                <Route path={ROUTES.ADMIN_ANALYTICS} element={<SystemAnalytics />} />
                <Route path={ROUTES.ADMIN_DATABASE} element={<DatabaseManagement />} />
                <Route path={ROUTES.ADMIN_LOGS} element={<SystemLogs />} />
                <Route path={ROUTES.ADMIN_SECURITY} element={<SecurityCenter />} />
                <Route path={ROUTES.ADMIN_MARKETPLACE} element={<ArtsOversight />} />
                <Route path={ROUTES.ADMIN_PREMIUM} element={<PremiumManagement />} />
                <Route path={ROUTES.ADMIN_SETTINGS} element={<GlobalSettings />} />
                <Route path={ROUTES.ADMIN_HEALTH} element={<SystemHealth />} />
                <Route path={ROUTES.ADMIN_REPORTS} element={<ReportsIssues />} />
                <Route path={ROUTES.ADMIN_PARTNERSHIPS} element={<PartnershipManagement />} />
                <Route path={ROUTES.ADMIN_ALERTS} element={<SystemAlerts />} />
                <Route path={ROUTES.ADMIN_PROFILE} element={<AdminProfile />} />
                <Route path={ROUTES.ADMIN_MY_WALLET} element={<UserWallet />} />
                <Route path={ROUTES.ADMIN_WALLETS} element={<AdminWalletPage />} />
            </Route>
        </Route>
    ),
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true,
            v7_normalizeFormMethod: true,
            v7_partialHydration: true,
            v7_skipActionErrorRevalidation: true,
        } as any,
    }
);

export function AppRouter() {
    return <RouterProvider router={router} />;
}

export default AppRouter;
