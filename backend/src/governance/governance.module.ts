import { Module } from "@nestjs/common"
import { GovernanceService } from "./governance.service"
import { GovernanceController } from "./governance.controller"
import { DatabaseModule } from "../database/database.module"

@Module({
    imports: [DatabaseModule],
    providers: [GovernanceService],
    controllers: [GovernanceController],
    exports: [GovernanceService],
})
export class GovernanceModule { }
