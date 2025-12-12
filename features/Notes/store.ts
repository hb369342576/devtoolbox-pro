import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
    isPinned?: boolean;
}

interface NotesState {
    // 笔记列表
    notes: Note[];

    // 当前选中的笔记
    selectedNote: Note | null;

    // 搜索和过滤
    searchTerm: string;
    selectedTag: string;

    // UI状态
    viewMode: 'grid' | 'list';
    showEditor: boolean;

    // Actions - 笔记管理
    setNotes: (notes: Note[]) => void;
    addNote: (note: Note) => void;
    updateNote: (note: Note) => void;
    deleteNote: (id: string) => void;
    togglePin: (id: string) => void;

    // Actions - 选择和搜索
    setSelectedNote: (note: Note | null) => void;
    setSearchTerm: (term: string) => void;
    setSelectedTag: (tag: string) => void;

    // Actions - UI
    setViewMode: (mode: 'grid' | 'list') => void;
    setShowEditor: (show: boolean) => void;

    // Computed
    getFilteredNotes: () => Note[];
    getAllTags: () => string[];
}

export const useNotesStore = create<NotesState>()(
    persist(
        (set, get) => ({
            // 初始状态
            notes: [],
            selectedNote: null,
            searchTerm: '',
            selectedTag: '',
            viewMode: 'grid',
            showEditor: false,

            // 笔记管理
            setNotes: (notes) => set({ notes }),

            addNote: (note) => set((state) => ({
                notes: [note, ...state.notes]
            })),

            updateNote: (note) => set((state) => ({
                notes: state.notes.map(n => n.id === note.id ? note : n),
                selectedNote: state.selectedNote?.id === note.id ? note : state.selectedNote
            })),

            deleteNote: (id) => set((state) => ({
                notes: state.notes.filter(n => n.id !== id),
                selectedNote: state.selectedNote?.id === id ? null : state.selectedNote
            })),

            togglePin: (id) => set((state) => ({
                notes: state.notes.map(n =>
                    n.id === id ? { ...n, isPinned: !n.isPinned } : n
                )
            })),

            // 选择和搜索
            setSelectedNote: (note) => set({ selectedNote: note }),
            setSearchTerm: (term) => set({ searchTerm: term }),
            setSelectedTag: (tag) => set({ selectedTag: tag }),

            // UI
            setViewMode: (mode) => set({ viewMode: mode }),
            setShowEditor: (show) => set({ showEditor: show }),

            // Computed
            getFilteredNotes: () => {
                const { notes, searchTerm, selectedTag } = get();
                return notes
                    .filter(note => {
                        const matchesSearch = !searchTerm ||
                            note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            note.content.toLowerCase().includes(searchTerm.toLowerCase());

                        const matchesTag = !selectedTag || note.tags.includes(selectedTag);

                        return matchesSearch && matchesTag;
                    })
                    .sort((a, b) => {
                        // Pinned notes first
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        // Then by updated time
                        return b.updatedAt - a.updatedAt;
                    });
            },

            getAllTags: () => {
                const { notes } = get();
                const tagSet = new Set<string>();
                notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
                return Array.from(tagSet).sort();
            }
        }),
        {
            name: 'notes-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ notes: state.notes }), // 只持久化notes
        }
    )
);

// Selectors
export const useFilteredNotes = () => useNotesStore((state) => state.getFilteredNotes());
export const useAllTags = () => useNotesStore((state) => state.getAllTags());
