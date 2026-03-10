import React from 'react';
import { ToastProvider } from '../common/Toast';
import { useViewMode } from '../../store/globalStore';
import { useExcelToSql } from './hooks/useExcelToSql';
import { TemplateListView } from './components/TemplateListView';
import { TemplateEditorView } from './components/TemplateEditorView';

export const ExcelToSql: React.FC = () => {
    return (
        <ToastProvider>
            <ExcelToSqlContent />
        </ToastProvider>
    );
};

const ExcelToSqlContent: React.FC = () => {
    const editorState = useExcelToSql();
    const viewMode = useViewMode();

    if (!editorState.activeTemplate) {
        return (
            <TemplateListView
                templates={editorState.templates}
                viewMode={viewMode}
                handleSwitchTemplate={editorState.handleSwitchTemplate}
                handleAddNew={editorState.handleAddNew}
                handleDeleteTemplate={editorState.handleDeleteTemplate}
                deleteId={editorState.deleteId}
                confirmDelete={editorState.confirmDelete}
                setDeleteId={editorState.setDeleteId}
            />
        );
    }

    return <TemplateEditorView editorState={editorState} />;
};