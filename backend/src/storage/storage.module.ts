import { Module } from "@nestjs/common"
import { StorageService } from "./storage.service"
import { StorageController } from "./storage.controller"
import { ImageProcessingService } from "./image-processing.service"
import { VideoProcessingService } from "./video-processing.service"

@Module({
    providers: [StorageService, ImageProcessingService, VideoProcessingService],
    controllers: [StorageController],
    exports: [StorageService, ImageProcessingService, VideoProcessingService],
})
export class StorageModule {}
