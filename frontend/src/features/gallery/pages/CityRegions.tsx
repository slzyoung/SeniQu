import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { XCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageContainer } from '../../../components/common/DashboardLayout';
import { museumService } from '../../../services/museumService';

import { 
    CITY_WHITELIST, 
    CITY_REGIONS_MAP, 
    CityMetadata, 
    RegionDetail,
    classifyPlace
} from '../data/citiesRegistry';

import { RegionExplorationView } from '../components/RegionExplorationView';
import { RegionDetailFeedView } from '../components/RegionDetailFeedView';
import { PlaceDetailsView } from '../components/PlaceDetailsView';

type FilterType = 'museum' | 'gallery' | 'heritage';
type ViewMode = 'list' | 'map';
type NavigationPage = 'regions' | 'places' | 'details';

// ============================================
// CURATED MASTERPIECE COLLECTIONS (R2 CDN Mockups)
// ============================================
interface ArtCollectionItem {
    title: string;
    artist: string;
    year: string;
    medium: string;
    imageUrl: string;
    description: string;
}

const MASTERPIECE_COLLECTIONS: Record<string, ArtCollectionItem[]> = {
    museum: [
        {
            title: 'Penangkapan Pangeran Diponegoro',
            artist: 'Raden Saleh',
            year: '1857',
            medium: 'Oil on Canvas',
            imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
            description: 'Karya historis legendaris menggambarkan pengkhianatan Belanda terhadap pemimpin gerilya Diponegoro.'
        },
        {
            title: 'Self Portrait with Pipe',
            artist: 'Affandi',
            year: '1974',
            medium: 'Oil on Canvas (Squeezed directly from tube)',
            imageUrl: 'https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?w=800&q=80',
            description: 'Lukisan ekspresionis mahakarya Affandi memancarkan kejujuran spiritualitas kemanusiaan.'
        },
        {
            title: 'Wayang Kulit Purwa - Bima Sena',
            artist: 'Kriya Sungging Kasongan',
            year: 'Abad 19',
            medium: 'Buffalo Parchment & Gold Leaf',
            imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c026f47?w=800&q=80',
            description: 'Kerajinan tatah sungging halus dengan lapisan prada emas menggambarkan karakter pewayangan legendaris.'
        },
        {
            title: 'Mahkota Emas Kerajaan Banten',
            artist: 'Pandai Emas Banten Purba',
            year: 'Abad 17',
            medium: 'Gold & Gemstones',
            imageUrl: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80',
            description: 'Mahkota emas peninggalan Kesultanan Banten yang melambangkan kekuasaan maritim.'
        }
    ],
    gallery: [
        {
            title: 'Komposisi Bidang Tradisi Nusantara',
            artist: 'A.D. Pirous',
            year: '1998',
            medium: 'Acrylic & Gold Foil on Canvas',
            imageUrl: 'https://images.unsplash.com/photo-1579541592065-da8a1fbfa40a?w=800&q=80',
            description: 'Eksplorasi kaligrafi berpadu dengan ornamen etnik kebudayaan Nusantara.'
        },
        {
            title: 'Batik Tulis Keraton Yogyakarta - Motif Sogan',
            artist: 'Abdi Dalem Kriya Batik',
            year: '1950',
            medium: 'Natural Dyes on Primissima Cotton',
            imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
            description: 'Batik motif sakral dengan pewarna alami sogan yang dikenakan oleh keluarga kerajaan.'
        },
        {
            title: 'Ibu Menyusui Anak',
            artist: 'Hendra Gunawan',
            year: '1970',
            medium: 'Oil on Canvas',
            imageUrl: 'https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?w=800&q=80',
            description: 'Refleksi perjuangan kasih sayang ibu rakyat jelata dalam sapuan warna cerah dramatis.'
        }
    ],
    heritage: [
        {
            title: 'Pusaka Keris Jawa - Dapur Sengkelat Luk 13',
            artist: 'Mpu Supa Mandagri (Era Majapahit)',
            year: 'Abad 15',
            medium: 'Iron, Nickel Meteorite & Teak Wood',
            imageUrl: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80',
            description: 'Karya tempa logam sakral dengan pamor meteorit wos wutah perlambang kemakmuran.'
        },
        {
            title: 'Patung Dewa Wisnu Mengendarai Garuda',
            artist: 'I Nyoman Nuarta',
            year: '2018',
            medium: 'Copper & Brass Alloy',
            imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
            description: 'Representasi ikonik GWK Bali yang mencerminkan dedikasi seni pahat raksasa modern.'
        },
        {
            title: 'Relif Penobatan Raja Candi Borobudur',
            artist: 'Pahat Kuno Sailendra',
            year: 'Abad 8',
            medium: 'Andesite Stone',
            imageUrl: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80',
            description: 'Relif batu andesit menceritakan perjalanan spritual Siddhartha Gautama.'
        }
    ]
};

export function CityRegions() {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // ============================================
    // STATE DECLARATIONS (Mobile state machine)
    // ============================================
    const [currentPage, setCurrentPage] = useState<NavigationPage>('regions');
    const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
    const [selectedPlace, setSelectedPlace] = useState<any | null>(null);

    const [places, setPlaces] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('museum');
    const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    
    // UI state controls
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isMobile, setIsMobile] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    // Wikipedia History state
    const [wikiLoadingId, setWikiLoadingId] = useState<string | null>(null);
    const [wikiDataMap, setWikiDataMap] = useState<Record<string, any>>({});
    const [wikiErrorMap, setWikiErrorMap] = useState<Record<string, string>>({});

    // Artwork Collections modal state
    const [collectionLoading, setCollectionLoading] = useState(false);
    const [collectionArtworks, setCollectionArtworks] = useState<any[]>([]);

    // DOM references
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const leafletMapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());

    // Validate parameter (Anti-Hacking Security check)
    const normalizedCityId = id.toLowerCase().trim();
    const cityMetadata = useMemo(() => {
        return CITY_WHITELIST[normalizedCityId] || null;
    }, [normalizedCityId]);

    // Handle viewport size detection
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle invalid city immediately
    if (!cityMetadata) {
        return (
            <PageContainer>
                <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
                    <XCircle className="w-16 h-16 text-red-500 mb-4 opacity-80" />
                    <h3 className="text-2xl font-bold text-theme-text mb-2">City Not Found</h3>
                    <p className="text-theme-muted mb-6">Kota atau kabupaten dengan ID "{id}" tidak ditemukan dalam sistem kami.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 rounded-full bg-gold text-charcoal hover:bg-gold/90 font-medium transition-all shadow-lg"
                    >
                        Kembali ke Beranda
                    </button>
                </div>
            </PageContainer>
        );
    }

    // ============================================
    // DATA FETCHING & API INTERACTION (Anti-Throttling)
    // ============================================
    useEffect(() => {
        let isSubscribed = true;

        const loadCityPlaces = async () => {
            setIsLoading(true);
            setErrorMsg(null);
            setIsOfflineMode(false);
            
            try {
                // Fetch using coordinates mapped from whitelist (stable coords prevent cache misses)
                const res = await museumService.searchNearbyPlaces(
                    cityMetadata.lat,
                    cityMetadata.lng,
                    cityMetadata.radius
                );

                if (!isSubscribed) return;

                const loadedPlaces = res?.places || [];
                setPlaces(loadedPlaces);
                
                if (res?.quotaExceeded) {
                    setIsOfflineMode(true);
                }
            } catch (err: any) {
                console.error('[CITY_PLACES_FETCH] Error:', err);
                if (isSubscribed) {
                    setErrorMsg('Gagal memuat destinasi cagar budaya untuk kota ini. Coba lagi beberapa saat.');
                }
            } finally {
                if (isSubscribed) {
                    setIsLoading(false);
                }
            }
        };

        loadCityPlaces();

        return () => {
            isSubscribed = false;
        };
    }, [cityMetadata]);

    // ============================================
    // DYNAMIC REGION CALCULATION & FILTERING
    // ============================================
    const regionsList = useMemo(() => {
        return CITY_REGIONS_MAP[normalizedCityId] || [];
    }, [normalizedCityId]);

    // Calculate place counts for each district dynamically
    const regionStats = useMemo(() => {
        const counts: Record<string, number> = { all: places.length };
        regionsList.forEach(reg => {
            counts[reg.id] = 0;
        });

        places.forEach(place => {
            const address = (place.address || '').toLowerCase();
            const name = (place.name || '').toLowerCase();
            const cityField = (place.city || '').toLowerCase();
            
            regionsList.forEach(reg => {
                const matches = reg.keywords.some(keyword => 
                    address.includes(keyword) || 
                    name.includes(keyword) || 
                    cityField.includes(keyword)
                );
                if (matches) {
                    counts[reg.id]++;
                }
            });
        });

        return counts;
    }, [places, regionsList]);

    // Dynamically resolve region card images using real place cover images from Google Maps/DB
    const regionImages = useMemo(() => {
        const images: Record<string, string> = {};
        regionsList.forEach(reg => {
            const placeWithImage = places.find(place => {
                const img = place.cover_image_url || (place.photos && place.photos[0]);
                if (!img) return false;

                const address = (place.address || '').toLowerCase();
                const name = (place.name || '').toLowerCase();
                const cityField = (place.city || '').toLowerCase();

                return reg.keywords.some(keyword =>
                    address.includes(keyword) ||
                    name.includes(keyword) ||
                    cityField.includes(keyword)
                );
            });

            if (placeWithImage) {
                images[reg.id] = placeWithImage.cover_image_url || placeWithImage.photos[0];
            } else {
                images[reg.id] = reg.image;
            }
        });
        return images;
    }, [places, regionsList]);

    // Filtered by active region
    const regionPlaces = useMemo(() => {
        let result = places;
        if (selectedRegionId !== 'all') {
            const activeReg = regionsList.find(r => r.id === selectedRegionId);
            if (activeReg) {
                result = places.filter(place => {
                    const address = (place.address || '').toLowerCase();
                    const name = (place.name || '').toLowerCase();
                    const cityField = (place.city || '').toLowerCase();
                    return activeReg.keywords.some(keyword => 
                        address.includes(keyword) || 
                        name.includes(keyword) || 
                        cityField.includes(keyword)
                    );
                });
            }
        }
        return result;
    }, [places, selectedRegionId, regionsList]);

    // Apply subcategory filter tabs with smart, robust classification mapping
    const filteredPlaces = useMemo(() => {
        return regionPlaces.filter(place => {
            return classifyPlace(place) === activeFilter;
        });
    }, [regionPlaces, activeFilter]);

    // Compute category counts for pills in active region
    const categoryCounts = useMemo(() => {
        const counts = { museum: 0, gallery: 0, heritage: 0 };
        regionPlaces.forEach(place => {
            const category = classifyPlace(place);
            if (category) {
                counts[category]++;
            }
        });
        return counts;
    }, [regionPlaces]);

    // ============================================
    // LEAFLET MAP HANDLERS
    // ============================================
    useEffect(() => {
        // Initialize Map only when rendering the places screen in Map View
        if (currentPage !== 'places' || !mapContainerRef.current) return;
        if (isMobile && viewMode === 'list') return;

        if (leafletMapInstanceRef.current) {
            leafletMapInstanceRef.current.remove();
        }

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView([cityMetadata.lat, cityMetadata.lng], 11);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
        }).addTo(map);

        leafletMapInstanceRef.current = map;
        setLeafletMap(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            if (leafletMapInstanceRef.current) {
                leafletMapInstanceRef.current.remove();
                leafletMapInstanceRef.current = null;
            }
            setLeafletMap(null);
            markersRef.current.clear();
        };
    }, [cityMetadata, currentPage, viewMode, isMobile]);

    // Synchronize pins on the Leaflet Map viewport
    useEffect(() => {
        const map = leafletMap;
        if (!map || currentPage !== 'places') return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current.clear();

        filteredPlaces.forEach(place => {
            const lat = place.latitude || place.coordinates?.lat;
            const lng = place.longitude || place.coordinates?.lng;
            if (!lat || !lng) return;

            const type = (place.type || 'museum').toLowerCase();

            let emoji = '🏛️';
            let bgClass = 'bg-amber-500';
            if (type === 'gallery') {
                emoji = '🎨';
                bgClass = 'bg-purple-600';
            } else if (type === 'heritage') {
                emoji = '🏯';
                bgClass = 'bg-emerald-600';
            }

            const pinIcon = L.divIcon({
                html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg transition-all duration-300 ${bgClass} hover:scale-110">
                    <span class="text-sm select-none">${emoji}</span>
                </div>`,
                className: 'custom-city-pin',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            const marker = L.marker([lat, lng], { icon: pinIcon })
                .addTo(map)
                .on('click', () => {
                    handleSelectPlace(place);
                });

            markersRef.current.set(place.id, marker);
        });

        if (filteredPlaces.length > 0) {
            const group = L.featureGroup(Array.from(markersRef.current.values()));
            map.fitBounds(group.getBounds().pad(0.15), { animate: true });
        } else {
            map.setView([cityMetadata.lat, cityMetadata.lng], 11, { animate: true });
        }
    }, [filteredPlaces, leafletMap, currentPage]);

    // ============================================
    // SELECTION & VIEW SWITCH CONTROLLERS
    // ============================================
    const handleSelectRegion = (regionId: string) => {
        setSelectedRegionId(regionId);
        setCurrentPage('places');
    };

    const handleSelectPlace = async (place: any) => {
        setSelectedPlace(place);
        setCurrentPage('details');
        setIsFollowing(false);
        setCollectionLoading(true);
        setCollectionArtworks([]);

        let detailedPlace = place;
        try {
            const details = await museumService.getPlaceDetails(place.id);
            if (details) {
                detailedPlace = details;
                setSelectedPlace(details);
            }
        } catch (error) {
            console.error('[DETAILS_FETCH] Error:', error);
        }

        // Autoload Wikipedia History detail
        const id = detailedPlace.id;
        if (!wikiDataMap[id]) {
            setWikiLoadingId(id);
            try {
                const res = await museumService.getWikipediaSummary(detailedPlace.name);
                if (res && res.extract) {
                    setWikiDataMap(prev => ({ ...prev, [id]: res }));
                } else {
                    setWikiErrorMap(prev => ({ ...prev, [id]: 'Sejarah singkat tidak ditemukan.' }));
                }
            } catch (error) {
                console.error('[WIKI_FETCH] Error:', error);
                setWikiErrorMap(prev => ({ ...prev, [id]: 'Gagal menghubungkan ke Wikipedia.' }));
            } finally {
                setWikiLoadingId(null);
            }
        }

        // Fetch Digital R2 Artworks / Collections
        try {
            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(place.id);
            let artworks: any[] = [];
            if (isUuid) {
                const response = await fetch(`/api/v1/museums/${place.id}/artworks`);
                if (response.ok) {
                    const data = await response.json();
                    artworks = data?.data || data || [];
                }
            }

            if (artworks.length === 0) {
                const category = (place.type || 'museum').toLowerCase();
                const matchedFallbacks = MASTERPIECE_COLLECTIONS[category] || MASTERPIECE_COLLECTIONS.museum;
                artworks = matchedFallbacks.map((item, index) => ({
                    id: `art-${index}`,
                    title: item.title,
                    artist: { displayName: item.artist },
                    year: item.year,
                    medium: item.medium,
                    primary_image_url: item.imageUrl,
                    description: item.description
                }));
            }

            setCollectionArtworks(artworks);
        } catch (error) {
            console.error('[COLLECTION_FETCH] Error:', error);
            const category = (place.type || 'museum').toLowerCase();
            const matchedFallbacks = MASTERPIECE_COLLECTIONS[category] || MASTERPIECE_COLLECTIONS.museum;
            setCollectionArtworks(matchedFallbacks.map((item, index) => ({
                id: `art-err-${index}`,
                title: item.title,
                artist: { displayName: item.artist },
                year: item.year,
                medium: item.medium,
                primary_image_url: item.imageUrl,
                description: item.description
            })));
        } finally {
            setCollectionLoading(false);
        }
    };

    const handleBackToRegions = () => {
        setCurrentPage('regions');
        setSelectedRegionId('all');
        setSelectedPlace(null);
    };

    const handleBackToPlaces = () => {
        setCurrentPage('places');
        setSelectedPlace(null);
    };

    return (
        <PageContainer>
            {/* Custom Vintage Gold Frame CSS Injection */}
            <style>{`
                .vintage-double-border {
                    border: 8px solid #b38646;
                    outline: 2px solid #5a3c1b;
                    outline-offset: -5px;
                    box-shadow: 
                        0 8px 16px rgba(0,0,0,0.4), 
                        inset 0 0 12px rgba(0,0,0,0.6);
                    background-color: #211c14;
                    padding: 6px;
                }
                .label-plate {
                    background: linear-gradient(135deg, #FAF8F5 0%, #EBE7E0 100%);
                    border: 1px solid #c3b7a7;
                    border-bottom: 2px solid #a3927d;
                    box-shadow: inset 0 1px 0 white, 0 2px 4px rgba(0,0,0,0.06);
                }
            `}</style>

            <div className="max-w-md mx-auto px-4 py-4 min-h-[90vh] pb-24 relative bg-theme-bg/30">
                      <AnimatePresence mode="wait">
                    {currentPage === 'regions' && (
                        <RegionExplorationView
                            cityMetadata={cityMetadata}
                            regionsList={regionsList}
                            regionStats={regionStats}
                            regionImages={regionImages}
                            onSelectRegion={handleSelectRegion}
                            onBack={() => navigate('/')}
                        />
                    )}

                    {currentPage === 'places' && (
                        <RegionDetailFeedView
                            regionsList={regionsList}
                            selectedRegionId={selectedRegionId}
                            filteredPlaces={filteredPlaces}
                            isOfflineMode={isOfflineMode}
                            errorMsg={errorMsg}
                            activeFilter={activeFilter}
                            setActiveFilter={setActiveFilter}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            isLoading={isLoading}
                            onSelectPlace={handleSelectPlace}
                            onBackToRegions={handleBackToRegions}
                            mapContainerRef={mapContainerRef}
                            categoryCounts={categoryCounts}
                        />
                    )}

                    {currentPage === 'details' && selectedPlace && (
                        <PlaceDetailsView
                            selectedPlace={selectedPlace}
                            cityMetadata={cityMetadata}
                            isFollowing={isFollowing}
                            setIsFollowing={setIsFollowing}
                            wikiLoadingId={wikiLoadingId}
                            wikiDataMap={wikiDataMap}
                            wikiErrorMap={wikiErrorMap}
                            collectionLoading={collectionLoading}
                            collectionArtworks={collectionArtworks}
                            onBackToPlaces={handleBackToPlaces}
                        />
                    )}
                </AnimatePresence>
            </div>
        </PageContainer>
    );
}

export default CityRegions;
