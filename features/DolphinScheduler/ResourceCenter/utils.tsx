import React from 'react';
import { DSResource } from './types';
import { FolderOpen, Database, Code, FileText, Archive, Image, File } from 'lucide-react';

export const TEXT_EXTENSIONS = [
    'txt', 'sql', 'py', 'java', 'js', 'ts', 'sh', 'json', 'xml', 'yaml', 'yml', 
    'conf', 'properties', 'md', 'csv', 'log', 'ini', 'cfg', 'html', 'css', 
    'scss', 'less', 'jsx', 'tsx', 'vue', 'bat', 'cmd', 'ps1', 'rb', 'php', 
    'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'scala', 'kt', 'groovy', 'gradle', 
    'make', 'dockerfile', ''
];

// 判断文件是否可编辑（文本格式）
export const isTextFile = (resource: DSResource): boolean => {
    if (resource.directory) return false;
    const ext = resource.alias.split('.').pop()?.toLowerCase() || '';
    // 检查已知的文本扩展名，或者文件足够小（可能是改了后缀的文本文件）
    return TEXT_EXTENSIONS.includes(ext) || (resource.size && resource.size < 1024 * 1024) !== undefined && (resource.size && resource.size < 1024 * 1024) !== false; // 小于1MB尝试编辑
};

// base64 解码为 Uint8Array
export const base64ToUint8Array = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

export const getFileIcon = (resource: DSResource) => {
    if (resource.directory) return <FolderOpen size={20} className="text-amber-500" />;
    
    const ext = resource.alias.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'sql': return <Database size={20} className="text-blue-500" />;
        case 'py': case 'java': case 'js': case 'ts': case 'sh': return <Code size={20} className="text-green-500" />;
        case 'json': case 'xml': case 'yaml': case 'yml': case 'conf': return <FileText size={20} className="text-purple-500" />;
        case 'zip': case 'tar': case 'gz': case 'jar': return <Archive size={20} className="text-orange-500" />;
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return <Image size={20} className="text-pink-500" />;
        default: return <File size={20} className="text-slate-400" />;
    }
};

export const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
