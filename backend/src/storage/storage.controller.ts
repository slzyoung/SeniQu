import {
    Controller,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from "@nestjs/swagger"
import { StorageService } from "./storage.service"
import { UploadFileDto } from "./dto/upload-file.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"

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
        limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB hard limit (validated more precisely in service)
    }))
    async upload(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadFileDto,
    ) {
        const result = await this.storageService.uploadFile(file, dto.folder || "general")

        return {
            success: true,
            data: result,
        }
    }

    @Delete(":key(*)")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.ADMIN_DASHBOARD)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Delete a file from R2 CDN (admin only)" })
    async delete(@Param("key") key: string) {
        await this.storageService.deleteFile(key)

        return {
            success: true,
            message: `File '${key}' deleted`,
        }
    }
}
