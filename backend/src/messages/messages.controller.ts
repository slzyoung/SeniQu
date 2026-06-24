/**
 * Messages Controller — Secure In-App Chat API
 * All endpoints require JWT authentication
 */

import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { MessagesService } from "./messages.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { SendMessageDto, ReportMessageDto } from "./dto/message.dto"

@ApiTags("Messages")
@Controller("messages")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) {}

    @Post("send")
    @ApiOperation({ summary: "Send an encrypted message to another user" })
    async sendMessage(
        @Body() dto: SendMessageDto,
        @GetUser("id") userId: string,
    ) {
        return this.messagesService.sendMessage(userId, dto)
    }

    @Get("conversations")
    @ApiOperation({ summary: "Get all conversations for the current user" })
    async getConversations(@GetUser("id") userId: string) {
        return this.messagesService.getConversations(userId)
    }

    @Get("search-users")
    @ApiOperation({ summary: "Search users to start a conversation, prioritizing followed users and excluding blocked users" })
    async searchUsers(
        @Query("q") query: string,
        @GetUser("id") userId: string,
    ) {
        return this.messagesService.searchUsers(userId, query)
    }

    @Get("followed-users")
    @ApiOperation({ summary: "Get list of users followed by the current user" })
    async getFollowedUsers(@GetUser("id") userId: string) {
        return this.messagesService.getFollowedUsers(userId)
    }

    @Get("conversations/:conversationId")
    @ApiOperation({ summary: "Get messages in a conversation" })
    async getMessages(
        @Param("conversationId") conversationId: string,
        @GetUser("id") userId: string,
        @Query("cursor") cursor?: string,
    ) {
        return this.messagesService.getMessages(userId, conversationId, cursor)
    }

    @Get("unread")
    @ApiOperation({ summary: "Get unread message count" })
    async getUnreadCount(@GetUser("id") userId: string) {
        return { count: await this.messagesService.getUnreadCount(userId) }
    }

    @Post("report")
    @ApiOperation({ summary: "Report a suspicious/scam message" })
    async reportMessage(
        @Body() dto: ReportMessageDto,
        @GetUser("id") userId: string,
    ) {
        return this.messagesService.reportMessage(userId, dto)
    }

    @Post("block/:userId")
    @ApiOperation({ summary: "Block a user from sending you messages" })
    async blockUser(
        @Param("userId") blockedId: string,
        @GetUser("id") userId: string,
    ) {
        return this.messagesService.blockUser(userId, blockedId)
    }

    @Delete("block/:userId")
    @ApiOperation({ summary: "Unblock a user" })
    async unblockUser(
        @Param("userId") blockedId: string,
        @GetUser("id") userId: string,
    ) {
        return this.messagesService.unblockUser(userId, blockedId)
    }
}
