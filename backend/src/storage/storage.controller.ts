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
