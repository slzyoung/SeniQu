import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { NftsService } from "./nfts.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("NFTs")
@Controller("nfts")
export class NftsController {
    constructor(private readonly nftsService: NftsService) { }

    @Post("mint/:artworkId")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.NFT_MINT)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Mint NFT for artwork" })
    async mint(
        @Param("artworkId") artworkId: string,
        @GetUser("walletAddress") walletAddress: string,
    ) {
        return this.nftsService.mintNft(artworkId, walletAddress)
    }

    @Get("artwork/:artworkId")
    @Public()
    @ApiOperation({ summary: "Get NFT by artwork ID" })
    async findByArtwork(@Param("artworkId") artworkId: string) {
        return this.nftsService.findByArtwork(artworkId)
    }

    @Get("owner/:address")
    @Public()
    @ApiOperation({ summary: "Get NFTs by owner wallet" })
    async findByOwner(@Param("address") address: string) {
        return this.nftsService.findByOwner(address)
    }

    @Get(":id/history")
    @Public()
    @ApiOperation({ summary: "Get NFT ownership history (provenance)" })
    async getHistory(@Param("id") id: string) {
        return this.nftsService.getOwnershipHistory(id)
    }

    @Post(":id/transfer")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.NFT_TRANSFER)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Transfer NFT ownership" })
    async transfer(
        @Param("id") nftId: string,
        @GetUser("walletAddress") fromAddress: string,
        @Body("toAddress") toAddress: string,
    ) {
        await this.nftsService.transferOwnership(nftId, fromAddress, toAddress)
        return { message: "Transfer initiated" }
    }
}
