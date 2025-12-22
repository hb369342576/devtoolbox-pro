import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MappingProfile, CanvasNode, CanvasLink, TableInfo } from '../../types';

/**
 * FieldMappingTool专用状态管理Store
 */

interface FieldMappingState {
    // Project State
    profiles: MappingProfile[];
    activeProfile: MappingProfile | null;

    // Canvas State
    nodes: CanvasNode[];
    links: CanvasLink[];
    viewport: { x: number; y: number; zoom: number };

    // UI/Interaction State
    viewMode: 'grid' | 'list';
    showMappingModal: boolean;
    activeLink: CanvasLink | null;
    linkingSource: string | null;

    // Dragging State
    draggedItem: {
        table: TableInfo;
        side: 'source' | 'target';
        connId: string;
        db: string;
    } | null;

    // Actions - Project
    setProfiles: (profiles: MappingProfile[]) => void;
    addProfile: (profile: MappingProfile) => void;
    updateProfile: (profile: MappingProfile) => void;
    deleteProfile: (id: string) => void;
    setActiveProfile: (profile: MappingProfile | null) => void;

    // Actions - Canvas
    addNode: (node: CanvasNode) => void;
    updateNode: (id: string, updates: Partial<CanvasNode>) => void;
    deleteNode: (id: string) => void;
    setNodes: (nodes: CanvasNode[]) => void;

    addLink: (link: CanvasLink) => void;
    updateLink: (id: string, updates: Partial<CanvasLink>) => void;
    deleteLink: (id: string) => void;
    setLinks: (links: CanvasLink[]) => void;

    setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

    // Actions - UI
    setViewMode: (mode: 'grid' | 'list') => void;
    setShowMappingModal: (show: boolean) => void;
    setActiveLink: (link: CanvasLink | null) => void;
    setLinkingSource: (nodeId: string | null) => void;
    setDraggedItem: (item: FieldMappingState['draggedItem']) => void;

    // Actions - Complex
    autoLayout: () => void;
    updateSideConfig: (config: Partial<{ source: { connId: string; db: string }; target: { connId: string; db: string } }>) => void;
    updateActiveProfile: (updates: Partial<MappingProfile>) => void;
    saveCurrentProfile: () => void;
}

export const useFieldMappingStore = create<FieldMappingState>()(
    persist(
        (set, get) => ({
            // Initial State
            profiles: [],
            activeProfile: null,
            nodes: [],
            links: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            viewMode: 'grid',
            showMappingModal: false,
            activeLink: null,
            linkingSource: null,
            draggedItem: null,

            // Actions - Project
            setProfiles: (profiles) => set({ profiles }),
            addProfile: (profile) => set((state) => ({ profiles: [...state.profiles, profile] })),
            updateProfile: (profile) => set((state) => ({ profiles: state.profiles.map(p => p.id === profile.id ? profile : p) })),
            deleteProfile: (id) => set((state) => ({ profiles: state.profiles.filter(p => p.id !== id) })),
            setActiveProfile: (profile) => {
                set({
                    activeProfile: profile,
                    nodes: profile?.nodes || [],
                    links: profile?.links || [],
                    viewport: profile?.viewport || { x: 0, y: 0, zoom: 1 },
                    // Reset transient states
                    activeLink: null,
                    linkingSource: null,
                    draggedItem: null
                });
            },

            // Actions - Canvas
            addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
            updateNode: (id, updates) => set((state) => ({ nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n) })),
            deleteNode: (id) => set((state) => ({
                nodes: state.nodes.filter(n => n.id !== id),
                links: state.links.filter(l => l.sourceNodeId !== id && l.targetNodeId !== id)
            })),
            setNodes: (nodes) => set({ nodes }),

            addLink: (link) => set((state) => ({ links: [...state.links, link] })),
            updateLink: (id, updates) => set((state) => ({ links: state.links.map(l => l.id === id ? { ...l, ...updates } : l) })),
            deleteLink: (id) => set((state) => ({ links: state.links.filter(l => l.id !== id) })),
            setLinks: (links) => set({ links }),

            setViewport: (viewport) => set({ viewport }),

            // Actions - UI
            setViewMode: (mode) => set({ viewMode: mode }),
            setShowMappingModal: (show) => set({ showMappingModal: show }),
            setActiveLink: (link) => set({ activeLink: link }),
            setLinkingSource: (nodeId) => set({ linkingSource: nodeId }),
            setDraggedItem: (item) => set({ draggedItem: item }),

            // Actions - Complex
            autoLayout: () => {
                const { nodes } = get();
                const sourceNodes = nodes.filter(n => n.type === 'source');
                const targetNodes = nodes.filter(n => n.type === 'target');
                const newNodes = nodes.map((n) => {
                    if (n.type === 'source') {
                        const idx = sourceNodes.indexOf(n);
                        return { ...n, x: 100, y: 100 + idx * 300 };
                    } else {
                        const idx = targetNodes.indexOf(n);
                        return { ...n, x: 600, y: 100 + idx * 300 };
                    }
                });
                set({ nodes: newNodes, viewport: { x: 50, y: 50, zoom: 1 } });
            },

            updateSideConfig: (config) => set((state) => {
                if (!state.activeProfile) return {};
                const updated = {
                    ...state.activeProfile,
                    sideConfig: { ...state.activeProfile.sideConfig, ...config }
                };
                return {
                    activeProfile: updated,
                    profiles: state.profiles.map(p => p.id === updated.id ? updated : p)
                };
            }),

            updateActiveProfile: (updates) => set((state) => {
                if (!state.activeProfile) return {};
                const updated = { ...state.activeProfile, ...updates, updatedAt: Date.now() };
                return {
                    activeProfile: updated,
                    profiles: state.profiles.map(p => p.id === updated.id ? updated : p)
                };
            }),

            saveCurrentProfile: () => {
                const { activeProfile, nodes, links, viewport, profiles, viewMode } = get();
                if (!activeProfile) return;
                const updated: MappingProfile = {
                    ...activeProfile,
                    nodes,
                    links,
                    viewport,
                    updatedAt: Date.now()
                };
                set({
                    profiles: profiles.map(p => p.id === updated.id ? updated : p)
                });
            }
        }),
        {
            name: 'field-mapping-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ profiles: state.profiles }),
        }
    )
);

/**
 * 选择器Hooks
 */
export const useProfiles = () => useFieldMappingStore((state) => state.profiles);
export const useActiveProfile = () => useFieldMappingStore((state) => state.activeProfile);
export const useCanvasState = () => useFieldMappingStore((state) => ({
    nodes: state.nodes,
    links: state.links,
    viewport: state.viewport,
}));
