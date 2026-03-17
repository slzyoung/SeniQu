import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { ArtsService } from "./arts.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Arts")
@Controller("arts")
export class ArtsController {
    constructor(private readonly artsService: ArtsService) { }

    @Post("mint/:artworkId")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ART_MINT)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Mint Art for artwork" })
    async mint(
        @Param("artworkId") artworkId: string,
        @GetUser("walletAddress") walletAddress: string,
    ) {
        return this.artsService.mintArt(artworkId, walletAddress)
    }

    @Get("artwork/:artworkId")
    @Public()
    @ApiOperation({ summary: "Get Art by artwork ID" })
    async findByArtwork(@Param("artworkId") artworkId: string) {
        return this.artsService.findByArtwork(artworkId)
    }

    @Get("owner/:address")
    @Public()
    @ApiOperation({ summary: "Get Arts by owner wallet" })
    async findByOwner(@Param("address") address: string) {
        return this.artsService.findByOwner(address)
    }

    @Get(":id/history")
    @Public()
    @ApiOperation({ summary: "Get Art ownership history (provenance)" })
    async getHistory(@Param("id") id: string) {
        return this.artsService.getOwnershipHistory(id)
    }

    @Post(":id/transfer")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ART_TRANSFER)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Transfer Art ownership" })
    async transfer(
        @Param("id") artId: string,
        @GetUser("walletAddress") fromAddress: string,
        @Body("toAddress") toAddress: string,
    ) {
        await this.artsService.transferOwnership(artId, fromAddress, toAddress)
        return { message: "Transfer initiated" }
    }
}
