import { Module } from "@nestjs/common"
import { PhotosController } from "./photos.controller"
import { PhotosService } from "./photos.service"
import { DatabaseModule } from "../database/database.module"
import { StorageModule } from "../storage/storage.module"

@Module({
    imports: [DatabaseModule, StorageModule],
    controllers: [PhotosController],
    providers: [PhotosService],
    exports: [PhotosService],
})
export class PhotosModule {}
