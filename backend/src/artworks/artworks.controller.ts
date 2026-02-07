import {
    Controller, Get, Post, Put, Param, Body, Query, UseGuards
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { ArtworksService } from "./artworks.service"
import { CreateArtworkDto } from "./dto/create-artwork.dto"
import { UpdateArtworkDto } from "./dto/update-artwork.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Artworks")
@Controller("artworks")
export class ArtworksController {
    constructor(private readonly artworksService: ArtworksService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: "Get all published artworks" })
    async findAll(
        @Query("page") page = 1,
        @Query("limit") limit = 20,
        @Query("category") category?: string,
        @Query("region") region?: string,
    ) {
        return this.artworksService.findAll({
            page, limit, category, region, status: "published"
        })
    }

    @Get(":id")
    @Public()
    @ApiOperation({ summary: "Get artwork by ID" })
    async findOne(@Param("id") id: string) {
        return this.artworksService.findById(id)
    }

    @Post()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ARTWORK_CREATE)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Create new artwork" })
    async create(@Body() dto: CreateArtworkDto, @GetUser("id") artistId: string) {
        return this.artworksService.create(dto, artistId)
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ARTWORK_UPDATE)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Update artwork" })
    async update(@Param("id") id: string, @Body() dto: UpdateArtworkDto) {
        return this.artworksService.update(id, dto)
    }

    @Post(":id/verify")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ARTWORK_VERIFY)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Verify artwork (admin/institution)" })
    async verify(@Param("id") id: string, @GetUser("id") verifierId: string) {
        return this.artworksService.verify(id, verifierId)
    }

    @Post(":id/publish")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ARTWORK_PUBLISH)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Publish artwork" })
    async publish(@Param("id") id: string) {
        return this.artworksService.publish(id)
    }
}
