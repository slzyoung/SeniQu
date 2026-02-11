
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ToastContainer } from '../ui/Toast';
import { AuthModal } from '../AuthModal';
import { useAuthModalStore } from '../../stores/useAuthModalStore';
import { PrivyAuthBridge } from '../providers/PrivyAuthBridge';

import { LoadingFallback } from './LoadingFallback';

import { ScrollToTop } from './ScrollToTop';

/**
 * GlobalLayout Component
 * Wraps the entire application to provide global UI elements
 * that need access to the Router context (like GlobalSearchModal)
 */
export const GlobalLayout: React.FC = () => {
    const { isOpen, closeAuthModal, initialView } = useAuthModalStore();

    return (
        <>
            {/* Privy → Backend JWT bridge (invisible UI component) */}
            <PrivyAuthBridge>
                <ScrollToTop />
                {/* Main Content */}
                <Suspense fallback={<LoadingFallback />}>
                    <Outlet />
                </Suspense>

                {/* Global UI Components that require Router Context */}
                <GlobalSearchModal />
                <ToastContainer />

                {/* Global Auth Modal - Available on all pages */}
                <AuthModal isOpen={isOpen} onClose={closeAuthModal} initialView={initialView} />
            </PrivyAuthBridge>
        </>
    );
};
