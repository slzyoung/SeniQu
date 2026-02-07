/**
 * Nearby Museums Page for User Dashboard
 * Find museums and galleries near user's location
 */

import { useState, useEffect } from 'react';
import {
    MapPin,
    Navigation,
    Building2,
    Search,
    Loader2,
    Clock,
    Star,
    Map,
    List,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { Card, CardContent, Button, Input, Badge, Select } from '../../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useMuseums, useNearbyMuseums } from '../../../hooks/useMuseums';
import { extractArray } from '../../../lib/utils';

// ============================================
// TYPES
// ============================================

type ViewMode = 'map' | 'list';

interface UserLocation {
    latitude: number;
    longitude: number;
}

const radiusOptions = [
    { value: '5', label: '5 km' },
    { value: '10', label: '10 km' },
    { value: '25', label: '25 km' },
    { value: '50', label: '50 km' },
    { value: '100', label: '100 km' },
];

// ============================================
// COMPONENTS
// ============================================

function MuseumCard({
    museum,
    userLocation
}: {
    museum: any;
    userLocation?: UserLocation;
}) {
    const navigate = useNavigate();

    const calculateDistance = (lat: number, lng: number) => {
        if (!userLocation) return null;
        const R = 6371;
        const dLat = (lat - userLocation.latitude) * Math.PI / 180;
        const dLng = (lng - userLocation.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const distance = museum.latitude && museum.longitude
        ? calculateDistance(museum.latitude, museum.longitude)
        : null;

    return (
        <Card
            variant="default"
            hover
            className="cursor-pointer"
            onClick={() => navigate(`/gallery/museum/${museum.id}`)}
        >
            <div className="flex gap-4 p-4">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-theme-elevated">
                    <img
                        src={museum.coverImageUrl || museum.logoUrl || '/placeholder-museum.jpg'}
                        alt={museum.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-medium text-theme-text">{museum.name}</h3>
                            <p className="text-sm text-theme-muted flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {museum.city}, {museum.province || museum.country}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {museum.isVerified && <Badge variant="success">Verified</Badge>}
                            {distance && (
                                <Badge variant="default" className="flex items-center gap-1">
                                    <Navigation className="w-3 h-3" />
                                    {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-theme-muted mt-2 line-clamp-2">{museum.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-theme-muted">
                        {museum.rating && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-gold text-gold" />
                                {museum.rating.toFixed(1)}
                            </span>
                        )}
                        {museum.totalArtworks && (
                            <span><strong className="text-gold">{museum.totalArtworks}</strong> artworks</span>
                        )}
                        {museum.openingHours && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {museum.openingHours}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

function MapPlaceholder({ museums, userLocation }: { museums: any[]; userLocation?: UserLocation }) {
    return (
        <Card variant="elevated" className="relative h-[500px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-theme-elevated to-theme-surface">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                        <Map className="w-20 h-20 text-theme-muted mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-theme-text mb-2">Interactive Map</h3>
                        <p className="text-theme-muted max-w-md">
                            Map integration is available. Configure your Google Maps or Mapbox API key to enable the interactive map view.
                        </p>
                        <Badge variant="default" className="mt-4">
                            {museums.length} locations found
                        </Badge>
                    </div>
                </div>

                {museums.slice(0, 5).map((museum, index) => (
                    <div
                        key={museum.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{
                            top: `${20 + (index * 15)}%`,
                            left: `${20 + (index * 15)}%`,
                        }}
                    >
                        <div className="relative">
                            <MapPin className="w-8 h-8 text-gold drop-shadow-lg" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {museum.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {userLocation && (
                <div className="absolute bottom-4 left-4 bg-theme-card/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-theme-text">Your Location</span>
                </div>
            )}
        </Card>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NearbyMuseumsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [radius, setRadius] = useState('25');
    const [searchQuery, setSearchQuery] = useState('');

    const requestLocation = () => {
        setIsLocating(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setIsLocating(false);
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location permission denied. Please enable location access.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information unavailable.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out.');
                        break;
                    default:
                        setLocationError('An error occurred while getting your location.');
                }
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    useEffect(() => {
        requestLocation();
    }, []);

    // Queries
    const { data: nearbyMuseums, isLoading: nearbyLoading, refetch } = useNearbyMuseums({
        lat: userLocation?.latitude || 0,
        lng: userLocation?.longitude || 0,
        radius: parseInt(radius),
    });

    const { data: allMuseums, isLoading: allLoading } = useMuseums({ limit: 20 });

    // Handle different data shapes (nearbyMuseums could be array or paginated, allMuseums is PaginatedResponse)
    const museums = userLocation
        ? extractArray(nearbyMuseums)
        : extractArray(allMuseums);
    const isLoading = userLocation ? nearbyLoading : allLoading;

    return (
        <PageContainer
            title="Nearby Museums & Galleries"
            description="Discover art institutions near your location"
            actions={
                <Button
                    variant="gold"
                    leftIcon={isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    onClick={requestLocation}
                    disabled={isLocating}
                >
                    <span className="hidden sm:inline">{userLocation ? 'Update Location' : 'Get Location'}</span>
                    <span className="sm:hidden">Locate</span>
                </Button>
            }
        >
            {/* Location Status */}
            {locationError && (
                <Card variant="elevated" className="mb-6 bg-red-500/10 border-red-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-red-500">{locationError}</h4>
                                <p className="text-sm text-theme-muted mt-1">
                                    You can still browse all museums, but distance information won't be available.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {userLocation && (
                <Card variant="elevated" className="mb-6 bg-green-500/10 border-green-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Navigation className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-theme-text">Location Active</h4>
                                    <p className="text-sm text-theme-muted">
                                        Showing museums within {radius}km of your location
                                    </p>
                                </div>
                            </div>
                            <Select
                                options={radiusOptions}
                                value={radius}
                                onChange={(v) => setRadius(v as string)}
                                placeholder="Radius"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* View Toggle & Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <Input
                        placeholder="Search museums..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === 'list' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'map' ? 'gold' : 'ghost'}
                        size="icon"
                        onClick={() => setViewMode('map')}
                    >
                        <Map className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            ) : viewMode === 'map' ? (
                <MapPlaceholder museums={museums} userLocation={userLocation || undefined} />
            ) : museums.length === 0 ? (
                <Card variant="elevated" className="text-center py-16">
                    <Building2 className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">
                        {userLocation ? 'No Museums Found Nearby' : 'Enable Location'}
                    </h3>
                    <p className="text-theme-muted mb-4 max-w-md mx-auto">
                        {userLocation
                            ? `No museums found within ${radius}km of your location. Try increasing the search radius.`
                            : 'Enable location access to find museums near you.'}
                    </p>
                    {!userLocation && (
                        <Button variant="gold" onClick={requestLocation}>
                            Enable Location
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-4">
                    {museums.map((museum: any) => (
                        <MuseumCard
                            key={museum.id}
                            museum={museum}
                            userLocation={userLocation || undefined}
                        />
                    ))}
                </div>
            )}

            {/* Map Integration Note */}
            {viewMode === 'list' && museums.length > 0 && (
                <Card variant="elevated" className="mt-6 bg-gold/5 border-gold/20">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Map className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-theme-text">Map View Available</h4>
                                <p className="text-sm text-theme-muted mt-1">
                                    Switch to map view to see all locations on an interactive map.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </PageContainer>
    );
}

export default NearbyMuseumsPage;
