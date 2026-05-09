import { SetMetadata } from "@nestjs/common"

export const PERMISSIONS_KEY = "permissions"

/**
 * Permission types for fine-grained access control
 * Enterprise RBAC: Supports Super Admin, Platform Admin,
 * Museum Admin, Gallery Admin, Heritage Admin, Artist Admin, Content Moderator
 */
export enum Permission {
    // Artwork
    ARTWORK_CREATE = "artwork:create",
    ARTWORK_READ = "artwork:read",
    ARTWORK_UPDATE = "artwork:update",
    ARTWORK_DELETE = "artwork:delete",
    ARTWORK_PUBLISH = "artwork:publish",
    ARTWORK_VERIFY = "artwork:verify",

    // Art (NFT/Marketplace)
    ART_MINT = "art:mint",
    ART_TRANSFER = "art:transfer",
    ART_BURN = "art:burn",

    // Collection
    COLLECTION_CREATE = "collection:create",
    COLLECTION_MANAGE = "collection:manage",

    // User
    USER_VIEW = "user:view",
    USER_MANAGE = "user:manage",

    // Institution (Museum/Gallery/Heritage)
    INSTITUTION_CREATE = "institution:create",
    INSTITUTION_READ = "institution:read",
    INSTITUTION_UPDATE = "institution:update",
    INSTITUTION_VERIFY = "institution:verify",

    // Content Moderation
    CONTENT_MODERATE = "content:moderate",
    CONTENT_DELETE = "content:delete",

    // Admin — Dashboard & Features
    ADMIN_DASHBOARD = "admin:dashboard",
    ADMIN_SETTINGS = "admin:settings",
    ADMIN_USERS = "admin:users",
    ADMIN_ROLES = "admin:roles",
    ADMIN_SECURITY = "admin:security",
    ADMIN_LOGS = "admin:logs",
    ADMIN_DATABASE = "admin:database",
    ADMIN_HEALTH = "admin:health",
    ADMIN_REPORTS = "admin:reports",
    ADMIN_PARTNERSHIPS = "admin:partnerships",
    ADMIN_PREMIUM = "admin:premium",
    ADMIN_MARKETPLACE = "admin:marketplace",
    ADMIN_ALERTS = "admin:alerts",

    // Governance
    GOVERNANCE_PROPOSE = "governance:propose",
    GOVERNANCE_VOTE = "governance:vote",
    GOVERNANCE_EXECUTE = "governance:execute",
}

/**
 * Role to permissions mapping — Enterprise RBAC
 * Each admin role has a specific set of permissions
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    // === ADMIN ROLES ===
    super_admin: Object.values(Permission),
    SUPER_ADMIN: Object.values(Permission),

    platform_admin: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_USERS, Permission.ADMIN_ROLES,
        Permission.ADMIN_LOGS, Permission.ADMIN_REPORTS, Permission.ADMIN_ALERTS,
        Permission.ADMIN_HEALTH, Permission.ADMIN_PARTNERSHIPS, Permission.ADMIN_PREMIUM,
        Permission.ADMIN_MARKETPLACE, Permission.ADMIN_SETTINGS,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE, Permission.INSTITUTION_VERIFY,
        Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE, Permission.ARTWORK_VERIFY,
        Permission.CONTENT_MODERATE,
    ],
    PLATFORM_ADMIN: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_USERS, Permission.ADMIN_ROLES,
        Permission.ADMIN_LOGS, Permission.ADMIN_REPORTS, Permission.ADMIN_ALERTS,
        Permission.ADMIN_HEALTH, Permission.ADMIN_PARTNERSHIPS, Permission.ADMIN_PREMIUM,
        Permission.ADMIN_MARKETPLACE, Permission.ADMIN_SETTINGS,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE, Permission.INSTITUTION_VERIFY,
        Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE, Permission.ARTWORK_VERIFY,
        Permission.CONTENT_MODERATE,
    ],

    museum_admin: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE, Permission.ARTWORK_PUBLISH,
    ],
    MUSEUM_ADMIN: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE, Permission.ARTWORK_PUBLISH,
    ],

    gallery_admin: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS, Permission.ADMIN_MARKETPLACE,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE, Permission.ARTWORK_PUBLISH,
        Permission.COLLECTION_CREATE, Permission.COLLECTION_MANAGE,
    ],
    GALLERY_ADMIN: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS, Permission.ADMIN_MARKETPLACE,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE, Permission.ARTWORK_PUBLISH,
        Permission.COLLECTION_CREATE, Permission.COLLECTION_MANAGE,
    ],

    heritage_admin: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE,
    ],
    HERITAGE_ADMIN: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS,
        Permission.INSTITUTION_READ, Permission.INSTITUTION_UPDATE,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE,
    ],

    artist_admin: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE,
        Permission.ARTWORK_PUBLISH, Permission.ARTWORK_DELETE,
        Permission.COLLECTION_CREATE, Permission.COLLECTION_MANAGE,
        Permission.ART_MINT,
    ],
    ARTIST_ADMIN: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_ALERTS,
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE,
        Permission.ARTWORK_PUBLISH, Permission.ARTWORK_DELETE,
        Permission.COLLECTION_CREATE, Permission.COLLECTION_MANAGE,
        Permission.ART_MINT,
    ],

    content_moderator: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_REPORTS, Permission.ADMIN_LOGS, Permission.ADMIN_ALERTS,
        Permission.ARTWORK_READ, Permission.ARTWORK_VERIFY,
        Permission.CONTENT_MODERATE, Permission.CONTENT_DELETE,
    ],
    CONTENT_MODERATOR: [
        Permission.ADMIN_DASHBOARD, Permission.ADMIN_REPORTS, Permission.ADMIN_LOGS, Permission.ADMIN_ALERTS,
        Permission.ARTWORK_READ, Permission.ARTWORK_VERIFY,
        Permission.CONTENT_MODERATE, Permission.CONTENT_DELETE,
    ],

    // === USER ROLES ===
    artist: [
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE,
        Permission.ART_MINT, Permission.COLLECTION_CREATE, Permission.GOVERNANCE_VOTE,
    ],
    collector: [
        Permission.ARTWORK_READ, Permission.ART_TRANSFER, Permission.COLLECTION_CREATE,
        Permission.GOVERNANCE_VOTE,
    ],
    art_lover: [Permission.ARTWORK_READ, Permission.GOVERNANCE_VOTE],
}

/**
 * Require specific permissions to access a route
 */
export const Permissions = (...permissions: Permission[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions)
