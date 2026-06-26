import { Injectable, NotFoundException, Logger } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { CreateArtworkDto } from "./dto/create-artwork.dto"
import { UpdateArtworkDto } from "./dto/update-artwork.dto"

export interface Artwork {
    id: string
    title: string
    slug?: string
    description: string
    artistId: string
    institutionId?: string
    category: string
    region: string
    era?: string
    medium?: string
    dimensions?: string
    genres?: string[]
    style?: string
    period?: string
    yearCreated?: number
    primaryImageUrl: string
    images?: string
    thumbnailUrl?: string
    arMarkerUrl?: string
    audioGuideUrl?: string
    videoPreviewUrl?: string
    aiProcessedUrl?: string
    status: "draft" | "pending_review" | "published" | "archived" | "rejected"
    isForSale?: boolean
    price?: number
    currency?: string
    isVerified: boolean
    isArt: boolean
    artworkType?: string
    poaCertificate?: any
    verifiedBy?: string
    verifiedAt?: Date
    views: number
    likes: number
    createdAt: Date
    updatedAt: Date
    artist?: {
        id: string
        displayName: string
        avatarUrl?: string
    }
}

@Injectable()
export class ArtworksService {
    private readonly logger = new Logger(ArtworksService.name)

    constructor(private readonly db: DatabaseService) { }

    async create(dto: CreateArtworkDto, artistId: string): Promise<Artwork> {
        const client = this.db.getAdminClient()

        const imagesJson = {
            artwork_type: dto.artworkType || 'physical',
            poa_certificate: dto.poaCertificate || null,
            additional_images: []
        }

        const { data, error } = await client
            .from("artworks")
            .insert({
                title: dto.title,
                description: dto.description,
                artist_id: artistId,
                category: dto.category,
                region: dto.region,
                era: dto.era,
                medium: dto.medium,
                dimensions: dto.dimensions,
                primary_image_url: dto.imageUrl,
                status: "draft",
                is_verified: false,
                price: dto.price || 0,
                is_for_sale: dto.isForSale ?? false,
                images: JSON.stringify(imagesJson),
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create artwork: ${error.message}`)
            throw new Error(error.message)
        }

        return this.mapToArtwork(data)
    }

    async recordTransaction(userId: string, body: any) {
        const client = this.db.getAdminClient()
        const { data, error } = await client
            .from("marketplace_transactions")
            .insert({
                user_id: userId,
                seller_id: body.sellerId || null,
                artwork_id: body.artworkId || null,
                artwork_title: body.artworkTitle,
                artwork_image: body.artworkImage || null,
                amount: body.amount,
                currency: body.currency || "SOL",
                status: body.status || "completed",
                tx_hash: body.txHash,
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to record transaction: ${error.message}`)
            throw new Error(error.message)
        }

        // If transaction is completed, update the artwork's is_for_sale status to false
        if (body.artworkId && (body.status === "completed" || !body.status)) {
            await client
                .from("artworks")
                .update({ is_for_sale: false })
                .eq("id", body.artworkId)
        }

        return data
    }

    async getTransactionHistory(userId: string) {
        const client = this.db.getAdminClient()
        const { data, error } = await client
            .from("marketplace_transactions")
            .select("*")
            .or(`user_id.eq.${userId},seller_id.eq.${userId}`)
            .order("created_at", { ascending: false })

        if (error) {
            this.logger.error(`Failed to fetch transactions: ${error.message}`)
            throw new Error(error.message)
        }

        return data || []
    }

    async findById(id: string): Promise<Artwork | null> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("artworks")
            .select("*")
            .eq("id", id)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToArtwork(data)
    }

    async findAll(options: {
        page?: number
        limit?: number
        category?: string
        region?: string
        status?: string
    }): Promise<{ artworks: Artwork[]; total: number }> {
        const { page = 1, limit = 20, category, region, status } = options
        const client = this.db.getAdminClient()
        const offset = (page - 1) * limit

        let query = client.from("artworks").select("*, artist:users!artist_id(id, display_name, avatar_url)", { count: "exact" })

        if (category) query = query.eq("category", category)
        if (region) query = query.eq("region", region)
        if (status) {
            query = query.eq("status", status)
        } else {
            // By default, show all non-draft artworks (published, pending_review, etc.)
            query = query.neq("status", "draft")
        }

        const { data, error, count } = await query
            .range(offset, offset + limit - 1)
            .order("created_at", { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        return {
            artworks: (data || []).map(this.mapToArtwork),
            total: count || 0,
        }
    }

    async update(id: string, dto: UpdateArtworkDto): Promise<Artwork> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("artworks")
            .update({
                title: dto.title,
                description: dto.description,
                category: dto.category,
                region: dto.region,
                era: dto.era,
                medium: dto.medium,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return this.mapToArtwork(data)
    }

    async verify(id: string, verifierId: string): Promise<Artwork> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("artworks")
            .update({
                is_verified: true,
                verified_by: verifierId,
                verified_at: new Date().toISOString(),
                status: "published",
            })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return this.mapToArtwork(data)
    }

    async publish(id: string): Promise<Artwork> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("artworks")
            .update({ status: "published" })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return this.mapToArtwork(data)
    }

    private mapToArtwork(data: any): Artwork {
        let parsedImages: string | undefined = undefined;
        let thumbnailUrl = data.thumbnail_url || undefined;
        let arMarkerUrl = undefined;
        let audioGuideUrl = undefined;
        let videoPreviewUrl = undefined;
        let aiProcessedUrl = undefined;
        let artworkType = 'physical';
        let poaCertificate = null;

        if (data.images) {
            try {
                const imgData = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
                if (imgData && typeof imgData === 'object' && !Array.isArray(imgData)) {
                    thumbnailUrl = imgData.thumbnail_url || thumbnailUrl;
                    arMarkerUrl = imgData.ar_marker_url;
                    audioGuideUrl = imgData.audio_guide_url;
                    videoPreviewUrl = imgData.video_preview_url;
                    aiProcessedUrl = imgData.ai_processed_url;
                    artworkType = imgData.artwork_type || artworkType;
                    poaCertificate = imgData.poa_certificate || poaCertificate;
                    parsedImages = imgData.additional_images ? JSON.stringify(imgData.additional_images) : undefined;
                } else {
                    parsedImages = typeof data.images === 'string' ? data.images : JSON.stringify(data.images);
                }
            } catch (e) {
                parsedImages = typeof data.images === 'string' ? data.images : JSON.stringify(data.images);
            }
        }

        return {
            id: data.id,
            title: data.title,
            slug: data.slug,
            description: data.description,
            artistId: data.artist_id,
            institutionId: data.institution_id,
            category: data.category,
            region: data.region,
            era: data.era,
            medium: data.medium,
            dimensions: data.dimensions,
            genres: data.genres,
            style: data.style,
            period: data.period,
            yearCreated: data.year_created,
            primaryImageUrl: data.primary_image_url,
            images: parsedImages,
            thumbnailUrl,
            arMarkerUrl,
            audioGuideUrl,
            videoPreviewUrl,
            aiProcessedUrl,
            status: data.status,
            isForSale: data.is_for_sale,
            price: data.price,
            currency: data.currency,
            isVerified: data.is_verified,
            isArt: data.is_art,
            artworkType,
            poaCertificate,
            verifiedBy: data.verified_by,
            verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
            views: data.views || 0,
            likes: data.likes || 0,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            // Include artist data from JOIN if available
            ...(data.artist && {
                artist: {
                    id: data.artist.id,
                    displayName: data.artist.display_name,
                    avatarUrl: data.artist.avatar_url,
                }
            }),
        }
    }
}
