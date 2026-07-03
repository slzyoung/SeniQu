import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
    BadRequestException,
    Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from "@nestjs/swagger";
import { AlbumsService } from "./albums.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { BypassSecurity } from "../common/decorators/bypass-security.decorator";
import { CreateAlbumDto, CreateAlbumItemDto, UpdateAlbumItemDto } from "./dto/album.dto";

@ApiTags("Albums")
@Controller("albums")
export class AlbumsController {
    constructor(private readonly albumsService: AlbumsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Create an album" })
    async create(
        @Body() dto: CreateAlbumDto,
        @GetUser("id") userId: string,
    ) {
        return this.albumsService.create(userId, dto);
    }

    @Get("user/:userId")
    @Public()
    @ApiOperation({ summary: "Get public albums by user ID" })
    async findByUser(
        @Param("userId") userId: string,
        @Req() req: any,
    ) {
        const viewerId = this.extractUserIdFromRequest(req);
        return this.albumsService.findByUser(userId, viewerId);
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Get my albums" })
    async findMine(@GetUser("id") userId: string) {
        return this.albumsService.findByUser(userId, userId);
    }

    @Get(":id")
    @Public()
    @ApiOperation({ summary: "Get album by ID" })
    async findOne(
        @Param("id") id: string,
        @Req() req: any,
    ) {
        const viewerId = this.extractUserIdFromRequest(req);
        return this.albumsService.findOne(id, viewerId);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Delete an album" })
    async deleteAlbum(
        @Param("id") id: string,
        @GetUser("id") userId: string,
    ) {
        return this.albumsService.deleteAlbum(id, userId);
    }

    @Post(":id/items")
    @UseGuards(JwtAuthGuard)
    @BypassSecurity()
    @ApiConsumes("multipart/form-data")
    @ApiOperation({ summary: "Upload an item to an album" })
    async addItem(
        @Param("id") albumId: string,
        @Req() req: any,
        @GetUser("id") userId: string,
    ) {
        const data = await req.file();
        if (!data) {
            throw new BadRequestException("No file provided");
        }

        const buffer = await data.toBuffer();
        const file = {
            buffer,
            originalname: data.filename,
            mimetype: data.mimetype,
            size: buffer.length,
        };

        const fields = data.fields as Record<string, any>;
        const parseBool = (val: any) => {
            if (val === undefined || val === null) return undefined;
            return val === "true" || val === true || val === "1" || val === 1;
        };

        const title = fields?.title?.value;
        if (!title) {
            throw new BadRequestException("Title is required");
        }

        const dto: CreateAlbumItemDto = {
            title,
            description: fields?.description?.value,
            itemType: fields?.itemType?.value || "photo",
            isPublic: parseBool(fields?.isPublic?.value),
        };

        return this.albumsService.addItem(albumId, userId, file as any, dto);
    }

    @Get(":id/items")
    @Public()
    @ApiOperation({ summary: "Get items inside an album" })
    async getItems(
        @Param("id") albumId: string,
        @Req() req: any,
    ) {
        const viewerId = this.extractUserIdFromRequest(req);
        return this.albumsService.getItems(albumId, viewerId);
    }

    @Patch(":id/items/:itemId")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Update publish status of an album item" })
    async updateItem(
        @Param("id") albumId: string,
        @Param("itemId") itemId: string,
        @Body() dto: UpdateAlbumItemDto,
        @GetUser("id") userId: string,
    ) {
        return this.albumsService.updateItem(albumId, itemId, userId, dto);
    }

    @Delete(":id/items/:itemId")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Delete an item from an album" })
    async deleteItem(
        @Param("id") albumId: string,
        @Param("itemId") itemId: string,
        @GetUser("id") userId: string,
    ) {
        return this.albumsService.deleteItem(albumId, itemId, userId);
    }

    private extractUserIdFromRequest(req: any): string | undefined {
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.substring(7);
                const payloadStr = Buffer.from(token.split(".")[1], "base64").toString("utf-8");
                const payload = JSON.parse(payloadStr);
                return payload.id || payload.sub;
            } catch (e) {
                // Ignore token parsing errors
            }
        }
        return undefined;
    }
}
