import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { googleService, DEFAULT_CLIENT_ID } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser, CostItem } from './types';
import { 
  Plus, Trash2, Check, X, 
  Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
  ExternalLink, Settings, PawPrint, LogIn, ShieldAlert, Lock, Copy,
  ChevronDown, ChevronRight, Search, AlertTriangle, ChevronLeft, Phone, Clock, FileText,
  Edit2, MoreVertical, Wallet, Filter, CreditCard, AlertCircle, CheckCircle, Loader2,
  Scissors, TrendingUp, AlertOctagon, BarChart2, TrendingDown, Calendar, PieChart as PieChartIcon,
  ShoppingBag, Tag, User
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, CartesianGrid, Legend, ComposedChart, LabelList, PieChart, Pie
} from 'recharts';

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';

// --- Sub-Components ---

const SetupScreen: React.FC<{ onSave: (id: string) => void }> = ({ onSave }) => {
    const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 text-center">
                <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-brand-500/30">P</div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuração Inicial</h1>
                <div className="text-left mb-6 mt-6">
                    <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="ID do Cliente Google" className="w-full border-gray-200 border p-3 rounded-xl focus:ring-2 ring-brand-200 focus:border-brand-500 outline-none font-mono text-sm bg-gray-50" />
                </div>
                <button onClick={() => { if(clientId.trim().length > 10) onSave(clientId); }} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-500/20">Salvar e Continuar</button>
            </div>
        </div>
    );
};

const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void }> = ({ onLogin, onReset }) => {
    const currentOrigin = window.location.origin;
    const isTemporaryLink = currentOrigin.includes('vercel.app') && (currentOrigin.split('-').length > 2);
    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-gray-200/50 w-full max-w-md text-center border border-gray-100">
                <div className="w-full flex justify-center mb-8 relative">
                    <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-10 rounded-full"></div>
                    <img src="/logo.png" alt="PomPomPet" className="w-48 h-auto object-contain relative z-10 drop-shadow-md" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bem-vindo!</h1>
                <p className="text-gray-500 mb-8 text-sm">Gerencie seu PetShop com facilidade.</p>

                <button onClick={onLogin} className="w-full bg-white border border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group mb-6 shadow-sm hover:shadow-md">
                    <div className="bg-white p-1.5 rounded-full border border-gray-100"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" size={20} /></div>
                    <span>Entrar com Google</span>
                </button>
                {isTemporaryLink && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-800 mb-4 flex gap-3">
                        <AlertTriangle className="flex-shrink-0" size={16}/>
                        <div><p className="font-bold mb-1">Link Temporário Detectado</p><p>Use o domínio principal para evitar erros de autenticação.</p></div>
                    </div>
                )}
                <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-brand-600 font-medium">Configurações Avançadas</button>
            </div>
        </div>
    );
};

// --- CHART COMPONENTS ---
const CustomXAxisTick = ({ x, y, payload, data }: any) => {
    const item = data && data[payload.index];
    if (!item) return <g />;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="600" fontFamily="Inter">{item.name}</text>
            <text x={0} y={0} dy={30} textAnchor="middle" fill="#059669" fontSize={10} fontWeight="600" fontFamily="Inter">R$ {item.faturamento?.toFixed(0)}</text>
            <text x={0} y={0} dy={42} textAnchor="middle" fill="#6366f1" fontSize={9} fontFamily="Inter">{item.petsCount} pets</text>
            {(item.growth !== undefined || item.revGrowth !== undefined) && (
                <text x={0} y={0} dy={54} textAnchor="middle" fill={(item.growth || item.revGrowth) >= 0 ? '#10b981' : '#f43f5e'} fontSize={9} fontWeight="700" fontFamily="Inter">
                     {(item.growth || item.revGrowth) >= 0 ? '▲' : '▼'} {Math.abs(item.growth || item.revGrowth || 0).toFixed(0)}%
                </text>
            )}
        </g>
    );
};

// --- REVENUE VIEW ---
const RevenueView: React.FC<{ appointments: Appointment[]; services: Service[]; clients: Client[]; }> = ({ appointments, services, clients }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getISOWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };
  const calculateGrossRevenue = (app: Appointment) => {
      if (app.status === 'cancelado') return 0;
      if (app.paidAmount && app.paidAmount > 0) return app.paidAmount;
      const mainSvc = services.find(s => s.id === app.serviceId);
      let total = mainSvc?.price || 0;
      app.additionalServiceIds?.forEach(id => { const s = services.find(srv => srv.id === id); if(s) total += s.price; });
      return total;
  };
  const calculateStats = (apps: Appointment[]) => {
      let totalPets = 0, totalTosas = 0, paidRevenue = 0, pendingRevenue = 0;
      apps.forEach(app => {
          if (app.status === 'cancelado') return;
          totalPets++;
          const isTargetTosa = (name?: string) => name?.toLowerCase().includes('tosa normal') || name?.toLowerCase().includes('tosa tesoura');
          const mainSvc = services.find(s => s.id === app.serviceId);
          let hasTosa = isTargetTosa(mainSvc?.name);
          if (!hasTosa && app.additionalServiceIds) { app.additionalServiceIds.forEach(id => { const s = services.find(srv => srv.id === id); if (s && isTargetTosa(s.name)) hasTosa = true; }); }
          if (hasTosa) totalTosas++;
          const gross = calculateGrossRevenue(app);
          if (app.paymentMethod && app.paymentMethod.trim() !== '') paidRevenue += gross; else pendingRevenue += gross;
      });
      return { totalPets, totalTosas, paidRevenue, pendingRevenue, grossRevenue: paidRevenue + pendingRevenue, averageTicket: totalPets > 0 ? (paidRevenue + pendingRevenue) / totalPets : 0 };
  };

  const getWeeklyChartData = () => {
      const date = new Date(selectedDate); const day = date.getDay(); const diff = date.getDate() - day; const startOfWeek = new Date(date); startOfWeek.setDate(diff);
      const data = []; const businessDays = [2, 3, 4, 5, 6]; 
      businessDays.forEach(dayIndex => {
          const current = new Date(startOfWeek); current.setDate(startOfWeek.getDate() + dayIndex); const dateStr = current.toISOString().split('T')[0];
          const dailyApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');
          const totalRevenue = dailyApps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);
          let growth = 0; if (data.length > 0) { const prev = data[data.length - 1]; if (prev.faturamento > 0) growth = ((totalRevenue - prev.faturamento) / prev.faturamento) * 100; }
          data.push({ name: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), fullDate: dateStr, faturamento: totalRevenue, petsCount: dailyApps.length, growth });
      });
      return data;
  };
  const getMonthlyChartData = () => {
      const [yearStr, monthStr] = selectedMonth.split('-'); const year = parseInt(yearStr); const month = parseInt(monthStr) - 1; 
      const weeksInMonth = new Set<number>(); const daysInMonth = new Date(year, month + 1, 0).getDate(); for(let d=1; d<=daysInMonth; d++) weeksInMonth.add(getISOWeek(new Date(year, month, d)));
      const chartData: any[] = [];
      Array.from(weeksInMonth).sort((a,b) => a-b).forEach((weekNum, index) => {
          const apps = appointments.filter(app => { if (app.status === 'cancelado') return false; const d = new Date(app.date); return getISOWeek(d) === weekNum && d.getFullYear() === year; });
          const currentRevenue = apps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);
          let growth = 0; if (index > 0) { const prevRev = chartData[index - 1].faturamento; if (prevRev > 0) growth = ((currentRevenue - prevRev) / prevRev) * 100; }
          chartData.push({ name: `Sem ${index + 1}`, faturamento: currentRevenue, petsCount: apps.length, growth });
      });
      return chartData;
  };
  const getYearlyChartData = () => {
      const data = []; const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const startMonth = selectedYear === 2025 ? 7 : 0; 
      for (let i = startMonth; i < 12; i++) {
          const monthApps = appointments.filter(a => { const d = new Date(a.date); return d.getFullYear() === selectedYear && d.getMonth() === i && a.status !== 'cancelado'; });
          const stats = calculateStats(monthApps);
          let revGrowth = 0; if (i > startMonth) { const prevApps = appointments.filter(a => { const d = new Date(a.date); return d.getFullYear() === selectedYear && d.getMonth() === (i - 1) && a.status !== 'cancelado'; }); const prevStats = calculateStats(prevApps); if(prevStats.grossRevenue > 0) revGrowth = ((stats.grossRevenue - prevStats.grossRevenue) / prevStats.grossRevenue) * 100; }
          data.push({ name: monthNames[i], faturamento: stats.grossRevenue, petsCount: stats.totalPets, revGrowth });
      }
      return data;
  };

  const dailyApps = appointments.filter(a => a.date.startsWith(selectedDate));
  const dailyStats = calculateStats(dailyApps);
  const { start: weekStart, end: weekEnd } = (() => { const date = new Date(selectedDate); const day = date.getDay(); const diff = date.getDate() - day; const start = new Date(date); start.setDate(diff); const end = new Date(start); end.setDate(start.getDate() + 6); return { start, end }; })();
  const weeklyApps = appointments.filter(a => { const d = new Date(a.date); return d >= weekStart && d <= weekEnd; });
  const weeklyStats = calculateStats(weeklyApps);
  const monthlyApps = appointments.filter(a => a.date.startsWith(selectedMonth));
  const monthlyStats = calculateStats(monthlyApps);
  const yearlyApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear);
  const yearlyStats = calculateStats(yearlyApps);

  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
          <div className="flex justify-between items-start">
              <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                  <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{value}</h3>
                  {subValue && <p className="text-xs text-gray-400 mt-1 font-medium">{subValue}</p>}
              </div>
              <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
                  <Icon size={20} className={`${colorClass.replace('bg-', 'text-')}`} />
              </div>
          </div>
      </div>
  );

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${activeTab === id ? 'border-brand-600 text-brand-600 bg-brand-50/50' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
          <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
      </button>
  );

  return (
      <div className="space-y-8 animate-fade-in pb-10">
          <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Faturamento</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex overflow-x-auto"><TabButton id="daily" label="Diário" icon={CalendarIcon} /><TabButton id="weekly" label="Semanal" icon={BarChart2} /><TabButton id="monthly" label="Mensal" icon={TrendingUp} /><TabButton id="yearly" label="Anual" icon={PieChartIcon} /></div>
          </div>

          {activeTab === 'daily' && (
              <section className="animate-fade-in space-y-6">
                  <div className="flex justify-between items-center bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-600">Filtro de Data</h2>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-50 border-0 p-2 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-brand-100" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Pets" value={dailyStats.totalPets} icon={PawPrint} colorClass="bg-blue-500 text-blue-600" />
                      <StatCard title="Tosas" value={dailyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500 text-orange-600" subValue="Normal / Tesoura" />
                      <StatCard title="Caixa Pago" value={`R$ ${dailyStats.paidRevenue.toFixed(2)}`} icon={CheckCircle} colorClass="bg-emerald-500 text-emerald-600" />
                      <StatCard title="A Receber" value={`R$ ${dailyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-rose-500 text-rose-600" />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/30"><h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FileText size={16} className="text-brand-500"/> Detalhamento do Dia</h3></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50 text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                    <tr><th className="p-4">Horário</th><th className="p-4">Cliente</th><th className="p-4">Pet</th><th className="p-4">Serviços</th><th className="p-4 text-right">Valor</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {dailyApps.length === 0 ? ( <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-sm">Nenhum atendimento neste dia.</td></tr> ) : (
                                        dailyApps.sort((a,b) => a.date.localeCompare(b.date)).map(app => {
                                            const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(s => s.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x=>x); const val = calculateGrossRevenue(app);
                                            return (
                                                <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="p-4 font-mono text-xs text-gray-500 font-medium">{new Date(app.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</td>
                                                    <td className="p-4 font-medium text-gray-800">{client?.name}</td>
                                                    <td className="p-4 text-gray-600"><span className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-bold">{pet?.name}</span></td>
                                                    <td className="p-4 text-xs text-gray-500"><span className="font-bold text-brand-600">{mainSvc?.name}</span>{addSvcs && addSvcs.length > 0 && (<span className="text-gray-400"> + {addSvcs.map(s => s?.name).join(', ')}</span>)}</td>
                                                    <td className="p-4 text-right font-bold text-emerald-600">R$ {val.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                  </div>
              </section>
          )}

          {activeTab === 'weekly' && (
              <section className="animate-fade-in space-y-6">
                  <div className="flex justify-between items-center bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-600">Resumo da Semana</h2>
                      <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600">{new Date(weekStart).toLocaleDateString('pt-BR')} - {new Date(weekEnd).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Pets da Semana" value={weeklyStats.totalPets} icon={PawPrint} colorClass="bg-indigo-500 text-indigo-600" />
                      <StatCard title="Ticket Médio" value={`R$ ${weeklyStats.averageTicket.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500 text-teal-600" subValue="Por Pet" />
                      <StatCard title="Receita Paga" value={`R$ ${weeklyStats.paidRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500 text-emerald-600" />
                      <StatCard title="A Receber" value={`R$ ${weeklyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-rose-500 text-rose-600" />
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
                      <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-wide"><TrendingUp size={16} className="text-indigo-500"/> Faturamento Diário</h3>
                      <ResponsiveContainer width="100%" height="85%">
                          <ComposedChart data={getWeeklyChartData()} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={getWeeklyChartData()} />} height={60} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `R$${val}`} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <Bar yAxisId="right" dataKey="petsCount" fill="#e0e7ff" radius={[4, 4, 0, 0]} barSize={40} />
                              <Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke:'#fff'}} activeDot={{r: 6}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </section>
          )}

          {activeTab === 'monthly' && (
              <section className="animate-fade-in space-y-6">
                  <div className="flex justify-between items-center bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-600">Mês de Referência</h2>
                      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border-0 p-2 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-brand-100" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Pets no Mês" value={monthlyStats.totalPets} icon={PawPrint} colorClass="bg-purple-500 text-purple-600" />
                      <StatCard title="Ticket Médio" value={`R$ ${monthlyStats.averageTicket.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500 text-teal-600" subValue="Por Pet" />
                      <StatCard title="Total Pago" value={`R$ ${monthlyStats.paidRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500 text-emerald-600" />
                      <StatCard title="Pendente" value={`R$ ${monthlyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-rose-500 text-rose-600" />
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
                      <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-wide"><BarChart2 size={16} className="text-purple-500"/> Performance Semanal</h3>
                      <ResponsiveContainer width="100%" height="85%">
                          <ComposedChart data={getMonthlyChartData()} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={getMonthlyChartData()} />} height={60} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `R$${val}`} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <Bar yAxisId="right" dataKey="petsCount" fill="#f3e8ff" radius={[4, 4, 0, 0]} barSize={40} />
                              <Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#a855f7" strokeWidth={3} dot={{r: 4, fill: '#a855f7', strokeWidth: 2, stroke:'#fff'}} activeDot={{r: 6}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </section>
          )}

          {activeTab === 'yearly' && (
              <section className="animate-fade-in space-y-6">
                  <div className="flex justify-between items-center bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-600">Ano Fiscal</h2>
                      <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border-0 p-2 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-brand-100">
                          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard title="Pets no Ano" value={yearlyStats.totalPets} icon={PawPrint} colorClass="bg-sky-500 text-sky-600" />
                      <StatCard title="Ticket Médio" value={`R$ ${yearlyStats.averageTicket.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500 text-teal-600" />
                      <StatCard title="Faturamento Total" value={`R$ ${yearlyStats.grossRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500 text-emerald-600" />
                      <StatCard title="Pendência Total" value={`R$ ${yearlyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500 text-red-600" />
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
                      <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-wide"><TrendingUp size={16} className="text-emerald-500"/> Evolução Mensal</h3>
                      <ResponsiveContainer width="100%" height="85%">
                          <ComposedChart data={getYearlyChartData()} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={getYearlyChartData()} />} height={60} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `R$${val/1000}k`} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <Bar yAxisId="right" dataKey="petsCount" fill="#d1fae5" radius={[4, 4, 0, 0]} barSize={30} />
                              <Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke:'#fff'}} activeDot={{r: 6}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </section>
          )}
      </div>
  );
};

const CostsView: React.FC<{ costs: CostItem[] }> = ({ costs }) => {
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const filterCosts = () => {
        if (viewMode === 'monthly') { const [y, m] = selectedMonth.split('-'); return costs.filter(c => { const d = new Date(c.date); return d.getFullYear() === parseInt(y) && d.getMonth() === (parseInt(m) - 1); }); }
        return costs.filter(c => new Date(c.date).getFullYear() === selectedYear);
    };
    const filteredCosts = filterCosts();
    const totalCost = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const paidCost = filteredCosts.filter(c => c.status && c.status.toLowerCase() === 'pago').reduce((acc, c) => acc + c.amount, 0);
    const pendingCost = filteredCosts.filter(c => !c.status || c.status.toLowerCase() !== 'pago').reduce((acc, c) => acc + c.amount, 0);

    const getCostByCategory = () => {
        const counts: Record<string, number> = {}; filteredCosts.forEach(c => { const cat = c.category || 'Outros'; counts[cat] = (counts[cat] || 0) + c.amount; });
        const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const top5 = sorted.slice(0, 5); const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0); if (others > 0) top5.push({ name: 'Outros', value: others }); return top5;
    };
    const getCostByMonth = () => {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 }));
        costs.filter(c => new Date(c.date).getFullYear() === selectedYear).forEach(c => { const d = new Date(c.date); if(!isNaN(d.getTime())) data[d.getMonth()].value += c.amount; });
        const startIdx = selectedYear === 2025 ? 7 : 0; return data.slice(startIdx);
    };
    const PIE_COLORS = ['#f43f5e', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Custo Mensal</h1>
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                    <button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${viewMode === 'monthly' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Mês</button>
                    <button onClick={() => setViewMode('yearly')} className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${viewMode === 'yearly' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Ano</button>
                </div>
            </div>
            <div className="flex items-center mb-6 bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-sm font-bold text-gray-600 mr-4">Período:</h2>
                {viewMode === 'monthly' ? <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border-0 p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" /> : <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border-0 p-2 rounded-lg text-sm font-bold text-gray-700 outline-none"><option value={2025}>2025</option><option value={2026}>2026</option></select>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[{l:'Total', v:totalCost, c:'text-gray-800'}, {l:'Pago', v:paidCost, c:'text-emerald-600'}, {l:'Pendente', v:pendingCost, c:'text-orange-600'}].map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.l}</p>
                        <h3 className={`text-2xl font-bold ${item.c}`}>R$ {item.v.toFixed(2)}</h3>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-wide"><BarChart2 size={16}/> Evolução</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getCostByMonth()} margin={{top: 20}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(val) => `R$${val}`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" style={{fontSize: 10, fill: '#e11d48'}} formatter={(val: number) => val > 0 ? `R$${val.toFixed(0)}` : ''} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-wide"><Tag size={16}/> Categorias</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={getCostByCategory()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {getCostByCategory().map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const PaymentManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onUpdateAppointment: (app: Appointment) => void; accessToken: string | null; sheetId: string; }> = ({ appointments, clients, services, onUpdateAppointment, accessToken, sheetId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingId, setEditingId] = useState<string | null>(null); const [amount, setAmount] = useState(''); const [method, setMethod] = useState(''); const [isSaving, setIsSaving] = useState(false); const [activeTab, setActiveTab] = useState<'toReceive' | 'pending' | 'paid'>('toReceive'); const [contextMenu, setContextMenu] = useState<{x: number, y: number, app: Appointment} | null>(null);
    const touchStart = useRef<number | null>(null); const touchEnd = useRef<number | null>(null); const minSwipeDistance = 50; const todayStr = new Date().toISOString().split('T')[0];
    const pendingApps = appointments.filter(a => { const appDate = a.date.split('T')[0]; return appDate < todayStr && (!a.paymentMethod || a.paymentMethod.trim() === ''); }).sort((a,b) => b.date.localeCompare(a.date));
    const dailyApps = appointments.filter(a => a.date.startsWith(selectedDate)); const toReceiveApps = dailyApps.filter(a => !a.paymentMethod || a.paymentMethod.trim() === ''); const paidApps = dailyApps.filter(a => a.paymentMethod && a.paymentMethod.trim() !== '');
    
    const navigateDate = (days: number) => { const [y, m, d] = selectedDate.split('-').map(Number); const date = new Date(y, m - 1, d); date.setDate(date.getDate() + days); setSelectedDate(date.toISOString().split('T')[0]); };
    const calculateExpected = (app: Appointment) => { const main = services.find(s => s.id === app.serviceId); let total = main?.price || 0; app.additionalServiceIds?.forEach(id => { const s = services.find(srv => srv.id === id); if(s) total += s.price; }); return total; };
    const handleStartEdit = (app: Appointment) => { setEditingId(app.id); const expected = calculateExpected(app); setAmount(app.paidAmount ? app.paidAmount.toString() : expected.toString()); setMethod(app.paymentMethod || 'Credito'); setContextMenu(null); };
    const handleSave = async (app: Appointment) => {
        setIsSaving(true); const finalAmount = parseFloat(amount); const updatedApp = { ...app, paidAmount: finalAmount, paymentMethod: method as any };
        if (app.id.startsWith('sheet_') && accessToken && sheetId) {
            try { const parts = app.id.split('_'); const row = parseInt(parts[1]) + 2; await googleService.updateSheetValues(accessToken, sheetId, `Agendamento!R${row}:S${row}`, [finalAmount.toString().replace('.', ','), method]); } catch (e) { alert("Erro ao salvar na planilha."); }
        }
        onUpdateAppointment(updatedApp); setEditingId(null); setIsSaving(false);
    };

    const PaymentRow = ({ app, colorClass }: {app: Appointment, colorClass?: string}) => {
        const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(s => s.id === app.serviceId); const expected = calculateExpected(app); const isPaid = !!app.paidAmount && !!app.paymentMethod;
        if(editingId === app.id) return (
            <div className="bg-white border border-brand-200 p-4 rounded-xl mb-3 shadow-lg shadow-brand-100 z-10 relative">
                <div className="flex flex-col gap-3">
                     <span className="font-bold text-gray-800 text-sm">{pet?.name} <span className="text-gray-400 font-normal">({client?.name})</span></span>
                     <div className="grid grid-cols-2 gap-2">
                         <div><label className="text-[10px] font-bold text-gray-400 uppercase">Valor</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 text-sm" /></div>
                         <div><label className="text-[10px] font-bold text-gray-400 uppercase">Método</label><select value={method} onChange={e => setMethod(e.target.value)} className="w-full border p-2 rounded-lg bg-gray-50 text-sm"><option value="Credito">Crédito</option><option value="Debito">Débito</option><option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option></select></div>
                     </div>
                     <div className="flex gap-2 mt-1"><button onClick={() => handleSave(app)} disabled={isSaving} className="flex-1 bg-green-500 text-white p-2 rounded-lg text-sm font-bold">Salvar</button><button onClick={() => setEditingId(null)} className="flex-1 bg-gray-100 text-gray-600 p-2 rounded-lg text-sm font-bold">Cancelar</button></div>
                </div>
            </div>
        );
        return (
            <div onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }} className={`p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-2 ${colorClass} min-w-0 hover:shadow-md transition-shadow`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-bold text-gray-800 truncate">{pet?.name}</div>
                        <div className="text-xs text-gray-500 truncate">{client?.name}</div>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={10}/> {new Date(app.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-800">R$ {expected.toFixed(2)}</div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase mt-1 ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isPaid ? app.paymentMethod : 'Pendente'}</span>
                    </div>
                </div>
                <div className="text-[10px] text-gray-500 bg-gray-50/50 p-1.5 rounded-lg mb-2 truncate border border-gray-50"><span className="font-bold text-brand-600">{mainSvc?.name}</span> {app.additionalServiceIds?.length ? `+ ${app.additionalServiceIds.length} extras` : ''}</div>
                <button onClick={() => handleStartEdit(app)} className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-colors ${isPaid ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
                    <DollarSign size={14}/> {isPaid ? 'Editar Pagamento' : 'Receber Valor'}
                </button>
            </div>
        )
    };

    return (
        <div className="space-y-4 h-full flex flex-col" onClick={() => setContextMenu(null)}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800 self-start md:self-center">Caixa Diário</h2>
                <div className="flex items-center gap-1 w-full md:w-auto bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={18} /></button>
                    <button onClick={() => setSelectedDate(todayStr)} className="flex-1 px-4 py-1.5 bg-brand-50 text-brand-700 font-bold rounded-lg text-xs hover:bg-brand-100 transition-colors">Hoje</button>
                    <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={18} /></button>
                    <div className="text-xs font-bold text-gray-700 px-3 border-l border-gray-100">{new Date(selectedDate).toLocaleDateString('pt-BR')}</div>
                </div>
            </div>
            <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm">
                {[{id:'toReceive', l:'Receber', c:toReceiveApps.length, cl:'text-amber-600'}, {id:'pending', l:'Atrasados', c:pendingApps.length, cl:'text-rose-600'}, {id:'paid', l:'Pagos', c:paidApps.length, cl:'text-emerald-600'}].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === t.id ? 'bg-gray-100 text-gray-900 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}>{t.l} <span className={t.cl}>({t.c})</span></button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 rounded-2xl border border-gray-100 p-2 custom-scrollbar">
                {activeTab === 'toReceive' && toReceiveApps.map(app => <PaymentRow key={app.id} app={app} colorClass="border-l-4 border-l-amber-400" />)}
                {activeTab === 'pending' && pendingApps.map(app => <PaymentRow key={app.id} app={app} colorClass="border-l-4 border-l-rose-500 bg-rose-50/20" />)}
                {activeTab === 'paid' && paidApps.map(app => <PaymentRow key={app.id} app={app} colorClass="border-l-4 border-l-emerald-500 opacity-75 grayscale-[0.2]" />)}
                {((activeTab === 'toReceive' && !toReceiveApps.length) || (activeTab === 'pending' && !pendingApps.length) || (activeTab === 'paid' && !paidApps.length)) && <div className="text-center text-gray-400 py-10 text-sm">Nenhum item nesta lista.</div>}
            </div>
            {contextMenu && <div className="fixed bg-white shadow-xl border border-gray-100 rounded-xl z-[100] py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }}><button onClick={() => handleStartEdit(contextMenu.app)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 font-medium text-gray-700"><Edit2 size={16}/> Editar Pagamento</button></div>}
        </div>
    )
};

const ClientManager: React.FC<{ clients: Client[]; onDeleteClient: (id: string) => void; googleUser: GoogleUser | null; accessToken: string | null; }> = ({ clients, onDeleteClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
             <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Clientes</h2><a href={PREDEFINED_FORM_URL} target="_blank" className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-brand-700 text-sm shadow-lg shadow-brand-500/20 transition-all"><Plus size={16} /> Novo Cliente</a></div>
                <div className="relative"><Search className="absolute left-4 top-3 text-gray-400" size={18} /><input placeholder="Buscar por nome ou pet..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 ring-brand-100 outline-none shadow-sm bg-white"/></div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="min-w-0"><h3 className="font-bold text-gray-800 truncate text-base">{client.name}</h3><p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Phone size={12}/> {client.phone}</p></div>
                                <button onClick={() => { if(confirm('Excluir?')) onDeleteClient(client.id); }} className="text-gray-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={16} /></button>
                            </div>
                            <div className="space-y-2">
                                {client.pets.map(pet => (
                                    <div key={pet.id} className="bg-gray-50 p-2 rounded-xl flex items-center gap-3 text-sm border border-gray-100 group-hover:border-gray-200 transition-colors">
                                        <div className="w-8 h-8 bg-white border border-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-sm">{pet.name[0]}</div>
                                        <div className="min-w-0 truncate"><span className="font-bold text-gray-700">{pet.name}</span> <span className="text-gray-400 text-xs">• {pet.breed}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ServiceManager: React.FC<{ services: Service[]; onAddService: (s: Service) => void; onDeleteService: (id: string) => void; onSyncServices: (silent: boolean) => void; accessToken: string | null; sheetId: string; }> = ({ services, onAddService, onDeleteService, onSyncServices, sheetId, accessToken }) => {
    const [isModalOpen, setIsModalOpen] = useState(false); const [editingService, setEditingService] = useState<Service | null>(null); const [formData, setFormData] = useState({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); const [contextMenu, setContextMenu] = useState<{x: number, y: number, service: Service} | null>(null);
    const resetForm = () => { setFormData({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); setEditingService(null); setIsModalOpen(false); };
    const handleEditStart = (s: Service) => { setEditingService(s); setFormData({ name: s.name, price: s.price.toString(), category: s.category, size: s.targetSize || 'Todos', coat: s.targetCoat || 'Todos' }); setIsModalOpen(true); setContextMenu(null); };
    const handleSave = async () => {
        if(!accessToken || !sheetId) return alert('Necessário estar logado.'); const priceNum = parseFloat(formData.price.replace(',', '.')); const rowData = [formData.name, formData.category, formData.size, formData.coat, priceNum.toString().replace('.', ',')];
        try { if(editingService) { const row = parseInt(editingService.id.split('_')[2]) + 2; await googleService.updateSheetValues(accessToken, sheetId, `Serviço!A${row}:E${row}`, rowData); } else { await googleService.appendSheetValues(accessToken, sheetId, 'Serviço!A:E', rowData); } onSyncServices(true); resetForm(); } catch(e) { alert('Erro ao salvar.'); }
    };
    const handleDelete = async (service: Service) => { if(!confirm(`Excluir ${service.name}?`)) return; setContextMenu(null); if(service.id.startsWith('sheet_svc_') && accessToken && sheetId) { const row = parseInt(service.id.split('_')[2]) + 2; await googleService.clearSheetValues(accessToken, sheetId, `Serviço!A${row}:E${row}`); onSyncServices(true); } else onDeleteService(service.id); };

    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col relative" onClick={() => setContextMenu(null)}>
            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800">Catálogo de Serviços</h2>
                <div className="flex gap-2"><button onClick={() => onSyncServices(false)} className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-2 rounded-xl flex items-center gap-2 font-bold text-xs hover:bg-gray-200 transition"><Sparkles size={14} /> Atualizar</button><button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-brand-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition"><Plus size={14} /> Adicionar</button></div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {services.map(service => (
                        <div key={service.id} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, service }); }} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-brand-200 transition-all select-none group">
                            <div>
                                <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-800 text-sm truncate pr-2">{service.name}</h3><span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${service.category === 'principal' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{service.category}</span></div>
                                <div className="flex flex-wrap gap-1.5 mb-3"><span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500 font-medium">{service.targetSize}</span><span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500 font-medium">{service.targetCoat}</span></div>
                            </div>
                            <div className="border-t border-gray-50 pt-2"><span className="text-lg font-bold text-gray-900">R$ {service.price.toFixed(2)}</span></div>
                        </div>
                    ))}
                </div>
            </div>
            {contextMenu && <div className="fixed bg-white shadow-xl border border-gray-100 rounded-xl z-[100] py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }}><button onClick={() => handleEditStart(contextMenu.service)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 font-medium text-gray-700"><Edit2 size={16}/> Editar</button><button onClick={() => handleDelete(contextMenu.service)} className="w-full text-left px-4 py-3 hover:bg-rose-50 text-rose-600 text-sm flex items-center gap-3 font-medium"><Trash2 size={16}/> Excluir</button></div>}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-gray-800">Serviço</h3>
                        <input placeholder="Nome do Serviço" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border p-3 rounded-xl text-sm bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 ring-brand-100" />
                        <div className="grid grid-cols-2 gap-3">
                            <input placeholder="Preço (R$)" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full border p-3 rounded-xl text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 ring-brand-100" />
                            <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border p-3 rounded-xl text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 ring-brand-100"><option value="principal">Principal</option><option value="adicional">Adicional</option></select>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={resetForm} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm transition">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ScheduleManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onAdd: (a: Appointment, c: Client, p: Pet, s: Service[]) => void; onEdit: (a: Appointment, c: Client, p: Pet, s: Service[]) => void; onUpdateStatus: (id: string, s: Appointment['status']) => void; onDelete: (id: string) => void; googleUser: GoogleUser | null; }> = ({ appointments, clients, services, onAdd, onEdit, onDelete }) => {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day'); const [currentDate, setCurrentDate] = useState(new Date()); const [isModalOpen, setIsModalOpen] = useState(false); const [detailsApp, setDetailsApp] = useState<Appointment | null>(null); const [contextMenu, setContextMenu] = useState<{x: number, y: number, appId: string} | null>(null); const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState(''); const [selectedClient, setSelectedClient] = useState(''); const [selectedPet, setSelectedPet] = useState(''); const [selectedService, setSelectedService] = useState(''); const [selectedAddServices, setSelectedAddServices] = useState<string[]>([]); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [time, setTime] = useState('09:00'); const [notes, setNotes] = useState('');
    const resetForm = () => { setClientSearch(''); setSelectedClient(''); setSelectedPet(''); setSelectedService(''); setSelectedAddServices([]); setTime('09:00'); setNotes(''); setEditingAppId(null); setIsModalOpen(false); };
    const handleStartEdit = (app: Appointment) => { setEditingAppId(app.id); setSelectedClient(app.clientId); setSelectedPet(app.petId); setSelectedService(app.serviceId); setSelectedAddServices(app.additionalServiceIds || []); const d = new Date(app.date); setDate(d.toISOString().split('T')[0]); setTime(d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})); setNotes(app.notes || ''); setDetailsApp(null); setIsModalOpen(true); };
    const handleSave = () => { if (!selectedClient || !selectedPet || !selectedService) return; const client = clients.find(c => c.id === selectedClient)!; const pet = client.pets.find(p => p.id === selectedPet)!; const mainSvc = services.find(s => s.id === selectedService)!; const addSvcs = selectedAddServices.map(id => services.find(s => s.id === id)).filter(s => s) as Service[]; const newApp = { id: editingAppId || `local_${Date.now()}`, clientId: client.id, petId: pet.id, serviceId: mainSvc.id, additionalServiceIds: selectedAddServices, date: `${date}T${time}:00`, status: 'agendado' as const, notes: notes, googleEventId: editingAppId ? appointments.find(a=>a.id===editingAppId)?.googleEventId : undefined }; if (editingAppId) onEdit(newApp, client, pet, [mainSvc, ...addSvcs]); else onAdd(newApp, client, pet, [mainSvc, ...addSvcs]); resetForm(); };
    const handleDeleteFromContext = () => { if(contextMenu && confirm('Excluir?')) onDelete(contextMenu.appId); setContextMenu(null); };
    const filteredClients = clientSearch.length > 0 ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch) || c.pets.some(p => p.name.toLowerCase().includes(clientSearch.toLowerCase()))).slice(0, 5) : [];
    const selectedClientData = clients.find(c => c.id === selectedClient); const pets = selectedClientData?.pets || []; const selectedPetData = pets.find(p => p.id === selectedPet);
    const getApplicableServices = (cat: 'principal' | 'adicional') => !selectedPetData ? [] : services.filter(s => s.category === cat && (!s.targetSize || s.targetSize === 'Todos' || s.targetSize.includes(selectedPetData.size)) && (!s.targetCoat || s.targetCoat === 'Todos' || s.targetCoat.includes(selectedPetData.coat)));
    const navigate = (dir: 'prev' | 'next') => { const newDate = new Date(currentDate); if (viewMode === 'day') newDate.setDate(newDate.getDate() + (dir === 'next' ? 1 : -1)); if (viewMode === 'week') newDate.setDate(newDate.getDate() + (dir === 'next' ? 7 : -7)); if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (dir === 'next' ? 1 : -1)); setCurrentDate(newDate); };
    const timeOptions = []; for (let h = 9; h <= 18; h++) { ['00', '15', '30', '45'].forEach(m => { if(h === 18 && m !== '00') return; timeOptions.push(`${String(h).padStart(2, '0')}:${m}`); }); }

    const AppointmentCard = ({ app, isSmall }: { app: Appointment, isSmall?: boolean }) => {
        const c = clients.find(c => c.id === app.clientId); const p = c?.pets.find(p => p.id === app.petId); const s = services.find(srv => srv.id === app.serviceId); const s1 = app.additionalServiceIds?.[0] ? services.find(srv => srv.id === app.additionalServiceIds[0]) : null;
        const color = s?.name.toLowerCase().includes('tosa') ? 'bg-orange-50 border-orange-200 text-orange-900 shadow-orange-100' : s?.name.toLowerCase().includes('banho') ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-blue-100' : 'bg-purple-50 border-purple-200 text-purple-900 shadow-purple-100';
        return (
            <div className={`relative flex-1 w-full rounded-lg p-1.5 md:p-2 border shadow-sm ${color} z-20 min-h-[44px] md:min-h-[50px] cursor-pointer hover:shadow-md transition-all overflow-hidden flex flex-col justify-center`} onClick={(e) => { e.stopPropagation(); setDetailsApp(app); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id }); }}>
                <div className="font-bold text-[9px] md:text-[11px] leading-tight truncate">{c?.name}</div>
                <div className="font-semibold text-[9px] md:text-[10px] leading-tight truncate opacity-80">{p?.name}</div>
                <div className="flex gap-1 mt-0.5"><span className="text-[8px] px-1 bg-white/50 rounded">{s?.name.split(' ')[0]}</span>{s1 && <span className="text-[8px] px-1 bg-white/50 rounded">{s1.name.split(' ')[0]}</span>}</div>
            </div>
        )
    };

    const renderCalendar = () => {
        const start = new Date(currentDate); start.setHours(0,0,0,0);
        if (viewMode === 'month') {
            const year = start.getFullYear(); const month = start.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const days = []; for(let i=0; i<new Date(year, month, 1).getDay(); i++) days.push(null); for(let i=1; i<=daysInMonth; i++) days.push(new Date(year, month, i));
            return (
                <div className="grid grid-cols-7 gap-px h-full auto-rows-fr bg-gray-200 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="bg-gray-50 text-center py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{d}</div>)}
                    {days.map((d, idx) => { if (!d) return <div key={`pad-${idx}`} className="bg-white min-h-[60px]" />; const dateStr = d.toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado'); const isToday = dateStr === new Date().toISOString().split('T')[0]; return (<div key={idx} className={`bg-white p-1 flex flex-col hover:bg-gray-50 transition-colors ${isToday ? 'bg-brand-50/30' : ''}`}><div className={`text-[10px] font-bold mb-1 text-center w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}>{d.getDate()}</div><div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">{dayApps.map(app => <AppointmentCard key={app.id} app={app} isSmall />)}</div></div>) })}
                </div>
            )
        }
        const startOfWeek = new Date(start); startOfWeek.setDate(start.getDate() - start.getDay()); let daysIndices = viewMode === 'week' ? [2, 3, 4, 5, 6] : [start.getDay()]; const hours = Array.from({length: 10}, (_, i) => i + 9); 
        return (
            <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                    <div className="w-10 md:w-16 flex-shrink-0 border-r border-gray-100"></div>
                    {daysIndices.map((dayIdx) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + dayIdx); const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]; return (<div key={dayIdx} className={`flex-1 text-center py-2 border-r border-gray-100 ${isToday ? 'bg-brand-50/50' : ''}`}><div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>{d.toLocaleDateString('pt-BR', {weekday: 'short'})}</div><div className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>{d.getDate()}</div></div>) })}
                </div>
                <div className="flex-1 overflow-y-auto" onClick={() => setContextMenu(null)}>
                    {hours.map(h => (
                        <div key={h} className="flex min-h-[70px] border-b border-gray-100/50 relative">
                            <div className="w-10 md:w-16 flex-shrink-0 border-r border-gray-100 text-[10px] text-gray-400 font-medium p-2 text-right sticky left-0 z-10">{String(h).padStart(2,'0')}:00</div>
                            {daysIndices.map((dayIdx) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + dayIdx); const dateStr = d.toISOString().split('T')[0]; const slotApps = appointments.filter(a => { if(a.status === 'cancelado') return false; const aDate = new Date(a.date); return aDate.getDate() === d.getDate() && aDate.getMonth() === d.getMonth() && aDate.getFullYear() === d.getFullYear() && aDate.getHours() === h; }); return (<div key={`${dateStr}-${h}`} className="flex-1 border-r border-gray-100/50 relative p-1 hover:bg-gray-50/50 transition-colors flex flex-col gap-1" onClick={() => { setDate(dateStr); setTime(`${String(h).padStart(2,'0')}:00`); setIsModalOpen(true); }}>{slotApps.map(app => <AppointmentCard key={app.id} app={app} />)}</div>) })}
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-4 animate-fade-in relative h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 flex-shrink-0 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                        <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'day' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Dia</button>
                        <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Semana</button>
                        <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Mês</button>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-bold text-gray-800 min-w-[90px] text-center">{viewMode === 'day' && currentDate.toLocaleDateString('pt-BR')} {viewMode === 'week' && `Sem ${currentDate.getDate()}`} {viewMode === 'month' && currentDate.toLocaleDateString('pt-BR', {month:'long'})}</span>
                        <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-600"><ChevronRight size={16}/></button>
                    </div>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition flex items-center justify-center gap-2 text-sm"><Plus size={18} /> Novo</button>
            </div>
            <div className="flex-1 min-h-0 relative pb-20 md:pb-0">{renderCalendar()}</div>
            {contextMenu && <div className="fixed bg-white shadow-xl border border-gray-100 rounded-xl z-[100] py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }}><button onClick={() => handleStartEdit(appointments.find(a => a.id === contextMenu.appId)!)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 font-medium text-gray-700"><Edit2 size={16}/> Editar</button><button onClick={handleDeleteFromContext} className="w-full text-left px-4 py-3 hover:bg-rose-50 text-rose-600 text-sm flex items-center gap-3 font-medium"><Trash2 size={16}/> Excluir</button></div>}
            
            {detailsApp && (
                <div className="fixed inset-0 bg-gray-900/40 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailsApp(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDetailsApp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={18}/></button>
                        <div className="mb-6 border-b border-gray-50 pb-4">
                            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Detalhes</span>
                            <h3 className="text-2xl font-bold text-gray-900">{clients.find(c => c.id === detailsApp.clientId)?.pets.find(p => p.id === detailsApp.petId)?.name}</h3>
                            <p className="text-gray-500 text-sm">{clients.find(c => c.id === detailsApp.clientId)?.name}</p>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Phone size={18} className="text-blue-500"/><span className="font-semibold text-gray-700">{clients.find(c => c.id === detailsApp.clientId)?.phone}</span></div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"><MapPin size={18} className="text-purple-500 mt-0.5"/><span className="font-medium text-gray-600 leading-snug">{clients.find(c => c.id === detailsApp.clientId)?.address}</span></div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"><FileText size={18} className="text-orange-500 mt-0.5"/><span className="italic text-gray-600">{detailsApp.notes || 'Nenhuma observação'}</span></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3"><button onClick={() => handleStartEdit(detailsApp)} className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/20"><Edit2 size={18}/> Editar Agendamento</button></div>
                    </div>
                </div>
            )}
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:min-h-[500px]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-xl text-gray-800 tracking-tight">{editingAppId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                            <button onClick={resetForm} className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100"><X size={20} className="text-gray-500"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cliente / Pet</label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-3 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                    <input value={selectedClientData ? selectedClientData.name : clientSearch} onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(''); setSelectedPet(''); }} placeholder="Digite nome, telefone ou pet..." className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-brand-100 focus:border-brand-500 transition-all text-sm font-medium bg-gray-50 focus:bg-white" />
                                    {selectedClientData && <button onClick={() => { setClientSearch(''); setSelectedClient(''); }} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><X size={18}/></button>}
                                </div>
                                {clientSearch.length > 0 && !selectedClient && filteredClients.length > 0 && (
                                    <div className="mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar z-50 relative">
                                        {filteredClients.map(c => (
                                            <button key={c.id} onClick={() => { setSelectedClient(c.id); setClientSearch(''); }} className="w-full text-left p-4 hover:bg-brand-50 border-b border-gray-50 flex justify-between items-center transition-colors">
                                                <div className="text-sm font-bold text-gray-800">{c.name} <span className="text-xs font-normal text-gray-500 block">Pets: {c.pets.map(p=>p.name).join(', ')}</span></div>
                                                <ChevronRight size={16} className="text-gray-300"/>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedClient && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {pets.map(p => (
                                        <button key={p.id} onClick={() => { setSelectedPet(p.id); setSelectedService(''); }} className={`p-3 rounded-xl border text-left transition-all ${selectedPet === p.id ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-white border-gray-200 hover:border-brand-300 hover:shadow-md'}`}>
                                            <div className="font-bold text-sm text-gray-800">{p.name}</div><div className="text-xs text-gray-500 mt-1">{p.size} • {p.coat}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedPet && (
                                <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border p-3 rounded-xl text-sm outline-none focus:ring-2 ring-brand-100" /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label><select value={time} onChange={e => setTime(e.target.value)} className="w-full border p-3 rounded-xl text-sm outline-none focus:ring-2 ring-brand-100 bg-white">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serviço Principal</label><select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-sm outline-none focus:ring-2 ring-brand-100"><option value="">Selecione...</option>{getApplicableServices('principal').map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price.toFixed(2)}</option>)}</select></div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adicionais</label>
                                        <select className="w-full border p-3 rounded-xl bg-white text-sm outline-none focus:ring-2 ring-brand-100 mb-2" onChange={(e) => { const val = e.target.value; if(val && !selectedAddServices.includes(val)) setSelectedAddServices(prev => [...prev, val]); e.target.value = ''; }}><option value="">Adicionar Serviço Extra...</option>{getApplicableServices('adicional').filter((s, i, self) => i === self.findIndex((t) => t.name === s.name)).map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price.toFixed(2)}</option>)}</select>
                                        <div className="flex flex-wrap gap-2">{selectedAddServices.map(id => <span key={id} onClick={() => setSelectedAddServices(p => p.filter(x => x !== id))} className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:bg-purple-200 transition-colors flex items-center gap-1">{services.find(s=>s.id===id)?.name} <X size={12}/></span>)}</div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-3 rounded-xl text-sm outline-none focus:ring-2 ring-brand-100 min-h-[80px]" placeholder="Alergias, cuidados especiais..." /></div>
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={resetForm} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSave} disabled={!selectedClient || !selectedPet || !selectedService} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20 transition-all text-sm">Confirmar Agendamento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('payments'); const [clients, setClients] = useState<Client[]>([]); const [services, setServices] = useState<Service[]>([]); const [appointments, setAppointments] = useState<Appointment[]>([]); const [costs, setCosts] = useState<CostItem[]>([]); const [isConfigured, setIsConfigured] = useState(true); const [accessToken, setAccessToken] = useState<string | null>(null); const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null); const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const SHEET_ID = localStorage.getItem('petgestor_sheet_id') || PREDEFINED_SHEET_ID;

  useEffect(() => {
    setClients(db.getClients()); setServices(db.getServices()); setAppointments(db.getAppointments());
    if (!localStorage.getItem('petgestor_client_id')) localStorage.setItem('petgestor_client_id', DEFAULT_CLIENT_ID);
    const storedToken = localStorage.getItem('petgestor_access_token'); const storedExpiry = localStorage.getItem('petgestor_token_expiry'); const storedUser = localStorage.getItem('petgestor_user_profile');
    if (storedToken && storedExpiry && storedUser) { if (Date.now() < parseInt(storedExpiry)) { setAccessToken(storedToken); setGoogleUser(JSON.parse(storedUser)); performFullSync(storedToken); } else { localStorage.removeItem('petgestor_access_token'); localStorage.removeItem('petgestor_token_expiry'); localStorage.removeItem('petgestor_user_profile'); } }
    initAuthLogic();
  }, []);

  const performFullSync = async (token: string) => { if (!SHEET_ID) return; setIsGlobalLoading(true); try { await handleSyncServices(token, true); await handleSyncClients(token, true); await handleSyncAppointments(token, true); await handleSyncCosts(token, true); } catch (e) { console.error(e); } finally { setIsGlobalLoading(false); } };
  const initAuthLogic = () => { if ((window as any).google) { googleService.init(async (tr) => { if (tr && tr.access_token) { const token = tr.access_token; localStorage.setItem('petgestor_access_token', token); localStorage.setItem('petgestor_token_expiry', (Date.now() + (tr.expires_in || 3599) * 1000).toString()); setAccessToken(token); const profile = await googleService.getUserProfile(token); if (profile) { const user = { id: profile.id, name: profile.name, email: profile.email, picture: profile.picture }; setGoogleUser(user); localStorage.setItem('petgestor_user_profile', JSON.stringify(user)); } performFullSync(token); } }); } else setTimeout(initAuthLogic, 1000); };
  const handleLogout = () => { setAccessToken(null); setGoogleUser(null); localStorage.removeItem('petgestor_access_token'); localStorage.removeItem('petgestor_token_expiry'); localStorage.removeItem('petgestor_user_profile'); if((window as any).google) (window as any).google.accounts.id.disableAutoSelect(); };
  const handleSaveConfig = (id: string) => { localStorage.setItem('petgestor_client_id', id); setIsConfigured(true); window.location.reload(); };
  const handleResetConfig = () => { localStorage.removeItem('petgestor_client_id'); setIsConfigured(false); setGoogleUser(null); };

  const handleSyncCosts = async (token: string, silent = false) => { if (!token || !SHEET_ID) return; try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'Custo Mensal!A:F'); if(!rows) return; const loaded: CostItem[] = []; rows.slice(1).forEach((r: string[], i: number) => { const amt = parseFloat(r[4]?.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.') || '0'); loaded.push({ id: `cost_${i}`, month: r[0], week: r[1], date: r[2]?.split('/').reverse().join('-') || new Date().toISOString(), category: r[3], amount: isNaN(amt)?0:amt, status: r[5] }); }); setCosts(loaded); } catch (e) {} };
  const handleSyncClients = async (token: string, silent = false) => { if (!token || !SHEET_ID) return; try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'CADASTRO!A:O'); if (!rows) return; const cMap = new Map<string, Client>(); rows.slice(1).forEach((r: string[], i: number) => { const phone = r[4]?.replace(/\D/g, ''); if(!phone) return; if(!cMap.has(phone)) cMap.set(phone, { id: phone, name: r[3], phone: r[4], address: r[5] || '', complement: r[11] || '', createdAt: new Date().toISOString(), pets: [] }); const c = cMap.get(phone)!; if(r[6]) c.pets.push({ id: `${phone}_p_${i}`, name: r[6], breed: r[7]||'SRD', size: r[8]||'', coat: r[9]||'', notes: r[10]||'', age: r[12]||'', gender: r[13]||'' }); }); const list = Array.from(cMap.values()); setClients(list); db.saveClients(list); if(!silent) alert(`${list.length} clientes sincronizados.`); } catch (e) { if(!silent) alert("Erro ao sync clientes."); } };
  const handleDeleteClient = (id: string) => { const u = clients.filter(c => c.id !== id); setClients(u); db.saveClients(u); };
  const handleAddService = (s: Service) => { const u = [...services, s]; setServices(u); db.saveServices(u); };
  const handleDeleteService = (id: string) => { const u = services.filter(s => s.id !== id); setServices(u); db.saveServices(u); };
  const handleSyncServices = async (token: string, silent = false) => { if(!token || !SHEET_ID) return; try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'Serviço!A:E'); if(!rows) return; const ns: Service[] = []; rows.slice(1).forEach((r: string[], i: number) => { if(r[0]) ns.push({ id: `sheet_svc_${i}_${Date.now()}`, name: r[0], category: (r[1]||'principal').toLowerCase().includes('adicional')?'adicional':'principal', targetSize: r[2]||'Todos', targetCoat: r[3]||'Todos', price: parseFloat(r[4]?.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')||'0')||0, description: '', durationMin: 60 }); }); setServices(ns); db.saveServices(ns); if(!silent) alert(`${ns.length} serviços sync.`); } catch(e) { if(!silent) alert("Erro sync serviços."); } };
  const handleUpdateApp = (u: Appointment) => { const up = appointments.map(a => a.id === u.id ? u : a); setAppointments(up); db.saveAppointments(up); };
  const handleSyncAppointments = async (token: string, silent = false) => { if(!token||!SHEET_ID) return; try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'Agendamento!A:S'); if(!rows) return; const apps: Appointment[] = []; const currC = db.getClients(); rows.slice(1).forEach((r: string[], i: number) => { if(!r[1]||!r[11]) return; const c = currC.find(x => x.name.toLowerCase()===r[1].toLowerCase()); const p = c?.pets.find(x => x.name.toLowerCase()===r[0]?.toLowerCase()); const s = db.getServices().find(x => x.name.toLowerCase()===r[7]?.toLowerCase()) || db.getServices()[0]; const adds: string[] = []; [r[8], r[9], r[10]].forEach(n => { const f = db.getServices().find(x => x.name.toLowerCase()===n?.toLowerCase().trim()); if(f) adds.push(f.id); }); const paid = parseFloat(r[17]?.replace(/[^\d,.-]/g, '').replace('.','').replace(',','.')||'0'); if(c&&p) apps.push({ id: `sheet_${i}`, clientId: c.id, petId: p.id, serviceId: s?.id||'unknown', additionalServiceIds: adds, date: `${r[11].split('/').reverse().join('-')}T${r[12]||'00:00'}`, status: 'agendado', notes: r[13], durationTotal: parseInt(r[14]||'0'), paidAmount: paid>0?paid:undefined, paymentMethod: r[18] as any, googleEventId: r[19] || undefined }); }); setAppointments(apps); db.saveAppointments(apps); if(!silent) alert(`${apps.length} agendamentos sync.`); } catch(e) { if(!silent) alert("Erro sync agenda."); } };
  const handleAddAppointment = async (app: Appointment, c: Client, p: Pet, ss: Service[]) => { let geId = ''; if(accessToken) { const desc = ss.map(s=>s.name).join(' + '); let dur = 0; ss.forEach(s=>dur+=(s.durationMin||0)); const gr = await googleService.createEvent(accessToken, { summary: `Banho/Tosa: ${p.name}`, description: `Serviços: ${desc}\nObs: ${p.notes}`, startTime: app.date, durationMin: dur }); if(gr?.id) geId = gr.id; const d = new Date(app.date); await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:O', [p.name, c.name, c.phone, `${c.address} ${c.complement}`, p.breed, p.size, p.coat, ss[0]?.name||'', ss[1]?.name||'', ss[2]?.name||'', ss[3]?.name||'', d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), p.notes, dur]); setTimeout(() => handleSyncAppointments(accessToken, true), 1000); } const n = { ...app, googleEventId: geId }; const u = [...appointments, n]; setAppointments(u); db.saveAppointments(u); };
  const handleEditAppointment = async (app: Appointment, c: Client, p: Pet, ss: Service[]) => { 
      if(accessToken && app.googleEventId) { 
          const desc = ss.map(s=>s.name).join(' + '); let dur = 0; ss.forEach(s=>dur+=(s.durationMin||0)); 
          await googleService.updateEvent(accessToken, app.googleEventId, { summary: `Banho/Tosa: ${p.name}`, description: `Serviços: ${desc}\nObs: ${p.notes}`, startTime: app.date, durationMin: dur }); 
      } 
      if(accessToken && app.id.startsWith('sheet_')) { 
          const row = parseInt(app.id.split('_')[1])+2; const d = new Date(app.date); let dur = 0; ss.forEach(s=>dur+=(s.durationMin||0)); 
          await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!A${row}:O${row}`, [p.name, c.name, c.phone, `${c.address} ${c.complement}`, p.breed, p.size, p.coat, ss[0]?.name||'', ss[1]?.name||'', ss[2]?.name||'', ss[3]?.name||'', d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), p.notes, dur]); 
      } 
      const u = appointments.map(a => a.id === app.id ? app : a); setAppointments(u); db.saveAppointments(u); alert('Atualizado!'); 
  };
  const handleUpdateAppStatus = (id: string, s: Appointment['status']) => { const u = appointments.map(a => a.id === id ? { ...a, status: s } : a); setAppointments(u); db.saveAppointments(u); };
  const handleDeleteApp = async (id: string) => { const a = appointments.find(x => x.id === id); if(a?.googleEventId && accessToken) await googleService.deleteEvent(accessToken, a.googleEventId); const u = appointments.filter(x => x.id !== id); setAppointments(u); db.saveAppointments(u); };

  if (!isConfigured) return <SetupScreen onSave={handleSaveConfig} />;
  if (!googleUser) return <LoginScreen onLogin={() => googleService.login()} onReset={handleResetConfig} />;

  return (
    <HashRouter>
      <Layout currentView={currentView} setView={setCurrentView} googleUser={googleUser} onLogin={() => googleService.login()} onLogout={handleLogout}>
        {isGlobalLoading && (<div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[80] flex flex-col items-center justify-center"><Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-6" /><h3 className="text-2xl font-bold text-gray-800">Sincronizando...</h3><p className="text-gray-500 mt-2">Atualizando dados do Google Sheets</p></div>)}
        {currentView === 'revenue' && <RevenueView appointments={appointments} services={services} clients={clients} />}
        {currentView === 'costs' && <CostsView costs={costs} />}
        {currentView === 'payments' && <PaymentManager appointments={appointments} clients={clients} services={services} onUpdateAppointment={handleUpdateApp} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'clients' && <ClientManager clients={clients} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />}
        {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} onSyncServices={(s) => handleSyncServices(accessToken!, false)} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'schedule' && <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onEdit={handleEditAppointment} onUpdateStatus={handleUpdateAppStatus} onDelete={handleDeleteApp} googleUser={googleUser} />}
      </Layout>
    </HashRouter>
  );
};
export default App;