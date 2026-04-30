import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy to automatically retry on ChunkLoadError
 * This prevents the app from crashing when a new deployment invalidates old chunks.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>
) {
    return lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error: any) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                window.location.reload();
                // Return a dummy component while reload happens
                return { default: () => null } as any;
            }
            throw error;
        }
    });
}
