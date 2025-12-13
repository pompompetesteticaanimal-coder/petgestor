import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Plus, Trash2, Edit2, X, Check, Search, PieChart as PieChartIcon, BarChart2
} from 'lucide-react';
import { CostItem } from '../types';

interface CostsManagerProps {
    costs: CostItem[];
    onAddCost: (cost: CostItem) => void;
    onUpdateCost: (cost: CostItem) => void;
    onDeleteCost: (id: string) => void;
}

export const CostsManager: React.FC<CostsManagerProps> = ({ costs, onAddCost, onUpdateCost, onDeleteCost }) => {
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<CostItem | null>(null);

    // Form State
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formCategory, setFormCategory] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formStatus, setFormStatus] = useState<'Pago' | 'Pendente'>('Pago');

    // Filter Helper
    const isOperationalCost = (c: CostItem) => {
        const cat = c.category?.toLowerCase() || '';
        return cat !== 'sócio' && cat !== 'socio' && !cat.includes('extraordinário') && !cat.includes('extraordinario');
    };

    const handleOpenForm = (cost?: CostItem) => {
        if (cost) {
            setEditingCost(cost);
            setFormDate(cost.date);
            setFormCategory(cost.category);
            setFormAmount(cost.amount.toString());
            setFormStatus((cost.status as 'Pago' | 'Pendente') || 'Pago');
        } else {
            setEditingCost(null);
            setFormDate(new Date().toISOString().split('T')[0]);
            setFormCategory('');
            setFormAmount('');
            setFormStatus('Pago');
        }
        setIsFormOpen(true);
    };

    const handleSave = () => {
        if (!formCategory || !formAmount || !formDate) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        const amount = parseFloat(formAmount);
        const [y, m, d] = formDate.split('-').map(Number);

        // Month name for display/logic if needed (though we rely on date usually)
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthName = monthNames[m - 1];

        const newCost: CostItem = {
            id: editingCost ? editingCost.id : `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: formDate,
            category: formCategory,
            amount: amount,
            status: formStatus,
            month: monthName,
            week: 'WEEK_CALC_PLACEHOLDER' // Ideally calculate logic week if strictly needed, or ignore
        };

        if (editingCost) {
            onUpdateCost(newCost);
        } else {
            onAddCost(newCost);
        }
        setIsFormOpen(false);
    };

    // --- Analytics Logic ---
    const filterCosts = () => {
        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-');
            return costs.filter(c => {
                const d = new Date(c.date);
                // Fix timezone offset issue by strict string parsing or UTC handling? 
                // Simple approach: Date parts match.
                return d.getFullYear() === parseInt(y) && d.getMonth() === (parseInt(m) - 1);
            });
        }
        return costs.filter(c => new Date(c.date).getFullYear() === selectedYear);
    };

    const filteredCosts = useMemo(() => filterCosts().filter(isOperationalCost), [costs, viewMode, selectedYear, selectedMonth]);
    const totalCost = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const paidCost = filteredCosts.filter(c => c.status === 'Pago').reduce((acc, c) => acc + c.amount, 0);
    const pendingCost = filteredCosts.filter(c => c.status !== 'Pago').reduce((acc, c) => acc + c.amount, 0);

    const getCostByCategory = () => {
        const counts: Record<string, number> = {};
        filteredCosts.forEach(c => {
            const cat = c.category || 'Outros';
            counts[cat] = (counts[cat] || 0) + c.amount;
        });
        const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // Top 5 + Others
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
        if (others > 0) top5.push({ name: 'Outros', value: others });
        return top5;
    };

    const getCostByMonth = () => {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 }));

        const yearCosts = costs.filter(c => new Date(c.date).getFullYear() === selectedYear && isOperationalCost(c));
        yearCosts.forEach(c => {
            const d = new Date(c.date);
            if (!isNaN(d.getTime())) {
                data[d.getMonth()].value += c.amount;
            }
        });

        // Filter for display based on year (e.g., if current year is 2025 and we started later?) 
        // For standard UI, showing all 12 months is fine.
        return data;
    };

    const COLORS = ['#e11d48', '#2563eb', '#9333ea', '#ea580c', '#16a34a', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0 h-full overflow-y-auto">
            {/* Header / Controls */}
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-red-100 p-2.5 rounded-xl text-red-600"><TrendingDown size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight">Gestão de Despesas</h2>
                        <p className="text-xs text-gray-500 font-medium">Contas e Custos Operacionais</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto bg-gray-100/50 p-1.5 rounded-xl">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Mensal
                    </button>
                    <button
                        onClick={() => setViewMode('yearly')}
                        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'yearly' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Anual
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {viewMode === 'monthly' ? (
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 ring-brand-200 font-bold"
                        />
                    ) : (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 ring-brand-200 font-bold"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}
                    <button onClick={() => handleOpenForm()} className="bg-brand-600 text-white p-2.5 rounded-xl hover:bg-brand-700 hover:scale-105 active:scale-95 transition shadow-lg shadow-brand-200"><Plus size={20} /></button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={80} /></div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total (Período)</p>
                    <h3 className="text-3xl font-black text-gray-800 tracking-tight">R$ {totalCost.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between border-l-4 border-l-green-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pago</p>
                    <h3 className="text-2xl font-black text-green-600">R$ {paidCost.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between border-l-4 border-l-orange-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pendente</p>
                    <h3 className="text-2xl font-black text-orange-500">R$ {pendingCost.toFixed(2)}</h3>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend (Only visible in Yearly mode ideally, or adaptable) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart2 size={16} className="text-brand-500" /> Evolução Mensal</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getCostByMonth()}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Categories Pie */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChartIcon size={16} className="text-blue-500" /> Por Categoria</h3>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={getCostByCategory()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {getCostByCategory().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -ml-20">
                            <span className="text-xs font-bold text-gray-400">Categorias</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List of Expenses */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Detalhamento</h3>
                    <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">{filteredCosts.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Data</th>
                                <th className="px-6 py-3">Categoria</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCosts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">Nenhum custo encontrado para este período.</td>
                                </tr>
                            ) : (
                                filteredCosts.map((cost) => (
                                    <tr key={cost.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-gray-600">
                                            {new Date(cost.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-bold">{cost.category}</span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            R$ {cost.amount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {cost.status === 'Pago' ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit"><Check size={10} /> Pago</span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full w-fit"><DollarSign size={10} /> Pendente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenForm(cost)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Edit2 size={14} /></button>
                                                <button onClick={() => { if (confirm('Excluir?')) onDeleteCost(cost.id) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{editingCost ? 'Editar Custo' : 'Novo Custo'}</h3>
                            <button onClick={() => setIsFormOpen(false)} className="bg-gray-50 text-gray-400 p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Descrição / Categoria</label>
                                <input
                                    list="categories"
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                    className="w-full bg-gray-50 border-none p-3 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none"
                                    placeholder="Ex: Aluguel, Água, Produtos..."
                                />
                                <datalist id="categories">
                                    <option value="Aluguel" />
                                    <option value="Água" />
                                    <option value="Luz" />
                                    <option value="Insumos" />
                                    <option value="Produtos" />
                                    <option value="Manutenção" />
                                    <option value="Marketing" />
                                </datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Valor (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formAmount}
                                        onChange={e => setFormAmount(e.target.value)}
                                        className="w-full bg-gray-50 border-none p-3 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Data</label>
                                    <input
                                        type="date"
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
                                        className="w-full bg-gray-50 border-none p-3 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Status</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFormStatus('Pago')}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${formStatus === 'Pago' ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-gray-50 text-gray-400'}`}
                                    >
                                        Pago
                                    </button>
                                    <button
                                        onClick={() => setFormStatus('Pendente')}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2 ${formStatus === 'Pendente' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-transparent bg-gray-50 text-gray-400'}`}
                                    >
                                        Pendente
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl mt-4 hover:bg-brand-700 shadow-xl shadow-brand-200 active:scale-95 transition-all"
                            >
                                {editingCost ? 'Salvar Alterações' : 'Adicionar Gasto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
