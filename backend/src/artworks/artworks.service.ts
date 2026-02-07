import { Injectable, NotFoundException, Logger } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { CreateArtworkDto } from "./dto/create-artwork.dto"
import { UpdateArtworkDto } from "./dto/update-artwork.dto"

export interface Artwork {
    id: string
    title: string
    description: string
    artistId: string
    category: string
    region: string
    era?: string
    medium?: string
    dimensions?: string
    imageUrl: string
    thumbnailUrl?: string
    status: "draft" | "pending_review" | "published" | "archived" | "rejected"
    isVerified: boolean
    verifiedBy?: string
    verifiedAt?: Date
    createdAt: Date
    updatedAt: Date
}

@Injectable()
export class ArtworksService {
    private readonly logger = new Logger(ArtworksService.name)

    constructor(private readonly db: DatabaseService) { }

    async create(dto: CreateArtworkDto, artistId: string): Promise<Artwork> {
        const client = this.db.getAdminClient()

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
                image_url: dto.imageUrl,
                status: "draft",
                is_verified: false,
            })
            .select()
            .single()

        if (error) {
            this.logger.error(`Failed to create artwork: ${error.message}`)
            throw new Error(error.message)
        }

        return this.mapToArtwork(data)
    }

    async findById(id: string): Promise<Artwork | null> {
        const client = this.db.getClient()

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
        const client = this.db.getClient()
        const offset = (page - 1) * limit

        let query = client.from("artworks").select("*", { count: "exact" })

        if (category) query = query.eq("category", category)
        if (region) query = query.eq("region", region)
        if (status) query = query.eq("status", status)

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
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            artistId: data.artist_id,
            category: data.category,
            region: data.region,
            era: data.era,
            medium: data.medium,
            dimensions: data.dimensions,
            imageUrl: data.image_url,
            thumbnailUrl: data.thumbnail_url,
            status: data.status,
            isVerified: data.is_verified,
            verifiedBy: data.verified_by,
            verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        }
    }
}
