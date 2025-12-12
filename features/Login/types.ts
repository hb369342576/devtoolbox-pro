/**
 * Login 功能模块类型定义
 */

export interface LoginFormData {
    username: string;
    password: string;
}

export interface LoginState {
    isLoading: boolean;
    error: string;
    avatarPreview: string;
}
