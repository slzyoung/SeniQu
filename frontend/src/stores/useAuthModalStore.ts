/**
 * Global Auth Modal Store
 * Manages the auth modal state globally so it can be triggered from any component
 */

import { create } from 'zustand';

interface AuthModalState {
    isOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    toggleAuthModal: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    isOpen: false,
    openAuthModal: () => set({ isOpen: true }),
    closeAuthModal: () => set({ isOpen: false }),
    toggleAuthModal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
