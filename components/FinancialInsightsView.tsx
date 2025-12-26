import React, { useState, useMemo } from 'react';
import { Appointment, Service, CostItem, Client } from '../types';
import {
    TrendingUp, TrendingDown, DollarSign, Users,
    Calendar, PieChart as PieChartIcon, BarChart2,
    ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
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
        if (app.paidAmount) return app.paidAmount;
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
        let totalCosts = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
        let uniqueClients = new Set<string>();
        let completedApps = 0;

        filteredApps.forEach(app => {
            if (app.status === 'nao_veio') return;
            grossRevenue += calculateAppRevenue(app);
            uniqueClients.add(app.clientId);
            completedApps++;
        });

        const netProfit = grossRevenue - totalCosts;
        const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
        const avgTicket = completedApps > 0 ? grossRevenue / completedApps : 0;

        return { grossRevenue, totalCosts, netProfit, profitMargin, avgTicket, totalClients: uniqueClients.size };
    }, [filteredApps, filteredCosts]);

    // --- CHART DATA ---
    const chartData = useMemo(() => {
        if (timeRange === 'year') {
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return months.map((name, idx) => {
                const monthApps = filteredApps.filter(a => parseDateLocal(a.date).getMonth() === idx);
                const monthCosts = filteredCosts.filter(c => parseDateLocal(c.date).getMonth() === idx);

                const receita = monthApps.reduce((acc, a) => acc + calculateAppRevenue(a), 0);
                const despesa = monthCosts.reduce((acc, c) => acc + c.amount, 0);

                return { name, receita, despesa, lucro: receita - despesa };
            });
        } else {
            // Daily breakdown for month
            const [y, m] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            const data = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dayApps = filteredApps.filter(a => parseDateLocal(a.date).getDate() === d);
                // Costs generally are by date too
                const dayCosts = filteredCosts.filter(c => parseDateLocal(c.date).getDate() === d);

                const receita = dayApps.reduce((acc, a) => acc + calculateAppRevenue(a), 0);
                const despesa = dayCosts.reduce((acc, c) => acc + c.amount, 0);

                data.push({ name: `${d}`, receita, despesa, lucro: receita - despesa });
            }
            return data;
        }
    }, [filteredApps, filteredCosts, timeRange, selectedMonth]);

    // --- COMPONENTS ---
    const KPICard = ({ title, value, icon: Icon, color, subValue }: any) => (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-50 rounded-bl-full -mr-4 -mt-4 opacity-50 transition-transform group-hover:scale-110`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-800">{value}</h3>
                {subValue && <p className="text-xs font-medium text-gray-400 mt-2">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="pb-32 animate-fade-in space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-[2rem] shadow-sm border border-white/40 sticky top-0 z-40">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Faturamento Estratégico</h1>
                    <p className="text-gray-500 text-sm font-medium">Análise financeira e KPIs</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setTimeRange('month')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${timeRange === 'month' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mensal
                    </button>
                    <button
                        onClick={() => setTimeRange('year')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${timeRange === 'year' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Anual
                    </button>
                </div>

                {timeRange === 'year' ? (
                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                        <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                        <span className="font-bold text-gray-800">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
                    </div>
                ) : (
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-gray-200 px-4 py-2 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-100 shadow-sm"
                    />
                )}
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Receita Bruta"
                    value={`R$ ${metrics.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    color="green"
                    subValue={`${timeRange === 'year' ? 'Anual' : 'Mensal'}`}
                />
                <KPICard
                    title="Lucro Líquido"
                    value={`R$ ${metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    color={metrics.netProfit >= 0 ? "emerald" : "red"}
                    subValue={`Margem: ${metrics.profitMargin.toFixed(1)}%`}
                />
                <KPICard
                    title="Ticket Médio"
                    value={`R$ ${metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={BarChart2}
                    color="blue"
                    subValue="Por Atendimento"
                />
                <KPICard
                    title="Clientes Atendidos"
                    value={metrics.totalClients}
                    icon={Users}
                    color="purple"
                    subValue="Unicos no período"
                />
            </div>

            {/* Main Chart */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 h-96">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-brand-500" size={20} />
                        Evolução Financeira
                    </h3>
                    <div className="flex gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-brand-500 rounded-full"></div> Receita</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-full"></div> Despesas</div>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                        />
                        <Area type="monotone" dataKey="receita" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Receita" />
                        <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" name="Despesas" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Breakdown Section (To be expanded) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">Insight do Mês</h3>
                        <p className="opacity-90 mb-6 text-sm">Sua receita cresceu este mês em comparação com a média anual.</p>
                        <div className="text-4xl font-black mb-2">{metrics.profitMargin.toFixed(1)}%</div>
                        <div className="text-sm font-medium opacity-75">Margem de Lucro Atual</div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="p-4 bg-orange-50 text-orange-500 rounded-full mb-4">
                        <PieChartIcon size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Composição de Receita</h3>
                    <p className="text-gray-400 text-sm">Visualização detalhada por categorias em breve.</p>
                </div>
            </div>

        </div>
    );
};
