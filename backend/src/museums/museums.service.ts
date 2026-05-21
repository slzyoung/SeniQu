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
     * Calls POST https://places.googleapis.com/v1/places:searchNearby
     * Returns museums, galleries, and heritage/cultural sites near the given coordinates.
     */
    async searchNearbyPlaces(lat: number, lng: number, radiusMeters: number) {
        const apiKey = this.configService.get<string>('googleMaps.apiKey')
            || process.env.GOOGLE_MAPS_API_KEY
            || '';
        const referer = this.configService.get<string>('FRONTEND_URL')
            || process.env.FRONTEND_URL
            || 'http://localhost:5173';

        if (!apiKey) {
            this.logger.warn('GOOGLE_MAPS_API_KEY is not configured');
            return { places: [] };
        }

        const url = 'https://places.googleapis.com/v1/places:searchNearby';

        // Run separate searches for each category to get comprehensive results
        const typeGroups = [
            { types: ['museum'], category: 'museum' },
            { types: ['art_gallery'], category: 'gallery' },
            { types: ['cultural_landmark', 'historical_landmark', 'tourist_attraction'], category: 'heritage' },
        ];

        const allPlaces: any[] = [];

        for (const group of typeGroups) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,places.regularOpeningHours,places.businessStatus',
                        'Referer': referer.endsWith('/') ? referer : `${referer}/`,
                    },
                    body: JSON.stringify({
                        includedTypes: group.types,
                        maxResultCount: 10,
                        locationRestriction: {
                            circle: {
                                center: {
                                    latitude: lat,
                                    longitude: lng,
                                },
                                radius: Math.min(radiusMeters, 50000),
                            },
                        },
                    }),
                });

                const data = await response.json() as any;

                if (response.ok && data.places) {
                    const mapped = data.places.map((place: any) => {
                        const photoUrls = (place.photos || []).slice(0, 5).map((photo: any) => {
                            return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=400&maxHeightPx=300&key=${apiKey}`;
                        });

                        return {
                            id: place.id,
                            name: place.displayName?.text || 'Unknown Place',
                            address: place.formattedAddress || '',
                            latitude: place.location?.latitude || 0,
                            longitude: place.location?.longitude || 0,
                            type: group.category,
                            rating: place.rating || 0,
                            reviewCount: place.userRatingCount || 0,
                            photos: photoUrls,
                            businessStatus: place.businessStatus || 'OPERATIONAL',
                            openNow: place.regularOpeningHours?.openNow ?? null,
                            googleTypes: place.types || [],
                        };
                    });
                    allPlaces.push(...mapped);
                } else if (data.error) {
                    this.logger.warn(`Places API search failed for types ${group.types.join(',')}: ${data.error.message}`);
                }
            } catch (error: any) {
                this.logger.error(`Places API network error for types ${group.types.join(',')}: ${error.message}`);
            }
        }

        // Deduplicate by place id
        const seen = new Set<string>();
        const unique = allPlaces.filter(p => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });

        // Sort by distance from center
        unique.sort((a, b) => {
            const distA = this.haversineDistance(lat, lng, a.latitude, a.longitude);
            const distB = this.haversineDistance(lat, lng, b.latitude, b.longitude);
            return distA - distB;
        });

        return { places: unique };
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
            this.logger.log(`Google Routes API response status: ${response.status}, body: ${responseText}`);

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
                    raw: data
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
