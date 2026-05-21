/**
 * Museums Service - Business Logic
 * Handles museum/gallery CRUD with geolocation queries
 */

import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    Logger,
} from "@nestjs/common"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { ConfigService } from "@nestjs/config"
import { CreateMuseumDto } from "./dto/create-museum.dto"
import { UpdateMuseumDto } from "./dto/update-museum.dto"
import { SearchMuseumDto } from "./dto/search-museum.dto"

@Injectable()
export class MuseumsService {
    private readonly logger = new Logger(MuseumsService.name)
    private readonly supabase: SupabaseClient

    constructor(private configService: ConfigService) {
        this.supabase = createClient(
            this.configService.get<string>("SUPABASE_URL")!,
            this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
        )
    }

    /**
     * Find all museums with filtering and pagination
     */
    async findAll(query: SearchMuseumDto) {
        const { page = 1, limit = 20, city, type, search, verified } = query
        const offset = (page - 1) * limit

        let queryBuilder = this.supabase
            .from("institutions")
            .select("*, owner:users!institutions_owner_id_fkey(id, display_name, avatar_url)", { count: "exact" })

        // Filters
        if (city) {
            queryBuilder = queryBuilder.ilike("city", `%${city}%`)
        }
        if (type) {
            queryBuilder = queryBuilder.eq("type", type)
        }
        if (verified !== undefined) {
            queryBuilder = queryBuilder.eq("is_verified", verified)
        }
        if (search) {
            queryBuilder = queryBuilder.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        // Only show verified by default for public queries
        queryBuilder = queryBuilder.eq("is_verified", true)

        // Pagination
        const { data, error, count } = await queryBuilder
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Failed to fetch museums: ${error.message}`)
            throw error
        }

        return {
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    /**
     * Find museums near a geographic location
     */
    async findNearby(lat: number, lng: number, radiusKm: number) {
        // Using PostGIS ST_DWithin function via RPC
        const { data, error } = await this.supabase.rpc("find_nearby_institutions", {
            lat,
            lng,
            radius_km: radiusKm,
        })

        if (error) {
            this.logger.error(`Nearby search failed: ${error.message}`)
            // Fallback: return all in same city
            return { data: [], error: error.message }
        }

        return { data }
    }

    /**
     * Search nearby places using Google Places API (New)
     * POST https://places.googleapis.com/v1/places:searchNearby
     *
     * Returns museums, galleries, and heritage/cultural sites within max 70km.
     * Only uses verified-valid Table A types to prevent 400 errors.
     * Sequential batch processing with delay for anti-throttling.
     */
    async searchNearbyPlaces(lat: number, lng: number, radiusMeters: number, query?: string) {
        // === Input validation & sanitization ===
        const safeLat = Math.max(-90, Math.min(90, Number(lat) || 0));
        const safeLng = Math.max(-180, Math.min(180, Number(lng) || 0));
        const MAX_RADIUS_KM = 70;
        const MAX_RADIUS_M = MAX_RADIUS_KM * 1000;
        const GOOGLE_MAX_RADIUS = 50000;
        const safeRadius = Math.min(Math.max(1000, Number(radiusMeters) || MAX_RADIUS_M), MAX_RADIUS_M);

        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_API_KEY || '';
        let referer = this.configService.get<string>('FRONTEND_URL')
            || process.env.FRONTEND_URL || 'http://localhost:5173';
        if (referer.includes('localhost')) referer = 'https://seniqu.art';

        const regionInfo = { isMajorCity: false, regionName: 'Sekitar', maxRadiusKm: MAX_RADIUS_KM };

        if (!apiKey) {
            this.logger.warn('GOOGLE_MAPS_API_KEY is not configured');
            return { places: [], region: regionInfo };
        }

        // === Multi-layer grid centers to maximize coverage and avoid 20-result API cap ===
        // Optimized grid centers (max 5 centers for 70km) to keep API requests budget-safe
        const centers: { lat: number; lng: number; radius: number }[] = [];
        
        if (safeRadius <= 20000) {
            centers.push({ lat: safeLat, lng: safeLng, radius: safeRadius });
        } else if (safeRadius <= 40000) {
            const coreRadius = Math.min(20000, safeRadius * 0.5);
            const outerRadius = Math.min(30000, safeRadius * 0.7);
            const offsetKm = (safeRadius / 1000) * 0.55;

            const kmToLat = (km: number) => km / 111.32;
            const kmToLng = (km: number) => km / (111.32 * Math.cos(safeLat * Math.PI / 180));

            centers.push({ lat: safeLat, lng: safeLng, radius: coreRadius });
            centers.push(
                { lat: safeLat + kmToLat(offsetKm), lng: safeLng, radius: outerRadius },
                { lat: safeLat - kmToLat(offsetKm), lng: safeLng, radius: outerRadius },
                { lat: safeLat, lng: safeLng + kmToLng(offsetKm), radius: outerRadius },
                { lat: safeLat, lng: safeLng - kmToLng(offsetKm), radius: outerRadius },
            );
        } else {
            const coreRadius = 45000;
            const outerRadius = 35000;
            const offsetKm = (safeRadius / 1000) * 0.6; // ~42km offset at 70km radius

            const kmToLat = (km: number) => km / 111.32;
            const kmToLng = (km: number) => km / (111.32 * Math.cos(safeLat * Math.PI / 180));

            centers.push({ lat: safeLat, lng: safeLng, radius: coreRadius });
            centers.push(
                { lat: safeLat + kmToLat(offsetKm), lng: safeLng, radius: outerRadius },
                { lat: safeLat - kmToLat(offsetKm), lng: safeLng, radius: outerRadius },
                { lat: safeLat, lng: safeLng + kmToLng(offsetKm), radius: outerRadius },
                { lat: safeLat, lng: safeLng - kmToLng(offsetKm), radius: outerRadius },
            );
        }

        // Safety: clamp all generated centers to valid Google API ranges
        for (const c of centers) {
            c.lat = Math.max(-90, Math.min(90, c.lat));
            c.lng = Math.max(-180, Math.min(180, c.lng));
        }

        // === 1. If search query is provided, execute Google Places Text Search API first ===
        let textPlaces: any[] = [];
        const refererHeader = referer.endsWith('/') ? referer : `${referer}/`;
        if (query && query.trim().length > 0) {
            try {
                const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
                const res = await fetch(textSearchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.reviews',
                        'Accept-Language': 'id',
                        'Referer': refererHeader,
                    },
                    body: JSON.stringify({
                        textQuery: query,
                        languageCode: 'id',
                        locationBias: {
                            circle: {
                                center: { latitude: safeLat, longitude: safeLng },
                                radius: Math.min(safeRadius, 50000),
                            },
                        },
                    }),
                });
                if (res.ok) {
                    const data = await res.json() as any;
                    textPlaces = (data.places || []).map((p: any) => {
                        let category = 'heritage';
                        const nameLower = (p.displayName?.text || '').toLowerCase();
                        if (nameLower.includes('museum') || nameLower.includes('galeri') || nameLower.includes('gallery')) {
                            category = nameLower.includes('gallery') || nameLower.includes('galeri') ? 'gallery' : 'museum';
                        } else if (p.types?.includes('art_gallery')) {
                            category = 'gallery';
                        } else if (p.types?.includes('museum')) {
                            category = 'museum';
                        }
                        
                        return {
                            id: p.id,
                            name: p.displayName?.text || '',
                            address: p.formattedAddress || '',
                            latitude: p.location?.latitude,
                            longitude: p.location?.longitude,
                            rating: p.rating,
                            reviewCount: p.userRatingCount,
                            type: category,
                            photos: (p.photos || []).slice(0, 8).map((ph: any) =>
                                `https://places.googleapis.com/v1/${ph.name}/media?key=${apiKey}&maxHeightPx=400&maxWidthPx=400`
                            ),
                            reviews: (p.reviews || []).slice(0, 5).map((r: any) => ({
                                author: r.authorAttribution?.displayName || 'Anonymous',
                                authorPhoto: r.authorAttribution?.photoUri || '',
                                rating: r.rating || 0,
                                text: r.text?.text || '',
                                time: r.relativePublishTimeDescription || '',
                                publishTime: r.publishTime || '',
                            })),
                        };
                    });
                } else {
                    const errText = await res.text();
                    this.logger.error(`Places TextSearch API ${res.status}: ${errText}`);
                }
            } catch (err: any) {
                this.logger.error(`Places TextSearch error: ${err.message}`);
            }
        }

        // === Only verified-valid Table A types ===
        // Expanded to include diverse tourism destinations ('national_park', 'park', 'amusement_park', 'zoo', 'cultural_center')
        const typeGroups = [
            { types: ['museum', 'art_museum', 'history_museum'], category: 'museum' },
            { types: ['art_gallery'], category: 'gallery' },
            { 
                types: [
                    'tourist_attraction', 
                    'cultural_landmark', 
                    'historical_place', 
                    'monument',
                    'cultural_center',
                    'national_park',
                    'park',
                    'amusement_park',
                    'zoo'
                ], 
                category: 'heritage' 
            },
        ];

        const url = 'https://places.googleapis.com/v1/places:searchNearby';
        const allPlaces: any[] = [...textPlaces];

        // === Sequential batch per center (anti-throttling) ===
        for (let ci = 0; ci < centers.length; ci++) {
            const center = centers[ci];
            const queryRadius = Math.min(center.radius, GOOGLE_MAX_RADIUS);
            const batchPromises = typeGroups.map((group) =>
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.reviews',
                        'Accept-Language': 'id',
                        'Referer': refererHeader,
                    },
                    body: JSON.stringify({
                        includedTypes: group.types,
                        maxResultCount: 20,
                        languageCode: 'id',
                        locationRestriction: {
                            circle: {
                                center: { latitude: center.lat, longitude: center.lng },
                                radius: queryRadius,
                            },
                        },
                    }),
                }).then(async (res) => {
                    if (!res.ok) {
                        const errText = await res.text();
                        this.logger.error(`Places API ${res.status} [${group.category}]: ${errText}`);
                        return [];
                    }
                    const data = await res.json() as any;
                    return (data.places || []).map((p: any) => ({
                        id: p.id,
                        name: p.displayName?.text || '',
                        address: p.formattedAddress || '',
                        latitude: p.location?.latitude,
                        longitude: p.location?.longitude,
                        rating: p.rating,
                        reviewCount: p.userRatingCount,
                        type: group.category,
                        photos: (p.photos || []).slice(0, 8).map((ph: any) =>
                            `https://places.googleapis.com/v1/${ph.name}/media?key=${apiKey}&maxHeightPx=400&maxWidthPx=400`
                        ),
                        reviews: (p.reviews || []).slice(0, 5).map((r: any) => ({
                            author: r.authorAttribution?.displayName || 'Anonymous',
                            authorPhoto: r.authorAttribution?.photoUri || '',
                            rating: r.rating || 0,
                            text: r.text?.text || '',
                            time: r.relativePublishTimeDescription || '',
                            publishTime: r.publishTime || '',
                        })),
                    }));
                }).catch((err: any) => {
                    this.logger.error(`Places fetch error [${group.category}]: ${err.message}`);
                    return [] as any[];
                })
            );

            const results = await Promise.allSettled(batchPromises);
            for (const r of results) {
                if (r.status === 'fulfilled') allPlaces.push(...r.value);
            }

            // Anti-throttle: small delay between grid centers (skip after last)
            if (ci < centers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 120));
            }
        }

        // === Deduplicate → filter within radius → sort by distance ===
        const unique = Array.from(new Map(allPlaces.map(p => [p.id, p])).values());
        const radiusKm = safeRadius / 1000;
        const textPlaceIds = new Set(textPlaces.map(p => p.id));
        const filtered = unique.filter(p => {
            if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return false;
            // If explicitly searched by text, bypass the radius check so user gets exact query results
            if (textPlaceIds.has(p.id)) return true;
            return this.haversineDistance(safeLat, safeLng, p.latitude, p.longitude) <= radiusKm;
        });
        filtered.sort((a, b) =>
            this.haversineDistance(safeLat, safeLng, a.latitude, a.longitude) -
            this.haversineDistance(safeLat, safeLng, b.latitude, b.longitude)
        );

        this.logger.log(`Nearby: ${centers.length} grids × ${typeGroups.length} types → ${allPlaces.length} raw → ${filtered.length} within ${radiusKm}km (TextSearch matched ${textPlaces.length})`);
        // SECURITY: Cap response size to prevent oversized chunked transfer payloads
        const MAX_RESULTS = 100;
        const capped = filtered.slice(0, MAX_RESULTS);
        return { places: capped, region: regionInfo };
    }

    /**
     * Detect whether coordinates are in a major city (Kota Besar, 50km) or kabupaten/regency (100km).
     * Uses Google Geocoding API reverse geocode + comprehensive Indonesian city list.
     */
    async detectRegionType(lat: number, lng: number): Promise<{ isMajorCity: boolean; regionName: string; maxRadiusKm: number }> {
        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_API_KEY
            || '';

        if (!apiKey) {
            return { isMajorCity: false, regionName: 'Unknown', maxRadiusKm: 100 };
        }

        const MAJOR_CITIES = [
            'jakarta', 'surabaya', 'bandung', 'medan', 'semarang', 'makassar',
            'palembang', 'tangerang', 'depok', 'bekasi', 'batam', 'bogor',
            'padang', 'malang', 'denpasar', 'samarinda', 'banjarmasin',
            'tasikmalaya', 'pontianak', 'cimahi', 'balikpapan', 'jambi',
            'surakarta', 'solo', 'manado', 'yogyakarta', 'jogja', 'jogjakarta',
            'cilegon', 'kupang', 'pekanbaru', 'ambon', 'mataram', 'jayapura',
            'bengkulu', 'palu', 'kendari', 'tegal', 'binjai', 'pematangsiantar',
            'cirebon', 'kediri', 'serang', 'sukabumi', 'madiun', 'probolinggo',
            'banda aceh', 'bandar lampung', 'pangkalpinang', 'bitung',
            'tanjungpinang', 'gorontalo', 'ternate', 'lubuklinggau',
            'sorong', 'tangerang selatan',
        ];

        try {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=id&result_type=administrative_area_level_2|administrative_area_level_1|locality`;
            const response = await fetch(geocodeUrl);
            const data = await response.json() as any;

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                for (const result of data.results) {
                    const formattedAddr = (result.formatted_address || '').toLowerCase();
                    const components = result.address_components || [];

                    for (const comp of components) {
                        const longName = (comp.long_name || '').toLowerCase();
                        const types: string[] = comp.types || [];

                        if (types.includes('administrative_area_level_2') || types.includes('locality')) {
                            if (longName.startsWith('kota ')) {
                                const cityName = comp.long_name.replace(/^kota /i, '').trim();
                                this.logger.log(`Region: Kota ${cityName} → Major city (70km)`);
                                return { isMajorCity: true, regionName: `Kota ${cityName}`, maxRadiusKm: 70 };
                            }
                            if (longName.startsWith('kabupaten ')) {
                                const regName = comp.long_name.replace(/^kabupaten /i, '').trim();
                                this.logger.log(`Region: Kabupaten ${regName} → Regency (100km)`);
                                return { isMajorCity: false, regionName: `Kabupaten ${regName}`, maxRadiusKm: 100 };
                            }
                        }

                        if (MAJOR_CITIES.some(city => longName.includes(city) || formattedAddr.includes(city))) {
                            this.logger.log(`Region: ${comp.long_name} → Known major city (70km)`);
                            return { isMajorCity: true, regionName: comp.long_name, maxRadiusKm: 70 };
                        }
                    }
                }
            }

            this.logger.log(`Region: No major city match → default regency (100km)`);
            return { isMajorCity: false, regionName: 'Daerah', maxRadiusKm: 100 };
        } catch (error: any) {
            this.logger.error(`Region detection failed: ${error.message}`);
            return { isMajorCity: false, regionName: 'Unknown', maxRadiusKm: 100 };
        }
    }

    /**
     * Simple Haversine distance in km
     */
    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Get routing directions from Google Maps Routes API (New)
     */
    async getRoute(originLat: number, originLng: number, destLat: number, destLng: number, mode: string) {
        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_API_KEY
            || '';
        const referer = this.configService.get<string>('FRONTEND_URL')
            || process.env.FRONTEND_URL
            || 'http://localhost:5173';

        if (!apiKey) {
            this.logger.warn('GOOGLE_MAPS_API_KEY is not configured in backend .env');
            throw new NotFoundException('Google Maps API key is not configured');
        }

        // Map mode to Google Routes API TravelMode
        // Options: DRIVE, WALK, BICYCLE, TRANSIT
        let routeMode = 'DRIVE';
        const lowerMode = mode.toLowerCase();
        if (lowerMode === 'walking' || lowerMode === 'walk') {
            routeMode = 'WALK';
        } else if (lowerMode === 'bicycling' || lowerMode === 'bicycle' || lowerMode === 'cycle') {
            routeMode = 'BICYCLE';
        } else if (lowerMode === 'transit') {
            routeMode = 'TRANSIT';
        }

        const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs',
                    'Referer': referer.endsWith('/') ? referer : `${referer}/`,
                },
                body: JSON.stringify({
                    origin: {
                        location: {
                            latLng: {
                                latitude: originLat,
                                longitude: originLng
                            }
                        }
                    },
                    destination: {
                        location: {
                            latLng: {
                                latitude: destLat,
                                longitude: destLng
                            }
                        }
                    },
                    travelMode: routeMode,
                    languageCode: 'id-ID',
                    units: 'METRIC'
                })
            });

            const responseText = await response.text();
            this.logger.log(`Google Routes API response status: ${response.status}, length: ${responseText.length} bytes`);

            let data: any = null;
            try {
                if (responseText) {
                    data = JSON.parse(responseText);
                }
            } catch (e: any) {
                this.logger.error(`Failed to parse Routes API response: ${responseText}`);
                return {
                    status: 'ERROR',
                    errorMessage: `Failed to parse response: ${e.message}. Status code: ${response.status}`,
                    routes: []
                };
            }

            if (!response.ok || (data && data.error)) {
                const errMsg = data?.error?.message || responseText || 'Routes API request failed';
                this.logger.error(`Google Routes API error: ${response.status} - ${errMsg}`);
                return {
                    status: 'ERROR',
                    errorMessage: errMsg,
                    routes: []
                };
            }

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const distanceKm = (route.distanceMeters || 0) / 1000;
                const distanceText = distanceKm < 1 
                    ? `${Math.round(route.distanceMeters || 0)} m` 
                    : `${distanceKm.toFixed(1)} km`;

                let durationSecs = 0;
                if (route.duration) {
                    durationSecs = parseInt(route.duration.replace('s', ''), 10) || 0;
                }
                const durationMins = Math.round(durationSecs / 60);
                const durationText = durationMins < 60
                    ? `${durationMins} menit`
                    : `${Math.floor(durationMins / 60)} jam${durationMins % 60 > 0 ? ` ${durationMins % 60} mnt` : ''}`;

                return {
                    status: 'OK',
                    distanceText,
                    durationText,
                    polyline: route.polyline?.encodedPolyline || '',
                    // SECURITY: Do not expose raw Google API response to client
                };
            }

            return {
                status: 'ZERO_RESULTS',
                errorMessage: 'No routes found',
                routes: []
            };

        } catch (error: any) {
            this.logger.error(`Failed to fetch routes: ${error.message}`);
            return {
                status: 'ERROR',
                errorMessage: error.message,
                routes: []
            };
        }
    }

    /**
     * Get Google Maps client configuration (API key)
     * Reads from registered config with process.env fallback
     */
    getMapsConfig() {
        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_API_KEY
            || ''
        if (!apiKey) {
            this.logger.warn('GOOGLE_MAPS_API_KEY is not configured in backend .env')
        }
        return { apiKey }
    }

    /**
     * Find pending museums (not verified)
     */
    async findPending() {
        // Build query
        const { data, error } = await this.supabase
            .from("institutions")
            .select("*, owner:users!institutions_owner_id_fkey(id, display_name, avatar_url)")
            .eq("is_verified", false)
            .order("created_at", { ascending: false })

        if (error) {
            this.logger.error(`Failed to fetch pending museums: ${error.message}`)
            throw error
        }

        return data || []
    }

    /**
     * Find museum by slug
     */
    async findBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from("institutions")
            .select("*, owner:users!institutions_owner_id_fkey(id, display_name, avatar_url, is_verified)")
            .eq("slug", slug)
            .single()

        if (error || !data) {
            throw new NotFoundException(`Museum '${slug}' not found`)
        }

        // Increment visitor count
        await this.supabase
            .from("institutions")
            .update({ total_visitors: data.total_visitors + 1 })
            .eq("id", data.id)

        return { data }
    }

    /**
     * Get artworks belonging to a museum
     */
    async getMuseumArtworks(museumId: string, page = 1, limit = 20) {
        const offset = (page - 1) * limit

        const { data, error, count } = await this.supabase
            .from("artworks")
            .select("*, artist:users!artworks_artist_id_fkey(id, display_name, avatar_url)", { count: "exact" })
            .eq("institution_id", museumId)
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            this.logger.error(`Failed to fetch museum artworks: ${error.message}`)
            throw error
        }

        return {
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
            },
        }
    }

    /**
     * Create a new museum/gallery
     */
    async create(dto: CreateMuseumDto, ownerId: string) {
        // Generate unique slug
        const slug = this.generateSlug(dto.name)

        // Check slug uniqueness
        const { data: existing } = await this.supabase
            .from("institutions")
            .select("id")
            .eq("slug", slug)
            .single()

        if (existing) {
            throw new ConflictException("A museum with this name already exists")
        }

        const { data, error } = await this.supabase
            .from("institutions")
            .insert({
                ...dto,
                owner_id: ownerId,
                slug,
                is_verified: false, // Requires admin approval
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create museum: ${error.message}`)
            throw error
        }

        this.logger.log(`Museum created: ${data.name} by user ${ownerId}`)
        return { data, message: "Museum created successfully. Pending verification." }
    }

    /**
     * Update museum details
     */
    async update(id: string, dto: UpdateMuseumDto, userId: string) {
        // Check ownership
        const { data: museum } = await this.supabase
            .from("institutions")
            .select("owner_id")
            .eq("id", id)
            .single()

        if (!museum) {
            throw new NotFoundException("Museum not found")
        }

        if (museum.owner_id !== userId) {
            throw new ForbiddenException("You can only update your own museum")
        }

        const { data, error } = await this.supabase
            .from("institutions")
            .update(dto)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to update museum: ${error.message}`)
            throw error
        }

        return { data }
    }

    /**
     * Delete a museum (Admin only)
     */
    async remove(id: string) {
        const { error } = await this.supabase
            .from("institutions")
            .delete()
            .eq("id", id)

        if (error) {
            this.logger.error(`Failed to delete museum: ${error.message}`)
            throw error
        }

        this.logger.warn(`Museum deleted: ${id}`)
        return { success: true }
    }

    /**
     * Verify a museum (Admin only)
     */
    async verify(id: string) {
        const { data, error } = await this.supabase
            .from("institutions")
            .update({ is_verified: true })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw error
        }

        this.logger.log(`Museum verified: ${id}`)
        return { data, message: "Museum verified successfully" }
    }

    /**
     * Set featured status
     */
    async setFeatured(id: string, featured: boolean) {
        const { data, error } = await this.supabase
            .from("institutions")
            .update({ is_featured: featured })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw error
        }

        return { data }
    }

    /**
     * Generate URL-friendly slug
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            + "-" + Date.now().toString(36)
    }
}
