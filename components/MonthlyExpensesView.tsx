
import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, CheckCircle, Trash2, AlertTriangle, Search } from 'lucide-react';
import { Task } from '../types';
import { supabase } from '../services/supabaseClient';

interface MonthlyExpensesViewProps {
    tasks: Task[];
    onAddTask: (task: Task) => void;
    onToggleTask: (id: string, currentStatus: boolean, task: Task) => void;
    onDeleteTask: (id: string) => void;
}

export const MonthlyExpensesView: React.FC<MonthlyExpensesViewProps> = ({ tasks, onAddTask, onToggleTask, onDeleteTask }) => {
    // Only show bills
    const [searchTerm, setSearchTerm] = useState('');
    const bills = tasks.filter(t => t.isBill).sort((a, b) => {
        // Sort by Due Date
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const filteredBills = bills.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()));

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
            category: 'Outros', // Default category for bills, or could be 'Contas'
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

    const totalPending = bills.filter(b => !b.completed).reduce((acc, b) => acc + (b.amount || 0), 0);

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header / Summary */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Contas a Pagar</h2>
                    <p className="text-gray-400 text-sm font-medium">Controle seus gastos mensais pessoais</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pendente</p>
                    <p className="text-2xl font-black text-red-500">{formatCurrency(totalPending)}</p>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 font-medium text-gray-600 focus:ring-2 ring-brand-200 outline-none"
                        placeholder="Buscar conta..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gray-900 text-white px-4 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                >
                    <Plus size={18} /> <span className="hidden sm:inline">Nova Conta</span>
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-[20px] shadow-sm border border-gray-100/50 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vencimento</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredBills.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-medium text-sm">
                                    Nenhuma conta encontrada
                                </td>
                            </tr>
                        ) : (
                            filteredBills.map(bill => {
                                const isOverdue = !bill.completed && bill.dueDate && new Date(bill.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                                return (
                                    <tr key={bill.id} className={`group hover:bg-gray-50/50 transition-colors ${bill.completed ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-2 font-bold text-sm ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                                                <Calendar size={14} />
                                                {formatDate(bill.dueDate)}
                                                {isOverdue && <AlertTriangle size={12} />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800 text-sm">{bill.title}</p>
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-bold uppercase">{bill.recurrence}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-800 text-sm">{formatCurrency(bill.amount)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onToggleTask(bill.id, bill.completed, bill)}
                                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${bill.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-300 hover:border-green-500 hover:text-green-500'}`}
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteTask(bill.id)}
                                                    className="w-8 h-8 rounded-full border border-transparent hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
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
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Nova Conta</h3>

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
                                <button onClick={handleSubmit} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">Adicionar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
