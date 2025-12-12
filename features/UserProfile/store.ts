import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserInfo {
    username: string;
    email: string;
    avatar?: string;
    bio?: string;
    company?: string;
    position?: string;
}

interface UserProfileState {
    // 用户信息
    userInfo: UserInfo;

    // UI状态
    activeTab: 'info' | 'security';
    isEditing: boolean;
    isSaving: boolean;

    // 密码修改
    passwordData: {
        oldPassword: string;
        newPassword: string;
        confirmPassword: string;
    };

    // Actions - 用户信息
    setUserInfo: (info: UserInfo) => void;
    updateUserInfo: (updates: Partial<UserInfo>) => void;
    setAvatar: (avatar: string) => void;

    // Actions - UI
    setActiveTab: (tab: 'info' | 'security') => void;
    setIsEditing: (editing: boolean) => void;
    setIsSaving: (saving: boolean) => void;

    // Actions - 密码
    setPasswordData: (data: Partial<UserProfileState['passwordData']>) => void;
    resetPasswordData: () => void;
}

export const useUserProfileStore = create<UserProfileState>()(
    persist(
        (set) => ({
            // 初始状态
            userInfo: {
                username: '',
                email: '',
                avatar: '',
                bio: '',
                company: '',
                position: ''
            },
            activeTab: 'info',
            isEditing: false,
            isSaving: false,
            passwordData: {
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            },

            // 用户信息
            setUserInfo: (info) => set({ userInfo: info }),

            updateUserInfo: (updates) => set((state) => ({
                userInfo: { ...state.userInfo, ...updates }
            })),

            setAvatar: (avatar) => set((state) => ({
                userInfo: { ...state.userInfo, avatar }
            })),

            // UI
            setActiveTab: (tab) => set({ activeTab: tab }),
            setIsEditing: (editing) => set({ isEditing: editing }),
            setIsSaving: (saving) => set({ isSaving: saving }),

            // 密码
            setPasswordData: (data) => set((state) => ({
                passwordData: { ...state.passwordData, ...data }
            })),

            resetPasswordData: () => set({
                passwordData: {
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }
            })
        }),
        {
            name: 'user-profile-store',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ userInfo: state.userInfo }), // 只持久化用户信息
        }
    )
);

// Selectors
export const useUserInfo = () => useUserProfileStore((state) => state.userInfo);
export const useActiveTab = () => useUserProfileStore((state) => state.activeTab);
