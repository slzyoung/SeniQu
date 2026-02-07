/**
 * Audit Module - Security audit logging (OWASP)
 */

import { Module, Global } from "@nestjs/common"
import { AuditService } from "./audit.service"

@Global()
@Module({
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
