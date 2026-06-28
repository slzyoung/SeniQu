import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { StorageService } from "../storage/storage.service";
import { CreateAlbumDto, CreateAlbumItemDto, UpdateAlbumItemDto } from "./dto/album.dto";

@Injectable()
export class AlbumsService {
    private readonly logger = new Logger(AlbumsService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly storage: StorageService,
    ) {}

    /**
     * Create a new album
     */
    async create(userId: string, dto: CreateAlbumDto) {
        const client = this.db.getAdminClient();

        const { data, error } = await client
            .from("albums")
            .insert({
                user_id: userId,
                title: dto.title,
                description: dto.description || null,
                cover_url: dto.coverUrl || null,
                theme: dto.theme || "general",
                is_public: dto.isPublic !== false,
            })
            .select("*")
            .single();

        if (error) {
            this.logger.error(`Failed to create album: ${error.message}`);
            throw new Error(error.message);
        }

        return data;
    }

    /**
     * Get albums by user ID
     */
    async findByUser(userId: string, currentUserId?: string) {
        const client = this.db.getClient();
        let query = client
            .from("albums")
            .select("*")
            .eq("user_id", userId);

        if (userId !== currentUserId) {
            query = query.eq("is_public", true);
        }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    /**
     * Get single album details
     */
    async findOne(id: string, currentUserId?: string) {
        const client = this.db.getClient();
        const { data: album, error } = await client
            .from("albums")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !album) {
            throw new NotFoundException("Album not found");
        }

        if (!album.is_public && album.user_id !== currentUserId) {
            throw new ForbiddenException("This album is private");
        }

        return album;
    }

    /**
     * Delete album
     */
    async deleteAlbum(id: string, userId: string) {
        const client = this.db.getAdminClient();

        // Check ownership
        const { data: album, error: findError } = await client
            .from("albums")
            .select("user_id")
            .eq("id", id)
            .single();

        if (findError || !album) {
            throw new NotFoundException("Album not found");
        }

        if (album.user_id !== userId) {
            throw new ForbiddenException("Not your album");
        }

        // Delete items first (foreign keys will handle cascade, but safe practice)
        await client.from("album_items").delete().eq("album_id", id);

        const { error } = await client.from("albums").delete().eq("id", id);
        if (error) throw new Error(error.message);
        return { success: true };
    }

    /**
     * Upload an item and add it to the album
     */
    async addItem(albumId: string, userId: string, file: Express.Multer.File, dto: CreateAlbumItemDto) {
        const client = this.db.getAdminClient();

        // 1. Verify ownership of album
        const { data: album, error: albumError } = await client
            .from("albums")
            .select("user_id, item_count, cover_url")
            .eq("id", albumId)
            .single();

        if (albumError || !album) {
            throw new NotFoundException("Album not found");
        }

        if (album.user_id !== userId) {
            throw new ForbiddenException("Not your album");
        }

        // 2. Upload file to R2 CDN
        // Use "albums" folder in storage bucket
        const uploadResult = await this.storage.uploadFile(file, "albums", userId);

        // 3. Save album item metadata
        const { data: item, error: itemError } = await client
            .from("album_items")
            .insert({
                album_id: albumId,
                user_id: userId,
                title: dto.title,
                description: dto.description || null,
                item_type: dto.itemType || "photo",
                original_url: uploadResult.url,
                medium_url: (uploadResult as any).mediumUrl || null,
                thumbnail_url: (uploadResult as any).thumbnailUrl || null,
                file_size_bytes: file.size,
                mime_type: file.mimetype,
            })
            .select("*")
            .single();

        if (itemError) {
            this.logger.error(`Failed to save album item: ${itemError.message}`);
            throw new Error(itemError.message);
        }

        // 4. Update album cover and item count if cover is not set
        const updateData: any = { item_count: (album.item_count || 0) + 1 };
        if (!album.cover_url) {
            updateData.cover_url = uploadResult.url;
        }

        await client.from("albums").update(updateData).eq("id", albumId);

        return item;
    }

    /**
     * Get items inside an album
     */
    async getItems(albumId: string, currentUserId?: string) {
        const client = this.db.getClient();

        // Verify album public/private status first
        const { data: album, error: albumError } = await client
            .from("albums")
            .select("user_id, is_public")
            .eq("id", albumId)
            .single();

        if (albumError || !album) {
            throw new NotFoundException("Album not found");
        }

        if (!album.is_public && album.user_id !== currentUserId) {
            throw new ForbiddenException("This album is private");
        }

        let query = client
            .from("album_items")
            .select("*")
            .eq("album_id", albumId);

        // If not owner, only get public items
        if (album.user_id !== currentUserId) {
            query = query.eq("is_public", true);
        }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    /**
     * Update item publish status
     */
    async updateItem(albumId: string, itemId: string, userId: string, dto: UpdateAlbumItemDto) {
        const client = this.db.getAdminClient();

        // Verify ownership
        const { data: item, error: findError } = await client
            .from("album_items")
            .select("user_id")
            .eq("id", itemId)
            .eq("album_id", albumId)
            .single();

        if (findError || !item) {
            throw new NotFoundException("Album item not found");
        }

        if (item.user_id !== userId) {
            throw new ForbiddenException("Not your album item");
        }

        const { data, error } = await client
            .from("album_items")
            .update({
                is_public: dto.isPublic,
            })
            .eq("id", itemId)
            .select("*")
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Delete album item
     */
    async deleteItem(albumId: string, itemId: string, userId: string) {
        const client = this.db.getAdminClient();

        // Verify ownership
        const { data: item, error: findError } = await client
            .from("album_items")
            .select("user_id")
            .eq("id", itemId)
            .eq("album_id", albumId)
            .single();

        if (findError || !item) {
            throw new NotFoundException("Album item not found");
        }

        if (item.user_id !== userId) {
            throw new ForbiddenException("Not your album item");
        }

        // Delete from DB
        const { error } = await client.from("album_items").delete().eq("id", itemId);
        if (error) throw new Error(error.message);

        // Update album item count
        const { data: album } = await client
            .from("albums")
            .select("item_count")
            .eq("id", albumId)
            .single();

        if (album) {
            const newCount = Math.max((album.item_count || 0) - 1, 0);
            await client.from("albums").update({ item_count: newCount }).eq("id", albumId);
        }

        return { success: true };
    }
}
