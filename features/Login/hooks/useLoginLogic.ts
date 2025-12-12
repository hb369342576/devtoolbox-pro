import { useState, useEffect } from 'react';
import { LoginFormData, LoginState } from '../types';

/**
 * Login 业务逻辑 Hook
 * 封装登录表单状态和验证逻辑
 */
export const useLoginLogic = (onLoginSuccess: (username: string) => void) => {
    const [formData, setFormData] = useState<LoginFormData>({
        username: 'admin',
        password: ''
    });

    const [state, setState] = useState<LoginState>({
        isLoading: false,
        error: '',
        avatarPreview: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`
    });

    // 更新头像预览
    useEffect(() => {
        const seed = formData.username || 'guest';
        setState(prev => ({
            ...prev,
            avatarPreview: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
        }));
    }, [formData.username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setState(prev => ({ ...prev, isLoading: true, error: '' }));

        // 模拟登录请求
        setTimeout(() => {
            if (formData.username && formData.password) {
                if (formData.password === '123456') {
                    onLoginSuccess(formData.username);
                } else {
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: 'Invalid password (Default: 123456)'
                    }));
                }
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Please enter username and password'
                }));
            }
        }, 800);
    };

    const updateFormData = (field: keyof LoginFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return {
        formData,
        state,
        handleSubmit,
        updateFormData
    };
};
