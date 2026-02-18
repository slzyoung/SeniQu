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

    private constructor() { }

    static getInstance(): MuseumService {
        if (!MuseumService.instance) {
            MuseumService.instance = new MuseumService();
        }
        return MuseumService.instance;
    }

    /**
     * Helper to map DB response to Museum interface
     */
    private mapDatabaseToMuseum(data: any): Museum {
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            address: data.address || {
                street: '',
                city: data.city,
                province: data.province,
                postalCode: data.postal_code,
                country: data.country
            },
            coordinates: data.coordinates || { lat: 0, lng: 0 },
            images: data.images || [data.cover_image_url].filter(Boolean) || [],
            artworksCount: data.total_artworks || 0,
            rating: data.rating,
            openingHours: data.opening_hours,
            contactInfo: data.contact_info,
            isVerified: data.is_verified,
            // Add other fields if necessary
        };
    }

    /**
     * Get all verified museums/galleries
     */
    async getMuseums(filters: MuseumSearchFilters = {}): Promise<PaginatedResponse<Museum>> {
        const response = await apiGet<any>('/museums', { params: filters });
        return {
            data: (response.data || []).map(this.mapDatabaseToMuseum),
            meta: response.meta
        };
    }

    /**
     * Get nearby museums
     */
    async getNearbyMuseums(filters: NearbyFilters): Promise<Museum[]> {
        const response = await apiGet<{ data: any[] }>('/museums/nearby', { params: filters });
        return (response.data || []).map(this.mapDatabaseToMuseum);
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
}

export const museumService = MuseumService.getInstance();
