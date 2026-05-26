/**
 * Museum Service
 * Handles museum/gallery fetching and management
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { Museum, PaginatedResponse } from '../lib/types';

export interface MuseumSearchFilters {
    page?: number;
    limit?: number;
    city?: string;
    type?: string;
    search?: string;
    verified?: boolean;
}

export interface NearbyFilters {
    lat: number;
    lng: number;
    radius?: number; // in km
}

export interface CreateMuseumData {
    name: string;
    description: string;
    address: {
        street: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
    };
    coordinates: {
        lat: number;
        lng: number;
    };
    contactInfo?: {
        phone?: string;
        email?: string;
        website?: string;
    };
}

class MuseumService {
    private static instance: MuseumService;

    /** SECURITY: TTL-based cache to prevent stale data and memory bloat */
    private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private static readonly CACHE_MAX_SIZE = 20;
    private searchCache = new Map<string, { data: any; expiresAt: number }>();

    private constructor() { }

    static getInstance(): MuseumService {
        if (!MuseumService.instance) {
            MuseumService.instance = new MuseumService();
        }
        return MuseumService.instance;
    }

    /**
     * Helper to safely extract array data from various wrapped API response shapes
     */
    private extractArrayData(res: any): any[] {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
    }

    private parseLocation = (data: any): { lat: number; lng: number } => {
        if (!data) return { lat: 0, lng: 0 };

        // 1. Check if already has coordinates object
        if (data.coordinates && typeof data.coordinates.lat === 'number') {
            return { lat: data.coordinates.lat, lng: data.coordinates.lng };
        }

        // 2. Check if location is GeoJSON
        if (data.location && typeof data.location === 'object' && data.location.coordinates) {
            const [lng, lat] = data.location.coordinates;
            return { lat: Number(lat) || 0, lng: Number(lng) || 0 };
        }

        // 3. Check if location is WKT string e.g. "POINT(110.378 -7.789)"
        if (data.location && typeof data.location === 'string') {
            if (/^[0-9a-fA-F]+$/.test(data.location)) {
                try {
                    const hex = data.location;
                    const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
                    if (bytes.length >= 21) {
                        const isLittleEndian = bytes[0] === 1;
                        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

                        // Read geometry type (4 bytes starting at index 1)
                        const geomType = view.getUint32(1, isLittleEndian);
                        const hasSrid = (geomType & 0x20000000) !== 0;
                        const offset = hasSrid ? 9 : 5;

                        if (bytes.length >= offset + 16) {
                            const lng = view.getFloat64(offset, isLittleEndian);
                            const lat = view.getFloat64(offset + 8, isLittleEndian);
                            return { lat: isNaN(lat) ? 0 : lat, lng: isNaN(lng) ? 0 : lng };
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse WKB hex location:', e);
                }
            } else {
                const match = data.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
                if (match) {
                    const lng = parseFloat(match[1]);
                    const lat = parseFloat(match[2]);
                    return { lat: isNaN(lat) ? 0 : lat, lng: isNaN(lng) ? 0 : lng };
                }
            }
        }

        return { lat: 0, lng: 0 };
    };

    /**
     * Helper to map DB response to Museum interface
     */
    private mapDatabaseToMuseum = (data: any): Museum => {
        const parsedImages = (data.images && data.images.length > 0)
            ? data.images
            : [data.cover_image_url].filter(Boolean);

        return {
            id: data.id,
            name: data.name,
            description: data.description,
            address: data.address || {
                street: data.street || '',
                city: data.city || 'Nearby',
                province: data.province || '',
                postalCode: data.postal_code || '',
                country: data.country || 'Indonesia'
            },
            coordinates: this.parseLocation(data),
            images: parsedImages.length > 0 ? parsedImages : [],
            artworksCount: data.total_artworks || 0,
            rating: data.rating,
            openingHours: data.opening_hours,
            contactInfo: data.contact_info,
            isVerified: data.is_verified,
            reviews: data.reviews || [],
        };
    };

    /**
     * Get all verified museums/galleries
     */
    async getMuseums(filters: MuseumSearchFilters = {}): Promise<PaginatedResponse<Museum>> {
        const response = await apiGet<any>('/museums', { params: filters });
        const dataArray = this.extractArrayData(response);
        const meta = response?.data?.meta || response?.meta;
        return {
            data: dataArray.map(this.mapDatabaseToMuseum),
            meta
        };
    }

    /**
     * Get nearby museums
     */
    async getNearbyMuseums(filters: NearbyFilters): Promise<Museum[]> {
        const response = await apiGet<any>('/museums/nearby', { params: filters });
        const dataArray = this.extractArrayData(response);
        return dataArray.map(this.mapDatabaseToMuseum);
    }

    /**
     * Get Google Maps API key from backend (secure)
     */
    async getMapsApiKey(): Promise<string> {
        const response = await apiGet<any>('/museums/maps-config');
        // apiGet already unwraps .data from axios, so response IS the controller return value
        return response?.apiKey || response?.data?.apiKey || '';
    }

    /**
     * Search nearby places via backend Google Places API (New)
     * Returns museums, galleries, and heritage sites near given coordinates
     *
     * SECURITY:
     * - Cache with TTL expiration (5 min) to prevent stale data
     * - Cache key rounds coords to 4 decimals (~11m) to stabilize
     * - Max 20 cache entries to limit memory usage
     * - Coordinates and query are validated server-side
     */
    async searchNearbyPlaces(lat: number, lng: number, radius?: number, query?: string): Promise<{ places: any[]; region?: { isMajorCity: boolean; regionName: string; maxRadiusKm: number }; quotaExceeded?: boolean }> {
        const rad = radius || 15000;
        // round to 4 decimal places to stabilize cache keys against minor user movements (~11 meters)
        const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${rad}_${query || ''}`;

        // SECURITY: Check cache with TTL validation
        const cached = this.searchCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }
        // Evict expired entry if present
        if (cached) {
            this.searchCache.delete(cacheKey);
        }

        const response = await apiGet<any>('/museums/search-nearby', {
            params: { lat, lng, radius: rad, query },
        });
        const places = response?.places || response?.data?.places || [];
        const region = response?.region || response?.data?.region || undefined;
        const quotaExceeded = response?.quotaExceeded || response?.data?.quotaExceeded || false;

        const result = { places, region, quotaExceeded };

        // SECURITY: Evict oldest entries when cache exceeds max size
        if (this.searchCache.size >= MuseumService.CACHE_MAX_SIZE) {
            // Remove expired entries first
            const now = Date.now();
            for (const [key, entry] of this.searchCache) {
                if (now >= entry.expiresAt) {
                    this.searchCache.delete(key);
                }
            }
            // If still full, remove the oldest entry
            if (this.searchCache.size >= MuseumService.CACHE_MAX_SIZE) {
                const firstKey = this.searchCache.keys().next().value;
                if (firstKey) this.searchCache.delete(firstKey);
            }
        }
        this.searchCache.set(cacheKey, {
            data: result,
            expiresAt: Date.now() + MuseumService.CACHE_TTL_MS,
        });

        return result;
    }

    /**
     * Detect if user is in a major city or kabupaten/regency area
     * Uses Google Geocoding API on the backend to determine administrative area type
     */
    async detectRegionType(lat: number, lng: number): Promise<{ isMajorCity: boolean; regionName: string; maxRadiusKm: number }> {
        try {
            const response = await apiGet<any>('/museums/region-type', {
                params: { lat, lng },
            });
            return {
                isMajorCity: response?.isMajorCity ?? response?.data?.isMajorCity ?? false,
                regionName: response?.regionName ?? response?.data?.regionName ?? 'Daerah',
                maxRadiusKm: response?.maxRadiusKm ?? response?.data?.maxRadiusKm ?? 70,
            };
        } catch (error) {
            console.warn('Region detection failed, defaulting to 70km:', error);
            return { isMajorCity: false, regionName: 'Sekitar', maxRadiusKm: 70 };
        }
    }

    /**
     * Get route directions via backend proxy (solves client restriction settings)
     */
    async getRouteDirections(originLat: number, originLng: number, destLat: number, destLng: number, mode: string): Promise<any> {
        return apiGet<any>('/museums/route', {
            params: {
                originLat,
                originLng,
                destLat,
                destLng,
                mode
            }
        });
    }

    /**
     * Get museum by slug
     */
    async getMuseumBySlug(slug: string): Promise<Museum> {
        const response = await apiGet<{ data: any }>(`/museums/${slug}`);
        return this.mapDatabaseToMuseum(response.data);
    }

    /**
    * Get museum by ID
    */
    // async getMuseumById(id: string): Promise<Museum> {
    //     // The backend mostly uses slug, but let's assume we might need ID lookup if the controller supports it.
    //     // Controller has generic GET /museums/:slug, checking if it handles UUIDs too. 
    //     // Actually the controller Param is just "slug", so it depends on implementation.
    //     return this.getMuseumBySlug(id);
    // }

    /**
     * Create new museum (Institution/Admin)
     */
    async createMuseum(data: CreateMuseumData): Promise<Museum> {
        const response = await apiPost<{ data: any }>('/museums', data);
        return this.mapDatabaseToMuseum(response.data);
    }

    /**
     * Update museum
     */
    async updateMuseum(id: string, data: Partial<CreateMuseumData>): Promise<Museum> {
        const response = await apiPut<{ data: any }>(`/museums/${id}`, data);
        return this.mapDatabaseToMuseum(response.data);
    }

    /**
     * Verify museum (Admin)
     */
    async verifyMuseum(id: string): Promise<Museum> {
        const response = await apiPut<{ data: any }>(`/museums/${id}/verify`);
        return this.mapDatabaseToMuseum(response.data);
    }

    /**
     * Delete museum (Admin)
     */
    async deleteMuseum(id: string): Promise<void> {
        return apiDelete(`/museums/${id}`);
    }

    /**
     * Get detailed Google Place info dynamically on-demand
     */
    async getPlaceDetails(placeId: string): Promise<any> {
        const response = await apiGet<any>(`/museums/place-details/${placeId}`);
        return response?.data || response;
    }

    /**
     * Get brief history / summary of a place from Wikipedia
     */
    async getWikipediaSummary(name: string): Promise<{ title: string; extract: string; url: string; thumbnail?: string } | null> {
        try {
            const response = await apiGet<any>(`/museums/wikipedia-summary`, { params: { name } });
            return response?.data || response;
        } catch (error) {
            console.error('[MUSEUM_SERVICE] Failed to fetch Wikipedia summary:', error);
            return null;
        }
    }
}

export const museumService = MuseumService.getInstance();

