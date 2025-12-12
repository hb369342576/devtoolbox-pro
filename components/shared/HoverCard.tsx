import React from 'react';

interface HoverCardProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    hoverBorderColor?: string; // 自定义边框颜色
    hoverShadowColor?: string; // 自定义阴影颜色
}

/**
 * 统一的悬停卡片组件
 * 支持自定义边框和阴影颜色，其他效果统一
 */
export const HoverCard: React.FC<HoverCardProps> = ({
    children,
    onClick,
    className = '',
    hoverBorderColor = 'border-blue-400 dark:border-blue-500',
    hoverShadowColor = 'shadow-blue-500/20'
}) => {
    return (
        <div
            onClick={onClick}
            className={`
        group relative p-6 bg-white dark:bg-slate-800 rounded-2xl 
        shadow-sm border-2 border-slate-200 dark:border-slate-700 
        hover:${hoverBorderColor} 
        hover:shadow-2xl hover:${hoverShadowColor} 
        hover:-translate-y-2 
        transition-all duration-300 
        overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {/* 渐变背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* 光泽特效 */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>

            {/* 内容 */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
