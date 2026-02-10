/**
 * Global Auth Modal Store
 * Manages the auth modal state globally so it can be triggered from any component
 */

import { create } from 'zustand';

export type AuthView = 'main' | 'email-login' | 'email-register' | 'wallet-select';

interface AuthModalState {
    isOpen: boolean;
    initialView: AuthView;
    openAuthModal: (view?: AuthView) => void;
    closeAuthModal: () => void;
    toggleAuthModal: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    isOpen: false,
    initialView: 'main',
    openAuthModal: (view = 'main') => set({ isOpen: true, initialView: view }),
    closeAuthModal: () => set({ isOpen: false }),
    toggleAuthModal: () => set((state) => ({ isOpen: !state.isOpen, initialView: 'main' })),
}));
