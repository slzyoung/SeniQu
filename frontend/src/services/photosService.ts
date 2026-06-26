/**
 * Photos Service
 * Communicates with backend endpoints for photography discover, social, and selling
 */

import { apiGet, apiPost, apiDelete, apiPut } from '../lib/api';
import api from '../lib/api';
import { PhotoData } from '../features/user/pages/MyCollectionsPage/components/PhotoCard';

export interface SearchPhotosParams {
    page?: number;
    limit?: number;
    category?: string;
    theme?: string;
    tag?: string;
    forSaleOnly?: boolean;
    query?: string;
    userId?: string;
    sort?: 'latest' | 'trending' | 'most_liked' | 'price_asc' | 'price_desc';
}

export interface PhotoFeedResponse {
    data: PhotoData[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface PhotoComment {
    id: string;
    userId: string;
    photoId: string;
    parentId?: string;
    content: string;
    createdAt: string;
    user?: {
        id: string;
        displayName: string;
        avatar?: string;
    };
}

export interface PhotoRequest {
    id: string;
    userId: string;
    title: string;
    description: string;
    budget?: number;
    currency: string;
    deadline?: string;
    status: string;
    createdAt: string;
    users?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export interface PhotoRequestSubmission {
    id: string;
    requestId: string;
    userId: string;
    photoId?: string;
    message?: string;
    price?: number;
    status: string;
    createdAt: string;
    users?: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
    photos?: PhotoData;
}

export interface PhotographerStats {
    displayName: string;
    avatarUrl?: string;
    photosCount: number;
    collectionsCount: number;
    likesReceived: number;
    solEarnings?: number;
}


class PhotosService {
    private static instance: PhotosService;

    private constructor() {}

    static getInstance(): PhotosService {
        if (!PhotosService.instance) {
            PhotosService.instance = new PhotosService();
        }
        return PhotosService.instance;
    }

    /**
     * Unwraps backend responses from the global TransformInterceptor envelope.
     */
    private unwrap<T>(res: any): T {
        if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
            return res.data as T;
        }
        return res as T;
    }

    /**
     * Fetch photos for the feed
     */
    async getPhotos(params: SearchPhotosParams): Promise<PhotoFeedResponse> {
        const res = await apiGet<any>('/photos', { params });
        return this.unwrap<PhotoFeedResponse>(res);
    }

    /**
     * Fetch personalized feed
     */
    async getFeed(params: SearchPhotosParams): Promise<PhotoFeedResponse> {
        const res = await apiGet<any>('/photos/feed', { params });
        return this.unwrap<PhotoFeedResponse>(res);
    }

    /**
     * Fetch photos for sale (marketplace)
     */
    async getMarketplace(params: SearchPhotosParams): Promise<PhotoFeedResponse> {
        const res = await apiGet<any>('/photos/marketplace', { params });
        return this.unwrap<PhotoFeedResponse>(res);
    }

    /**
     * Get user's own photos
     */
    async getMyPhotos(page = 1, limit = 20): Promise<PhotoFeedResponse> {
        const res = await apiGet<any>('/photos/mine', { params: { page, limit } });
        return this.unwrap<PhotoFeedResponse>(res);
    }

    /**
     * Get single photo details
     */
    async getPhoto(id: string): Promise<PhotoData> {
        const res = await apiGet<any>(`/photos/${id}`);
        return this.unwrap<PhotoData>(res);
    }

    /**
     * Update photo metadata
     */
    async updatePhoto(id: string, data: Partial<PhotoData>): Promise<PhotoData> {
        const res = await apiPut<any>(`/photos/${id}`, data);
        return this.unwrap<PhotoData>(res);
    }

    /**
     * Delete a photo
     */
    async deletePhoto(id: string): Promise<void> {
        const res = await apiDelete<any>(`/photos/${id}`);
        return this.unwrap<void>(res);
    }

    /**
     * Toggle like on a photo
     */
    async toggleLike(photoId: string): Promise<{ liked: boolean; count: number }> {
        const res = await apiPost<any>(`/photos/${photoId}/like`);
        return this.unwrap<{ liked: boolean; count: number }>(res);
    }

    /**
     * Get comments for a photo
     */
    async getComments(photoId: string): Promise<PhotoComment[]> {
        const res = await apiGet<any>(`/photos/${photoId}/comments`);
        return this.unwrap<PhotoComment[]>(res);
    }

    /**
     * Add comment to a photo
     */
    async addComment(photoId: string, content: string, parentId?: string): Promise<PhotoComment> {
        const res = await apiPost<any>(`/photos/${photoId}/comments`, { content, parentId });
        return this.unwrap<PhotoComment>(res);
    }

    /**
     * Upload photo to R2 and index in Supabase
     */
    async uploadPhoto(
        file: File,
        metadata: {
            title: string;
            description?: string;
            category?: string;
            theme?: string;
            tags?: string[];
            isForSale?: boolean;
            price?: number;
            currency?: string;
            locationName?: string;
        },
        onProgress?: (progress: number) => void
    ): Promise<PhotoData> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', metadata.title);
        if (metadata.description) formData.append('description', metadata.description);
        if (metadata.category) formData.append('category', metadata.category);
        if (metadata.theme) formData.append('theme', metadata.theme);
        if (metadata.tags && metadata.tags.length > 0) {
            metadata.tags.forEach(tag => formData.append('tags[]', tag));
        }
        if (metadata.isForSale !== undefined) formData.append('isForSale', String(metadata.isForSale));
        if (metadata.price !== undefined) formData.append('price', String(metadata.price));
        if (metadata.currency) formData.append('currency', metadata.currency);
        if (metadata.locationName) formData.append('locationName', metadata.locationName);


        const response = await api.post('/photos/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(progress);
                }
            },
        });

        return this.unwrap<PhotoData>(response.data);
    }

    /**
     * Get public collections, optionally filtered by user ID
     */
    async getPublicCollections(userId?: string): Promise<any[]> {
        const res = await apiGet<any[]>('/photos/collections/public', { params: { userId } });
        return this.unwrap<any[]>(res);
    }

    /**
     * Create a photography request/commission
     */
    async createRequest(
        title: string,
        description: string,
        budget?: number,
        currency?: string,
        deadline?: string
    ): Promise<PhotoRequest> {
        const res = await apiPost<any>('/photos/requests', { title, description, budget, currency, deadline });
        return this.unwrap<PhotoRequest>(res);
    }

    /**
     * Get all open photo requests
     */
    async getRequests(): Promise<PhotoRequest[]> {
        const res = await apiGet<any>('/photos/requests');
        return this.unwrap<PhotoRequest[]>(res);
    }

    /**
     * Submit a proposal or photo to a request
     */
    async createSubmission(
        requestId: string,
        payload: { photoId?: string; message?: string; price?: number }
    ): Promise<PhotoRequestSubmission> {
        const res = await apiPost<any>(`/photos/requests/${requestId}/submissions`, payload);
        return this.unwrap<PhotoRequestSubmission>(res);
    }

    /**
     * Get submissions for a request
     */
    async getSubmissions(requestId: string): Promise<PhotoRequestSubmission[]> {
        const res = await apiGet<any>(`/photos/requests/${requestId}/submissions`);
        return this.unwrap<PhotoRequestSubmission[]>(res);
    }

    /**
     * Get photographer details and stats
     */
    async getPhotographerStats(userId: string): Promise<PhotographerStats> {
        const res = await apiGet<any>(`/photos/photographers/${userId}/stats`);
        return this.unwrap<PhotographerStats>(res);
    }

    /**
     * Purchase a photo using Solana simulation
     */
    async purchasePhoto(
        photoId: string,
        payload: { transactionRef: string; licenseType?: string }
    ): Promise<any> {
        const res = await apiPost<any>(`/photos/${photoId}/purchase`, payload);
        return this.unwrap<any>(res);
    }

    /**
     * Make an offer on a photo using SOL
     */
    async makeOffer(
        photoId: string,
        amount: number,
        currency = 'SOL'
    ): Promise<any> {
        const res = await apiPost<any>(`/photos/${photoId}/offers`, { amount, currency });
        return this.unwrap<any>(res);
    }

    /**
     * Get offers made on a photo
     */
    async getOffers(photoId: string): Promise<any[]> {
        const res = await apiGet<any>(`/photos/${photoId}/offers`);
        return this.unwrap<any[]>(res);
    }

    /**
     * Accept, reject, or cancel an offer
     */
    async updateOfferStatus(
        offerId: string,
        status: 'accepted' | 'rejected' | 'cancelled'
    ): Promise<any> {
        const res = await apiPut<any>(`/photos/offers/${offerId}`, { status });
        return this.unwrap<any>(res);
    }
}


export const photosService = PhotosService.getInstance();
