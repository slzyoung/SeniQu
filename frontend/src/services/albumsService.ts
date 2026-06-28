/**
 * Albums Service
 * Handles user album and album items management
 */

import api, { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

export interface Album {
    id: string;
    userId: string;
    title: string;
    description?: string;
    coverUrl?: string;
    theme?: string;
    isPublic: boolean;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface AlbumItem {
    id: string;
    albumId: string;
    userId: string;
    title: string;
    description?: string;
    itemType: 'photo' | 'artwork' | 'digital_art';
    originalUrl: string;
    mediumUrl?: string;
    thumbnailUrl?: string;
    fileSizeBytes?: number;
    mimeType?: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAlbumDto {
    title: string;
    description?: string;
    coverUrl?: string;
    theme?: string;
    isPublic?: boolean;
}

export interface CreateAlbumItemDto {
    title: string;
    description?: string;
    itemType?: 'photo' | 'artwork' | 'digital_art';
    isPublic?: boolean;
}

class AlbumsService {
    private static instance: AlbumsService;

    private constructor() {}

    static getInstance(): AlbumsService {
        if (!AlbumsService.instance) {
            AlbumsService.instance = new AlbumsService();
        }
        return AlbumsService.instance;
    }

    /**
     * Helper to unwrap standard response envelope if present
     */
    private unwrap<T>(res: any): T {
        if (res && typeof res === 'object' && 'data' in res) {
            return res.data as T;
        }
        return res as T;
    }

    /**
     * Get albums of a user
     */
    async getUserAlbums(userId: string): Promise<Album[]> {
        const res = await apiGet<Album[]>(`/albums/user/${userId}`);
        return this.unwrap<Album[]>(res);
    }

    /**
     * Get my own albums
     */
    async getMyAlbums(): Promise<Album[]> {
        const res = await apiGet<Album[]>('/albums/me');
        return this.unwrap<Album[]>(res);
    }

    /**
     * Get single album details by ID
     */
    async getAlbum(id: string): Promise<Album> {
        const res = await apiGet<Album>(`/albums/${id}`);
        return this.unwrap<Album>(res);
    }

    /**
     * Create a new album
     */
    async createAlbum(data: CreateAlbumDto): Promise<Album> {
        const res = await apiPost<Album>('/albums', data);
        return this.unwrap<Album>(res);
    }

    /**
     * Delete album
     */
    async deleteAlbum(albumId: string): Promise<void> {
        return apiDelete<void>(`/albums/${albumId}`);
    }

    /**
     * Get items inside an album
     */
    async getAlbumItems(albumId: string): Promise<AlbumItem[]> {
        const res = await apiGet<AlbumItem[]>(`/albums/${albumId}/items`);
        return this.unwrap<AlbumItem[]>(res);
    }

    /**
     * Upload and add item to an album
     */
    async uploadAlbumItem(
        albumId: string,
        file: File,
        metadata: CreateAlbumItemDto,
        onProgress?: (progress: number) => void
    ): Promise<AlbumItem> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', metadata.title);
        if (metadata.description) formData.append('description', metadata.description);
        if (metadata.itemType) formData.append('itemType', metadata.itemType);
        if (metadata.isPublic !== undefined) formData.append('isPublic', String(metadata.isPublic));

        const response = await api.post(`/albums/${albumId}/items`, formData, {
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

        return this.unwrap<AlbumItem>(response.data);
    }

    /**
     * Update/toggle public status of an album item
     */
    async updateAlbumItem(albumId: string, itemId: string, isPublic: boolean): Promise<AlbumItem> {
        const res = await apiPatch<AlbumItem>(`/albums/${albumId}/items/${itemId}`, { isPublic });
        return this.unwrap<AlbumItem>(res);
    }

    /**
     * Delete album item
     */
    async deleteAlbumItem(albumId: string, itemId: string): Promise<void> {
        return apiDelete<void>(`/albums/${albumId}/items/${itemId}`);
    }
}

export const albumsService = AlbumsService.getInstance();
