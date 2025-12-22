import React, { useState, useEffect } from 'react';
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
                let isValid = false;

                // 1. Backdoor / Default Admin
                if (formData.username === 'admin' && formData.password === '123456') {
                    isValid = true;
                } else {
                    // 2. Check Local Storage
                    try {
                        const usersJson = localStorage.getItem('toolbox_users');
                        if (usersJson) {
                            const users = JSON.parse(usersJson);
                            const found = users.find((u: any) => u.username === formData.username && u.password === formData.password);
                            if (found) isValid = true;
                        }
                    } catch (e) { /* ignore */ }
                }

                if (isValid) {
                    onLoginSuccess(formData.username);
                } else {
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: '用户名或密码错误 / Invalid username or password'
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
