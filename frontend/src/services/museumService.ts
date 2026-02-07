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
     * Get all verified museums/galleries
     */
    async getMuseums(filters: MuseumSearchFilters = {}): Promise<PaginatedResponse<Museum>> {
        return apiGet<PaginatedResponse<Museum>>('/museums', { params: filters });
    }

    /**
     * Get nearby museums
     */
    async getNearbyMuseums(filters: NearbyFilters): Promise<Museum[]> {
        return apiGet<Museum[]>('/museums/nearby', { params: filters });
    }

    /**
     * Get museum by slug
     */
    async getMuseumBySlug(slug: string): Promise<Museum> {
        return apiGet<Museum>(`/museums/${slug}`);
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
        return apiPost<Museum>('/museums', data);
    }

    /**
     * Update museum
     */
    async updateMuseum(id: string, data: Partial<CreateMuseumData>): Promise<Museum> {
        return apiPut<Museum>(`/museums/${id}`, data);
    }

    /**
     * Verify museum (Admin)
     */
    async verifyMuseum(id: string): Promise<Museum> {
        return apiPut<Museum>(`/museums/${id}/verify`);
    }

    /**
     * Delete museum (Admin)
     */
    async deleteMuseum(id: string): Promise<void> {
        return apiDelete(`/museums/${id}`);
    }
}

export const museumService = MuseumService.getInstance();
