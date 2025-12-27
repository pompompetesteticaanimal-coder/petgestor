
import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Plus, Trash2, Edit2, X, Check, Search, PieChart as PieChartIcon, BarChart2, Table as TableIcon, LayoutDashboard, ArrowUpRight, ArrowDownRight, AlertTriangle
} from 'lucide-react';
import { CostItem, Task } from '../types';

interface CostsManagerProps {
    costs: CostItem[];
    onAddCost: (cost: CostItem) => void;
    onUpdateCost: (cost: CostItem) => void;
    onDeleteCost: (id: string) => void;
    pendingTask?: Task | null;
    onClearPendingTask?: () => void;
    initialTab?: 'dashboard' | 'records';
    hideTabSwitcher?: boolean;
    hideValues?: boolean;
}

export const CostsManager: React.FC<CostsManagerProps> = ({
    costs,
    onAddCost,
    onUpdateCost,
    onDeleteCost,
    pendingTask,
    onClearPendingTask,
    initialTab = 'dashboard',
    hideTabSwitcher = false,
    hideValues = false
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>(initialTab);
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<CostItem | null>(null);
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formCategory, setFormCategory] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formStatus, setFormStatus] = useState<'Pago' | 'Pendente'>('Pago');
    const [searchTerm, setSearchTerm] = useState('');

    // Start with pending task if present
    useEffect(() => {
        if (pendingTask) {
            setActiveTab('records');
            setEditingCost(null);
            setFormDate(new Date().toISOString().split('T')[0]);
            setFormAmount('');
            setFormStatus('Pago');
            // Map Task Title to Description/Category input
            setFormCategory(pendingTask.title);
            setIsFormOpen(true);

            if (onClearPendingTask) onClearPendingTask();
        }
    }, [pendingTask, onClearPendingTask]);

    // --- HELPER: Safe Date Parsing ---
    const parseDateLocal = (dateString: string) => {
        const [y, m, d] = dateString.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const isOperationalCost = (c: CostItem) => {
        const cat = c.category?.toLowerCase() || '';
        return cat !== 'sócio' && cat !== 'socio' && !cat.includes('extraordinário') && !cat.includes('extraordinario');
    };

    // --- STOCK ALERT LOGIC ---
    const stockAlerts = useMemo(() => {
        const alerts: string[] = [];
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const hasShampooPurchase = costs.some(c => {
            const date = parseDateLocal(c.date);
            const isRecent = date >= thirtyDaysAgo;
            const isInsumo = c.category === 'Insumos';
            const desc = c.category.toLowerCase();
            return isRecent && (desc.includes('shampoo') || (isInsumo && desc.includes('neutro')));
        });

        if (!hasShampooPurchase) {
            alerts.push("Alerta: Nenhuma compra de 'Shampoo Neutro' registrada nos últimos 30 dias.");
        }
        return alerts;
    }, [costs]);

    // --- FORM HANDLERS ---
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
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthName = monthNames[m - 1];

        const newCost: CostItem = {
            id: editingCost ? editingCost.id : `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: formDate,
            category: formCategory,
            amount: amount,
            status: formStatus,
            month: monthName,
            week: `Semana ${Math.ceil(d / 7)}`
        };

        if (editingCost) {
            onUpdateCost(newCost);
        } else {
            onAddCost(newCost);
        }
        setIsFormOpen(false);
    };

    // --- FILTERING & ANALYTICS ---
    const filterCosts = () => {
        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-').map(Number);
            return costs.filter(c => {
                const date = parseDateLocal(c.date);
                return date.getFullYear() === y && date.getMonth() === (m - 1);
            });
        }
        return costs.filter(c => parseDateLocal(c.date).getFullYear() === selectedYear);
    };

    const filteredCosts = useMemo(() => {
        let list = filterCosts().filter(isOperationalCost);
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            list = list.filter(c => c.category.toLowerCase().includes(searchLower) || c.amount.toString().includes(searchTerm));
        }
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [costs, viewMode, selectedYear, selectedMonth, searchTerm]);

    const kpiData = useMemo(() => {
        const total = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
        const paid = filteredCosts.filter(c => c.status === 'Pago').reduce((acc, c) => acc + c.amount, 0);
        const pending = filteredCosts.filter(c => c.status !== 'Pago').reduce((acc, c) => acc + c.amount, 0);
        return { total, paid, pending };
    }, [filteredCosts]);

    const chartsData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredCosts.forEach(c => {
            let cat = c.category || 'Outros';
            if (cat.toLowerCase().includes('luz') || cat.toLowerCase().includes('agua') || cat.toLowerCase().includes('aluguel') || cat.toLowerCase().includes('internet') || cat.toLowerCase().includes('sistema')) cat = 'Fixo';
            else if (cat.toLowerCase().includes('shampoo') || cat.toLowerCase().includes('laços') || cat.toLowerCase().includes('toalha') || cat.toLowerCase().includes('produto') || cat.toLowerCase().includes('insumos')) cat = 'Insumos';
            else if (cat.toLowerCase().includes('manutenção') || cat.toLowerCase().includes('afiar') || cat.toLowerCase().includes('conserto')) cat = 'Manutenção';
            else if (cat.toLowerCase().includes('equipe') || cat.toLowerCase().includes('freelancer') || cat.toLowerCase().includes('pagamento')) cat = 'Equipe'; // New category

            counts[cat] = (counts[cat] || 0) + c.amount;
        });
        const byCategory = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const byMonth = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 }));
        const sourceData = viewMode === 'yearly' ? costs.filter(c => parseDateLocal(c.date).getFullYear() === selectedYear && isOperationalCost(c)) : filteredCosts;

        sourceData.forEach(c => {
            const d = parseDateLocal(c.date);
            byMonth[d.getMonth()].value += c.amount;
        });

        const operationalMonths = viewMode === 'yearly' ? byMonth.slice(7) : byMonth;

        return { byCategory, byMonth: operationalMonths };
    }, [costs, filteredCosts, viewMode, selectedYear]);

    const COLORS = ['#e11d48', '#2563eb', '#9333ea', '#ea580c', '#16a34a', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-20 md:pb-0 h-full overflow-y-auto custom-scrollbar">

            {/* --- ALERT SECTION --- */}
            {stockAlerts.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 animate-slide-down shadow-sm">
                    <div className="bg-orange-100 p-2 rounded-full text-orange-600 flex-shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-orange-800 text-sm">Atenção! Estoque Baixo</h4>
                        {stockAlerts.map((alert, idx) => (
                            <p key={idx} className="text-xs text-orange-700 mt-1 font-medium leading-relaxed">{alert}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TOP BAR --- */}
            <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl shadow-sm border border-white/50 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-gradient-to-br from-red-100 to-rose-50 p-2.5 rounded-2xl text-red-600 shadow-sm border border-red-100">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 tracking-tight">Gestão de Custos</h2>
                        <p className="text-xs text-gray-500 font-medium">Controle Financeiro</p>
                    </div>
                </div>

                <div className="flex p-1.5 bg-gray-100/80 rounded-2xl md:w-auto w-full">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-brand-600 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
                        <LayoutDashboard size={14} /> Visão Geral
                    </button>
                    <button onClick={() => setActiveTab('records')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'records' ? 'bg-white text-brand-600 shadow-md transform scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
                        <TableIcon size={14} /> Registros
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-gray-100/50 p-1 rounded-xl">
                        <button onClick={() => setViewMode('monthly')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'monthly' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>Mês</button>
                        <button onClick={() => setViewMode('yearly')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'yearly' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>Ano</button>
                    </div>
                    {viewMode === 'monthly' ? (
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 ring-brand-200" />
                    ) : (
                        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 ring-brand-200">
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between group h-32">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity"><DollarSign size={100} /></div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">Total Custos</p>
                            <h3 className="text-3xl font-black text-gray-800 tracking-tight">R$ {kpiData.total.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between h-32 border-l-4 border-l-green-500">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Check size={12} /> Pago</p>
                            <h3 className="text-3xl font-black text-green-600 tracking-tight">R$ {kpiData.paid.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-between h-32 border-l-4 border-l-orange-500">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> Pendente</p>
                            <h3 className="text-3xl font-black text-orange-500 tracking-tight">R$ {kpiData.pending.toFixed(2)}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChartIcon size={16} className="text-blue-500" /> Categorias</h3>
                            <div className="h-72 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartsData.byCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {chartsData.byCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']} itemStyle={{ color: '#374151', fontWeight: 600 }} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none -ml-28 md:-ml-32">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Top<br />Cat</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart2 size={16} className="text-brand-500" /> Histórico Mensal</h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartsData.byMonth}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(value) => `R$${value}`} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f3f4f6' }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']} />
                                        <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- RECORDS TAB --- */}
            {activeTab === 'records' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-brand-100 transition-all"
                            />
                        </div>
                        <button onClick={() => handleOpenForm()} className="w-full md:w-auto px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-200 transition-transform active:scale-95 flex items-center justify-center gap-2">
                            <Plus size={18} /> Novo Registro
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Categoria / Descrição</th>
                                        {!hideValues && <th className="px-6 py-4">Valor</th>}
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCosts.length === 0 ? (
                                        <tr>
                                            <td colSpan={hideValues ? 4 : 5} className="px-6 py-12 text-center text-gray-400">
                                                Nenhum registro encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCosts.map((cost) => (
                                            <tr key={cost.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-600 whitespace-nowrap">
                                                    {parseDateLocal(cost.date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4"><span className="font-bold text-gray-700">{cost.category}</span></td>
                                                {!hideValues && <td className="px-6 py-4 font-bold text-gray-800">R$ {cost.amount.toFixed(2)}</td>}
                                                <td className="px-6 py-4">
                                                    {cost.status === 'Pago' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                                            <Check size={10} strokeWidth={3} /> Pago
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                                                            <Calendar size={10} strokeWidth={3} /> Pendente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleOpenForm(cost)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                        <button onClick={() => onDeleteCost(cost.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL FORM --- */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up p-6 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 bg-gray-50 text-gray-400 p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={20} /></button>

                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            {editingCost ? <Edit2 size={20} className="text-brand-500" /> : <Plus size={20} className="text-brand-500" />}
                            {editingCost ? 'Editar Registro' : 'Novo Registro'}
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Categoria / Descrição</label>
                                <input
                                    list="categories"
                                    value={formCategory}
                                    onChange={e => setFormCategory(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 p-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all focus:bg-white"
                                    placeholder="Ex: Fatura Internet"
                                    autoFocus
                                />
                                <datalist id="categories">
                                    <option value="Insumos">Shampoo, Laços, Produtos...</option>
                                    <option value="Equipamentos">Soprador, Máquina...</option>
                                    <option value="Manutenção">Afiação, Conserto...</option>
                                    <option value="Fixo">Aluguel, Luz, Água...</option>
                                    <option value="Equipe">Freelancer, Pagamentos...</option>
                                </datalist>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">Selecione uma categoria padrão ou digite uma descrição personalizada.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Valor (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formAmount}
                                            onChange={e => setFormAmount(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Data</label>
                                    <input
                                        type="date"
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 px-3 py-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block ml-1">Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setFormStatus('Pago')} className={`py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${formStatus === 'Pago' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}><Check size={16} strokeWidth={3} /> Pago</button>
                                    <button onClick={() => setFormStatus('Pendente')} className={`py-3.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${formStatus === 'Pendente' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}><Calendar size={16} strokeWidth={3} /> Pendente</button>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl mt-4 hover:bg-brand-700 shadow-xl shadow-brand-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={20} strokeWidth={3} />
                                {editingCost ? 'Salvar Alterações' : 'Adicionar Registro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
