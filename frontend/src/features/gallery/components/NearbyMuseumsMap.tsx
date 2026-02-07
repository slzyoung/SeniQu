/**
 * Nearby Museums Map Component
 * Integrates Google Maps (if key present) and List View
 */

import { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { museumService } from '../../../services/museumService';
import { Card, CardContent } from '../../../components/ui';
import { MapPin, Navigation, ExternalLink, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../lib/constants';

// Default center (Jakarta)
const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 };
const LIBRARIES: ("places" | "geometry")[] = ["places"];

export function NearbyMuseumsMap() {
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string>('');

    // Check for API Key
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
    });

    // Get User Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location", error);
                    setLocationError("Could not retrieve your location. Showing default area.");
                }
            );
        } else {
            setLocationError("Geolocation is not supported by this browser.");
        }
    }, []);

    const center = useMemo(() => userLocation || DEFAULT_CENTER, [userLocation]);

    // Fetch Nearby Museums
    const { data: museums, isLoading } = useQuery({
        queryKey: ['museums', 'nearby', center],
        queryFn: async () => {
            // If we have user location, use it. Otherwise uses default center.
            return museumService.getNearbyMuseums({
                lat: center.lat,
                lng: center.lng,
                radius: 50 // 50km radius
            });
        },
        enabled: true, // Always fetch, even properly with default center
    });

    // Render Map Content
    const renderMap = () => {
        if (!apiKey) {
            return (
                <div className="w-full h-96 bg-theme-surface rounded-xl border border-theme-border flex flex-col items-center justify-center p-6 text-center">
                    <MapPin className="w-12 h-12 text-theme-muted mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">Map Unavailable</h3>
                    <p className="text-theme-muted max-w-sm">
                        Google Maps API key is missing. Please configure VITE_GOOGLE_MAPS_API_KEY in your environment.
                    </p>
                </div>
            );
        }

        if (loadError) {
            return (
                <div className="w-full h-96 bg-theme-surface rounded-xl border border-theme-border flex flex-col items-center justify-center p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">Map Error</h3>
                    <p className="text-theme-muted">{loadError.message}</p>
                </div>
            );
        }

        if (!isLoaded) {
            return (
                <div className="w-full h-96 bg-theme-surface rounded-xl border border-theme-border flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            );
        }

        return (
            <GoogleMap
                mapContainerClassName="w-full h-96 rounded-xl border border-theme-border"
                center={center}
                zoom={12}
                options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    styles: [
                        {
                            "elementType": "geometry",
                            "stylers": [{ "color": "#242f3e" }]
                        },
                        {
                            "elementType": "labels.text.stroke",
                            "stylers": [{ "color": "#242f3e" }]
                        },
                        {
                            "elementType": "labels.text.fill",
                            "stylers": [{ "color": "#746855" }]
                        },
                        // ... Simplified dark mode style
                    ]
                }}
            >
                {/* User Marker */}
                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#4285F4',
                            fillOpacity: 1,
                            strokeColor: 'white',
                            strokeWeight: 2,
                        }}
                    />
                )}

                {/* Museum Markers */}
                {museums?.map((museum) => (
                    <Marker
                        key={museum.id}
                        position={{ lat: museum.coordinates.lat, lng: museum.coordinates.lng }}
                        title={museum.name}
                        onClick={() => window.location.href = ROUTES.GALLERY_MUSEUM.replace(':id', museum.id)}
                    />
                ))}
            </GoogleMap>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Section */}
            <div className="lg:col-span-2">
                {locationError && (
                    <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3 text-yellow-500">
                        <Navigation className="w-5 h-5" />
                        <p className="text-sm">{locationError}</p>
                    </div>
                )}
                {renderMap()}
            </div>

            {/* List Section */}
            <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-serif text-xl font-bold text-gold sticky top-0 bg-theme-bg py-2 z-10">
                    Nearest Locations
                </h3>

                {isLoading ? (
                    <div className="py-8 text-center">
                        <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
                        <p className="text-sm text-theme-muted mt-2">Finding nearby gems...</p>
                    </div>
                ) : museums && museums.length > 0 ? (
                    museums.map((museum) => (
                        <Card key={museum.id} variant="elevated" className="hover:border-gold transition-colors group">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-theme-text group-hover:text-gold transition-colors">
                                        {museum.name}
                                    </h4>
                                    <span className="text-xs px-2 py-1 bg-theme-surface rounded-full text-theme-muted border border-theme-border">
                                        {0.0} km
                                    </span>
                                </div>
                                <p className="text-sm text-theme-muted line-clamp-2 mb-3">
                                    {museum.address.street}, {museum.address.city}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={ROUTES.GALLERY_MUSEUM.replace(':id', museum.id)}
                                        className="text-xs font-medium text-gold hover:underline flex items-center gap-1"
                                    >
                                        View Details <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="py-8 text-center bg-theme-surface rounded-xl border border-theme-border">
                        <MapPin className="w-8 h-8 text-theme-muted mx-auto mb-2" />
                        <p className="text-theme-muted">No museums found in this area.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Default export for lazy loading
export default NearbyMuseumsMap;
