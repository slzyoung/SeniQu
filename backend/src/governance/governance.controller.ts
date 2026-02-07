import { Controller, Get, Post, Param, Body, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { GovernanceService } from "./governance.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { PermissionsGuard } from "../auth/guards/permissions.guard"
import { Permissions, Permission } from "../auth/decorators/permissions.decorator"
import { GetUser } from "../auth/decorators/get-user.decorator"
import { Public } from "../auth/decorators/public.decorator"

@ApiTags("Governance")
@Controller("governance")
export class GovernanceController {
    constructor(private readonly governanceService: GovernanceService) { }

    @Get("proposals")
    @Public()
    @ApiOperation({ summary: "Get active proposals" })
    async getActiveProposals() {
        return this.governanceService.getActiveProposals()
    }

    @Post("proposals")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.GOVERNANCE_PROPOSE)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Create proposal" })
    async createProposal(
        @Body() dto: { title: string; description: string; duration: number },
        @GetUser("id") proposerId: string,
    ) {
        return this.governanceService.createProposal(dto, proposerId)
    }

    @Post("proposals/:id/vote")
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.GOVERNANCE_VOTE)
    @ApiBearerAuth("JWT-auth")
    @ApiOperation({ summary: "Vote on proposal" })
    async vote(
        @Param("id") proposalId: string,
        @GetUser("id") voterId: string,
        @Body("support") support: boolean,
    ) {
        await this.governanceService.vote(proposalId, voterId, support)
        return { message: "Vote recorded" }
    }
}
