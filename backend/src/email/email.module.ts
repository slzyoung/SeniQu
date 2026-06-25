import { Module, Global } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { EmailService } from "./email.service"
import { EmailNotificationService } from "./email-notification.service"
import { DatabaseModule } from "../database/database.module"

@Global()
@Module({
    imports: [ConfigModule, DatabaseModule],
    providers: [EmailService, EmailNotificationService],
    exports: [EmailService, EmailNotificationService],
})
export class EmailModule {}
