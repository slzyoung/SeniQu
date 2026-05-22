/**
 * NearbyMuseumsPage — Explore & Nearby (Authenticated Dashboard View)
 * Adapts PublicNearbyPage component for the dashboard layout context.
 */

import PublicNearbyPage from '../../../gallery/pages/PublicNearbyPage';

export function NearbyMuseumsPage() {
    return <PublicNearbyPage isDashboard={true} />;
}

export default NearbyMuseumsPage;
