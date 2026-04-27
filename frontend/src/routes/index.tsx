/**
 * Main Router Configuration
 */

import { lazy } from 'react';
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
const UserDashboard = lazy(() => import('../features/user/pages/UserDashboard'));
const UserProfile = lazy(() => import('../features/user/pages/Profile'));
const UserBookmarks = lazy(() => import('../features/user/pages/Bookmarks'));
const UserCollections = lazy(() => import('../features/user/pages/MyCollectionsPage'));
const UserSettings = lazy(() => import('../features/user/pages/Settings'));
// New User Dashboard Pages
const UserGallery = lazy(() => import('../features/user/pages/GalleryPage'));
const UserNearby = lazy(() => import('../features/user/pages/NearbyMuseumsPage'));
const UserGenreIdentifier = lazy(() => import('../features/user/pages/GenreIdentifierPage'));
const UserAICuration = lazy(() => import('../features/user/pages/AICurationPage'));
const UserMarketplace = lazy(() => import('../features/user/pages/ArtsMarketplacePage'));
const UserMyArts = lazy(() => import('../features/user/pages/MyArtsPage'));
const UserWallet = lazy(() => import('../features/user/pages/WalletPage'));
const UserCommunity = lazy(() => import('../features/user/pages/CommunityPage'));

// Lazy load gallery pages
// Lazy load collections page
const CollectionsPage = lazy(() => import('../features/gallery/pages/CollectionsPage'));

// ... (in routes)

const PublicGallery = lazy(() => import('../features/gallery/pages/PublicGallery'));
const MuseumDetail = lazy(() => import('../features/gallery/pages/MuseumDetail'));
const ArtworkView = lazy(() => import('../features/gallery/pages/ArtworkView'));
const NearbyMuseums = lazy(() => import('../features/gallery/pages/NearbyMuseums'));
const PublicNearbyPage = lazy(() => import('../features/gallery/pages/PublicNearbyPage'));
const CityRegions = lazy(() => import('../features/gallery/pages/CityRegions'));
const RegionMuseums = lazy(() => import('../features/gallery/pages/RegionMuseums'));

// Lazy load marketplace pages
const Marketplace = lazy(() => import('../features/marketplace/pages/Marketplace'));
const ArtDetail = lazy(() => import('../features/marketplace/pages/ArtDetail'));

// Lazy load community pages
const CommunityForum = lazy(() => import('../features/community/pages/CommunityForum'));
const ThreadView = lazy(() => import('../features/community/pages/ThreadView'));

// Lazy load AI pages
const GenreIdentifier = lazy(() => import('../features/ai/pages/GenreIdentifier'));
const AICuration = lazy(() => import('../features/ai/pages/AICuration'));
const AIDashboardPage = lazy(() => import('../features/ai/pages/AIDashboardPage'));

// Lazy load artist pages
const ArtistDashboard = lazy(() => import('../features/artist/pages/ArtistDashboard'));
const MyArtworks = lazy(() => import('../features/artist/pages/MyArtworks'));
const UploadArtwork = lazy(() => import('../features/artist/pages/UploadArtwork'));
const ArtistAnalytics = lazy(() => import('../features/artist/pages/Analytics'));
const ArtistPerformance = lazy(() => import('../features/artist/pages/Performance'));
const ArtistEngagement = lazy(() => import('../features/artist/pages/Engagement'));
const InstitutionProfile = lazy(() => import('../features/artist/pages/InstitutionProfile'));
const ArtistSettings = lazy(() => import('../features/artist/pages/ArtistSettings'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));
const InstitutionManagement = lazy(() => import('../features/admin/pages/InstitutionManagement'));
const AdminManagement = lazy(() => import('../features/admin/pages/AdminManagement'));
const SystemAnalytics = lazy(() => import('../features/admin/pages/SystemAnalytics'));
const DatabaseManagement = lazy(() => import('../features/admin/pages/DatabaseManagement'));
const SystemLogs = lazy(() => import('../features/admin/pages/SystemLogs'));
const SecurityCenter = lazy(() => import('../features/admin/pages/SecurityCenter'));
const ArtsOversight = lazy(() => import('../features/admin/pages/ArtsOversight'));
const PremiumManagement = lazy(() => import('../features/admin/pages/PremiumManagement'));
const GlobalSettings = lazy(() => import('../features/admin/pages/GlobalSettings'));
const SystemHealth = lazy(() => import('../features/admin/pages/SystemHealth'));
const ReportsIssues = lazy(() => import('../features/admin/pages/ReportsIssues'));
const PartnershipManagement = lazy(() => import('../features/admin/pages/PartnershipManagement'));
const SystemAlerts = lazy(() => import('../features/admin/pages/SystemAlerts'));
const AdminProfile = lazy(() => import('../features/admin/pages/AdminProfile'));

// Lazy load layouts
const UserLayout = lazy(() => import('../features/user/UserLayout'));
const ArtistLayout = lazy(() => import('../features/artist/ArtistLayout'));
const AdminLayout = lazy(() => import('../features/admin/AdminLayout'));

// Legal Pages
const TermsOfService = lazy(() => import('../components/common/Legal').then(module => ({ default: module.TermsOfService })));
const PrivacyPolicy = lazy(() => import('../components/common/Legal').then(module => ({ default: module.PrivacyPolicy })));


// Auth callback (still needed for OAuth)
const AuthCallback = lazy(() => import('../features/auth/pages/AuthCallback'));
const CompleteProfilePage = lazy(() => import('../features/auth/pages/CompleteProfilePage'));
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage'));

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
