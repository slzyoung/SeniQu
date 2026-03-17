import { SetMetadata } from "@nestjs/common"

export const BYPASS_SECURITY_KEY = "bypassSecurity"
export const BypassSecurity = () => SetMetadata(BYPASS_SECURITY_KEY, true)
