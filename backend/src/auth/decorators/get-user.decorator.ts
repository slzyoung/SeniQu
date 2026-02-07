import { createParamDecorator, ExecutionContext } from "@nestjs/common"

/**
 * Get current authenticated user from request
 * Usage: @GetUser() user or @GetUser("id") userId
 */
export const GetUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        const user = request.user

        if (data) {
            return user?.[data]
        }

        return user
    },
)
