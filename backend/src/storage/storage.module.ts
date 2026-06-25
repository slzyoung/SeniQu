import { Module } from "@nestjs/common"
import { StorageService } from "./storage.service"
import { StorageController } from "./storage.controller"
import { ImageProcessingService } from "./image-processing.service"
import { VideoProcessingService } from "./video-processing.service"
import { VideoUploadService } from "./video-upload.service"

@Module({
    providers: [StorageService, ImageProcessingService, VideoProcessingService, VideoUploadService],
    controllers: [StorageController],
    exports: [StorageService, ImageProcessingService, VideoProcessingService, VideoUploadService],
})
export class StorageModule {}
