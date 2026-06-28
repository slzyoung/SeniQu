import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { CollectionsService } from "./collections.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Collections")
@Controller("collections")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class CollectionsController {
    constructor(private readonly collectionsService: CollectionsService) { }

    @Post()
    @ApiOperation({ summary: "Create collection" })
    async create(
        @Body() dto: { name: string; description: string; isPublic?: boolean; coverImageUrl?: string },
        @GetUser("id") ownerId: string
    ) {
        return this.collectionsService.create(dto, ownerId)
    }

    @Get("user/:userId")
    @Public()
    @ApiOperation({ summary: "Get public collections by user ID" })
    async findByUser(@Param("userId") userId: string) {
        return this.collectionsService.findByOwner(userId)
    }

    @Get("me")
    @ApiOperation({ summary: "Get my collections" })
    async findMine(@GetUser("id") ownerId: string) {
        return this.collectionsService.findByOwner(ownerId)
    }

    @Post(":id/artworks/:artworkId")
    @ApiOperation({ summary: "Add artwork to collection" })
    async addArtwork(@Param("id") collectionId: string, @Param("artworkId") artworkId: string) {
        await this.collectionsService.addArtwork(collectionId, artworkId)
        return { message: "Artwork added to collection" }
    }

    @Delete(":id/artworks/:artworkId")
    @ApiOperation({ summary: "Remove artwork from collection" })
    async removeArtwork(@Param("id") collectionId: string, @Param("artworkId") artworkId: string) {
        await this.collectionsService.removeArtwork(collectionId, artworkId)
        return { message: "Artwork removed from collection" }
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete collection" })
    async deleteCollection(@Param("id") collectionId: string, @GetUser("id") userId: string) {
        await this.collectionsService.deleteCollection(collectionId, userId)
        return { message: "Collection deleted successfully" }
    }
}
