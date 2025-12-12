import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Question {
    id: string;
    title: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    answer: string;
    tags: string[];
    isFavorite?: boolean;
    lastReviewed?: number;
    createdAt: number;
}

interface InterviewQuestionsState {
    // 题目列表
    questions: Question[];

    // 当前查看的题目
    selectedQuestion: Question | null;

    // 过滤器
    selectedCategory: string;
    selectedDifficulty: string;
    searchTerm: string;
    showFavoritesOnly: boolean;

    // UI状态
    viewMode: 'list' | 'cards';
    showAnswer: boolean;

    // Actions - 题目管理
    setQuestions: (questions: Question[]) => void;
    addQuestion: (question: Question) => void;
    updateQuestion: (question: Question) => void;
    deleteQuestion: (id: string) => void;
    toggleFavorite: (id: string) => void;
    markAsReviewed: (id: string) => void;

    // Actions - 过滤和搜索
    setSelectedCategory: (category: string) => void;
    setSelectedDifficulty: (difficulty: string) => void;
    setSearchTerm: (term: string) => void;
    setShowFavoritesOnly: (show: boolean) => void;

    // Actions - UI
    setSelectedQuestion: (question: Question | null) => void;
    setViewMode: (mode: 'list' | 'cards') => void;
    setShowAnswer: (show: boolean) => void;

    // Computed
    getFilteredQuestions: () => Question[];
    getCategories: () => string[];
}

export const useInterviewQuestionsStore = create<InterviewQuestionsState>()(
    persist(
        (set, get) => ({
            // 初始状态
            questions: [],
            selectedQuestion: null,
            selectedCategory: '',
            selectedDifficulty: '',
            searchTerm: '',
            showFavoritesOnly: false,
            viewMode: 'cards',
            showAnswer: false,

            // 题目管理
            setQuestions: (questions) => set({ questions }),

            addQuestion: (question) => set((state) => ({
                questions: [question, ...state.questions]
            })),

            updateQuestion: (question) => set((state) => ({
                questions: state.questions.map(q => q.id === question.id ? question : q)
            })),

            deleteQuestion: (id) => set((state) => ({
                questions: state.questions.filter(q => q.id !== id),
                selectedQuestion: state.selectedQuestion?.id === id ? null : state.selectedQuestion
            })),

            toggleFavorite: (id) => set((state) => ({
                questions: state.questions.map(q =>
                    q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
                )
            })),

            markAsReviewed: (id) => set((state) => ({
                questions: state.questions.map(q =>
                    q.id === id ? { ...q, lastReviewed: Date.now() } : q
                )
            })),

            // 过滤和搜索
            setSelectedCategory: (category) => set({ selectedCategory: category }),
            setSelectedDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
            setSearchTerm: (term) => set({ searchTerm: term }),
            setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show }),

            // UI
            setSelectedQuestion: (question) => set({ selectedQuestion: question }),
            setViewMode: (mode) => set({ viewMode: mode }),
            setShowAnswer: (show) => set({ showAnswer: show }),

            // Computed
            getFilteredQuestions: () => {
                const { questions, selectedCategory, selectedDifficulty, searchTerm, showFavoritesOnly } = get();

                return questions.filter(q => {
                    const matchesCategory = !selectedCategory || q.category === selectedCategory;
                    const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
                    const matchesSearch = !searchTerm ||
                        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        q.answer.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesFavorite = !showFavoritesOnly || q.isFavorite;

                    return matchesCategory && matchesDifficulty && matchesSearch && matchesFavorite;
                });
            },

            getCategories: () => {
                const { questions } = get();
                const categories = new Set(questions.map(q => q.category));
                return Array.from(categories).sort();
            }
        }),
        {
            name: 'interview-questions-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ questions: state.questions }),
        }
    )
);

// Selectors
export const useFilteredQuestions = () => useInterviewQuestionsStore((state) => state.getFilteredQuestions());
export const useCategories = () => useInterviewQuestionsStore((state) => state.getCategories());
