export interface ImportProfile {
    id: string;
    title: string;
    targetTable?: string;
    connId?: string;
    db?: string;
    headerRowIdx: number;
    mappings: ColumnMapping[];
    updatedAt: number;
}

export interface ColumnMapping {
    dbColumn: string;
    dbType: string;
    excelHeader: string;
    isPk: boolean;
    comment?: string;
    customValue?: string;
}
