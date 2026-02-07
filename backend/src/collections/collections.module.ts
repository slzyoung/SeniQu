import { Module } from "@nestjs/common"
import { CollectionsService } from "./collections.service"
import { CollectionsController } from "./collections.controller"
import { DatabaseModule } from "../database/database.module"

@Module({
    imports: [DatabaseModule],
    providers: [CollectionsService],
    controllers: [CollectionsController],
    exports: [CollectionsService],
})
export class CollectionsModule { }
