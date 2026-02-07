/**
 * UI Store - Global UI State Management
 */

import { create } from 'zustand';

interface ModalConfig {
    id: string;
    content: React.ReactNode;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closable?: boolean;
}

interface UIState {
    // Sidebar
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;

    // Modals
    modals: ModalConfig[];

    // Global loading
    isGlobalLoading: boolean;
    loadingText: string;

    // Mobile menu
    mobileMenuOpen: boolean;

    // Search
    searchOpen: boolean;
    searchQuery: string;

    // Actions
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebarCollapse: () => void;

    openModal: (config: ModalConfig) => void;
    closeModal: (id?: string) => void;
    closeAllModals: () => void;

    setGlobalLoading: (loading: boolean, text?: string) => void;

    toggleMobileMenu: () => void;
    setMobileMenuOpen: (open: boolean) => void;

    setSearchOpen: (open: boolean) => void;
    setSearchQuery: (query: string) => void;

    // Theme (keeping original theme hook working)
    currentView: 'dashboard' | 'gallery' | 'marketplace' | 'community' | 'admin';
    setCurrentView: (view: UIState['currentView']) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    // Initial state
    sidebarOpen: true,
    sidebarCollapsed: false,
    modals: [],
    isGlobalLoading: false,
    loadingText: '',
    mobileMenuOpen: false,
    searchOpen: false,
    searchQuery: '',
    currentView: 'dashboard',

    // Sidebar actions
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    toggleSidebarCollapse: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
    })),

    // Modal actions
    openModal: (config) => set((state) => ({
        modals: [...state.modals, { ...config, closable: config.closable ?? true }],
    })),

    closeModal: (id) => {
        if (id) {
            set((state) => ({
                modals: state.modals.filter((m) => m.id !== id),
            }));
        } else {
            // Close last modal
            set((state) => ({
                modals: state.modals.slice(0, -1),
            }));
        }
    },

    closeAllModals: () => set({ modals: [] }),

    // Loading actions
    setGlobalLoading: (isGlobalLoading, loadingText = '') =>
        set({ isGlobalLoading, loadingText }),

    // Mobile menu actions
    toggleMobileMenu: () =>
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
    setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

    // Search actions
    setSearchOpen: (searchOpen) => set({ searchOpen }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    // View actions
    setCurrentView: (currentView) => set({ currentView }),
}));

// Helper hook for common modal patterns
export function useModal() {
    const { openModal, closeModal, modals } = useUIStore();

    return {
        open: openModal,
        close: closeModal,
        isOpen: (id: string) => modals.some((m) => m.id === id),
        count: modals.length,
    };
}
