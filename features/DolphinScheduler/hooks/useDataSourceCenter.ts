import { useState, useEffect } from 'react';
import { DolphinSchedulerConnection } from '../../../types';
import { httpFetch } from '../../../utils/http';
import { useToast } from '../../common/Toast';
import { useTranslation } from "react-i18next";

export interface DSDataSource {
    id: number;
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    userName?: string;
    connectionParams?: string;
    note?: string;
    createTime?: string;
    updateTime?: string;
}

export const useDataSourceCenter = (connection: DolphinSchedulerConnection) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    
    const [dataSources, setDataSources] = useState<DSDataSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number; name: string }>({ isOpen: false, id: 0, name: '' });
    const [viewModal, setViewModal] = useState<{ isOpen: boolean; dataSource: DSDataSource | null }>({ isOpen: false, dataSource: null });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; dataSource: DSDataSource | null; isEdit: boolean }>({ isOpen: false, dataSource: null, isEdit: false });
    const [formData, setFormData] = useState<Partial<DSDataSource>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDataSources();
    }, [connection, pageNo]);

    const fetchDataSources = async () => {
        setLoading(true);
        try {
            const searchVal = searchTerm ? `&searchVal=${encodeURIComponent(searchTerm)}` : '';
            const url = `${connection.baseUrl}/datasources?pageNo=${pageNo}&pageSize=${pageSize}${searchVal}`;
            
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
                const dataSourceList = result.data?.totalList || result.data || [];
                setDataSources(Array.isArray(dataSourceList) ? dataSourceList : []);
                setTotal(result.data?.total || dataSourceList.length || 0);
            } else {
                toast({ title: t('dolphinScheduler.loadFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            console.error('DataSources fetch error:', err);
            toast({ title: t('dolphinScheduler.loadFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPageNo(1);
        fetchDataSources();
    };

    const handleDelete = async () => {
        try {
            const url = `${connection.baseUrl}/datasources/${confirmDelete.id}`;
            const response = await httpFetch(url, {
                method: 'DELETE',
                headers: { 'token': connection.token }
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: t('dolphinScheduler.deletedSuccessfully'), variant: 'success' });
                fetchDataSources();
            } else {
                toast({ title: t('dolphinScheduler.deleteFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.deleteFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setConfirmDelete({ isOpen: false, id: 0, name: '' });
        }
    };

    const handleCopy = async (ds: DSDataSource) => {
        try {
            await navigator.clipboard.writeText(ds.name);
            toast({ title: t('dolphinScheduler.nameCopied'), variant: 'success' });
        } catch {
            toast({ title: t('dolphinScheduler.copyFailed'), variant: 'destructive' });
        }
    };

    const openEditModal = (ds?: DSDataSource) => {
        if (ds) {
            setFormData({ ...ds });
            setEditModal({ isOpen: true, dataSource: ds, isEdit: true });
        } else {
            setFormData({ type: 'MYSQL', name: '', host: '', port: 3306, database: '', userName: '', note: '' });
            setEditModal({ isOpen: true, dataSource: null, isEdit: false });
        }
    };

    const handleSave = async () => {
        if (!formData.name?.trim()) {
            toast({ title: t('dolphinScheduler.pleaseEnterName'), variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const isEdit = editModal.isEdit && editModal.dataSource;
            const url = isEdit ? `${connection.baseUrl}/datasources/${editModal.dataSource!.id}` : `${connection.baseUrl}/datasources`;
            
            const body = new URLSearchParams();
            body.append('name', formData.name || '');
            body.append('type', formData.type || 'MYSQL');
            body.append('host', formData.host || '');
            body.append('port', String(formData.port || 3306));
            body.append('database', formData.database || '');
            body.append('userName', formData.userName || '');
            body.append('note', formData.note || '');
            if (formData.connectionParams) body.append('connectionParams', formData.connectionParams);

            const response = await httpFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'token': connection.token, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });
            const result = await response.json();
            if (result.code === 0) {
                toast({ title: isEdit ? t('dolphinScheduler.updateSuccess') : t('dolphinScheduler.createSuccess'), variant: 'success' });
                setEditModal({ isOpen: false, dataSource: null, isEdit: false });
                setFormData({});
                fetchDataSources();
            } else {
                toast({ title: t('dolphinScheduler.saveFailed'), description: result.msg, variant: 'destructive' });
            }
        } catch (err: any) {
            toast({ title: t('dolphinScheduler.saveFailed'), description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);
    const filteredDataSources = dataSources.filter(ds =>
        ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ds.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        dataSources, loading, searchTerm, setSearchTerm, pageNo, setPageNo, total, totalPages,
        filteredDataSources,
        confirmDelete, setConfirmDelete, viewModal, setViewModal, editModal, setEditModal,
        formData, setFormData, saving,
        fetchDataSources, handleSearch, handleDelete, handleCopy, openEditModal, handleSave
    };
};
