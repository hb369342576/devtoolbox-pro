import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';

interface SqlEditorProps {
    value: string;
    onChange: (value: string) => void;
    tables: string[];
    columns: { table: string; columns: string[] }[];
    database?: string;
    onExecute?: () => void;
    onExecuteSelected?: (selectedText: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    height?: string | number;
    theme?: 'light' | 'dark';
}

// SQL关键字
const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'ON',
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE',
    'CREATE DATABASE', 'DROP DATABASE', 'USE',
    'INDEX', 'PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'DEFAULT', 'NULL', 'NOT NULL',
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'ALL',
    'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'EXISTS', 'ANY', 'SOME',
    'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
    'TRUE', 'FALSE'
];

// SQL函数
const SQL_FUNCTIONS = [
    // 聚合函数
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'GROUP_CONCAT',
    // 字符串函数
    'CONCAT', 'CONCAT_WS', 'SUBSTRING', 'SUBSTR', 'LEFT', 'RIGHT', 'LENGTH', 'CHAR_LENGTH',
    'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'REVERSE',
    'LOCATE', 'INSTR', 'LPAD', 'RPAD', 'REPEAT', 'SPACE',
    // 数学函数
    'ABS', 'CEIL', 'CEILING', 'FLOOR', 'ROUND', 'TRUNCATE', 'MOD',
    'POWER', 'SQRT', 'EXP', 'LOG', 'LOG10', 'LOG2',
    'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
    'RAND', 'SIGN', 'PI',
    // 日期函数
    'NOW', 'CURDATE', 'CURTIME', 'DATE', 'TIME', 'DATETIME', 'TIMESTAMP',
    'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'WEEK', 'WEEKDAY',
    'DATE_FORMAT', 'DATE_ADD', 'DATE_SUB', 'DATEDIFF', 'TIMEDIFF',
    'STR_TO_DATE', 'UNIX_TIMESTAMP', 'FROM_UNIXTIME',
    // 转换函数
    'CAST', 'CONVERT', 'COALESCE', 'IFNULL', 'NULLIF', 'IF', 'CASE',
    // 其他
    'DISTINCT', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
    'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE'
];

export const SqlEditor: React.FC<SqlEditorProps> = ({
    value,
    onChange,
    tables,
    columns,
    database,
    onExecute,
    onExecuteSelected,
    placeholder,
    readOnly = false,
    height = '100%',
    theme = 'dark'
}) => {
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // 注册SQL自动补全提供者
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions: monacoEditor.languages.CompletionItem[] = [];

                // SQL关键字
                SQL_KEYWORDS.forEach(keyword => {
                    suggestions.push({
                        label: keyword,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: keyword,
                        range,
                        detail: '关键字'
                    });
                });

                // SQL函数
                SQL_FUNCTIONS.forEach(func => {
                    suggestions.push({
                        label: func,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${func}()`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: '函数'
                    });
                });

                // 表名
                tables.forEach(table => {
                    const fullName = database ? `\`${database}\`.\`${table}\`` : `\`${table}\``;
                    suggestions.push({
                        label: table,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: fullName,
                        range,
                        detail: '表'
                    });
                });

                // 字段名 - 来自所有已知表
                columns.forEach(tableInfo => {
                    tableInfo.columns.forEach(col => {
                        suggestions.push({
                            label: col,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: `\`${col}\``,
                            range,
                            detail: `字段 (${tableInfo.table})`
                        });
                    });
                });

                return { suggestions };
            }
        });

        // 快捷键：Ctrl+Enter 执行
        editor.addAction({
            id: 'execute-sql',
            label: '执行SQL',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () => {
                if (onExecute) onExecute();
            }
        });

        // 快捷键：Ctrl+Shift+Enter 执行选中
        editor.addAction({
            id: 'execute-selected-sql',
            label: '执行选中SQL',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: () => {
                if (onExecuteSelected) {
                    const selection = editor.getSelection();
                    const model = editor.getModel();
                    if (selection && model) {
                        const selectedText = model.getValueInRange(selection);
                        if (selectedText.trim()) {
                            onExecuteSelected(selectedText);
                        }
                    }
                }
            }
        });

        // 右键菜单：执行全部
        editor.addAction({
            id: 'execute-all-sql-context',
            label: '执行全部',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.6,
            run: () => {
                if (onExecute) onExecute();
            }
        });
    };

    // 获取选中的文本
    const getSelectedText = (): string => {
        if (editorRef.current) {
            const selection = editorRef.current.getSelection();
            if (selection) {
                return editorRef.current.getModel()?.getValueInRange(selection) || '';
            }
        }
        return '';
    };

    // 暴露方法给父组件
    useEffect(() => {
        // 暴露getSelectedText方法
        (window as any).__sqlEditorGetSelectedText = getSelectedText;
        return () => {
            delete (window as any).__sqlEditorGetSelectedText;
        };
    }, []);

    return (
        <Editor
            height={height}
            defaultLanguage="sql"
            value={value}
            onChange={(val) => onChange(val || '')}
            onMount={handleEditorMount}
            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                renderWhitespace: 'selection',
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                wordBasedSuggestions: 'currentDocument',
                parameterHints: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
                readOnly,
                placeholder: placeholder
            }}
        />
    );
};

export default SqlEditor;
