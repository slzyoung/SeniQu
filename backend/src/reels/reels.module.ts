import { Module } from "@nestjs/common"
import { ReelsService } from "./reels.service"
import { ReelsController } from "./reels.controller"
import { StorageModule } from "../storage/storage.module"

@Module({
    imports: [StorageModule],
    controllers: [ReelsController],
    providers: [ReelsService],
    exports: [ReelsService],
})
export class ReelsModule {}
