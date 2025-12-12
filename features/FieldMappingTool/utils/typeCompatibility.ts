/**
 * 检查数据类型兼容性
 */
export const checkTypeCompatibility = (
    sourceType: string = '',
    targetType: string = ''
): { compatible: boolean; warning?: string } => {
    const s = sourceType.toLowerCase();
    const t = targetType.toLowerCase();

    if (!s || !t) return { compatible: true };

    // String -> Number
    if ((s.includes('char') || s.includes('text')) &&
        (t.includes('int') || t.includes('decimal') || t.includes('double'))) {
        return { compatible: false, warning: 'String -> Number risk' };
    }

    // BigInt -> Int
    if (s.includes('bigint') && t.includes('int') && !t.includes('big')) {
        return { compatible: false, warning: 'BigInt -> Int overflow risk' };
    }

    // Date -> Non-Date
    if ((s.includes('date') || s.includes('time')) &&
        (!t.includes('date') && !t.includes('time') &&
            !t.includes('char') && !t.includes('text'))) {
        return { compatible: false, warning: 'Date -> Non-Date/String' };
    }

    return { compatible: true };
};
