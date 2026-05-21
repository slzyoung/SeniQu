import {
    Controller,
    Post,
    Delete,
    Param,
    UseGuards,
    BadRequestException,
    Req,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import { StorageService } from "./storage.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"

// Allowed MIME types for upload validation
const ALLOWED_MIMES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
]

@ApiTags("Storage")
@Controller("storage")
export class StorageController {
    constructor(private readonly storageService: StorageService) { }

    @Post("upload")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @ApiOperation({ summary: "Upload a file to R2 CDN" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary", description: "File to upload" },
                folder: {
                    type: "string",
                    enum: ["artworks", "avatars", "videos", "collections", "general"],
                    default: "general",
                },
            },
            required: ["file"],
        },
    })
    async upload(@Req() req: any) {
        // @fastify/multipart adds .file() to the request at runtime
        const data = await req.file()
        if (!data) {
            throw new BadRequestException("No file provided")
        }

        // Validate MIME type
        if (!ALLOWED_MIMES.includes(data.mimetype)) {
            throw new BadRequestException(
                `File type ${data.mimetype} is not allowed. Accepted: images, videos, PDF.`
            )
        }

        // Read the file buffer
        const buffer = await data.toBuffer()

        // Extract folder from fields
        const fields = data.fields as Record<string, any>
        const folder = fields?.folder?.value || "general"

        // Create a compatible file object for the storage service
        const file = {
            buffer,
            originalname: data.filename,
            mimetype: data.mimetype,
            size: buffer.length,
        }

        return this.storageService.uploadFile(file as any, folder)
    }

    @Delete(":key")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Delete a file from R2 CDN" })
    async deleteFile(@Param("key") key: string) {
        await this.storageService.deleteFile(key)
        return { message: "File deleted successfully" }
    }
}
