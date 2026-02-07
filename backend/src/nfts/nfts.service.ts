import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { DatabaseService } from "../database/database.service"
import { Connection, PublicKey } from "@solana/web3.js"

export interface NftMetadata {
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
export class NftsService {
    private readonly logger = new Logger(NftsService.name)
    private readonly connection: Connection

    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
    ) {
        const rpcUrl = this.configService.get<string>("solana.rpcUrl") || "https://api.devnet.solana.com"
        this.connection = new Connection(rpcUrl)
    }

    async mintNft(artworkId: string, creatorAddress: string): Promise<NftMetadata> {
        // TODO: Implement actual Solana NFT minting using Metaplex
        // This is a placeholder for the minting flow

        const client = this.db.getAdminClient()

        const { data, error } = await client
            .from("nft_metadata")
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

        return this.mapToNftMetadata(data)
    }

    async findByArtwork(artworkId: string): Promise<NftMetadata | null> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("nft_metadata")
            .select("*")
            .eq("artwork_id", artworkId)
            .single()

        if (error || !data) {
            return null
        }

        return this.mapToNftMetadata(data)
    }

    async findByOwner(ownerAddress: string): Promise<NftMetadata[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("nft_metadata")
            .select("*")
            .eq("owner_address", ownerAddress)

        if (error) {
            throw new Error(error.message)
        }

        return (data || []).map(this.mapToNftMetadata)
    }

    async transferOwnership(
        nftId: string,
        fromAddress: string,
        toAddress: string,
    ): Promise<void> {
        const client = this.db.getAdminClient()

        // Record transfer in history
        await client.from("ownership_history").insert({
            nft_id: nftId,
            from_address: fromAddress,
            to_address: toAddress,
            transferred_at: new Date().toISOString(),
        })

        // Update current owner
        await client
            .from("nft_metadata")
            .update({ owner_address: toAddress })
            .eq("id", nftId)
    }

    async getOwnershipHistory(nftId: string): Promise<any[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("ownership_history")
            .select("*")
            .eq("nft_id", nftId)
            .order("transferred_at", { ascending: false })

        if (error) {
            throw new Error(error.message)
        }

        return data || []
    }

    private mapToNftMetadata(data: any): NftMetadata {
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
