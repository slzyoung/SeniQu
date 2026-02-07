import { Module } from "@nestjs/common"
import { ArtworksService } from "./artworks.service"
import { ArtworksController } from "./artworks.controller"
import { DatabaseModule } from "../database/database.module"

@Module({
    imports: [DatabaseModule],
    providers: [ArtworksService],
    controllers: [ArtworksController],
    exports: [ArtworksService],
})
export class ArtworksModule { }
