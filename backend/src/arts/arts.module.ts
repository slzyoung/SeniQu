import { Module } from "@nestjs/common"
import { ArtsService } from "./arts.service"
import { ArtsController } from "./arts.controller"
import { DatabaseModule } from "../database/database.module"

@Module({
    imports: [DatabaseModule],
    providers: [ArtsService],
    controllers: [ArtsController],
    exports: [ArtsService],
})
export class ArtsModule { }
