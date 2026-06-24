import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Patch,
} from "@nestjs/common"
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { UsersService } from "./users.service"
import { UpdateUserDto } from "./dto/update-user.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @UseGuards(RolesGuard)
    @Roles("super_admin", "gallery_admin")
    @ApiOperation({ summary: "Get all users (admin only)" })
    async findAll(@Query("page") page = 1, @Query("limit") limit = 20) {
        return this.usersService.findAll(page, limit)
    }

    @Get("me")
    @ApiOperation({ summary: "Get current user profile" })
    async getProfile(@GetUser() user: any) {
        return this.usersService.findById(user.id)
    }

    @Get("me/stats")
    @ApiOperation({ summary: "Get current user statistics" })
    async getStats(@GetUser() user: any) {
        return this.usersService.getUserStats(user.id)
    }

    @Get("me/activity")
    @ApiOperation({ summary: "Get current user recent activity" })
    async getActivity(
        @GetUser() user: any,
        @Query("limit") limit = 10,
    ) {
        return this.usersService.getRecentActivity(user.id, limit)
    }

    @Get("me/bookmarks")
    @ApiOperation({ summary: "Get current user bookmarks" })
    async getBookmarks(
        @GetUser() user: any,
        @Query("page") page = 1,
        @Query("limit") limit = 20,
    ) {
        return this.usersService.getBookmarks(user.id, page, limit)
    }

    @Post("me/bookmarks")
    @ApiOperation({ summary: "Add artwork to bookmarks" })
    async addBookmark(
        @GetUser() user: any,
        @Body("artworkId") artworkId: string,
    ) {
        return this.usersService.addBookmark(user.id, artworkId)
    }

    @Delete("me/bookmarks/:artworkId")
    @ApiOperation({ summary: "Remove artwork from bookmarks" })
    async removeBookmark(
        @GetUser() user: any,
        @Param("artworkId") artworkId: string,
    ) {
        return this.usersService.removeBookmark(user.id, artworkId)
    }

    @Get("me/collections")
    @ApiOperation({ summary: "Get current user collections" })
    async getCollections(
        @GetUser() user: any,
        @Query("page") page = 1,
        @Query("limit") limit = 20,
    ) {
        return this.usersService.getCollections(user.id, page, limit)
    }

    @Post("me/collections")
    @ApiOperation({ summary: "Create a new collection" })
    async createCollection(
        @GetUser() user: any,
        @Body() dto: { name: string; description?: string; isPublic?: boolean },
    ) {
        return this.usersService.createCollection(user.id, dto)
    }

    @Get(":id/public-profile")
    @ApiOperation({ summary: "Get public user profile with follow stats" })
    async getPublicProfile(
        @Param("id") id: string,
        @GetUser() user: any,
    ) {
        return this.usersService.getPublicProfile(id, user?.id)
    }

    @Post(":id/follow")
    @ApiOperation({ summary: "Follow a user" })
    async followUser(
        @Param("id") targetId: string,
        @GetUser() user: any,
    ) {
        return this.usersService.followUser(user.id, targetId)
    }

    @Delete(":id/follow")
    @ApiOperation({ summary: "Unfollow a user" })
    async unfollowUser(
        @Param("id") targetId: string,
        @GetUser() user: any,
    ) {
        return this.usersService.unfollowUser(user.id, targetId)
    }

    @Patch("me")
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @ApiOperation({ summary: "Update current user profile" })
    async updateProfile(@GetUser("id") userId: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(userId, dto)
    }

    @Post("me/sync-wallets")
    @ApiOperation({ summary: "Sync Privy embedded wallets to database" })
    async syncWallets(@GetUser("id") userId: string) {
        return this.usersService.syncWallets(userId)
    }
}