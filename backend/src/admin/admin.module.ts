import { Module } from "@nestjs/common"
import { AdminController } from "./admin.controller"
import { AdminService } from "./admin.service"
import { DatabaseModule } from "../database/database.module"
import { EmailModule } from "../email/email.module"

@Module({
    imports: [DatabaseModule, EmailModule],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }
