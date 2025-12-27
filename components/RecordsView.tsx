
import React from 'react';
import { CostsManager } from './CostsManager';
import { CostItem, Task } from '../types';

interface RecordsViewProps {
    costs: CostItem[];
    onAddCost: (cost: CostItem) => void;
    onUpdateCost: (cost: CostItem) => void;
    onDeleteCost: (id: string) => void;
    pendingTask?: Task | null;
    onClearPendingTask?: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = (props) => {
    return (
        <div className="h-full bg-white md:rounded-3xl shadow-sm overflow-hidden p-4">
            <div className="flex flex-col gap-2 mb-4">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Registros</h1>
                <p className="text-xs text-gray-500 font-medium">Controle de Saídas</p>
            </div>
            <CostsManager
                {...props}
                initialTab="records"
                hideTabSwitcher={true}
                hideValues={true}
                hideHeader={true}
            />
        </div>
    );
};
