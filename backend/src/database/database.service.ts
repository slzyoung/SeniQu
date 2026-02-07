import { Injectable, OnModuleInit, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

/**
 * Database Service
 * Provides typed Supabase client with connection management
 */
@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name)
    private supabase: SupabaseClient
    private supabaseAdmin: SupabaseClient

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        const supabaseUrl = this.configService.get<string>("database.supabaseUrl")
        const supabaseAnonKey = this.configService.get<string>("database.supabaseAnonKey")
        const supabaseServiceKey = this.configService.get<string>("database.supabaseServiceKey")

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("Supabase configuration is missing")
        }

        // Public client (respects RLS)
        this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: false,
            },
        })

        // Admin client (bypasses RLS)
        if (supabaseServiceKey) {
            this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            })
        }

        // Test connection
        try {
            const { error } = await this.supabase.from("_health_check").select("*").limit(1)
            if (error && error.code !== "PGRST116") {
                // PGRST116 = table doesn't exist, which is fine
                this.logger.warn(`Database connection warning: ${error.message}`)
            }
            this.logger.log("✅ Supabase connection established")
        } catch (error) {
            this.logger.error("Failed to connect to Supabase", error)
        }
    }

    /**
     * Get public Supabase client (respects RLS)
     */
    getClient(): SupabaseClient {
        return this.supabase
    }

    /**
     * Get admin Supabase client (bypasses RLS)
     * Use with caution - only for admin operations
     */
    getAdminClient(): SupabaseClient {
        if (!this.supabaseAdmin) {
            throw new Error("Admin client not configured")
        }
        return this.supabaseAdmin
    }

    /**
     * Execute a query with error handling
     */
    async query<T>(
        queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
        useAdmin = false,
    ): Promise<T> {
        const client = useAdmin ? this.getAdminClient() : this.getClient()
        const { data, error } = await queryFn(client)

        if (error) {
            this.logger.error(`Database query error: ${error.message}`)
            throw new Error(error.message)
        }

        return data as T
    }
}
