import { Module } from "@nestjs/common"
import { NftsService } from "./nfts.service"
import { NftsController } from "./nfts.controller"
import { DatabaseModule } from "../database/database.module"

@Module({
    imports: [DatabaseModule],
    providers: [NftsService],
    controllers: [NftsController],
    exports: [NftsService],
})
export class NftsModule { }
