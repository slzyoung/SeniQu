import { Module } from "@nestjs/common"
import { ArtistController, ArtistsController } from "./artist.controller"
import { ArtistService } from "./artist.service"
import { DatabaseModule } from "../database/database.module"

@Module({
    imports: [DatabaseModule],
    controllers: [ArtistController, ArtistsController],
    providers: [ArtistService],
    exports: [ArtistService],
})
export class ArtistModule { }
