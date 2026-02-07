/**
 * Notifications Controller
 */

import {
    Controller,
    Get,
    Put,
    Delete,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { NotificationsService } from "./notifications.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { GetUser } from "../auth/decorators/get-user.decorator"

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: "Get user notifications" })
    async findAll(
        @GetUser("id") userId: string,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("unreadOnly") unreadOnly?: boolean,
    ) {
        return this.notificationsService.findByUser(userId, page, limit, unreadOnly)
    }

    @Get("unread-count")
    @ApiOperation({ summary: "Get unread notification count" })
    async getUnreadCount(@GetUser("id") userId: string) {
        return this.notificationsService.getUnreadCount(userId)
    }

    @Put(":id/read")
    @ApiOperation({ summary: "Mark notification as read" })
    async markAsRead(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.notificationsService.markAsRead(id, userId)
    }

    @Put("read-all")
    @ApiOperation({ summary: "Mark all notifications as read" })
    async markAllAsRead(@GetUser("id") userId: string) {
        return this.notificationsService.markAllAsRead(userId)
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete a notification" })
    async delete(
        @Param("id", ParseUUIDPipe) id: string,
        @GetUser("id") userId: string,
    ) {
        return this.notificationsService.delete(id, userId)
    }
}
