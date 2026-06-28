import { Injectable, Logger } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"

export interface Collection {
    id: string
    name: string
    description: string
    ownerId: string
    coverImageUrl?: string
    isPublic: boolean
    artworkCount: number
    createdAt: Date
}

@Injectable()
export class CollectionsService {
    private readonly logger = new Logger(CollectionsService.name)

    constructor(private readonly db: DatabaseService) { }

    async create(dto: { name: string; description: string; isPublic?: boolean; coverImageUrl?: string }, ownerId: string): Promise<Collection> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("collections")
            .insert({
                name: dto.name,
                description: dto.description,
                owner_id: ownerId,
                is_public: dto.isPublic ?? true,
                cover_image_url: dto.coverImageUrl || null,
            })
            .select()
            .single()

        if (error) throw new Error(error.message)
        return this.mapToCollection(data)
    }

    async findByOwner(ownerId: string): Promise<Collection[]> {
        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("collections")
            .select("*")
            .eq("owner_id", ownerId)

        if (error) throw new Error(error.message)
        return (data || []).map(this.mapToCollection)
    }

    async addArtwork(collectionId: string, artworkId: string): Promise<void> {
        const client = this.db.getAdminClient()

        await client.from("collection_items").insert({
            collection_id: collectionId,
            artwork_id: artworkId,
        })
    }

    async removeArtwork(collectionId: string, artworkId: string): Promise<void> {
        const client = this.db.getAdminClient()

        await client
            .from("collection_items")
            .delete()
            .eq("collection_id", collectionId)
            .eq("artwork_id", artworkId)
    }

    async deleteCollection(collectionId: string, userId: string): Promise<void> {
        const client = this.db.getAdminClient()

        // First remove all items in this collection
        await client
            .from("collection_items")
            .delete()
            .eq("collection_id", collectionId)

        // Then delete the collection itself, verifying owner_id
        const { error } = await client
            .from("collections")
            .delete()
            .eq("id", collectionId)
            .eq("owner_id", userId)

        if (error) {
            throw new Error(`Failed to delete collection: ${error.message}`)
        }
    }

    private mapToCollection(data: any): Collection {
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            ownerId: data.owner_id,
            coverImageUrl: data.cover_image_url,
            isPublic: data.is_public,
            artworkCount: data.artwork_count || 0,
            createdAt: new Date(data.created_at),
        }
    }
}
