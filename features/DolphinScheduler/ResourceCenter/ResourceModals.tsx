import React, { useState, useEffect } from 'react';
import { FolderPlus, FilePlus, Loader2, Pencil, Edit, X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DSResource } from './types';

// --- Create Modal ---
export const CreateResourceModal = ({ 
    isOpen, type, onClose, onCreateFolder, onCreateFile 
}: { 
    isOpen: boolean; type: 'folder' | 'file'; onClose: () => void; 
    onCreateFolder: (name: string) => Promise<boolean>;
    onCreateFile: (name: string, content: string) => Promise<boolean>;
}) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');
    const [fileContent, setFileContent] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNewName('');
            setFileContent('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        setCreating(true);
        let success;
        if (type === 'folder') {
            success = await onCreateFolder(newName);
        } else {
            success = await onCreateFile(newName, fileContent);
        }
        setCreating(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[480px] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    {type === 'folder' ? <FolderPlus className="mr-2 text-amber-500" /> : <FilePlus className="mr-2 text-blue-500" />}
                    {type === 'folder' ? t('dolphinScheduler.createFolder') : t('dolphinScheduler.createFile')}
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                            {t('dolphinScheduler.name')}
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={type === 'folder' ? t('dolphinScheduler.pleaseEnterFolderName') : t('dolphinScheduler.pleaseEnterFileName')}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    {type === 'file' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                                {t('dolphinScheduler.contentOptional')}
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
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        {t('dolphinScheduler.cancel')}
                    </button>
                    <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                        {creating && <Loader2 size={16} className="mr-2 animate-spin" />}
                        {t('dolphinScheduler.create')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Rename Modal ---
export const RenameResourceModal = ({ 
    isOpen, resource, onClose, onRename 
}: { 
    isOpen: boolean; resource: DSResource | null; onClose: () => void; 
    onRename: (resource: DSResource, newName: string) => Promise<boolean>;
}) => {
    const { t } = useTranslation();
    const [renameName, setRenameName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && resource) setRenameName(resource.alias);
    }, [isOpen, resource]);

    if (!isOpen || !resource) return null;

    const handleRename = async () => {
        setSaving(true);
        const success = await onRename(resource, renameName);
        setSaving(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[400px] shadow-2xl">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                    <Pencil className="mr-2 text-blue-500" size={20} />
                    {t('dolphinScheduler.rename')}
                </h3>
                <input
                    type="text"
                    value={renameName}
                    onChange={e => setRenameName(e.target.value)}
                    placeholder={resource.directory ? t('dolphinScheduler.pleaseEnterFolderName') : t('dolphinScheduler.pleaseEnterFileName')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        {t('dolphinScheduler.cancel')}
                    </button>
                    <button onClick={handleRename} disabled={saving} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                        {saving ? <Loader2 size={16} className="mr-1 animate-spin" /> : t('dolphinScheduler.oK')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Edit File Modal ---
export const EditFileModal = ({ 
    isOpen, resource, onClose, onSave, onGetContent 
}: { 
    isOpen: boolean; resource: DSResource | null; onClose: () => void; 
    onSave: (resource: DSResource, content: string) => Promise<boolean>;
    onGetContent: (resource: DSResource) => Promise<string>;
}) => {
    const { t } = useTranslation();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && resource) {
            setLoading(true);
            onGetContent(resource).then(setContent).catch(() => setContent('')).finally(() => setLoading(false));
        }
    }, [isOpen, resource, onGetContent]);

    if (!isOpen || !resource) return null;

    const handleSave = async () => {
        setSaving(true);
        const success = await onSave(resource, content);
        setSaving(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-[800px] h-[600px] shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                        <Edit className="mr-2 text-blue-500" size={20} />
                        {t('dolphinScheduler.editFile')}: {resource.alias}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-amber-500" />
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="flex-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm resize-none"
                    />
                )}
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        {t('dolphinScheduler.cancel')}
                    </button>
                    <button onClick={handleSave} disabled={saving || loading} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center">
                        {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                        {t('dolphinScheduler.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
