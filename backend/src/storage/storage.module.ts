import { Module } from "@nestjs/common"
import { StorageService } from "./storage.service"
import { StorageController } from "./storage.controller"
import { ImageProcessingService } from "./image-processing.service"

@Module({
    providers: [StorageService, ImageProcessingService],
    controllers: [StorageController],
    exports: [StorageService, ImageProcessingService],
})
export class StorageModule {}
