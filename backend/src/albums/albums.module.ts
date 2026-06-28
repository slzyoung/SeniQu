import { Module } from "@nestjs/common";
import { AlbumsController } from "./albums.controller";
import { AlbumsService } from "./albums.service";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";

@Module({
    imports: [DatabaseModule, StorageModule],
    controllers: [AlbumsController],
    providers: [AlbumsService],
    exports: [AlbumsService],
})
export class AlbumsModule {}
