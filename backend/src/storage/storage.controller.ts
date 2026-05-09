import {
    Controller,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger"
import { Throttle } from "@nestjs/throttler"
import { StorageService } from "./storage.service"
import { UploadFileDto } from "./dto/upload-file.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { memoryStorage } from "multer"

@ApiTags("Storage")
@Controller("storage")
export class StorageController {
    constructor(private readonly storageService: StorageService) {}

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
    @UseInterceptors(FileInterceptor("file", {
        storage: memoryStorage(),
        limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB hard limit
        fileFilter: (_req, file, callback) => {
            // Anti-Hacking: Only allow safe file types
            const allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
                'video/mp4', 'video/webm', 'video/quicktime',
                'application/pdf',
            ]
            if (allowedMimes.includes(file.mimetype)) {
                callback(null, true)
            } else {
                callback(new Error(`File type ${file.mimetype} is not allowed. Accepted: images, videos, PDF.`), false)
            }
        },
    }))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadFileDto,
    ) {
        return this.storageService.uploadFile(file, dto.folder || "general")
    }

    @Delete(":key(*)")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Delete a file from R2 CDN" })
    async deleteFile(@Param("key") key: string) {
        await this.storageService.deleteFile(key)
        return { message: "File deleted successfully" }
    }
}
