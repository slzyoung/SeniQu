import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { StorageService } from "../storage/storage.service"
import {
    CreatePhotoDto,
    UpdatePhotoDto,
    SearchPhotosDto,
    CreatePhotoCollectionDto,
    CreateCommentDto,
    CreatePhotoRequestDto,
    CreatePhotoSubmissionDto,
    PurchasePhotoDto,
} from "./dto/photo.dto"

export interface Photo {
    id: string
    userId: string
    title: string
    description?: string
    originalUrl: string
    mediumUrl?: string
    thumbnailUrl?: string
    watermarkedUrl?: string
    cameraMake?: string
    cameraModel?: string
    lens?: string
    focalLength?: string
    aperture?: string
    shutterSpeed?: string
    iso?: number
    takenAt?: Date
    gpsLat?: number
    gpsLng?: number
    locationName?: string
    category: string
    tags: string[]
    theme: string
    viewsCount: number
    likesCount: number
    commentsCount: number
    downloadsCount: number
    isForSale: boolean
    price?: number
    currency: string
    licenseType: string
    isPublic: boolean
    isFeatured: boolean
    status: string
    width?: number
    height?: number
    fileSizeBytes?: number
    mimeType?: string
    createdAt: Date
    updatedAt: Date
    // Joined fields
    user?: {
        id: string
        displayName: string
        avatar?: string
    }
    isLikedByMe?: boolean
}

@Injectable()
export class PhotosService {
    private readonly logger = new Logger(PhotosService.name)

    constructor(
        private readonly db: DatabaseService,
        private readonly storage: StorageService,
    ) {}

    /**
     * Upload a photo to CDN and index metadata in Supabase
     */
    async uploadPhoto(
        file: Express.Multer.File,
        dto: CreatePhotoDto,
        userId: string,
    ): Promise<Photo> {
        // Upload to R2 CDN via storage service
        const uploadResult = await this.storage.uploadFile(file, "photos", userId)

        // Build record
        const record: Record<string, any> = {
            user_id: userId,
            title: dto.title,
            description: dto.description || null,
            original_url: uploadResult.url,
            medium_url: (uploadResult as any).mediumUrl || null,
            thumbnail_url: (uploadResult as any).thumbnailUrl || null,
            category: dto.category || "general",
            tags: dto.tags || [],
            theme: dto.theme || "general",
            is_for_sale: dto.isForSale || false,
            price: dto.price || null,
            currency: dto.currency || "IDR",
            license_type: dto.licenseType || "personal",
            is_public: dto.isPublic !== false,
            location_name: dto.locationName || null,
            file_size_bytes: file.size,
            mime_type: file.mimetype,
        }

        const client = this.db.getAdminClient()
        const { data, error } = await client
            .from("photos")
            .insert(record)
            .select("*")
            .single()

        if (error) {
            this.logger.error(`Failed to insert photo: ${error.message}`)
            throw new Error(error.message)
        }

        this.logger.log(`📸 Photo uploaded: ${data.id} by user ${userId}`)
        return this.mapToPhoto(data)
    }

    /**
     * Get paginated photo feed with filtering
     */
    async getPhotos(
        params: SearchPhotosDto,
        currentUserId?: string,
    ): Promise<{ data: Photo[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
        const page = params.page || 1
        const limit = Math.min(params.limit || 20, 50)
        const offset = (page - 1) * limit

        const client = this.db.getClient()
        let query = client
            .from("photos")
            .select("*, users:user_id(id, display_name, avatar_url)", { count: "exact" })
            .eq("is_public", true)
            .eq("status", "active")

        // Apply filters
        if (params.category) {
            query = query.eq("category", params.category)
        }
        if (params.theme) {
            query = query.eq("theme", params.theme)
        }
        if (params.tag) {
            query = query.contains("tags", [params.tag])
        }
        if (params.forSaleOnly) {
            query = query.eq("is_for_sale", true)
        }
        if (params.query) {
            query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%,location_name.ilike.%${params.query}%`)
        }
        if (params.userId) {
            query = query.eq("user_id", params.userId)
        }

        // Sorting
        switch (params.sort) {
            case "trending":
                query = query.order("views_count", { ascending: false })
                break
            case "most_liked":
                query = query.order("likes_count", { ascending: false })
                break
            case "price_asc":
                query = query.eq("is_for_sale", true).order("price", { ascending: true })
                break
            case "price_desc":
                query = query.eq("is_for_sale", true).order("price", { ascending: false })
                break
            default:
                query = query.order("created_at", { ascending: false })
        }

        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
            this.logger.error(`Failed to fetch photos: ${error.message}`)
            throw new Error(error.message)
        }

        const total = count || 0
        const photos = (data || []).map((d: any) => this.mapToPhoto(d))

        return {
            data: photos,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        }
    }

    /**
     * Get single photo by ID with view increment
     */
    async getPhotoById(photoId: string, currentUserId?: string): Promise<Photo> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("photos")
            .select("*, users:user_id(id, display_name, avatar_url)")
            .eq("id", photoId)
            .single()

        if (error || !data) {
            throw new NotFoundException("Photo not found")
        }

        // Increment view count
        await this.db.getAdminClient()
            .from("photos")
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq("id", photoId)

        const photo = this.mapToPhoto(data)

        // Check if current user liked this photo
        if (currentUserId) {
            const { data: likeData } = await client
                .from("photo_likes")
                .select("id")
                .eq("user_id", currentUserId)
                .eq("photo_id", photoId)
                .single()

            photo.isLikedByMe = !!likeData
        }

        return photo
    }

    /**
     * Toggle like on a photo
     */
    async toggleLike(photoId: string, userId: string): Promise<{ liked: boolean; count: number }> {
        const client = this.db.getAdminClient()

        // Check existing like
        const { data: existing } = await client
            .from("photo_likes")
            .select("id")
            .eq("user_id", userId)
            .eq("photo_id", photoId)
            .single()

        if (existing) {
            // Unlike
            await client.from("photo_likes").delete().eq("id", existing.id)
        } else {
            // Like
            await client.from("photo_likes").insert({ user_id: userId, photo_id: photoId })
        }

        // Get updated count
        const { data: photo } = await client
            .from("photos")
            .select("likes_count")
            .eq("id", photoId)
            .single()

        return {
            liked: !existing,
            count: photo?.likes_count || 0,
        }
    }

    /**
     * Get comments for a photo (threaded)
     */
    async getComments(photoId: string): Promise<any[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("photo_comments")
            .select("*, users:user_id(id, display_name, avatar_url)")
            .eq("photo_id", photoId)
            .order("created_at", { ascending: true })

        if (error) {
            this.logger.error(`Failed to fetch comments: ${error.message}`)
            return []
        }

        return (data || []).map((c: any) => ({
            id: c.id,
            userId: c.user_id,
            photoId: c.photo_id,
            parentId: c.parent_id,
            content: c.content,
            isEdited: c.is_edited,
            createdAt: c.created_at,
            user: c.users ? {
                id: c.users.id,
                displayName: c.users.display_name,
                avatar: c.users.avatar_url,
            } : undefined,
        }))
    }

    /**
     * Add a comment to a photo
     */
    async addComment(photoId: string, userId: string, dto: CreateCommentDto): Promise<any> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("photo_comments")
            .insert({
                user_id: userId,
                photo_id: photoId,
                parent_id: dto.parentId || null,
                content: dto.content,
            })
            .select("*, users:user_id(id, display_name, avatar_url)")
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return {
            id: data.id,
            userId: data.user_id,
            photoId: data.photo_id,
            parentId: data.parent_id,
            content: data.content,
            createdAt: data.created_at,
            user: data.users ? {
                id: data.users.id,
                displayName: data.users.display_name,
                avatar: data.users.avatar_url,
            } : undefined,
        }
    }

    /**
     * Update a photo
     */
    async updatePhoto(photoId: string, userId: string, dto: UpdatePhotoDto): Promise<Photo> {
        const client = this.db.getAdminClient()

        // Verify ownership
        const { data: existing } = await client
            .from("photos")
            .select("user_id")
            .eq("id", photoId)
            .single()

        if (!existing) throw new NotFoundException("Photo not found")
        if (existing.user_id !== userId) throw new ForbiddenException("Not your photo")

        const updates: Record<string, any> = {}
        if (dto.title) updates.title = dto.title
        if (dto.description !== undefined) updates.description = dto.description
        if (dto.category) updates.category = dto.category
        if (dto.theme) updates.theme = dto.theme
        if (dto.tags) updates.tags = dto.tags
        if (dto.isForSale !== undefined) updates.is_for_sale = dto.isForSale
        if (dto.price !== undefined) updates.price = dto.price
        if (dto.licenseType) updates.license_type = dto.licenseType
        if (dto.isPublic !== undefined) updates.is_public = dto.isPublic
        updates.updated_at = new Date().toISOString()

        const { data, error } = await client
            .from("photos")
            .update(updates)
            .eq("id", photoId)
            .select("*")
            .single()

        if (error) throw new Error(error.message)
        return this.mapToPhoto(data)
    }

    /**
     * Delete a photo
     */
    async deletePhoto(photoId: string, userId: string): Promise<void> {
        const client = this.db.getAdminClient()

        const { data: existing } = await client
            .from("photos")
            .select("user_id, original_url")
            .eq("id", photoId)
            .single()

        if (!existing) throw new NotFoundException("Photo not found")
        if (existing.user_id !== userId) throw new ForbiddenException("Not your photo")

        await client.from("photos").delete().eq("id", photoId)
        this.logger.log(`🗑️ Photo ${photoId} deleted by ${userId}`)
    }

    /**
     * Get marketplace photos (for sale)
     */
    async getMarketplacePhotos(params: SearchPhotosDto): Promise<any> {
        return this.getPhotos({ ...params, forSaleOnly: true })
    }

    /**
     * Get user's own photos
     */
    async getMyPhotos(userId: string, page = 1, limit = 20): Promise<any> {
        const offset = (page - 1) * limit
        const client = this.db.getClient()

        const { data, error, count } = await client
            .from("photos")
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw new Error(error.message)

        return {
            data: (data || []).map(this.mapToPhoto),
            meta: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
        }
    }

    /**
     * Create a photo collection/album
     */
    async createCollection(userId: string, dto: CreatePhotoCollectionDto): Promise<any> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("photo_collections")
            .insert({
                user_id: userId,
                title: dto.title,
                description: dto.description || null,
                theme: dto.theme || "custom",
                is_public: dto.isPublic !== false,
                cover_photo_id: dto.coverPhotoId || null,
            })
            .select("*")
            .single()

        if (error) throw new Error(error.message)
        return data
    }

    /**
     * Get collections
     */
    async getCollections(userId?: string): Promise<any[]> {
        const client = this.db.getClient()
        let query = client.from("photo_collections").select("*, cover_photo:cover_photo_id(id, thumbnail_url)")

        if (userId) {
            query = query.eq("user_id", userId)
        } else {
            query = query.eq("is_public", true)
        }

        const { data, error } = await query.order("created_at", { ascending: false })

        if (error) throw new Error(error.message)
        return data || []
    }

    /**
     * Get photos in a collection
     */
    async getCollectionPhotos(collectionId: string, viewerId?: string): Promise<any[]> {
        const client = this.db.getClient()
        const { data, error } = await client
            .from("photo_collection_items")
            .select(`
                photo:photo_id(
                    *,
                    user_id,
                    is_public
                )
            `)
            .eq("collection_id", collectionId)

        if (error) throw new Error(error.message)
        const photos = (data || []).map(item => item.photo as any).filter(Boolean)
        return photos.filter((p: any) => p.is_public || p.user_id === viewerId)
    }

    /**
     * Add photo to collection
     */
    async addPhotoToCollection(collectionId: string, photoId: string, userId: string): Promise<void> {
        const client = this.db.getAdminClient()

        // Verify ownership of collection
        const { data: col } = await client
            .from("photo_collections")
            .select("user_id, photo_count, cover_photo_id")
            .eq("id", collectionId)
            .single()

        if (!col || col.user_id !== userId) throw new ForbiddenException("Not your collection")

        await client.from("photo_collection_items").insert({
            collection_id: collectionId,
            photo_id: photoId,
        })

        // Update count and set cover_photo_id if not present
        const updateData: any = { photo_count: (col.photo_count || 0) + 1 }
        if (!col.cover_photo_id) {
            updateData.cover_photo_id = photoId
        }

        await client.from("photo_collections")
            .update(updateData)
            .eq("id", collectionId)
    }

    /**
     * Delete a photo collection
     */
    async deleteCollection(collectionId: string, userId: string): Promise<void> {
        const client = this.db.getAdminClient()

        // Verify ownership first
        const { data: col } = await client
            .from("photo_collections")
            .select("user_id")
            .eq("id", collectionId)
            .single()

        if (!col) throw new NotFoundException("Photo collection not found")
        if (col.user_id !== userId) throw new ForbiddenException("Not your collection")

        // Delete photo collection items first
        await client
            .from("photo_collection_items")
            .delete()
            .eq("collection_id", collectionId)

        // Delete the collection itself
        await client
            .from("photo_collections")
            .delete()
            .eq("id", collectionId)
    }

    // ─── Photography Request/Commission System ─────

    async createRequest(userId: string, dto: CreatePhotoRequestDto) {
        const client = this.db.getAdminClient()
        const { data, error } = await client
            .from("photo_requests")
            .insert({
                user_id: userId,
                title: dto.title,
                description: dto.description,
                budget: dto.budget || null,
                currency: dto.currency || "IDR",
                deadline: dto.deadline ? new Date(dto.deadline) : null,
            })
            .select("*, users:user_id(id, display_name, avatar_url)")
            .single()

        if (error) {
            this.logger.error(`Failed to create request: ${error.message}`)
            throw new Error(error.message)
        }

        return data
    }

    async getRequests() {
        const client = this.db.getClient()
        const { data, error } = await client
            .from("photo_requests")
            .select("*, users:user_id(id, display_name, avatar_url)")
            .order("created_at", { ascending: false })

        if (error) {
            this.logger.error(`Failed to fetch requests: ${error.message}`)
            throw new Error(error.message)
        }

        return data
    }

    async createSubmission(requestId: string, userId: string, dto: CreatePhotoSubmissionDto) {
        const client = this.db.getAdminClient()
        const { data, error } = await client
            .from("photo_request_submissions")
            .insert({
                request_id: requestId,
                user_id: userId,
                photo_id: dto.photoId || null,
                message: dto.message || null,
                price: dto.price || null,
            })
            .select("*, users:user_id(id, display_name, avatar_url)")
            .single()

        if (error) {
            this.logger.error(`Failed to submit request response: ${error.message}`)
            throw new Error(error.message)
        }

        return data
    }

    async getSubmissionsForRequest(requestId: string, userId: string) {
        const client = this.db.getAdminClient()
        
        // Fetch request details to check owner
        const { data: request } = await client
            .from("photo_requests")
            .select("user_id")
            .eq("id", requestId)
            .single()

        if (!request) {
            throw new NotFoundException("Request not found")
        }

        const isOwner = request.user_id === userId

        let query = client
            .from("photo_request_submissions")
            .select("*, users:user_id(id, display_name, avatar_url), photos(*)")
            .eq("request_id", requestId)

        // If not the owner of the request, they can only view their own submission
        if (!isOwner) {
            query = query.eq("user_id", userId)
        }

        const { data, error } = await query

        if (error) {
            this.logger.error(`Failed to fetch submissions: ${error.message}`)
            throw new Error(error.message)
        }

        return data
    }

    async getPhotographerStats(userId: string) {
        const client = this.db.getAdminClient()
        
        // Fetch user display info
        const { data: user, error: userErr } = await client
            .from("users")
            .select("display_name, avatar_url")
            .eq("id", userId)
            .single()

        if (userErr || !user) {
            throw new NotFoundException("Photographer not found")
        }

        // Count photos
        const { count: photosCount } = await client
            .from("photos")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_public", true)
            .eq("status", "active")

        // Count collections (albums)
        const { count: collectionsCount } = await client
            .from("albums")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_public", true)

        // Sum likes received on all their photos
        const { data: photos } = await client
            .from("photos")
            .select("likes_count")
            .eq("user_id", userId)

        const likesReceived = (photos || []).reduce((sum, p) => sum + (p.likes_count || 0), 0)

        // Sum Solana earnings from sales
        const { data: purchases } = await client
            .from("photo_purchases")
            .select("amount")
            .eq("seller_id", userId)
            .eq("status", "completed")
            .eq("currency", "SOL")

        const solEarnings = (purchases || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

        return {
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            photosCount: photosCount || 0,
            collectionsCount: collectionsCount || 0,
            likesReceived,
            solEarnings
        }

    }

    /**
     * Purchase a photo (creates a transaction entry in photo_purchases)
     */
    async purchasePhoto(
        photoId: string,
        buyerId: string,
        dto: PurchasePhotoDto
    ): Promise<any> {
        const client = this.db.getAdminClient()

        // 1. Fetch photo to get seller & price info
        const { data: photo, error: photoErr } = await client
            .from("photos")
            .select("*")
            .eq("id", photoId)
            .single()

        if (photoErr || !photo) {
            throw new NotFoundException("Photo not found")
        }

        if (!photo.is_for_sale) {
            throw new ForbiddenException("This photo is not for sale")
        }

        if (photo.user_id === buyerId) {
            throw new ForbiddenException("You cannot purchase your own photo")
        }

        // 2. Insert purchase record
        const purchaseRecord = {
            buyer_id: buyerId,
            photo_id: photoId,
            seller_id: photo.user_id,
            amount: photo.price || 0,
            currency: photo.currency || "IDR",
            license_type: dto.licenseType || photo.license_type || "personal",
            status: "completed",
            transaction_ref: dto.transactionRef
        }

        const { data: purchase, error: purchaseErr } = await client
            .from("photo_purchases")
            .insert(purchaseRecord)
            .select("*")
            .single()

        if (purchaseErr) {
            this.logger.error(`Failed to record photo purchase: ${purchaseErr.message}`)
            throw new Error(purchaseErr.message)
        }

        // 3. Increment download/purchase count
        await client
            .from("photos")
            .update({ downloads_count: (photo.downloads_count || 0) + 1 })
            .eq("id", photoId)

        this.logger.log(`💰 Photo ${photoId} purchased by buyer ${buyerId}. Transaction ref: ${dto.transactionRef}`)

        return purchase
    }

    // ─── Photo Offers ────────────────────────────────
    async createOffer(photoId: string, userId: string, dto: any): Promise<any> {
        const client = this.db.getClient()
        
        // Check if photo exists
        const { data: photo, error: photoErr } = await client
            .from("photos")
            .select("*")
            .eq("id", photoId)
            .single()

        if (photoErr || !photo) {
            throw new Error("Photo not found")
        }

        // Create offer
        const { data: offer, error: offerErr } = await client
            .from("photo_offers")
            .insert({
                photo_id: photoId,
                buyer_id: userId,
                amount: dto.amount,
                currency: dto.currency || "SOL",
                status: "pending"
            })
            .select("*, users:buyer_id(id, display_name, avatar_url)")
            .single()

        if (offerErr) {
            this.logger.error(`Failed to create offer: ${offerErr.message}`)
            throw new Error(offerErr.message)
        }

        return offer
    }

    async getOffersForPhoto(photoId: string, userId: string): Promise<any[]> {
        const client = this.db.getClient()

        // Get photo to check ownership
        const { data: photo } = await client
            .from("photos")
            .select("user_id")
            .eq("id", photoId)
            .single()

        const isOwner = photo?.user_id === userId

        let query = client
            .from("photo_offers")
            .select("*, users:buyer_id(id, display_name, avatar_url)")
            .eq("photo_id", photoId)
            .order("created_at", { ascending: false })

        // If not the owner, only show the user's own offers
        if (!isOwner) {
            query = query.eq("buyer_id", userId)
        }

        const { data: offers, error } = await query
        if (error) {
            throw new Error(error.message)
        }

        return offers || []
    }

    async updateOfferStatus(offerId: string, userId: string, dto: any): Promise<any> {
        const client = this.db.getClient()

        // Fetch offer and photo ownership
        const { data: offer, error: offerErr } = await client
            .from("photo_offers")
            .select("*, photos:photo_id(*)")
            .eq("id", offerId)
            .single()

        if (offerErr || !offer) {
            throw new Error("Offer not found")
        }

        const isBuyer = offer.buyer_id === userId
        const isSeller = offer.photos.user_id === userId

        if (dto.status === "cancelled" && !isBuyer) {
            throw new Error("Only the buyer can cancel their offer")
        }

        if ((dto.status === "accepted" || dto.status === "rejected") && !isSeller) {
            throw new Error("Only the seller can accept or reject this offer")
        }

        // Update the offer status
        const { data: updatedOffer, error: updateErr } = await client
            .from("photo_offers")
            .update({ status: dto.status, updated_at: new Date() })
            .eq("id", offerId)
            .select("*, users:buyer_id(id, display_name, avatar_url)")
            .single()

        if (updateErr) {
            throw new Error(updateErr.message)
        }

        // If accepted, reject all other pending offers for this photo and create purchase record
        if (dto.status === "accepted") {
            await client
                .from("photo_offers")
                .update({ status: "rejected", updated_at: new Date() })
                .eq("photo_id", offer.photo_id)
                .neq("id", offerId)
                .eq("status", "pending")

            // Create a purchase record
            const purchaseRecord = {
                buyer_id: offer.buyer_id,
                photo_id: offer.photo_id,
                seller_id: offer.photos.user_id,
                amount: offer.amount,
                currency: offer.currency || "SOL",
                license_type: offer.license_type || offer.photos.license_type || "personal",
                status: "completed",
                transaction_ref: `OFFER_ACCEPT_${offer.id}_${Date.now()}`
            }
            await client.from("photo_purchases").insert(purchaseRecord)

            // Increment download/purchase count on photos
            await client
                .from("photos")
                .update({ downloads_count: (offer.photos.downloads_count || 0) + 1 })
                .eq("id", offer.photo_id)
        }

        return updatedOffer

    }

    // ─── Mapping Helper ──────────────────────────────
    private mapToPhoto(data: any): Photo {
        return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            originalUrl: data.original_url,
            mediumUrl: data.medium_url,
            thumbnailUrl: data.thumbnail_url,
            watermarkedUrl: data.watermarked_url,
            cameraMake: data.camera_make,
            cameraModel: data.camera_model,
            lens: data.lens,
            focalLength: data.focal_length,
            aperture: data.aperture,
            shutterSpeed: data.shutter_speed,
            iso: data.iso,
            takenAt: data.taken_at ? new Date(data.taken_at) : undefined,
            gpsLat: data.gps_lat,
            gpsLng: data.gps_lng,
            locationName: data.location_name,
            category: data.category,
            tags: data.tags || [],
            theme: data.theme,
            viewsCount: data.views_count || 0,
            likesCount: data.likes_count || 0,
            commentsCount: data.comments_count || 0,
            downloadsCount: data.downloads_count || 0,
            isForSale: data.is_for_sale || false,
            price: data.price,
            currency: data.currency || "IDR",
            licenseType: data.license_type || "personal",
            isPublic: data.is_public,
            isFeatured: data.is_featured || false,
            status: data.status,
            width: data.width,
            height: data.height,
            fileSizeBytes: data.file_size_bytes,
            mimeType: data.mime_type,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            user: data.users ? {
                id: data.users.id,
                displayName: data.users.display_name,
                avatar: data.users.avatar_url,
            } : undefined,
        }
    }
}
