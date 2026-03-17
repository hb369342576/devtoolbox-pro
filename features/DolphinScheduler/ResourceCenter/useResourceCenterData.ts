import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../common/Toast';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import { DolphinSchedulerConnection, DSResource } from './types';
import { httpFetch } from '../../../utils/http';
import { base64ToUint8Array } from './utils';

export const useResourceCenterData = (connection: DolphinSchedulerConnection | null) => {
    const { t } = useTranslation();
    const { toast } = useToast();

    // 资源数据与分页
    const [resources, setResources] = useState<DSResource[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [pathHistory, setPathHistory] = useState<Array<{ fullName: string; name: string }>>([{ fullName: '', name: '根目录' }]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 50;

    // 操作状态
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fetchResources = useCallback(async () => {
        if (!connection) return;
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
                toast({ title: t('dolphinScheduler.loadFailed'), description: 'API error', variant: 'destructive' });
                return;
            }
            
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                const resourceList = result.data?.totalList || result.data || [];
                setResources(Array.isArray(resourceList) ? resourceList : []);
                setTotal(result.data?.total || resourceList.length || 0);
            } else {
                toast({ title: t('dolphinScheduler.loadFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.loadFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [connection, currentPath, pageNo, pageSize, searchTerm, t, toast]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleNavigate = (resource: DSResource) => {
        if (resource.directory) {
            setCurrentPath(resource.fullName);
            setPathHistory([...pathHistory, { fullName: resource.fullName, name: resource.alias.replace(/\/$/, '') }]);
            setPageNo(1);
            setSelectedIds([]);
        }
    };

    const handlePathClick = (fullName: string, index: number) => {
        setCurrentPath(fullName);
        setPathHistory(pathHistory.slice(0, index + 1));
        setPageNo(1);
        setSelectedIds([]);
    };

    const handleSelectAll = () => {
        const selectableResources = resources.filter(r => !r.directory);
        const selectableIds = selectableResources.map(r => r.fullName);
        const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectableIds);
        }
    };

    const handleSelect = (key: string, isDirectory?: boolean) => {
        if (isDirectory) return; 
        setSelectedIds(prev => prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]);
    };

    // 文件与目录创建
    const handleCreateFolder = async (newName: string) => {
        if (!connection || !newName.trim()) return false;
        try {
            const url = `${connection.baseUrl}/resources/directory`;
            const body = `type=FILE&name=${encodeURIComponent(newName)}&currentDir=${encodeURIComponent(currentPath || '/')}&pid=-1`;
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: t('dolphinScheduler.createdSuccessfully'), variant: 'success' });
                fetchResources();
                return true;
            } else {
                toast({ title: t('dolphinScheduler.createFailed'), description: result.msg, variant: 'destructive' });
                return false;
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.createFailed'), description: err.message, variant: 'destructive' });
            return false;
        }
    };

    const handleCreateFile = async (newName: string, fileContent: string) => {
        if (!connection || !newName.trim()) return false;
        try {
            const dotIdx = newName.lastIndexOf('.');
            const fileSuffix = dotIdx > 0 ? newName.substring(dotIdx + 1) : 'txt';
            
            const url = `${connection.baseUrl}/resources/online-create`;
            const body = `type=FILE&fileName=${encodeURIComponent(newName)}&suffix=${encodeURIComponent(fileSuffix)}&content=${encodeURIComponent(fileContent)}&currentDir=${encodeURIComponent(currentPath || '/')}`;
            const response = await httpFetch(url, {
                method: 'POST',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: t('dolphinScheduler.createdSuccessfully'), variant: 'success' });
                fetchResources();
                return true;
            } else {
                toast({ title: t('dolphinScheduler.createFailed'), description: result.msg, variant: 'destructive' });
                return false;
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.createFailed'), description: err.message, variant: 'destructive' });
            return false;
        }
    };

    const handleRename = async (resource: DSResource, renameName: string) => {
        if (!connection || !renameName.trim()) return false;
        try {
            if (resource.directory) {
                const checkUrl = `${connection.baseUrl}/resources?fullName=${encodeURIComponent(resource.fullName)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=1`;
                const checkResp = await httpFetch(checkUrl, { method: 'GET', headers: { 'token': connection.token } });
                const checkResult = await checkResp.json();
                const childCount = checkResult.data?.total || (checkResult.data?.totalList?.length) || 0;
                if (childCount > 0) {
                    toast({
                        title: t('dolphinScheduler.cannotRename'),
                        description: t('dolphinScheduler.folderResAliasIsNotEmptyA'),
                        variant: 'destructive'
                    });
                    return false;
                }
            }

            const url = resource.id != null
                ? `${connection.baseUrl}/resources/${resource.id}`
                : `${connection.baseUrl}/resources`;
            const bodyParts = `name=${encodeURIComponent(renameName)}&type=FILE`;
            const body = resource.id != null ? bodyParts : `${bodyParts}&fullName=${encodeURIComponent(resource.fullName)}`;
            const response = await httpFetch(url, {
                method: 'PUT',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const responseText = await response.text();
            const result = JSON.parse(responseText);
            if (result.code === 0) {
                toast({ title: t('dolphinScheduler.renamedSuccessfully'), variant: 'success' });
                fetchResources();
                return true;
            } else {
                toast({ title: t('dolphinScheduler.renameFailed'), description: result.msg, variant: 'destructive' });
                return false;
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.renameFailed'), description: err.message, variant: 'destructive' });
            return false;
        }
    };

    const handleDelete = async (ids: string[]) => {
        if (!connection) return false;
        let successCount = 0;
        let failMsg = '';
        try {
            for (const fullName of ids) {
                const res = resources.find(r => r.fullName === fullName);
                const deleteId = res?.id;
                const url = deleteId
                    ? `${connection.baseUrl}/resources/${deleteId}`
                    : `${connection.baseUrl}/resources?fullName=${encodeURIComponent(fullName)}`;
                
                const response = await httpFetch(url, { method: 'DELETE', headers: { 'token': connection.token } });
                const responseText = await response.text();
                try {
                    const result = JSON.parse(responseText);
                    if (result.code === 0) successCount++;
                    else failMsg = result.msg || `code: ${result.code}`;
                } catch {
                    failMsg = responseText.substring(0, 200);
                }
            }
            if (successCount > 0) toast({ title: t('dolphinScheduler.deletedSuccessCountItems', { successCount }), variant: 'success' });
            if (failMsg) toast({ title: t('dolphinScheduler.someDeletesFailed'), description: failMsg, variant: 'destructive' });
            
            setSelectedIds([]);
            fetchResources();
            return true;
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.deleteFailed'), description: err.message, variant: 'destructive' });
            return false;
        }
    };

    // 下载/上传核心能力
    const handleDownloadSingle = async (resource: DSResource) => {
        if (!connection || resource.directory) return;
        
        const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
        const downloadUrl = resource.id != null
            ? `${connection.baseUrl}/resources/${resource.id}/download`
            : `${connection.baseUrl}/resources/download?fullName=${encodeURIComponent(resource.fullName)}`;

        setDownloading(true);
        if (isTauri) {
            try {
                const savePath = await save({ defaultPath: resource.alias });
                if (!savePath) return;

                const base64Data: string = await invoke('http_download', { url: downloadUrl, headers: { 'token': connection.token } });
                await writeFile(savePath, base64ToUint8Array(base64Data));
                toast({ title: t('dolphinScheduler.downloadedSuccessfully'), variant: 'success' });
            } catch (err: any) {
                toast({ title: t('dolphinScheduler.downloadFailed'), description: err.message, variant: 'destructive' });
            } finally {
                setDownloading(false);
            }
        } else {
            try {
                const response = await fetch(downloadUrl, { headers: { 'token': connection.token } });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = resource.alias;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast({ title: t('dolphinScheduler.downloadedSuccessfully'), variant: 'success' });
            } catch (err: any) {
                toast({ title: t('dolphinScheduler.downloadFailed'), description: err.message, variant: 'destructive' });
            } finally {
                setDownloading(false);
            }
        }
    };

    const handleBatchDownload = async () => {
        if (!connection) return;
        const resourcesToDownload = resources.filter(r => selectedIds.includes(r.fullName) && !r.directory);
        if (resourcesToDownload.length === 0) {
            toast({ title: t('dolphinScheduler.pleaseSelectFilesToDownlo'), variant: 'destructive' });
            return;
        }

        const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);

        if (isTauri) {
            try {
                const savePath = await open({ directory: true });
                if (!savePath) return;

                setDownloading(true);
                let successCount = 0;
                for (const res of resourcesToDownload) {
                    try {
                        const downloadUrl = res.id != null
                            ? `${connection.baseUrl}/resources/${res.id}/download`
                            : `${connection.baseUrl}/resources/download?fullName=${encodeURIComponent(res.fullName)}`;
                        const base64Data: string = await invoke('http_download', { url: downloadUrl, headers: { 'token': connection.token } });
                        await writeFile(`${savePath}/${res.alias}`, base64ToUint8Array(base64Data));
                        successCount++;
                    } catch (err) {}
                }
                if (successCount > 0) toast({ title: t('dolphinScheduler.downloadedSuccessCountFil', { successCount }), variant: 'success' });
            } catch (err: any) {
                toast({ title: t('dolphinScheduler.downloadFailed'), description: err.message, variant: 'destructive' });
            } finally {
                setDownloading(false);
            }
        } else {
            // Web 模式：遍历触发下载
            setDownloading(true);
            let successCount = 0;
            try {
                for (const res of resourcesToDownload) {
                    const downloadUrl = res.id != null
                        ? `${connection.baseUrl}/resources/${res.id}/download`
                        : `${connection.baseUrl}/resources/download?fullName=${encodeURIComponent(res.fullName)}`;
                    
                    try {
                        const response = await fetch(downloadUrl, { headers: { 'token': connection.token } });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = res.alias;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        
                        successCount++;
                        // 稍微停顿，防止浏览器拦截过多并发下载
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (err) {
                        console.error(`Failed to download ${res.alias}`, err);
                    }
                }
                if (successCount > 0) {
                    toast({ title: t('dolphinScheduler.downloadedSuccessCountFil', { successCount }), variant: 'success' });
                }
            } finally {
                setDownloading(false);
            }
        }
    };

    const handleUpload = async () => {
        if (!connection) return;
        const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
        
        if (isTauri) {
            try {
                const files = await open({ multiple: true });
                if (!files || (Array.isArray(files) && files.length === 0)) return;
                
                setUploading(true);
                const fileList = Array.isArray(files) ? files : [files];
                let successCount = 0;
                
                for (const filePath of fileList) {
                    try {
                        const fileName = filePath.split(/[/\\]/).pop() || 'file';
                        const content = await readFile(filePath);
                        const fileData = Array.from(content);
                        
                        const existing = resources.find(r => r.alias === fileName && !r.directory);
                        if (existing) {
                            try {
                                const deleteUrl = existing.id
                                    ? `${connection.baseUrl}/resources/${existing.id}`
                                    : `${connection.baseUrl}/resources?fullName=${encodeURIComponent(existing.fullName)}`;
                                await httpFetch(deleteUrl, { method: 'DELETE', headers: { 'token': connection.token } });
                            } catch (e) {}
                        }
                        
                        const url = `${connection.baseUrl}/resources`;
                        const result: any = await invoke('http_upload', {
                            url, headers: { 'token': connection.token }, fileName, fileData,
                            formFields: { type: 'FILE', name: fileName, currentDir: currentPath || '' }
                        });
                        const parsed = JSON.parse(result.body);
                        
                        if (parsed.code === 0) successCount++;
                        else toast({ title: `${fileName} ${t('dolphinScheduler.uploadFailed')}`, description: parsed.msg, variant: 'destructive' });
                    } catch (err) {}
                }
                
                if (successCount > 0) {
                    toast({ title: t('dolphinScheduler.uploadedSuccessCountFiles', { successCount }), variant: 'success' });
                    fetchResources();
                }
            } catch (err: any) {
                toast({ title: t('dolphinScheduler.uploadFailed'), description: err.message, variant: 'destructive' });
            } finally {
                setUploading(false);
            }
        } else {
            // Web 模式下使用 input file
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = async (e: any) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                setUploading(true);
                let successCount = 0;
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    try {
                        const fileName = file.name;
                        
                        const existing = resources.find(r => r.alias === fileName && !r.directory);
                        if (existing) {
                            try {
                                const deleteUrl = existing.id
                                    ? `${connection.baseUrl}/resources/${existing.id}`
                                    : `${connection.baseUrl}/resources?fullName=${encodeURIComponent(existing.fullName)}`;
                                await httpFetch(deleteUrl, { method: 'DELETE', headers: { 'token': connection.token } });
                            } catch (e) {}
                        }
                        
                        const formData = new FormData();
                        formData.append('type', 'FILE');
                        formData.append('name', fileName);
                        formData.append('currentDir', currentPath || '');
                        formData.append('file', file);

                        const response = await fetch(`${connection.baseUrl}/resources`, {
                            method: 'POST',
                            headers: { 'token': connection.token },
                            body: formData
                        });
                        const parsed = await response.json();
                        
                        if (parsed.code === 0) successCount++;
                        else toast({ title: `${fileName} ${t('dolphinScheduler.uploadFailed')}`, description: parsed.msg, variant: 'destructive' });
                    } catch (err) {}
                }
                
                if (successCount > 0) {
                    toast({ title: t('dolphinScheduler.uploadedSuccessCountFiles', { successCount }), variant: 'success' });
                    fetchResources();
                }
                setUploading(false);
            };
            input.click();
        }
    };

    const handleUploadSingle = async (resource: DSResource) => {
        if (!connection) return;
        const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
        
        if (isTauri) {
            try {
                const files = await open({ multiple: false });
                if (!files) return;
                
                setUploading(true);
                const filePath = Array.isArray(files) ? files[0] : files;
                const content = await readFile(filePath);
                const fileData = Array.from(content);
                
                try {
                    const deleteUrl = resource.id != null
                        ? `${connection.baseUrl}/resources/${resource.id}`
                        : `${connection.baseUrl}/resources?fullName=${encodeURIComponent(resource.fullName)}`;
                    await httpFetch(deleteUrl, { method: 'DELETE', headers: { 'token': connection.token } });
                } catch (e) {}
                
                const url = `${connection.baseUrl}/resources`;
                const result: any = await invoke('http_upload', {
                    url, headers: { 'token': connection.token }, fileName: resource.alias, fileData,
                    formFields: { type: 'FILE', name: resource.alias, currentDir: currentPath || '' }
                });
                const parsed = JSON.parse(result.body);
                
                if (parsed.code === 0) {
                    toast({ title: t('dolphinScheduler.uploadedSuccessfully'), variant: 'success' });
                    fetchResources();
                } else {
                    toast({ title: t('dolphinScheduler.uploadFailed'), description: parsed.msg, variant: 'destructive' });
                }
            } catch (err: any) {
                toast({ title: t('dolphinScheduler.uploadFailed'), description: err.message, variant: 'destructive' });
            } finally {
                setUploading(false);
            }
        } else {
            // Web 模式下单文件覆盖上传
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = false;
            input.onchange = async (e: any) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                setUploading(true);
                const file = files[0];
                try {
                    try {
                        const deleteUrl = resource.id != null
                            ? `${connection.baseUrl}/resources/${resource.id}`
                            : `${connection.baseUrl}/resources?fullName=${encodeURIComponent(resource.fullName)}`;
                        await httpFetch(deleteUrl, { method: 'DELETE', headers: { 'token': connection.token } });
                    } catch (e) {}
                    
                    const formData = new FormData();
                    formData.append('type', 'FILE');
                    formData.append('name', resource.alias);
                    formData.append('currentDir', currentPath || '');
                    formData.append('file', file, resource.alias);

                    const response = await fetch(`${connection.baseUrl}/resources`, {
                        method: 'POST',
                        headers: { 'token': connection.token },
                        body: formData
                    });
                    const parsed = await response.json();
                    
                    if (parsed.code === 0) {
                        toast({ title: t('dolphinScheduler.uploadedSuccessfully'), variant: 'success' });
                        fetchResources();
                    } else {
                        toast({ title: t('dolphinScheduler.uploadFailed'), description: parsed.msg, variant: 'destructive' });
                    }
                } catch (err: any) {
                    toast({ title: t('dolphinScheduler.uploadFailed'), description: err.message, variant: 'destructive' });
                } finally {
                    setUploading(false);
                }
            };
            input.click();
        }
    };

    const handleGetFileContent = async (resource: DSResource) => {
        if (!connection) return '';
        try {
            let viewContent = '';
            if (resource.id != null) {
                const viewUrl = `${connection.baseUrl}/resources/${resource.id}/view-content?skipLineNum=0&limit=100000`;
                const response = await httpFetch(viewUrl, { method: 'GET', headers: { 'token': connection.token } });
                const result = await response.json();
                if (result.code === 0) viewContent = typeof result.data === 'string' ? result.data : (result.data?.content ?? '');
            } else {
                const viewUrl = `${connection.baseUrl}/resources/view?skipLineNum=0&limit=-1&fullName=${encodeURIComponent(resource.fullName)}&tenantCode=`;
                const response = await httpFetch(viewUrl, { method: 'GET', headers: { 'token': connection.token } });
                const responseText = await response.text();
                const result = JSON.parse(responseText);
                if (result.code === 0) viewContent = typeof result.data === 'string' ? result.data : (result.data?.content ?? '');
            }
            return viewContent;
        } catch (err) {
            throw err;
        }
    };

    const handleSaveFileContent = async (resource: DSResource, content: string) => {
        if (!connection) return false;
        try {
            // 尝试先删除原文件（兼容高低版本）
            try {
                const deleteUrl = resource.id != null
                    ? `${connection.baseUrl}/resources/${resource.id}`
                    : `${connection.baseUrl}/resources?fullName=${encodeURIComponent(resource.fullName)}`;
                await httpFetch(deleteUrl, { method: 'DELETE', headers: { 'token': connection.token } });
            } catch (ignore) {
                // 删除可能因文件不存在而失败，忽略它继续尝试上传覆盖
            }

            const encoder = new TextEncoder();
            const fileData = Array.from(encoder.encode(content));
            
            const uploadUrl = `${connection.baseUrl}/resources`;
            const result: any = await invoke('http_upload', {
                url: uploadUrl, headers: { 'token': connection.token }, fileName: resource.alias, fileData,
                formFields: { type: 'FILE', name: resource.alias, currentDir: currentPath || '' }
            });
            const parsed = JSON.parse(result.body);
            
            if (parsed.code === 0) {
                toast({ title: t('dolphinScheduler.savedSuccessfully'), variant: 'success' });
                fetchResources();
                return true;
            } else {
                toast({ title: t('dolphinScheduler.saveFailed'), description: parsed.msg, variant: 'destructive' });
                return false;
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.saveFailed'), description: err.message, variant: 'destructive' });
            return false;
        }
    };

    // 文件与目录判空 (主要供 delete 判断使用)
    const checkFolderEmpty = async (fullName: string) => {
        if (!connection) return false;
        try {
            const url = `${connection.baseUrl}/resources?fullName=${encodeURIComponent(fullName)}&tenantCode=&type=FILE&searchVal=&pageNo=1&pageSize=1`;
            const response = await httpFetch(url, { method: 'GET', headers: { 'token': connection.token } });
            const result = await response.json();
            const childCount = result.data?.total || (result.data?.totalList?.length) || 0;
            return childCount === 0;
        } catch (err) {
            return false;
        }
    }

    return {
        resources, loading, total, pageNo, pageSize, setPageNo,
        currentPath, pathHistory, searchTerm, setSearchTerm, 
        selectedIds, setSelectedIds, uploading, downloading,
        fetchResources, handleNavigate, handlePathClick, handleSelectAll, handleSelect,
        handleCreateFolder, handleCreateFile, handleRename, handleDelete,
        handleDownloadSingle, handleBatchDownload, handleUpload, handleUploadSingle,
        handleGetFileContent, handleSaveFileContent, checkFolderEmpty
    };
};
