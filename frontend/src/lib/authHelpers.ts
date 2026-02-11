/**
 * Auth Helpers — Shared utilities for authentication flows
 *
 * These helpers are used across AuthModal, AuthCallback, PrivyAuthBridge,
 * and CompleteProfilePage to determine profile completeness.
 */

import type { User } from './types';

/**
 * Check if a user needs to complete their profile.
 * Users from Google or wallet login may not have displayName/username set.
 *
 * @param user - The user object from auth store
 * @returns true if profile is incomplete (missing displayName or username)
 */
export function needsProfileCompletion(user: User | null): boolean {
    if (!user) return false; // Not authenticated, no completion needed

    const hasDisplayName = !!user.displayName && user.displayName.trim().length >= 2;
    const hasUsername = !!user.username && user.username.trim().length >= 3;

    return !hasDisplayName || !hasUsername;
}
