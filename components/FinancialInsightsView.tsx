import React, { useState, useMemo } from 'react';
import { Appointment, Service, CostItem, Client } from '../types';
import {
    TrendingUp, DollarSign, PieChart as PieChartIcon,
    ChevronLeft, ChevronRight, AlertCircle, Wallet
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

interface FinancialInsightsProps {
    appointments: Appointment[];
    services: Service[];
    costs: CostItem[];
    clients: Client[];
}

export const FinancialInsightsView: React.FC<FinancialInsightsProps> = ({ appointments, services, costs, clients }) => {
    const [timeRange, setTimeRange] = useState<'year' | 'month'>('year');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // --- HELPER FUNCTIONS ---
    const parseDateLocal = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const calculateAppRevenue = (app: Appointment) => {
        if (app.paidAmount !== undefined) return app.paidAmount;

        // Fallback to calculated total if not explicitly paid (for projections)
        let total = 0;
        const mainSvc = services.find(s => s.id === app.serviceId);
        if (mainSvc) total += mainSvc.price;
        if (app.additionalServiceIds) {
            app.additionalServiceIds.forEach(id => {
                const s = services.find(srv => srv.id === id);
                if (s) total += s.price;
            });
        }
        return total;
    };

    const isPaid = (app: Appointment) => !!app.paymentMethod && app.paymentMethod.trim() !== '';

    // --- DATA PROCESSING ---
    const filteredApps = useMemo(() => {
        return appointments.filter(a => {
            if (!a.date || a.status === 'cancelado') return false;
            const d = parseDateLocal(a.date);
            if (timeRange === 'year') {
                return d.getFullYear() === selectedYear;
            } else {
                const [y, m] = selectedMonth.split('-').map(Number);
                return d.getFullYear() === y && d.getMonth() === m - 1;
            }
        });
    }, [appointments, timeRange, selectedYear, selectedMonth]);

    const filteredCosts = useMemo(() => {
        return costs.filter(c => {
            const d = parseDateLocal(c.date);
            if (timeRange === 'year') {
                return d.getFullYear() === selectedYear;
            } else {
                const [y, m] = selectedMonth.split('-').map(Number);
                return d.getFullYear() === y && d.getMonth() === m - 1;
            }
        });
    }, [costs, timeRange, selectedYear, selectedMonth]);

    // --- METRIC CALCULATIONS ---
    const metrics = useMemo(() => {
        let grossRevenue = 0;
        let paidRevenue = 0;
        let pendingRevenue = 0;

        let totalCosts = filteredCosts.reduce((acc, c) => acc + c.amount, 0);

        let uniqueClients = new Set<string>();
        let completedApps = 0;

        filteredApps.forEach(app => {
            if (app.status === 'nao_veio') return;

            const val = calculateAppRevenue(app);
            grossRevenue += val;

            if (isPaid(app)) {
                paidRevenue += val;
            } else {
                pendingRevenue += val;
            }

            uniqueClients.add(app.clientId);
            completedApps++;
        });

        const netProfit = paidRevenue - totalCosts; // Cash Basis for profit
        const economicResult = grossRevenue - totalCosts; // Accrual Basis

        const profitMargin = paidRevenue > 0 ? (netProfit / paidRevenue) * 100 : 0;
        const avgTicket = completedApps > 0 ? grossRevenue / completedApps : 0;

        return {
            grossRevenue,
            paidRevenue,
            pendingRevenue,
            totalCosts,
            netProfit,
            economicResult,
            profitMargin,
            avgTicket,
            totalClients: uniqueClients.size
        };
    }, [filteredApps, filteredCosts]);

    // --- CHART DATA ---
    const chartData = useMemo(() => {
        const getDataForPeriod = (label: string, apps: Appointment[], costs: CostItem[]) => {
            const vendas = apps.reduce((acc, a) => a.status !== 'nao_veio' ? acc + calculateAppRevenue(a) : acc, 0);
            const recebido = apps.reduce((acc, a) => (a.status !== 'nao_veio' && isPaid(a)) ? acc + calculateAppRevenue(a) : acc, 0);
            const despesa = costs.reduce((acc, c) => acc + c.amount, 0);
            return { name: label, vendas, recebido, despesa, lucro: recebido - despesa };
        };

        if (timeRange === 'year') {
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return months.map((name, idx) => {
                const monthApps = filteredApps.filter(a => parseDateLocal(a.date).getMonth() === idx);
                const monthCosts = filteredCosts.filter(c => parseDateLocal(c.date).getMonth() === idx);
                return getDataForPeriod(name, monthApps, monthCosts);
            });
        } else {
            const [y, m] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            const data = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dayApps = filteredApps.filter(a => parseDateLocal(a.date).getDate() === d);
                const dayCosts = filteredCosts.filter(c => parseDateLocal(c.date).getDate() === d);
                data.push(getDataForPeriod(`${d}`, dayApps, dayCosts));
            }
            return data;
        }
    }, [filteredApps, filteredCosts, timeRange, selectedMonth]);

    // --- COMPONENTS ---
    const KPICard = ({ title, value, icon: Icon, color, subValue, highlight = false }: any) => (
        <div className={`bg-white p-4 md:p-6 rounded-3xl shadow-sm border ${highlight ? 'border-brand-200 ring-4 ring-brand-50' : 'border-gray-100'} flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className={`absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110`} />
            <div className="flex justify-between items-start mb-3 md:mb-4 relative z-10">
                <div className={`p-2.5 md:p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
                    <Icon size={20} className="md:w-6 md:h-6" />
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-xl md:text-2xl font-black text-gray-800">{value}</h3>
                {subValue && <p className="text-[10px] md:text-xs font-medium text-gray-400 mt-2">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="pb-32 animate-fade-in space-y-4 md:space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-[2rem] shadow-sm border border-white/40 sticky top-0 z-40">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Faturamento</h1>
                    <p className="text-gray-500 text-xs md:text-sm font-medium">Análise financeira e KPIs</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto justify-center">
                        <button
                            onClick={() => setTimeRange('month')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'month' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mensal
                        </button>
                        <button
                            onClick={() => setTimeRange('year')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeRange === 'year' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Anual
                        </button>
                    </div>

                    {timeRange === 'year' ? (
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4 bg-white px-4 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                            <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                            <span className="font-bold text-gray-800 text-sm">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
                        </div>
                    ) : (
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full sm:w-auto bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-100 shadow-sm"
                        />
                    )}
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                <KPICard
                    title="Receita Total"
                    value={`R$ ${metrics.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={DollarSign}
                    color="blue"
                    subValue="Vendas Brutas"
                    highlight
                />
                <KPICard
                    title="Em Caixa"
                    value={`R$ ${metrics.paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={Wallet}
                    color="green"
                    subValue="Total Recebido"
                />
                <KPICard
                    title="Lucro (Caixa)"
                    value={`R$ ${metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={TrendingUp}
                    color={metrics.netProfit >= 0 ? "emerald" : "red"}
                    subValue={`Margem: ${metrics.profitMargin.toFixed(0)}%`}
                />
                <KPICard
                    title="A Receber"
                    value={`R$ ${metrics.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    icon={AlertCircle}
                    color="orange"
                    subValue="Pendente"
                />
            </div>

            {/* Main Chart */}
            <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-sm border border-gray-100 h-64 md:h-96">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-2">
                    <h3 className="text-sm md:text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-brand-500" size={18} />
                        Evolução Financeira
                    </h3>
                    <div className="flex gap-4 text-[10px] md:text-xs font-bold overflow-x-auto w-full sm:w-auto">
                        <div className="flex items-center gap-1 whitespace-nowrap"><div className="w-2 h-2 md:w-3 md:h-3 bg-brand-500 rounded-full"></div> Vendas</div>
                        <div className="flex items-center gap-1 whitespace-nowrap"><div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full"></div> Recebido</div>
                        <div className="flex items-center gap-1 whitespace-nowrap"><div className="w-2 h-2 md:w-3 md:h-3 bg-red-400 rounded-full"></div> Despesas</div>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                            itemStyle={{ fontSize: 12, fontWeight: 600 }}
                        />
                        <Area type="monotone" dataKey="vendas" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Total Vendas" />
                        <Area type="monotone" dataKey="recebido" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" name="Em Caixa" />
                        <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} fillOpacity={0} fill="transparent" name="Despesas" strokeDasharray="5 5" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Breakdown Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden">
                    <div className="relative z-10 w-full">
                        <h3 className="text-lg md:text-xl font-bold mb-2">Resumo Financeiro</h3>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div>
                                <p className="opacity-75 text-xs">Ticket Médio</p>
                                <p className="text-xl md:text-2xl font-black">R$ {metrics.avgTicket.toFixed(0)}</p>
                            </div>
                            <div>
                                <p className="opacity-75 text-xs">Clientes</p>
                                <p className="text-xl md:text-2xl font-black">{metrics.totalClients}</p>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/20">
                            <p className="opacity-90 mb-1 text-xs">Resultado Operacional (Vendas - Despesas)</p>
                            <div className="text-2xl md:text-3xl font-black">R$ {metrics.economicResult.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="p-4 bg-orange-50 text-orange-500 rounded-full mb-4">
                        <PieChartIcon size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2">Composição de Receita</h3>
                    <p className="text-gray-400 text-xs md:text-sm">Os gráficos detalhados por categoria serão exibidos aqui em breve.</p>
                </div>
            </div>

        </div>
    );
};
