import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { DatabaseService } from "../database/database.service"
import { Connection, PublicKey } from "@solana/web3.js"

export interface ArtMetadata {
    id: string
    artworkId: string
    mintAddress: string
    ownerAddress: string
    tokenStandard: "NFT" | "CNFT"
    metadataUri: string
    royaltyBps: number
    createdAt: Date
}

@Injectable()
export class ArtsService {
    private readonly logger = new Logger(ArtsService.name)
    private readonly connection: Connection

    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
    ) {
        const rpcUrl = this.configService.get<string>("solana.rpcUrl") || "https://api.devnet.solana.com"
        this.connection = new Connection(rpcUrl)
    }

    async mintArt(artworkId: string, creatorAddress: string): Promise<ArtMetadata> {
        // TODO: Implement actual Solana Art minting using Metaplex
        // This is a placeholder for the minting flow

        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("arts")
            .insert({
                artwork_id: artworkId,
                owner_address: creatorAddress,
                token_standard: "NFT",
                royalty_bps: 500, // 5%
                status: "PENDING",
            })
            .select()
            .single()

        if (error) {
            throw new Error(error.message)
        }

        return this.mapToArtMetadata(data)
    }

    async findByArtwork(artworkId: string): Promise<ArtMetadata | null> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("arts")
            .select("*")
            .eq("artwork_id", artworkId)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToArtMetadata(data)
    }

    async findByOwner(ownerAddress: string): Promise<ArtMetadata[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("arts")
            .select("*")
            .eq("owner_address", ownerAddress)

        if (error) {
            throw new Error(error.message)
        }

        return (data || []).map(this.mapToArtMetadata)
    }

    async transferOwnership(
        artId: string,
        fromAddress: string,
        toAddress: string,
    ): Promise<void> {
        const client = this.db.getAdminClient()

        // Record transfer in history
        await client.from("ownership_history").insert({
            art_id: artId,
            from_address: fromAddress,
            to_address: toAddress,
            transferred_at: new Date().toISOString(),
        })

        // Update current owner
        await client
            .from("arts")
            .update({ owner_address: toAddress })
            .eq("id", artId)
    }

    async getOwnershipHistory(artId: string): Promise<any[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("ownership_history")
            .select("*")
            .eq("art_id", artId)
            .order("transferred_at", { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        return data || []
    }

    private mapToArtMetadata(data: any): ArtMetadata {
        return {
            id: data.id,
            artworkId: data.artwork_id,
            mintAddress: data.mint_address,
            ownerAddress: data.owner_address,
            tokenStandard: data.token_standard,
            metadataUri: data.metadata_uri,
            royaltyBps: data.royalty_bps,
            createdAt: new Date(data.created_at),
        }
    }
}
