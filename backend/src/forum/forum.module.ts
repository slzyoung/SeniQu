/**
 * Forum Module - Community discussions with video upload support
 */

import { Module } from "@nestjs/common"
import { ForumController } from "./forum.controller"
import { ForumService } from "./forum.service"
import { StorageModule } from "../storage/storage.module"

@Module({
    imports: [StorageModule],
    controllers: [ForumController],
    providers: [ForumService],
    exports: [ForumService],
})
export class ForumModule { }
