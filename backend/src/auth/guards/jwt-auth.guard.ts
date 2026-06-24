import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import { Reflector } from "@nestjs/core"
import { IS_PUBLIC_KEY } from "../decorators/public.decorator"
import { lastValueFrom } from "rxjs"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private reflector: Reflector) {
        super()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (isPublic) {
            try {
                const result = super.canActivate(context);
                if (result instanceof Promise) {
                    await result;
                } else if (typeof result === 'boolean') {
                    // already a boolean
                } else if (result && typeof (result as any).subscribe === 'function') {
                    await lastValueFrom(result as any);
                }
            } catch (err) {
                // Ignore authentication errors for public routes
            }
            return true;
        }

        const result = super.canActivate(context);
        if (result instanceof Promise) {
            return await result;
        }
        return result as boolean;
    }

    handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
        if (context) {
            const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ])
            if (isPublic) {
                return user || null;
            }
        }
        if (err || !user) {
            console.error('[JwtAuthGuard] Auth failure:', {
                error: err?.message || err,
                info: info?.message || info,
                userExists: !!user
            });
            throw err || new UnauthorizedException("Authentication required")
        }
        return user;
    }
}
