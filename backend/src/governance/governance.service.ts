import { Injectable, Logger } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"

export interface Proposal {
    id: string
    title: string
    description: string
    proposerId: string
    status: "DRAFT" | "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED"
    votesFor: number
    votesAgainst: number
    quorum: number
    startDate: Date
    endDate: Date
    createdAt: Date
}

@Injectable()
export class GovernanceService {
    private readonly logger = new Logger(GovernanceService.name)

    constructor(private readonly db: DatabaseService) { }

    async createProposal(dto: { title: string; description: string; duration: number }, proposerId: string): Promise<Proposal> {
        const client = this.db.getAdminClient()
        const endDate = new Date(Date.now() + dto.duration * 24 * 60 * 60 * 1000)

        const { data, error } = await client
            .from("proposals")
            .insert({
                title: dto.title,
                description: dto.description,
                proposer_id: proposerId,
                status: "ACTIVE",
                votes_for: 0,
                votes_against: 0,
                quorum: 100,
                start_date: new Date().toISOString(),
                end_date: endDate.toISOString(),
            })
            .select()
            .single()

        if (error) throw new Error(error.message)
        return this.mapToProposal(data)
    }

    async vote(proposalId: string, voterId: string, support: boolean): Promise<void> {
        const client = this.db.getAdminClient()

        // Record vote
        await client.from("votes").insert({
            proposal_id: proposalId,
            voter_id: voterId,
            support,
        })

        // Update vote count
        const column = support ? "votes_for" : "votes_against"
        await client.rpc("increment_vote", { proposal_id: proposalId, column_name: column })
    }

    async getActiveProposals(): Promise<Proposal[]> {
        const client = this.db.getClient()

        const { data, error } = await client
            .from("proposals")
            .select("*")
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false })

        if (error) throw new Error(error.message)
        return (data || []).map(this.mapToProposal)
    }

    private mapToProposal(data: any): Proposal {
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            proposerId: data.proposer_id,
            status: data.status,
            votesFor: data.votes_for,
            votesAgainst: data.votes_against,
            quorum: data.quorum,
            startDate: new Date(data.start_date),
            endDate: new Date(data.end_date),
            createdAt: new Date(data.created_at),
        }
    }
}
