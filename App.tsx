import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { googleService, DEFAULT_CLIENT_ID } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser, CostItem, AppSettings } from './types';
import { 
  Plus, Trash2, Check, X, 
  Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
  ExternalLink, Settings, PawPrint, LogIn, ShieldAlert, Lock, Copy,
  ChevronDown, ChevronRight, Search, AlertTriangle, ChevronLeft, Phone, Clock, FileText,
  Edit2, MoreVertical, Wallet, Filter, CreditCard, AlertCircle, CheckCircle, Loader2,
  Scissors, TrendingUp, AlertOctagon, BarChart2, TrendingDown, Calendar, PieChart as PieChartIcon,
  ShoppingBag, Tag, User, Key, Unlock, Home, Activity, List, LogOut, Users
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, CartesianGrid, Legend, ComposedChart, LabelList, PieChart, Pie
} from 'recharts';

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';

// --- SUB-COMPONENTS START ---
const SetupScreen: React.FC<{ onSave: (id: string) => void }> = ({ onSave }) => {
    const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 text-center">
                <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">P</div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuração Inicial</h1>
                <p className="text-gray-500 mb-6">ID do Cliente Google (OAuth 2.0)</p>
                <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Ex: 1234...apps.googleusercontent.com" className="w-full border p-3 rounded-lg focus:ring-2 ring-brand-500 outline-none font-mono text-sm mb-6" />
                <button onClick={() => { if(clientId.trim().length > 10) onSave(clientId); else alert("ID inválido"); }} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition">Salvar e Continuar</button>
            </div>
        </div>
    );
};

const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void; settings?: AppSettings; googleLoaded: boolean }> = ({ onLogin, onReset, settings, googleLoaded }) => {
    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="w-full flex justify-center mb-6">
                     {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-48 h-auto object-contain rounded-lg" /> : <img src="/logo.png" alt="PomPomPet" className="w-48 h-auto object-contain" onError={(e) => e.currentTarget.style.display='none'} />}
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{settings?.appName || 'PomPomPet'}</h1>
                <p className="text-gray-500 mb-8">Faça login para acessar sua agenda e clientes.</p>
                <button 
                    onClick={onLogin} 
                    disabled={!googleLoaded}
                    className={`w-full bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all group mb-6 ${!googleLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="bg-white p-1 rounded-full"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" /></div>
                    {googleLoaded ? 'Entrar com Google' : 'Carregando Google...'}
                </button>
                <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-red-500 underline">Alterar ID do Cliente</button>
            </div>
        </div>
    );
};

const PinGuard: React.FC<{ isUnlocked: boolean; onUnlock: (pin: string) => boolean; onSetPin: (pin: string) => void; hasPin: boolean; onReset: () => void; }> = ({ isUnlocked, onUnlock, onSetPin, hasPin, onReset }) => {
    const [inputPin, setInputPin] = useState(''); const [mode, setMode] = useState<'enter' | 'create' | 'confirm'>(hasPin ? 'enter' : 'create'); const [confirmPin, setConfirmPin] = useState(''); const [error, setError] = useState('');
    const handleDigit = (d: string) => { if (inputPin.length < 4) { const newVal = inputPin + d; setInputPin(newVal); if (newVal.length === 4) setTimeout(() => processPin(newVal), 200); } };
    const processPin = (val: string) => { setError(''); if (mode === 'enter') { if (onUnlock(val)) setInputPin(''); else { setError('Senha incorreta'); setInputPin(''); } } else if (mode === 'create') { setConfirmPin(val); setMode('confirm'); setInputPin(''); } else if (mode === 'confirm') { if (val === confirmPin) { onSetPin(val); setInputPin(''); alert('Senha criada!'); } else { setError('Não conferem'); setMode('create'); setInputPin(''); } } };
    if (isUnlocked) return null;
    return ( <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center p-4"> <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center"> <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600"> <Lock size={32} /> </div> <h2 className="text-xl font-bold text-gray-800 mb-2">{mode === 'enter' ? 'Área Protegida' : 'Criar Senha'}</h2> <div className="flex justify-center gap-4 mb-6"> {[0, 1, 2, 3].map(i => ( <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < inputPin.length ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`} /> ))} </div> {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>} <div className="grid grid-cols-3 gap-4 mb-6"> {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => ( <button key={n} onClick={() => handleDigit(n.toString())} className={`h-16 rounded-xl bg-gray-50 hover:bg-brand-50 text-xl font-bold text-gray-700 hover:text-brand-600 transition shadow-sm border border-gray-100 active:scale-95 ${n === 0 ? 'col-start-2' : ''}`}>{n}</button> ))} <button onClick={() => setInputPin(p => p.slice(0, -1))} className="h-16 rounded-xl bg-gray-50 hover:bg-red-50 text-xl font-bold text-gray-400 hover:text-red-500 transition shadow-sm border border-gray-100 col-start-3 row-start-4"><ChevronLeft/></button> </div> {mode === 'enter' && <button onClick={onReset} className="text-xs text-gray-400 underline hover:text-brand-600">Esqueci minha senha</button>} </div> </div> );
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: AppSettings; onSave: (s: AppSettings) => void }> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<'general'|'theme'|'menu'>('general');
    if(!isOpen) return null;
    const themes = [
        { name: 'Rose (Padrão)', value: 'rose', color: '#e11d48' },
        { name: 'Azul Moderno', value: 'blue', color: '#2563eb' },
        { name: 'Roxo Criativo', value: 'purple', color: '#9333ea' },
        { name: 'Verde Natureza', value: 'green', color: '#16a34a' },
        { name: 'Laranja Vibrante', value: 'orange', color: '#ea580c' },
    ];
    const moveMenuItem = (idx: number, dir: number) => { const newOrder = [...localSettings.sidebarOrder]; const target = idx + dir; if(target >= 0 && target < newOrder.length) { [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]]; setLocalSettings({...localSettings, sidebarOrder: newOrder}); } };
    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-lg text-gray-800">Configurações</h3><button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600"/></button></div>
                <div className="flex border-b border-gray-100">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'general' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}>Geral</button>
                    <button onClick={() => setActiveTab('theme')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'theme' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}>Aparência</button>
                    <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'menu' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500'}`}>Menu</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Nome do Petshop</label><input value={localSettings.appName} onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} className="w-full border p-2 rounded-lg mt-1" /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">URL do Logo</label><input value={localSettings.logoUrl} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} placeholder="https://..." className="w-full border p-2 rounded-lg mt-1" /></div>
                        </div>
                    )}
                    {activeTab === 'theme' && (
                        <div className="grid grid-cols-1 gap-3">
                            {themes.map(t => (
                                <button key={t.value} onClick={() => setLocalSettings({...localSettings, theme: t.value})} className={`p-3 rounded-xl border flex items-center justify-between ${localSettings.theme === t.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full" style={{backgroundColor: t.color}}></div><span className="font-bold text-gray-700">{t.name}</span></div>
                                    {localSettings.theme === t.value && <Check size={20} className="text-brand-600" />}
                                </button>
                            ))}
                        </div>
                    )}
                    {activeTab === 'menu' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-400 mb-2">Reorganize os grupos do menu lateral</p>
                            {localSettings.sidebarOrder.map((item, idx) => (
                                <div key={item} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                                    <span className="font-bold text-gray-700 capitalize">{item === 'operacional' ? 'Página Inicial' : item}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => moveMenuItem(idx, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown className="rotate-180" size={16}/></button>
                                        <button onClick={() => moveMenuItem(idx, 1)} disabled={idx === localSettings.sidebarOrder.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm">Cancelar</button><button onClick={() => { onSave(localSettings); onClose(); }} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold text-sm">Salvar Alterações</button></div>
            </div>
        </div>
    );
}

const CustomXAxisTick = ({ x, y, payload, data }: any) => {
    const item = data && data[payload.index];
    if (!item) return <g />;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize={10} fontWeight="bold">{item.name}</text>
            <text x={0} y={0} dy={30} textAnchor="middle" fill="#059669" fontSize={10} fontWeight="bold">R$ {item.rawRevenue?.toFixed(0)}</text>
            <text x={0} y={0} dy={42} textAnchor="middle" fill="#6366f1" fontSize={9}>{item.pets} pets</text>
            {(item.growth !== undefined || item.revGrowth !== undefined) && (
                <text x={0} y={0} dy={54} textAnchor="middle" fill={(item.growth || item.revGrowth) >= 0 ? '#059669' : '#dc2626'} fontSize={9} fontWeight="bold">{(item.growth || item.revGrowth) >= 0 ? '▲' : '▼'} {Math.abs(item.growth || item.revGrowth || 0).toFixed(0)}%</text>
            )}
        </g>
    );
};

const RevenueView: React.FC<{ appointments: Appointment[]; services: Service[]; clients: Client[]; defaultTab?: 'daily'|'weekly'|'monthly'|'yearly' }> = ({ appointments, services, clients, defaultTab = 'daily' }) => {
    const [activeTab, setActiveTab] = useState<'daily'|'weekly'|'monthly'|'yearly'>(defaultTab);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => { setActiveTab(defaultTab) }, [defaultTab]);

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
        app.additionalServiceIds?.forEach(id => { const s = services.find(srv => srv.id === id); if (s) total += s.price; });
        return total;
    };

    const calculateStats = (apps: Appointment[]) => {
        let totalPets = 0; let totalTosas = 0; let paidRevenue = 0; let pendingRevenue = 0;
        apps.forEach(app => {
            if (app.status === 'cancelado') return;
            totalPets++;
            const isTargetTosa = (name?: string) => { if (!name) return false; const n = name.toLowerCase(); return n.includes('tosa normal') || n.includes('tosa tesoura'); };
            const mainSvc = services.find(s => s.id === app.serviceId);
            let hasTosa = isTargetTosa(mainSvc?.name);
            if (!hasTosa && app.additionalServiceIds) { app.additionalServiceIds.forEach(id => { const s = services.find(srv => srv.id === id); if (s && isTargetTosa(s.name)) hasTosa = true; }); }
            if (hasTosa) totalTosas++;
            const gross = calculateGrossRevenue(app);
            const isPaid = app.paymentMethod && app.paymentMethod.trim() !== '';
            if (isPaid) paidRevenue += gross; else pendingRevenue += gross;
        });
        const grossRevenue = paidRevenue + pendingRevenue;
        const averageTicket = totalPets > 0 ? grossRevenue / totalPets : 0;
        return { totalPets, totalTosas, paidRevenue, pendingRevenue, grossRevenue, averageTicket };
    };

    const getWeeklyChartData = () => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date); startOfWeek.setDate(diff);
        const data = []; const businessDays = [2, 3, 4, 5, 6]; 
        businessDays.forEach(dayIndex => {
            const current = new Date(startOfWeek); current.setDate(startOfWeek.getDate() + dayIndex);
            const cYear = current.getFullYear(); const cMonth = String(current.getMonth() + 1).padStart(2, '0'); const cDay = String(current.getDate()).padStart(2, '0');
            const targetDateStr = `${cYear}-${cMonth}-${cDay}`;
            const dailyApps = appointments.filter(a => { if (a.status === 'cancelado') return false; const aDate = new Date(a.date); const aYear = aDate.getFullYear(); const aMonth = String(aDate.getMonth() + 1).padStart(2, '0'); const aDay = String(aDate.getDate()).padStart(2, '0'); return `${aYear}-${aMonth}-${aDay}` === targetDateStr; });
            const totalRevenue = dailyApps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);
            const formattedDate = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
            let growth = 0; if (data.length > 0) { const prev = data[data.length - 1]; if (prev.faturamento > 0) growth = ((totalRevenue - prev.faturamento) / prev.faturamento) * 100; }
            data.push({ name: formattedDate, fullDate: targetDateStr, faturamento: totalRevenue, rawRevenue: totalRevenue, pets: dailyApps.length, growth });
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
          for(let d=1; d<=daysInMonth; d++) weeksInMonth.add(getISOWeek(new Date(year, month, d)));
          const sortedWeeks = Array.from(weeksInMonth).sort((a,b) => a-b);
          const chartData = [];
          sortedWeeks.forEach((weekNum, index) => {
              const currentRevenue = getWeekData(year, weekNum);
              const petsCount = appointments.filter(a => getISOWeek(new Date(a.date)) === weekNum && new Date(a.date).getFullYear() === year && a.status !== 'cancelado').length;
              let growth = 0; if (index > 0) { const prevRev = chartData[index - 1].faturamento; if (prevRev > 0) growth = ((currentRevenue - prevRev) / prevRev) * 100; }
              chartData.push({ name: `S${index + 1}`, faturamento: currentRevenue, rawRevenue: currentRevenue, pets: petsCount, growth });
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
              data.push({ name: monthNames[i], faturamento: stats.grossRevenue, rawRevenue: stats.grossRevenue, pets: stats.totalPets, revGrowth, });
          }
          return data;
    };

    const dailyApps = appointments.filter(a => a.date.startsWith(selectedDate));
    const dailyStats = calculateStats(dailyApps);
    const weeklyChartData = getWeeklyChartData();

    // Calculate weeklyStats
    const calculateWeeklyStats = () => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date); startOfWeek.setDate(diff); startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
        const wApps = appointments.filter(a => { if(a.status === 'cancelado') return false; const ad = new Date(a.date); return ad >= startOfWeek && ad <= endOfWeek; });
        return calculateStats(wApps);
    };
    const weeklyStats = calculateWeeklyStats();

    const monthlyChartData = getMonthlyChartData();
    const yearlyChartData = getYearlyChartData();
    const monthlyApps = appointments.filter(a => a.date.startsWith(selectedMonth));
    const monthlyStats = calculateStats(monthlyApps);
    const yearlyApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear);
    const yearlyStats = calculateStats(yearlyApps);

    const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition min-h-[100px]">
            <div className="flex justify-between items-start">
                <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p><h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>{subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}</div>
                <div className={`p-2 rounded-full ${colorClass} bg-opacity-20`}><div className={`p-1 rounded-full ${colorClass} bg-opacity-100 text-white`}><Icon size={20} /></div></div>
            </div>
        </div>
    );

    const TabButton = ({ id, label, icon: Icon }: any) => ( <button onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === id ? 'border-brand-600 text-brand-600 bg-brand-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Icon size={16} /><span className="hidden sm:inline">{label}</span></button> );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {defaultTab === 'daily' ? null : (
                <>
                <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-gray-800">Faturamento</h1></div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6"><div className="flex overflow-x-auto"><TabButton id="daily" label="Diário" icon={CalendarIcon} /><TabButton id="weekly" label="Semanal" icon={BarChart2} /><TabButton id="monthly" label="Mensal" icon={TrendingUp} /><TabButton id="yearly" label="Anual" icon={PieChartIcon} /></div></div>
                </>
            )}
            
            {activeTab === 'daily' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Diário</h2><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total de Pets" value={dailyStats.totalPets} icon={PawPrint} colorClass="bg-blue-500" /><StatCard title="Total de Tosas" value={dailyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500" subValue="Normal e Tesoura" /><StatCard title="Caixa Pago" value={`R$ ${dailyStats.paidRevenue.toFixed(2)}`} icon={CheckCircle} colorClass="bg-green-500" /><StatCard title="A Receber" value={`R$ ${dailyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" /></div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6"><h3 className="p-4 text-sm font-bold text-gray-700 border-b border-gray-100 flex items-center gap-2"><FileText size={16}/> Detalhamento do Dia</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase"><tr><th className="p-3">Horário</th><th className="p-3">Cliente</th><th className="p-3">Pet</th><th className="p-3">Serviços</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-gray-100">{dailyApps.length === 0 ? (<tr><td colSpan={5} className="p-4 text-center text-gray-400">Nenhum agendamento neste dia.</td></tr>) : (dailyApps.sort((a,b) => a.date.localeCompare(b.date)).map(app => { const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(s => s.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x=>x); const val = calculateGrossRevenue(app); return (<tr key={app.id} className="hover:bg-gray-50"><td className="p-3 font-mono text-xs text-gray-600">{new Date(app.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</td><td className="p-3 font-medium text-gray-800">{client?.name}</td><td className="p-3 text-gray-600">{pet?.name}</td><td className="p-3 text-xs text-gray-500"><span className="font-bold text-brand-600">{mainSvc?.name}</span>{addSvcs && addSvcs.length > 0 && (<span className="text-gray-400"> + {addSvcs.map(s => s?.name).join(', ')}</span>)}</td><td className="p-3 text-right font-bold text-green-600">R$ {val.toFixed(2)}</td></tr>); }))}</tbody></table></div></div>
                </section>
            )}
            {activeTab === 'weekly' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 gap-2"><h2 className="text-lg font-bold text-gray-800">Semana</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Pets da Semana" value={weeklyStats.totalPets} icon={PawPrint} colorClass="bg-indigo-500" /><StatCard title="Total Faturamento" value={`R$ ${weeklyStats.grossRevenue.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500" /><StatCard title="Total Pago" value={`R$ ${weeklyStats.paidRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500" /><StatCard title="Pendente" value={`R$ ${weeklyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-rose-500" /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16}/> Faturamento Diário</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={weeklyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={weeklyChartData} />} height={60} axisLine={false} tickLine={false} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `R$${val}`} domain={['auto', 'auto']} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Bar yAxisId="right" dataKey="petsCount" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={40} /><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}
            {activeTab === 'monthly' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Mês</h2><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total de Pets" value={monthlyStats.totalPets} icon={PawPrint} colorClass="bg-purple-500" /><StatCard title="Ticket Médio" value={`R$ ${monthlyStats.averageTicket.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500" /><StatCard title="Receita Paga" value={`R$ ${monthlyStats.paidRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-emerald-500" /><StatCard title="A Receber" value={`R$ ${monthlyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-red-500" /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16}/> Comparativo Semanal</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={monthlyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={monthlyChartData} />} height={60} axisLine={false} tickLine={false} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `R$${val}`} domain={['auto', 'auto']} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Bar yAxisId="right" dataKey="petsCount" fill="#e9d5ff" radius={[4, 4, 0, 0]} barSize={40} /><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#9333ea" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}
             {activeTab === 'yearly' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Ano</h2><select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total Pets" value={yearlyStats.totalPets} icon={PawPrint} colorClass="bg-sky-500" /><StatCard title="Ticket Médio" value={`R$ ${yearlyStats.averageTicket.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500" /><StatCard title="Faturamento Total" value={`R$ ${yearlyStats.grossRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-green-500" /><StatCard title="Pendência Total" value={`R$ ${yearlyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96 mb-6"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16}/> Evolução Mensal</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={yearlyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={yearlyChartData} />} height={60} axisLine={false} tickLine={false} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} domain={['auto', 'auto']} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Bar yAxisId="right" dataKey="petsCount" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={30} /><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#059669" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} /></ComposedChart></ResponsiveContainer></div>
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
    const filteredCosts = filterCosts(); const totalCost = filteredCosts.reduce((acc, c) => acc + c.amount, 0); const paidCost = filteredCosts.filter(c => c.status && c.status.toLowerCase() === 'pago').reduce((acc, c) => acc + c.amount, 0); const pendingCost = filteredCosts.filter(c => !c.status || c.status.toLowerCase() !== 'pago').reduce((acc, c) => acc + c.amount, 0);
    const getCostByCategory = () => { const counts: Record<string, number> = {}; filteredCosts.forEach(c => { const cat = c.category || 'Outros'; counts[cat] = (counts[cat] || 0) + c.amount; }); const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value); const top5 = sorted.slice(0, 5); const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0); if (others > 0) top5.push({ name: 'Outros', value: others }); return top5; };
    const getCostByMonth = () => { const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; const data = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 })); const yearCosts = costs.filter(c => new Date(c.date).getFullYear() === selectedYear); yearCosts.forEach(c => { const d = new Date(c.date); if(!isNaN(d.getTime())) data[d.getMonth()].value += c.amount; }); const startIdx = selectedYear === 2025 ? 7 : 0; return data.slice(startIdx); };
    const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-gray-800">Custo Mensal</h1><div className="flex bg-white rounded-lg p-1 border"><button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'monthly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Mês</button><button onClick={() => setViewMode('yearly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'yearly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Ano</button></div></div>
            <div className="flex items-center mb-6 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800 mr-4">Período:</h2>{viewMode === 'monthly' ? ( <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" /> ) : ( <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select> )}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><p className="text-xs font-bold text-gray-500 uppercase">Total</p><h3 className="text-2xl font-bold text-rose-600">R$ {totalCost.toFixed(2)}</h3></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><p className="text-xs font-bold text-gray-500 uppercase">Pago</p><h3 className="text-2xl font-bold text-green-600">R$ {paidCost.toFixed(2)}</h3></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><p className="text-xs font-bold text-gray-500 uppercase">Pendente</p><h3 className="text-2xl font-bold text-orange-600">R$ {pendingCost.toFixed(2)}</h3></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"><h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><BarChart2 size={16}/> Evolução</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={getCostByMonth()} margin={{top: 20}}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} /><YAxis tickFormatter={(val) => `R$${val}`} tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 'auto']} /><Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} /><Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" style={{fontSize: 10, fill: '#e11d48'}} formatter={(val: number) => val > 0 ? `R$${val.toFixed(0)}` : ''} /></Bar></BarChart></ResponsiveContainer></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"><h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Tag size={16}/> Categorias</h3><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getCostByCategory()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">{getCostByCategory().map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} /><Legend layout="vertical" verticalAlign="middle" align="right" /></PieChart></ResponsiveContainer></div></div>
        </div>
    );
};

// ... PaymentManager, ClientManager, ServiceManager, ScheduleManager logic (keeping same code, just ensuring it's defined for the App) ...
const PaymentManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onUpdateAppointment: (app: Appointment) => void; accessToken: string | null; sheetId: string; }> = ({ appointments, clients, services, onUpdateAppointment, accessToken, sheetId }) => {
    // ... Copy Logic ...
    const getLocalISODate = (d: Date = new Date()) => { const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
    const [selectedDate, setSelectedDate] = useState(getLocalISODate()); const [editingId, setEditingId] = useState<string | null>(null); const [amount, setAmount] = useState(''); const [method, setMethod] = useState(''); const [isSaving, setIsSaving] = useState(false); const [activeTab, setActiveTab] = useState<'toReceive' | 'pending' | 'paid'>('toReceive'); const [contextMenu, setContextMenu] = useState<{x: number, y: number, app: Appointment} | null>(null); const touchStart = useRef<number | null>(null); const touchEnd = useRef<number | null>(null); const minSwipeDistance = 50; const todayStr = getLocalISODate();
    const getAppLocalDateStr = (dateStr: string) => { const d = new Date(dateStr); return getLocalISODate(d); };
    const pendingApps = appointments.filter(a => { const appDate = getAppLocalDateStr(a.date); const isPast = appDate < todayStr; const isUnpaid = !a.paymentMethod || a.paymentMethod.trim() === ''; return isPast && isUnpaid; }).sort((a,b) => b.date.localeCompare(a.date));
    const dailyApps = appointments.filter(a => getAppLocalDateStr(a.date) === selectedDate); const toReceiveApps = dailyApps.filter(a => !a.paymentMethod || a.paymentMethod.trim() === ''); const paidApps = dailyApps.filter(a => a.paymentMethod && a.paymentMethod.trim() !== '');
    const navigateDate = (days: number) => { const [year, month, day] = selectedDate.split('-').map(Number); const date = new Date(year, month - 1, day); date.setDate(date.getDate() + days); setSelectedDate(getLocalISODate(date)); }; const goToToday = () => setSelectedDate(getLocalISODate());
    const onTouchStart = (e: React.TouchEvent) => { touchEnd.current = null; touchStart.current = e.targetTouches[0].clientX; }; const onTouchMove = (e: React.TouchEvent) => { touchEnd.current = e.targetTouches[0].clientX; }; const onTouchEnd = () => { if (!touchStart.current || !touchEnd.current) return; const distance = touchStart.current - touchEnd.current; if (distance > minSwipeDistance) navigateDate(1); if (distance < -minSwipeDistance) navigateDate(-1); };
    const calculateExpected = (app: Appointment) => { const main = services.find(s => s.id === app.serviceId); let total = main?.price || 0; app.additionalServiceIds?.forEach(id => { const s = services.find(srv => srv.id === id); if(s) total += s.price; }); return total; };
    const handleStartEdit = (app: Appointment) => { setEditingId(app.id); const expected = calculateExpected(app); setAmount(app.paidAmount ? app.paidAmount.toString() : expected.toString()); setMethod(app.paymentMethod || 'Credito'); setContextMenu(null); };
    
    // ... [handleSave Logic] ...
    const handleSave = async (app: Appointment) => { 
        setIsSaving(true); 
        const finalAmount = parseFloat(amount); 
        const updatedApp = { ...app, paidAmount: finalAmount, paymentMethod: method as any }; 
        if (app.id.startsWith('sheet_') && accessToken && sheetId) { 
            try { 
                const parts = app.id.split('_'); 
                const index = parseInt(parts[1]); 
                const rowNumber = index + 1; 
                const range = `Agendamento!Q${rowNumber}:R${rowNumber}`; 
                const values = [finalAmount.toString().replace('.', ','), method]; 
                await googleService.updateSheetValues(accessToken, sheetId, range, values); 
            } catch (e) { 
                console.error("Failed", e); alert("Erro ao salvar na planilha."); 
            } 
        } else {
             alert('Aviso: Este agendamento ainda não foi sincronizado com a planilha. O pagamento será salvo localmente, mas recarregue a página para sincronizar com a planilha.');
        }
        onUpdateAppointment(updatedApp); setEditingId(null); setIsSaving(false); 
    };
    
    // ... [PaymentRow Logic] ...
    const PaymentRow = ({ app, statusColor }: {app: Appointment, statusColor: string}) => { const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(s => s.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x=>x) as Service[] || []; const expected = calculateExpected(app); const isPaid = !!app.paidAmount && !!app.paymentMethod; const isEditing = editingId === app.id; const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase(); let serviceBorderColor = 'border-sky-400'; if (allServiceNames.includes('tesoura')) serviceBorderColor = 'border-pink-500'; else if (allServiceNames.includes('tosa normal')) serviceBorderColor = 'border-orange-500'; else if (allServiceNames.includes('higi')) serviceBorderColor = 'border-yellow-500'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) serviceBorderColor = 'border-purple-500'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) serviceBorderColor = 'border-indigo-500';
        if(isEditing) { return ( <div className="bg-brand-50 border border-brand-200 p-4 rounded-lg mb-4 shadow-sm animate-fade-in"><div className="flex flex-col gap-3"><div className="flex justify-between items-center"><span className="font-bold text-gray-800">{pet?.name}</span><span className="text-xs text-gray-500">Editando...</span></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] font-bold text-gray-500 uppercase">Valor R$</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded bg-white" /></div><div><label className="text-[10px] font-bold text-gray-500 uppercase">Método</label><select value={method} onChange={e => setMethod(e.target.value)} className="w-full border p-2 rounded bg-white"><option value="Credito">Crédito</option><option value="Debito">Débito</option><option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option></select></div></div><div className="flex gap-2 mt-2"><button onClick={() => handleSave(app)} disabled={isSaving} className="flex-1 bg-green-600 text-white p-2 rounded text-sm font-bold">{isSaving ? '...' : 'OK'}</button><button onClick={() => setEditingId(null)} className="flex-1 bg-gray-200 text-gray-700 p-2 rounded text-sm">Cancel</button></div></div></div> ) }
        return ( <div className={`p-3 rounded-lg shadow-sm border border-gray-100 mb-2 border-l-[6px] ${serviceBorderColor} ${statusColor} min-w-0`} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, app }); }}> <div className="flex justify-between items-start mb-2"> <div className="min-w-0 flex-1 pr-2"> <div className="text-base font-bold text-gray-800 truncate">{pet?.name}</div> <div className="text-xs text-gray-500 truncate">{client?.name}</div> <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"> <Clock size={10}/> {new Date(app.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} </div> </div> <div className="text-right flex-shrink-0"> <div className="text-base font-bold text-brand-700">R$ {expected.toFixed(2)}</div> {isPaid ? ( <div className="inline-block bg-green-100 text-green-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"> {app.paymentMethod} </div> ) : ( <div className="inline-block bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"> Pendente </div> )} </div> </div> <div className="flex flex-wrap gap-1 mb-2"> {mainSvc && <span className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">{mainSvc.name}</span>} {addSvcs.map((s, idx) => ( <span key={idx} className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">{s.name}</span> ))} </div> <button onClick={() => handleStartEdit(app)} className="w-full bg-white/50 hover:bg-white text-gray-700 p-2 rounded flex items-center justify-center gap-2 font-bold text-xs transition border border-gray-200"> <DollarSign size={14}/> {isPaid ? 'Editar Pagamento' : 'Receber Valor'} </button> </div> )
    };
    return ( <div className="space-y-4 h-full flex flex-col" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={() => setContextMenu(null)}> <div className="flex flex-col md:flex-row justify-between items-center gap-2 flex-shrink-0"> <h2 className="text-xl font-bold text-gray-800 self-start md:self-center">Pagamentos</h2> <div className="flex items-center gap-1 w-full md:w-auto bg-white p-1 rounded-lg border shadow-sm flex-shrink-0"> <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={18} /></button> <button onClick={goToToday} className="flex-1 px-2 py-1 bg-brand-50 text-brand-700 font-bold rounded-lg text-xs hover:bg-brand-100">Hoje</button> <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={18} /></button> <div className="text-xs font-bold text-gray-700 px-2">{new Date(selectedDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div> </div> </div> <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto"> <button onClick={() => setActiveTab('toReceive')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'toReceive' ? 'bg-white shadow text-yellow-600' : 'text-gray-500'}`}> Receber ({toReceiveApps.length}) </button> <button onClick={() => setActiveTab('pending')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}> Pendentes ({pendingApps.length}) </button> <button onClick={() => setActiveTab('paid')} className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'paid' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}> Pagos ({paidApps.length}) </button> </div> <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 rounded-xl border border-gray-100 p-2"> {activeTab === 'toReceive' && toReceiveApps.map(app => <PaymentRow key={app.id} app={app} statusColor="bg-yellow-50" />)} {activeTab === 'pending' && pendingApps.map(app => <PaymentRow key={app.id} app={app} statusColor="bg-red-50" />)} {activeTab === 'paid' && paidApps.map(app => <PaymentRow key={app.id} app={app} statusColor="bg-green-50/50" />)} </div> {contextMenu && ( <div className="fixed bg-white shadow-xl border border-gray-200 rounded-lg z-[100] py-1 min-w-[150px]" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(contextMenu.app)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"><Edit2 size={14}/> Editar Valor</button> </div> )} </div> )
};

const ClientManager: React.FC<{ clients: Client[]; onDeleteClient: (id: string) => void; googleUser: GoogleUser | null; accessToken: string | null; }> = ({ clients, onDeleteClient }) => {
    // ... Copy Logic ...
    const [searchTerm, setSearchTerm] = useState('');
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
    return ( <div className="space-y-4 animate-fade-in h-full flex flex-col"> <div className="flex flex-col gap-3 flex-shrink-0"> <h2 className="text-xl font-bold text-gray-800">Clientes & Pets</h2> <div className="flex gap-2"> <div className="relative flex-1"> <Search className="absolute left-3 top-2.5 text-gray-400" size={16} /> <input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 ring-brand-200 outline-none shadow-sm"/> </div> <a href={PREDEFINED_FORM_URL} target="_blank" rel="noreferrer" className="bg-brand-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-brand-700 text-sm whitespace-nowrap"><Plus size={16} /> Novo</a> </div> </div> <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"> {filteredClients.map(client => ( <div key={client.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition group"> <div className="flex justify-between items-start mb-2"> <div className="min-w-0"> <h3 className="font-bold text-gray-800 truncate text-sm">{client.name}</h3> <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10}/> {client.phone}</p> </div> <button onClick={() => { if(confirm('Excluir?')) onDeleteClient(client.id); }} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button> </div> <div className="space-y-1"> {client.pets.map(pet => ( <div key={pet.id} className="bg-gray-50 p-1.5 rounded-lg flex items-center gap-2 text-xs border border-gray-100"> <div className="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-[10px]">{pet.name[0]}</div> <div className="min-w-0 truncate"><span className="font-bold text-gray-700">{pet.name}</span> <span className="text-gray-400 text-[10px]">• {pet.breed}</span></div> </div> ))} </div> </div> ))} </div> </div> </div> );
};

const ServiceManager: React.FC<{ services: Service[]; onAddService: (s: Service) => void; onDeleteService: (id: string) => void; onSyncServices: (silent: boolean) => void; accessToken: string | null; sheetId: string; }> = ({ services, onAddService, onDeleteService, onSyncServices, sheetId, accessToken }) => {
    // ... Copy Logic ...
    const [isModalOpen, setIsModalOpen] = useState(false); const [editingService, setEditingService] = useState<Service | null>(null); const [formData, setFormData] = useState({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); const [contextMenu, setContextMenu] = useState<{x: number, y: number, service: Service} | null>(null);
    const resetForm = () => { setFormData({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); setEditingService(null); setIsModalOpen(false); };
    const handleEditStart = (s: Service) => { setEditingService(s); setFormData({ name: s.name, price: s.price.toString(), category: s.category, size: s.targetSize || 'Todos', coat: s.targetCoat || 'Todos' }); setIsModalOpen(true); setContextMenu(null); };
    const handleSave = async () => { if(!accessToken || !sheetId) return alert('Necessário estar logado para salvar.'); const priceNum = parseFloat(formData.price.replace(',', '.')); const rowData = [formData.name, formData.category, formData.size, formData.coat, priceNum.toString().replace('.', ',')]; try { if(editingService) { const parts = editingService.id.split('_'); if(parts.length >= 3) { const index = parseInt(parts[2]); const row = index + 2; const range = `Serviço!A${row}:E${row}`; await googleService.updateSheetValues(accessToken, sheetId, range, rowData); } } else { await googleService.appendSheetValues(accessToken, sheetId, 'Serviço!A:E', rowData); } onSyncServices(true); resetForm(); } catch(e) { console.error(e); alert('Erro ao salvar na planilha.'); } };
    const handleDelete = async (service: Service) => { if(!confirm(`Excluir ${service.name}?`)) return; setContextMenu(null); if(service.id.startsWith('sheet_svc_') && accessToken && sheetId) { const parts = service.id.split('_'); if(parts.length >= 3) { const index = parseInt(parts[2]); const row = index + 2; try { await googleService.clearSheetValues(accessToken, sheetId, `Serviço!A${row}:E${row}`); onSyncServices(true); return; } catch(e) { console.error(e); alert('Erro ao excluir da planilha.'); } } } onDeleteService(service.id); };
    return ( <div className="space-y-4 animate-fade-in h-full flex flex-col relative" onClick={() => setContextMenu(null)}> <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex-shrink-0"> <h2 className="text-xl font-bold text-gray-800">Serviços</h2> <div className="flex gap-2"> <button onClick={() => onSyncServices(false)} className="bg-brand-50 text-brand-700 border border-brand-200 px-3 py-2 rounded-lg flex items-center gap-1 font-bold text-xs"><Sparkles size={14} /> Sync</button> <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-brand-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 font-bold text-xs"><Plus size={14} /> Novo</button> </div> </div> <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"> {services.map(service => ( <div key={service.id} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, service }); }} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md transition select-none"> <div> <div className="flex justify-between items-start mb-1"> <h3 className="font-bold text-gray-800 text-sm truncate">{service.name}</h3> <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ${service.category === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{service.category}</span> </div> <div className="flex flex-wrap gap-1 mb-2"> <span className="text-[9px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-500 border border-gray-100">{service.targetSize}</span> <span className="text-[9px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-500 border border-gray-100">{service.targetCoat}</span> </div> </div> <div className="border-t border-gray-50 pt-2"><span className="text-base font-bold text-brand-600">R$ {service.price.toFixed(2)}</span></div> </div> ))} </div> </div> {contextMenu && ( <div className="fixed bg-white shadow-xl border border-gray-200 rounded-lg z-[100] py-1 min-w-[150px]" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleEditStart(contextMenu.service)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"><Edit2 size={14}/> Editar</button> <button onClick={() => handleDelete(contextMenu.service)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"><Trash2 size={14}/> Excluir</button> </div> )} {isModalOpen && ( <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"> <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"> <h3 className="text-lg font-bold text-gray-800">Serviço</h3> <input placeholder="Nome" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg text-sm" /> <div className="grid grid-cols-2 gap-3"> <input placeholder="Preço" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full border p-2 rounded-lg text-sm" /> <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded-lg text-sm"><option value="principal">Principal</option><option value="adicional">Adicional</option></select> </div> <div className="flex gap-2 justify-end mt-4"> <button onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold text-sm">Cancelar</button> <button onClick={handleSave} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold text-sm">Salvar</button> </div> </div> </div> )} </div> );
};

const ScheduleManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onAdd: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onEdit: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onUpdateStatus: (id: string, status: Appointment['status']) => void; onDelete: (id: string) => void; googleUser: GoogleUser | null; }> = ({ appointments, clients, services, onAdd, onEdit, onUpdateStatus, onDelete }) => {
    // ... Copy Logic ...
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day'); const [currentDate, setCurrentDate] = useState(new Date()); const [isModalOpen, setIsModalOpen] = useState(false); const [detailsApp, setDetailsApp] = useState<Appointment | null>(null); const [contextMenu, setContextMenu] = useState<{x: number, y: number, appId: string} | null>(null); const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState(''); const [selectedClient, setSelectedClient] = useState(''); const [selectedPet, setSelectedPet] = useState(''); const [selectedService, setSelectedService] = useState(''); const [selectedAddServices, setSelectedAddServices] = useState<string[]>([]); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [time, setTime] = useState('09:00'); const [notes, setNotes] = useState(''); const [manualDuration, setManualDuration] = useState('0');
    const resetForm = () => { setClientSearch(''); setSelectedClient(''); setSelectedPet(''); setSelectedService(''); setSelectedAddServices([]); setTime('09:00'); setNotes(''); setManualDuration('0'); setEditingAppId(null); setIsModalOpen(false); };
    const handleStartEdit = (app: Appointment) => { setEditingAppId(app.id); setSelectedClient(app.clientId); setSelectedPet(app.petId); setSelectedService(app.serviceId); setSelectedAddServices(app.additionalServiceIds || []); const d = new Date(app.date); setDate(d.toISOString().split('T')[0]); setTime(d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})); setNotes(app.notes || ''); setManualDuration(app.durationTotal ? app.durationTotal.toString() : '0'); setDetailsApp(null); setIsModalOpen(true); };
    const handleSave = () => { if (!selectedClient || !selectedPet || !selectedService || !date || !time) return; const client = clients.find(c => c.id === selectedClient); const pet = client?.pets.find(p => p.id === selectedPet); const mainSvc = services.find(s => s.id === selectedService); const addSvcs = selectedAddServices.map(id => services.find(s => s.id === id)).filter(s => s) as Service[]; if (client && pet && mainSvc) { const newApp: Appointment = { id: editingAppId || `local_${Date.now()}`, clientId: client.id, petId: pet.id, serviceId: mainSvc.id, additionalServiceIds: selectedAddServices, date: `${date}T${time}:00`, status: 'agendado', notes: notes, googleEventId: editingAppId ? appointments.find(a=>a.id===editingAppId)?.googleEventId : undefined }; if (editingAppId) { const original = appointments.find(a => a.id === editingAppId); newApp.paidAmount = original?.paidAmount; newApp.paymentMethod = original?.paymentMethod; onEdit(newApp, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration)); } else { onAdd(newApp, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration)); } resetForm(); } };
    const handleDeleteFromContext = () => { if(contextMenu && confirm('Excluir?')) onDelete(contextMenu.appId); setContextMenu(null); }
    const filteredClients = clientSearch.length > 0 ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch) || c.pets.some(p => p.name.toLowerCase().includes(clientSearch.toLowerCase()))).slice(0, 5) : []; const selectedClientData = clients.find(c => c.id === selectedClient); const pets = selectedClientData?.pets || []; const selectedPetData = pets.find(p => p.id === selectedPet);
    const getApplicableServices = (category: 'principal' | 'adicional') => { if (!selectedPetData) return []; return services.filter(s => { const matchesCategory = s.category === category; const matchesSize = s.targetSize === 'Todos' || !s.targetSize || (selectedPetData.size && s.targetSize.toLowerCase().includes(selectedPetData.size.toLowerCase())); const matchesCoat = s.targetCoat === 'Todos' || !s.targetCoat || (selectedPetData.coat && s.targetCoat.toLowerCase().includes(selectedPetData.coat.toLowerCase())); return matchesCategory && matchesSize && matchesCoat; }); };
    const navigate = (direction: 'prev' | 'next') => { const newDate = new Date(currentDate); if (viewMode === 'day') newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7)); if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); setCurrentDate(newDate); };
    const timeOptions = []; for (let h = 9; h <= 18; h++) { ['00', '10', '20', '30', '40', '50'].forEach(m => { if(h === 18 && m !== '00') return; timeOptions.push(`${String(h).padStart(2, '0')}:${m}`); }); }
    
    // ... [Layout Algo and render functions] ... (Same as before)
    const getLayout = (dayApps: Appointment[]) => {
        const sorted = [...dayApps].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const nodes = sorted.map(app => { const start = new Date(app.date).getTime(); const end = start + (app.durationTotal || 60) * 60000; return { app, start, end }; });
        const clusters: typeof nodes[] = [];
        if(nodes.length > 0) {
            let currentCluster = [nodes[0]]; let clusterEnd = nodes[0].end;
            for(let i=1; i<nodes.length; i++) {
                if(nodes[i].start < clusterEnd) { currentCluster.push(nodes[i]); clusterEnd = Math.max(clusterEnd, nodes[i].end); } else { clusters.push(currentCluster); currentCluster = [nodes[i]]; clusterEnd = nodes[i].end; }
            }
            clusters.push(currentCluster);
        }
        const layoutResult: { app: Appointment, left: string, width: string }[] = [];
        clusters.forEach(cluster => {
             const columns: typeof nodes[] = [];
             cluster.forEach(node => {
                 let placed = false;
                 for(let i=0; i<columns.length; i++) { if(node.start >= columns[i][columns[i].length-1].end) { columns[i].push(node); placed = true; break; } }
                 if(!placed) columns.push([node]);
             });
             const count = columns.length; const widthPct = 100 / count;
             columns.forEach((col, colIdx) => { col.forEach(node => { layoutResult.push({ app: node.app, left: `${colIdx * widthPct}%`, width: `${widthPct}%` }); }); });
        });
        return layoutResult;
    };

    const AppointmentCard = ({ app, style, onClick, onContext }: any) => {
        const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(srv => srv.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x=>x) as Service[] || []; const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase(); let colorClass = 'bg-sky-100 border-sky-300 text-sky-900'; if (allServiceNames.includes('tesoura')) colorClass = 'bg-pink-100 border-pink-300 text-pink-900'; else if (allServiceNames.includes('tosa normal')) colorClass = 'bg-orange-100 border-orange-300 text-orange-900'; else if (allServiceNames.includes('higi')) colorClass = 'bg-yellow-100 border-yellow-300 text-yellow-900'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) colorClass = 'bg-purple-100 border-purple-300 text-purple-900'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) colorClass = 'bg-indigo-100 border-indigo-300 text-indigo-900';
        return ( <div style={style} className={`absolute rounded-lg p-1.5 border shadow-sm ${colorClass} text-xs cursor-pointer hover:brightness-95 transition-all overflow-hidden flex flex-col leading-tight group hover:z-[100]`} onClick={(e) => { e.stopPropagation(); onClick(app); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext(e, app.id); }}> <div className="font-bold truncate">{client?.name}</div> <div className="truncate opacity-90">{pet?.name}</div> <div className="mt-0.5 flex flex-wrap gap-0.5 opacity-80"> {mainSvc && <span>{mainSvc.name}</span>} {addSvcs.length > 0 && <span>+ {addSvcs.length}</span>} </div> <div className="absolute right-1 bottom-1 bg-white/50 px-1 rounded text-[8px] font-mono">{app.durationTotal || 60}m</div> </div> );
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado'); const layoutItems = getLayout(dayApps);
        return ( <div className="relative h-[1200px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex"> <div className="w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0 sticky left-0 z-10"> {Array.from({length: 10}, (_, i) => i + 9).map(h => ( <div key={h} className="h-[120px] border-b border-gray-200 text-[10px] text-gray-400 font-bold p-1 text-right relative bg-gray-50"> <span className="-top-2 relative">{h}:00</span> </div> ))} </div> <div className="flex-1 relative bg-[repeating-linear-gradient(0deg,transparent,transparent_119px,#f3f4f6_120px)]"> {Array.from({length: 60}, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{top: i * 20}} />)} {layoutItems.map((item, idx) => { const app = item.app; const d = new Date(app.date); const startMin = (d.getHours() - 9) * 60 + d.getMinutes(); const duration = app.durationTotal || 60; return ( <AppointmentCard key={app.id} app={app} style={{ top: `${startMin * 2}px`, height: `${duration * 2}px`, left: item.left, width: item.width, zIndex: 10 }} onClick={setDetailsApp} onContext={(e: any, id: string) => setContextMenu({x: e.clientX, y: e.clientY, appId: id})} /> ); })} </div> </div> );
    };
    const renderWeekView = () => {
         const start = new Date(currentDate); start.setDate(start.getDate() - start.getDay()); const days = [2,3,4,5,6];
         return ( <div className="flex h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-col"> <div className="flex border-b border-gray-200"> <div className="w-10 bg-gray-50 border-r border-gray-200"></div> {days.map(dIdx => { const d = new Date(start); d.setDate(d.getDate() + dIdx); const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]; return ( <div key={dIdx} className={`flex-1 text-center py-2 text-xs font-bold border-r border-gray-100 ${isToday ? 'bg-blue-50 text-brand-600' : 'text-gray-500'}`}> {d.toLocaleDateString('pt-BR', {weekday: 'short'})} {d.getDate()} </div> ) })} </div> <div className="flex-1 overflow-y-auto relative flex"> <div className="w-10 bg-gray-50 border-r border-gray-200 flex-shrink-0 sticky left-0 z-10"> {Array.from({length: 10}, (_, i) => i + 9).map(h => ( <div key={h} className="h-[120px] border-b border-gray-200 text-[9px] text-gray-400 font-bold p-1 text-right relative bg-gray-50"> <span className="-top-2 relative">{h}:00</span> </div> ))} </div> {days.map(dIdx => { const d = new Date(start); d.setDate(d.getDate() + dIdx); const dateStr = d.toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado'); const layoutItems = getLayout(dayApps); return ( <div key={dIdx} className="flex-1 border-r border-gray-100 relative min-w-[60px]"> {Array.from({length: 60}, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{top: i * 20}} />)} {layoutItems.map((item, idx) => { const app = item.app; const ad = new Date(app.date); const startMin = (ad.getHours() - 9) * 60 + ad.getMinutes(); const duration = app.durationTotal || 60; return ( <AppointmentCard key={app.id} app={app} style={{ top: `${startMin * 2}px`, height: `${duration * 2}px`, left: item.left, width: item.width, zIndex: 10 }} onClick={setDetailsApp} onContext={(e: any, id: string) => setContextMenu({x: e.clientX, y: e.clientY, appId: id})} /> ) })} </div> ) })} </div> </div> )
    };
    const renderMonthView = () => {
        const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const firstDay = new Date(year, month, 1); const startDay = firstDay.getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const slots = []; for(let i=0; i<startDay; i++) slots.push(null); for(let i=1; i<=daysInMonth; i++) slots.push(new Date(year, month, i));
        return ( <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"> <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200"> {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-500">{d}</div>)} </div> <div className="flex-1 grid grid-cols-7 auto-rows-fr"> {slots.map((date, idx) => { if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/30 border-b border-r border-gray-100" />; const dateStr = date.toISOString().split('T')[0]; const isToday = dateStr === new Date().toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado').sort((a,b) => a.date.localeCompare(b.date)); return ( <div key={idx} className={`border-b border-r border-gray-100 p-1 flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`} onClick={() => { setDate(dateStr); setViewMode('day'); }}> <span className={`text-[10px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white' : 'text-gray-500'}`}>{date.getDate()}</span> <div className="flex-1 overflow-hidden space-y-1"> {dayApps.slice(0, 3).map(app => ( <div key={app.id} className="text-[8px] bg-sky-100 text-sky-800 rounded px-1 truncate font-medium"> {clients.find(c=>c.id===app.clientId)?.pets.find(p=>p.id===app.petId)?.name} </div> ))} {dayApps.length > 3 && <div className="text-[8px] text-gray-400 pl-1">+ {dayApps.length - 3} mais</div>} </div> </div> ) })} </div> </div> )
    };

    return ( <div className="space-y-3 animate-fade-in relative h-full flex flex-col"> <div className="flex flex-col md:flex-row justify-between items-center gap-2 flex-shrink-0 bg-white p-2 rounded-xl shadow-sm border border-gray-200"> <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar"> <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0"> <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Dia</button> <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Semana</button> <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Mês</button> </div> <div className="flex items-center gap-1 flex-shrink-0 ml-2"> <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronLeft size={18}/></button> <span className="text-sm font-bold text-gray-800 min-w-[90px] text-center truncate">{viewMode === 'day' && currentDate.toLocaleDateString('pt-BR')} {viewMode === 'week' && `Sem ${currentDate.getDate()}`} {viewMode === 'month' && currentDate.toLocaleDateString('pt-BR', {month:'short', year: 'numeric'})}</span> <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronRight size={18}/></button> </div> </div> <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-brand-200 hover:bg-brand-700 active:scale-95 transition flex items-center justify-center gap-1.5 text-xs"><Plus size={18} /> Novo Agendamento</button> </div> <div className="flex-1 min-h-0 relative overflow-hidden"> {viewMode === 'day' && <div className="h-full overflow-y-auto">{renderDayView()}</div>} {viewMode === 'week' && renderWeekView()} {viewMode === 'month' && renderMonthView()} {contextMenu && ( <div className="fixed bg-white shadow-xl border border-gray-200 rounded-xl z-[100] py-1 min-w-[160px] overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(appointments.find(a => a.id === contextMenu.appId)!)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 font-medium border-b border-gray-50"><Edit2 size={16}/> Editar</button> <button onClick={handleDeleteFromContext} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium"><Trash2 size={16}/> Excluir</button> </div> )} </div> {detailsApp && (() => { const client = clients.find(c => c.id === detailsApp.clientId); const pet = client?.pets.find(p => p.id === detailsApp.petId); const s = services.find(srv => srv.id === detailsApp.serviceId); const addSvcs = detailsApp.additionalServiceIds?.map(id => services.find(srv => srv.id === id)).filter(x=>x); return ( <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailsApp(null)}> <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}> <button onClick={() => setDetailsApp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={20}/></button> <div className="mb-6 text-center"> <h3 className="text-2xl font-bold text-gray-800">{pet?.name}</h3> <p className="text-gray-500 font-medium">{client?.name}</p> </div> <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm mb-6"> <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Phone size={16}/></div><span className="font-medium text-gray-700">{client?.phone}</span></div> <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><MapPin size={16}/></div><span className="font-medium text-gray-700 truncate">{client?.address} {client?.complement}</span></div> <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><FileText size={16}/></div><span className="font-medium italic text-gray-600 pt-1">{detailsApp.notes || pet?.notes || 'Sem obs'}</span></div> </div> <div className="mb-6"> <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Serviços</h4> <div className="flex flex-wrap gap-2"> <span className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-xs font-bold shadow-sm">{s?.name}</span> {addSvcs?.map(as => <span key={as?.id} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">{as?.name}</span>)} </div> </div> <button onClick={() => handleStartEdit(detailsApp)} className="w-full py-3.5 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-95 transition shadow-lg shadow-brand-200"><Edit2 size={18}/> Editar Agendamento</button> </div> </div> ) })()} {isModalOpen && ( <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"> <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:min-h-[600px] animate-scale-up"> <div className="p-4 border-b flex justify-between items-center bg-gray-50"> <h3 className="font-bold text-lg text-gray-800">{editingAppId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3> <button onClick={resetForm}><X size={24} className="text-gray-400 hover:text-gray-600"/></button> </div> <div className="p-4 overflow-y-auto custom-scrollbar space-y-4"> <div> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente / Pet</label> <div className="relative"> <Search className="absolute left-3 top-2.5 text-gray-400" size={16} /> <input value={selectedClientData ? selectedClientData.name : clientSearch} onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(''); setSelectedPet(''); }} placeholder="Buscar..." className="w-full pl-9 pr-8 py-3 border rounded-xl outline-none focus:ring-2 ring-brand-200 text-base" /> {selectedClientData && <button onClick={() => { setClientSearch(''); setSelectedClient(''); }} className="absolute right-2 top-3 text-gray-400"><X size={16}/></button>} </div> {clientSearch.length > 0 && !selectedClient && filteredClients.length > 0 && ( <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50"> {filteredClients.map(c => ( <button key={c.id} onClick={() => { setSelectedClient(c.id); setClientSearch(''); }} className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-center"> <div className="text-base font-bold text-gray-800">{c.name} <span className="text-xs font-normal text-gray-500">({c.pets.map(p=>p.name).join(', ')})</span></div> </button> ))} </div> )} </div> {selectedClient && ( <div className="grid grid-cols-2 gap-2"> {pets.map(p => ( <button key={p.id} onClick={() => { setSelectedPet(p.id); setSelectedService(''); }} className={`p-3 rounded-xl border text-left text-sm transition-all ${selectedPet === p.id ? 'bg-brand-50 border-brand-500 shadow-sm ring-1 ring-brand-200' : 'hover:bg-gray-50'}`}> <div className="font-bold">{p.name}</div><div className="text-gray-500 text-xs">{p.size}</div> </button> ))} </div> )} {selectedPet && ( <div className="space-y-4"> <div className="space-y-1"> <label className="text-xs font-bold text-gray-400 uppercase">Serviço Principal</label> <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500"><option value="">Selecione...</option>{getApplicableServices('principal').map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)}</select> </div> <div className="space-y-1"> <label className="text-xs font-bold text-gray-400 uppercase">Serviço Adicional</label> <select className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500" onChange={(e) => { const val = e.target.value; if(val && !selectedAddServices.includes(val)) setSelectedAddServices(prev => [...prev, val]); e.target.value = ''; }} > <option value="">Adicionar serviço...</option> {getApplicableServices('adicional').filter((service, index, self) => index === self.findIndex((t) => t.name === service.name)).map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)} </select> </div> <div className="flex flex-wrap gap-2 min-h-[30px]">{selectedAddServices.map(id => <span key={id} onClick={() => setSelectedAddServices(p => p.filter(x => x !== id))} className="bg-purple-50 border border-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-purple-100 flex items-center gap-1">{services.find(s=>s.id===id)?.name} <X size={12}/></span>)}</div> <div className="grid grid-cols-2 gap-3"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-3 rounded-xl text-base outline-none" /><select value={time} onChange={e => setTime(e.target.value)} className="border p-3 rounded-xl text-base outline-none">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div> <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Duração Estimada</label><select value={manualDuration} onChange={e => setManualDuration(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500"><option value="0">Automático (pelo serviço)</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="90">1 hora e 30 min</option><option value="120">2 horas</option><option value="150">2 horas e 30 min</option><option value="180">3 horas</option><option value="240">4 horas</option></select></div> <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-3 rounded-xl text-sm outline-none focus:border-gray-400" rows={3} placeholder="Observações..." /> </div> )} </div> <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"> <button onClick={resetForm} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl text-sm transition">Cancelar</button> <button onClick={handleSave} disabled={!selectedClient || !selectedPet || !selectedService} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 text-sm shadow-lg shadow-brand-200 active:scale-95 transition">Salvar</button> </div> </div> </div> )} </div> );
};

const MenuView: React.FC<{ setView: (view: ViewState) => void; onLogout: () => void; onOpenSettings: () => void; }> = ({ setView, onLogout, onOpenSettings }) => {
    const MenuItem = ({ icon: Icon, label, color, onClick }: any) => (
        <button onClick={onClick} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-95 transition-all">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color} bg-opacity-20 text-opacity-100`}>
                    <Icon size={20} className={color.replace('bg-', 'text-')} />
                </div>
                <span className="font-bold text-gray-700">{label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in p-2">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Menu Principal</h1>
            
            <div className="space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">Cadastros e Serviços</h2>
                <div className="grid grid-cols-1 gap-3">
                    <MenuItem icon={Users} label="Clientes & Pets" color="bg-blue-500" onClick={() => setView('clients')} />
                    <MenuItem icon={Scissors} label="Serviços" color="bg-purple-500" onClick={() => setView('services')} />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">Gerencial</h2>
                <div className="grid grid-cols-1 gap-3">
                    <MenuItem icon={TrendingUp} label="Faturamento Completo" color="bg-green-500" onClick={() => setView('revenue')} />
                    <MenuItem icon={TrendingDown} label="Custos Mensais" color="bg-orange-500" onClick={() => setView('costs')} />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">Sistema</h2>
                <div className="grid grid-cols-1 gap-3">
                    <MenuItem icon={Settings} label="Configurações" color="bg-gray-500" onClick={onOpenSettings} />
                    <button onClick={onLogout} className="w-full bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 font-bold flex items-center justify-center gap-2 mt-4 active:scale-95 transition">
                        <LogOut size={18} /> Sair do Sistema
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [isConfigured, setIsConfigured] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ appName: 'PomPomPet', logoUrl: '', theme: 'rose', sidebarOrder: ['operacional', 'cadastros', 'gerencial'] });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // --- PIN SECURITY STATE ---
  const [pin, setPin] = useState(localStorage.getItem('petgestor_pin') || '');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);

  const SHEET_ID = localStorage.getItem('petgestor_sheet_id') || PREDEFINED_SHEET_ID;

  const STORAGE_KEY_TOKEN = 'petgestor_access_token';
  const STORAGE_KEY_EXPIRY = 'petgestor_token_expiry';
  const STORAGE_KEY_USER = 'petgestor_user_profile';
  const STORAGE_KEY_SETTINGS = 'petgestor_settings';

  useEffect(() => {
    setClients(db.getClients());
    setServices(db.getServices());
    setAppointments(db.getAppointments());
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if(savedSettings) setSettings(JSON.parse(savedSettings));

    if (!localStorage.getItem('petgestor_client_id')) localStorage.setItem('petgestor_client_id', DEFAULT_CLIENT_ID);
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);

    if (storedToken && storedExpiry && storedUser) {
        if (Date.now() < parseInt(storedExpiry)) {
            setAccessToken(storedToken);
            setGoogleUser(JSON.parse(storedUser));
            performFullSync(storedToken);
        } else {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_EXPIRY);
            localStorage.removeItem(STORAGE_KEY_USER);
        }
    }

    // Google Loaded Polling
    const interval = setInterval(() => {
        if ((window as any).google) {
            setGoogleLoaded(true);
            clearInterval(interval);
            initAuthLogic();
        }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    const themes: Record<string, string> = {
        rose: '225 29 72', blue: '37 99 235', purple: '147 51 234', green: '22 163 74', orange: '234 88 12'
    };
    const color = themes[settings.theme] || themes.rose;
    root.style.setProperty('--brand-600', color);
  }, [settings.theme]);

  const performFullSync = async (token: string) => {
      if (!SHEET_ID) return;
      setIsGlobalLoading(true);
      try {
          await handleSyncServices(token, true);
          await handleSyncClients(token, true);
          await handleSyncAppointments(token, true);
          await handleSyncCosts(token, true);
      } catch (e) { console.error("Auto Sync Failed", e); } finally { setIsGlobalLoading(false); }
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
    }
  };

  const handleLogout = () => {
      setAccessToken(null); setGoogleUser(null); setIsPinUnlocked(false);
      localStorage.removeItem(STORAGE_KEY_TOKEN); localStorage.removeItem(STORAGE_KEY_EXPIRY); localStorage.removeItem(STORAGE_KEY_USER);
      if((window as any).google) (window as any).google.accounts.id.disableAutoSelect();
  }

  const handleSaveConfig = (id: string) => { localStorage.setItem('petgestor_client_id', id); setIsConfigured(true); window.location.reload(); };
  const handleResetConfig = () => { localStorage.removeItem('petgestor_client_id'); setIsConfigured(false); setGoogleUser(null); };

  const handleSyncCosts = async (token: string, silent = false) => {
      if (!token || !SHEET_ID) return;
      try {
          const rows = await googleService.getSheetValues(token, SHEET_ID, 'Custo Mensal!A:F');
          if(!rows || rows.length < 2) return;
          const loadedCosts: CostItem[] = [];
          rows.slice(1).forEach((row: string[], idx: number) => {
              const dateStr = row[2]; const typeStr = row[3]; const costStr = row[4]; const statusStr = row[5] ? row[5].trim() : '';
              if(!dateStr || !costStr) return;
              let isoDate = new Date().toISOString();
              try { const [day, month, year] = dateStr.split('/'); if(day && month && year) isoDate = `${year}-${month}-${day}T00:00:00`; } catch(e){}
              let amount = 0;
              const cleanCost = costStr.replace(/[^\d,.-]/g, '').trim();
              amount = parseFloat(cleanCost.includes(',') ? cleanCost.replace(/\./g, '').replace(',', '.') : cleanCost);
              if(isNaN(amount)) amount = 0;
              loadedCosts.push({ id: `cost_${idx}`, month: row[0], week: row[1], date: isoDate, category: typeStr, amount: amount, status: statusStr.toLowerCase() === 'pago' ? 'Pago' : '' });
          });
          setCosts(loadedCosts);
          if(!silent) alert("Custos atualizados.");
      } catch (e) { console.error(e); }
  };

  const handleSyncClients = async (token: string, silent = false) => {
    if (!token || !SHEET_ID) { if(!silent) alert("Erro: Login ou ID da Planilha faltando."); return; }
    try {
      const rows = await googleService.getSheetValues(token, SHEET_ID, 'CADASTRO!A:O'); 
      if (!rows || rows.length < 2) { if(!silent) alert("Planilha vazia ou aba 'CADASTRO' não encontrada."); return; }
      const clientsMap = new Map<string, Client>();
      rows.slice(1).forEach((row: string[], index: number) => {
        const timestamp = row[1]; const clientName = row[3]; const phone = row[4]; const address = row[5]; const complement = row[11];
        const petName = row[6]; const petBreed = row[7]; const petSize = row[8]; const petCoat = row[9]; const petNotes = row[10]; const petAge = row[12]; const petGender = row[13];
        if (!clientName || !phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        if (!clientsMap.has(cleanPhone)) {
          let createdIso = new Date().toISOString(); 
          try { if(timestamp) { const [datePart, timePart] = timestamp.split(' '); const [day, month, year] = datePart.split('/'); if(year && month && day) createdIso = new Date(`${year}-${month}-${day}T${timePart || '00:00'}`).toISOString(); } } catch(e) {}
          clientsMap.set(cleanPhone, { id: `sheet_${index}`, name: clientName, phone: phone, address: address || '', complement: complement || '', createdAt: createdIso, pets: [] });
        }
        const client = clientsMap.get(cleanPhone)!;
        if (petName) {
          client.pets.push({ id: `pet_${index}`, name: petName, breed: petBreed || '', age: petAge || '', gender: petGender || '', size: petSize || '', coat: petCoat || '', notes: petNotes || '' });
        }
      });
      const newClients = Array.from(clientsMap.values());
      setClients(newClients);
      db.saveClients(newClients);
      if(!silent) alert("Clientes sincronizados!");
    } catch (error) { console.error("Error syncing clients", error); if(!silent) alert("Erro ao sincronizar clientes."); }
  };

  const handleSyncServices = async (token: string, silent = false) => {
      if (!token || !SHEET_ID) { if(!silent) alert("Erro: Login ou ID da Planilha faltando."); return; }
      try {
          const rows = await googleService.getSheetValues(token, SHEET_ID, 'Serviço!A:E');
          if (!rows || rows.length < 2) return;
          const loadedServices: Service[] = [];
          rows.slice(1).forEach((row: string[], idx: number) => {
              const name = row[0]; const category = row[1] as 'principal' | 'adicional'; const size = row[2]; const coat = row[3]; const priceStr = row[4];
              if(!name || !priceStr) return;
              let price = 0;
              const cleanPrice = priceStr.replace(/[^\d,.-]/g, '').trim();
              price = parseFloat(cleanPrice.includes(',') ? cleanPrice.replace(/\./g, '').replace(',', '.') : cleanPrice);
              if(isNaN(price)) price = 0;
              loadedServices.push({ id: `sheet_svc_${idx}`, name, price, durationMin: 60, description: '', category: category || 'principal', targetSize: (!size || size === '') ? 'Todos' : size, targetCoat: (!coat || coat === '') ? 'Todos' : coat });
          });
          setServices(loadedServices);
          db.saveServices(loadedServices);
          if(!silent) alert("Serviços atualizados.");
      } catch (e) { console.error(e); if(!silent) alert("Erro ao sync serviços."); }
  };

  const handleSyncAppointments = async (token: string, silent = false) => {
      if (!token || !SHEET_ID) { if(!silent) alert("Falta login."); return; }
      try {
          const rows = await googleService.getSheetValues(token, SHEET_ID, 'Agendamento!A:T');
          if (!rows || rows.length < 5) return;
          const newApps: Appointment[] = [];
          const dataRows = rows.slice(4); 
          dataRows.forEach((row: string[], idx: number) => {
              const petName = row[0]; const clientName = row[1]; const dateStr = row[11]; const timeStr = row[12]; const durationStr = row[14];
              if (!petName || !clientName || !dateStr || !timeStr) return;
              let isoDate = '';
              try { const [day, month, year] = dateStr.split('/'); if(day && month && year) isoDate = `${year}-${month}-${day}T${timeStr}:00`; } catch(e) {}
              if (!isoDate) return;
              let client = clients.find(c => c.name === clientName);
              if (!client) { client = { id: `temp_c_${idx}`, name: clientName, phone: row[2] || '', address: row[3] || '', pets: [] }; clients.push(client); }
              let pet = client.pets.find(p => p.name === petName);
              if (!pet) { pet = { id: `temp_p_${idx}`, name: petName, breed: row[4] || '', size: row[5] || '', coat: row[6] || '', age: '', gender: '', notes: '' }; client.pets.push(pet); }
              let mainSvc = services.find(s => s.name === row[7]);
              if (!mainSvc) mainSvc = { id: `temp_s_${idx}`, name: row[7], price: 0, durationMin: 60, category: 'principal', description: '' };
              const addServiceNames = [row[8], row[9], row[10]].filter(n => n);
              const addServiceIds = addServiceNames.map(n => { const s = services.find(sv => sv.name === n); return s ? s.id : ''; }).filter(id => id);
              
              let paidAmount = 0; const valStr = row[16] || '';
              if(valStr) { const clean = valStr.replace(/[^\d,.-]/g, '').trim(); paidAmount = parseFloat(clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean); }
              
              newApps.push({ 
                  id: `sheet_${idx}`, clientId: client.id, petId: pet.id, serviceId: mainSvc.id, additionalServiceIds: addServiceIds, date: isoDate, 
                  status: 'agendado', notes: row[13], durationTotal: parseInt(durationStr) || 60, googleEventId: row[19] || undefined, 
                  paidAmount: isNaN(paidAmount) ? 0 : paidAmount, paymentMethod: row[17] as any || '' 
              });
          });
          setAppointments(newApps);
          db.saveAppointments(newApps);
          if(!silent) alert("Agenda sincronizada.");
      } catch (e) { console.error(e); if(!silent) alert("Erro sync agenda."); }
  };

  const handleAddAppointment = async (app: Appointment, client: Client, pet: Pet, svcs: Service[], duration: number) => {
      const newApp = { ...app, durationTotal: duration };
      setAppointments([...appointments, newApp]);
      const mainSvc = svcs[0]; const addSvcs = svcs.slice(1);
      
      let gEventId = '';
      if (accessToken) {
          const gEvent = await googleService.createEvent(accessToken, { summary: `${pet.name} - ${mainSvc.name}`, description: `Cliente: ${client.name}\nTel: ${client.phone}\nObs: ${app.notes}`, startTime: app.date, durationMin: duration });
          if(gEvent) gEventId = gEvent.id;
      }
      
      if (accessToken && SHEET_ID) {
          try {
              const d = new Date(app.date); const dateStr = d.toLocaleDateString('pt-BR'); const timeStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
              const rowData = [
                  pet.name, client.name, client.phone, client.address, pet.breed, pet.size, pet.coat, mainSvc.name, 
                  addSvcs[0]?.name || '', addSvcs[1]?.name || '', addSvcs[2]?.name || '', 
                  dateStr, timeStr, app.notes || '', duration.toString(), 'Agendado', 
                  '', '', '', gEventId
              ];
              await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:T', rowData);
              handleSyncAppointments(accessToken, true); // Silent sync to get IDs back
          } catch(e) { console.error(e); alert('Salvo localmente. Erro na planilha.'); }
      }
  };

  const handleEditAppointment = async (app: Appointment, client: Client, pet: Pet, svcs: Service[], duration: number) => {
      setAppointments(appointments.map(a => a.id === app.id ? { ...app, durationTotal: duration } : a));
      const mainSvc = svcs[0]; const addSvcs = svcs.slice(1);
      
      if (accessToken && app.googleEventId) {
          await googleService.updateEvent(accessToken, app.googleEventId, { summary: `${pet.name} - ${mainSvc.name}`, description: `Cliente: ${client.name}\nTel: ${client.phone}\nObs: ${app.notes}`, startTime: app.date, durationMin: duration });
      }

      if (app.id.startsWith('sheet_') && accessToken && SHEET_ID) {
          const parts = app.id.split('_'); const index = parseInt(parts[1]); const row = index + 5; 
          const d = new Date(app.date); const dateStr = d.toLocaleDateString('pt-BR'); const timeStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
          const rowData = [
              pet.name, client.name, client.phone, client.address, pet.breed, pet.size, pet.coat, mainSvc.name, 
              addSvcs[0]?.name || '', addSvcs[1]?.name || '', addSvcs[2]?.name || '', 
              dateStr, timeStr, app.notes || '', duration.toString(), 'Agendado', 
              app.paidAmount?.toString().replace('.',',') || '', app.paymentMethod || '', '', app.googleEventId || ''
          ];
          await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!A${row}:T${row}`, rowData);
          handleSyncAppointments(accessToken, true);
      }
  };

  const handleDeleteAppointment = async (id: string) => {
      const app = appointments.find(a => a.id === id);
      if(!app) return;
      if(confirm('Excluir agendamento?')) {
          setAppointments(appointments.filter(a => a.id !== id));
          if(accessToken && app.googleEventId) { await googleService.deleteEvent(accessToken, app.googleEventId); }
          if(app.id.startsWith('sheet_') && accessToken && SHEET_ID) {
               const parts = app.id.split('_'); const index = parseInt(parts[1]); const row = index + 5;
               await googleService.clearSheetValues(accessToken, SHEET_ID, `Agendamento!A${row}:T${row}`);
          }
      }
  };

  const handleUpdateStatus = (id: string, status: Appointment['status']) => { setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a)); };
  const handleDeleteService = (id: string) => { setServices(services.filter(s => s.id !== id)); };
  const handleDeleteClient = (id: string) => { setClients(clients.filter(c => c.id !== id)); };
  
  if (!isConfigured) return <SetupScreen onSave={handleSaveConfig} />;
  if (!googleUser) return <LoginScreen onLogin={googleService.login} onReset={handleResetConfig} settings={settings} googleLoaded={googleLoaded} />;
  
  const renderView = () => {
    switch(currentView) {
      case 'home':
        return (
            <div className="h-full bg-white flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                    <h1 className="text-xl font-bold text-gray-800">Início</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentView('schedule')} className="p-2 bg-brand-50 text-brand-600 rounded-lg"><CalendarIcon size={20}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <RevenueView appointments={appointments} services={services} clients={clients} defaultTab="daily" />
                    <PaymentManager appointments={appointments} clients={clients} services={services} onUpdateAppointment={handleEditAppointment} accessToken={accessToken} sheetId={SHEET_ID} />
                </div>
            </div>
        );
      case 'payments': return <PaymentManager appointments={appointments} clients={clients} services={services} onUpdateAppointment={handleEditAppointment} accessToken={accessToken} sheetId={SHEET_ID} />;
      case 'schedule': return <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onEdit={handleEditAppointment} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteAppointment} googleUser={googleUser} />;
      case 'revenue': return <PinGuard isUnlocked={isPinUnlocked} onUnlock={(p) => { const valid = p === pin; if(valid) setIsPinUnlocked(true); return valid; }} onSetPin={(p) => { setPin(p); localStorage.setItem('petgestor_pin', p); setIsPinUnlocked(true); }} hasPin={!!pin} onReset={handleLogout} /> || <RevenueView appointments={appointments} services={services} clients={clients} />;
      case 'costs': return <PinGuard isUnlocked={isPinUnlocked} onUnlock={(p) => { const valid = p === pin; if(valid) setIsPinUnlocked(true); return valid; }} onSetPin={(p) => { setPin(p); localStorage.setItem('petgestor_pin', p); setIsPinUnlocked(true); }} hasPin={!!pin} onReset={handleLogout} /> || <CostsView costs={costs} />;
      case 'clients': return <ClientManager clients={clients} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />;
      case 'services': return <ServiceManager services={services} onAddService={s => setServices([...services, s])} onDeleteService={handleDeleteService} onSyncServices={(s) => handleSyncServices(accessToken!, s)} accessToken={accessToken} sheetId={SHEET_ID} />;
      case 'menu': return <MenuView setView={setCurrentView} onLogout={handleLogout} onOpenSettings={() => setIsSettingsOpen(true)} />;
      default: return <div className="p-8 text-center text-gray-500">Página não encontrada</div>;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} googleUser={googleUser} onLogin={googleService.login} onLogout={handleLogout} settings={settings} onOpenSettings={() => setIsSettingsOpen(true)}>
      {isGlobalLoading && <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-brand-600 mb-4" size={48} /><p className="text-gray-600 font-bold animate-pulse">Sincronizando dados...</p></div>}
      {renderView()}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s)); }} />
    </Layout>
  );
};

export default App;