
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
    ShoppingBag, Tag, User, Users, Key, Unlock, Home, Activity, Menu, ArrowRightLeft
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, CartesianGrid, Legend, ComposedChart, LabelList, PieChart, Pie
} from 'recharts';

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';
const DEFAULT_LOGO_URL = 'https://photos.app.goo.gl/xs394sFQNYBBocea8';

// --- HELPERS ---
const formatDateWithWeek = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

// --- SUB-COMPONENTS ---

const SetupScreen: React.FC<{ onSave: (id: string) => void }> = ({ onSave }) => {
    const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 text-center">
                <img src={DEFAULT_LOGO_URL} alt="PomPomPet" className="w-24 h-24 mx-auto mb-6 object-contain" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuração Inicial</h1>
                <p className="text-gray-500 mb-6">ID do Cliente Google (OAuth 2.0)</p>
                <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Ex: 1234...apps.googleusercontent.com" className="w-full border p-3 rounded-lg focus:ring-2 ring-brand-500 outline-none font-mono text-sm mb-6" />
                <button onClick={() => { if (clientId.trim().length > 10) onSave(clientId); else alert("ID inválido"); }} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition">Salvar e Continuar</button>
            </div>
        </div>
    );
};

const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void; settings?: AppSettings; googleLoaded: boolean }> = ({ onLogin, onReset, settings, googleLoaded }) => {
    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="w-full flex justify-center mb-6">
                    <img src={settings?.logoUrl || DEFAULT_LOGO_URL} alt="PomPomPet" className="w-48 h-auto object-contain rounded-lg" />
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

const PinGuard: React.FC<{ isUnlocked: boolean; onUnlock: (pin: string) => boolean; onSetPin: (pin: string) => void; hasPin: boolean; onReset: () => void; setView: (v: ViewState) => void; }> = ({ isUnlocked, onUnlock, onSetPin, hasPin, onReset, setView }) => {
    const [inputPin, setInputPin] = useState(''); const [mode, setMode] = useState<'enter' | 'create' | 'confirm'>(hasPin ? 'enter' : 'create'); const [confirmPin, setConfirmPin] = useState(''); const [error, setError] = useState('');
    const handleDigit = (d: string) => { if (inputPin.length < 4) { const newVal = inputPin + d; setInputPin(newVal); if (newVal.length === 4) setTimeout(() => processPin(newVal), 200); } };
    const processPin = (val: string) => { setError(''); if (mode === 'enter') { if (onUnlock(val)) setInputPin(''); else { setError('Senha incorreta'); setInputPin(''); } } else if (mode === 'create') { setConfirmPin(val); setMode('confirm'); setInputPin(''); } else if (mode === 'confirm') { if (val === confirmPin) { onSetPin(val); setInputPin(''); alert('Senha criada!'); } else { setError('Não conferem'); setMode('create'); setInputPin(''); } } };
    if (isUnlocked) return null;
    return (<div className="fixed inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center p-4"> <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center relative"> <button onClick={() => setView('menu')} className="absolute top-4 right-4 text-gray-400"><X /></button> <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600"> <Lock size={32} /> </div> <h2 className="text-xl font-bold text-gray-800 mb-2">{mode === 'enter' ? 'Área Protegida' : 'Criar Senha'}</h2> <div className="flex justify-center gap-4 mb-6"> {[0, 1, 2, 3].map(i => (<div key={i} className={`w-4 h-4 rounded-full border-2 ${i < inputPin.length ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`} />))} </div> {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>} <div className="grid grid-cols-3 gap-4 mb-6"> {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (<button key={n} onClick={() => handleDigit(n.toString())} className={`h-16 rounded-xl bg-gray-50 hover:bg-brand-50 text-xl font-bold text-gray-700 hover:text-brand-600 transition shadow-sm border border-gray-100 active:scale-95 ${n === 0 ? 'col-start-2' : ''}`}>{n}</button>))} <button onClick={() => setInputPin(p => p.slice(0, -1))} className="h-16 rounded-xl bg-gray-50 hover:bg-red-50 text-xl font-bold text-gray-400 hover:text-red-500 transition shadow-sm border border-gray-100 col-start-3 row-start-4"><ChevronLeft /></button> </div> {mode === 'enter' && <button onClick={onReset} className="text-xs text-gray-400 underline hover:text-brand-600">Esqueci minha senha</button>} </div> </div>);
};

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: AppSettings; onSave: (s: AppSettings) => void }> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'menu'>('general');
    if (!isOpen) return null;
    const themes = [
        { name: 'Rose (Padrão)', value: 'rose', color: '#e11d48' },
        { name: 'Azul Moderno', value: 'blue', color: '#2563eb' },
        { name: 'Roxo Criativo', value: 'purple', color: '#9333ea' },
        { name: 'Verde Natureza', value: 'green', color: '#16a34a' },
        { name: 'Laranja Vibrante', value: 'orange', color: '#ea580c' },
    ];
    const moveMenuItem = (idx: number, dir: number) => { const newOrder = [...localSettings.sidebarOrder]; const target = idx + dir; if (target >= 0 && target < newOrder.length) { [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]]; setLocalSettings({ ...localSettings, sidebarOrder: newOrder }); } };
    return (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/40 ring-1 ring-white/50 animate-scale-up">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-xl text-gray-900 tracking-tight">Configurações</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="flex border-b border-gray-100 p-1 bg-gray-50/50">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'general' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>Geral</button>
                    <button onClick={() => setActiveTab('theme')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'theme' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>Aparência</button>
                    <button onClick={() => setActiveTab('menu')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'menu' ? 'bg-white shadow text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}>Menu</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Nome do Petshop</label><input value={localSettings.appName} onChange={e => setLocalSettings({ ...localSettings, appName: e.target.value })} className="w-full border-none bg-gray-50 p-4 rounded-xl mt-1 text-gray-800 font-bold outline-none focus:ring-2 ring-brand-200 transition-all" /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">URL do Logo</label><input value={localSettings.logoUrl} onChange={e => setLocalSettings({ ...localSettings, logoUrl: e.target.value })} placeholder="https://..." className="w-full border-none bg-gray-50 p-4 rounded-xl mt-1 text-gray-800 outline-none focus:ring-2 ring-brand-200 transition-all" /></div>
                        </div>
                    )}
                    {activeTab === 'theme' && (
                        <div className="grid grid-cols-1 gap-3">
                            {themes.map(t => (
                                <button key={t.value} onClick={() => setLocalSettings({ ...localSettings, theme: t.value })} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${localSettings.theme === t.value ? 'border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: t.color }}></div><span className="font-bold text-gray-800">{t.name}</span></div>
                                    {localSettings.theme === t.value && <div className="bg-brand-600 text-white p-1 rounded-full"><Check size={16} /></div>}
                                </button>
                            ))}
                        </div>
                    )}
                    {activeTab === 'menu' && (
                        <div className="space-y-3">
                            <p className="text-xs text-center text-gray-400 font-medium uppercase tracking-wide">Reorganize os grupos do menu lateral</p>
                            {localSettings.sidebarOrder.map((item, idx) => (
                                <div key={item} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                                    <span className="font-bold text-gray-800 capitalize flex items-center gap-2">
                                        <div className="w-1.5 h-8 bg-gray-200 rounded-full"></div>
                                        {item === 'operacional' ? 'Operacional' : item}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => moveMenuItem(idx, -1)} disabled={idx === 0} className="p-2 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 transition-all text-gray-600"><ChevronDown className="rotate-180" size={18} /></button>
                                        <button onClick={() => moveMenuItem(idx, 1)} disabled={idx === localSettings.sidebarOrder.length - 1} className="p-2 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 transition-all text-gray-600"><ChevronDown size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-gray-100/50 bg-gray-50/50 flex justify-end gap-3 glass">
                    <button onClick={onClose} className="px-5 py-3 text-gray-600 hover:bg-gray-200/50 rounded-xl font-bold text-sm transition-colors">Cancelar</button>
                    <button onClick={() => { onSave(localSettings); onClose(); }} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-brand-200 hover:scale-105 active:scale-95 transition-all">Salvar Alterações</button>
                </div>
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

const RevenueView: React.FC<{ appointments: Appointment[]; services: Service[]; clients: Client[]; defaultTab?: 'daily' | 'weekly' | 'monthly' | 'yearly' }> = ({ appointments, services, clients, defaultTab = 'daily' }) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(defaultTab);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const touchStart = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (activeTab === 'daily' && Math.abs(diff) > 50) {
            const [y, m, d] = selectedDate.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            date.setDate(date.getDate() + (diff > 0 ? 1 : -1));
            setSelectedDate(date.toISOString().split('T')[0]);
        }
        touchStart.current = null;
    };

    const getISOWeek = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
            const rev = apps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);
            return { revenue: rev, pets: apps.length };
        };
        const weeksInMonth = new Set<number>();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) weeksInMonth.add(getISOWeek(new Date(year, month, d)));
        const sortedWeeks = Array.from(weeksInMonth).sort((a, b) => a - b);
        const chartData = [];
        sortedWeeks.forEach((weekNum, index) => {
            const { revenue, pets } = getWeekData(year, weekNum);
            let growth = 0; if (index > 0) { const prevRev = chartData[index - 1].faturamento; if (prevRev > 0) growth = ((revenue - prevRev) / prevRev) * 100; }
            chartData.push({ name: `S${index + 1}`, faturamento: revenue, rawRevenue: revenue, pets: pets, growth });
        });
        return chartData;
    };

    const getYearlyChartData = () => {
        const data = []; const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const startMonth = selectedYear === 2025 ? 7 : 0;
        for (let i = startMonth; i < 12; i++) {
            const monthApps = appointments.filter(a => { const d = new Date(a.date); return d.getFullYear() === selectedYear && d.getMonth() === i && a.status !== 'cancelado'; });
            const stats = calculateStats(monthApps);
            let revGrowth = 0; if (i > startMonth) { const prevApps = appointments.filter(a => { const d = new Date(a.date); return d.getFullYear() === selectedYear && d.getMonth() === (i - 1) && a.status !== 'cancelado'; }); const prevStats = calculateStats(prevApps); if (prevStats.grossRevenue > 0) revGrowth = ((stats.grossRevenue - prevStats.grossRevenue) / prevStats.grossRevenue) * 100; }
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
        const startOfWeek = new Date(date); startOfWeek.setDate(diff); startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);
        const wApps = appointments.filter(a => { if (a.status === 'cancelado') return false; const ad = new Date(a.date); return ad >= startOfWeek && ad <= endOfWeek; });
        return calculateStats(wApps);
    };
    const weeklyStats = calculateWeeklyStats();

    const monthlyChartData = getMonthlyChartData();
    const yearlyChartData = getYearlyChartData();
    const monthlyApps = appointments.filter(a => a.date.startsWith(selectedMonth));
    const monthlyStats = calculateStats(monthlyApps);
    const yearlyApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear);
    const yearlyStats = calculateStats(yearlyApps);

    // Métricas de Média Pets/Dia
    const weeklyAvgPets = weeklyStats.totalPets / 5; // Aprox 5 dias úteis
    const monthlyAvgPets = monthlyStats.totalPets / 22; // Aprox 22 dias úteis
    const yearlyAvgPets = yearlyStats.totalPets / (selectedYear === 2025 ? 110 : 260); // Aprox

    const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[110px] group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <Icon size={48} className={colorClass.replace('bg-', 'text-').replace('500', '600')} />
            </div>
            <div className="flex justify-between items-start z-10">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{value}</h3>
                    {subValue && <p className="text-xs font-medium text-gray-400 mt-1 flex items-center gap-1">{subValue}</p>}
                </div>
                <div className={`p-2.5 rounded-2xl ${colorClass} bg-opacity-20 shadow-inner md:group-hover:bg-opacity-30 transition-all`}>
                    <div className={`p-1.5 rounded-xl bg-white shadow-sm`}>
                        <Icon size={18} className={colorClass.replace('bg-', 'text-').replace('500', '600')} />
                    </div>
                </div>
            </div>
        </div>
    );

    const TabButton = ({ id, label, icon: Icon }: any) => (<button onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === id ? 'bg-white text-brand-600 shadow-md transform scale-100' : 'text-gray-400 hover:bg-white/50 hover:text-gray-600'}`}><Icon size={16} /><span className="hidden sm:inline">{label}</span></button>);

    return (
        <div className="space-y-6 animate-fade-in pb-10" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {defaultTab === 'daily' ? null : (
                <>
                    <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Faturamento</h1></div>
                    <div className="bg-gray-100/50 p-1 rounded-2xl mb-8 flex gap-1 shadow-inner"><TabButton id="daily" label="Diário" icon={CalendarIcon} /><TabButton id="weekly" label="Semanal" icon={BarChart2} /><TabButton id="monthly" label="Mensal" icon={TrendingUp} /><TabButton id="yearly" label="Anual" icon={PieChartIcon} /></div>
                </>
            )}

            {activeTab === 'daily' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Diário</h2><div className="text-sm font-bold text-gray-600 px-3">{formatDateWithWeek(selectedDate)}</div></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total de Pets" value={dailyStats.totalPets} icon={PawPrint} colorClass="bg-blue-500" /><StatCard title="Total de Tosas" value={dailyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500" subValue="Normal e Tesoura" /><StatCard title="Caixa Pago" value={`R$ ${dailyStats.paidRevenue.toFixed(2)}`} icon={CheckCircle} colorClass="bg-green-500" /><StatCard title="A Receber" value={`R$ ${dailyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" /></div>
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-glass border border-white/40 overflow-hidden mt-6"><h3 className="p-5 text-sm font-bold text-gray-500 border-b border-gray-100/50 flex items-center gap-2 uppercase tracking-wider"><FileText size={16} /> Detalhamento do Dia</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50/50 text-gray-400 font-bold text-[10px] uppercase tracking-wider"><tr><th className="p-4">Horário</th><th className="p-4">Cliente</th><th className="p-4">Pet</th><th className="p-4">Serviços</th><th className="p-4 text-right">Valor</th></tr></thead><tbody className="divide-y divide-gray-100/50">{dailyApps.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">Nenhum agendamento neste dia.</td></tr>) : (dailyApps.sort((a, b) => a.date.localeCompare(b.date)).map(app => { const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(s => s.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x => x); const val = calculateGrossRevenue(app); return (<tr key={app.id} className="hover:bg-blue-50/30 transition-colors"><td className="p-4 font-mono text-xs text-brand-600 font-bold bg-gray-50/30 rounded-r-xl">{new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td className="p-4 font-bold text-gray-800">{client?.name}</td><td className="p-4 text-gray-600">{pet?.name}</td><td className="p-4 text-xs text-gray-500"><span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{mainSvc?.name}</span>{addSvcs && addSvcs.length > 0 && (<span className="text-gray-400 ml-1"> + {addSvcs.map(s => s?.name).join(', ')}</span>)}</td><td className="p-4 text-right font-bold text-green-600">R$ {val.toFixed(2)}</td></tr>); }))}</tbody></table></div></div>
                </section>
            )}
            {activeTab === 'weekly' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200 gap-2"><h2 className="text-lg font-bold text-gray-800">Semana</h2></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Pets da Semana" value={weeklyStats.totalPets} icon={PawPrint} colorClass="bg-indigo-500" /><StatCard title="Total Faturamento" value={`R$ ${weeklyStats.grossRevenue.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500" /><StatCard title="Média Pets/Dia" value={weeklyAvgPets.toFixed(1)} icon={Activity} colorClass="bg-amber-500" /><StatCard title="Pendente" value={`R$ ${weeklyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-rose-500" /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16} /> Faturamento x Pets</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={weeklyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={weeklyChartData} />} height={60} axisLine={false} tickLine={false} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `R$${val}`} domain={['auto', 'auto']} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><Bar yAxisId="right" dataKey="pets" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={40}><LabelList dataKey="pets" position="top" style={{ fontSize: 9, fill: '#6366f1' }} /></Bar><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}
            {activeTab === 'monthly' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Mês</h2><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total de Pets" value={monthlyStats.totalPets} icon={PawPrint} colorClass="bg-purple-500" /><StatCard title="Ticket Médio" value={`R$ ${monthlyStats.averageTicket.toFixed(2)}`} icon={DollarSign} colorClass="bg-teal-500" /><StatCard title="Média Pets/Dia" value={monthlyAvgPets.toFixed(1)} icon={Activity} colorClass="bg-amber-500" /><StatCard title="A Receber" value={`R$ ${monthlyStats.pendingRevenue.toFixed(2)}`} icon={AlertOctagon} colorClass="bg-red-500" /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16} /> Comparativo Semanal</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={monthlyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={monthlyChartData} />} height={60} axisLine={false} tickLine={false} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `R$${val}`} domain={['auto', 'auto']} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><Bar yAxisId="right" dataKey="pets" fill="#e9d5ff" radius={[4, 4, 0, 0]} barSize={40}><LabelList dataKey="pets" position="top" style={{ fontSize: 9, fill: '#9333ea' }} /></Bar><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#9333ea" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}
            {activeTab === 'yearly' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Ano</h2><select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total Pets" value={yearlyStats.totalPets} icon={PawPrint} colorClass="bg-sky-500" /><StatCard title="Média Pets/Dia" value={yearlyAvgPets.toFixed(1)} icon={Activity} colorClass="bg-amber-500" /><StatCard title="Faturamento Total" value={`R$ ${yearlyStats.grossRevenue.toFixed(2)}`} icon={Wallet} colorClass="bg-green-500" /><StatCard title="Pendência Total" value={`R$ ${yearlyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-96 mb-6"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><TrendingUp size={16} /> Evolução Mensal</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={yearlyChartData} margin={{ top: 20, right: 0, bottom: 40, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" interval={0} tick={<CustomXAxisTick data={yearlyChartData} />} height={60} axisLine={false} tickLine={false} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `R$${val / 1000}k`} domain={['auto', 'auto']} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><Bar yAxisId="right" dataKey="pets" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={30}><LabelList dataKey="pets" position="top" style={{ fontSize: 9, fill: '#059669' }} /></Bar><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /></ComposedChart></ResponsiveContainer></div>
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
    const filteredCosts = filterCosts(); const totalCost = filteredCosts.reduce((acc, c) => acc + c.amount, 0); const paidCost = filteredCosts.filter(c => c.status && c.status.toLowerCase() === 'pago').reduce((acc, c) => acc + c.amount, 0); const pendingCost = filteredCosts.filter(c => !c.status || c.status.toLowerCase() === 'pago').reduce((acc, c) => acc + c.amount, 0);
    const getCostByCategory = () => { const counts: Record<string, number> = {}; filteredCosts.forEach(c => { const cat = c.category || 'Outros'; counts[cat] = (counts[cat] || 0) + c.amount; }); const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); const top5 = sorted.slice(0, 5); const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0); if (others > 0) top5.push({ name: 'Outros', value: others }); return top5; };
    const getCostByMonth = () => { const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; const data = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 })); const yearCosts = costs.filter(c => new Date(c.date).getFullYear() === selectedYear); yearCosts.forEach(c => { const d = new Date(c.date); if (!isNaN(d.getTime())) data[d.getMonth()].value += c.amount; }); const startIdx = selectedYear === 2025 ? 7 : 0; return data.slice(startIdx); };
    const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-gray-800">Custo Mensal</h1><div className="flex bg-white rounded-lg p-1 border"><button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'monthly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Mês</button><button onClick={() => setViewMode('yearly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'yearly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Ano</button></div></div>
            <div className="flex items-center mb-6 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800 mr-4">Período:</h2>{viewMode === 'monthly' ? (<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" />) : (<select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><p className="text-xs font-bold text-gray-500 uppercase">Total</p><h3 className="text-2xl font-bold text-rose-600">R$ {totalCost.toFixed(2)}</h3></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><p className="text-xs font-bold text-gray-500 uppercase">Pago</p><h3 className="text-2xl font-bold text-green-600">R$ {paidCost.toFixed(2)}</h3></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between"><p className="text-xs font-bold text-gray-500 uppercase">Pendente</p><h3 className="text-2xl font-bold text-orange-600">R$ {pendingCost.toFixed(2)}</h3></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"><h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><BarChart2 size={16} /> Evolução</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={getCostByMonth()} margin={{ top: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(val) => `R$${val}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} /><Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} /><Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#e11d48' }} formatter={(val: number) => val > 0 ? `R$${val.toFixed(0)}` : ''} /></Bar></BarChart></ResponsiveContainer></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"><h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Tag size={16} /> Categorias</h3><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getCostByCategory()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">{getCostByCategory().map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} /><Legend layout="vertical" verticalAlign="middle" align="right" /></PieChart></ResponsiveContainer></div></div>
        </div>
    );
};

const PaymentManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onUpdateAppointment: (app: Appointment) => void; accessToken: string | null; sheetId: string; }> = ({ appointments, clients, services, onUpdateAppointment, accessToken, sheetId }) => {
    const getLocalISODate = (d: Date = new Date()) => { const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
    const [selectedDate, setSelectedDate] = useState(getLocalISODate()); const [editingId, setEditingId] = useState<string | null>(null); const [amount, setAmount] = useState(''); const [method, setMethod] = useState(''); const [isSaving, setIsSaving] = useState(false); const [activeTab, setActiveTab] = useState<'toReceive' | 'pending' | 'paid'>('toReceive'); const [contextMenu, setContextMenu] = useState<{ x: number, y: number, app: Appointment } | null>(null); const touchStart = useRef<number | null>(null);
    const getAppLocalDateStr = (dateStr: string) => { const d = new Date(dateStr); return getLocalISODate(d); };
    const pendingApps = appointments.filter(a => { const appDate = getAppLocalDateStr(a.date); const isPast = appDate < getLocalISODate(); const isUnpaid = !a.paymentMethod || a.paymentMethod.trim() === ''; return isPast && isUnpaid; }).sort((a, b) => b.date.localeCompare(a.date));
    const dailyApps = appointments.filter(a => getAppLocalDateStr(a.date) === selectedDate); const toReceiveApps = dailyApps.filter(a => !a.paymentMethod || a.paymentMethod.trim() === ''); const paidApps = dailyApps.filter(a => a.paymentMethod && a.paymentMethod.trim() !== '');
    const navigateDate = (days: number) => { const [year, month, day] = selectedDate.split('-').map(Number); const date = new Date(year, month - 1, day); date.setDate(date.getDate() + days); setSelectedDate(getLocalISODate(date)); }; const goToToday = () => setSelectedDate(getLocalISODate());
    const calculateExpected = (app: Appointment) => { const main = services.find(s => s.id === app.serviceId); let total = main?.price || 0; app.additionalServiceIds?.forEach(id => { const s = services.find(srv => srv.id === id); if (s) total += s.price; }); return total; };
    const handleStartEdit = (app: Appointment) => { setEditingId(app.id); const expected = calculateExpected(app); setAmount(app.paidAmount ? app.paidAmount.toString() : expected.toString()); setMethod(app.paymentMethod || 'Credito'); setContextMenu(null); };
    const handleSave = async (app: Appointment) => {
        setIsSaving(true);
        const finalAmount = parseFloat(amount);
        const updatedApp = { ...app, paidAmount: finalAmount, paymentMethod: method as any };
        if (app.id.startsWith('sheet_') && accessToken && sheetId) {
            try {
                const parts = app.id.split('_');
                const index = parseInt(parts[1]);
                const rowNumber = index + 5;
                const range = `Agendamento!Q${rowNumber}:R${rowNumber}`;
                const values = [finalAmount.toString().replace('.', ','), method];
                await googleService.updateSheetValues(accessToken, sheetId, range, values);
            } catch (e) {
                console.error("Failed", e); alert("Erro ao salvar na planilha.");
            }
        } else {
            alert('Aviso: Sincronize antes de pagar.');
        }
        onUpdateAppointment(updatedApp); setEditingId(null); setIsSaving(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) navigateDate(diff > 0 ? 1 : -1);
        touchStart.current = null;
    };

    const renderPaymentRow = (app: Appointment, statusColor: string) => {
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const mainSvc = services.find(s => s.id === app.serviceId);
        const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x => x) as Service[] || [];
        const expected = calculateExpected(app);
        const isPaid = !!app.paidAmount && !!app.paymentMethod;
        const isEditing = editingId === app.id;
        const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase();
        let serviceBorderColor = 'border-l-sky-400';
        if (allServiceNames.includes('tesoura')) serviceBorderColor = 'border-l-pink-500';
        else if (allServiceNames.includes('tosa normal')) serviceBorderColor = 'border-l-orange-500';
        else if (allServiceNames.includes('higi')) serviceBorderColor = 'border-l-yellow-500';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) serviceBorderColor = 'border-l-purple-500';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) serviceBorderColor = 'border-l-indigo-500';

        if (isEditing) {
            return (
                <div key={app.id} className="bg-white/80 backdrop-blur-md border border-brand-200 p-5 rounded-3xl mb-4 shadow-xl shadow-brand-100/50 animate-scale-up relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-brand-50 -z-10" />
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex justify-between items-center"><span className="font-bold text-gray-900 text-lg">{pet?.name}</span><span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Editando Pagamento</span></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Valor R$</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border-none bg-gray-100 p-3 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" autoFocus /></div>
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Método</label><select value={method} onChange={e => setMethod(e.target.value)} className="w-full border-none bg-gray-100 p-3 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 ring-brand-200 outline-none transition-all appearance-none"><option value="Credito">Crédito</option><option value="Debito">Débito</option><option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option></select></div>
                        </div>
                        <div className="flex gap-3 mt-2"><button onClick={() => handleSave(app)} disabled={isSaving} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-200 transition-all active:scale-95">{isSaving ? 'Salvando...' : 'Confirmar'}</button><button onClick={() => setEditingId(null)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 p-3 rounded-xl text-sm font-bold transition-all">Cancelar</button></div>
                    </div>
                </div>
            );
        }

        return (
            <div key={app.id} className={`p-5 rounded-3xl shadow-sm hover:shadow-glass hover:-translate-y-0.5 transition-all duration-300 border border-white/60 bg-white/60 backdrop-blur-md mb-3 relative overflow-hidden group ${statusColor}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${serviceBorderColor.replace('border-l-', 'bg-')} opacity-80 rounded-l-3xl`} />
                <div className="flex justify-between items-start mb-3 pl-3">
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-bold text-gray-900 truncate tracking-tight">{pet?.name}</div>
                            {isPaid && <div className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle size={12} /></div>}
                        </div>
                        <div className="text-xs font-medium text-gray-500 truncate mt-0.5">{client?.name}</div>
                        <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1.5 font-mono bg-white/50 w-fit px-2 py-1 rounded-lg"> <Clock size={12} className="text-brand-400" /> {new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-gray-800 tracking-tight">R$ {expected.toFixed(2)}</div>
                        {isPaid ? (<div className="inline-flex items-center gap-1 mt-1 bg-white/80 text-green-700 border border-green-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shadow-sm"> {app.paymentMethod} </div>) : (<div className="inline-flex items-center gap-1 mt-1 bg-white/80 text-red-500 border border-red-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shadow-sm"> Pendente </div>)}
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4 pl-3 opacity-80 group-hover:opacity-100 transition-opacity">
                    {mainSvc && <span className="text-[10px] bg-white border border-gray-200/60 px-2 py-1 rounded-lg text-gray-600 font-medium shadow-sm">{mainSvc.name}</span>}
                    {addSvcs.map((s, idx) => (<span key={idx} className="text-[10px] bg-white border border-gray-200/60 px-2 py-1 rounded-lg text-gray-600 font-medium shadow-sm">{s.name}</span>))}
                </div>
                <button onClick={() => handleStartEdit(app)} className="w-full bg-white hover:bg-gray-50 text-gray-600 hover:text-brand-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all border border-gray-100 shadow-sm group-hover:shadow-md active:scale-95 ml-1"> <DollarSign size={14} /> {isPaid ? 'Editar Detalhes' : 'Registrar Pagamento'} </button>
            </div>
        );
    };

    return (<div className="space-y-4 h-full flex flex-col pt-2" onClick={() => setContextMenu(null)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}> <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm"> <h2 className="text-2xl font-bold text-gray-900 tracking-tight self-start md:self-center">Pagamentos</h2> <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 flex-shrink-0"> <button onClick={() => navigateDate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-500 transition-all"><ChevronLeft size={18} /></button> <button onClick={goToToday} className="flex-1 px-4 py-2 bg-white text-brand-600 font-bold rounded-xl text-xs shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">Hoje</button> <button onClick={() => navigateDate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-500 transition-all"><ChevronRight size={18} /></button> <div className="text-xs font-bold text-gray-700 px-3 min-w-[110px] text-center uppercase tracking-wide">{formatDateWithWeek(selectedDate)}</div> </div> </div> <div className="flex p-1.5 bg-gray-200/50 rounded-2xl overflow-x-auto gap-1"> <button onClick={() => setActiveTab('toReceive')} className={`flex-1 min-w-[100px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'toReceive' ? 'bg-white shadow-md text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">A Receber</span> <span className="text-lg">{toReceiveApps.length}</span> </button> <button onClick={() => setActiveTab('pending')} className={`flex-1 min-w-[100px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'pending' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pendentes</span> <span className="text-lg">{pendingApps.length}</span> </button> <button onClick={() => setActiveTab('paid')} className={`flex-1 min-w-[100px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'paid' ? 'bg-white shadow-md text-green-600' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pagos</span> <span className="text-lg">{paidApps.length}</span> </button> </div> <div className="flex-1 overflow-y-auto min-h-0 bg-transparent p-1"> {activeTab === 'toReceive' && toReceiveApps.map(app => renderPaymentRow(app, "bg-gradient-to-br from-yellow-50 to-white"))} {activeTab === 'pending' && pendingApps.map(app => renderPaymentRow(app, "bg-gradient-to-br from-red-50 to-white"))} {activeTab === 'paid' && paidApps.map(app => renderPaymentRow(app, "bg-gradient-to-br from-green-50 to-white border-green-100"))} </div> {contextMenu && (<div className="fixed bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl z-[100] py-2 min-w-[180px] animate-scale-up glass-card" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(contextMenu.app)} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-gray-700 text-sm flex items-center gap-3 font-medium transition-colors"><Edit2 size={16} className="text-gray-400" /> Editar Valor</button> </div>)} </div>)

};

const ClientManager: React.FC<{ clients: Client[]; onDeleteClient: (id: string) => void; googleUser: GoogleUser | null; accessToken: string | null; }> = ({ clients, onDeleteClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col pt-2">
            <div className="flex flex-col gap-4 flex-shrink-0 bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white/40 shadow-sm">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes & Pets</h2>
                    <a href={PREDEFINED_FORM_URL} target="_blank" rel="noreferrer" className="bg-brand-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-brand-700 hover:scale-105 active:scale-95 transition shadow-lg shadow-brand-200 text-xs whitespace-nowrap"><Plus size={16} /> Novo Cadastro</a>
                </div>
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    <input placeholder="Buscar por cliente, telefone ou pet..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white/50 hover:bg-white focus:bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 ring-brand-200 outline-none shadow-inner transition-all placeholder:text-gray-400" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0 px-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white/70 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50 hover:shadow-glass hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-brand-50/50 rounded-bl-[40px] -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="min-w-0 pr-2">
                                    <h3 className="font-bold text-gray-900 truncate text-lg tracking-tight">{client.name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-medium bg-white/50 px-2 py-1 rounded-lg w-fit shadow-sm border border-gray-100/50"><Phone size={12} className="text-brand-400" /> {client.phone}</p>
                                </div>
                                <button onClick={() => { if (confirm('Excluir?')) onDeleteClient(client.id); }} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition shadow-sm bg-white border border-gray-100"><Trash2 size={16} /></button>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {client.pets.map(pet => (
                                    <div key={pet.id} className="bg-white p-3 rounded-2xl flex items-center gap-3 text-sm border border-gray-100 shadow-sm hover:shadow transition group/pet">
                                        <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-inner group-hover/pet:scale-110 transition-transform">{pet.name ? pet.name[0] : '?'}</div>
                                        <div className="min-w-0 truncate">
                                            <span className="font-bold text-gray-800 block leading-tight">{pet.name}</span>
                                            <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">{pet.breed}</span>
                                        </div>
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
    const [isModalOpen, setIsModalOpen] = useState(false); const [editingService, setEditingService] = useState<Service | null>(null); const [formData, setFormData] = useState({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); const [contextMenu, setContextMenu] = useState<{ x: number, y: number, service: Service } | null>(null);
    const resetForm = () => { setFormData({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); setEditingService(null); setIsModalOpen(false); };
    const handleEditStart = (s: Service) => { setEditingService(s); setFormData({ name: s.name, price: s.price.toString(), category: s.category, size: s.targetSize || 'Todos', coat: s.targetCoat || 'Todos' }); setIsModalOpen(true); setContextMenu(null); };
    const handleSave = async () => { if (!accessToken || !sheetId) return alert('Necessário estar logado para salvar.'); const priceNum = parseFloat(formData.price.replace(',', '.')); const rowData = [formData.name, formData.category, formData.size, formData.coat, priceNum.toString().replace('.', ',')]; try { if (editingService) { const parts = editingService.id.split('_'); if (parts.length >= 3) { const index = parseInt(parts[2]); const row = index + 2; const range = `Serviço!A${row}:E${row}`; await googleService.updateSheetValues(accessToken, sheetId, range, rowData); } } else { await googleService.appendSheetValues(accessToken, sheetId, 'Serviço!A:E', rowData); } onSyncServices(true); resetForm(); } catch (e) { console.error(e); alert('Erro ao salvar na planilha.'); } };
    const handleDelete = async (service: Service) => { if (!confirm(`Excluir ${service.name}?`)) return; setContextMenu(null); if (service.id.startsWith('sheet_svc_') && accessToken && sheetId) { const parts = service.id.split('_'); if (parts.length >= 3) { const index = parseInt(parts[2]); const row = index + 2; try { await googleService.clearSheetValues(accessToken, sheetId, `Serviço!A${row}:E${row}`); onSyncServices(true); return; } catch (e) { console.error(e); alert('Erro ao excluir da planilha.'); } } } onDeleteService(service.id); };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col relative pt-2" onClick={() => setContextMenu(null)}>
            <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white/40 shadow-sm flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Serviços</h2>
                <div className="flex gap-3">
                    <button onClick={() => onSyncServices(false)} className="bg-white text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs hover:bg-gray-50 shadow-sm transition"><Sparkles size={14} className="text-brand-500" /> Sincronizar</button>
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs hover:bg-brand-700 shadow-lg shadow-brand-200 hover:scale-105 active:scale-95 transition"><Plus size={16} /> Adicionar</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0 px-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {services.map(service => (
                        <div key={service.id} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, service }); }} className="bg-white/80 backdrop-blur p-5 rounded-3xl shadow-sm border border-white/50 flex flex-col justify-between cursor-pointer hover:shadow-glass hover:scale-[1.02] transition-all duration-300 select-none group relative">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-brand-500"><Edit2 size={12} /></div>
                            </div>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-base truncate pr-6 tracking-tight">{service.name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`text-[9px] px-2 py-1 rounded-lg uppercase font-bold tracking-wide ${service.category === 'principal' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{service.category === 'principal' ? 'PRINC' : 'ADIC'}</span>
                                    <span className="text-[9px] bg-gray-100 px-2 py-1 rounded-lg text-gray-500 font-medium border border-gray-100">{service.targetSize}</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-100/50 pt-3 flex justify-between items-end">
                                <span className="text-xl font-black text-gray-900 tracking-tight">R$ {service.price.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {contextMenu && (
                <div className="fixed bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl z-[100] py-2 min-w-[170px] animate-scale-up glass-card" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => handleEditStart(contextMenu.service)} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-gray-700 text-sm flex items-center gap-3 font-medium transition-colors"><Edit2 size={16} className="text-gray-400" /> Editar</button>
                    <button onClick={() => handleDelete(contextMenu.service)} className="w-full text-left px-5 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium transition-colors"><Trash2 size={16} /> Excluir</button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl space-y-6 animate-scale-up relative overflow-hidden ring-1 ring-white/50">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-400 to-purple-500" />
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Gerenciar Serviço</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Nome do Serviço</label><input placeholder="Ex: Banho Premium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 border-none p-4 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all placeholder:font-normal" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Preço (R$)</label><input placeholder="0,00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-gray-50 border-none p-4 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" /></div>
                                <div><label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Categoria</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-gray-50 border-none p-4 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 ring-brand-200 outline-none transition-all appearance-none"><option value="principal">Principal</option><option value="adicional">Adicional</option></select></div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100">
                            <button onClick={resetForm} className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-200 hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ScheduleManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onAdd: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onEdit: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onUpdateStatus: (id: string, status: Appointment['status']) => void; onDelete: (id: string) => void; googleUser: GoogleUser | null; }> = ({ appointments, clients, services, onAdd, onEdit, onUpdateStatus, onDelete }) => {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day'); const [currentDate, setCurrentDate] = useState(new Date()); const [isModalOpen, setIsModalOpen] = useState(false); const [detailsApp, setDetailsApp] = useState<Appointment | null>(null); const [contextMenu, setContextMenu] = useState<{ x: number, y: number, appId: string } | null>(null); const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState(''); const [selectedClient, setSelectedClient] = useState(''); const [selectedPet, setSelectedPet] = useState(''); const [selectedService, setSelectedService] = useState(''); const [selectedAddServices, setSelectedAddServices] = useState<string[]>([]); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [time, setTime] = useState('09:00'); const [notes, setNotes] = useState(''); const [manualDuration, setManualDuration] = useState('0');
    const touchStart = useRef<number | null>(null);

    const resetForm = () => { setClientSearch(''); setSelectedClient(''); setSelectedPet(''); setSelectedService(''); setSelectedAddServices([]); setTime('09:00'); setNotes(''); setManualDuration('0'); setEditingAppId(null); setIsModalOpen(false); };
    const handleStartEdit = (app: Appointment) => { setEditingAppId(app.id); setSelectedClient(app.clientId); setSelectedPet(app.petId); setSelectedService(app.serviceId); setSelectedAddServices(app.additionalServiceIds || []); const d = new Date(app.date); setDate(d.toISOString().split('T')[0]); setTime(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })); setNotes(app.notes || ''); setManualDuration(app.durationTotal ? app.durationTotal.toString() : '0'); setDetailsApp(null); setIsModalOpen(true); };
    const handleSave = () => { if (!selectedClient || !selectedPet || !selectedService || !date || !time) return; const client = clients.find(c => c.id === selectedClient); const pet = client?.pets.find(p => p.id === selectedPet); const mainSvc = services.find(s => s.id === selectedService); const addSvcs = selectedAddServices.map(id => services.find(s => s.id === id)).filter(s => s) as Service[]; if (client && pet && mainSvc) { const newApp: Appointment = { id: editingAppId || `local_${Date.now()}`, clientId: client.id, petId: pet.id, serviceId: mainSvc.id, additionalServiceIds: selectedAddServices, date: `${date}T${time}:00`, status: 'agendado', notes: notes, googleEventId: editingAppId ? appointments.find(a => a.id === editingAppId)?.googleEventId : undefined }; if (editingAppId) { const original = appointments.find(a => a.id === editingAppId); newApp.paidAmount = original?.paidAmount; newApp.paymentMethod = original?.paymentMethod; onEdit(newApp, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration)); } else { onAdd(newApp, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration)); } resetForm(); } };
    const handleDeleteFromContext = () => { if (contextMenu && confirm('Excluir?')) onDelete(contextMenu.appId); setContextMenu(null); }
    const filteredClients = clientSearch.length > 0 ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch) || c.pets.some(p => p.name.toLowerCase().includes(clientSearch.toLowerCase()))).slice(0, 5) : []; const selectedClientData = clients.find(c => c.id === selectedClient); const pets = selectedClientData?.pets || []; const selectedPetData = pets.find(p => p.id === selectedPet);
    const getApplicableServices = (category: 'principal' | 'adicional') => { if (!selectedPetData) return []; return services.filter(s => { const matchesCategory = s.category === category; const matchesSize = s.targetSize === 'Todos' || !s.targetSize || (selectedPetData.size && s.targetSize.toLowerCase().includes(selectedPetData.size.toLowerCase())); const matchesCoat = s.targetCoat === 'Todos' || !s.targetCoat || (selectedPetData.coat && s.targetCoat.toLowerCase().includes(selectedPetData.coat.toLowerCase())); return matchesCategory && matchesSize && matchesCoat; }); };
    const navigate = (direction: 'prev' | 'next') => { const newDate = new Date(currentDate); if (viewMode === 'day') newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7)); if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); setCurrentDate(newDate); };
    const timeOptions = []; for (let h = 9; h <= 18; h++) { ['00', '10', '20', '30', '40', '50'].forEach(m => { if (h === 18 && m !== '00') return; timeOptions.push(`${String(h).padStart(2, '0')}:${m}`); }); }

    const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (viewMode === 'day' && Math.abs(diff) > 50) navigate(diff > 0 ? 'next' : 'prev');
        touchStart.current = null;
    };

    // --- SIDE-BY-SIDE LAYOUT ALGORITHM ---
    const getLayout = (dayApps: Appointment[]) => {
        const sorted = [...dayApps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const nodes = sorted.map(app => { const start = new Date(app.date).getTime(); const end = start + (app.durationTotal || 60) * 60000; return { app, start, end }; });
        const clusters: typeof nodes[] = [];
        if (nodes.length > 0) {
            let currentCluster = [nodes[0]];
            let clusterEnd = nodes[0].end;
            for (let i = 1; i < nodes.length; i++) {
                if (nodes[i].start < clusterEnd) { currentCluster.push(nodes[i]); clusterEnd = Math.max(clusterEnd, nodes[i].end); } else { clusters.push(currentCluster); currentCluster = [nodes[i]]; clusterEnd = nodes[i].end; }
            }
            clusters.push(currentCluster);
        }
        const layoutResult: { app: Appointment, left: string, width: string }[] = [];
        clusters.forEach(cluster => {
            const columns: typeof nodes[] = [];
            cluster.forEach(node => {
                let placed = false;
                for (let i = 0; i < columns.length; i++) { const lastInCol = columns[i][columns[i].length - 1]; if (node.start >= lastInCol.end) { columns[i].push(node); placed = true; break; } }
                if (!placed) columns.push([node]);
            });
            const count = columns.length; const widthPct = 100 / count;
            columns.forEach((col, colIdx) => { col.forEach(node => { layoutResult.push({ app: node.app, left: `${colIdx * widthPct}%`, width: `${widthPct}%` }); }); });
        });
        return layoutResult;
    };

    const AppointmentCard = ({ app, style, onClick, onContext }: any) => {
        const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(srv => srv.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x => x) as Service[] || []; const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase(); let colorClass = 'bg-sky-100 border-sky-200 text-sky-900'; if (allServiceNames.includes('tesoura')) colorClass = 'bg-pink-100 border-pink-200 text-pink-900'; else if (allServiceNames.includes('tosa normal')) colorClass = 'bg-orange-100 border-orange-200 text-orange-900'; else if (allServiceNames.includes('higi')) colorClass = 'bg-yellow-100 border-yellow-200 text-yellow-900'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) colorClass = 'bg-purple-100 border-purple-200 text-purple-900'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) colorClass = 'bg-indigo-100 border-indigo-200 text-indigo-900';
        return (
            <div style={style} className={`absolute rounded-xl p-2 border shadow-sm ${colorClass} text-xs cursor-pointer hover:shadow-md hover:scale-[1.02] hover:brightness-105 transition-all overflow-hidden flex flex-col leading-tight group hover:z-[100]`} onClick={(e) => { e.stopPropagation(); onClick(app); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext(e, app.id); }}>
                <div className="font-bold truncate text-[11px] mb-0.5">{client?.name.split(' ')[0]} <span className="opacity-70 font-normal">- {pet?.name}</span></div>
                <div className="flex flex-wrap gap-1 opacity-90 mt-auto"> {mainSvc && <span className="bg-white/40 px-1 rounded-[4px] text-[9px]">{mainSvc.name.substring(0, 12)}</span>} </div>
                <div className="absolute right-1 bottom-1 bg-white/80 backdrop-blur-sm px-1.5 rounded-md text-[9px] font-bold shadow-sm">{app.durationTotal || 60}m</div>
            </div>
        );
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado'); const layoutItems = getLayout(dayApps);
        return (
            <div className="relative h-[1200px] bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex mx-1" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="w-14 bg-gray-50/50 backdrop-blur-sm border-r border-gray-100 flex-shrink-0 sticky left-0 z-10 flex flex-col"> {Array.from({ length: 10 }, (_, i) => i + 9).map(h => (<div key={h} className="flex-1 border-b border-gray-100 text-[10px] text-gray-400 font-bold p-2 text-right relative"> <span className="-top-2.5 relative">{h}:00</span> </div>))} </div>
                <div className="flex-1 relative bg-[repeating-linear-gradient(0deg,transparent,transparent_119px,rgba(243,244,246,0.6)_120px)]"> {Array.from({ length: 60 }, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{ top: i * 20 }} />)} {layoutItems.map((item, idx) => { const app = item.app; const d = new Date(app.date); const startMin = (d.getHours() - 9) * 60 + d.getMinutes(); const duration = app.durationTotal || 60; return (<AppointmentCard key={app.id} app={app} style={{ top: `${startMin * 2}px`, height: `${duration * 2}px`, left: item.left, width: item.width, zIndex: 10 }} onClick={setDetailsApp} onContext={(e: any, id: string) => setContextMenu({ x: e.clientX, y: e.clientY, appId: id })} />); })}
                    {/* Current Time Indicator (Visual Mockup) */}
                    <div className="absolute w-full border-t-2 border-red-400 border-dashed opacity-50 pointer-events-none" style={{ top: '400px' }}><span className="bg-red-400 text-white text-[9px] px-1 rounded-r absolute -top-2 left-0">Now</span></div>
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = new Date(currentDate); start.setDate(start.getDate() - start.getDay()); const days = [2, 3, 4, 5, 6];
        return (
            <div className="flex h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex-col mx-1">
                <div className="flex border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm"> <div className="w-10 bg-transparent border-r border-gray-100"></div> {days.map(dIdx => { const d = new Date(start); d.setDate(d.getDate() + dIdx); const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]; return (<div key={dIdx} className={`flex-1 text-center py-3 text-xs font-bold border-r border-gray-100 ${isToday ? 'bg-brand-50/50 text-brand-600' : 'text-gray-500'}`}> {d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()} <div className={`text-sm mt-0.5 ${isToday ? 'text-brand-700' : 'text-gray-800'}`}>{d.getDate()}</div> </div>) })} </div>
                <div className="flex-1 overflow-y-auto relative flex"> <div className="w-10 bg-gray-50/30 border-r border-gray-100 flex-shrink-0 sticky left-0 z-10"> {Array.from({ length: 10 }, (_, i) => i + 9).map(h => (<div key={h} className="h-[120px] border-b border-gray-100 text-[9px] text-gray-400 font-bold p-1 text-right relative bg-gray-50/30"> <span className="-top-2 relative">{h}</span> </div>))} </div> {days.map(dIdx => { const d = new Date(start); d.setDate(d.getDate() + dIdx); const dateStr = d.toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado'); const layoutItems = getLayout(dayApps); return (<div key={dIdx} className="flex-1 border-r border-gray-50 relative min-w-[60px]"> {Array.from({ length: 60 }, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{ top: i * 20 }} />)} {layoutItems.map((item, idx) => { const app = item.app; const ad = new Date(app.date); const startMin = (ad.getHours() - 9) * 60 + ad.getMinutes(); const duration = app.durationTotal || 60; return (<AppointmentCard key={app.id} app={app} style={{ top: `${startMin * 2}px`, height: `${duration * 2}px`, left: item.left, width: item.width, zIndex: 10 }} onClick={setDetailsApp} onContext={(e: any, id: string) => setContextMenu({ x: e.clientX, y: e.clientY, appId: id })} />) })} </div>) })} </div>
            </div>
        )
    }

    const renderMonthView = () => {
        const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const firstDay = new Date(year, month, 1); const startDay = firstDay.getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const slots = []; for (let i = 0; i < startDay; i++) slots.push(null); for (let i = 1; i <= daysInMonth; i++) slots.push(new Date(year, month, i));
        return (<div className="h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-1"> <div className="grid grid-cols-7 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200"> {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>)} </div> <div className="flex-1 grid grid-cols-7 auto-rows-fr"> {slots.map((date, idx) => { if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/30 border-b border-r border-gray-100" />; const dateStr = date.toISOString().split('T')[0]; const isToday = dateStr === new Date().toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado').sort((a, b) => a.date.localeCompare(b.date)); return (<div key={idx} className={`border-b border-r border-gray-100 p-1 flex flex-col transition-colors cursor-pointer hover:bg-brand-50/30 ${isToday ? 'bg-orange-50/30' : ''}`} onClick={() => { setDate(dateStr); setViewMode('day'); }}> <span className={`text-[10px] font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-brand-600 text-white shadow-md scale-110' : 'text-gray-500'}`}>{date.getDate()}</span> <div className="flex-1 overflow-hidden space-y-1"> {dayApps.slice(0, 3).map(app => (<div key={app.id} className="text-[9px] bg-white border border-gray-200 text-gray-700 rounded-md px-1.5 py-0.5 truncate font-medium shadow-sm"> {clients.find(c => c.id === app.clientId)?.pets.find(p => p.id === app.petId)?.name} </div>))} {dayApps.length > 3 && <div className="text-[8px] text-gray-400 pl-1 font-medium">+ {dayApps.length - 3} mais</div>} </div> </div>) })} </div> </div>)
    };

    return (<div className="space-y-3 animate-fade-in relative h-full flex flex-col"> <div className="flex flex-col md:flex-row justify-between items-center gap-2 flex-shrink-0 bg-white p-2 rounded-xl shadow-sm border border-gray-200"> <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar"> <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0"> <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Dia</button> <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Semana</button> <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Mês</button> </div> <div className="flex items-center gap-1 flex-shrink-0 ml-2"> <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronLeft size={18} /></button> <span className="text-sm font-bold text-gray-800 min-w-[90px] text-center truncate">{formatDateWithWeek(currentDate.toISOString().split('T')[0])}</span> <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronRight size={18} /></button> </div> </div> <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-brand-200 hover:bg-brand-700 active:scale-95 transition flex items-center justify-center gap-1.5 text-xs"><Plus size={18} /> Novo Agendamento</button> </div> <div className="flex-1 min-h-0 relative overflow-hidden"> {viewMode === 'day' && <div className="h-full overflow-y-auto">{renderDayView()}</div>} {viewMode === 'week' && renderWeekView()} {viewMode === 'month' && renderMonthView()} {contextMenu && (<div className="fixed bg-white shadow-xl border border-gray-200 rounded-xl z-[100] py-1 min-w-[160px] overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(appointments.find(a => a.id === contextMenu.appId)!)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 font-medium border-b border-gray-50"><Edit2 size={16} /> Editar</button> <button onClick={handleDeleteFromContext} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium"><Trash2 size={16} /> Excluir</button> </div>)} </div> {detailsApp && (() => { const client = clients.find(c => c.id === detailsApp.clientId); const pet = client?.pets.find(p => p.id === detailsApp.petId); const s = services.find(srv => srv.id === detailsApp.serviceId); const addSvcs = detailsApp.additionalServiceIds?.map(id => services.find(srv => srv.id === id)).filter(x => x); return (<div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailsApp(null)}> <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}> <button onClick={() => setDetailsApp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={20} /></button> <div className="mb-6 text-center"> <h3 className="text-2xl font-bold text-gray-800">{pet?.name}</h3> <p className="text-gray-500 font-medium">{client?.name}</p> </div> <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm mb-6"> <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Phone size={16} /></div><span className="font-medium text-gray-700">{client?.phone}</span></div> <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><MapPin size={16} /></div><span className="font-medium text-gray-700 truncate">{client?.address} {client?.complement}</span></div> <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><FileText size={16} /></div><span className="font-medium italic text-gray-600 pt-1">{detailsApp.notes || pet?.notes || 'Sem obs'}</span></div> </div> <div className="mb-6"> <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Serviços</h4> <div className="flex flex-wrap gap-2"> <span className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-xs font-bold shadow-sm">{s?.name}</span> {addSvcs?.map(as => <span key={as?.id} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">{as?.name}</span>)} </div> </div> <button onClick={() => handleStartEdit(detailsApp)} className="w-full py-3.5 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-95 transition shadow-lg shadow-brand-200"><Edit2 size={18} /> Editar Agendamento</button> </div> </div>) })()} {isModalOpen && (<div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"> <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:min-h-[600px] animate-scale-up"> <div className="p-4 border-b flex justify-between items-center bg-gray-50"> <h3 className="font-bold text-lg text-gray-800">{editingAppId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3> <button onClick={resetForm}><X size={24} className="text-gray-400 hover:text-gray-600" /></button> </div> <div className="p-4 overflow-y-auto custom-scrollbar space-y-4"> <div> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente / Pet</label> <div className="relative"> <Search className="absolute left-3 top-2.5 text-gray-400" size={16} /> <input value={selectedClientData ? selectedClientData.name : clientSearch} onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(''); setSelectedPet(''); }} placeholder="Buscar..." className="w-full pl-9 pr-8 py-3 border rounded-xl outline-none focus:ring-2 ring-brand-200 text-base" /> {selectedClientData && <button onClick={() => { setClientSearch(''); setSelectedClient(''); }} className="absolute right-2 top-3 text-gray-400"><X size={16} /></button>} </div> {clientSearch.length > 0 && !selectedClient && filteredClients.length > 0 && (<div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50"> {filteredClients.map(c => (<button key={c.id} onClick={() => { setSelectedClient(c.id); setClientSearch(''); }} className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-center"> <div className="text-base font-bold text-gray-800">{c.name} <span className="text-xs font-normal text-gray-500">({c.pets.map(p => p.name).join(', ')})</span></div> </button>))} </div>)} </div> {selectedClient && (<div className="grid grid-cols-2 gap-2"> {pets.map(p => (<button key={p.id} onClick={() => { setSelectedPet(p.id); setSelectedService(''); }} className={`p-3 rounded-xl border text-left text-sm transition-all ${selectedPet === p.id ? 'bg-brand-50 border-brand-500 shadow-sm ring-1 ring-brand-200' : 'hover:bg-gray-50'}`}> <div className="font-bold">{p.name}</div><div className="text-gray-500 text-xs">{p.size}</div> </button>))} </div>)} {selectedPet && (<div className="space-y-4"> <div className="space-y-1"> <label className="text-xs font-bold text-gray-400 uppercase">Serviço Principal</label> <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500"><option value="">Selecione...</option>{getApplicableServices('principal').map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)}</select> </div> <div className="space-y-1"> <label className="text-xs font-bold text-gray-400 uppercase">Serviço Adicional</label> <select className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500" onChange={(e) => { const val = e.target.value; if (val && !selectedAddServices.includes(val)) setSelectedAddServices(prev => [...prev, val]); e.target.value = ''; }} > <option value="">Adicionar serviço...</option> {getApplicableServices('adicional').filter((service, index, self) => index === self.findIndex((t) => t.name === service.name)).map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)} </select> </div> <div className="flex flex-wrap gap-2 min-h-[30px]">{selectedAddServices.map(id => <span key={id} onClick={() => setSelectedAddServices(p => p.filter(x => x !== id))} className="bg-purple-50 border border-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-purple-100 flex items-center gap-1">{services.find(s => s.id === id)?.name} <X size={12} /></span>)}</div> <div className="grid grid-cols-2 gap-3"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-3 rounded-xl text-base outline-none" /><select value={time} onChange={e => setTime(e.target.value)} className="border p-3 rounded-xl text-base outline-none">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div> <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Duração Estimada</label><select value={manualDuration} onChange={e => setManualDuration(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500"><option value="0">Automático (pelo serviço)</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="90">1 hora e 30 min</option><option value="120">2 horas</option><option value="150">2 horas e 30 min</option><option value="180">3 horas</option><option value="240">4 horas</option></select></div> <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-3 rounded-xl text-sm outline-none focus:border-gray-400" rows={3} placeholder="Observações..." /> </div>)} </div> <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"> <button onClick={resetForm} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl text-sm transition">Cancelar</button> <button onClick={handleSave} disabled={!selectedClient || !selectedPet || !selectedService} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 text-sm shadow-lg shadow-brand-200 active:scale-95 transition">Salvar</button> </div> </div> </div>)} </div>);
};

// --- MENU VIEW (Mobile Only - 4th Tab) ---
const MenuView: React.FC<{ setView: (v: ViewState) => void }> = ({ setView }) => {
    const MenuCard = ({ icon: Icon, title, onClick, colorClass }: any) => (
        <button onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition">
            <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center text-white`}><Icon size={24} /></div>
            <span className="font-bold text-gray-700 text-sm">{title}</span>
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in p-2">
            <h1 className="text-2xl font-bold text-gray-800">Menu</h1>

            <div className="space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase px-1">Cadastros</h2>
                <div className="grid grid-cols-2 gap-4">
                    <MenuCard icon={Users} title="Clientes & Pets" onClick={() => setView('clients')} colorClass="bg-blue-500" />
                    <MenuCard icon={Scissors} title="Serviços" onClick={() => setView('services')} colorClass="bg-purple-500" />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase px-1">Gerencial</h2>
                <div className="grid grid-cols-2 gap-4">
                    <MenuCard icon={TrendingUp} title="Faturamento" onClick={() => setView('revenue')} colorClass="bg-teal-500" />
                    <MenuCard icon={TrendingDown} title="Custos" onClick={() => setView('costs')} colorClass="bg-rose-500" />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase px-1">Sistema</h2>
                <div className="grid grid-cols-2 gap-4">
                    {/* Settings is handled via global modal, but we could link it here too if desired */}
                </div>
            </div>
        </div>
    );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
    // home is now used as a redirect or default view, but bottom nav handles specific views
    // Actually, let's keep 'home' as the default landing view which shows the Daily Revenue
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
        if (savedSettings) setSettings(JSON.parse(savedSettings));

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

        const interval = setInterval(() => { if ((window as any).google) { setGoogleLoaded(true); clearInterval(interval); initAuthLogic(); } }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { const root = document.documentElement; const themes: Record<string, string> = { rose: '225 29 72', blue: '37 99 235', purple: '147 51 234', green: '22 163 74', orange: '234 88 12' }; const color = themes[settings.theme] || themes.rose; root.style.setProperty('--brand-600', color); }, [settings.theme]);

    const performFullSync = async (token: string) => { if (!SHEET_ID) return; setIsGlobalLoading(true); try { await handleSyncServices(token, true); await handleSyncClients(token, true); await handleSyncAppointments(token, true); await handleSyncCosts(token, true); } catch (e) { console.error("Auto Sync Failed", e); } finally { setIsGlobalLoading(false); } }

    const initAuthLogic = () => { if ((window as any).google) { googleService.init(async (tokenResponse) => { if (tokenResponse && tokenResponse.access_token) { const token = tokenResponse.access_token; const expiresIn = tokenResponse.expires_in || 3599; localStorage.setItem(STORAGE_KEY_TOKEN, token); localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + (expiresIn * 1000)).toString()); setAccessToken(token); const profile = await googleService.getUserProfile(token); if (profile) { const user = { id: profile.id, name: profile.name, email: profile.email, picture: profile.picture }; setGoogleUser(user); localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user)); } performFullSync(token); } }); } };
    const handleLogout = () => { setAccessToken(null); setGoogleUser(null); setIsPinUnlocked(false); localStorage.removeItem(STORAGE_KEY_TOKEN); localStorage.removeItem(STORAGE_KEY_EXPIRY); localStorage.removeItem(STORAGE_KEY_USER); if ((window as any).google) (window as any).google.accounts.id.disableAutoSelect(); }
    const handleSaveConfig = (id: string) => { localStorage.setItem('petgestor_client_id', id); setIsConfigured(true); window.location.reload(); };
    const handleResetConfig = () => { localStorage.removeItem('petgestor_client_id'); setIsConfigured(false); setGoogleUser(null); };

    const handleSyncCosts = async (token: string, silent = false) => {
        // ... [Sync Costs Logic same as before] ...
        if (!token || !SHEET_ID) return;
        try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'Custo Mensal!A:F'); if (!rows || rows.length < 2) return; const loadedCosts: CostItem[] = []; rows.slice(1).forEach((row: string[], idx: number) => { const dateStr = row[2]; const typeStr = row[3]; const costStr = row[4]; const statusStr = row[5] ? row[5].trim() : ''; if (!dateStr || !costStr) return; let isoDate = new Date().toISOString(); try { const [day, month, year] = dateStr.split('/'); if (day && month && year) isoDate = `${year}-${month}-${day}T00:00:00`; } catch (e) { } let amount = 0; const cleanCost = costStr.replace(/[^\d,.-]/g, '').trim(); amount = parseFloat(cleanCost.includes(',') ? cleanCost.replace(/\./g, '').replace(',', '.') : cleanCost); if (isNaN(amount)) amount = 0; loadedCosts.push({ id: `cost_${idx}`, month: row[0], week: row[1], date: isoDate, category: typeStr, amount: amount, status: statusStr.toLowerCase() === 'pago' ? 'Pago' : '' }); }); setCosts(loadedCosts); if (!silent) alert("Custos atualizados."); } catch (e) { console.error(e); }
    };

    const handleSyncClients = async (token: string, silent = false) => {
        // ... [Sync Clients Logic same as before] ...
        if (!token || !SHEET_ID) { if (!silent) alert("Erro: Login ou ID da Planilha faltando."); return; } try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'CADASTRO!A:O'); if (!rows || rows.length < 2) { if (!silent) alert("Planilha vazia ou aba 'CADASTRO' não encontrada."); return; } const clientsMap = new Map<string, Client>(); rows.slice(1).forEach((row: string[], index: number) => { const timestamp = row[1]; const clientName = row[3]; const phone = row[4]; const address = row[5]; const complement = row[11]; const petName = row[6]; const petBreed = row[7]; const petSize = row[8]; const petCoat = row[9]; const petNotes = row[10]; const petAge = row[12]; const petGender = row[13]; if (!clientName || !phone) return; const cleanPhone = phone.replace(/\D/g, ''); if (!clientsMap.has(cleanPhone)) { let createdIso = new Date().toISOString(); try { if (timestamp) { const [datePart, timePart] = timestamp.split(' '); const [day, month, year] = datePart.split('/'); if (year && month && day) createdIso = new Date(`${year}-${month}-${day}T${timePart || '00:00'}`).toISOString(); } } catch (e) { } clientsMap.set(cleanPhone, { id: cleanPhone, name: clientName, phone: phone, address: address || '', complement: complement || '', createdAt: createdIso, pets: [] }); } const client = clientsMap.get(cleanPhone)!; if (petName) { client.pets.push({ id: `${cleanPhone}_p_${index}`, name: petName, breed: petBreed || 'SRD', age: petAge || '', gender: petGender || '', size: petSize || '', coat: petCoat || '', notes: petNotes || '' }); } }); const newClientList = Array.from(clientsMap.values()); setClients(newClientList); db.saveClients(newClientList); if (!silent) alert(`${newClientList.length} clientes sincronizados!`); } catch (error) { console.error(error); if (!silent) alert("Erro ao sincronizar."); }
    };
    const handleDeleteClient = (id: string) => { const updated = clients.filter(c => c.id !== id); setClients(updated); db.saveClients(updated); };
    const handleAddService = (service: Service) => { const updated = [...services, service]; setServices(updated); db.saveServices(updated); };
    const handleDeleteService = (id: string) => { const updated = services.filter(s => s.id !== id); setServices(updated); db.saveServices(updated); }
    const handleSyncServices = async (token: string, silent = false) => {
        // ... [Sync Services Logic same as before] ...
        if (!token || !SHEET_ID) { if (!silent) alert("Erro: Login ou ID da Planilha faltando."); return; } try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'Serviço!A:E'); if (!rows || rows.length < 2) { if (!silent) alert("Aba 'Serviço' vazia ou não encontrada."); return; } const newServices: Service[] = []; rows.slice(1).forEach((row: string[], idx: number) => { const sName = row[0]; const sCat = (row[1] || 'principal').toLowerCase().includes('adicional') ? 'adicional' : 'principal'; const sSize = row[2] && row[2].trim() !== '' ? row[2] : 'Todos'; const sCoat = row[3] && row[3].trim() !== '' ? row[3] : 'Todos'; let rawPrice = row[4] || '0'; rawPrice = rawPrice.replace(/[^\d,.-]/g, '').trim(); if (rawPrice.includes(',')) rawPrice = rawPrice.replace(/\./g, '').replace(',', '.'); const sPrice = parseFloat(rawPrice); if (sName) { newServices.push({ id: `sheet_svc_${idx}_${Date.now()}`, name: sName, category: sCat as any, targetSize: sSize, targetCoat: sCoat, price: isNaN(sPrice) ? 0 : sPrice, description: `Importado`, durationMin: 60 }); } }); if (newServices.length > 0) { setServices(newServices); db.saveServices(newServices); if (!silent) alert(`${newServices.length} serviços importados!`); } } catch (e) { console.error(e); if (!silent) alert("Erro ao sincronizar serviços."); }
    }
    const handleUpdateApp = (updatedApp: Appointment) => { const updated = appointments.map(a => a.id === updatedApp.id ? updatedApp : a); setAppointments(updated); db.saveAppointments(updated); };
    const handleSyncAppointments = async (token: string, silent = false) => {
        // ... [Sync Appointments Logic same as before] ...
        if (!token || !SHEET_ID) return; try { const rows = await googleService.getSheetValues(token, SHEET_ID, 'Agendamento!A:T'); if (!rows || rows.length < 5) { if (!silent) alert('Aba Agendamento vazia (Linhas 1-4 ignoradas).'); return; } const loadedApps: Appointment[] = []; const newTempClients: Client[] = []; const currentClients = db.getClients(); const existingClientIds = new Set(currentClients.map(c => c.id)); rows.forEach((row: string[], idx: number) => { if (idx < 4) return; const petName = row[0]; const clientName = row[1]; const clientPhone = row[2] || ''; const clientAddr = row[3] || ''; const petBreed = row[4]; const datePart = row[11]; const timePart = row[12]; const serviceName = row[7]; const paidAmountStr = row[16]; const paymentMethod = row[17]; const googleEventId = row[19]; if (!clientName || !datePart) return; let isoDate = new Date().toISOString(); try { const [day, month, year] = datePart.split('/'); if (day && month && year) isoDate = `${year}-${month}-${day}T${timePart || '00:00'}`; } catch (e) { } const cleanPhone = clientPhone.replace(/\D/g, '') || `temp_${idx}`; let client = currentClients.find(c => c.id === cleanPhone) || currentClients.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || newTempClients.find(c => c.id === cleanPhone); if (!client) { client = { id: cleanPhone, name: clientName, phone: clientPhone, address: clientAddr, pets: [] }; newTempClients.push(client); } let pet = client.pets.find(p => p.name.toLowerCase() === petName?.toLowerCase()); if (!pet && petName) { pet = { id: `${client.id}_p_${idx}`, name: petName, breed: petBreed || 'SRD', age: '', gender: '', size: row[5] || '', coat: row[6] || '', notes: row[13] || '' }; client.pets.push(pet); } const currentServices = db.getServices(); const service = currentServices.find(s => s.name.toLowerCase() === serviceName?.toLowerCase()) || currentServices[0]; const addServiceIds: string[] = [];[row[8], row[9], row[10]].forEach(name => { if (name) { const foundSvc = currentServices.find(s => s.name.toLowerCase() === name.toLowerCase().trim()); if (foundSvc) addServiceIds.push(foundSvc.id); } }); let paidAmount = 0; if (paidAmountStr) { paidAmount = parseFloat(paidAmountStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')); if (isNaN(paidAmount)) paidAmount = 0; } if (client && pet) { loadedApps.push({ id: `sheet_${idx}`, clientId: client.id, petId: pet.id, serviceId: service?.id || 'unknown', additionalServiceIds: addServiceIds, date: isoDate, status: 'agendado', notes: row[13], durationTotal: parseInt(row[14] || '60'), paidAmount: paidAmount > 0 ? paidAmount : undefined, paymentMethod: paymentMethod as any, googleEventId: googleEventId }); } }); if (newTempClients.length > 0) { const updatedClients = [...currentClients, ...newTempClients.filter(nc => !existingClientIds.has(nc.id))]; setClients(updatedClients); db.saveClients(updatedClients); } if (loadedApps.length > 0) { setAppointments(loadedApps); db.saveAppointments(loadedApps); if (!silent) alert(`${loadedApps.length} agendamentos carregados!`); } else { if (!silent) alert('Nenhum agendamento encontrado.'); } } catch (error) { console.error(error); if (!silent) alert('Erro ao sincronizar agendamentos.'); }
    };
    const handleAddAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[], manualDuration: number) => {
        // ... [Add Appointment Logic same as before] ...
        let googleEventId = ''; const totalDuration = manualDuration > 0 ? manualDuration : (appServices[0] ? appServices[0].durationMin : 60) + (appServices.length > 1 ? appServices.slice(1).reduce((acc, s) => acc + (s.durationMin || 0), 0) : 0);
        if (accessToken) { const description = appServices.map(s => s.name).join(' + '); const googleResponse = await googleService.createEvent(accessToken, { summary: `Banho/Tosa: ${pet.name}`, description: `${description}\nCliente: ${client.name}\nTel: ${client.phone}\nObs: ${app.notes}`, startTime: app.date, durationMin: totalDuration }); if (googleResponse) googleEventId = googleResponse.id; }
        const newApp = { ...app, googleEventId, durationTotal: totalDuration };
        const updatedApps = [...appointments, newApp];
        setAppointments(updatedApps);
        db.saveAppointments(updatedApps);
        if (accessToken && SHEET_ID) {
            try {
                const d = new Date(app.date); const dateStr = d.toLocaleDateString('pt-BR'); const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const mainSvc = appServices[0];
                const rowData = [
                    pet.name, client.name, client.phone, client.address, pet.breed, pet.size, pet.coat, mainSvc.name,
                    appServices[1] ? appServices[1].name : '', appServices[2] ? appServices[2].name : '', appServices[3] ? appServices[3].name : '',
                    dateStr, timeStr, app.notes || '', totalDuration.toString(), 'Agendado', '', '', '', googleEventId
                ];
                await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:T', rowData);
                // Silent Sync to update IDs
                handleSyncAppointments(accessToken, true);
            } catch (e) { console.error(e); alert("Salvo no app, mas erro na planilha."); }
        }
    };

    const handleEditAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[], manualDuration: number) => {
        const googleEventId = app.googleEventId; const totalDuration = manualDuration > 0 ? manualDuration : (appServices[0] ? appServices[0].durationMin : 60) + (appServices.length > 1 ? appServices.slice(1).reduce((acc, s) => acc + (s.durationMin || 0), 0) : 0);
        const updatedApp = { ...app, durationTotal: totalDuration };
        if (accessToken && googleEventId) {
            const description = appServices.map(s => s.name).join(' + ');
            await googleService.updateEvent(accessToken, googleEventId, { summary: `Banho/Tosa: ${pet.name}`, description: `${description}\nCliente: ${client.name}\nTel: ${client.phone}\nObs: ${app.notes}`, startTime: app.date, durationMin: totalDuration });
        }
        const updatedList = appointments.map(a => a.id === app.id ? updatedApp : a);
        setAppointments(updatedList); db.saveAppointments(updatedList);
        if (app.id.startsWith('sheet_') && accessToken && SHEET_ID) {
            try {
                const parts = app.id.split('_'); const index = parseInt(parts[1]); const rowNumber = index + 5; // Correct row calculation
                const d = new Date(app.date); const dateStr = d.toLocaleDateString('pt-BR'); const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const mainSvc = appServices[0];
                const rowData = [
                    pet.name, client.name, client.phone, client.address, pet.breed, pet.size, pet.coat, mainSvc.name,
                    appServices[1] ? appServices[1].name : '', appServices[2] ? appServices[2].name : '', appServices[3] ? appServices[3].name : '',
                    dateStr, timeStr, app.notes || '', totalDuration.toString(), 'Agendado', '', app.paidAmount ? app.paidAmount.toString().replace('.', ',') : '', app.paymentMethod || '', googleEventId
                ];
                await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!A${rowNumber}:T${rowNumber}`, rowData);
            } catch (e) { console.error(e); alert("Erro ao atualizar planilha."); }
        }
    };

    const handleDeleteAppointment = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir?")) return;
        const app = appointments.find(a => a.id === id);
        if (app && app.googleEventId && accessToken) { await googleService.deleteEvent(accessToken, app.googleEventId); }
        const updated = appointments.filter(a => a.id !== id);
        setAppointments(updated); db.saveAppointments(updated);
        if (id.startsWith('sheet_') && accessToken && SHEET_ID) {
            try {
                const parts = id.split('_'); const index = parseInt(parts[1]); const rowNumber = index + 5;
                await googleService.clearSheetValues(accessToken, SHEET_ID, `Agendamento!A${rowNumber}:T${rowNumber}`);
            } catch (e) { console.error(e); }
        }
    };

    const handleUpdateStatus = (id: string, status: Appointment['status']) => {
        const updated = appointments.map(a => a.id === id ? { ...a, status } : a);
        setAppointments(updated);
        db.saveAppointments(updated);
    }

    // --- PIN LOGIC Handlers ---
    const handlePinUnlock = (input: string) => { if (input === pin) { setIsPinUnlocked(true); return true; } return false; };
    const handleSetPin = (newPin: string) => { localStorage.setItem('petgestor_pin', newPin); setPin(newPin); setIsPinUnlocked(true); };

    if (!isConfigured) return <SetupScreen onSave={handleSaveConfig} />;

    if (!googleUser) return <LoginScreen onLogin={googleService.login} onReset={handleResetConfig} settings={settings} googleLoaded={googleLoaded} />;

    if (isGlobalLoading) return <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50"><Loader2 size={48} className="text-brand-600 animate-spin mb-4" /><p className="text-brand-700 font-bold animate-pulse">Sincronizando dados...</p></div>;

    // Views that require PIN
    const secureViews: ViewState[] = ['revenue', 'costs'];
    if (secureViews.includes(currentView) && !isPinUnlocked) {
        return <PinGuard isUnlocked={false} onUnlock={handlePinUnlock} onSetPin={handleSetPin} hasPin={!!pin} onReset={handleLogout} setView={setCurrentView} />;
    }

    return (
        <HashRouter>
            <Layout
                currentView={currentView}
                setView={setCurrentView}
                googleUser={googleUser}
                onLogin={googleService.login}
                onLogout={handleLogout}
                settings={settings}
                onOpenSettings={() => setIsSettingsOpen(true)}
            >
                {currentView === 'home' && <RevenueView appointments={appointments} services={services} clients={clients} defaultTab="daily" />}
                {currentView === 'revenue' && <RevenueView appointments={appointments} services={services} clients={clients} defaultTab="monthly" />}
                {currentView === 'costs' && <CostsView costs={costs} />}
                {currentView === 'payments' && <PaymentManager appointments={appointments} clients={clients} services={services} onUpdateAppointment={handleUpdateApp} accessToken={accessToken} sheetId={SHEET_ID} />}
                {currentView === 'clients' && <ClientManager clients={clients} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />}
                {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} onSyncServices={(s) => accessToken && handleSyncServices(accessToken, s)} accessToken={accessToken} sheetId={SHEET_ID} />}
                {currentView === 'schedule' && <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onEdit={handleEditAppointment} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteAppointment} googleUser={googleUser} />}
                {currentView === 'menu' && <MenuView setView={setCurrentView} />}
            </Layout>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s)); }} />
        </HashRouter>
    );
}

export default App;
