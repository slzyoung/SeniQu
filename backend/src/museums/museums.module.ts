/**
 * Museums Module - Manages Museums and Galleries
 * Enterprise-grade with validation and security
 */

import { Module } from "@nestjs/common"
import { MuseumsController } from "./museums.controller"
import { MuseumsService } from "./museums.service"

@Module({
    controllers: [MuseumsController],
    providers: [MuseumsService],
    exports: [MuseumsService],
})
export class MuseumsModule { }
