
import React, { useState, useMemo } from 'react';
import { Plus, Calendar, DollarSign, CheckCircle, Trash2, AlertTriangle, Search, Database, Lock, ChevronLeft, ChevronRight, Edit2, Copy, RefreshCcw } from 'lucide-react';
import { Task, CostItem } from '../types';

interface MonthlyExpensesViewProps {
    tasks: Task[];
    costs: CostItem[];
    onAddTask: (task: Task) => void;
    onUpdateTask?: (task: Task) => void;
    onToggleTask: (id: string, currentStatus: boolean, task: Task) => void;
    onDeleteTask: (id: string) => void;
    onDeleteCost?: (id: string) => void;
}

export const MonthlyExpensesView: React.FC<MonthlyExpensesViewProps> = ({
    tasks,
    costs,
    onAddTask,
    onUpdateTask,
    onToggleTask,
    onDeleteTask,
    onDeleteCost
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Date Helpers ---
    const getMonthName = (date: Date) => date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const getYear = (date: Date) => date.getFullYear().toString();

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (viewMode === 'monthly') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const parseDateHelper = (dateStr?: string) => {
        if (!dateStr) return 0;
        if (dateStr.includes('-')) return new Date(dateStr).getTime(); // ISO
        if (dateStr.includes('/')) { // BR
            const [d, m, y] = dateStr.split('/');
            return new Date(`${y}-${m}-${d}`).getTime();
        }
        return new Date(dateStr).getTime();
    };

    // --- Data Processing ---
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
            title: c.category,
            amount: c.amount,
            date: c.date,
            completed: true, // Costs are assumed recorded/paid
            original: c
        }));

        const all = [...billTasks, ...costItems].sort((a, b) => {
            const d1 = parseDateHelper(a.date);
            const d2 = parseDateHelper(b.date);
            return d2 - d1;
        });

        // Current Filter Context
        const targetMonth = currentDate.getMonth();
        const targetYear = currentDate.getFullYear();

        return all.filter(item => {
            const itemDate = new Date(parseDateHelper(item.date));
            if (viewMode === 'monthly') {
                return itemDate.getMonth() === targetMonth && itemDate.getFullYear() === targetYear;
            } else {
                return itemDate.getFullYear() === targetYear;
            }
        });

    }, [tasks, costs, viewMode, currentDate]);

    const filteredItems = unifiedItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [recurrence, setRecurrence] = useState<'mensal' | 'unico'>('mensal');
    const [createSixMonths, setCreateSixMonths] = useState(false);

    const openModal = (taskToEdit?: Task) => {
        if (taskToEdit) {
            setEditingId(taskToEdit.id);
            setTitle(taskToEdit.title);
            setAmount(taskToEdit.amount?.toString() || '');
            setDueDate(taskToEdit.dueDate || '');
            setRecurrence(taskToEdit.recurrence || 'mensal');
            setCreateSixMonths(false);
        } else {
            setEditingId(null);
            setTitle('');
            setAmount('');
            setDueDate(new Date().toISOString().split('T')[0]);
            setRecurrence('mensal');
            setCreateSixMonths(false);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (!title.trim() || !amount || !dueDate) return;

        const val = parseFloat(amount);

        if (editingId && onUpdateTask) {
            // Update
            const updatedTask: Task = {
                ...(filteredItems.find(i => i.id === editingId)?.original as Task),
                title,
                amount: val,
                dueDate,
                recurrence
            };
            onUpdateTask(updatedTask);
        } else {
            // Create
            if (createSixMonths && recurrence === 'mensal') {
                // Loop 6 times
                let baseDate = new Date(dueDate);
                for (let i = 0; i < 6; i++) {
                    const nextDate = new Date(baseDate);
                    nextDate.setMonth(baseDate.getMonth() + i);
                    const dateStr = nextDate.toISOString().split('T')[0];

                    const newBill: Task = {
                        id: `bill_${Date.now()}_${i}`,
                        title: `${title} (${i + 1}/6)`,
                        category: 'Outros',
                        priority: 'Alta',
                        completed: false,
                        createdAt: new Date().toISOString(),
                        isBill: true,
                        amount: val,
                        dueDate: dateStr,
                        recurrence
                    };
                    onAddTask(newBill);
                }
            } else {
                // Single Create
                const newBill: Task = {
                    id: `bill_${Date.now()}`,
                    title,
                    category: 'Outros',
                    priority: 'Alta',
                    completed: false,
                    createdAt: new Date().toISOString(),
                    isBill: true,
                    amount: val,
                    dueDate,
                    recurrence
                };
                onAddTask(newBill);
            }
        }
        setIsModalOpen(false);
    };

    // --- Render Helpers ---
    const formatCurrency = (val?: number) => val ? `R$ ${val.toFixed(2).replace('.', ',')}` : '-';
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        if (dateStr.includes('/')) {
            const [d, m] = dateStr.split('/');
            return `${d}/${m}`;
        }
        if (dateStr.includes('-')) {
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}`;
        }
        return dateStr;
    };

    const totalPending = unifiedItems.filter(i => i.type === 'bill' && !i.completed).reduce((acc, i) => acc + i.amount, 0);
    const totalPaid = unifiedItems.filter(i => i.completed).reduce((acc, i) => acc + i.amount, 0);

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Top Controls: View Mode & Date Nav */}
            <div className="flex justify-between items-center bg-gray-100 p-1.5 rounded-2xl">
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mensal
                    </button>
                    <button
                        onClick={() => setViewMode('annual')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === 'annual' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Anual
                    </button>
                </div>
                <div className="flex items-center gap-3 px-2">
                    <button onClick={() => navigateDate('prev')} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronLeft size={16} className="text-gray-500" /></button>
                    <span className="text-sm font-bold text-gray-800 w-32 text-center capitalize">{viewMode === 'monthly' ? getMonthName(currentDate) : getYear(currentDate)}</span>
                    <button onClick={() => navigateDate('next')} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronRight size={16} className="text-gray-500" /></button>
                </div>
            </div>

            {/* Header / Summary */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Gastos Mensais</h2>
                    <p className="text-gray-400 text-sm font-medium">Contas e Custos Registrados</p>
                </div>
                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">A Pagar ({viewMode === 'monthly' ? 'Mês' : 'Ano'})</p>
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
                    onClick={() => openModal()}
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
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-medium text-sm">
                                    Nenhum registro encontrado para {viewMode === 'monthly' ? getMonthName(currentDate) : getYear(currentDate)}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item, idx) => {
                                const isOverdue = item.type === 'bill' && !item.completed && item.date && new Date(parseDateHelper(item.date)) < new Date(new Date().setHours(0, 0, 0, 0));

                                return (
                                    <tr key={`${item.type}_${item.id}_${idx}`} className={`group hover:bg-gray-50/50 transition-colors ${item.completed ? 'opacity-80' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 font-bold text-sm ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                                                <Calendar size={14} />
                                                {formatDate(item.date)}
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
                                            {item.completed ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-[10px] font-bold border border-green-200 uppercase">
                                                    Pago
                                                </span>
                                            ) : isOverdue ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 uppercase">
                                                    Atrasado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-[10px] font-bold border border-yellow-200 uppercase">
                                                    Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.type === 'cost' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold border border-gray-200">
                                                    <Database size={10} /> Registrado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                                                    <CheckCircle size={10} /> Lembrete
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {item.type === 'bill' ? (
                                                    <>
                                                        <button
                                                            onClick={() => openModal(item.original as Task)}
                                                            className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center transition-all bg-white"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
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
                                                    onDeleteCost ? (
                                                        <button
                                                            onClick={() => onDeleteCost(item.id)}
                                                            className="w-8 h-8 rounded-full border border-transparent hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center transition-all opacity-50 hover:opacity-100"
                                                            title="Excluir Custo"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 flex items-center justify-center text-gray-300">
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
                        <h3 className="text-lg font-bold text-gray-900 mb-6">{editingId ? 'Editar Lembrete' : 'Novo Lembrete de Conta'}</h3>

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

                            {/* Recorrente 6x Option (Only for new, monthly tasks) */}
                            {!editingId && recurrence === 'mensal' && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer" onClick={() => setCreateSixMonths(!createSixMonths)}>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${createSixMonths ? 'bg-blue-600 border-blue-600' : 'border-blue-300 bg-white'}`}>
                                        {createSixMonths && <CheckCircle size={12} className="text-white" />}
                                    </div>
                                    <label className="text-sm font-bold text-blue-800 cursor-pointer pointer-events-none">
                                        Repetir para próximos 6 meses
                                    </label>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button onClick={handleSubmit} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
                                    {editingId ? 'Salvar' : 'Adicionar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
