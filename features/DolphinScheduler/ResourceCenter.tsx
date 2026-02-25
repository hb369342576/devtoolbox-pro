import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Search, RefreshCw, Loader2, Upload, Download,
    HardDrive, Folder, File, ChevronRight, Trash2, CheckSquare, Square,
    FolderOpen, FileText, Image, Archive, Code, Database, Plus, Edit,
    FolderPlus, FilePlus, MoreVertical, Pencil, X, Save
} from 'lucide-react';
import { Language, DolphinSchedulerConnection, DSResource } from '../../types';
import { httpFetch } from '../../utils/http';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '../../components/ui/Toast';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';

interface ResourceCenterProps {
    lang: Language;
    connection: DolphinSchedulerConnection;
    onBack: () => void;
}

// 可编辑的文本文件扩展名
const TEXT_EXTENSIONS = ['txt', 'sql', 'py', 'java', 'js', 'ts', 'sh', 'json', 'xml', 'yaml', 'yml', 'conf', 'properties', 'md', 'csv', 'log', 'ini', 'cfg', 'html', 'css', 'scss', 'less', 'jsx', 'tsx', 'vue', 'bat', 'cmd', 'ps1', 'rb', 'php', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'scala', 'kt', 'groovy', 'gradle', 'make', 'dockerfile', ''];

export const ResourceCenter: React.FC<ResourceCenterProps> = ({
    lang,
    connection,
    onBack
}) => {
    const { toast } = useToast();
    const [resources, setResources] = useState<DSResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [pathHistory, setPathHistory] = useState<Array<{ fullName: string; name: string }>>([{ fullName: '', name: '根目录' }]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, ids: number[], names: string[] }>({ isOpen: false, ids: [], names: [] });
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 50;

    // 创建文件夹/文件模态框
    const [createModal, setCreateModal] = useState<{ isOpen: boolean; type: 'folder' | 'file' }>({ isOpen: false, type: 'folder' });
    const [newName, setNewName] = useState('');
    const [fileContent, setFileContent] = useState('');
    const [creating, setCreating] = useState(false);

    // 重命名模态框
    const [renameModal, setRenameModal] = useState<{ isOpen: boolean; resource: DSResource | null }>({ isOpen: false, resource: null });
    const [renameName, setRenameName] = useState('');

    // 编辑文件模态框
    const [editFileModal, setEditFileModal] = useState<{ isOpen: boolean; resource: DSResource | null; content: string; loading: boolean; saving: boolean }>({ 
        isOpen: false, resource: null, content: '', loading: false, saving: false 
    });

    useEffect(() => {
        fetchResources();
    }, [connection, currentPath, pageNo]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            const dirPath = currentPath === '' ? '' : currentPath;
            const searchVal = searchTerm ? encodeURIComponent(searchTerm) : '';
            const url = `${connection.baseUrl}/resources?fullName=${encodeURIComponent(dirPath)}&tenantCode=&type=FILE&searchVal=${searchVal}&pageNo=${pageNo}&pageSize=${pageSize}`;
            
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': connection.token }
            });
            
            const responseText = await response.text();
            if (responseText.trim().startsWith('<')) {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: 'API error', variant: 'destructive' });
                return;
            }
            
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                const resourceList = result.data?.totalList || result.data || [];
                setResources(Array.isArray(resourceList) ? resourceList : []);
                setTotal(result.data?.total || resourceList.length || 0);
            } else {
                toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            console.error('Resources fetch error:', err);
            toast({ title: lang === 'zh' ? '加载失败' : 'Load Failed', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (resource: DSResource) => {
        if (resource.directory) {
            setCurrentPath(resource.fullName);
            setPathHistory([...pathHistory, { fullName: resource.fullName, name: resource.alias.replace(/\/$/, '') }]);
            setPageNo(1);
            setSelectedIds([]);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.length === resources.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(resources.map(r => r.id));
        }
    };

    const handleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // 判断文件是否可编辑（文本格式）
    const isTextFile = (resource: DSResource): boolean => {
        if (resource.directory) return false;
        const ext = resource.alias.split('.').pop()?.toLowerCase() || '';
        // 检查已知的文本扩展名，或者文件足够小（可能是改了后缀的文本文件）
        return TEXT_EXTENSIONS.includes(ext) || (resource.size && resource.size < 1024 * 1024); // 小于1MB尝试编辑
    };

    // 创建文件夹
    const handleCreateFolder = async () => {
        if (!newName.trim()) {
            toast({ title: lang === 'zh' ? '请输入文件夹名称' : 'Please enter folder name', variant: 'destructive' });
            return;
        }
        setCreating(true);
        try {
            const url = `${connection.baseUrl}/resources/directory`;
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `type=FILE&name=${encodeURIComponent(newName)}&pid=${currentPath ? encodeURIComponent(currentPath) : -1}`
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '创建成功' : 'Created successfully', variant: 'success' });
                setCreateModal({ isOpen: false, type: 'folder' });
                setNewName('');
                fetchResources();
            } else {
                toast({ title: lang === 'zh' ? '创建失败' : 'Create failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '创建失败' : 'Create failed', description: err.message, variant: 'destructive' });
        } finally {
            setCreating(false);
        }
    };

    // 创建文件
    const handleCreateFile = async () => {
        if (!newName.trim()) {
            toast({ title: lang === 'zh' ? '请输入文件名称' : 'Please enter file name', variant: 'destructive' });
            return;
        }
        setCreating(true);
        try {
            const encoder = new TextEncoder();
            const fileData = Array.from(encoder.encode(fileContent));
            const url = `${connection.baseUrl}/resources`;
            const result: any = await invoke('http_upload', {
                url,
                headers: { 'token': connection.token },
                fileName: newName,
                fileData,
                formFields: { type: 'FILE', currentDir: currentPath || '' }
            });
            const parsed = JSON.parse(result.body);
            if (parsed.code === 0) {
                toast({ title: lang === 'zh' ? '创建成功' : 'Created successfully', variant: 'success' });
                setCreateModal({ isOpen: false, type: 'file' });
                setNewName('');
                setFileContent('');
                fetchResources();
            } else {
                toast({ title: lang === 'zh' ? '创建失败' : 'Create failed', description: parsed.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '创建失败' : 'Create failed', description: err.message, variant: 'destructive' });
        } finally {
            setCreating(false);
        }
    };

    // 上传文件
    const handleUpload = async () => {
        try {
            const files = await open({
                multiple: true,
                title: lang === 'zh' ? '选择要上传的文件' : 'Select files to upload'
            });
            
            if (!files || (Array.isArray(files) && files.length === 0)) return;
            
            setUploading(true);
            const fileList = Array.isArray(files) ? files : [files];
            let successCount = 0;
            
            for (const filePath of fileList) {
                try {
                    const fileName = filePath.split(/[/\\]/).pop() || 'file';
                    const content = await readFile(filePath);
                    const fileData = Array.from(content);
                    
                    const url = `${connection.baseUrl}/resources`;
                    const result: any = await invoke('http_upload', {
                        url,
                        headers: { 'token': connection.token },
                        fileName,
                        fileData,
                        formFields: { type: 'FILE', currentDir: currentPath || '' }
                    });
                    const parsed = JSON.parse(result.body);
                    
                    if (parsed.code === 0) {
                        successCount++;
                    } else {
                        toast({ title: `${fileName} ${lang === 'zh' ? '上传失败' : 'upload failed'}`, description: parsed.msg, variant: 'destructive' });
                    }
                } catch (err: any) {
                    console.error('Upload error:', err);
                }
            }
            
            if (successCount > 0) {
                toast({ title: lang === 'zh' ? `成功上传 ${successCount} 个文件` : `Uploaded ${successCount} files`, variant: 'success' });
                fetchResources();
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '上传失败' : 'Upload Failed', description: err.message, variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    // 行内上传（上传到当前目录，替换同名文件）
    const handleUploadSingle = async (resource: DSResource, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const files = await open({
                multiple: false,
                title: lang === 'zh' ? '选择要上传的文件' : 'Select file to upload'
            });
            
            if (!files) return;
            
            setUploading(true);
            const filePath = Array.isArray(files) ? files[0] : files;
            const content = await readFile(filePath);
            const fileData = Array.from(content);
            
            const url = `${connection.baseUrl}/resources`;
            const result: any = await invoke('http_upload', {
                url,
                headers: { 'token': connection.token },
                fileName: resource.alias,
                fileData,
                formFields: { type: 'FILE', currentDir: currentPath || '' }
            });
            const parsed = JSON.parse(result.body);
            
            if (parsed.code === 0) {
                toast({ title: lang === 'zh' ? '上传成功' : 'Uploaded successfully', variant: 'success' });
                fetchResources();
            } else {
                toast({ title: lang === 'zh' ? '上传失败' : 'Upload failed', description: parsed.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '上传失败' : 'Upload Failed', description: err.message, variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    // base64 解码为 Uint8Array
    const base64ToUint8Array = (base64: string): Uint8Array => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    };

    // 下载单个文件
    const handleDownloadSingle = async (resource: DSResource, e: React.MouseEvent) => {
        e.stopPropagation();
        if (resource.directory) return;

        try {
            const savePath = await save({
                title: lang === 'zh' ? '保存文件' : 'Save file',
                defaultPath: resource.alias
            });
            if (!savePath) return;

            setDownloading(true);
            const url = `${connection.baseUrl}/resources/${resource.id}/download`;
            const base64Data: string = await invoke('http_download', {
                url,
                headers: { 'token': connection.token }
            });
            await writeFile(savePath, base64ToUint8Array(base64Data));
            toast({ title: lang === 'zh' ? '下载成功' : 'Downloaded successfully', variant: 'success' });
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '下载失败' : 'Download Failed', description: err.message, variant: 'destructive' });
        } finally {
            setDownloading(false);
        }
    };

    // 批量下载
    const handleBatchDownload = async () => {
        const resourcesToDownload = resources.filter(r => selectedIds.includes(r.id) && !r.directory);
        if (resourcesToDownload.length === 0) {
            toast({ title: lang === 'zh' ? '请选择要下载的文件' : 'Please select files to download', variant: 'destructive' });
            return;
        }

        try {
            const savePath = await open({
                directory: true,
                title: lang === 'zh' ? '选择保存目录' : 'Select save directory'
            });
            if (!savePath) return;

            setDownloading(true);
            let successCount = 0;
            for (const res of resourcesToDownload) {
                try {
                    const url = `${connection.baseUrl}/resources/${res.id}/download`;
                    const base64Data: string = await invoke('http_download', {
                        url,
                        headers: { 'token': connection.token }
                    });
                    await writeFile(`${savePath}/${res.alias}`, base64ToUint8Array(base64Data));
                    successCount++;
                } catch (err) {
                    console.error('Download error:', err);
                }
            }
            if (successCount > 0) {
                toast({ title: lang === 'zh' ? `成功下载 ${successCount} 个文件` : `Downloaded ${successCount} files`, variant: 'success' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '下载失败' : 'Download Failed', description: err.message, variant: 'destructive' });
        } finally {
            setDownloading(false);
        }
    };

    // 删除确认
    const handleDeleteConfirm = () => {
        handleDelete(confirmDelete.ids);
        setConfirmDelete({ isOpen: false, ids: [], names: [] });
    };

    const handleDelete = async (ids: number[]) => {
        try {
            for (const id of ids) {
                const url = `${connection.baseUrl}/resources/${id}`;
                await httpFetch(url, {
                    method: 'DELETE',
                    headers: { 'token': connection.token }
                });
            }
            toast({ title: lang === 'zh' ? '删除成功' : 'Deleted successfully', variant: 'success' });
            setSelectedIds([]);
            fetchResources();
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '删除失败' : 'Delete Failed', description: err.message, variant: 'destructive' });
        }
    };

    // 删除单个
    const handleDeleteSingle = (resource: DSResource, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDelete({ isOpen: true, ids: [resource.id], names: [resource.alias] });
    };

    // 重命名
    const handleRename = async () => {
        if (!renameModal.resource || !renameName.trim()) return;
        try {
            const url = `${connection.baseUrl}/resources/${renameModal.resource.id}`;
            const response = await httpFetch(url, {
                method: 'PUT',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `name=${encodeURIComponent(renameName)}&type=FILE`
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: lang === 'zh' ? '重命名成功' : 'Renamed successfully', variant: 'success' });
                setRenameModal({ isOpen: false, resource: null });
                setRenameName('');
                fetchResources();
            } else {
                toast({ title: lang === 'zh' ? '重命名失败' : 'Rename failed', description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '重命名失败' : 'Rename failed', description: err.message, variant: 'destructive' });
        }
    };

    // 打开编辑文件模态框
    const handleOpenEditFile = async (resource: DSResource, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditFileModal({ isOpen: true, resource, content: '', loading: true, saving: false });
        
        try {
            // 获取文件内容
            const url = `${connection.baseUrl}/resources/${resource.id}/view-content?skipLineNum=0&limit=100000`;
            const response = await httpFetch(url, {
                method: 'GET',
                headers: { 'token': connection.token }
            });
            const result = await response.json();
            if (result.code === 0) {
                setEditFileModal(prev => ({ ...prev, content: result.data || '', loading: false }));
            } else {
                toast({ title: lang === 'zh' ? '获取内容失败' : 'Failed to get content', description: result.msg, variant: 'destructive' });
                setEditFileModal({ isOpen: false, resource: null, content: '', loading: false, saving: false });
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '获取内容失败' : 'Failed to get content', description: err.message, variant: 'destructive' });
            setEditFileModal({ isOpen: false, resource: null, content: '', loading: false, saving: false });
        }
    };

    // 保存编辑的文件
    const handleSaveEditFile = async () => {
        if (!editFileModal.resource) return;
        setEditFileModal(prev => ({ ...prev, saving: true }));
        
        try {
            const encoder = new TextEncoder();
            const fileData = Array.from(encoder.encode(editFileModal.content));

            // 先删除旧文件
            const deleteUrl = `${connection.baseUrl}/resources/${editFileModal.resource.id}`;
            await httpFetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'token': connection.token }
            });

            // 上传新文件
            const uploadUrl = `${connection.baseUrl}/resources`;
            const result: any = await invoke('http_upload', {
                url: uploadUrl,
                headers: { 'token': connection.token },
                fileName: editFileModal.resource.alias,
                fileData,
                formFields: { type: 'FILE', currentDir: currentPath || '' }
            });
            const parsed = JSON.parse(result.body);
            
            if (parsed.code === 0) {
                toast({ title: lang === 'zh' ? '保存成功' : 'Saved successfully', variant: 'success' });
                setEditFileModal({ isOpen: false, resource: null, content: '', loading: false, saving: false });
                fetchResources();
            } else {
                toast({ title: lang === 'zh' ? '保存失败' : 'Save failed', description: parsed.msg, variant: 'destructive' });
                setEditFileModal(prev => ({ ...prev, saving: false }));
            }
        } catch (err: any) {
            toast({ title: lang === 'zh' ? '保存失败' : 'Save failed', description: err.message, variant: 'destructive' });
            setEditFileModal(prev => ({ ...prev, saving: false }));
        }
    };

    const getFileIcon = (resource: DSResource) => {
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

    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="h-full flex flex-col">
            {/* 删除确认模态框 */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={lang === 'zh' ? '确认删除' : 'Confirm Delete'}
                message={lang === 'zh' ? `确定要删除 ${confirmDelete.names.join(', ')} 吗？` : `Delete ${confirmDelete.names.join(', ')}?`}
                confirmText={lang === 'zh' ? '删除' : 'Delete'}
                cancelText={lang === 'zh' ? '取消' : 'Cancel'}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete({ isOpen: false, ids: [], names: [] })}
                type="danger"
            />

            {/* 创建文件夹/文件模态框 */}
            {createModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[480px] shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                            {createModal.type === 'folder' ? <FolderPlus className="mr-2 text-amber-500" /> : <FilePlus className="mr-2 text-blue-500" />}
                            {createModal.type === 'folder' 
                                ? (lang === 'zh' ? '创建文件夹' : 'Create Folder')
                                : (lang === 'zh' ? '创建文件' : 'Create File')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    {lang === 'zh' ? '名称' : 'Name'}
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={createModal.type === 'folder' ? 'folder_name' : 'file.txt'}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                            {createModal.type === 'file' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        {lang === 'zh' ? '内容（可选）' : 'Content (optional)'}
                                    </label>
                                    <textarea
                                        value={fileContent}
                                        onChange={e => setFileContent(e.target.value)}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => { setCreateModal({ isOpen: false, type: 'folder' }); setNewName(''); setFileContent(''); }}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={createModal.type === 'folder' ? handleCreateFolder : handleCreateFile}
                                disabled={creating}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                            >
                                {creating && <Loader2 size={16} className="mr-2 animate-spin" />}
                                {lang === 'zh' ? '创建' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 重命名模态框 */}
            {renameModal.isOpen && renameModal.resource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[400px] shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                            <Pencil className="mr-2 text-blue-500" size={20} />
                            {lang === 'zh' ? '重命名' : 'Rename'}
                        </h3>
                        <input
                            type="text"
                            value={renameName}
                            onChange={e => setRenameName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => { setRenameModal({ isOpen: false, resource: null }); setRenameName(''); }}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleRename}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                            >
                                {lang === 'zh' ? '确定' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 编辑文件模态框 */}
            {editFileModal.isOpen && editFileModal.resource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[800px] h-[600px] shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                                <Edit className="mr-2 text-blue-500" size={20} />
                                {lang === 'zh' ? '编辑文件' : 'Edit File'}: {editFileModal.resource.alias}
                            </h3>
                            <button onClick={() => setEditFileModal({ isOpen: false, resource: null, content: '', loading: false, saving: false })} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        {editFileModal.loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-amber-500" />
                            </div>
                        ) : (
                            <textarea
                                value={editFileModal.content}
                                onChange={e => setEditFileModal(prev => ({ ...prev, content: e.target.value }))}
                                className="flex-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm resize-none"
                            />
                        )}
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={() => setEditFileModal({ isOpen: false, resource: null, content: '', loading: false, saving: false })}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSaveEditFile}
                                disabled={editFileModal.saving || editFileModal.loading}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
                            >
                                {editFileModal.saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                                {lang === 'zh' ? '保存' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <Tooltip content={lang === 'zh' ? '返回项目列表' : 'Back to projects'} position="right">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
                        </button>
                    </Tooltip>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                            <HardDrive className="mr-3 text-amber-500" />
                            {lang === 'zh' ? '资源中心' : 'Resource Center'}
                        </h2>
                        <p className="text-xs text-slate-500">{connection.name}</p>
                    </div>
                </div>
                <Tooltip content={lang === 'zh' ? '刷新' : 'Refresh'} position="bottom">
                    <button onClick={fetchResources} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">
                        <RefreshCw size={18} className={`text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </Tooltip>
            </div>

            {/* 搜索栏和全局操作按钮 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={lang === 'zh' ? '搜索资源...' : 'Search resources...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchResources()}
                            className="w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {selectedIds.length > 0 ? (lang === 'zh' ? `已选 ${selectedIds.length} 项` : `${selectedIds.length} selected`) : (lang === 'zh' ? `共 ${total} 项` : `${total} items`)}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setCreateModal({ isOpen: true, type: 'folder' })}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors"
                    >
                        <FolderPlus size={16} className="mr-1" />
                        {lang === 'zh' ? '新建文件夹' : 'New Folder'}
                    </button>
                    <button
                        onClick={() => setCreateModal({ isOpen: true, type: 'file' })}
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors"
                    >
                        <FilePlus size={16} className="mr-1" />
                        {lang === 'zh' ? '新建文件' : 'New File'}
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Upload size={16} className="mr-1" />}
                        {lang === 'zh' ? '上传文件' : 'Upload'}
                    </button>
                    {selectedIds.length > 0 && (
                        <>
                            <button
                                onClick={handleBatchDownload}
                                disabled={downloading}
                                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors disabled:opacity-50"
                            >
                                {downloading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Download size={16} className="mr-1" />}
                                {lang === 'zh' ? '批量下载' : 'Download'}
                            </button>
                            <button
                                onClick={() => setConfirmDelete({ isOpen: true, ids: selectedIds, names: resources.filter(r => selectedIds.includes(r.id)).map(r => r.alias) })}
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center text-sm transition-colors"
                            >
                                <Trash2 size={16} className="mr-1" />
                                {lang === 'zh' ? '批量删除' : 'Delete'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* 面包屑导航（目录路径） */}
            <div className="flex items-center space-x-1 mb-3 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                <Folder size={16} className="text-amber-500 mr-1" />
                {pathHistory.map((item, idx) => (
                    <React.Fragment key={item.fullName || 'root'}>
                        {idx > 0 && <ChevronRight size={16} className="text-slate-400" />}
                        <button
                            onClick={() => {
                                setCurrentPath(item.fullName);
                                setPathHistory(pathHistory.slice(0, idx + 1));
                                setPageNo(1);
                                setSelectedIds([]);
                            }}
                            className={`px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded truncate max-w-[150px] ${idx === pathHistory.length - 1 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                            {item.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* 资源列表 */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-amber-500" />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <th className="w-12 px-3 py-3 text-left border-r border-slate-200 dark:border-slate-600">
                                        <button onClick={handleSelectAll} className="text-slate-400 hover:text-amber-500">
                                            {selectedIds.length === resources.length && resources.length > 0 ? <CheckSquare size={16} className="text-amber-500" /> : <Square size={16} />}
                                        </button>
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 dark:border-slate-600">{lang === 'zh' ? '名称' : 'Name'}</th>
                                    <th className="w-24 px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 dark:border-slate-600">{lang === 'zh' ? '大小' : 'Size'}</th>
                                    <th className="w-40 px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 dark:border-slate-600">{lang === 'zh' ? '更新时间' : 'Updated'}</th>
                                    <th className="w-40 px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">{lang === 'zh' ? '操作' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resources.map((resource, idx) => (
                                    <tr
                                        key={resource.id}
                                        className={`hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selectedIds.includes(resource.id) ? 'bg-amber-50 dark:bg-amber-900/20' : idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}
                                        onClick={() => handleNavigate(resource)}
                                    >
                                        <td className="px-3 py-3 border-r border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => { e.stopPropagation(); handleSelect(resource.id); }} className="text-slate-400 hover:text-amber-500">
                                                {selectedIds.includes(resource.id) ? <CheckSquare size={18} className="text-amber-500" /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 border-r border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center space-x-3">
                                                {getFileIcon(resource)}
                                                <span className="font-medium text-slate-800 dark:text-white truncate">{resource.alias}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700">
                                            {resource.directory ? '-' : formatSize(resource.size)}
                                        </td>
                                        <td className="px-3 py-3 text-sm text-slate-400 border-r border-slate-100 dark:border-slate-700 whitespace-nowrap">
                                            {resource.updateTime || '-'}
                                        </td>
                                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end space-x-1">
                                                {!resource.directory && (
                                                    <>
                                                        <Tooltip content={lang === 'zh' ? '上传替换' : 'Upload Replace'} position="top">
                                                            <button
                                                                onClick={(e) => handleUploadSingle(resource, e)}
                                                                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-500"
                                                            >
                                                                <Upload size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        {isTextFile(resource) && (
                                                            <Tooltip content={lang === 'zh' ? '编辑' : 'Edit'} position="top">
                                                                <button
                                                                    onClick={(e) => handleOpenEditFile(resource, e)}
                                                                    className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-500"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip content={lang === 'zh' ? '下载' : 'Download'} position="top">
                                                            <button
                                                                onClick={(e) => handleDownloadSingle(resource, e)}
                                                                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-500"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                                <Tooltip content={lang === 'zh' ? '重命名' : 'Rename'} position="top">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setRenameModal({ isOpen: true, resource }); setRenameName(resource.alias); }}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content={lang === 'zh' ? '删除' : 'Delete'} position="top">
                                                    <button
                                                        onClick={(e) => handleDeleteSingle(resource, e)}
                                                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {resources.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                            {lang === 'zh' ? '暂无资源' : 'No resources found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setPageNo(p => Math.max(1, p - 1))}
                        disabled={pageNo === 1}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {lang === 'zh' ? '上一页' : 'Prev'}
                    </button>
                    <span className="text-sm text-slate-500">{pageNo} / {totalPages}</span>
                    <button
                        onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                        disabled={pageNo === totalPages}
                        className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                        {lang === 'zh' ? '下一页' : 'Next'}
                    </button>
                </div>
            )}
        </div>
    );
};
