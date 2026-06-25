/**
 * Notifications Module - User notifications
 */

import { Module, Global } from "@nestjs/common"
import { NotificationsController } from "./notifications.controller"
import { NotificationsService } from "./notifications.service"

@Global()
@Module({
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
