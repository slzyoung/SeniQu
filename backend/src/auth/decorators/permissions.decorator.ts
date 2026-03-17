import { SetMetadata } from "@nestjs/common"

export const PERMISSIONS_KEY = "permissions"

/**
 * Permission types for fine-grained access control
 */
export enum Permission {
    // Artwork
    ARTWORK_CREATE = "artwork:create",
    ARTWORK_READ = "artwork:read",
    ARTWORK_UPDATE = "artwork:update",
    ARTWORK_DELETE = "artwork:delete",
    ARTWORK_PUBLISH = "artwork:publish",
    ARTWORK_VERIFY = "artwork:verify",

    // Art
    ART_MINT = "art:mint",
    ART_TRANSFER = "art:transfer",
    ART_BURN = "art:burn",

    // Collection
    COLLECTION_CREATE = "collection:create",
    COLLECTION_MANAGE = "collection:manage",

    // User
    USER_VIEW = "user:view",
    USER_MANAGE = "user:manage",

    // Institution
    INSTITUTION_CREATE = "institution:create",
    INSTITUTION_VERIFY = "institution:verify",

    // Admin
    ADMIN_DASHBOARD = "admin:dashboard",
    ADMIN_SETTINGS = "admin:settings",

    // Governance
    GOVERNANCE_PROPOSE = "governance:propose",
    GOVERNANCE_VOTE = "governance:vote",
    GOVERNANCE_EXECUTE = "governance:execute",
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    super_admin: Object.values(Permission),
    gallery_admin: [
        Permission.ARTWORK_CREATE, Permission.ARTWORK_READ, Permission.ARTWORK_UPDATE,
        Permission.ARTWORK_PUBLISH, Permission.COLLECTION_CREATE, Permission.ADMIN_DASHBOARD,
    ],
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
