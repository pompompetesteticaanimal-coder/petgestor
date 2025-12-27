
import React, { useState, useMemo } from 'react';
import { Plus, Calendar, DollarSign, CheckCircle, Trash2, AlertTriangle, Search, Database, Lock } from 'lucide-react';
import { Task, CostItem } from '../types';

interface MonthlyExpensesViewProps {
    tasks: Task[];
    costs: CostItem[];
    onAddTask: (task: Task) => void;
    onToggleTask: (id: string, currentStatus: boolean, task: Task) => void;
    onDeleteTask: (id: string) => void;
    onDeleteCost?: (id: string) => void;
}

export const MonthlyExpensesView: React.FC<MonthlyExpensesViewProps> = ({
    tasks,
    costs,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onDeleteCost
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Unified Data Model
    const unifiedItems = useMemo(() => {
        const billTasks = tasks.filter(t => t.isBill).map(t => ({
            id: t.id,
            type: 'bill' as const,
            title: t.title,
            amount: t.amount || 0,
            date: t.dueDate,
            completed: t.completed,
            original: t
        }));

        const costItems = costs.map(c => ({
            id: c.id,
            type: 'cost' as const,
            title: c.category, // Costs use category as title usually
            amount: c.amount,
            date: c.date,
            completed: true, // Costs are assumed paid/recorded
            original: c
        }));

        return [...billTasks, ...costItems].sort((a, b) => {
            // Sort by Date Descending (Newest first)
            const d1 = new Date(a.date || 0).getTime();
            const d2 = new Date(b.date || 0).getTime();
            return d2 - d1;
        });
    }, [tasks, costs]);

    const filteredItems = unifiedItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [recurrence, setRecurrence] = useState<'mensal' | 'unico'>('mensal');

    const handleSubmit = () => {
        if (!title.trim() || !amount || !dueDate) return;

        const newBill: Task = {
            id: `bill_${Date.now()}`,
            title,
            category: 'Outros', // Default category for bills
            priority: 'Alta',
            completed: false,
            createdAt: new Date().toISOString(),
            isBill: true,
            amount: parseFloat(amount),
            dueDate,
            recurrence
        };

        onAddTask(newBill);
        setTitle('');
        setAmount('');
        setDueDate('');
        setIsModalOpen(false);
    };

    const formatCurrency = (val?: number) => val ? `R$ ${val.toFixed(2).replace('.', ',')}` : '-';
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    // Calculate totals
    const totalPending = unifiedItems.filter(i => i.type === 'bill' && !i.completed).reduce((acc, i) => acc + i.amount, 0);
    const totalPaid = unifiedItems.filter(i => i.completed).reduce((acc, i) => acc + i.amount, 0);

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header / Summary */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Gastos Mensais</h2>
                    <p className="text-gray-400 text-sm font-medium">Contas e Custos Registrados</p>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">A Pagar</p>
                        <p className="text-2xl font-black text-red-500">{formatCurrency(totalPending)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pago / Baixado</p>
                        <p className="text-2xl font-black text-green-500">{formatCurrency(totalPaid)}</p>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 font-medium text-gray-600 focus:ring-2 ring-brand-200 outline-none"
                        placeholder="Buscar conta ou custo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gray-900 text-white px-4 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                >
                    <Plus size={18} /> <span className="hidden sm:inline">Lembrete de Conta</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100/50 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descrição / Categoria</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-medium text-sm">
                                    Nenhuma conta ou custo encontrado
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item, idx) => {
                                const isOverdue = item.type === 'bill' && !item.completed && item.date && new Date(item.date) < new Date(new Date().setHours(0, 0, 0, 0));

                                return (
                                    <tr key={`${item.type}_${item.id}_${idx}`} className={`group hover:bg-gray-50/50 transition-colors ${item.completed ? 'opacity-80' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 font-bold text-sm ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                                                <Calendar size={14} />
                                                {formatDate(item.date)}
                                                {isOverdue && <AlertTriangle size={12} />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                                                {item.type === 'bill' && (item.original as Task).recurrence && (
                                                    <span className="text-[9px] text-gray-400 uppercase">{(item.original as Task).recurrence}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold text-sm ${item.type === 'cost' ? 'text-gray-600' : 'text-gray-800'}`}>
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.type === 'cost' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                                                    <Database size={10} /> Registrado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-[10px] font-bold border border-yellow-100">
                                                    <CheckCircle size={10} /> Lembrete
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {item.type === 'bill' ? (
                                                    <>
                                                        <button
                                                            onClick={() => onToggleTask(item.id, item.completed, item.original as Task)}
                                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-300 hover:border-green-500 hover:text-green-500'}`}
                                                            title={item.completed ? "Marcar como pendente" : "Marcar como pago"}
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteTask(item.id)}
                                                            className="w-8 h-8 rounded-full border border-transparent hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center transition-all"
                                                            title="Excluir lembrete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    // Cost items are read-only here, or maybe allowed to delete if requested.
                                                    // User said "show all costs", didn't explicitly say "manage".
                                                    // I'll show a lock for now to indicate it comes from the other system, 
                                                    // or if delete is provided, allow it.
                                                    onDeleteCost ? (
                                                        <button
                                                            onClick={() => onDeleteCost(item.id)}
                                                            className="w-8 h-8 rounded-full border border-transparent hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center transition-all opacity-50 hover:opacity-100"
                                                            title="Excluir Custo (Atenção: Remove do registro oficial)"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 flex items-center justify-center text-gray-300" title="Registro oficial (Gerenciar na aba Custos)">
                                                            <Lock size={14} />
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 animate-scale-up shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Novo Lembrete de Conta</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Descrição</label>
                                <input className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:ring-2 ring-gray-200"
                                    placeholder="Ex: Aluguel" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Valor</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                        <input type="number" step="0.01" className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 font-semibold text-gray-800 outline-none focus:ring-2 ring-gray-200"
                                            placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Vencimento</label>
                                    <input type="date" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:ring-2 ring-gray-200"
                                        value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Recorrência</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => setRecurrence('mensal')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${recurrence === 'mensal' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Mensal</button>
                                    <button onClick={() => setRecurrence('unico')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${recurrence === 'unico' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Único</button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button onClick={handleSubmit} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">Adicionar Lembrete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
