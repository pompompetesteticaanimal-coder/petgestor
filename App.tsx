
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

// 1. Setup Screen
const SetupScreen: React.FC<{ onSave: (id: string) => void }> = ({ onSave }) => {
    const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 text-center">
                <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">P</div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuração Inicial</h1>
                <p className="text-gray-500 mb-6">ID do Cliente Google (OAuth 2.0)</p>

                <div className="text-left mb-6">
                    <input 
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Ex: 1234...apps.googleusercontent.com"
                        className="w-full border p-3 rounded-lg focus:ring-2 ring-brand-500 outline-none font-mono text-sm"
                    />
                </div>

                <button 
                    onClick={() => {
                        if(clientId.trim().length > 10) onSave(clientId);
                        else alert("ID inválido");
                    }}
                    className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition"
                >
                    Salvar e Continuar
                </button>
            </div>
        </div>
    );
};

// 2. Login Screen
const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void }> = ({ onLogin, onReset }) => {
    const currentOrigin = window.location.origin;
    const isTemporaryLink = currentOrigin.includes('vercel.app') && (currentOrigin.split('-').length > 2);

    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-200 overflow-hidden p-2">
                    <img src="./logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerText = 'P';
                        (e.target as HTMLImageElement).parentElement!.classList.add('bg-brand-600', 'text-white', 'font-bold', 'text-4xl');
                    }} />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo</h1>
                <p className="text-gray-500 mb-8">Faça login para acessar sua agenda e clientes.</p>

                <button 
                    onClick={onLogin}
                    className="w-full bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all group mb-6"
                >
                    <div className="bg-white p-1 rounded-full"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" /></div>
                    Entrar com Google
                </button>

                {isTemporaryLink && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-left text-xs text-orange-800 mb-4">
                        <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Atenção: Link Temporário</p>
                        <p>Você está acessando por um link temporário. Recomenda-se usar o link principal do projeto para evitar erros de login.</p>
                    </div>
                )}
                
                <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-red-500 underline">
                    Alterar ID do Cliente
                </button>
            </div>
        </div>
    );
};

// --- CUSTOM RECHARTS TICK FOR RICH X-AXIS ---
const CustomXAxisTick = ({ x, y, payload, data }: any) => {
    const item = data && data[payload.index];
    if (!item) return <g />;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize={10} fontWeight="bold">
                {item.name}
            </text>
            <text x={0} y={0} dy={30} textAnchor="middle" fill="#059669" fontSize={10} fontWeight="bold">
                R$ {item.faturamento?.toFixed(0)}
            </text>
            <text x={0} y={0} dy={42} textAnchor="middle" fill="#6366f1" fontSize={9}>
                {item.petsCount} pets
            </text>
            {(item.growth !== undefined || item.revGrowth !== undefined) && (
                <text x={0} y={0} dy={54} textAnchor="middle" fill={(item.growth || item.revGrowth) >= 0 ? '#059669' : '#dc2626'} fontSize={9} fontWeight="bold">
                     {(item.growth || item.revGrowth) >= 0 ? '▲' : '▼'} {Math.abs(item.growth || item.revGrowth || 0).toFixed(0)}%
                </text>
            )}
        </g>
    );
};

// 3. REVENUE DASHBOARD Component
const RevenueView: React.FC<{ 
  appointments: Appointment[]; 
  services: Service[];
  clients: Client[];
}> = ({ appointments, services, clients }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getISOWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const calculateGrossRevenue = (app: Appointment) => {
      if (app.status === 'cancelado') return 0;
      if (app.paidAmount && app.paidAmount > 0) return app.paidAmount;

      const mainSvc = services.find(s => s.id === app.serviceId);
      let total = mainSvc?.price || 0;
      app.additionalServiceIds?.forEach(id => {
          const s = services.find(srv => srv.id === id);
          if (s) total += s.price;
      });
      return total;
  };

  const calculateStats = (apps: Appointment[]) => {
      let totalPets = 0;
      let totalTosas = 0;
      let paidRevenue = 0;
      let pendingRevenue = 0;

      apps.forEach(app => {
          if (app.status === 'cancelado') return;

          totalPets++;
          const isTargetTosa = (name?: string) => {
              if (!name) return false;
              const n = name.toLowerCase();
              return n.includes('tosa normal') || n.includes('tosa tesoura');
          };

          const mainSvc = services.find(s => s.id === app.serviceId);
          let hasTosa = isTargetTosa(mainSvc?.name);
          if (!hasTosa && app.additionalServiceIds) {
              app.additionalServiceIds.forEach(id => {
                  const s = services.find(srv => srv.id === id);
                  if (s && isTargetTosa(s.name)) hasTosa = true;
              });
          }
          if (hasTosa) totalTosas++;

          const gross = calculateGrossRevenue(app);
          const isPaid = app.paymentMethod && app.paymentMethod.trim() !== '';

          if (isPaid) paidRevenue += gross;
          else pendingRevenue += gross;
      });
      return { totalPets, totalTosas, paidRevenue, pendingRevenue, grossRevenue: paidRevenue + pendingRevenue };
  };

  const getWeeklyChartData = () => {
      const date = new Date(selectedDate);
      const day = date.getDay(); 
      const diff = date.getDate() - day;
      const startOfWeek = new Date(date);
      startOfWeek.setDate(diff);

      const data = [];
      const businessDays = [2, 3, 4, 5, 6]; // Ter-Sab
      
      businessDays.forEach(dayIndex => {
          const current = new Date(startOfWeek);
          current.setDate(startOfWeek.getDate() + dayIndex);
          const dateStr = current.toISOString().split('T')[0];
          
          const dailyApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');
          const totalRevenue = dailyApps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);

          const formattedDate = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const label = `${formattedDate}`;

          let growth = 0;
          if (data.length > 0) {
              const prev = data[data.length - 1];
              if (prev.faturamento > 0) growth = ((totalRevenue - prev.faturamento) / prev.faturamento) * 100;
          }

          data.push({
              name: label,
              fullDate: dateStr,
              faturamento: totalRevenue,
              petsCount: dailyApps.length,
              growth
          });
      });
      return data;
  };

  const getMonthlyChartData = () => {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; 

      const getWeekData = (targetYear: number, targetWeek: number) => {
          const apps = appointments.filter(app => {
             if (app.status === 'cancelado') return false;
             const d = new Date(app.date);
             return getISOWeek(d) === targetWeek && d.getFullYear() === targetYear;
          });
          return apps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);
      };

      const weeksInMonth = new Set<number>();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for(let d=1; d<=daysInMonth; d++) {
          weeksInMonth.add(getISOWeek(new Date(year, month, d)));
      }

      const sortedWeeks = Array.from(weeksInMonth).sort((a,b) => a-b);
      const chartData = [];

      sortedWeeks.forEach((weekNum, index) => {
          const currentRevenue = getWeekData(year, weekNum);
          const petsCount = appointments.filter(a => getISOWeek(new Date(a.date)) === weekNum && new Date(a.date).getFullYear() === year && a.status !== 'cancelado').length;
          
          let growth = 0;
          if (index > 0) {
              const prevRev = chartData[index - 1].faturamento;
              if (prevRev > 0) growth = ((currentRevenue - prevRev) / prevRev) * 100;
          }

          chartData.push({
              name: `Sem ${index + 1}`,
              faturamento: currentRevenue,
              petsCount,
              growth
          });
      });
      return chartData;
  };

  const getYearlyChartData = () => {
      const data = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const startMonth = selectedYear === 2024 ? 7 : 0; 

      for (let i = startMonth; i < 12; i++) {
          const monthApps = appointments.filter(a => {
              const d = new Date(a.date);
              return d.getFullYear() === selectedYear && d.getMonth() === i && a.status !== 'cancelado';
          });
          
          const stats = calculateStats(monthApps);
          
          let revGrowth = 0;
          if (i > startMonth) {
              const prevApps = appointments.filter(a => {
                  const d = new Date(a.date);
                  return d.getFullYear() === selectedYear && d.getMonth() === (i - 1) && a.status !== 'cancelado';
              });
              const prevStats = calculateStats(prevApps);
              if(prevStats.grossRevenue > 0) revGrowth = ((stats.grossRevenue - prevStats.grossRevenue) / prevStats.grossRevenue) * 100;
          }

          data.push({
              name: monthNames[i],
              faturamento: stats.grossRevenue,
              petsCount: stats.totalPets,
              revGrowth,
          });
      }
      return data;
  };

  const getTopSizesData = () => {
      const yearApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear && a.status !== 'cancelado');
      const counts: Record<string, number> = { 'Pequeno': 0, 'Médio': 0, 'Grande': 0 };
      yearApps.forEach(app => {
          const client = clients.find(c => c.id === app.clientId);
          const pet = client?.pets.find(p => p.id === app.petId);
          if (pet?.size) {
             const s = pet.size;
             if(s.includes('Peq')) counts['Pequeno']++;
             if(s.includes('Méd') || s.includes('Med')) counts['Médio']++;
             if(s.includes('Gra')) counts['Grande']++;
          }
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(i => i.value > 0);
  };

  const getTopBreedsData = () => {
      const yearApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear && a.status !== 'cancelado');
      const counts: Record<string, number> = {};
      yearApps.forEach(app => {
          const client = clients.find(c => c.id === app.clientId);
          const pet = client?.pets.find(p => p.id === app.petId);
          const breed = pet?.breed || 'SRD';
          counts[breed] = (counts[breed] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  };

  const dailyApps = appointments.filter(a => a.date.startsWith(selectedDate));
  const dailyStats = calculateStats(dailyApps);

  const { start: weekStart, end: weekEnd } = (() => {
      const date = new Date(selectedDate);
      const day = date.getDay();
      const diff = date.getDate() - day;
      const start = new Date(date); start.setDate(diff); 
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start, end };
  })();

  const weeklyApps = appointments.filter(a => { const d = new Date(a.date); return d >= weekStart && d <= weekEnd; });
  const weeklyStats = calculateStats(weeklyApps);
  const monthlyApps = appointments.filter(a => a.date.startsWith(selectedMonth));
  const monthlyStats = calculateStats(monthlyApps);
  const yearlyApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear);
  const yearlyStats = calculateStats(yearlyApps);

  const weeklyChartData = getWeeklyChartData();
  const monthlyChartData = getMonthlyChartData();
  const yearlyChartData = getYearlyChartData();
  const topSizesData = getTopSizesData();
  const topBreedsData = getTopBreedsData();
  const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e'];

  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition min-h-[100px]">
          <div className="flex justify-between items-start">
              <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
                  {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
              </div>
              <div className={`p-2 rounded-full ${colorClass} bg-opacity-20`}>
                   <div className={`p-1 rounded-full ${colorClass} bg-opacity-100 text-white`}>
                      <Icon size={20} />
                   </div>
              </div>
          </div>
      </div>
  );

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === id ? 'border-brand-600 text-brand-600 bg-brand-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
      >
          <Icon size={16} />
          <span className="hidden sm:inline">{label}</span>
      </button>
  );

  return (
      <div className="space-y-6 animate-fade-in pb-10">
          <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">Faturamento</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="flex">
                  <TabButton id="daily" label="Diário" icon={CalendarIcon} />
                  <TabButton id="weekly" label="Semanal" icon={BarChart2} />
                  <TabButton id="monthly" label="Mensal" icon={TrendingUp} />
                  <TabButton id="yearly" label="Anual" icon={PieChartIcon} />
              </div>
          </div>

          {activeTab === 'daily' && (
              <section className="animate-fade-in">
                  <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200">
                      <h2 className="text-lg font-bold text-gray-800">Filtro de Data</h2>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <StatCard title="Total de Pets" value={dailyStats.totalPets} icon={PawPrint} colorClass="bg-blue-500" />
                      <StatCard title="Total de Tosas" value={dailyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500" subValue="Normal e Tesoura" />
                      <StatCard title="Caixa Pago" value={`R$ ${dailyStats.paidRevenue.toFixed(2)}`} icon={CheckCircle} colorClass="bg-green-500" />
                      <StatCard title="A Receber" value={`R$ ${dailyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" />
                  </div>
              </section>
          )}

          {activeTab === 'weekly' && (
              <section className="animate-fade-in">
                  <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200">
                      <h2 className="text-lg font-bold text-gray-800">Semana de Referência</h2>
                      <span className="text-sm font-medium text-gray-500">{new Date(weekStart).toLocaleDateString('pt-BR')} - {new Date(weekEnd).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <StatCard title="Pets da Semana" value={weeklyStats.totalPets} icon={PawPrint} colorClass="bg-indigo-500" />
                      <StatCard title="Tosas da Semana" value={weeklyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500" />
                      <StatCard title="Total Pago" value={`R$ ${weeklyStats.paidRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500" />
                      <StatCard title="Pendente" value={`R$ ${weeklyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-rose-500" />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96">
                      <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16}/> Faturamento Diário (Detalhado)</h3>
                      <ResponsiveContainer width="100%" height="80%">
                          <ComposedChart data={weeklyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={weeklyChartData} />} height={60} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `R$${val}`} domain={['auto', 'auto']} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                              <Bar yAxisId="right" dataKey="petsCount" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={40} />
                              <Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </section>
          )}

          {activeTab === 'monthly' && (
              <section className="animate-fade-in">
                  <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200">
                      <h2 className="text-lg font-bold text-gray-800">Seletor de Mês</h2>
                      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <StatCard title="Total de Pets" value={monthlyStats.totalPets} icon={PawPrint} colorClass="bg-purple-500" />
                      <StatCard title="Total de Tosas" value={monthlyStats.totalTosas} icon={Scissors} colorClass="bg-pink-500" />
                      <StatCard title="Receita Paga" value={`R$ ${monthlyStats.paidRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500" />
                      <StatCard title="A Receber" value={`R$ ${monthlyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-red-500" />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96">
                      <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16}/> Comparativo Semanal (Detalhado)</h3>
                      <ResponsiveContainer width="100%" height="80%">
                          <ComposedChart data={monthlyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={monthlyChartData} />} height={60} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `R$${val}`} domain={['auto', 'auto']} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                              <Bar yAxisId="right" dataKey="petsCount" fill="#e9d5ff" radius={[4, 4, 0, 0]} barSize={40} />
                              <Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#9333ea" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </section>
          )}

          {activeTab === 'yearly' && (
              <section className="animate-fade-in">
                  <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200">
                      <h2 className="text-lg font-bold text-gray-800">Ano de Referência</h2>
                      <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <StatCard title="Total Pets" value={yearlyStats.totalPets} icon={PawPrint} colorClass="bg-sky-500" />
                      <StatCard title="Total Tosas" value={yearlyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500" />
                      <StatCard title="Faturamento Total" value={`R$ ${yearlyStats.grossRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-green-500" />
                      <StatCard title="Pendência Total" value={`R$ ${yearlyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" />
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96 mb-6">
                      <h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16}/> Evolução Mensal (Detalhado)</h3>
                      <ResponsiveContainer width="100%" height="80%">
                          <ComposedChart data={yearlyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={yearlyChartData} />} height={60} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} domain={['auto', 'auto']} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                              <Bar yAxisId="right" dataKey="petsCount" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={30} />
                              <Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#059669" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80">
                          <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><PawPrint size={16}/> Top 5 Raças</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart layout="vertical" data={topBreedsData} margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                  <Tooltip cursor={{fill: 'transparent'}} />
                                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20}>
                                      <LabelList dataKey="value" position="right" style={{fontSize: 12, fill: '#b45309', fontWeight: 'bold'}} />
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80">
                          <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><PieChartIcon size={16}/> Distribuição por Porte</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={topSizesData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                      {topSizesData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                  </Pie>
                                  <Tooltip />
                                  <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </section>
          )}
      </div>
  );
};

// 4. COSTS VIEW Component
const CostsView: React.FC<{ costs: CostItem[] }> = ({ costs }) => {
    // ... [Mantendo lógica de custos inalterada para brevidade, já que o foco é edição e tela branca] ...
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const filterCosts = () => {
        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-');
            return costs.filter(c => {
                const d = new Date(c.date);
                return d.getFullYear() === parseInt(y) && d.getMonth() === (parseInt(m) - 1);
            });
        }
        return costs.filter(c => new Date(c.date).getFullYear() === selectedYear);
    };

    const filteredCosts = filterCosts();
    const totalCost = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const paidCost = filteredCosts.filter(c => c.status && c.status.toLowerCase() === 'pago').reduce((acc, c) => acc + c.amount, 0);
    const pendingCost = filteredCosts.filter(c => !c.status || c.status.toLowerCase() !== 'pago').reduce((acc, c) => acc + c.amount, 0);

    const getCostByCategory = () => {
        const counts: Record<string, number> = {};
        filteredCosts.forEach(c => {
            const cat = c.category || 'Outros';
            counts[cat] = (counts[cat] || 0) + c.amount;
        });
        
        const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
        
        if (others > 0) top5.push({ name: 'Outros', value: others });
        return top5;
    };

    const getCostByMonth = () => {
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 }));
        
        const yearCosts = costs.filter(c => new Date(c.date).getFullYear() === selectedYear);
        yearCosts.forEach(c => {
            const d = new Date(c.date);
            if(!isNaN(d.getTime())) data[d.getMonth()].value += c.amount;
        });
        
        const startIdx = selectedYear === 2024 ? 7 : 0;
        return data.slice(startIdx);
    };
    const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Custo Mensal</h1>
                <div className="flex bg-white rounded-lg p-1 border">
                    <button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'monthly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Mês</button>
                    <button onClick={() => setViewMode('yearly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'yearly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Ano</button>
                </div>
            </div>
            <div className="flex items-center mb-6 bg-white p-3 rounded-xl border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mr-4">Período:</h2>
                {viewMode === 'monthly' ? (
                     <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" />
                ) : (
                     <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase">Custo Total</p>
                      <h3 className="text-2xl font-bold text-rose-600">R$ {totalCost.toFixed(2)}</h3>
                      <div className="p-2 bg-rose-100 text-rose-600 rounded-full w-fit mt-2"><ShoppingBag size={20}/></div>
                  </div>
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase">Pago</p>
                      <h3 className="text-2xl font-bold text-green-600">R$ {paidCost.toFixed(2)}</h3>
                      <div className="p-2 bg-green-100 text-green-600 rounded-full w-fit mt-2"><CheckCircle size={20}/></div>
                  </div>
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase">Pendente</p>
                      <h3 className="text-2xl font-bold text-orange-600">R$ {pendingCost.toFixed(2)}</h3>
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-full w-fit mt-2"><AlertCircle size={20}/></div>
                  </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80">
                      <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
                          <BarChart2 size={16}/> Evolução Mensal (Ano Selecionado)
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getCostByMonth()} margin={{top: 20}}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                              <YAxis tickFormatter={(val) => `R$${val}`} tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                              <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                              <Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="value" position="top" style={{fontSize: 10, fill: '#e11d48'}} formatter={(val: number) => val > 0 ? `R$${val.toFixed(0)}` : ''} />
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80">
                      <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
                          <Tag size={16}/> Custos por Categoria (Top 5)
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={getCostByCategory()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                  {getCostByCategory().map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                              <Legend layout="vertical" verticalAlign="middle" align="right" />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
            </div>
        </div>
    );
};

// 6. Schedule Manager (NEW CALENDAR UI with Edit Logic)
const ScheduleManager: React.FC<{
    appointments: Appointment[];
    clients: Client[];
    services: Service[];
    onAdd: (app: Appointment, client: Client, pet: Pet, services: Service[]) => void;
    onEdit: (app: Appointment, client: Client, pet: Pet, services: Service[]) => void;
    onUpdateStatus: (id: string, status: Appointment['status']) => void;
    onDelete: (id: string) => void;
    googleUser: GoogleUser | null;
}> = ({ appointments, clients, services, onAdd, onEdit, onUpdateStatus, onDelete }) => {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailsApp, setDetailsApp] = useState<Appointment | null>(null);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, appId: string} | null>(null);
    const [isEditingMode, setIsEditingMode] = useState(false);
    
    // Form State
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [selectedPet, setSelectedPet] = useState<string>('');
    const [selectedService, setSelectedService] = useState<string>('');
    const [selectedAddServices, setSelectedAddServices] = useState<string[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [notes, setNotes] = useState('');
    const [editingAppId, setEditingAppId] = useState<string | null>(null);

    const resetForm = () => {
        setClientSearch(''); setSelectedClient(''); setSelectedPet(''); setSelectedService('');
        setSelectedAddServices([]); setTime('09:00'); setNotes('');
        setIsModalOpen(false);
        setIsEditingMode(false);
        setEditingAppId(null);
    };

    const handleStartEdit = (app: Appointment) => {
        setIsEditingMode(true);
        setEditingAppId(app.id);
        setSelectedClient(app.clientId);
        setSelectedPet(app.petId);
        setSelectedService(app.serviceId);
        setSelectedAddServices(app.additionalServiceIds || []);
        
        const d = new Date(app.date);
        setDate(d.toISOString().split('T')[0]);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        setTime(`${h}:${m}`);
        
        setNotes(app.notes || '');
        setDetailsApp(null);
        setContextMenu(null);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!selectedClient || !selectedPet || !selectedService || !date || !time) return;

        const d = new Date(date);
        const day = d.getDay(); 
        const [y, m, dt] = date.split('-').map(Number);
        const checkDate = new Date(y, m-1, dt);
        const checkDay = checkDate.getDay();

        if (checkDay === 0 || checkDay === 1) {
            alert("A agenda está fechada Domingos e Segundas.");
            return;
        }

        const client = clients.find(c => c.id === selectedClient);
        const pet = client?.pets.find(p => p.id === selectedPet);
        const mainSvc = services.find(s => s.id === selectedService);
        const addSvcs = selectedAddServices.map(id => services.find(s => s.id === id)).filter(s => s) as Service[];

        if (client && pet && mainSvc) {
            const appointmentData: Appointment = {
                id: isEditingMode && editingAppId ? editingAppId : `local_${Date.now()}`,
                clientId: client.id,
                petId: pet.id,
                serviceId: mainSvc.id,
                additionalServiceIds: selectedAddServices,
                date: `${date}T${time}:00`,
                status: 'agendado',
                notes: notes,
                googleEventId: isEditingMode && editingAppId ? appointments.find(a => a.id === editingAppId)?.googleEventId : undefined
            };

            if (isEditingMode) {
                onEdit(appointmentData, client, pet, [mainSvc, ...addSvcs]);
            } else {
                onAdd(appointmentData, client, pet, [mainSvc, ...addSvcs]);
            }
            resetForm();
        }
    };

    const handleDeleteFromContext = () => {
        if(contextMenu && confirm('Excluir agendamento?')) {
            onDelete(contextMenu.appId);
        }
        setContextMenu(null);
    };

    const filteredClients = clientSearch.length > 0 
        ? clients.filter(c => 
            c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
            c.phone.includes(clientSearch) ||
            c.pets.some(p => p.name.toLowerCase().includes(clientSearch.toLowerCase()))
          ).slice(0, 5)
        : [];

    const selectedClientData = clients.find(c => c.id === selectedClient);
    const pets = selectedClientData?.pets || [];
    const selectedPetData = pets.find(p => p.id === selectedPet);

    const getApplicableServices = (category: 'principal' | 'adicional') => {
        if (!selectedPetData) return [];
        return services.filter(s => {
            const matchesCategory = s.category === category;
            const matchesSize = s.targetSize === 'Todos' || !s.targetSize || (selectedPetData.size && s.targetSize.toLowerCase().includes(selectedPetData.size.toLowerCase()));
            const matchesCoat = s.targetCoat === 'Todos' || !s.targetCoat || (selectedPetData.coat && s.targetCoat.toLowerCase().includes(selectedPetData.coat.toLowerCase()));
            return matchesCategory && matchesSize && matchesCoat;
        });
    };

    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate);
    };

    const generateTimeOptions = () => {
        const slots = [];
        for (let h = 9; h <= 18; h++) {
            ['00', '15', '30', '45'].forEach(m => {
                if(h === 18 && m !== '00') return; 
                slots.push(`${String(h).padStart(2, '0')}:${m}`);
            });
        }
        return slots;
    };
    const timeOptions = generateTimeOptions();

    const AppointmentCard = ({ app, isSmall }: { app: Appointment, isSmall?: boolean }) => {
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const s = services.find(srv => srv.id === app.serviceId);
        const s1 = app.additionalServiceIds?.[0] ? services.find(srv => srv.id === app.additionalServiceIds[0]) : null;

        const isTosa = s?.name.toLowerCase().includes('tosa');
        const isBath = s?.name.toLowerCase().includes('banho');
        const color = isTosa ? 'bg-orange-100 border-orange-200 text-orange-900' : isBath ? 'bg-blue-100 border-blue-200 text-blue-900' : 'bg-purple-100 border-purple-200 text-purple-900';
        
        return (
            <div 
                className={`relative flex-1 w-full rounded p-1 border shadow-sm ${color} z-20 min-h-[50px] cursor-pointer select-none hover:opacity-80 transition`}
                onClick={(e) => {
                    e.stopPropagation();
                    setDetailsApp(app);
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, appId: app.id });
                }}
            >
                <div className="font-bold text-[10px] leading-tight truncate">{client?.name}</div>
                <div className="font-bold text-[10px] leading-tight truncate text-gray-700">{pet?.name}</div>
                <div className="text-[9px] leading-tight truncate opacity-90">{s?.name}</div>
                {s1 && <div className="text-[9px] leading-tight truncate opacity-90 font-medium border-t border-black/10 pt-0.5">{s1.name}</div>}
            </div>
        )
    }

    const renderCalendar = () => {
        const start = new Date(currentDate);
        start.setHours(0,0,0,0);
        
        if (viewMode === 'month') {
            const year = start.getFullYear();
            const month = start.getMonth();
            const firstDay = new Date(year, month, 1);
            const startingDay = firstDay.getDay(); 
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const days = [];
            for(let i=0; i<startingDay; i++) days.push(null);
            for(let i=1; i<=daysInMonth; i++) days.push(new Date(year, month, i));

            return (
                <div className="grid grid-cols-7 gap-1 h-full auto-rows-fr bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                        <div key={d} className="bg-gray-50 text-center py-2 text-xs font-bold text-gray-500 uppercase">{d}</div>
                    ))}
                    {days.map((d, idx) => {
                         if (!d) return <div key={`pad-${idx}`} className="bg-white min-h-[80px]" />;
                         const dateStr = d.toISOString().split('T')[0];
                         const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');
                         const isToday = dateStr === new Date().toISOString().split('T')[0];
                         const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                         return (
                             <div key={idx} className={`bg-white p-1 min-h-[100px] flex flex-col border border-gray-50 ${isToday ? 'bg-blue-50' : ''} ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                                 <div className={`text-xs font-bold mb-1 ${isToday ? 'text-brand-600' : 'text-gray-500'}`}>{d.getDate()}</div>
                                 <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                                     {dayApps.map(app => (
                                         <AppointmentCard key={app.id} app={app} isSmall />
                                     ))}
                                 </div>
                             </div>
                         )
                    })}
                </div>
            )
        }

        const startOfWeek = new Date(start);
        startOfWeek.setDate(start.getDate() - start.getDay()); 
        
        let daysIndices = viewMode === 'week' ? [2, 3, 4, 5, 6] : [start.getDay()];
        const hours = Array.from({length: 10}, (_, i) => i + 9); 

        return (
            <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50"></div>
                    {daysIndices.map((dayIdx) => {
                        const d = new Date(startOfWeek);
                        d.setDate(d.getDate() + dayIdx);
                        const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                        return (
                            <div key={dayIdx} className={`flex-1 text-center py-2 border-r border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <div className={`text-xs font-bold uppercase ${isToday ? 'text-brand-600' : 'text-gray-500'}`}>
                                    {d.toLocaleDateString('pt-BR', {weekday: 'short'})}
                                </div>
                                <div className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                                    {d.getDate()}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex-1 overflow-y-auto" onClick={() => setContextMenu(null)}>
                    {hours.map(h => (
                        <div key={h} className="flex min-h-[80px] border-b border-gray-100 relative">
                            <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50 text-[10px] text-gray-400 font-medium p-1 text-right sticky left-0 z-10">
                                {String(h).padStart(2,'0')}:00
                            </div>
                            
                            {daysIndices.map((dayIdx) => {
                                const d = new Date(startOfWeek);
                                d.setDate(d.getDate() + dayIdx);
                                const dateStr = d.toISOString().split('T')[0];
                                const slotApps = appointments.filter(a => {
                                    if(a.status === 'cancelado') return false;
                                    const aDate = new Date(a.date);
                                    return aDate.getDate() === d.getDate() && aDate.getMonth() === d.getMonth() && aDate.getFullYear() === d.getFullYear() && aDate.getHours() === h;
                                });

                                return (
                                    <div 
                                        key={`${dateStr}-${h}`} 
                                        className="flex-1 border-r border-gray-100 relative p-1 group hover:bg-gray-50 flex flex-col gap-1 min-w-0"
                                        onClick={() => {
                                            setDate(dateStr);
                                            setTime(`${String(h).padStart(2,'0')}:00`);
                                            setIsModalOpen(true);
                                        }}
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        {slotApps.map(app => (
                                             <AppointmentCard key={app.id} app={app} />
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-4 animate-fade-in relative h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'day' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Dia</button>
                        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Semana</button>
                        <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Mês</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={20}/></button>
                        <span className="text-sm font-bold text-gray-800 min-w-[100px] text-center">
                            {viewMode === 'day' && currentDate.toLocaleDateString('pt-BR')}
                            {viewMode === 'month' && currentDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}
                            {viewMode === 'week' && `Semana ${currentDate.getDate()}`}
                        </span>
                        <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={20}/></button>
                    </div>
                </div>
                <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="w-full md:w-auto bg-brand-600 text-white px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-brand-700 transition flex items-center justify-center gap-2 text-sm"
                >
                    <Plus size={18} /> Novo Agendamento
                </button>
            </div>

            <div className="flex-1 min-h-0 relative">
                {renderCalendar()}
                {contextMenu && (
                    <div 
                        className="fixed bg-white shadow-xl border border-gray-200 rounded-lg z-[100] py-1 min-w-[150px]"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                         <div className="px-4 py-2 text-xs text-gray-400 font-bold border-b border-gray-50 mb-1">Opções</div>
                        <button onClick={() => { setContextMenu(null); handleStartEdit(appointments.find(a=>a.id===contextMenu.appId)!); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm flex items-center gap-2">
                            <Edit2 size={14}/> Editar
                        </button>
                        <button onClick={handleDeleteFromContext} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2">
                            <Trash2 size={14}/> Excluir
                        </button>
                    </div>
                )}
            </div>

            {detailsApp && (() => {
                const client = clients.find(c => c.id === detailsApp.clientId);
                const pet = client?.pets.find(p => p.id === detailsApp.petId);
                const s = services.find(srv => srv.id === detailsApp.serviceId);
                const addSvcs = detailsApp.additionalServiceIds?.map(id => services.find(srv => srv.id === id)).filter(x=>x);

                return (
                    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailsApp(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{pet?.name}</h3>
                                    <p className="text-gray-500">{client?.name}</p>
                                </div>
                                <button onClick={() => handleStartEdit(detailsApp)} className="text-brand-600 hover:bg-brand-50 p-2 rounded-full transition">
                                    <Edit2 size={20}/>
                                </button>
                            </div>
                            <button onClick={() => setDetailsApp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Phone size={20}/></div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Telefone</p>
                                        <p className="text-sm font-medium text-gray-800">{client?.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><MapPin size={20}/></div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Endereço</p>
                                        <p className="text-sm font-medium text-gray-800">{client?.address} {client?.complement ? `- ${client.complement}` : ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><FileText size={20}/></div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Observações</p>
                                        <p className="text-sm font-medium text-gray-800 italic">{detailsApp.notes || 'Nenhuma observação.'}</p>
                                        <p className="text-sm font-medium text-gray-800 italic mt-1 text-xs opacity-75">{pet?.notes}</p>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                     <p className="text-xs font-bold text-gray-400 uppercase mb-2">Serviços Contratados</p>
                                     <div className="flex flex-wrap gap-2">
                                         <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-bold">{s?.name}</span>
                                         {addSvcs?.map(as => (
                                             <span key={as?.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">{as?.name}</span>
                                         ))}
                                     </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t flex justify-center">
                                <button 
                                    onClick={() => {
                                        setDetailsApp(null);
                                        handleStartEdit(detailsApp);
                                    }} 
                                    className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={18}/> Editar Agendamento
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Modal for New/Edit Appointment */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">{isEditingMode ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                            <button onClick={resetForm}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {!isEditingMode && (
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Cliente</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input 
                                                type="text"
                                                value={selectedClientData ? selectedClientData.name : clientSearch}
                                                onChange={(e) => {
                                                    setClientSearch(e.target.value);
                                                    setSelectedClient(''); 
                                                    setSelectedPet('');
                                                    setSelectedService('');
                                                }}
                                                placeholder="Nome, Telefone ou Pet..."
                                                className={`w-full pl-10 pr-10 py-3 border rounded-xl outline-none focus:ring-2 ring-brand-200 text-sm ${selectedClientData ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 'bg-white'}`}
                                            />
                                            {selectedClientData && (
                                                <button onClick={() => { setClientSearch(''); setSelectedClient(''); }} className="absolute right-3 top-3 text-gray-400 hover:text-red-500">
                                                    <X size={16}/>
                                                </button>
                                            )}
                                        </div>
                                        {clientSearch.length > 0 && !selectedClient && filteredClients.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                                                {filteredClients.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => {
                                                            setSelectedClient(c.id);
                                                            setClientSearch('');
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-800">{c.name}</div>
                                                            <div className="text-xs text-gray-500">{c.pets.map(p => p.name).join(', ')}</div>
                                                        </div>
                                                        <div className="text-xs text-gray-400">{c.phone}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedClient && (
                                    <div className="animate-fade-in">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecionar Pet</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {pets.map(p => (
                                                <button 
                                                    key={p.id}
                                                    onClick={() => { setSelectedPet(p.id); setSelectedService(''); setSelectedAddServices([]); }}
                                                    className={`p-3 rounded-xl border text-left transition ${selectedPet === p.id ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'hover:bg-gray-50 border-gray-200'}`}
                                                >
                                                    <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase">{p.size} • {p.coat}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedPet && (
                                    <div className="animate-fade-in space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serviço Principal</label>
                                            <select 
                                                value={selectedService} 
                                                onChange={e => setSelectedService(e.target.value)} 
                                                className="w-full border p-3 rounded-xl bg-white outline-none focus:ring-2 ring-brand-200 text-sm"
                                            >
                                                <option value="">Selecione...</option>
                                                {getApplicableServices('principal').map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adicionais</label>
                                            <div className="flex gap-2">
                                                <select
                                                    className="flex-1 border p-3 rounded-xl bg-white outline-none focus:ring-2 ring-brand-200 text-sm"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if(val && !selectedAddServices.includes(val) && selectedAddServices.length < 3) {
                                                            setSelectedAddServices(prev => [...prev, val]);
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                >
                                                    <option value="">Adicionar serviço...</option>
                                                    {getApplicableServices('adicional').map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedAddServices.map(id => {
                                                    const s = services.find(srv => srv.id === id);
                                                    return (
                                                        <div key={id} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                                            {s?.name}
                                                            <button onClick={() => setSelectedAddServices(prev => prev.filter(pid => pid !== id))} className="hover:text-purple-900"><X size={12}/></button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border p-3 rounded-xl bg-white outline-none focus:ring-2 ring-brand-200 text-sm font-medium" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                                                <select value={time} onChange={e => setTime(e.target.value)} className="w-full border p-3 rounded-xl bg-white outline-none focus:ring-2 ring-brand-200 text-sm font-medium">
                                                    {timeOptions.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label>
                                            <textarea 
                                                value={notes} 
                                                onChange={e => setNotes(e.target.value)} 
                                                className="w-full border p-3 rounded-xl bg-white outline-none focus:ring-2 ring-brand-200 text-sm"
                                                rows={2}
                                                placeholder="Notas internas..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={resetForm} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition text-sm">Cancelar</button>
                            <button 
                                onClick={handleSave} 
                                disabled={!selectedClient || !selectedPet || !selectedService || !date || !time}
                                className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg shadow-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                            >
                                {isEditingMode ? 'Salvar Alterações' : 'Agendar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 7. Payment Manager
const PaymentManager: React.FC<{ 
  appointments: Appointment[]; 
  clients: Client[]; 
  services: Service[]; 
  onUpdateAppointment: (app: Appointment) => void; 
  accessToken: string | null; 
  sheetId: string | null; 
}> = ({ appointments, clients, services, onUpdateAppointment, accessToken, sheetId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'paid' | 'all'>('pending');

  const filteredApps = appointments.filter(app => {
     if (app.status === 'cancelado') return false;
     const client = clients.find(c => c.id === app.clientId);
     const matchSearch = client?.name.toLowerCase().includes(searchTerm.toLowerCase());
     const isPaid = app.paymentMethod && app.paymentMethod !== '';
     const matchStatus = filterStatus === 'all' ? true : filterStatus === 'paid' ? isPaid : !isPaid;
     return matchSearch && matchStatus;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePayment = async (app: Appointment, method: any, amount: number) => {
      const updatedApp = { ...app, paymentMethod: method, paidAmount: amount };
      
      // Update Sheet logic simplified
      if (accessToken && sheetId && app.id.startsWith('sheet_')) {
          const idx = parseInt(app.id.split('_')[1]);
          const row = idx + 2;
          try {
             await googleService.updateSheetValues(accessToken, sheetId, `Agendamento!R${row}:S${row}`, [amount, method]);
          } catch(e) {
             console.error('Failed to update sheet payment', e);
          }
      }
      onUpdateAppointment(updatedApp);
  };

  return (
      <div className="space-y-6 animate-fade-in pb-10">
          <h1 className="text-2xl font-bold text-gray-800">Gerenciar Pagamentos</h1>
          <div className="flex gap-4 mb-4">
              <input 
                 className="flex-1 border p-3 rounded-xl" 
                 placeholder="Buscar cliente..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
              />
              <select className="border p-3 rounded-xl" value={filterStatus} onChange={(e:any) => setFilterStatus(e.target.value)}>
                  <option value="pending">Pendentes</option>
                  <option value="paid">Pagos</option>
                  <option value="all">Todos</option>
              </select>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               {filteredApps.map(app => {
                   const client = clients.find(c => c.id === app.clientId);
                   const pet = client?.pets.find(p => p.id === app.petId);
                   const service = services.find(s => s.id === app.serviceId);
                   const total = (service?.price || 0) + (app.additionalServiceIds?.reduce((acc, curr) => {
                       const s = services.find(x => x.id === curr);
                       return acc + (s?.price || 0);
                   }, 0) || 0);
                   
                   const isPaid = app.paymentMethod && app.paymentMethod !== '';

                   return (
                       <div key={app.id} className="p-4 border-b last:border-0 flex flex-col md:flex-row justify-between items-center gap-4">
                           <div>
                               <div className="font-bold text-gray-800">{client?.name} - {pet?.name}</div>
                               <div className="text-sm text-gray-500">{new Date(app.date).toLocaleDateString()} - {service?.name}</div>
                               <div className="font-bold text-brand-600">Total: R$ {total.toFixed(2)}</div>
                           </div>
                           <div className="flex items-center gap-2">
                               {isPaid ? (
                                   <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-sm flex items-center gap-2">
                                       <CheckCircle size={16}/> Pago ({app.paymentMethod})
                                   </div>
                               ) : (
                                   <div className="flex gap-2">
                                       <select 
                                         className="border p-2 rounded-lg text-sm"
                                         onChange={(e) => {
                                             if(e.target.value) {
                                                if(confirm(`Confirmar pagamento em ${e.target.value}?`)) {
                                                    handlePayment(app, e.target.value, total);
                                                }
                                                e.target.value = '';
                                             }
                                         }}
                                         defaultValue=""
                                       >
                                           <option value="" disabled>Receber...</option>
                                           <option value="Pix">Pix</option>
                                           <option value="Dinheiro">Dinheiro</option>
                                           <option value="Cartão">Cartão</option>
                                       </select>
                                   </div>
                               )}
                           </div>
                       </div>
                   )
               })}
               {filteredApps.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum agendamento encontrado.</div>}
          </div>
      </div>
  )
};

// 8. Client Manager
const ClientManager: React.FC<{
    clients: Client[];
    onDeleteClient: (id: string) => void;
    googleUser: GoogleUser | null;
    accessToken: string | null;
}> = ({ clients, onDeleteClient }) => {
    const [search, setSearch] = useState('');
    
    const filtered = clients.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.phone.includes(search) || 
        c.pets.some(p => p.name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20}/>
                <input 
                    className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:ring-2 ring-brand-200 outline-none" 
                    placeholder="Buscar por nome, telefone ou pet..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(client => (
                    <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative group">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="font-bold text-gray-800">{client.name}</h3>
                                <div className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12}/> {client.phone}</div>
                            </div>
                            <button onClick={() => confirm('Excluir cliente?') && onDeleteClient(client.id)} className="text-gray-300 hover:text-red-500 transition">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                        <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
                             {client.pets.map(pet => (
                                 <div key={pet.id} className="bg-gray-50 p-2 rounded-lg text-sm flex justify-between items-center">
                                     <span className="font-medium text-gray-700">{pet.name}</span>
                                     <span className="text-xs text-gray-400">{pet.breed}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 9. Service Manager
const ServiceManager: React.FC<{
    services: Service[];
    onAddService: (s: Service) => void;
    onDeleteService: (id: string) => void;
    onSyncServices: (silent: boolean) => void;
    accessToken: string | null;
    sheetId: string | null;
}> = ({ services, onAddService, onDeleteService, onSyncServices }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [newService, setNewService] = useState<Partial<Service>>({ category: 'principal', durationMin: 60 });

    const handleSubmit = () => {
        if (newService.name && newService.price) {
            onAddService({
                id: `local_${Date.now()}`,
                name: newService.name,
                price: parseFloat(newService.price.toString()),
                durationMin: newService.durationMin || 60,
                description: newService.description || '',
                category: newService.category as any,
                targetSize: newService.targetSize || 'Todos',
                targetCoat: newService.targetCoat || 'Todos'
            });
            setIsFormOpen(false);
            setNewService({ category: 'principal', durationMin: 60 });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Serviços</h1>
                <div className="flex gap-2">
                     <button onClick={() => onSyncServices(false)} className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 flex items-center gap-2">
                        <Sparkles size={16}/> Sincronizar
                    </button>
                    <button onClick={() => setIsFormOpen(true)} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 flex items-center gap-2">
                        <Plus size={16}/> Novo Serviço
                    </button>
                </div>
            </div>

            {isFormOpen && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6 animate-fade-in">
                    <h3 className="font-bold text-lg mb-4">Adicionar Serviço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input className="border p-2 rounded-lg" placeholder="Nome" value={newService.name || ''} onChange={e => setNewService({...newService, name: e.target.value})} />
                        <input className="border p-2 rounded-lg" type="number" placeholder="Preço" value={newService.price || ''} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} />
                        <select className="border p-2 rounded-lg" value={newService.category} onChange={e => setNewService({...newService, category: e.target.value as any})}>
                            <option value="principal">Principal</option>
                            <option value="adicional">Adicional</option>
                        </select>
                        <input className="border p-2 rounded-lg" type="number" placeholder="Duração (min)" value={newService.durationMin || ''} onChange={e => setNewService({...newService, durationMin: parseInt(e.target.value)})} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg">Salvar</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Preço</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {services.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 text-sm font-bold text-gray-800">{s.name}</td>
                                <td className="p-4 text-sm text-gray-500 capitalize">{s.category}</td>
                                <td className="p-4 text-sm font-bold text-green-600">R$ {s.price.toFixed(2)}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => confirm('Excluir serviço?') && onDeleteService(s.id)} className="text-gray-300 hover:text-red-500">
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('payments');
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [isConfigured, setIsConfigured] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const SHEET_ID = localStorage.getItem('petgestor_sheet_id') || PREDEFINED_SHEET_ID;

  // Persistence Constants
  const STORAGE_KEY_TOKEN = 'petgestor_access_token';
  const STORAGE_KEY_EXPIRY = 'petgestor_token_expiry';
  const STORAGE_KEY_USER = 'petgestor_user_profile';

  useEffect(() => {
    setClients(db.getClients());
    setServices(db.getServices());
    setAppointments(db.getAppointments());
    
    // Check Config
    if (!localStorage.getItem('petgestor_client_id')) localStorage.setItem('petgestor_client_id', DEFAULT_CLIENT_ID);
    
    // Check Persisted Session
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);

    if (storedToken && storedExpiry && storedUser) {
        if (Date.now() < parseInt(storedExpiry)) {
            // Restore Session
            setAccessToken(storedToken);
            setGoogleUser(JSON.parse(storedUser));
            // Trigger auto sync on restore
            performFullSync(storedToken);
        } else {
            // Expired: Clear storage
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_EXPIRY);
            localStorage.removeItem(STORAGE_KEY_USER);
        }
    }

    initAuthLogic();
  }, []);

  const performFullSync = async (token: string) => {
      if (!SHEET_ID) return;
      setIsGlobalLoading(true);
      try {
          await handleSyncServices(token, true);
          await handleSyncClients(token, true);
          await handleSyncAppointments(token, true);
          await handleSyncCosts(token, true);
      } catch (e) {
          console.error("Auto Sync Failed", e);
      } finally {
          setIsGlobalLoading(false);
      }
  }

  const initAuthLogic = () => {
    if ((window as any).google) {
        googleService.init(async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                const token = tokenResponse.access_token;
                const expiresIn = tokenResponse.expires_in || 3599; 
                localStorage.setItem(STORAGE_KEY_TOKEN, token);
                localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + (expiresIn * 1000)).toString());
                setAccessToken(token);
                const profile = await googleService.getUserProfile(token);
                if (profile) {
                    const user = { id: profile.id, name: profile.name, email: profile.email, picture: profile.picture };
                    setGoogleUser(user);
                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
                }
                performFullSync(token);
            }
        });
    } else {
        setTimeout(initAuthLogic, 1000);
    }
  };

  const handleLogout = () => {
      setAccessToken(null);
      setGoogleUser(null);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_EXPIRY);
      localStorage.removeItem(STORAGE_KEY_USER);
      if((window as any).google) (window as any).google.accounts.id.disableAutoSelect();
  }

  const handleSaveConfig = (id: string) => {
      localStorage.setItem('petgestor_client_id', id);
      setIsConfigured(true);
      window.location.reload();
  };

  const handleResetConfig = () => {
      localStorage.removeItem('petgestor_client_id');
      setIsConfigured(false);
      setGoogleUser(null);
  };

  const handleSyncCosts = async (token: string, silent = false) => {
      const tokenToUse = token;
      if (!tokenToUse || !SHEET_ID) return;

      try {
          const rows = await googleService.getSheetValues(tokenToUse, SHEET_ID, 'Custo Mensal!A:F');
          if(!rows || rows.length < 2) return;

          const loadedCosts: CostItem[] = [];
          
          rows.slice(1).forEach((row: string[], idx: number) => {
              const dateStr = row[2]; // DD/MM/YYYY
              const typeStr = row[3];
              const costStr = row[4];
              const statusStr = row[5];
              
              if(!dateStr || !costStr) return;
              
              let isoDate = new Date().toISOString();
              try {
                  const [day, month, year] = dateStr.split('/');
                  if(day && month && year) isoDate = `${year}-${month}-${day}T00:00:00`;
              } catch(e){}
              
              let amount = 0;
              const cleanCost = costStr.replace(/[^\d,.-]/g, '').trim();
              amount = parseFloat(cleanCost.includes(',') ? cleanCost.replace(/\./g, '').replace(',', '.') : cleanCost);
              if(isNaN(amount)) amount = 0;

              loadedCosts.push({
                  id: `cost_${idx}`,
                  month: row[0],
                  week: row[1],
                  date: isoDate,
                  category: typeStr,
                  amount: amount,
                  status: statusStr && statusStr.toLowerCase() === 'pago' ? 'Pago' : ''
              });
          });

          setCosts(loadedCosts);
          if(!silent) alert("Custos atualizados.");
      } catch (e) {
          console.error(e);
      }
  };

  const handleSyncClients = async (token: string, silent = false) => {
    const tokenToUse = token;
    if (!tokenToUse || !SHEET_ID) {
      if(!silent) alert("Erro: Login ou ID da Planilha faltando.");
      return;
    }

    try {
      const rows = await googleService.getSheetValues(tokenToUse, SHEET_ID, 'CADASTRO!A:O'); 
      if (!rows || rows.length < 2) {
        if(!silent) alert("Planilha vazia ou aba 'CADASTRO' não encontrada.");
        return;
      }
      const clientsMap = new Map<string, Client>();
      rows.slice(1).forEach((row: string[], index: number) => {
        const timestamp = row[1];
        const clientName = row[3];
        const phone = row[4];
        const address = row[5];
        const complement = row[11];
        
        const petName = row[6];
        const petBreed = row[7];
        const petSize = row[8];
        const petCoat = row[9];
        const petNotes = row[10];
        const petAge = row[12];
        const petGender = row[13];
        
        if (!clientName || !phone) return;

        const cleanPhone = phone.replace(/\D/g, '');
        if (!clientsMap.has(cleanPhone)) {
          let createdIso = new Date().toISOString(); 
          try {
             if(timestamp) {
                const [datePart, timePart] = timestamp.split(' ');
                const [day, month, year] = datePart.split('/');
                if(year && month && day) createdIso = new Date(`${year}-${month}-${day}T${timePart || '00:00'}`).toISOString();
             }
          } catch(e) {}

          clientsMap.set(cleanPhone, {
            id: cleanPhone,
            name: clientName,
            phone: phone,
            address: address || '',
            complement: complement || '',
            createdAt: createdIso,
            pets: []
          });
        }
        const client = clientsMap.get(cleanPhone)!;
        if (petName) {
          client.pets.push({
            id: `${cleanPhone}_p_${index}`,
            name: petName,
            breed: petBreed || 'SRD',
            age: petAge || '',
            gender: petGender || '',
            size: petSize || '',
            coat: petCoat || '',
            notes: petNotes || ''
          });
        }
      });
      const newClientList = Array.from(clientsMap.values());
      setClients(newClientList);
      db.saveClients(newClientList);
      if(!silent) alert(`${newClientList.length} clientes sincronizados com sucesso da aba CADASTRO!`);
    } catch (error) {
      console.error(error);
      if(!silent) alert("Erro ao sincronizar. Verifique permissões.");
    }
  };
  
  const handleDeleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    db.saveClients(updated);
  };

  const handleAddService = (service: Service) => {
    const updated = [...services, service];
    setServices(updated);
    db.saveServices(updated);
  };
  const handleDeleteService = (id: string) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    db.saveServices(updated);
  }

  const handleSyncServices = async (token: string, silent = false) => {
      const tokenToUse = token;
      if (!tokenToUse || !SHEET_ID) {
          if(!silent) alert("Erro: Login ou ID da Planilha faltando.");
          return;
      }
      try {
          const rows = await googleService.getSheetValues(tokenToUse, SHEET_ID, 'Serviço!A:E');
          if(!rows || rows.length < 2) {
              if(!silent) alert("Aba 'Serviço' vazia ou não encontrada.");
              return;
          }
          const newServices: Service[] = [];
          rows.slice(1).forEach((row: string[], idx: number) => {
              const sName = row[0];
              const sCat = (row[1] || 'principal').toLowerCase().includes('adicional') ? 'adicional' : 'principal';
              const sSize = row[2] && row[2].trim() !== '' ? row[2] : 'Todos';
              const sCoat = row[3] && row[3].trim() !== '' ? row[3] : 'Todos';
              
              let rawPrice = row[4] || '0';
              rawPrice = rawPrice.replace(/[^\d,.-]/g, '').trim(); 
              if (rawPrice.includes(',')) {
                  rawPrice = rawPrice.replace(/\./g, '').replace(',', '.');
              }
              const sPrice = parseFloat(rawPrice);
              const finalPrice = isNaN(sPrice) ? 0 : sPrice;

              if (sName) {
                  newServices.push({
                      id: `sheet_svc_${idx}_${Date.now()}`,
                      name: sName,
                      category: sCat as any,
                      targetSize: sSize,
                      targetCoat: sCoat,
                      price: finalPrice,
                      description: `Importado da planilha`,
                      durationMin: 60
                  });
              }
          });
          if (newServices.length > 0) {
              setServices(newServices);
              db.saveServices(newServices);
              if(!silent) alert(`${newServices.length} serviços importados com sucesso!`);
          } else {
              if(!silent) alert("Nenhum serviço válido encontrado na planilha.");
          }
      } catch (e) {
          console.error(e);
          if(!silent) alert("Erro ao sincronizar serviços. Verifique a aba 'Serviço' na planilha.");
      }
  }

  const handleUpdateApp = (updatedApp: Appointment) => {
    const updated = appointments.map(a => a.id === updatedApp.id ? updatedApp : a);
    setAppointments(updated);
    db.saveAppointments(updated);
  };

  const handleSyncAppointments = async (token: string, silent = false) => {
      const tokenToUse = token;
      if (!tokenToUse || !SHEET_ID) return;
      try {
          const rows = await googleService.getSheetValues(tokenToUse, SHEET_ID, 'Agendamento!A:S');
          if(!rows || rows.length < 2) {
              if(!silent) alert('Aba Agendamento vazia ou não encontrada.');
              return;
          }
          const loadedApps: Appointment[] = [];
          const newTempClients: Client[] = [];
          const currentClients = db.getClients(); 
          const existingClientIds = new Set(currentClients.map(c => c.id));
          
          rows.slice(1).forEach((row: string[], idx: number) => {
              const petName = row[0];
              const clientName = row[1];
              const clientPhone = row[2] || '';
              const clientAddr = row[3] || '';
              const datePart = row[11]; 
              const timePart = row[12]; 
              const serviceName = row[7];
              const paidAmountStr = row[17];
              const paymentMethod = row[18];
              if(!clientName || !datePart) return;

              let isoDate = new Date().toISOString();
              try {
                  const [day, month, year] = datePart.split('/');
                  if(day && month && year) isoDate = `${year}-${month}-${day}T${timePart || '00:00'}`;
              } catch(e){}

              const cleanPhone = clientPhone.replace(/\D/g, '') || `temp_${idx}`;
              let client = currentClients.find(c => c.id === cleanPhone) || currentClients.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || newTempClients.find(c => c.id === cleanPhone);

              if (!client) {
                  client = { id: cleanPhone, name: clientName, phone: clientPhone, address: clientAddr, pets: [] };
                  newTempClients.push(client);
              }

              let pet = client.pets.find(p => p.name.toLowerCase() === petName?.toLowerCase());
              if (!pet && petName) {
                  pet = {
                    id: `${client.id}_p_${idx}`,
                    name: petName,
                    breed: row[4] || 'SRD',
                    age: '', gender: '', size: row[5] || '', coat: row[6] || '', notes: row[13] || ''
                  };
                  client.pets.push(pet);
              }

              const currentServices = db.getServices();
              const service = currentServices.find(s => s.name.toLowerCase() === serviceName?.toLowerCase()) || currentServices[0];
              const addServiceIds: string[] = [];
              const addSvcNames = [row[8], row[9], row[10]];
              addSvcNames.forEach(name => {
                  if (name) {
                      const foundSvc = currentServices.find(s => s.name.toLowerCase() === name.toLowerCase().trim());
                      if (foundSvc) addServiceIds.push(foundSvc.id);
                  }
              });
              let paidAmount = 0;
              if (paidAmountStr) {
                  paidAmount = parseFloat(paidAmountStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));
                  if(isNaN(paidAmount)) paidAmount = 0;
              }
              if(client && pet) {
                  loadedApps.push({
                      id: `sheet_${idx}`, clientId: client.id, petId: pet.id, serviceId: service?.id || 'unknown',
                      additionalServiceIds: addServiceIds, date: isoDate, status: 'agendado', notes: row[13],
                      durationTotal: parseInt(row[14] || '0'), paidAmount: paidAmount > 0 ? paidAmount : undefined, paymentMethod: paymentMethod as any
                  });
              }
          });
          if (newTempClients.length > 0) {
              const updatedClients = [...currentClients, ...newTempClients.filter(nc => !existingClientIds.has(nc.id))];
              setClients(updatedClients);
              db.saveClients(updatedClients);
          }
          if(loadedApps.length > 0) {
              setAppointments(loadedApps);
              db.saveAppointments(loadedApps);
              if(!silent) alert(`${loadedApps.length} agendamentos carregados!`);
          } else {
              if(!silent) alert('Nenhum agendamento válido encontrado.');
          }
      } catch (error) {
          console.error(error);
          if(!silent) alert('Erro ao sincronizar agendamentos. Verifique se a data está em DD/MM/AAAA.');
      }
  };

  const handleAddAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[]) => {
    let googleEventId = '';
    if (accessToken) {
        const mainService = appServices[0];
        let totalDuration = mainService.durationMin;
        const description = appServices.map(s => s.name).join(' + ');
        if(appServices.length > 1) { appServices.slice(1).forEach(s => totalDuration += (s.durationMin || 0)); }

        const googleResponse = await googleService.createEvent(accessToken, {
            summary: `Banho/Tosa: ${pet.name} - ${client.name}`,
            description: `Serviços: ${description}\nObs: ${pet.notes}`,
            startTime: app.date,
            durationMin: totalDuration
        });
        if (googleResponse && googleResponse.id) {
            googleEventId = googleResponse.id;
        }

        const dateObj = new Date(app.date);
        const dateStr = dateObj.toLocaleDateString('pt-BR'); 
        const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); 
        
        const rowData = [
            pet.name, client.name, client.phone, `${client.address} ${client.complement || ''}`.trim(), 
            pet.breed, pet.size, pet.coat, appServices[0]?.name || '', 
            appServices[1]?.name || '', appServices[2]?.name || '', appServices[3]?.name || '', 
            dateStr, timeStr, pet.notes, totalDuration
        ];
        try {
            await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:O', rowData);
            alert('Agendamento salvo no Calendar e na Planilha!');
        } catch (e) {
            alert('Erro ao salvar na planilha (verifique permissões). Salvo apenas localmente e no Calendar.');
        }
    }
    const newApp = { ...app, googleEventId };
    const updated = [...appointments, newApp];
    setAppointments(updated);
    db.saveAppointments(updated);
  }

  const handleEditAppointment = async (updatedApp: Appointment, client: Client, pet: Pet, appServices: Service[]) => {
      // 1. Update Local
      const updatedList = appointments.map(a => a.id === updatedApp.id ? updatedApp : a);
      setAppointments(updatedList);
      db.saveAppointments(updatedList);

      if(!accessToken) return;

      const mainService = appServices[0];
      let totalDuration = mainService.durationMin;
      const description = appServices.map(s => s.name).join(' + ');
      if(appServices.length > 1) appServices.slice(1).forEach(s => totalDuration += (s.durationMin || 0));

      // 2. Update Google Calendar
      if (updatedApp.googleEventId) {
          try {
              await googleService.updateEvent(accessToken, updatedApp.googleEventId, {
                  summary: `Banho/Tosa: ${pet.name} - ${client.name}`,
                  description: `Serviços: ${description}\nObs: ${pet.notes}\n(Editado)`,
                  startTime: updatedApp.date,
                  durationMin: totalDuration
              });
          } catch(e) {
              console.error("Failed to update calendar", e);
          }
      }

      // 3. Update Google Sheets (Row)
      if (updatedApp.id.startsWith('sheet_')) {
          const parts = updatedApp.id.split('_');
          const index = parseInt(parts[1]);
          const row = index + 2; 

          const dateObj = new Date(updatedApp.date);
          const dateStr = dateObj.toLocaleDateString('pt-BR');
          const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

          const rowData = [
              pet.name, client.name, client.phone, `${client.address} ${client.complement || ''}`.trim(), 
              pet.breed, pet.size, pet.coat, appServices[0]?.name || '', 
              appServices[1]?.name || '', appServices[2]?.name || '', appServices[3]?.name || '', 
              dateStr, timeStr, updatedApp.notes || pet.notes, totalDuration
          ];
          
          try {
              await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!A${row}:O${row}`, rowData);
              alert("Agendamento atualizado com sucesso!");
          } catch(e) {
              console.error(e);
              alert("Erro ao atualizar planilha.");
          }
      } else {
          alert("Agendamento atualizado localmente (não vinculado à planilha antiga).");
      }
  };

  const handleUpdateAppStatus = (id: string, status: Appointment['status']) => {
    const updated = appointments.map(a => a.id === id ? { ...a, status } : a);
    setAppointments(updated);
    db.saveAppointments(updated);
  }
  
  const handleDeleteApp = async (id: string) => {
     const appToDelete = appointments.find(a => a.id === id);
     if (appToDelete && appToDelete.googleEventId && accessToken) {
         try {
             await googleService.deleteEvent(accessToken, appToDelete.googleEventId);
         } catch (e) {
             console.error("Failed to delete from Google Calendar", e);
         }
     }
     const updated = appointments.filter(a => a.id !== id);
     setAppointments(updated);
     db.saveAppointments(updated);
  }

  if (!isConfigured) return <SetupScreen onSave={handleSaveConfig} />;
  if (!googleUser) return <LoginScreen onLogin={() => googleService.login()} onReset={handleResetConfig} />;

  return (
    <HashRouter>
      <Layout currentView={currentView} setView={setCurrentView} googleUser={googleUser} onLogin={() => googleService.login()} onLogout={handleLogout}>
        {isGlobalLoading && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Sincronizando dados...</h3>
                <p className="text-gray-500">Buscando Clientes, Serviços, Agendamentos e Custos.</p>
            </div>
        )}

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
