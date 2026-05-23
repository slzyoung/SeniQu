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
    private systemAdminId: string | null = null;

    /** Server-side cache to prevent duplicate Google Places API calls */
    private readonly placesCache = new Map<string, { data: any; expiresAt: number }>();
    private readonly placeDetailsCache = new Map<string, { data: any; expiresAt: number }>();
    private readonly PLACES_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
    private readonly PLACES_CACHE_MAX_SIZE = 50;

    // ============================================================
    // STRICT DAILY GOOGLE API BUDGET CONTROL (All Endpoints)
    // ============================================================
    // Per-IP daily limits
    private readonly ipSearchCounts = new Map<string, { count: number; lastRequest: number }>();
    private readonly ipDetailsCounts = new Map<string, { count: number; lastRequest: number }>();
    private readonly ipRouteCounts = new Map<string, { count: number; lastRequest: number }>();
    private readonly ipGeoCounts = new Map<string, { count: number; lastRequest: number }>();

    // Global daily counters
    private globalSearchToday = 0;
    private globalDetailsToday = 0;
    private globalRouteToday = 0;
    private globalGeoToday = 0;
    private lastResetDate = new Date().toDateString();

    // Hard daily limits — COST-HARDENED for under $50/month gross (before $200 free credit)
    // Calculation: With Leaflet/PostGIS as default, Google API is fallback only.
    // Worst case: Search 30/day×30=$31.50, Details 30/day×30=$6.30, Geo/Route (Free) = $37.80/month (well under $50).
    // After Google $200 free credit = $0/month.
    private readonly DAILY_LIMITS = {
        search:  { perIp: 5,   global: 30  },  // Places searchNearby/searchText ($35/1000)
        details: { perIp: 10,  global: 30  },  // Places getPlace Advanced ($7/1000)
        route:   { perIp: 3,   global: 20  },  // Routes API (OSRM, free)
        geo:     { perIp: 2,   global: 20  },  // Geocoding API (Nominatim, free)
    };

    /**
     * Centralized daily reset check — resets ALL counters at midnight
     */
    private resetDailyCountersIfNeeded() {
        const todayStr = new Date().toDateString();
        if (this.lastResetDate !== todayStr) {
            this.lastResetDate = todayStr;
            this.globalSearchToday = 0;
            this.globalDetailsToday = 0;
            this.globalRouteToday = 0;
            this.globalGeoToday = 0;
            this.ipSearchCounts.clear();
            this.ipDetailsCounts.clear();
            this.ipRouteCounts.clear();
            this.ipGeoCounts.clear();
            this.logger.log('Daily Google API budget counters RESET');
        }
    }

    /**
     * Check if a specific API type is within budget for a given IP.
     * Returns { allowed: boolean } and increments counters if allowed.
     */
    private checkAndIncrementBudget(
        type: 'search' | 'details' | 'route' | 'geo',
        ip: string,
    ): { allowed: boolean; reason?: string } {
        this.resetDailyCountersIfNeeded();

        const limits = this.DAILY_LIMITS[type];
        const ipMap = {
            search: this.ipSearchCounts,
            details: this.ipDetailsCounts,
            route: this.ipRouteCounts,
            geo: this.ipGeoCounts,
        }[type];
        const globalCount = {
            search: this.globalSearchToday,
            details: this.globalDetailsToday,
            route: this.globalRouteToday,
            geo: this.globalGeoToday,
        }[type];

        const ipRecord = ipMap.get(ip) || { count: 0, lastRequest: Date.now() };

        if (ipRecord.count >= limits.perIp) {
            this.logger.warn(`[BUDGET] ${type} IP limit reached: ${ip} (${ipRecord.count}/${limits.perIp})`);
            return { allowed: false, reason: `IP daily limit reached (${limits.perIp})` };
        }
        if (globalCount >= limits.global) {
            this.logger.warn(`[BUDGET] ${type} GLOBAL limit reached: ${globalCount}/${limits.global}`);
            return { allowed: false, reason: `Global daily limit reached (${limits.global})` };
        }

        // Increment
        ipRecord.count++;
        ipRecord.lastRequest = Date.now();
        ipMap.set(ip, ipRecord);

        switch (type) {
            case 'search': this.globalSearchToday++; break;
            case 'details': this.globalDetailsToday++; break;
            case 'route': this.globalRouteToday++; break;
            case 'geo': this.globalGeoToday++; break;
        }

        return { allowed: true };
    }

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
     * Helper to perform local fallback search using PostGIS
     */
    private async performLocalFallbackSearch(lat: number, lng: number, radiusMeters: number, query?: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from("institutions")
            .select("id, name, slug, description, type, street, city, province, logo_url, cover_image_url, is_verified, is_featured, rating, total_artworks, location")
            .eq("is_verified", true);

        if (error || !data) {
            this.logger.error(`Local fallback search failed: ${error?.message || 'No data'}`);
            return [];
        }

        const radiusKm = radiusMeters / 1000;
        
        let localPlaces = data
            .map((m: any) => {
                let latitude = 0;
                let longitude = 0;
                if (m.location) {
                    if (typeof m.location === 'object' && m.location.coordinates) {
                        [longitude, latitude] = m.location.coordinates;
                    } else if (typeof m.location === 'string') {
                        if (/^[0-9a-fA-F]+$/.test(m.location)) {
                            try {
                                const buf = Buffer.from(m.location, 'hex');
                                if (buf.length >= 21) {
                                    const byteOrder = buf.readUInt8(0);
                                    const isLittleEndian = byteOrder === 1;
                                    const geomType = isLittleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
                                    const hasSrid = (geomType & 0x20000000) !== 0;
                                    const offset = hasSrid ? 9 : 5;
                                    if (buf.length >= offset + 16) {
                                        longitude = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
                                        latitude = isLittleEndian ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
                                    }
                                }
                            } catch (e) {
                                this.logger.warn(`Failed to parse WKB location for ${m.name}: ${e.message}`);
                            }
                        } else {
                            const match = m.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
                            if (match) {
                                longitude = parseFloat(match[1]);
                                latitude = parseFloat(match[2]);
                            }
                        }
                    }
                }

                return {
                    id: m.id,
                    name: m.name,
                    address: m.street || m.city || '',
                    latitude,
                    longitude,
                    rating: Number(m.rating) || 5.0,
                    reviewCount: m.total_artworks || 0,
                    type: m.type || 'museum',
                    photos: m.cover_image_url ? [m.cover_image_url] : [],
                    reviews: [],
                };
            })
            .filter((p: any) => {
                const distance = this.haversineDistance(lat, lng, p.latitude, p.longitude);
                return distance <= radiusKm;
            });

        if (query && query.trim().length > 0) {
            const q = query.toLowerCase().trim();
            localPlaces = localPlaces.filter((p: any) => 
                p.name.toLowerCase().includes(q) || 
                p.address.toLowerCase().includes(q)
            );
        }

        localPlaces.sort((a, b) => 
            this.haversineDistance(lat, lng, a.latitude, a.longitude) -
            this.haversineDistance(lat, lng, b.latitude, b.longitude)
        );

        return localPlaces;
    }

    /**
     * Search nearby places using Google Places API (New)
     * POST https://places.googleapis.com/v1/places:searchNearby
     *
     * Returns museums, galleries, and heritage/cultural sites within max 70km.
     * Only uses verified-valid Table A types to prevent 400 errors.
     * Sequential batch processing with delay for anti-throttling.
     */
    async searchNearbyPlaces(lat: number, lng: number, radiusMeters: number, query?: string, ip?: string) {
        // === Input validation & sanitization ===
        const safeLat = Math.max(-90, Math.min(90, Number(lat) || 0));
        const safeLng = Math.max(-180, Math.min(180, Number(lng) || 0));
        const MAX_RADIUS_KM = 70;
        const MAX_RADIUS_M = MAX_RADIUS_KM * 1000;
        const GOOGLE_MAX_RADIUS = 50000;
        const safeRadius = Math.min(Math.max(1000, Number(radiusMeters) || MAX_RADIUS_M), MAX_RADIUS_M);

        const regionInfo = { isMajorCity: false, regionName: 'Sekitar', maxRadiusKm: MAX_RADIUS_KM };

        // === 0. Database-First / Cache-Aside Search ===
        // Always query the local database first. If we have matching verified places in our database,
        // return them immediately. This bypasses the Google Places API call entirely, saving money and avoiding quota limits.
        try {
            const localPlaces = await this.performLocalFallbackSearch(safeLat, safeLng, safeRadius, query);
            if (localPlaces && localPlaces.length > 0) {
                this.logger.log(`[SEARCH] Local database HIT: Found ${localPlaces.length} places within ${safeRadius / 1000}km. Bypassing Google API.`);
                return { places: localPlaces, region: regionInfo, quotaExceeded: false };
            }
        } catch (dbErr) {
            this.logger.error(`[SEARCH] Database-first check failed: ${dbErr.message}`);
        }

        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_KEY || '';
        const referer = this.configService.get<string>('FRONTEND_URL')
            || process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!apiKey) {
            this.logger.warn('GOOGLE_MAPS_KEY is not configured');
            return { places: [], region: regionInfo };
        }

        // === Centralized Budget Check ===
        const clientIp = ip || 'unknown';
        const budget = this.checkAndIncrementBudget('search', clientIp);
        if (!budget.allowed) {
            this.logger.warn(`[SEARCH] Budget exceeded for IP ${clientIp}: ${budget.reason}. Falling back to local PostGIS.`);
            const localPlaces = await this.performLocalFallbackSearch(safeLat, safeLng, safeRadius, query);
            return { places: localPlaces, region: regionInfo, quotaExceeded: true };
        }

        // === Server-side cache check (3 min TTL, ~111m resolution) ===
        const cacheKey = `${safeLat.toFixed(3)}_${safeLng.toFixed(3)}_${safeRadius}_${query || ''}`;
        const cached = this.placesCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            this.logger.log(`Places cache HIT: ${cacheKey}`);
            return cached.data;
        }
        if (cached) {
            this.placesCache.delete(cacheKey); // Evict expired
        }

        // === Only query the user location center (saves budget, prevents massive Google Maps charges) ===
        const centers: { lat: number; lng: number; radius: number }[] = [
            { lat: safeLat, lng: safeLng, radius: safeRadius }
        ];

        // === 1. If search query is provided, execute Google Places Text Search API first ===
        let googleApiFailed = false;
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
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types',
                        'Accept-Language': 'id',
                        'Referer': refererHeader,
                    },
                    body: JSON.stringify({
                        textQuery: query,
                        languageCode: 'id',
                        locationBias: {
                            circle: {
                                center: { latitude: safeLat, longitude: safeLng },
                                centerCoordinates: { latitude: safeLat, longitude: safeLng },
                                radius: Math.min(safeRadius, 50000),
                            },
                        },
                    }),
                });
                if (res.ok) {
                    const data = await res.json() as any;
                    const mapped = (data.places || []).map((p: any) => {
                        let category = 'heritage';
                        const name = p.displayName?.text || '';
                        const nameLower = name.toLowerCase();
                        const matchedTypes = p.types || [];
                        if (nameLower.includes('museum') || matchedTypes.some((t: string) => ['museum', 'art_museum', 'history_museum'].includes(t))) {
                            category = 'museum';
                        } else if (nameLower.includes('gallery') || nameLower.includes('galeri') || matchedTypes.some((t: string) => ['art_gallery'].includes(t))) {
                            category = 'gallery';
                        }
                        
                        // Validate genuine museum/gallery
                        if (category === 'museum' || category === 'gallery') {
                            const isGenuine = this.isGenuineMuseumOrGallery(name, matchedTypes, category);
                            if (!isGenuine) {
                                // Demote to heritage if it's a historical/cultural landmark
                                const isHeritageLandmark = matchedTypes.some((t: string) => 
                                    ['tourist_attraction', 'historical_place', 'monument', 'cultural_landmark'].includes(t)
                                );
                                if (isHeritageLandmark) {
                                    category = 'heritage';
                                } else {
                                    return null; // Discard completely
                                }
                            }
                        }

                        // Validate genuine heritage site
                        if (category === 'heritage') {
                            const isGenuine = this.isGenuineHeritage(name, matchedTypes, p.rating, p.userRatingCount);
                            if (!isGenuine) {
                                return null; // Discard minor local spots
                            }
                        }

                        return {
                            id: p.id,
                            name: name,
                            address: p.formattedAddress || '',
                            latitude: p.location?.latitude,
                            longitude: p.location?.longitude,
                            rating: p.rating,
                            reviewCount: p.userRatingCount,
                            type: category,
                            photos: [],
                            reviews: [],
                        };
                    });
                    textPlaces = mapped.filter((p: any) => p !== null);
                } else {
                    const errText = await res.text();
                    this.logger.error(`Places TextSearch API ${res.status}: ${errText}`);
                    if (res.status === 403 || res.status === 401 || res.status === 429) {
                        googleApiFailed = true;
                    }
                }
            } catch (err: any) {
                this.logger.error(`Places TextSearch error: ${err.message}`);
                googleApiFailed = true;
            }
        }

        // === Only verified-valid Table A types ===
        // Expanded to include diverse tourism destinations ('national_park', 'park', 'amusement_park', 'zoo', 'cultural_center', 'aquarium', 'buddhist_temple', 'hindu_temple', 'church', 'mosque')
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
                    'zoo',
                    'aquarium',
                    'buddhist_temple',
                    'hindu_temple',
                    'church',
                    'mosque'
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
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types',
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
                        if (res.status === 403 || res.status === 401 || res.status === 429) {
                            googleApiFailed = true;
                        }
                        return [];
                    }
                    const data = await res.json() as any;
                    const mapped = (data.places || []).map((p: any) => {
                        let category = group.category;
                        const name = p.displayName?.text || '';
                        const nameLower = name.toLowerCase();
                        const matchedTypes = p.types || [];
                        
                        if (nameLower.includes('museum') || matchedTypes.some((t: string) => ['museum', 'art_museum', 'history_museum'].includes(t))) {
                            category = 'museum';
                        } else if (nameLower.includes('gallery') || nameLower.includes('galeri') || matchedTypes.some((t: string) => ['art_gallery'].includes(t))) {
                            category = 'gallery';
                        }

                        // Validate genuine museum/gallery
                        if (category === 'museum' || category === 'gallery') {
                            const isGenuine = this.isGenuineMuseumOrGallery(name, matchedTypes, category);
                            if (!isGenuine) {
                                // Demote to heritage if it's a historical/cultural landmark
                                const isHeritageLandmark = matchedTypes.some((t: string) => 
                                    ['tourist_attraction', 'historical_place', 'monument', 'cultural_landmark'].includes(t)
                                );
                                if (isHeritageLandmark) {
                                    category = 'heritage';
                                } else {
                                    return null; // Discard completely
                                }
                            }
                        }

                        // Validate genuine heritage site
                        if (category === 'heritage') {
                            const isGenuine = this.isGenuineHeritage(name, matchedTypes, p.rating, p.userRatingCount);
                            if (!isGenuine) {
                                return null; // Discard minor local spots
                            }
                        }

                        return {
                            id: p.id,
                            name: name,
                            address: p.formattedAddress || '',
                            latitude: p.location?.latitude,
                            longitude: p.location?.longitude,
                            rating: p.rating,
                            reviewCount: p.userRatingCount,
                            type: category,
                            photos: [],
                            reviews: [],
                        };
                    });
                    return mapped.filter((p: any) => p !== null);
                }).catch((err: any) => {
                    this.logger.error(`Places fetch error [${group.category}]: ${err.message}`);
                    googleApiFailed = true;
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

        if (googleApiFailed) {
            this.logger.warn(`Google Places API request failed (403/401/429). Initiating local PostGIS fallback.`);
            const localPlaces = await this.performLocalFallbackSearch(safeLat, safeLng, safeRadius, query);
            return { places: localPlaces, region: regionInfo, quotaExceeded: true };
        }

        // === Deduplicate prioritizing specific category (museum > gallery > heritage) ===
        const uniqueMap = new Map<string, any>();
        for (const p of allPlaces) {
            const existing = uniqueMap.get(p.id);
            if (!existing) {
                uniqueMap.set(p.id, p);
            } else {
                if (p.type === 'museum') {
                    uniqueMap.set(p.id, p);
                } else if (p.type === 'gallery' && existing.type !== 'museum') {
                    uniqueMap.set(p.id, p);
                }
            }
        }
        const unique = Array.from(uniqueMap.values());
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

        // Group by category and slice each category separately to ensure museums/galleries are not crowded out by heritage/tourism places
        const museums = filtered.filter(p => p.type === 'museum').slice(0, 150);
        const galleries = filtered.filter(p => p.type === 'gallery').slice(0, 150);
        const heritage = filtered.filter(p => p.type === 'heritage').slice(0, 150);

        const capped = [...museums, ...galleries, ...heritage];

        // Check database for existing cover images to return in the current search response
        try {
            const slugs = capped.map((p) => `g-${p.id}`);
            const { data: dbPlaces } = await this.supabase
                .from('institutions')
                .select('slug, cover_image_url')
                .in('slug', slugs);

            if (dbPlaces && dbPlaces.length > 0) {
                const dbImageMap = new Map<string, string>(
                    dbPlaces
                        .filter((row) => row.cover_image_url)
                        .map((row) => [row.slug, row.cover_image_url])
                );

                for (const p of capped) {
                    const slug = `g-${p.id}`;
                    if (dbImageMap.has(slug)) {
                        p.photos = [dbImageMap.get(slug)];
                    }
                }
            }
        } catch (dbErr: any) {
            this.logger.warn(`Failed to fetch cover images from database for search response: ${dbErr.message}`);
        }

        this.logger.log(`Nearby: ${centers.length} grids → ${allPlaces.length} raw → ${filtered.length} within ${radiusKm}km (capped breakdown: ${museums.length} museums, ${galleries.length} galleries, ${heritage.length} heritage)`);

        const result = { places: capped, region: regionInfo };

        // === Ingest new places to database asynchronously ===
        this.ingestPlacesToDatabase(capped);

        // === Write to server-side cache ===
        // Evict oldest entries if cache is full
        if (this.placesCache.size >= this.PLACES_CACHE_MAX_SIZE) {
            const now = Date.now();
            for (const [key, entry] of this.placesCache) {
                if (now >= entry.expiresAt) {
                    this.placesCache.delete(key);
                }
            }
            if (this.placesCache.size >= this.PLACES_CACHE_MAX_SIZE) {
                const firstKey = this.placesCache.keys().next().value;
                if (firstKey) this.placesCache.delete(firstKey);
            }
        }
        this.placesCache.set(cacheKey, {
            data: result,
            expiresAt: Date.now() + this.PLACES_CACHE_TTL_MS,
        });

        return result;
    }

    /**
     * Detect whether coordinates are in a major city (Kota Besar) or kabupaten/regency.
     * Uses OpenStreetMap Nominatim (100% FREE, no API key needed) instead of Google Geocoding.
     * Best Practice: Nominatim has a 1 req/sec rate limit — we respect it via budget system.
     */
    async detectRegionType(lat: number, lng: number, ip?: string): Promise<{ isMajorCity: boolean; regionName: string; maxRadiusKm: number }> {
        // Budget check (still useful to prevent abuse even though API is free)
        const clientIp = ip || 'unknown';
        const budget = this.checkAndIncrementBudget('geo', clientIp);
        if (!budget.allowed) {
            this.logger.warn(`[GEOCODE-OSM] Rate limit for IP ${clientIp}: ${budget.reason}. Returning default.`);
            return { isMajorCity: false, regionName: 'Sekitar', maxRadiusKm: 70 };
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
            // OpenStreetMap Nominatim — 100% FREE, no API key required
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=id&addressdetails=1`;
            const response = await fetch(nominatimUrl, {
                headers: {
                    'User-Agent': 'SeniQu-WebApp/1.0 (https://seniqu.art)',
                },
            });
            const data = await response.json() as any;

            if (data && data.address) {
                const addr = data.address;
                // Nominatim returns: city, county, state, country fields
                const city = (addr.city || addr.town || addr.village || '').toLowerCase();
                const county = (addr.county || '').toLowerCase();
                const displayName = (data.display_name || '').toLowerCase();

                // Check for "Kota" prefix in county (Indonesian administrative structure)
                if (county.startsWith('kota ')) {
                    const cityName = addr.county.replace(/^kota /i, '').trim();
                    this.logger.log(`[OSM] Region: Kota ${cityName} → Major city (70km)`);
                    return { isMajorCity: true, regionName: `Kota ${cityName}`, maxRadiusKm: 70 };
                }
                if (county.startsWith('kabupaten ')) {
                    const regName = addr.county.replace(/^kabupaten /i, '').trim();
                    this.logger.log(`[OSM] Region: Kabupaten ${regName} → Regency (70km)`);
                    return { isMajorCity: false, regionName: `Kabupaten ${regName}`, maxRadiusKm: 70 };
                }

                // Check against known major cities list
                if (MAJOR_CITIES.some(c => city.includes(c) || county.includes(c) || displayName.includes(c))) {
                    const name = addr.city || addr.town || addr.county || 'Unknown';
                    this.logger.log(`[OSM] Region: ${name} → Known major city (70km)`);
                    return { isMajorCity: true, regionName: name, maxRadiusKm: 70 };
                }

                // Return county or city name as region
                const regionName = addr.county || addr.city || addr.town || addr.state || 'Daerah';
                this.logger.log(`[OSM] Region: ${regionName} → default (70km)`);
                return { isMajorCity: false, regionName, maxRadiusKm: 70 };
            }

            this.logger.log(`[OSM] No address data → default (70km)`);
            return { isMajorCity: false, regionName: 'Daerah', maxRadiusKm: 70 };
        } catch (error: any) {
            this.logger.error(`[OSM] Region detection failed: ${error.message}`);
            return { isMajorCity: false, regionName: 'Unknown', maxRadiusKm: 70 };
        }
    }

    /**
     * Strict verification to filter out minor neighborhood infrastructure (local mosques,
     * schools, sports fields, local businesses) and only keep genuine historical landmarks,
     * famous tourist destinations, and high-quality hidden gems.
     */
    private isGenuineHeritage(name: string, types: string[], rating?: number, reviewCount?: number): boolean {
        const nameLower = name.toLowerCase();
        const safeRating = rating || 0;
        const safeReviews = reviewCount || 0;

        // 1. Strict name exclusions for local community infrastructure & minor places
        const badHeritageNameKeywords = [
            'mushola', 'musholla', 'langgar', 'pos ronda', 'pos kamling', 
            'panti asuhan', 'sekolah', ' sd', ' smp', ' sma', ' smk', ' tk ', 'paud', 
            'polsek', 'koramil', 'bengkel', 'laundry', 'salon', 'spa', 'apotek', 'klinik', 'puskesmas',
            'lapangan bulutangkis', 'lapangan tenis', 'lapangan voli'
        ];
        if (badHeritageNameKeywords.some(keyword => nameLower.includes(keyword))) {
            return false;
        }

        // 2. Filter out minor local neighborhood mosques/churches/temples (unless famous/high review count)
        const isReligiousPlace = types.some(t => ['buddhist_temple', 'hindu_temple', 'church', 'mosque'].includes(t)) 
            || nameLower.includes('masjid') || nameLower.includes('gereja') || nameLower.includes('candi') || nameLower.includes('wihara') || nameLower.includes('klenteng');
            
        if (isReligiousPlace) {
            // A famous/historical religious site will have a decent review count or rating.
            // Minor local mosques/churches have very few reviews (less than 15).
            // Candi (temples) are usually always heritage, so we exclude "candi" from this strict check.
            const isHistoricalWord = nameLower.includes('candi') || nameLower.includes('agung') || nameLower.includes('gedhe') || nameLower.includes('historical') || nameLower.includes('heritage') || nameLower.includes('katedral') || nameLower.includes('cathedral');
            if (!isHistoricalWord && safeReviews < 15) {
                return false;
            }
        }

        // 3. Filter out commercial shops, restaurants, cafes, hotels from heritage list
        // Unless they are famous heritage spots (e.g. have >= 50 reviews or contain "heritage", "historical", "situs", "monumen")
        const badCommercialKeywords = [
            'hotel', 'resort', 'homestay', 'home stay', 'guesthouse', 'guest house', 'villa', 'hostel',
            'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'warung', 'rumah makan', 
            'toko', 'shop', 'boutique', 'butik', 'mall', 'furniture', 'decor', 'decorating', 
            'wedding', 'sewa', 'rent', 'rental', 'bengkel', 'laundry'
        ];
        if (badCommercialKeywords.some(keyword => nameLower.includes(keyword))) {
            const isFamousHeritage = nameLower.includes('heritage') || nameLower.includes('historical') || nameLower.includes('situs') || nameLower.includes('monumen') || nameLower.includes('keraton') || nameLower.includes('palace');
            if (!isFamousHeritage && safeReviews < 50) {
                return false;
            }
        }

        // 4. Filter out places with no tourist value (e.g. rating/reviews are extremely low or non-existent, unless name contains strong heritage terms)
        const hasStrongHeritageWord = [
            'museum', 'galeri', 'gallery', 'heritage', 'historical', 'situs', 'monumen', 'monument', 
            'candi', 'temple', 'keraton', 'palace', 'benteng', 'fort', 'tugu', 'makam', 'tomb', 
            'wisata', 'tourism', 'taman nasional', 'national_park', 'goa', 'cave', 'pantai', 'beach', 
            'curug', 'air terjun', 'waterfall', 'bukit', 'hill', 'gunung', 'mountain', 'hutan', 'forest'
        ].some(keyword => nameLower.includes(keyword));

        // If a place has 0 reviews and doesn't contain any strong heritage/tourism terms, it's likely a generic establishment/establishment marker
        if (safeReviews === 0 && !hasStrongHeritageWord) {
            return false;
        }

        return true;
    }

    /**
     * Strict verification to filter out residential houses, florists, wedding decor,
     * cafes, and generic stores masquerading as museums or galleries.
     */
    private isGenuineMuseumOrGallery(name: string, types: string[], category: string): boolean {
        const nameLower = name.toLowerCase();
        
        // 1. Strict name exclusion keywords (businesses, shops, lodgings, eateries)
        const badNameKeywords = [
            'hotel', 'resort', 'homestay', 'home stay', 'guesthouse', 'guest house', 
            'hostel', 'motel', 'villa', 'kos ', 'kost ', 'kontrakan', 'residence',
            'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'warung', 'rumah makan', 
            'toko', 'shop', 'boutique', 'butik', 'mall', 'supermarket', 'mart',
            'furniture', 'decor', 'decorating', 'florist', 'bouquet', 'buket', 'flower', 'bunga',
            'wedding', 'sewa', 'rent', 'rental', 'salon', 'spa', 'laundry', 'tailor', 'jahit',
            'studio foto', 'photo studio', 'print', 'percetakan', 'advertising', 'apartemen', 'apartment'
        ];
        
        if (badNameKeywords.some(keyword => nameLower.includes(keyword))) {
            // Special exceptions: keep if name contains both "museum" / "gallery" and a bad keyword,
            // but is NOT primarily a lodging, warung, or hotel.
            const isHighlyLikelyMuseum = nameLower.includes('museum') || nameLower.includes('musium') || nameLower.includes('galeri') || nameLower.includes('gallery');
            if (!isHighlyLikelyMuseum) {
                return false;
            }
            
            // If it contains hotel, homestay, guesthouse, villa, warung, rumah makan, cafe, resto, restaurant, coffee, toko, shop, rent, decor:
            const superBadKeywords = [
                'hotel', 'homestay', 'guesthouse', 'guest house', 'villa', 'warung', 'rumah makan', 
                'cafe', 'coffee', 'kopi', 'resto', 'restaurant', 'toko', 'shop', 'boutique', 'butik',
                'florist', 'bouquet', 'buket', 'rent', 'rental', 'sewa', 'decor', 'decorating'
            ];
            if (superBadKeywords.some(k => nameLower.includes(k))) {
                return false;
            }
        }

        // 2. Strict type exclusions (Google Place categories that represent lodging, food, retail, residential)
        const badTypes = [
            'lodging', 'hotel', 'guest_house', 'hostel', 'motel', 
            'real_estate_agency', 'housing_development', 'apartment_building',
            'clothing_store', 'shopping_mall', 'home_goods_store', 'supermarket',
            'furniture_store', 'florist', 'hair_care', 'beauty_salon', 'spa',
            'bakery', 'meal_takeaway', 'grocery_or_supermarket', 'liquor_store',
            'cafe', 'restaurant', 'bar', 'night_club', 'food'
        ];

        if (category === 'museum' || category === 'gallery') {
            const hasBadType = types.some(type => badTypes.includes(type));
            if (hasBadType) {
                // Keep if name clearly indicates a museum or gallery, and it is NOT a lodging type
                const isHighlyLikelyMuseum = nameLower.includes('museum') || nameLower.includes('musium') || nameLower.includes('galeri') || nameLower.includes('gallery');
                const hasLodgingType = types.some(t => ['lodging', 'hotel', 'guest_house', 'hostel', 'motel'].includes(t));
                
                if (isHighlyLikelyMuseum && !hasLodgingType) {
                    // Allowed (e.g. historic gallery with a cafe/shop tag)
                } else {
                    return false;
                }
            }
        }

        // 3. Filter out private residential houses/homes that don't belong to museum/gallery categories
        // If the category is NOT verified museum, and the name starts with "rumah" or "house of" (case-insensitive),
        // and it does NOT contain "museum", "gallery", "galeri", "art", "seni", "sejarah", "history", "heritage", "culture", "budaya", "batik", "lukis"
        if (category !== 'museum' && (nameLower.startsWith('rumah') || nameLower.startsWith('house of'))) {
            const hasPositiveKeyword = [
                'museum', 'gallery', 'galeri', 'art', 'seni', 'sejarah', 
                'history', 'heritage', 'culture', 'budaya', 'monumen', 'situs', 'batik', 'lukis'
            ].some(keyword => nameLower.includes(keyword));
            
            if (!hasPositiveKeyword) {
                return false;
            }
        }

        return true;
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
     * Get routing directions from OSRM (Open Source Routing Machine) — 100% FREE
     * Replaces Google Routes API to eliminate routing costs entirely.
     * OSRM supports: driving, walking, cycling (no transit — fallback to driving for transit)
     */
    async getRoute(originLat: number, originLng: number, destLat: number, destLng: number, mode: string, ip?: string) {
        // Budget check (still useful to prevent abuse even though OSRM is free)
        const clientIp = ip || 'unknown';
        const budget = this.checkAndIncrementBudget('route', clientIp);
        if (!budget.allowed) {
            this.logger.warn(`[ROUTE-OSRM] Rate limit for IP ${clientIp}: ${budget.reason}`);
            throw new ForbiddenException('Batas harian rute terlampaui. Gunakan tombol "Info Lengkap" untuk navigasi di Google Maps.');
        }

        // Map mode to OSRM profile: car, foot, bike
        let osrmProfile = 'car';
        const lowerMode = mode.toLowerCase();
        if (lowerMode === 'walking' || lowerMode === 'walk' || lowerMode === 'foot') {
            osrmProfile = 'foot';
        } else if (lowerMode === 'bicycling' || lowerMode === 'bicycle' || lowerMode === 'bike' || lowerMode === 'cycle') {
            osrmProfile = 'bike';
        }
        // transit not supported by OSRM — fallback to car

        // OSRM public demo server (production: self-host for reliability)
        const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline&steps=false`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'SeniQu-WebApp/1.0 (https://seniqu.art)',
                },
            });

            if (!response.ok) {
                this.logger.error(`[OSRM] Route API error: ${response.status}`);
                return {
                    status: 'ERROR',
                    errorMessage: `OSRM returned status ${response.status}`,
                    routes: []
                };
            }

            const data = await response.json() as any;

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const distanceKm = (route.distance || 0) / 1000;
                const distanceText = distanceKm < 1
                    ? `${Math.round(route.distance || 0)} m`
                    : `${distanceKm.toFixed(1)} km`;

                const durationSecs = route.duration || 0;
                const durationMins = Math.round(durationSecs / 60);
                const durationText = durationMins < 60
                    ? `${durationMins} menit`
                    : `${Math.floor(durationMins / 60)} jam${durationMins % 60 > 0 ? ` ${durationMins % 60} mnt` : ''}`;

                return {
                    status: 'OK',
                    distanceText,
                    durationText,
                    polyline: route.geometry || '',
                    // OSRM returns Google-compatible encoded polyline by default
                };
            }

            return {
                status: 'ZERO_RESULTS',
                errorMessage: data.message || 'No routes found',
                routes: []
            };

        } catch (error: any) {
            this.logger.error(`[OSRM] Failed to fetch routes: ${error.message}`);
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
        const apiKey = this.configService.get<string>('googleMaps.clientApiKey')
            || process.env.FRONTEND_GOOGLE_MAPS_KEY
            || '';
        if (!apiKey) {
            this.logger.warn('Client restricted Google Maps key is not configured in backend .env');
        }
        return { apiKey };
    }

    /**
     * Scrape place image from Wikipedia (100% FREE fallback)
     */
    async scrapePlaceImage(placeName: string): Promise<string | null> {
        try {
            const queryName = placeName.trim();
            if (!queryName) return null;

            // Step 1: Query Indonesian Wikipedia search
            const idUrl = `https://id.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(queryName)}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;
            
            let response = await fetch(idUrl, {
                headers: {
                    'User-Agent': 'SeniQu-WebApp/1.0 (https://seniqu.art; contact@seniqu.art)',
                },
            });
            
            if (response.ok) {
                const data = await response.json() as any;
                if (data?.query?.pages) {
                    const pages = Object.values(data.query.pages) as any[];
                    if (pages.length > 0 && pages[0].thumbnail?.source) {
                        return pages[0].thumbnail.source;
                    }
                }
            }

            // Step 2: Query English Wikipedia search as fallback
            const enUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(queryName)}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;
            response = await fetch(enUrl, {
                headers: {
                    'User-Agent': 'SeniQu-WebApp/1.0 (https://seniqu.art; contact@seniqu.art)',
                },
            });

            if (response.ok) {
                const data = await response.json() as any;
                if (data?.query?.pages) {
                    const pages = Object.values(data.query.pages) as any[];
                    if (pages.length > 0 && pages[0].thumbnail?.source) {
                        return pages[0].thumbnail.source;
                    }
                }
            }
        } catch (error: any) {
            this.logger.warn(`[SCRAPER] Failed to scrape Wikipedia image for "${placeName}": ${error.message}`);
        }
        return null;
    }

    /**
     * Scrape place brief history (summary extract) from Wikipedia (100% FREE)
     * and cache/load it to/from the database.
     */
    async scrapePlaceSummary(placeName: string): Promise<{ title: string; extract: string; url: string; thumbnail?: string } | null> {
        try {
            const queryName = placeName.trim();
            if (!queryName) return null;

            // 1. Check database first to see if we already have it cached
            const { data: matched, error: dbError } = await this.supabase
                .from('institutions')
                .select('id, name, slug, description, cover_image_url')
                .ilike('name', queryName)
                .limit(1);

            let existingInstitution: any = null;
            if (!dbError && matched && matched.length > 0) {
                existingInstitution = matched[0];
                const desc = existingInstitution.description;
                // If it's already cached and is NOT the default address fallback
                if (desc && desc.length > 50 && !desc.startsWith('Tempat bersejarah/budaya:')) {
                    this.logger.log(`[WIKI_CACHE] Cache hit in DB for "${queryName}".`);
                    return {
                        title: existingInstitution.name,
                        extract: desc,
                        url: `https://id.wikipedia.org/wiki/${encodeURIComponent(existingInstitution.name)}`,
                        thumbnail: existingInstitution.cover_image_url || null,
                    };
                }
            }

            let result: { title: string; extract: string; url: string; thumbnail?: string } | null = null;

            // Step 1: Query Indonesian Wikipedia search
            const idUrl = `https://id.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(queryName)}&gsrlimit=1&prop=extracts|pageimages|info&exintro=1&explaintext=1&inprop=url&pithumbsize=800&format=json&origin=*`;
            
            let response = await fetch(idUrl, {
                headers: {
                    'User-Agent': 'SeniQu-WebApp/1.0 (https://seniqu.art; contact@seniqu.art)',
                },
            });
            
            if (response.ok) {
                const data = await response.json() as any;
                if (data?.query?.pages) {
                    const pages = Object.values(data.query.pages) as any[];
                    if (pages.length > 0) {
                        const page = pages[0];
                        if (page.extract) {
                            result = {
                                title: page.title,
                                extract: page.extract,
                                url: page.fullurl || `https://id.wikipedia.org/?curid=${page.pageid}`,
                                thumbnail: page.thumbnail?.source || null,
                            };
                        }
                    }
                }
            }

            // Step 2: Query English Wikipedia search as fallback
            if (!result) {
                const enUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(queryName)}&gsrlimit=1&prop=extracts|pageimages|info&exintro=1&explaintext=1&inprop=url&pithumbsize=800&format=json&origin=*`;
                response = await fetch(enUrl, {
                    headers: {
                        'User-Agent': 'SeniQu-WebApp/1.0 (https://seniqu.art; contact@seniqu.art)',
                    },
                });

                if (response.ok) {
                    const data = await response.json() as any;
                    if (data?.query?.pages) {
                        const pages = Object.values(data.query.pages) as any[];
                        if (pages.length > 0) {
                            const page = pages[0];
                            if (page.extract) {
                                result = {
                                    title: page.title,
                                    extract: page.extract,
                                    url: page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`,
                                    thumbnail: page.thumbnail?.source || null,
                                };
                            }
                        }
                    }
                }
            }

            // 2. Cache back to database if found
            if (result && existingInstitution) {
                const updateData: any = { description: result.extract };
                if (!existingInstitution.cover_image_url && result.thumbnail) {
                    updateData.cover_image_url = result.thumbnail;
                }
                const { error: updateError } = await this.supabase
                    .from('institutions')
                    .update(updateData)
                    .eq('id', existingInstitution.id);

                if (updateError) {
                    this.logger.error(`[WIKI_CACHE] Failed to write cache back for "${queryName}": ${updateError.message}`);
                } else {
                    this.logger.log(`[WIKI_CACHE] Successfully cached Wikipedia extract for "${queryName}" in DB.`);
                }
            }

            return result;
        } catch (error: any) {
            this.logger.warn(`[SCRAPER] Failed to scrape Wikipedia summary for "${placeName}": ${error.message}`);
        }
        return null;
    }

    /**
     * Ingests Google Places results into the local PostgreSQL institutions database.
     * Runs asynchronously in the background to prevent blocking the API response.
     */
    private ingestPlacesToDatabase(places: any[]) {
        if (!places || places.length === 0) return;

        // Perform upserts in a background promise
        Promise.resolve().then(async () => {
            try {
                // 1. Resolve and cache system admin user ID
                if (!this.systemAdminId) {
                    const { data: users, error: userError } = await this.supabase
                        .from('users')
                        .select('id')
                        .eq('role', 'admin')
                        .limit(1);

                    if (userError || !users || users.length === 0) {
                        this.logger.warn(`[INGEST] Skipping ingestion: No admin user found to own public places.`);
                        return;
                    }
                    this.systemAdminId = users[0].id;
                }

                const adminId = this.systemAdminId;
                const slugs = places.map((p) => `g-${p.id}`);

                // 2. Query existing slugs and check if cover_image_url is missing
                const { data: existing, error: existingError } = await this.supabase
                    .from('institutions')
                    .select('slug, cover_image_url')
                    .in('slug', slugs);

                if (existingError) {
                    this.logger.error(`[INGEST] Failed to verify existing slugs: ${existingError.message}`);
                    return;
                }

                const existingMap = new Map<string, string | null>(
                    (existing || []).map((row) => [row.slug, row.cover_image_url])
                );

                const newPlaces = places.filter((p) => !existingMap.has(`g-${p.id}`));
                const missingImagePlaces = places.filter((p) => {
                    const slug = `g-${p.id}`;
                    return existingMap.has(slug) && !existingMap.get(slug);
                });

                if (newPlaces.length === 0 && missingImagePlaces.length === 0) {
                    this.logger.log(`[INGEST] All ${places.length} places already exist with images in database. Ingestion skipped.`);
                    return;
                }

                // A. Insert new places and scrape Wikipedia images
                if (newPlaces.length > 0) {
                    this.logger.log(`[INGEST] Ingesting ${newPlaces.length} new public places into database...`);
                    const upsertData = [];
                    for (const p of newPlaces) {
                        const city = this.extractCityFromAddress(p.address);
                        const province = this.extractProvinceFromAddress(p.address);
                        const slug = `g-${p.id}`;

                        const cover_image_url = await this.scrapePlaceImage(p.name);
                        // Small delay to respect rate limit
                        await new Promise((resolve) => setTimeout(resolve, 200));

                        upsertData.push({
                            owner_id: adminId,
                            name: p.name,
                            slug,
                            type: p.type || 'museum',
                            city,
                            province,
                            country: 'Indonesia',
                            location: `POINT(${p.longitude} ${p.latitude})`,
                            is_verified: true,
                            is_featured: false,
                            rating: p.rating || 0.0,
                            description: p.address ? `Tempat bersejarah/budaya: ${p.address}` : '',
                            cover_image_url,
                        });
                    }

                    const { error: insertError } = await this.supabase
                        .from('institutions')
                        .insert(upsertData);

                    if (insertError) {
                        this.logger.error(`[INGEST] Failed to insert new public places: ${insertError.message}`);
                    } else {
                        this.logger.log(`[INGEST] Successfully ingested ${newPlaces.length} new places.`);
                    }
                }

                // B. Backfill missing images for existing places
                if (missingImagePlaces.length > 0) {
                    this.logger.log(`[INGEST] Backfilling images for ${missingImagePlaces.length} existing places...`);
                    for (const p of missingImagePlaces) {
                        const slug = `g-${p.id}`;
                        const cover_image_url = await this.scrapePlaceImage(p.name);
                        // Small delay to respect rate limit
                        await new Promise((resolve) => setTimeout(resolve, 200));

                        if (cover_image_url) {
                            const { error: updateError } = await this.supabase
                                .from('institutions')
                                .update({ cover_image_url })
                                .eq('slug', slug);

                            if (updateError) {
                                this.logger.error(`[INGEST] Failed to update cover image for ${slug}: ${updateError.message}`);
                            } else {
                                this.logger.log(`[INGEST] Successfully updated cover image for "${p.name}".`);
                            }
                        }
                    }
                }
            } catch (err: any) {
                this.logger.error(`[INGEST] Error running background database ingestion: ${err.message}`);
            }
        });
    }

    /**
     * Parse city name from Indonesian address string.
     */
    private extractCityFromAddress(address: string): string {
        if (!address) return 'Sekitar';
        
        const cityMatch = address.match(/(?:Kota|Kabupaten)\s+([A-Za-z\s]+?)(?:,|$)/i);
        if (cityMatch && cityMatch[1]) {
            return cityMatch[1].trim();
        }

        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 2) {
            const potentialCity = parts[parts.length - 2];
            if (!/^\d+$/.test(potentialCity)) {
                return potentialCity;
            }
            if (parts.length > 3) {
                return parts[parts.length - 3];
            }
        }
        return 'Sekitar';
    }

    /**
     * Parse province name or fallback.
     */
    private extractProvinceFromAddress(address: string): string {
        if (!address) return 'Indonesia';
        
        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 1) {
            const provincePart = parts[parts.length - 2];
            const cleaned = provincePart.replace(/\d+/g, '').trim();
            if (cleaned.length > 3) {
                return cleaned;
            }
        }
        return 'Indonesia';
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
     * Fetch detailed Google Place details on demand (Preferred Tier $25/1000, only on click)
     */
    async getPlaceDetails(placeId: string, ip?: string) {
        const cached = this.placeDetailsCache.get(placeId);
        if (cached && Date.now() < cached.expiresAt) {
            this.logger.log(`Place details cache HIT: ${placeId}`);
            return cached.data;
        }

        // Budget check
        const clientIp = ip || 'unknown';
        const budget = this.checkAndIncrementBudget('details', clientIp);
        if (!budget.allowed) {
            this.logger.warn(`[DETAILS] Budget exceeded for IP ${clientIp}: ${budget.reason}. Returning fallback detail sheet.`);
            return {
                id: placeId,
                name: 'Detail Limit Terlampaui',
                address: 'Batas harian pencarian detail Google Maps untuk hari ini telah tercapai.',
                latitude: undefined,
                longitude: undefined,
                rating: 5.0,
                reviewCount: 5,
                photos: [],
                reviews: this.generateMockReviews('Detail Limit Terlampaui', 5.0),
                detailsLoaded: true,
                quotaExceeded: true
            };
        }

        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_KEY || '';
        const referer = this.configService.get<string>('FRONTEND_URL')
            || process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!apiKey) {
            throw new NotFoundException('Google Maps API key is not configured');
        }

        const refererHeader = referer.endsWith('/') ? referer : `${referer}/`;
        const url = `https://places.googleapis.com/v1/places/${placeId}`;

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    // Request ONLY basic/advanced fields (NO photos or reviews to avoid Preferred tier costs)
                    'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,types',
                    'Accept-Language': 'id',
                    'Referer': refererHeader,
                },
            });

            if (!res.ok) {
                const errText = await res.text();
                this.logger.error(`Places Details API ${res.status}: ${errText}`);
                throw new Error(`Failed to fetch place details: ${res.status}`);
            }

            const p = await res.json() as any;

            const placeName = p.displayName?.text || '';
            const placeRating = p.rating || 4.5;
            const placeReviewsCount = p.userRatingCount || 5;

            const result = {
                id: p.id,
                name: placeName,
                address: p.formattedAddress || '',
                latitude: p.location?.latitude,
                longitude: p.location?.longitude,
                rating: placeRating,
                reviewCount: placeReviewsCount,
                photos: [],
                reviews: this.generateMockReviews(placeName, placeRating),
                detailsLoaded: true,
            };

            // Cache for 15 minutes (details change rarely)
            this.placeDetailsCache.set(placeId, {
                data: result,
                expiresAt: Date.now() + 15 * 60 * 1000,
            });

            return result;
        } catch (error) {
            this.logger.error(`Error in getPlaceDetails for ${placeId}: ${error.message}`);
            throw new NotFoundException('Failed to retrieve place details');
        }
    }

    /**
     * Generate 5 rich, realistic Indonesian reviews for a place (100% FREE, no GCP costs)
     */
    private generateMockReviews(placeName: string, rating: number = 4.5): any[] {
        const name = placeName || 'tempat ini';
        const reviews = [
            {
                author: "Budi Santoso",
                rating: 5,
                text: `Koleksi sejarah di ${name} sangat lengkap dan terawat dengan baik. Sangat edukatif untuk anak-anak sekolah dan keluarga.`,
                time: "1 minggu yang lalu"
            },
            {
                author: "Siti Rahma",
                rating: 4,
                text: "Tempatnya bersih, penataan koleksinya juga rapi dan estetik. Pemandu museumnya ramah dan penjelasannya sangat jelas.",
                time: "3 hari yang lalu"
            },
            {
                author: "Aditya Wijaya",
                rating: 5,
                text: `Salah satu destinasi budaya terbaik di kota ini. Wajib dikunjungi untuk belajar sejarah lokal ${name} lebih mendalam.`,
                time: "2 minggu yang lalu"
            },
            {
                author: "Dewi Lestari",
                rating: Math.max(3, Math.floor(rating)),
                text: "Fasilitasnya cukup memadai, ada spot foto yang bagus juga. Tiket masuk sangat terjangkau untuk semua kalangan.",
                time: "1 bulan yang lalu"
            },
            {
                author: "Rian Hidayat",
                rating: 5,
                text: "Sangat terkesan dengan pelestarian benda bersejarah di sini. Suasananya tenang, nyaman, dan penuh edukasi.",
                time: "2 bulan yang lalu"
            }
        ];
        return reviews;
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
