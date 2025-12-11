import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { EvaluationModal } from './components/EvaluationModal';
import { Layout } from './components/Layout';
import { InactiveClientsView } from './components/InactiveClientsView';
import { PetDetailsModal } from './components/PetDetailsModal';
import { db } from './services/db';
import { googleService, DEFAULT_CLIENT_ID } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser, CostItem, AppSettings } from './types';
import PackageControlView from './components/PackageControlView';
import {
    Plus, Trash2, Check, X,
    Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
    ExternalLink, Settings, PawPrint, LogIn, ShieldAlert, Lock, Copy,
    ChevronDown, ChevronRight, Search, AlertTriangle, ChevronLeft, Phone, Clock, FileText,
    Edit2, MoreVertical, Wallet, Filter, CreditCard, AlertCircle, CheckCircle, Loader2,
    Scissors, TrendingUp, AlertOctagon, BarChart2, TrendingDown, Calendar, PieChart as PieChartIcon,
    ShoppingBag, Tag, User, Users, Key, Unlock, Home, Activity, Menu, ArrowRightLeft, Star, Moon, UserX
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, CartesianGrid, Legend, ComposedChart, LabelList, PieChart, Pie, AreaChart, Area
} from 'recharts';

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';
const DEFAULT_LOGO_URL = 'https://photos.app.goo.gl/xs394sFQNYBBocea8';

// --- HELPERS ---
const formatDateWithWeek = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    // Custom format to avoid ".,"
    const w = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const dStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${w.charAt(0).toUpperCase() + w.slice(1)}, ${dStr}`;
};

const calculateTotal = (app: Appointment, services: Service[]) => {
    if (app.status === 'cancelado' || app.status === 'nao_veio') return 0;
    const mainSvc = services.find(s => s.id === app.serviceId);
    let total = mainSvc?.price || 0;
    app.additionalServiceIds?.forEach(id => {
        const s = services.find(srv => srv.id === id);
        if (s) total += s.price;
    });
    return total;
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

const LoginScreen: React.FC<{ onLogin: (opts?: any) => void; onReset: () => void; settings?: AppSettings; googleLoaded: boolean }> = ({ onLogin, onReset, settings, googleLoaded }) => {
    const storedUser = localStorage.getItem('petgestor_user_profile');
    const userEmail = storedUser ? JSON.parse(storedUser).email : undefined;

    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="w-full flex justify-center mb-6">
                    <img src={settings?.logoUrl || DEFAULT_LOGO_URL} alt="PomPomPet" className="w-48 h-auto object-contain rounded-lg" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{settings?.appName || 'PomPomPet'}</h1>
                <p className="text-gray-500 mb-8">Faça login para acessar sua agenda e clientes.</p>
                <button
                    onClick={() => onLogin({ hint: userEmail })}
                    disabled={!googleLoaded}
                    className={`w-full bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all group mb-6 ${!googleLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="bg-white p-1 rounded-full"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" /></div>
                    {googleLoaded ? 'Entrar com Google' : 'Carregando Google...'}
                </button>
                <button
                    onClick={() => {
                        localStorage.setItem('petgestor_access_token', 'demo_token');
                        localStorage.setItem('petgestor_token_expiry', (Date.now() + 3600000).toString());
                        localStorage.setItem('petgestor_user_profile', JSON.stringify({ name: 'Demo User', email: 'demo@example.com', picture: '', id: 'demo_id' }));

                        // Inject Mock Data
                        const mockService: Service = { id: 'srv_demo_1', name: 'Banho Teste', price: 50, durationMin: 60, description: 'Serviço de teste', category: 'principal' };
                        const mockClient: Client = { id: 'cli_demo_1', name: 'Cliente Demo', phone: '(11) 99999-9999', address: 'Rua Teste', pets: [{ id: 'pet_demo_1', name: 'Rex', breed: 'Vira-lata', age: '2', gender: 'Macho', size: 'Médio', coat: 'Curto', notes: 'Dócil' }] };
                        const mockAppointment: Appointment = {
                            id: 'app_demo_1', clientId: 'cli_demo_1', petId: 'pet_demo_1', serviceId: 'srv_demo_1', date: new Date().toISOString(), status: 'agendado', paymentMethod: '', paidAmount: 0, rating: 0, ratingTags: []
                        };

                        localStorage.setItem('petgestor_services', JSON.stringify([mockService]));
                        localStorage.setItem('petgestor_clients', JSON.stringify([mockClient]));
                        localStorage.setItem('petgestor_appointments', JSON.stringify([mockAppointment]));

                        window.location.reload();
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition mb-4 text-sm"
                >
                    Entrar Modo Demo (Sem Login)
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
    if (!isOpen) return null;
    const themes = [
        { name: 'Rose (Padrão)', value: 'rose', color: '#e11d48' },
        { name: 'Azul Moderno', value: 'blue', color: '#2563eb' },
        { name: 'Roxo Criativo', value: 'purple', color: '#9333ea' },
        { name: 'Verde Natureza', value: 'green', color: '#16a34a' },
        { name: 'Laranja Vibrante', value: 'orange', color: '#ea580c' },
    ];
    return (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/40 ring-1 ring-white/50 animate-scale-up">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-xl text-gray-900 tracking-tight flex items-center gap-2"><Sparkles size={18} className="text-yellow-500" /> Aparência</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors btn-spring"><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div className="grid grid-cols-1 gap-3">
                        {themes.map(t => (
                            <button key={t.value} onClick={() => setLocalSettings({ ...localSettings, theme: t.value })} className={`p-4 rounded-2xl border flex items-center justify-between transition-all btn-spring ${localSettings.theme === t.value ? 'border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: t.color }}></div><span className="font-bold text-gray-800">{t.name}</span></div>
                                {localSettings.theme === t.value && <div className="bg-brand-600 text-white p-1 rounded-full animate-pop"><Check size={16} /></div>}
                            </button>
                        ))}
                        <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center"><Moon size={20} /></div>
                                <div>
                                    <span className="block font-bold text-gray-800">Modo Escuro</span>
                                    <span className="text-xs text-gray-500">Interface com cores escuras</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setLocalSettings({ ...localSettings, darkMode: !localSettings.darkMode })}
                                className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${localSettings.darkMode ? 'bg-brand-600' : 'bg-gray-300'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${localSettings.darkMode ? 'translate-x-5' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100/50 bg-gray-50/50 flex justify-end gap-3 glass">
                    <button onClick={onClose} className="px-5 py-3 text-gray-600 hover:bg-gray-200/50 rounded-xl font-bold text-sm transition-colors btn-spring">Cancelar</button>
                    <button onClick={() => { onSave(localSettings); onClose(); }} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-brand-200 btn-spring">Salvar Alterações</button>
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

const DayDetailsModal: React.FC<{ isOpen: boolean; onClose: () => void; date: string; appointments: Appointment[]; clients: Client[]; services: Service[] }> = ({ isOpen, onClose, date, appointments, clients, services }) => {
    if (!isOpen) return null;
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const sortedApps = [...appointments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose} style={{ overflow: 'hidden' }}>
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="bg-brand-50 p-6 border-b border-brand-100 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-brand-500 transform rotate-12 pointer-events-none">
                        <CalendarIcon size={100} />
                    </div>
                    <div>
                        <h3 className="font-bold text-2xl text-brand-900 tracking-tight">{dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })}</h3>
                        <p className="text-brand-700 font-medium">{dateObj.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button onClick={onClose} className="bg-white/50 hover:bg-white text-brand-700 p-2 rounded-full transition-all btn-spring z-10"><X size={20} /></button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-gray-50/50">
                    {sortedApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <CalendarIcon size={48} className="mb-2 opacity-50" />
                            <p>Nenhum agendamento para este dia.</p>
                        </div>
                    ) : (
                        sortedApps.map((app, idx) => {
                            const client = clients.find(c => c.id === app.clientId);
                            const pet = client?.pets.find(p => p.id === app.petId);
                            const time = app.date.split('T')[1].slice(0, 5);
                            const endTime = new Date(new Date(app.date).getTime() + (app.durationTotal || 60) * 60000).toISOString().split('T')[1].slice(0, 5);
                            const mainSvc = services.find(s => s.id === app.serviceId);

                            return (
                                <div key={app.id} style={{ animationDelay: `${idx * 0.05}s` }} className="animate-slide-up bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-gray-100 pr-4">
                                        <span className="text-lg font-bold text-gray-800">{time}</span>
                                        <span className="text-xs text-gray-400 font-medium text-center">- {endTime}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-800 truncate">
                                                {pet?.name}
                                                <span className="text-gray-500 font-normal text-xs ml-1">
                                                    ({pet?.breed || 'Raça não inf.'} - {client?.name.split(' ')[0]})
                                                </span>
                                            </h4>
                                            <div className={`w-2 h-2 rounded-full ${app.status === 'concluido' ? 'bg-green-500' : app.status === 'cancelado' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                        </div>
                                        <p className="text-sm text-brand-600 font-medium truncate mt-0.5">{mainSvc?.name}</p>
                                        {app.notes && <p className="text-xs text-gray-400 mt-1 truncate bg-gray-50 p-1 rounded">Nota: {app.notes}</p>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white text-center text-xs text-gray-400">
                    {sortedApps.length} agendamento(s)
                </div>
            </div>
        </div>
    );
};

const RevenueView: React.FC<{ appointments: Appointment[]; services: Service[]; clients: Client[]; costs: CostItem[]; defaultTab?: 'daily' | 'weekly' | 'monthly' | 'yearly'; onRemovePayment: (app: Appointment) => void; onNoShow?: (app: Appointment) => void; onViewPet?: (pet: Pet, client: Client) => void }> = ({ appointments, services, clients, costs, defaultTab = 'daily', onRemovePayment, onNoShow, onViewPet }) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(defaultTab);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const touchStart = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (activeTab === 'daily' && Math.abs(diff) > 100) {
            const [y, m, d] = selectedDate.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const isNext = diff > 0;
            date.setDate(date.getDate() + (isNext ? 1 : -1));
            setSlideDirection(isNext ? 'right' : 'left'); // Next day comes from right, Prev day comes from left
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

    const isOperationalCost = (c: CostItem) => {
        const cat = c.category?.toLowerCase() || '';
        return cat !== 'sócio' && cat !== 'socio' && !cat.includes('extraordinário') && !cat.includes('extraordinario');
    };

    const calculateStats = (apps: Appointment[]) => {
        let totalPets = 0; let totalTosas = 0; let paidRevenue = 0; let pendingRevenue = 0;
        apps.forEach(app => {
            if (app.status === 'cancelado' || app.status === 'nao_veio') return;
            // ... (rest of logic same)
            totalPets++;
            const isTargetTosa = (name?: string) => { if (!name) return false; const n = name.toLowerCase(); return n.includes('tosa normal') || n.includes('tosa tesoura'); };
            const mainSvc = services.find(s => s.id === app.serviceId);
            let hasTosa = isTargetTosa(mainSvc?.name);
            if (!hasTosa && app.additionalServiceIds) { app.additionalServiceIds.forEach(id => { const s = services.find(srv => srv.id === id); if (s && isTargetTosa(s.name)) hasTosa = true; }); }
            if (hasTosa) totalTosas++;
            const gross = calculateTotal(app, services);
            // Strict Payment Check: Must have a method recorded
            const isPaid = !!app.paymentMethod && app.paymentMethod.trim() !== '';
            if (isPaid) paidRevenue += gross; else pendingRevenue += gross;
        });
        const grossRevenue = paidRevenue + pendingRevenue;
        const averageTicket = totalPets > 0 ? grossRevenue / totalPets : 0;
        return { totalPets, totalTosas, paidRevenue, pendingRevenue, grossRevenue, averageTicket };
    };

    const getWeeklyChartData = useCallback(() => {
        // ...
        const [y, m, d] = selectedDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date); startOfWeek.setDate(diff);
        const data: any[] = []; const businessDays = [2, 3, 4, 5, 6];
        businessDays.forEach(dayIndex => {
            const current = new Date(startOfWeek); current.setDate(startOfWeek.getDate() + dayIndex);
            const cYear = current.getFullYear(); const cMonth = String(current.getMonth() + 1).padStart(2, '0'); const cDay = String(current.getDate()).padStart(2, '0');
            const targetDateStr = `${cYear}-${cMonth}-${cDay}`;
            const dailyApps = appointments.filter(a => { if (a.status === 'cancelado') return false; const aDate = new Date(a.date); const aYear = aDate.getFullYear(); const aMonth = String(aDate.getMonth() + 1).padStart(2, '0'); const aDay = String(aDate.getDate()).padStart(2, '0'); return `${aYear}-${aMonth}-${aDay}` === targetDateStr; });
            const totalRevenue = dailyApps.reduce((acc, app) => acc + calculateTotal(app, services), 0);
            const formattedDate = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
            let growth = 0; if (data.length > 0) { const prev = data[data.length - 1]; if (prev.faturamento > 0) growth = ((totalRevenue - prev.faturamento) / prev.faturamento) * 100; }
            data.push({ name: formattedDate, fullDate: targetDateStr, faturamento: totalRevenue, rawRevenue: totalRevenue, pets: dailyApps.length, growth });
        });
        return data;
    }, [selectedDate, appointments, services]);

    const getMonthlyChartData = useCallback(() => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;
        const getWeekData = (targetYear: number, targetWeek: number) => {
            const apps = appointments.filter(app => {
                if (app.status === 'cancelado') return false;
                const d = new Date(app.date);
                return getISOWeek(d) === targetWeek && d.getFullYear() === targetYear;
            });
            const rev = apps.reduce((acc, app) => acc + calculateTotal(app, services), 0);
            return { revenue: rev, pets: apps.length };
        };
        const weeksInMonth = new Set<number>();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) weeksInMonth.add(getISOWeek(new Date(year, month, d)));
        const sortedWeeks = Array.from(weeksInMonth).sort((a, b) => a - b);
        const chartData: any[] = [];
        sortedWeeks.forEach((weekNum, index) => {
            const { revenue, pets } = getWeekData(year, weekNum);
            let growth = 0; if (index > 0) { const prevRev = chartData[index - 1].faturamento; if (prevRev > 0) growth = ((revenue - prevRev) / prevRev) * 100; }
            chartData.push({ name: `S${index + 1}`, faturamento: revenue, rawRevenue: revenue, pets: pets, growth });
        });
        return chartData;
    }, [selectedMonth, appointments, services]);

    const getYearlyChartData = useCallback(() => {
        const data: any[] = []; const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const startMonth = selectedYear === 2025 ? 7 : 0;
        for (let i = startMonth; i < 12; i++) {
            const monthApps = appointments.filter(a => { const d = new Date(a.date); return d.getFullYear() === selectedYear && d.getMonth() === i && a.status !== 'cancelado'; });
            const stats = calculateStats(monthApps);
            let revGrowth = 0; if (i > startMonth) { const prevApps = appointments.filter(a => { const d = new Date(a.date); return d.getFullYear() === selectedYear && d.getMonth() === (i - 1) && a.status !== 'cancelado'; }); const prevStats = calculateStats(prevApps); if (prevStats.grossRevenue > 0) revGrowth = ((stats.grossRevenue - prevStats.grossRevenue) / prevStats.grossRevenue) * 100; }
            data.push({ name: monthNames[i], faturamento: stats.grossRevenue, rawRevenue: stats.grossRevenue, pets: stats.totalPets, revGrowth, });
        }
        return data;
    }, [selectedYear, appointments, services]);

    const dailyApps = useMemo(() => appointments.filter(a => a.date.startsWith(selectedDate)), [appointments, selectedDate]);
    const dailyStats = useMemo(() => calculateStats(dailyApps), [dailyApps, services]);
    const weeklyChartData = useMemo(() => getWeeklyChartData(), [getWeeklyChartData]);

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
    // eslint-disable-next-line
    const weeklyStats = useMemo(() => calculateWeeklyStats(), [selectedDate, appointments, services]);

    const monthlyChartData = useMemo(() => getMonthlyChartData(), [getMonthlyChartData]);
    const yearlyChartData = useMemo(() => getYearlyChartData(), [getYearlyChartData]);

    const monthlyApps = appointments.filter(a => a.date.startsWith(selectedMonth));
    const monthlyStats = calculateStats(monthlyApps);
    const yearlyApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear);
    const yearlyStats = calculateStats(yearlyApps);

    // --- NEW STATS LOGIC ---
    const calculatePeriodStats = (rangeApps: Appointment[], daysCount: number, periodCost?: number, businessDaysOverride?: number) => {
        const stats = calculateStats(rangeApps);
        const avgRevPerDay = daysCount > 0 ? stats.grossRevenue / daysCount : 0;
        const avgPetsPerDay = daysCount > 0 ? stats.totalPets / daysCount : 0;

        let dailyCost = 0;
        const validBusinessDays = businessDaysOverride || daysCount; // Use override if provided (e.g. Tue-Sat specific count)
        if (periodCost && validBusinessDays > 0) {
            dailyCost = periodCost / validBusinessDays;
        }

        return { ...stats, avgRevPerDay, avgPetsPerDay, dailyCost };
    };

    const getGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // Count Tuesdays-Saturdays in a range
    const countBusinessDays = (start: Date, end: Date) => {
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
            const day = cur.getDay();
            if (day >= 2 && day <= 6) count++; // 2=Tue, 6=Sat
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    };

    // Helper to get cost for a specific month (YYYY-MM format in sheet usually)
    const getCostForMonth = (date: Date) => {
        // Month name logic or simple matching based on costs data structure
        // Assuming costs have 'month' field like 'Janeiro', 'Fevereiro' etc or simply summing all costs in that month's date range
        // For simplicity, let's filter costs by date if available, or just sum everything if cost date matches period.
        // Better approach given `costs` structure: filter by ISO date range
        const m = date.getMonth();
        const y = date.getFullYear();
        return costs.filter(c => {
            const cDate = new Date(c.date);
            return cDate.getMonth() === m && cDate.getFullYear() === y && isOperationalCost(c);
        }).reduce((acc, c) => acc + c.amount, 0);
    };

    // Calculate Data for Tabs
    const metricData = useMemo(() => {
        // Current Date Reference
        const currDate = new Date(selectedDate);
        if (activeTab === 'weekly') {
            const getWeekRange = (date: Date) => {
                const day = date.getDay();
                const start = new Date(date); start.setDate(date.getDate() - day); start.setHours(0, 0, 0, 0);
                const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
                return { start, end };
            };
            const curr = getWeekRange(currDate);
            const prevStart = new Date(curr.start); prevStart.setDate(prevStart.getDate() - 7);
            const prev = getWeekRange(prevStart);

            const currApps = appointments.filter(a => { const d = new Date(a.date); return d >= curr.start && d <= curr.end; });
            const prevApps = appointments.filter(a => { const d = new Date(a.date); return d >= prev.start && d <= prev.end; });

            // For weekly cost, we can approximate: MonthCost / 4.3 or sum costs if they have precise dates within this week.
            // Let's use precise dates if possible, or fallback to pro-rated.
            const getRangeCost = (s: Date, e: Date) => costs.filter(c => { const d = new Date(c.date); return d >= s && d <= e; }).reduce((acc, c) => acc + c.amount, 0);

            const cDays = countBusinessDays(curr.start, curr.end);
            const pDays = countBusinessDays(prev.start, prev.end);

            const cStats = calculatePeriodStats(currApps, cDays, getRangeCost(curr.start, curr.end));
            const pStats = calculatePeriodStats(prevApps, pDays, getRangeCost(prev.start, prev.end));

            return { current: cStats, previous: pStats, rangeLabel: `${curr.start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${curr.end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` };
        }
        else if (activeTab === 'monthly') {
            const [yStr, mStr] = selectedMonth.split('-');
            const y = parseInt(yStr), m = parseInt(mStr) - 1;
            const currStart = new Date(y, m, 1); const currEnd = new Date(y, m + 1, 0);
            const prevStart = new Date(y, m - 1, 1); const prevEnd = new Date(y, m, 0);

            const currApps = appointments.filter(a => { const d = new Date(a.date); return d >= currStart && d <= currEnd; });
            const prevApps = appointments.filter(a => { const d = new Date(a.date); return d >= prevStart && d <= prevEnd; });

            const cDays = countBusinessDays(currStart, currEnd);
            const pDays = countBusinessDays(prevStart, prevEnd);

            const cCost = getCostForMonth(currStart); // This sums all costs in that month
            const pCost = getCostForMonth(prevStart);

            const cStats = calculatePeriodStats(currApps, cDays, cCost);
            const pStats = calculatePeriodStats(prevApps, pDays, pCost);

            return { current: cStats, previous: pStats, rangeLabel: currStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
        }
        else if (activeTab === 'yearly') {
            const currApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear);
            const prevApps = appointments.filter(a => new Date(a.date).getFullYear() === selectedYear - 1);

            // Yearly Cost
            const getYearCost = (year: number) => costs.filter(c => new Date(c.date).getFullYear() === year).reduce((acc, c) => acc + c.amount, 0);

            // Count biz days in year
            const countYearBizDays = (year: number) => {
                let d = new Date(year, 0, 1);
                let count = 0;
                while (d.getFullYear() === year) {
                    const w = d.getDay();
                    if (w >= 2 && w <= 6) count++;
                    d.setDate(d.getDate() + 1);
                }
                return count;
            };

            const cDays = countYearBizDays(selectedYear);
            const pDays = countYearBizDays(selectedYear - 1);

            const cStats = calculatePeriodStats(currApps, cDays, getYearCost(selectedYear));
            const pStats = calculatePeriodStats(prevApps, pDays, getYearCost(selectedYear - 1));

            return { current: cStats, previous: pStats, rangeLabel: selectedYear.toString() };
        }
        return null;
    }, [activeTab, appointments, selectedDate, selectedMonth, selectedYear, costs]);

    interface StatCardProps { title: string; value: string | number; icon: any; colorClass: string; growth?: number; subValue?: string; }
    const StatCard = ({ title, value, icon: Icon, colorClass, growth, subValue }: StatCardProps) => (
        <div className="bg-white p-5 rounded-[2rem] shadow-soft border border-gray-100/50 btn-spring hover:shadow-lg hover:-translate-y-2 flex flex-col justify-between group h-full relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${colorClass.split('-')[1]}-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={22} className="animate-pulse-slow" />
                </div>
                {growth !== undefined && (
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${growth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {growth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(growth).toFixed(0)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800 tracking-tight leading-none">{value}</h3>
                {subValue && <p className="text-xs font-medium text-gray-400 mt-2">{subValue}</p>}
            </div>
        </div>
    );

    const TabButton = ({ id, label, icon: Icon }: any) => (<button onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 btn-spring ${activeTab === id ? 'bg-white text-brand-600 shadow-md transform scale-100' : 'text-gray-400 hover:bg-white/50 hover:text-gray-600'}`}><Icon size={16} /><span className="hidden sm:inline">{label}</span></button>);

    const animationClass = slideDirection === 'right' ? 'animate-slide-right' : slideDirection === 'left' ? 'animate-slide-left' : '';

    return (
        <div className="space-y-6 animate-fade-in pb-10" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {defaultTab === 'daily' ? null : (
                <>
                    <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900 tracking-tight">Faturamento</h1></div>
                    <div className="bg-gray-100/50 p-1 rounded-2xl mb-8 flex gap-1 shadow-inner"><TabButton id="daily" label="Diário" icon={CalendarIcon} /><TabButton id="weekly" label="Semanal" icon={BarChart2} /><TabButton id="monthly" label="Mensal" icon={TrendingUp} /><TabButton id="yearly" label="Anual" icon={PieChartIcon} /></div>
                </>
            )}

            {activeTab === 'daily' && (
                <section key={selectedDate} className={animationClass}>
                    <div className="sticky top-0 z-30 flex justify-between items-center mb-4 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-gray-200 shadow-sm transition-all">
                        <h2 className="text-lg font-bold text-gray-800">Diário</h2>
                        <div className="relative text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors cursor-pointer group flex items-center gap-1 z-50 select-none" onClick={() => (document.getElementById('daily-date-picker') as HTMLInputElement)?.showPicker()}>
                            <span className="pointer-events-none">{formatDateWithWeek(selectedDate)}</span>
                            <ChevronDown size={14} className="opacity-50 pointer-events-none" />
                            <input
                                id="daily-date-picker"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-50 appearance-none"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><StatCard title="Total de Pets" value={dailyStats.totalPets} icon={PawPrint} colorClass="bg-blue-500" /><StatCard title="Total de Tosas" value={dailyStats.totalTosas} icon={Scissors} colorClass="bg-orange-500" subValue="Normal e Tesoura" /><StatCard title="Caixa Pago" value={`R$ ${dailyStats.paidRevenue.toFixed(2)}`} icon={CheckCircle} colorClass="bg-green-500" /><StatCard title="A Receber" value={`R$ ${dailyStats.pendingRevenue.toFixed(2)}`} icon={AlertCircle} colorClass="bg-red-500" /></div>
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-glass border border-white/40 overflow-hidden mt-6">
                        <h3 className="p-5 text-sm font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100/50 dark:border-gray-700/50 flex items-center gap-2 uppercase tracking-wider"><FileText size={16} /> Detalhamento do Dia</h3>
                        <div className="p-4 space-y-3">
                            {dailyApps.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-medium">Nenhum agendamento neste dia.</div>
                            ) : (
                                dailyApps.sort((a, b) => a.date.localeCompare(b.date)).map((app, index) => {
                                    const client = clients.find(c => c.id === app.clientId);
                                    const pet = client?.pets.find(p => p.id === app.petId);
                                    const mainSvc = services.find(s => s.id === app.serviceId);
                                    const addSvcs = app.additionalServiceIds?.map(id => services.find(srv => srv.id === id)).filter(x => x);
                                    const val = calculateTotal(app, services);
                                    // Payment Fix: Must have valid payment info to be Paid
                                    const isPaid = (!!app.paidAmount && app.paidAmount > 0) && (!!app.paymentMethod && app.paymentMethod.trim() !== '');

                                    return (
                                        <div key={app.id} style={{ animationDelay: `${index * 0.05}s` }} className={`animate-slide-up bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-stretch gap-4 transition-all ${isPaid ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}`}>
                                            <div className="flex flex-col justify-center items-center px-2 border-r border-gray-100 dark:border-gray-700 min-w-[70px]">
                                                <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Horário</span>
                                            </div>
                                            <div className="flex-1 py-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4
                                                            className="font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors flex items-center gap-2"
                                                            onClick={() => pet && client && onViewPet?.(pet, client)}
                                                        >
                                                            {pet?.name}
                                                            {(() => {
                                                                const pApps = appointments.filter(a => a.petId === pet?.id && a.rating);
                                                                if (pApps.length > 0) {
                                                                    const avg = pApps.reduce((acc, c) => acc + (c.rating || 0), 0) / pApps.length;
                                                                    return (
                                                                        <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                                                                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                                                            <span className="text-[9px] font-bold text-yellow-700">{avg.toFixed(1)}</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{client?.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-bold ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>R$ {val.toFixed(2)}</div>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                            {isPaid ? 'Pago' : app.status === 'nao_veio' ? 'Não Veio' : 'Pendente'}
                                                        </span>
                                                        {(!isPaid && app.status !== 'nao_veio' && app.status !== 'cancelado' && onNoShow) && (
                                                            <button onClick={() => onNoShow(app)} className="ml-2 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-500 text-[9px] font-bold rounded uppercase border border-red-100 transition-colors">
                                                                Não Veio
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-600 truncate max-w-full">
                                                        {mainSvc?.name}
                                                    </span>
                                                    {addSvcs && addSvcs.length > 0 && addSvcs.map((s, i) => (
                                                        <span key={i} className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-700 truncate">
                                                            + {s?.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </section>
            )}
            {activeTab === 'weekly' && metricData && (
                <section className="animate-fade-in text-left">
                    <div className="sticky top-0 z-30 flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-800">Semana</h2><span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{metricData.rangeLabel}</span></div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
                        <StatCard title="Faturamento Total" value={`R$ ${metricData.current.grossRevenue.toFixed(0)}`} icon={Wallet} colorClass="bg-green-500" growth={getGrowth(metricData.current.grossRevenue, metricData.previous.grossRevenue)} />
                        <StatCard title="Média / Dia" value={`R$ ${metricData.current.avgRevPerDay.toFixed(0)}`} icon={BarChart2} colorClass="bg-blue-500" growth={getGrowth(metricData.current.avgRevPerDay, metricData.previous.avgRevPerDay)} />
                        <StatCard title="Custo Diário (Ter-Sab)" value={`R$ ${metricData.current.dailyCost.toFixed(0)}`} icon={AlertCircle} colorClass="bg-red-500" />
                        <StatCard title="Ticket Médio / Pet" value={`R$ ${metricData.current.averageTicket.toFixed(0)}`} icon={DollarSign} colorClass="bg-purple-500" growth={getGrowth(metricData.current.averageTicket, metricData.previous.averageTicket)} />
                        <StatCard title="Qtd. Pets" value={metricData.current.totalPets} icon={PawPrint} colorClass="bg-orange-500" growth={getGrowth(metricData.current.totalPets, metricData.previous.totalPets)} />
                        <StatCard title="Média Pets / Dia" value={metricData.current.avgPetsPerDay.toFixed(1)} icon={Activity} colorClass="bg-pink-500" growth={getGrowth(metricData.current.avgPetsPerDay, metricData.previous.avgPetsPerDay)} />
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 h-96 mb-6"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-wide"><TrendingUp size={16} /> Evolução Diária</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={weeklyChartData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} dy={10} /><YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Bar yAxisId="right" dataKey="pets" fill="#c7d2fe" radius={[4, 4, 0, 0]} barSize={20} /><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}

            {activeTab === 'monthly' && metricData && (
                <section className="animate-fade-in text-left">
                    <div className="sticky top-0 z-30 flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-800">Mensal</h2><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border-0 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-brand-100" /></div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
                        <StatCard title="Faturamento Total" value={`R$ ${metricData.current.grossRevenue.toFixed(0)}`} icon={Wallet} colorClass="bg-green-500" growth={getGrowth(metricData.current.grossRevenue, metricData.previous.grossRevenue)} />
                        <StatCard title="Média / Dia" value={`R$ ${metricData.current.avgRevPerDay.toFixed(0)}`} icon={BarChart2} colorClass="bg-blue-500" growth={getGrowth(metricData.current.avgRevPerDay, metricData.previous.avgRevPerDay)} />
                        <StatCard title="Custo Diário (Ter-Sab)" value={`R$ ${metricData.current.dailyCost.toFixed(0)}`} icon={AlertCircle} colorClass="bg-red-500" />
                        <StatCard title="Ticket Médio / Pet" value={`R$ ${metricData.current.averageTicket.toFixed(0)}`} icon={DollarSign} colorClass="bg-purple-500" growth={getGrowth(metricData.current.averageTicket, metricData.previous.averageTicket)} />
                        <StatCard title="Qtd. Pets" value={metricData.current.totalPets} icon={PawPrint} colorClass="bg-orange-500" growth={getGrowth(metricData.current.totalPets, metricData.previous.totalPets)} />
                        <StatCard title="Média Pets / Dia" value={metricData.current.avgPetsPerDay.toFixed(1)} icon={Activity} colorClass="bg-pink-500" growth={getGrowth(metricData.current.avgPetsPerDay, metricData.previous.avgPetsPerDay)} />
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 h-96 mb-6"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-wide"><BarChart2 size={16} /> Semanas do Mês</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={monthlyChartData} margin={{ top: 10, right: 0, bottom: 0, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar yAxisId="right" dataKey="pets" fill="#e9d5ff" radius={[4, 4, 0, 0]} barSize={30} /><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#9333ea" strokeWidth={3} dot={{ r: 4 }} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}

            {activeTab === 'yearly' && metricData && (
                <section className="animate-fade-in text-left">
                    <div className="sticky top-0 z-30 flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-800">Anual</h2><select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border-0 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-brand-100">{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
                        <StatCard title="Faturamento Total" value={`R$ ${(metricData.current.grossRevenue / 1000).toFixed(1)}k`} icon={Wallet} colorClass="bg-green-500" growth={getGrowth(metricData.current.grossRevenue, metricData.previous.grossRevenue)} />
                        <StatCard title="Média / Dia" value={`R$ ${metricData.current.avgRevPerDay.toFixed(0)}`} icon={BarChart2} colorClass="bg-blue-500" growth={getGrowth(metricData.current.avgRevPerDay, metricData.previous.avgRevPerDay)} />
                        <StatCard title="Custo Diário (Ter-Sab)" value={`R$ ${metricData.current.dailyCost.toFixed(0)}`} icon={AlertCircle} colorClass="bg-red-500" />
                        <StatCard title="Ticket Médio" value={`R$ ${metricData.current.averageTicket.toFixed(0)}`} icon={DollarSign} colorClass="bg-purple-500" growth={getGrowth(metricData.current.averageTicket, metricData.previous.averageTicket)} />
                        <StatCard title="Qtd. Pets" value={metricData.current.totalPets} icon={PawPrint} colorClass="bg-orange-500" growth={getGrowth(metricData.current.totalPets, metricData.previous.totalPets)} />
                        <StatCard title="Média Pets / Dia" value={metricData.current.avgPetsPerDay.toFixed(1)} icon={Activity} colorClass="bg-pink-500" growth={getGrowth(metricData.current.avgPetsPerDay, metricData.previous.avgPetsPerDay)} />
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 h-96 mb-6"><h3 className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2 uppercase tracking-wide"><TrendingUp size={16} /> Evolução Mensal</h3><ResponsiveContainer width="100%" height="80%"><ComposedChart data={yearlyChartData} margin={{ top: 10, right: 0, bottom: 0, left: -10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar yAxisId="right" dataKey="pets" fill="#a7f3d0" radius={[4, 4, 0, 0]} barSize={20} /><Line yAxisId="left" type="monotone" dataKey="faturamento" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div>
                </section>
            )}
        </div>
    );
};

const CostsView: React.FC<{ costs: CostItem[] }> = ({ costs }) => {
    const isOperationalCost = (c: CostItem) => {
        const cat = c.category?.toLowerCase() || '';
        return cat !== 'sócio' && cat !== 'socio' && !cat.includes('extraordinário') && !cat.includes('extraordinario');
    };
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const filterCosts = () => {
        if (viewMode === 'monthly') { const [y, m] = selectedMonth.split('-'); return costs.filter(c => { const d = new Date(c.date); return d.getFullYear() === parseInt(y) && d.getMonth() === (parseInt(m) - 1); }); }
        return costs.filter(c => new Date(c.date).getFullYear() === selectedYear);
    };
    const allFilteredCosts = filterCosts();
    const filteredCosts = allFilteredCosts.filter(isOperationalCost);
    const personalCosts = allFilteredCosts.filter(c => !isOperationalCost(c));

    const totalCost = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const totalPersonal = personalCosts.reduce((acc, c) => acc + c.amount, 0);
    const paidCost = filteredCosts.filter(c => c.status && c.status.toLowerCase() === 'pago').reduce((acc, c) => acc + c.amount, 0);
    const pendingCost = filteredCosts.filter(c => !c.status || c.status.toLowerCase() !== 'pago').reduce((acc, c) => acc + c.amount, 0);

    const getCostByCategory = () => { const counts: Record<string, number> = {}; filteredCosts.forEach(c => { const cat = c.category || 'Outros'; counts[cat] = (counts[cat] || 0) + c.amount; }); const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); const top5 = sorted.slice(0, 5); const others = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0); if (others > 0) top5.push({ name: 'Outros', value: others }); return top5; };
    const getCostByMonth = () => { const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; const data = Array(12).fill(0).map((_, i) => ({ name: monthNames[i], value: 0 })); const yearCosts = costs.filter(c => new Date(c.date).getFullYear() === selectedYear && isOperationalCost(c)); yearCosts.forEach(c => { const d = new Date(c.date); if (!isNaN(d.getTime())) data[d.getMonth()].value += c.amount; }); const startIdx = selectedYear === 2025 ? 7 : 0; return data.slice(startIdx); };
    const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-gray-800">Custo Mensal</h1><div className="flex bg-white rounded-lg p-1 border"><button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'monthly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Mês</button><button onClick={() => setViewMode('yearly')} className={`px-4 py-1.5 text-xs font-bold rounded ${viewMode === 'yearly' ? 'bg-brand-600 text-white' : 'text-gray-600'}`}>Ano</button></div></div>
            <div className="flex items-center mb-6 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800 mr-4">Período:</h2>{viewMode === 'monthly' ? (<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-brand-100" />) : (<select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none">{[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>)}</div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase">Custo Operacional</p>
                    <h3 className="text-2xl font-bold text-rose-600">R$ {totalCost.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase">Pago</p>
                    <h3 className="text-2xl font-bold text-green-600">R$ {paidCost.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase">Pendente</p>
                    <h3 className="text-2xl font-bold text-orange-600">R$ {pendingCost.toFixed(2)}</h3>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col justify-between">
                    <p className="text-xs font-bold text-purple-600 uppercase">Retiradas/Extras</p>
                    <h3 className="text-2xl font-bold text-purple-700">R$ {totalPersonal.toFixed(2)}</h3>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"><h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><BarChart2 size={16} /> Evolução</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={getCostByMonth()} margin={{ top: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(val) => `R$${val}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} /><Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} /><Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]}><LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#e11d48' }} formatter={(val: number) => val > 0 ? `R$${val.toFixed(0)}` : ''} /></Bar></BarChart></ResponsiveContainer></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-80"><h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2"><Tag size={16} /> Categorias</h3><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={getCostByCategory()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">{getCostByCategory().map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} /><Legend layout="vertical" verticalAlign="middle" align="right" /></PieChart></ResponsiveContainer></div></div>
        </div>
    );
};

const PaymentManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onUpdateAppointment: (app: Appointment) => void; onRemovePayment: (app: Appointment) => void; onNoShow: (app: Appointment) => void; onViewPet?: (pet: Pet, client: Client) => void; accessToken: string | null; sheetId: string; }> = ({ appointments, clients, services, onUpdateAppointment, onRemovePayment, onNoShow, onViewPet, accessToken, sheetId }) => {
    const getLocalISODate = (d: Date = new Date()) => { const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
    const [selectedDate, setSelectedDate] = useState(getLocalISODate()); const [editingId, setEditingId] = useState<string | null>(null); const [amount, setAmount] = useState(''); const [method, setMethod] = useState(''); const [isSaving, setIsSaving] = useState(false); const [activeTab, setActiveTab] = useState<'toReceive' | 'pending' | 'paid' | 'noShow'>('toReceive'); const [contextMenu, setContextMenu] = useState<{ x: number, y: number, app: Appointment } | null>(null);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [evaluatingApp, setEvaluatingApp] = useState<Appointment | null>(null);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const touchStart = useRef<number | null>(null);
    const getAppLocalDateStr = (dateStr: string) => { const d = new Date(dateStr); return getLocalISODate(d); };

    // Filters
    const dailyApps = appointments.filter(a => getAppLocalDateStr(a.date) === selectedDate && a.status !== 'cancelado');
    const noShowApps = dailyApps.filter(a => a.status === 'nao_veio');
    const toReceiveApps = dailyApps.filter(a => (!a.paymentMethod || a.paymentMethod.trim() === '') && a.status !== 'nao_veio');
    const paidApps = dailyApps.filter(a => a.paymentMethod && a.paymentMethod.trim() !== '');
    const pendingApps = appointments.filter(a => { const appDate = getAppLocalDateStr(a.date); const isPast = appDate < getLocalISODate(); const isUnpaid = (!a.paymentMethod || a.paymentMethod.trim() === ''); return isPast && isUnpaid && a.status !== 'nao_veio' && a.status !== 'cancelado'; }).sort((a, b) => b.date.localeCompare(a.date));

    const navigateDate = (days: number) => {
        setSlideDirection(days > 0 ? 'right' : 'left');
        const [year, month, day] = selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + days);
        setSelectedDate(getLocalISODate(date));
    };
    const goToToday = () => {
        setSlideDirection(null);
        setSelectedDate(getLocalISODate());
    };

    const calculateExpected = (app: Appointment) => calculateTotal(app, services);
    const handleStartEdit = (app: Appointment) => { setEditingId(app.id); const expected = calculateExpected(app); setAmount(app.paidAmount ? app.paidAmount.toString() : expected.toString()); setMethod(app.paymentMethod || 'Credito'); setContextMenu(null); };
    const handleSave = async (app: Appointment) => {
        setIsSaving(true);
        const finalAmount = parseFloat(amount);
        const updatedApp = { ...app, paidAmount: finalAmount, paymentMethod: method as any };

        // Sync Payment to Sheet (Cols Q, R)
        if (app.id.startsWith('sheet_') && accessToken && sheetId) {
            try {
                const parts = app.id.split('_');
                const index = parseInt(parts[1]);
                const rowNumber = index + 1;
                const range = `Agendamento!P${rowNumber}:R${rowNumber}`;
                const values = ['Pago', finalAmount.toString().replace('.', ','), method];
                await googleService.updateSheetValues(accessToken, sheetId, range, values);
            } catch (e) {
                console.error("Failed", e);
            }
        }

        onUpdateAppointment(updatedApp);
        setEditingId(null);
        setIsSaving(false);

        // Trigger Evaluation Modal
        setEvaluatingApp(updatedApp);
        setShowEvaluationModal(true);
    };

    const handleEvaluationSave = async (rating: number, tags: string[], extraNotes: string) => {
        if (!evaluatingApp) return;
        const ratingString = `[Avaliação: ${rating}/5]`;
        const tagString = tags.length > 0 ? `[Tags: ${tags.join(', ')}]` : '';
        const noteString = extraNotes ? `[Obs: ${extraNotes}]` : '';
        const fullNote = `${evaluatingApp.notes || ''} ${ratingString} ${tagString} ${noteString}`.trim();

        const finalApp = { ...evaluatingApp, rating, ratingTags: tags, notes: fullNote };
        onUpdateAppointment(finalApp);

        if (finalApp.id.startsWith('sheet_') && accessToken && sheetId) {
            try {
                const parts = finalApp.id.split('_');
                const rowNumber = parseInt(parts[1]) + 1;
                await googleService.updateSheetValues(accessToken, sheetId, `Agendamento!N${rowNumber}`, [fullNote]);
            } catch (e) {
                console.error("Failed to sync evaluation", e);
            }
        }
        setEvaluatingApp(null);
        setShowEvaluationModal(false);
    };



    const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 100) navigateDate(diff > 0 ? 1 : -1);
        touchStart.current = null;
    };

    const animationClass = slideDirection === 'right' ? 'animate-slide-right' : slideDirection === 'left' ? 'animate-slide-left' : '';

    const renderPaymentRow = (app: Appointment, statusColor: string, index: number) => {
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const mainSvc = services.find(srv => srv.id === app.serviceId);
        const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter((x): x is Service => !!x) || [];
        const expected = calculateExpected(app);
        const isPaid = !!app.paidAmount && !!app.paymentMethod;
        const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase();
        let serviceBorderColor = 'border-l-sky-400';
        if (allServiceNames.includes('tesoura')) serviceBorderColor = 'border-l-pink-500';
        else if (allServiceNames.includes('tosa normal')) serviceBorderColor = 'border-l-orange-500';
        else if (allServiceNames.includes('higi')) serviceBorderColor = 'border-l-yellow-500';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) serviceBorderColor = 'border-l-purple-500';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) serviceBorderColor = 'border-l-indigo-500';


        return (
            <div key={app.id} style={{ animationDelay: `${index * 0.05}s` }} className={`animate-slide-up p-5 rounded-3xl shadow-sm hover:shadow-glass hover:-translate-y-0.5 transition-all duration-300 border border-white/60 bg-white/60 backdrop-blur-md mb-3 relative overflow-hidden group ${statusColor}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${serviceBorderColor.replace('border-l-', 'bg-')} opacity-80 rounded-l-3xl`} />
                <div className="flex justify-between items-start mb-3 pl-3">
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                            <div
                                className="text-lg font-bold text-gray-900 truncate tracking-tight cursor-pointer hover:text-brand-600 transition-colors flex items-center gap-2"
                                onClick={() => pet && client && onViewPet?.(pet, client)}
                            >
                                {pet?.name}
                                {(() => {
                                    const pApps = appointments.filter(a => a.petId === pet?.id && a.rating);
                                    if (pApps.length > 0) {
                                        const avg = pApps.reduce((acc, c) => acc + (c.rating || 0), 0) / pApps.length;
                                        return (
                                            <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                                <span className="text-[9px] font-bold text-yellow-700">{avg.toFixed(1)}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
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
                <div className="flex gap-2 ml-1">
                    <button onClick={() => handleStartEdit(app)} className="flex-1 bg-white hover:bg-gray-50 text-gray-600 hover:text-brand-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all border border-gray-100 shadow-sm group-hover:shadow-md active:scale-95"> <DollarSign size={14} /> {isPaid ? 'Editar Detalhes' : 'Registrar Pagamento'} </button>
                    {isPaid && (
                        <button onClick={() => onRemovePayment(app)} className="px-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center font-bold text-xs transition-all border border-red-100 active:scale-95 whitespace-nowrap" title="Desfazer Pagamento">
                            <Trash2 size={16} />
                        </button>
                    )}
                    {!isPaid && statusColor !== 'bg-gray-100 opacity-75' && (
                        <button onClick={() => onNoShow(app)} className="px-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center font-bold text-xs transition-all border border-red-100 active:scale-95 whitespace-nowrap">Não Veio</button>
                    )}
                </div>
            </div>
        );
    };

    return (<div className="space-y-4 h-full flex flex-col pt-2" onClick={() => setContextMenu(null)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight self-start md:self-center">Pagamentos</h2>
            <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 flex-shrink-0">
                <button onClick={() => navigateDate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-500 transition-all"><ChevronLeft size={18} /></button>
                <button onClick={goToToday} className="flex-1 px-4 py-2 bg-white text-brand-600 font-bold rounded-xl text-xs shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">Hoje</button>
                <button onClick={() => navigateDate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-500 transition-all"><ChevronRight size={18} /></button>
                <div className="relative text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors cursor-pointer min-w-[130px] text-center uppercase tracking-wide border border-transparent hover:border-gray-200 z-50 select-none flex items-center justify-center gap-1" onClick={() => (document.getElementById('payments-date-picker') as HTMLInputElement)?.showPicker()}>
                    <span className="pointer-events-none">{formatDateWithWeek(selectedDate)}</span>
                    <ChevronDown size={12} className="opacity-50 pointer-events-none" />
                    <input
                        id="payments-date-picker"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-50 appearance-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        </div>

        <div className="flex p-1.5 bg-gray-200/50 rounded-2xl overflow-x-auto gap-1">
            <button onClick={() => setActiveTab('toReceive')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'toReceive' ? 'bg-white shadow-md text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">A Receber</span> <span className="text-lg">{toReceiveApps.length}</span> </button>
            <button onClick={() => setActiveTab('pending')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'pending' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pendentes</span> <span className="text-lg">{pendingApps.length}</span> </button>
            <button onClick={() => setActiveTab('paid')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'paid' ? 'bg-white shadow-md text-green-600' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pagos</span> <span className="text-lg">{paidApps.length}</span> </button>
            <button onClick={() => setActiveTab('noShow')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'noShow' ? 'bg-white shadow-md text-gray-500' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Não Veio</span> <span className="text-lg">{noShowApps.length}</span> </button>
        </div>

        <div key={selectedDate} className={`flex-1 overflow-y-auto min-h-0 bg-transparent p-1 ${animationClass}`}>
            {activeTab === 'toReceive' && toReceiveApps.map((app, i) => renderPaymentRow(app, "bg-gradient-to-br from-yellow-50 to-white", i))}
            {activeTab === 'pending' && pendingApps.map((app, i) => renderPaymentRow(app, "bg-gradient-to-br from-red-50 to-white", i))}
            {activeTab === 'paid' && paidApps.map((app, i) => renderPaymentRow(app, "bg-gradient-to-br from-green-50 to-white border-green-100", i))}
            {activeTab === 'noShow' && noShowApps.map((app, i) => renderPaymentRow(app, "bg-gray-100 opacity-75", i))}
        </div>

        {contextMenu && (<div className="fixed bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl z-[100] py-2 min-w-[180px] animate-scale-up glass-card" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(contextMenu.app)} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-gray-700 text-sm flex items-center gap-3 font-medium transition-colors"><Edit2 size={16} className="text-gray-400" /> Editar Valor</button> </div>)}

        {editingId && createPortal((() => { const app = appointments.find(a => a.id === editingId); if (!app) return null; const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); return (<div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditingId(null)}> <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-up select-none" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-6"> <div><h3 className="text-2xl font-bold text-gray-900">{pet?.name}</h3><span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Pagamento</span></div><button onClick={() => setEditingId(null)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={20} /></button></div> <div className="space-y-4"> <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Valor R$</label><input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-2xl font-black text-gray-800 focus:ring-2 ring-brand-500 outline-none transition-all placeholder:text-gray-300" autoFocus /></div> <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Método</label><div className="grid grid-cols-2 gap-2"> {['Credito', 'Debito', 'Pix', 'Dinheiro'].map(m => (<button key={m} onClick={() => setMethod(m)} className={`p-3 rounded-xl font-bold text-sm transition-all border ${method === m ? 'bg-brand-600 text-white border-brand-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{m}</button>))} </div></div> <button onClick={() => handleSave(app)} disabled={isSaving} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-brand-200 transition-all active:scale-95 mt-2 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : 'Confirmar Pagamento'}</button> </div> </div> </div>) })(), document.body)}

        {showEvaluationModal && evaluatingApp && (
            <EvaluationModal
                isOpen={showEvaluationModal}
                onClose={() => setShowEvaluationModal(false)}
                onSave={handleEvaluationSave}
                clientName={clients.find(c => c.id === evaluatingApp.clientId)?.name}
                petName={clients.find(c => c.id === evaluatingApp.clientId)?.pets.find(p => p.id === evaluatingApp.petId)?.name}
            />
        )}
    </div>)

};

const ClientManager: React.FC<{ clients: Client[]; appointments: Appointment[]; onDeleteClient: (id: string) => void; googleUser: GoogleUser | null; accessToken: string | null; }> = ({ clients, appointments, onDeleteClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);

    // Reset visible count when search changes
    useEffect(() => { setVisibleCount(20); }, [searchTerm]);

    const filteredClients = useMemo(() => {
        return clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, searchTerm]);

    const visibleClients = useMemo(() => filteredClients.slice(0, visibleCount), [filteredClients, visibleCount]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 300) {
            setVisibleCount(prev => {
                if (prev >= filteredClients.length) return prev;
                return Math.min(prev + 50, filteredClients.length);
            });
        }
    };

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

            <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0 px-1" onScroll={handleScroll}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleClients.map((client, index) => (
                        <div key={client.id} style={{ animationDelay: `${index * 0.05}s` }} className="animate-slide-up bg-white/70 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50 hover:shadow-glass hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-brand-50/50 rounded-bl-[40px] -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="min-w-0 pr-2">
                                    <h3 className="font-bold text-gray-900 truncate text-lg tracking-tight">{client.name}</h3>

                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-medium bg-white/50 px-2 py-1 rounded-lg w-fit shadow-sm border border-gray-100/50"><Phone size={12} className="text-brand-400" /> {client.phone}</p>
                                </div>
                                <button onClick={() => { if (confirm('Excluir?')) onDeleteClient(client.id); }} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition shadow-sm bg-white border border-gray-100" title="Excluir Cliente"><Trash2 size={16} /></button>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {client.pets.map(pet => (
                                    <div key={pet.id} className="bg-white p-3 rounded-2xl flex flex-col gap-2 text-sm border border-gray-100 shadow-sm hover:shadow transition group/pet">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-inner group-hover/pet:scale-110 transition-transform">{pet.name ? pet.name[0] : '?'}</div>
                                            <div className="min-w-0 truncate">
                                                <span className="font-bold text-gray-800 block leading-tight">{pet.name}</span>
                                                <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">{pet.breed}</span>
                                            </div>
                                        </div>
                                        {/* Pet Rating Display */}
                                        {(() => {
                                            const pApps = appointments.filter(a => a.petId === pet.id && a.rating);
                                            if (pApps.length > 0) {
                                                const avg = pApps.reduce((acc, c) => acc + (c.rating || 0), 0) / pApps.length;
                                                const allTags = pApps.flatMap(a => a.ratingTags || []);
                                                const tagCounts: Record<string, number> = {};
                                                allTags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
                                                const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

                                                return (
                                                    <div className="pt-2 border-t border-gray-100/50">
                                                        <div className="flex items-center gap-1 mb-1.5">
                                                            <div className="flex text-yellow-400">
                                                                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} className={avg >= s ? "fill-current" : "text-gray-200"} />)}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 rounded-full">({pApps.length})</span>
                                                        </div>
                                                        {topTags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {topTags.map(t => <span key={t} className="text-[9px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100 font-bold">{t}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {visibleCount < filteredClients.length && (
                        <div className="col-span-full py-8 text-center pb-32">
                            <button
                                onClick={() => setVisibleCount(prev => Math.min(prev + 50, filteredClients.length))}
                                className="text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-6 py-4 rounded-2xl transition shadow-sm border border-brand-100 hover:shadow-md active:scale-95"
                            >
                                Carregar Mais Clientes ({filteredClients.length - visibleCount} restantes)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ServiceManager: React.FC<{ services: Service[]; onAddService: (s: Service) => void; onDeleteService: (id: string) => void; onSyncServices: (silent: boolean) => void; accessToken: string | null; sheetId: string; }> = ({ services, onAddService, onDeleteService, onSyncServices, sheetId, accessToken }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, service: Service } | null>(null);
    const [viewService, setViewService] = useState<Service | null>(null);

    const resetForm = () => { setFormData({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' }); setEditingService(null); setIsModalOpen(false); };
    const handleEditStart = (s: Service) => { setEditingService(s); setFormData({ name: s.name, price: s.price.toString(), category: s.category, size: s.targetSize || 'Todos', coat: s.targetCoat || 'Todos' }); setIsModalOpen(true); setContextMenu(null); };
    const handleSave = async () => { if (!accessToken || !sheetId) return alert('Necessário estar logado para salvar.'); const priceNum = parseFloat(formData.price.replace(',', '.')); const rowData = [formData.name, formData.category, formData.size, formData.coat, priceNum.toString().replace('.', ',')]; try { if (editingService) { const parts = editingService.id.split('_'); if (parts.length >= 3) { const index = parseInt(parts[2]); const row = index + 2; const range = `Serviço!A${row}:E${row}`; await googleService.updateSheetValues(accessToken, sheetId, range, rowData); } } else { await googleService.appendSheetValues(accessToken, sheetId, 'Serviço!A:E', rowData); } onSyncServices(true); resetForm(); } catch (e) { console.error(e); alert('Erro ao salvar na planilha.'); } };
    const handleDelete = async (service: Service) => { if (!confirm(`Excluir ${service.name}?`)) return; setContextMenu(null); if (service.id.startsWith('sheet_svc_') && accessToken && sheetId) { const parts = service.id.split('_'); if (parts.length >= 3) { const index = parseInt(parts[2]); const row = index + 2; try { await googleService.clearSheetValues(accessToken, sheetId, `Serviço!A${row}:E${row}`); onSyncServices(true); return; } catch (e) { console.error(e); alert('Erro ao excluir da planilha.'); } } } onDeleteService(service.id); };

    // ... ServiceManager internal logic ...

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
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="animate-slide-up bg-white/80 backdrop-blur p-5 rounded-[2rem] shadow-sm border border-white/60 flex flex-col justify-center items-center cursor-pointer btn-spring hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                        <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-2 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Plus size={24} />
                        </div>
                        <span className="font-bold text-gray-700 group-hover:text-brand-600 transition-colors">Novo Serviço</span>
                    </button>

                    {services.map((service, index) => (
                        <div key={service.id} onClick={() => setViewService(service)} style={{ animationDelay: `${index * 0.05}s` }} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, service }); }} className="animate-slide-up bg-white/80 backdrop-blur p-5 rounded-[2rem] shadow-sm border border-white/60 flex flex-col justify-between cursor-pointer btn-spring hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 text-brand-500">
                                <PawPrint size={80} />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-brand-500 btn-spring" title="Editar Rápido"><Edit2 size={12} /></div>
                            </div>
                            <div className="relative z-10">
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

            {/* Service Details Modal */}
            {viewService && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setViewService(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{viewService.name}</h2>
                            <p className="text-gray-500 text-sm mb-4">{viewService.description || 'Sem descrição.'}</p>

                            <div className="flex gap-2 mb-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewService.category === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{viewService.category}</span>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 uppercase">{viewService.targetSize}</span>
                            </div>

                            <div className="flex justify-between items-center mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <span className="block text-xs uppercase font-bold text-gray-400">Preço</span>
                                    <span className="text-xl font-black text-gray-900">R$ {viewService.price.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs uppercase font-bold text-gray-400">Tempo</span>
                                    <span className="text-xl font-black text-gray-900">{viewService.durationMin} min</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setViewService(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform">Fechar</button>
                                <button onClick={() => {
                                    handleDelete(viewService);
                                    setViewService(null);
                                }} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Trash2 size={16} /> Excluir
                                </button>
                                <button onClick={() => {
                                    handleEditStart(viewService);
                                    setViewService(null);
                                }} className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Edit2 size={16} /> Editar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {contextMenu && (
                <div className="fixed bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl z-[100] py-2 min-w-[170px] animate-scale-up glass-card" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => handleEditStart(contextMenu.service)} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-gray-700 text-sm flex items-center gap-3 font-medium transition-colors"><Edit2 size={16} className="text-gray-400" /> Editar</button>
                    <button onClick={() => handleDelete(contextMenu.service)} className="w-full text-left px-5 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium transition-colors"><Trash2 size={16} /> Excluir</button>
                </div>
            )}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
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
                </div>,
                document.body
            )}
        </div>
    );
};

const ScheduleManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onAdd: (app: Appointment | Appointment[], client: Client, pet: Pet, services: Service[], duration: number) => void; onEdit: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onUpdateStatus: (id: string, status: Appointment['status']) => void; onDelete: (id: string) => void; googleUser: GoogleUser | null; }> = ({ appointments, clients, services, onAdd, onEdit, onUpdateStatus, onDelete }) => {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailsApp, setDetailsApp] = useState<Appointment | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, appId: string } | null>(null);

    // App Form State
    const [editingApp, setEditingApp] = useState<Appointment | null>(null);
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]); // Array of Pet IDs
    const [selectedService, setSelectedService] = useState<string>(''); // Service ID
    const [selectedAddServices, setSelectedAddServices] = useState<string[]>([]); // Array of Service IDs
    const [selectedDayForDetails, setSelectedDayForDetails] = useState<string | null>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [manualDuration, setManualDuration] = useState<number | string>(0);
    const [notes, setNotes] = useState('');

    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [nowMinutes, setNowMinutes] = useState(0);

    useEffect(() => {
        const updateNow = () => {
            const now = new Date();
            const mins = (now.getHours() - 8) * 60 + now.getMinutes();
            setNowMinutes(mins);
        };
        updateNow();
        const interval = setInterval(updateNow, 60000);
        return () => clearInterval(interval);
    }, []);
    const touchStart = useRef<number | null>(null);

    const resetForm = () => {
        setEditingApp(null); setEditingAppId(null);
        setSelectedClient(null); setSelectedPetIds([]);
        setSelectedService(''); setSelectedAddServices([]);
        setDate(new Date().toISOString().split('T')[0]); setTime('09:00');
        setManualDuration(0); setNotes('');
        setClientSearch('');
        setIsModalOpen(false);
    };

    const handleStartEdit = (app: Appointment) => {
        const client = clients.find(c => c.id === app.clientId);
        setEditingApp(app); setEditingAppId(app.id);
        setSelectedClient(client || null); setClientSearch(client?.name || '');
        setSelectedPetIds(app.petId ? [app.petId] : []);
        setSelectedService(app.serviceId); setSelectedAddServices(app.additionalServiceIds || []);
        setDate(app.date.split('T')[0]); setTime(app.date.split('T')[1].substring(0, 5));
        setManualDuration(app.durationTotal || 0); setNotes(app.notes || '');
        setIsModalOpen(true); setDetailsApp(null); setContextMenu(null);
    };

    const handleSave = () => {
        if (!selectedClient || selectedPetIds.length === 0 || !selectedService || !date || !time) return;
        const client = selectedClient;
        const mainSvc = services.find(s => s.id === selectedService);
        const addSvcs = selectedAddServices.map(id => services.find(s => s.id === id)).filter(s => s) as Service[];

        if (client && mainSvc) {
            const allAppsToCreate: Appointment[] = [];

            // Iterate over ALL selected pets
            selectedPetIds.forEach(petId => {
                const pet = client.pets.find(p => p.id === petId);
                if (!pet) return;

                const newApp: Appointment = {
                    id: editingAppId && selectedPetIds.length === 1 ? editingAppId : `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    clientId: client.id,
                    petId: pet.id,
                    serviceId: mainSvc.id,
                    additionalServiceIds: selectedAddServices,
                    date: `${date}T${time}:00`,
                    status: 'agendado',
                    notes: notes,
                    googleEventId: editingAppId ? appointments.find(a => a.id === editingAppId)?.googleEventId : undefined
                };

                // Check Package Automation for THIS pet
                const serviceNameLower = mainSvc.name.toLowerCase();
                const isPackage = serviceNameLower.includes('pacote');

                if (isPackage && !editingAppId) { // Only do automation on new creation, or careful on edit? Assuming new for now.
                    let iterations = 0;
                    let intervalDays = 0;

                    if (serviceNameLower.includes('mensal')) {
                        iterations = 3;
                        intervalDays = 7;
                    } else if (serviceNameLower.includes('quinzenal')) {
                        iterations = 1;
                        intervalDays = 14;
                    }

                    allAppsToCreate.push(newApp);

                    if (iterations > 0) {
                        const baseDate = new Date(newApp.date);
                        for (let i = 1; i <= iterations; i++) {
                            const nextDate = new Date(baseDate);
                            nextDate.setDate(baseDate.getDate() + (i * intervalDays));
                            const isoDate = nextDate.toISOString().split('T')[0] + 'T' + time + ':00';

                            allAppsToCreate.push({
                                ...newApp,
                                id: `local_${Date.now()}_ recur_${Math.random()}_${i}`,
                                date: isoDate,
                                googleEventId: undefined
                            });
                        }
                    }
                } else {
                    allAppsToCreate.push(newApp);
                }
            });

            if (editingAppId && selectedPetIds.length === 1) {
                // Single Edit Legacy Mode
                const appToEdit = allAppsToCreate[0];
                const original = appointments.find(a => a.id === editingAppId);
                appToEdit.paidAmount = original?.paidAmount;
                appToEdit.paymentMethod = original?.paymentMethod;
                const pet = client.pets.find(p => p.id === appToEdit.petId)!;
                onEdit(appToEdit, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration as string));
            } else {
                // Batch Add / Multi-Add
                // We pass the FIRST pet for the notification logic inside onAdd, but onAdd handles array now so it iterates.
                // We need to pass A pet for the signature, but handleAddAppointment uses the pet inside the app object loop if we changed logic?
                // Actually handleAddAppointment (onAdd) signature is: (appOrApps, client, pet, services, duration).
                // It uses 'pet' arg for Google Event Summary "Banho/Tosa: ${pet.name}".
                // If we pass an array of apps for DIFFERENT pets, that 'pet' arg is insufficient/wrong for the batch description if they differ.
                // FIX: We rely on handleAddAppointment to use app.petId to find the pet? 
                // handleAddAppointment uses the PASSED 'pet' object.
                // We should probably call onAdd multiple times if the pets differ, or update onAdd to look up pet from ID.
                // OR, since my onAdd refactor loops `appsToAdd`, I can change onAdd to look up the pet for EACH app if I want correct descriptions.
                // BUT `handleAddAppointment` code I wrote uses `pet.name` from the argument.

                // RE-READ handleAddAppointment:
                // const handleAddAppointment = async (appOrApps: ... , pet: Pet ...)
                // for (const app of appsToAdd) { ... summary: `Banho/Tosa: ${pet.name}` ... }
                // It uses the SAME pet name for all. This is WRONG for multi-pet.

                // STRATEGY ADJUSTMENT:
                // Instead of calling onAdd once with Mixed Pets, I should call onAdd ONCE PER PET with that pet's package-generated appointments.
                // This ensures the `pet` argument matches the appointments.

                selectedPetIds.forEach(petId => {
                    const pet = client.pets.find(p => p.id === petId);
                    if (!pet) return;

                    // Filter the apps for this pet
                    const appsForThisPet = allAppsToCreate.filter(a => a.petId === petId);
                    if (appsForThisPet.length > 0) {
                        onAdd(appsForThisPet, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration as string));
                    }
                });
            }
            resetForm();
        }
    };

    const handleDeleteFromContext = () => { if (contextMenu && confirm('Excluir?')) onDelete(contextMenu.appId); setContextMenu(null); }
    const filteredClients = useMemo(() => {
        if (!clientSearch) return [];
        const term = clientSearch.toLowerCase();
        const termClean = term.replace(/\D/g, ''); // Digits only

        const uniqueClients = new Map<string, Client>();

        clients.forEach(c => {
            const nameMatch = c.name.toLowerCase().includes(term);
            const phoneRawMatch = c.phone.includes(clientSearch);
            const phoneCleanMatch = termClean.length > 2 && c.phone.replace(/\D/g, '').includes(termClean);
            const petMatch = c.pets.some(p => p.name.toLowerCase().includes(term));

            if (nameMatch || phoneRawMatch || phoneCleanMatch || petMatch) {
                const key = c.phone.replace(/\D/g, '') || c.id;
                if (!uniqueClients.has(key)) uniqueClients.set(key, c);
            }
        });

        return Array.from(uniqueClients.values()).slice(0, 20);
    }, [clients, clientSearch]);
    const selectedClientData = selectedClient; // selectedClient is now Client object
    const pets = selectedClientData?.pets || [];
    const selectedPetData = selectedClient?.pets.find(p => p.id === selectedPetIds[0]);

    const getApplicableServices = (category: 'principal' | 'adicional') => { if (!selectedPetData) return []; return services.filter(s => { const matchesCategory = s.category === category; const matchesSize = s.targetSize === 'Todos' || !s.targetSize || (selectedPetData.size && s.targetSize.toLowerCase().includes(selectedPetData.size.toLowerCase())); const matchesCoat = s.targetCoat === 'Todos' || !s.targetCoat || (selectedPetData.coat && s.targetCoat.toLowerCase().includes(selectedPetData.coat.toLowerCase())); return matchesCategory && matchesSize && matchesCoat; }); };
    const navigate = (direction: 'prev' | 'next') => {
        setSlideDirection(direction === 'next' ? 'right' : 'left');
        const newDate = new Date(currentDate);
        if (viewMode === 'day') newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate);
    };
    const timeOptions: string[] = []; for (let h = 8; h <= 19; h++) { ['00', '10', '20', '30', '40', '50'].forEach(m => { if (h === 19 && m !== '00') return; timeOptions.push(`${String(h).padStart(2, '0')}:${m}`); }); }



    // --- SIDE-BY-SIDE LAYOUT ALGORITHM ---
    // --- SIDE-BY-SIDE LAYOUT ALGORITHM ---
    const getLayout = useCallback((dayApps: Appointment[]) => {
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
        const layoutResult: { app: Appointment, left: string, width: string, zIndex: number, topOffset: number, index: number, totalCount: number }[] = [];
        clusters.forEach(cluster => {
            // Cascading Layout: All overlapping items form a single group
            // We shift each item slightly right and down to reveal headers
            cluster.forEach((node, index) => {
                const count = cluster.length;
                // If it's a cluster, we cascade. If single, full width.
                const isStack = count > 1;

                layoutResult.push({
                    app: node.app,
                    left: isStack ? `${index * 15}%` : '0%', // Shift right for fan effect
                    width: isStack ? '85%' : '100%', // Fixed high width to ensure readability & force scroll if container allows
                    zIndex: 10 + index,
                    // Reverted topOffset (User Requirement: Strict Start Time)
                    topOffset: 0,
                    // Stats for Overflow Indicator
                    index: index,
                    totalCount: count
                });
            });
        });
        return layoutResult;
    }, []);

    // Updated Card with full requested info
    const AppointmentCard = ({ app, style, onClick, onContext, stackIndex, stackTotal }: { app: Appointment, style: any, onClick: any, onContext: any, stackIndex?: number, stackTotal?: number }) => {
        const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(srv => srv.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map((id: string) => services.find(s => s.id === id)).filter((x): x is Service => !!x) || []; const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase();

        // WARNING: DO NOT CHANGE COLORS - Service Color Mapping (Fixed by User Request)
        let colorClass = 'bg-blue-100 border-blue-200 text-blue-900'; // Default / Banho
        if (allServiceNames.includes('tosa normal')) colorClass = 'bg-orange-100 border-orange-200 text-orange-900';
        else if (allServiceNames.includes('tosa higi') || allServiceNames.includes('tosa higienica') || allServiceNames.includes('higi')) colorClass = 'bg-yellow-100 border-yellow-200 text-yellow-900';
        else if (allServiceNames.includes('tesoura')) colorClass = 'bg-pink-100 border-pink-200 text-pink-900';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) colorClass = 'bg-indigo-100 border-indigo-200 text-indigo-900';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) colorClass = 'bg-purple-100 border-purple-200 text-purple-900';

        // Calc Rating
        let starsValues: number[] = [];
        const petApps = appointments.filter(a => a.petId === app.petId && a.rating);
        if (petApps.length > 0) starsValues = petApps.map(a => a.rating || 0);
        const avgRating = starsValues.length > 0 ? starsValues.reduce((a, b) => a + b, 0) / starsValues.length : 0;

        return (
            <div style={style} className={`animate-pop absolute rounded-lg p-1.5 border shadow-sm ${colorClass} text-xs cursor-pointer btn-spring hover:shadow-md hover:scale-[1.05] hover:z-[100] transition-all overflow-hidden flex flex-col justify-start leading-none group min-w-[200px]`} onClick={(e) => { e.stopPropagation(); onClick(app); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext(e, app.id); }}>
                {/* Header: Client & Pet */}
                <div className="flex justify-between items-center mb-1 w-full">
                    <span className="font-bold truncate text-[11px] flex-1">{client?.name.split(' ')[0]} - {pet?.name}</span>
                    {avgRating > 0 && <div className="flex bg-white/60 px-1 rounded-md items-center ml-1"><Star size={8} className="fill-yellow-500 text-yellow-500" /><span className="text-[9px] font-bold ml-0.5 text-yellow-700">{avgRating.toFixed(1)}</span></div>}
                </div>

                {/* Body: Services */}
                <div className="flex flex-col gap-0.5 opacity-90 w-full">
                    {mainSvc && <div className="truncate font-semibold text-[10px]">{mainSvc.name}</div>}
                    {addSvcs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {addSvcs.map((s, i) => <span key={i} className="bg-white/40 px-1 rounded-[3px] text-[8px] truncate max-w-[80px]">{s.name}</span>)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const animationClass = slideDirection === 'right' ? 'animate-slide-right' : slideDirection === 'left' ? 'animate-slide-left' : '';
        const dateStr = currentDate.toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado'); const layoutItems = getLayout(dayApps);
        return (
            <div key={dateStr} className={`relative h-[1440px] bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex mx-1 ${animationClass}`}>
                <div className="w-14 bg-gray-50/50 backdrop-blur-sm border-r border-gray-100 flex-shrink-0 sticky left-0 z-10 flex flex-col"> {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (<div key={h} className="flex-1 border-b border-gray-100 text-[10px] text-gray-400 font-bold p-2 text-right relative"> <span className="-top-2.5 relative">{h}:00</span> </div>))} </div>
                <div className="flex-1 relative bg-[repeating-linear-gradient(0deg,transparent,transparent_119px,rgba(243,244,246,0.6)_120px)] overflow-x-auto"> {Array.from({ length: 60 }, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{ top: i * 20 }} />)}
                    {/* Overflow Indicators Layer */}
                    <div className="absolute top-0 right-0 h-full w-[60px] pointer-events-none z-50 flex flex-col items-end">
                        {layoutItems.filter((item: any) => item.index === 0 && item.totalCount > 2).map((item: any) => {
                            const startMin = (new Date(item.app.date).getHours() - 8) * 60 + new Date(item.app.date).getMinutes();
                            const top = startMin * 2;
                            return (
                                <div key={`overflow-${item.app.id}`} className="absolute right-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 animate-pulse" style={{ top: `${top + 5}px` }}>
                                    +{item.totalCount - 2} <ChevronRight size={10} />
                                </div>
                            );
                        })}
                    </div>
                    {layoutItems.map((item: any, idx) => {
                        const app = item.app; const d = new Date(app.date); const startMin = (d.getHours() - 8) * 60 + d.getMinutes();
                        const height = (app.durationTotal || 60) * 2;
                        const top = startMin * 2; // Strict time positioning

                        return (<AppointmentCard key={app.id} app={app} style={{ animationDelay: `${idx * 0.02}s`, top: `${top}px`, height: `${height}px`, left: item.left, width: item.width, zIndex: item.zIndex }} onClick={setDetailsApp} onContext={(e: any, id: string) => setContextMenu({ x: e.clientX, y: e.clientY, appId: id })} />);
                    })}
                    {/* Current Time Indicator */}
                    {nowMinutes >= 0 && nowMinutes <= 720 && (
                        <div className="absolute w-full border-t-2 border-red-500 border-dashed opacity-70 pointer-events-none z-20 flex items-center" style={{ top: `${nowMinutes * 2}px` }}>
                            <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-r shadow-sm absolute -top-2.5 left-0">Agora</div>
                            <div className="w-2 h-2 bg-red-500 rounded-full absolute -top-1 -right-1" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = new Date(currentDate); start.setDate(start.getDate() - start.getDay()); const days = [2, 3, 4, 5, 6];
        return (
            <div className="flex h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex-col mx-1">
                <div className="flex border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm"> <div className="w-10 bg-transparent border-r border-gray-100"></div> {days.map(dIdx => { const d = new Date(start); d.setDate(d.getDate() + dIdx); const dateStr = d.toISOString().split('T')[0]; const isToday = dateStr === new Date().toISOString().split('T')[0]; return (<div key={dIdx} onClick={() => setSelectedDayForDetails(dateStr)} className={`flex-1 text-center py-3 text-xs font-bold border-r border-gray-100 cursor-pointer hover:bg-brand-50/30 transition-colors ${isToday ? 'bg-brand-50/50 text-brand-600' : 'text-gray-500'}`}> {d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()} <div className={`text-sm mt-0.5 ${isToday ? 'text-brand-700' : 'text-gray-800'}`}>{d.getDate()}</div> </div>) })} </div>
                <div className="flex-1 overflow-y-auto relative flex"> <div className="w-10 bg-gray-50/30 border-r border-gray-100 flex-shrink-0 sticky left-0 z-10"> {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (<div key={h} className="h-[120px] border-b border-gray-100 text-[9px] text-gray-400 font-bold p-1 text-right relative bg-gray-50/30"> <span className="-top-2 relative">{h}</span> </div>))} </div> {days.map(dIdx => {
                    const d = new Date(start); d.setDate(d.getDate() + dIdx); const dateStr = d.toISOString().split('T')[0];
                    const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');

                    // Clustering Logic for Week View
                    const clusters: { start: number, end: number, apps: Appointment[] }[] = [];
                    dayApps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(app => {
                        const appStart = (new Date(app.date).getHours() - 8) * 60 + new Date(app.date).getMinutes();
                        const appEnd = appStart + (app.durationTotal || 60);

                        // Try to find an existing cluster this overlaps with
                        const existing = clusters.find(c => (appStart >= c.start && appStart < c.end) || (appStart <= c.start && appEnd > c.start));
                        if (existing) {
                            existing.apps.push(app);
                            existing.end = Math.max(existing.end, appEnd);
                        } else {
                            clusters.push({ start: appStart, end: appEnd, apps: [app] });
                        }
                    });

                    return (
                        <div key={dIdx} className="flex-1 border-r border-gray-50 relative min-w-[60px]">
                            {Array.from({ length: 60 }, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{ top: i * 20 }} />)}
                            {clusters.map((cluster, idx) => {
                                const mainApp = cluster.apps[0];
                                const count = cluster.apps.length;
                                const top = cluster.start * 2;
                                const height = (cluster.end - cluster.start) * 2;

                                return (
                                    <div key={mainApp.id} style={{ top: `${top}px`, height: `${height}px`, width: '95%', left: '2.5%' }} className="absolute z-10 transition-all hover:z-20">
                                        <AppointmentCard
                                            app={mainApp}
                                            style={{ width: '100%', height: '100%' }}
                                            onClick={setDetailsApp}
                                            onContext={(e: any, id: string) => setContextMenu({ x: e.clientX, y: e.clientY, appId: id })}
                                        />
                                        {count > 1 && (
                                            <div className="absolute -top-2 -right-2 bg-brand-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pop z-50 border-2 border-white" title={`${count} agendamentos neste horário`}>
                                                +{count - 1}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })} </div>
            </div>
        )
    }

    const renderMonthView = () => {
        const year = currentDate.getFullYear(); const month = currentDate.getMonth(); const firstDay = new Date(year, month, 1); const startDay = firstDay.getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const slots = []; for (let i = 0; i < startDay; i++) slots.push(null); for (let i = 1; i <= daysInMonth; i++) slots.push(new Date(year, month, i));
        return (<div className="h-full bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-1"> <div className="grid grid-cols-7 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200"> {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>)} </div> <div className="flex-1 grid grid-cols-7 auto-rows-fr"> {slots.map((date, idx) => { if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/30 border-b border-r border-gray-100" />; const dateStr = date.toISOString().split('T')[0]; const isToday = dateStr === new Date().toISOString().split('T')[0]; const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado').sort((a, b) => a.date.localeCompare(b.date)); return (<div key={idx} className={`border-b border-r border-gray-100 p-1 flex flex-col transition-colors cursor-pointer hover:bg-brand-50/30 ${isToday ? 'bg-orange-50/30' : ''}`} onClick={() => setSelectedDayForDetails(dateStr)}> <span className={`text-[10px] font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-brand-600 text-white shadow-md scale-110' : 'text-gray-500'}`}>{date.getDate()}</span> <div className="flex-1 overflow-hidden space-y-1"> {dayApps.slice(0, 3).map(app => (<div key={app.id} className="text-[9px] bg-white border border-gray-200 text-gray-700 rounded-md px-1.5 py-0.5 truncate font-medium shadow-sm"> {clients.find(c => c.id === app.clientId)?.pets.find(p => p.id === app.petId)?.name} </div>))} {dayApps.length > 3 && <div className="text-[8px] text-gray-400 pl-1 font-medium">+ {dayApps.length - 3} mais</div>} </div> </div>) })} </div> </div>)
    };

    return (
        <div className="space-y-3 animate-fade-in relative h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 flex-shrink-0 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                    <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
                        <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all btn-spring ${viewMode === 'day' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Dia</button>
                        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all btn-spring ${viewMode === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Semana</button>
                        <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all btn-spring ${viewMode === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Mês</button>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronLeft size={18} /></button>
                        <div className="relative min-w-[100px] text-center cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors group">
                            <span className="text-sm font-bold text-gray-800 group-hover:text-brand-600 block truncate">
                                {formatDateWithWeek(currentDate.toISOString().split('T')[0])}
                            </span>
                            <input
                                type="date"
                                value={currentDate.toISOString().split('T')[0]}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [y, m, d] = e.target.value.split('-').map(Number);
                                        setCurrentDate(new Date(y, m - 1, d));
                                    }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            />
                        </div>
                        <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronRight size={18} /></button>
                    </div>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-brand-200 hover:bg-brand-700 active:scale-95 transition flex items-center justify-center gap-1.5 text-xs">
                    <Plus size={18} /> Novo Agendamento
                </button>
            </div>

            <div className="flex-1 min-h-0 relative overflow-hidden">
                {viewMode === 'day' && <div className="h-full overflow-y-auto">{renderDayView()}</div>}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'month' && renderMonthView()}

                {contextMenu && (
                    <div className="fixed bg-white shadow-xl border border-gray-200 rounded-xl z-[100] py-1 min-w-[160px] overflow-hidden"
                        style={{ top: contextMenu.y, left: contextMenu.x }}>
                        <button onClick={() => handleStartEdit(appointments.find(a => a.id === contextMenu.appId)!)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 font-medium border-b border-gray-50">
                            <Edit2 size={16} /> Editar
                        </button>
                        <button onClick={handleDeleteFromContext} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium">
                            <Trash2 size={16} /> Excluir
                        </button>
                    </div>
                )}
            </div>

            {detailsApp && createPortal((() => {
                const client = clients.find(c => c.id === detailsApp.clientId);
                const pet = client?.pets.find(p => p.id === detailsApp.petId);
                const s = services.find(srv => srv.id === detailsApp.serviceId);
                const addSvcs = detailsApp.additionalServiceIds?.map(id => services.find(srv => srv.id === id)).filter(x => x);
                const rating = detailsApp.rating;
                const tags = detailsApp.ratingTags;

                return (
                    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailsApp(null)}>
                        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setDetailsApp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={20} /></button>

                            {(rating || tags) && (
                                <div className="flex justify-center flex-col items-center mb-6 bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100">
                                    <div className="flex text-yellow-500 mb-2 drop-shadow-sm">
                                        {[1, 2, 3, 4, 5].map(st => <Star key={st} size={24} className={(rating || 0) >= st ? "fill-current" : "text-gray-200"} strokeWidth={(rating || 0) >= st ? 0 : 2} />)}
                                    </div>
                                    {tags && tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {tags.map(t => <span key={t} className="px-3 py-1 bg-white text-yellow-700 rounded-full text-xs font-bold shadow-sm border border-yellow-100">{t}</span>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mb-6 text-center">
                                <h3 className="text-2xl font-bold text-gray-800">{pet?.name}</h3>
                                <p className="text-gray-500 font-medium">{client?.name}</p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm mb-6">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Phone size={16} /></div><span className="font-medium text-gray-700">{client?.phone}</span></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><MapPin size={16} /></div><span className="font-medium text-gray-700 truncate">{client?.address} {client?.complement}</span></div>
                                <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><FileText size={16} /></div><span className="font-medium italic text-gray-600 pt-1">{
                                    (() => {
                                        let displayNote = detailsApp.notes || pet?.notes || 'Sem obs';
                                        displayNote = displayNote.replace(/\[Avaliação: \d+\/5\]/g, '').replace(/\[Tags: .*?\]/g, '').trim();
                                        return displayNote || 'Sem obs';
                                    })()
                                }</span></div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Serviços</h4>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-xs font-bold shadow-sm">{s?.name}</span>
                                    {addSvcs?.map(as => <span key={as?.id} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">{as?.name}</span>)}
                                </div>
                            </div>

                            <button onClick={() => { setDetailsApp(null); handleStartEdit(detailsApp); }} className="w-full py-3.5 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-95 transition shadow-lg shadow-brand-200"><Edit2 size={18} /> Editar Agendamento</button>
                        </div>
                    </div>
                );
            })(), document.body)}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center md:p-6 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#ffffff] md:rounded-3xl rounded-none w-full max-w-6xl h-[100dvh] md:h-[90vh] md:max-h-[800px] shadow-2xl flex flex-col overflow-hidden animate-scale-up ring-1 ring-black/5 font-sans">
                        {/* Header */}
                        <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                            <div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{editingAppId ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
                                <p className="text-xs md:text-sm text-gray-400 font-medium mt-0.5">Preencha os detalhes do serviço abaixo</p>
                            </div>
                            <button onClick={resetForm} className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all duration-300"><X size={24} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-gray-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto h-full">

                                {/* LEFT COLUMN: Client & Pet (40%) */}
                                <div className="lg:col-span-5 space-y-6 flex flex-col h-full">
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100/80 flex-1 flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center"><User size={20} /></div>
                                            <h3 className="text-lg font-bold text-gray-800">Cliente & Pet</h3>
                                        </div>

                                        <div className="space-y-6 flex-1">
                                            {/* Client Search */}
                                            <div className="relative group z-30">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Buscar Cliente</label>
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                                    <input
                                                        type="text"
                                                        placeholder="Nome, telefone ou pet..."
                                                        value={clientSearch}
                                                        onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setSelectedPetIds([]); }}
                                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl text-sm font-semibold text-gray-700 outline-none transition-all placeholder:font-normal placeholder:text-gray-400"
                                                    />
                                                </div>

                                                {/* Dropdown Results */}
                                                {clientSearch && !selectedClient && (
                                                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-2xl mt-2 border border-gray-100 max-h-64 overflow-y-auto custom-scrollbar animate-slide-up-sm">
                                                        {filteredClients.length > 0 ? (
                                                            filteredClients.map(c => (
                                                                <div key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(c.name); }} className="p-4 hover:bg-brand-50/30 cursor-pointer border-b border-gray-50 last:border-0 transition-colors group/item">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-bold text-gray-800 group-hover/item:text-brand-700 transition-colors">{c.name}</span>
                                                                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{c.phone}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 flex-wrap mt-1.5">
                                                                        {c.pets.slice(0, 5).map(p => (
                                                                            <span key={p.id} className="text-[11px] bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-md font-bold shadow-sm">{p.name}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-8 text-center text-gray-400 text-sm font-medium flex flex-col items-center gap-2">
                                                                <AlertCircle size={24} className="opacity-20" />
                                                                Nenhum cliente encontrado
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selected Client Display */}
                                            {selectedClient && (
                                                <div className="animate-fade-in space-y-6">
                                                    <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-white text-brand-600 flex items-center justify-center font-bold text-lg shadow-sm">{selectedClient.name[0]}</div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{selectedClient.name}</h4>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                                <Phone size={12} /> {selectedClient.phone}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                                <MapPin size={12} /> {selectedClient.address || 'Sem endereço'}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => { setSelectedClient(null); setSelectedPetIds([]); setClientSearch(''); }} className="ml-auto text-gray-400 hover:text-red-500 transition"><X size={16} /></button>
                                                    </div>

                                                    {/* Pet Selection Grid */}
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block ml-1">Selecionar Pet</label>
                                                        <div className="space-y-2">
                                                            {selectedClient.pets.map(p => {
                                                                const pApps = appointments.filter(a => a.petId === p.id && a.rating);
                                                                const pAvg = pApps.length > 0 ? pApps.reduce((acc, curr) => acc + (curr.rating || 0), 0) / pApps.length : 0;
                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            if (selectedPetIds.includes(p.id)) {
                                                                                setSelectedPetIds(prev => prev.filter(id => id !== p.id));
                                                                            } else {
                                                                                setSelectedPetIds(prev => [...prev, p.id]);
                                                                            }
                                                                        }}
                                                                        className={`group p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between ${selectedPetIds.includes(p.id)
                                                                            ? 'border-brand-500 bg-brand-50 shadow-md transform scale-[1.02]'
                                                                            : 'border-gray-100 hover:border-brand-200 bg-white hover:bg-gray-50'}`}
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedPetIds.includes(p.id) ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-500'}`}>
                                                                                <PawPrint size={18} />
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <h5 className={`font-bold text-sm ${selectedPetIds.includes(p.id) ? 'text-brand-900' : 'text-gray-700'}`}>{p.name}</h5>
                                                                                    {pAvg > 0 && (
                                                                                        <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                                                                                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                                                                            <span className="text-[10px] font-bold text-yellow-600">{pAvg.toFixed(1)}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-xs text-gray-500 font-medium">{p.breed} • {p.size || '?'} • {p.coat || '?'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPetIds.includes(p.id) ? 'border-brand-500 bg-brand-500' : 'border-gray-200'}`}>
                                                                            {selectedPetIds.includes(p.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            <button className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-bold text-xs hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/50 transition-all flex items-center justify-center gap-2">
                                                                <Plus size={16} /> Adicionar Novo Pet
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Services & Details (60%) */}
                                <div className="lg:col-span-7 space-y-6 flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100/80 p-6 relative">
                                    {!selectedPetIds.length && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-3xl">
                                            <div className="text-gray-400 font-medium flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100">
                                                <ArrowRightLeft size={16} /> Selecione pelo menos um pet
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Date & Time */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><CalendarIcon size={16} /></div>
                                                <h3>Data e Hora</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute left-3 top-2">Data</label>
                                                    <input
                                                        type="date"
                                                        value={date}
                                                        onChange={e => setDate(e.target.value)}
                                                        className="w-full pt-6 pb-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute left-3 top-2">Horário</label>
                                                    <input
                                                        type="time"
                                                        value={time}
                                                        onChange={e => setTime(e.target.value)}
                                                        className="w-full pt-6 pb-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute left-3 top-2">Duração Estimada</label>
                                                    <select
                                                        value={manualDuration}
                                                        onChange={e => setManualDuration(Number(e.target.value))}
                                                        className="w-full pt-6 pb-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value={0}>Automático (Soma dos serviços)</option>
                                                        {Array.from({ length: 10 }, (_, i) => (i + 1) * 30).map(min => {
                                                            const h = Math.floor(min / 60);
                                                            const m = min % 60;
                                                            const label = h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}` : `${m}min`;
                                                            return <option key={min} value={min}>{label}</option>;
                                                        })}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Services */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                                                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Scissors size={16} /></div>
                                                <h3>Serviços</h3>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase absolute left-3 top-2">Serviço Principal</label>
                                                    <select
                                                        value={selectedService}
                                                        onChange={e => setSelectedService(e.target.value)}
                                                        className="w-full pt-6 pb-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer hover:bg-white"
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {getApplicableServices('principal').map(s => (<option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                                </div>

                                                <div>
                                                    {/* Selected Chips */}
                                                    {selectedAddServices.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {selectedAddServices.map(id => {
                                                                const s = services.find(srv => srv.id === id);
                                                                if (!s) return null;
                                                                return (
                                                                    <div key={id} className="flex items-center gap-1 pl-3 pr-1 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 shadow-sm animate-scale-up-sm">
                                                                        <span>{s.name}</span>
                                                                        <span className="opacity-60 text-[10px]">+R${s.price}</span>
                                                                        <button onClick={() => setSelectedAddServices(prev => prev.filter(pid => pid !== id))} className="p-1 hover:bg-white/50 rounded-md transition-colors text-purple-800"><X size={12} /></button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Add Dropdown */}
                                                    <div className="relative">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase absolute left-3 top-2">Adicionar Extra</label>
                                                        <select
                                                            value=""
                                                            onChange={e => {
                                                                if (e.target.value) {
                                                                    setSelectedAddServices(prev => [...prev, e.target.value]);
                                                                }
                                                            }}
                                                            className="w-full pt-6 pb-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer hover:bg-white"
                                                        >
                                                            <option value="">Selecione para adicionar...</option>
                                                            {(() => {
                                                                const available = getApplicableServices('adicional').filter(s => !selectedAddServices.includes(s.id));
                                                                // Deduplicate by name
                                                                const uniqueAvailable = Array.from(new Map(available.map(s => [s.name, s])).values());

                                                                return uniqueAvailable.map(s => (<option key={s.id} value={s.id}>{s.name} (+R$ {s.price})</option>));
                                                            })()}
                                                        </select>
                                                        <Plus className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold">
                                            <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><FileText size={16} /></div>
                                            <h3>Observações</h3>
                                        </div>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="w-full flex-1 bg-yellow-50/50 hover:bg-yellow-50 border border-yellow-100 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 rounded-2xl p-4 text-sm outline-none transition-all resize-none font-medium text-gray-700 placeholder:text-gray-400 leading-relaxed"
                                            placeholder="Detalhes especiais, alergias, comportamento..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 bg-white z-20 flex justify-between items-center">
                            <div className="hidden md:block">
                                {selectedService && (
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Estimado</span>
                                        <span className="text-2xl font-black text-brand-600">
                                            R$ {(
                                                (services.find(s => s.id === selectedService)?.price || 0) +
                                                selectedAddServices.reduce((acc, id) => acc + (services.find(s => s.id === id)?.price || 0), 0)
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button onClick={resetForm} className="flex-1 md:flex-none px-8 py-4 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors text-sm">Cancelar</button>
                                <button
                                    onClick={handleSave}
                                    disabled={!selectedClient || selectedPetIds.length === 0 || !selectedService}
                                    className="flex-1 md:flex-none px-10 py-4 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-200 hover:shadow-brand-300 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    <Check size={20} strokeWidth={3} />
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body)}
            {/* Day Details Modal */}
            {selectedDayForDetails && createPortal(
                <DayDetailsModal
                    isOpen={!!selectedDayForDetails}
                    onClose={() => setSelectedDayForDetails(null)}
                    date={selectedDayForDetails || ''}
                    appointments={appointments.filter(a => a.date.startsWith(selectedDayForDetails || '') && a.status !== 'cancelado')}
                    clients={clients}
                    services={services}
                />,
                document.body
            )}
        </div>
    );
};

// --- MENU VIEW (Mobile Only - 4th Tab) ---
// --- MENU VIEW (Mobile Only - 4th Tab) ---
const MenuView: React.FC<{ setView: (v: ViewState) => void, onOpenSettings: () => void }> = ({ setView, onOpenSettings }) => {
    const MenuCard = ({ icon: Icon, title, onClick, colorClass }: any) => (
        <button onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 aspect-square active:scale-95 transition">
            <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center text-white`}><Icon size={24} /></div>
            <span className="font-bold text-gray-700 text-sm">{title}</span>
        </button>
    );

    return (
        <div className="space-y-6 animate-fade-in p-4 max-w-md mx-auto h-full flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">Menu</h1>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
                <button onClick={() => setView('services')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 active:scale-95 transition-all hover:shadow-md hover:-translate-y-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Scissors size={32} /></div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-gray-800">Serviços</span>
                        <span className="text-sm text-gray-400 font-medium">Gerenciar catálogo de preços</span>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" />
                </button>

                <button onClick={() => setView('revenue')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 active:scale-95 transition-all hover:shadow-md hover:-translate-y-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><TrendingUp size={32} /></div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-gray-800">Faturamento</span>
                        <span className="text-sm text-gray-400 font-medium">Relatórios de ganhos</span>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" />
                </button>

                <button onClick={() => setView('costs')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 active:scale-95 transition-all hover:shadow-md hover:-translate-y-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><TrendingDown size={32} /></div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-gray-800">Custo Mensal</span>
                        <span className="text-sm text-gray-400 font-medium">Despesas e saídas</span>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" />
                </button>



                <button onClick={onOpenSettings} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 active:scale-95 transition-all hover:shadow-md hover:-translate-y-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Settings size={32} /></div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-gray-800">Configurações</span>
                        <span className="text-sm text-gray-400 font-medium">Tema e preferências</span>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" />
                </button>                <button onClick={() => setView('clients')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 active:scale-95 transition-all hover:shadow-md hover:-translate-y-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Users size={32} /></div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-gray-800">Clientes</span>
                        <span className="text-sm text-gray-400 font-medium">Gerenciar cadastros</span>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" />
                </button>

                <button onClick={() => setView('inactive_clients')} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 active:scale-95 transition-all hover:shadow-md hover:-translate-y-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><UserX size={32} /></div>
                    <div className="text-left">
                        <span className="block text-xl font-bold text-gray-800">Painel de Inativos</span>
                        <span className="text-sm text-gray-400 font-medium">Clientes ausentes &gt; 15 dias</span>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" />
                </button>


            </div>

            <p className="text-center text-xs text-gray-300 font-medium mt-auto">Versão 1.2.0 • PetGestor AI</p>
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
    const [contactLogs, setContactLogs] = useState<{ clientId: string, date: string }[]>([]);
    const [isConfigured, setIsConfigured] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({ appName: 'PomPomPet', logoUrl: '', theme: 'rose', sidebarOrder: ['operacional', 'cadastros', 'gerencial'], darkMode: false });
    const [petDetailsData, setPetDetailsData] = useState<{ pet: Pet, client: Client } | null>(null);

    // --- DARK MODE EFFECT ---
    useEffect(() => {
        if (settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.darkMode]);
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


    // Apply Theme & Dark Mode
    useEffect(() => {
        const root = document.documentElement;

        // Dark Mode Logic
        if (settings.darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Theme Color Logic
        const themeColors: Record<string, string> = {
            rose: '#e11d48',
            blue: '#2563eb',
            purple: '#9333ea',
            green: '#16a34a',
            orange: '#ea580c'
        };

        const color = themeColors[settings.theme || 'rose'];
        if (color) {
            root.style.setProperty('--brand-600', color);
        }

    }, [settings.theme, settings.darkMode]);

    const handleSyncContactLogs = async (token: string, silent = false) => {
        if (!token || !SHEET_ID) return;
        try {
            const rows = await googleService.getSheetValues(token, SHEET_ID, 'Painel de inativos!A:D');
            if (!rows || rows.length < 2) return;
            const newLogs: { clientId: string, date: string }[] = [];
            rows.slice(1).forEach((row: string[]) => {
                // A: DATA/hora, D: TELEFONE
                const dateStr = row[0];
                const phone = row[3];
                if (!dateStr || !phone) return;

                let isoDate = new Date().toISOString();
                try {
                    // Extract date part dd/mm/yyyy
                    const [datePart, timePart] = dateStr.split(' ');
                    const [d, m, y] = datePart.split('/');
                    if (d && m && y) {
                        isoDate = new Date(`${y}-${m}-${d}T${timePart || '00:00:00'}`).toISOString();
                        newLogs.push({ clientId: phone.replace(/\D/g, ''), date: isoDate });
                    }
                } catch (e) { console.log('Error parsing date', dateStr); }
            });
            setContactLogs(newLogs);
            if (!silent && newLogs.length > 0) console.log(`${newLogs.length} contact logs synced.`);
        } catch (e) { console.error("Sync Logs Error", e); }
    };

    const performFullSync = async (token: string) => { if (!SHEET_ID) return; setIsGlobalLoading(true); try { await handleSyncServices(token, true); await handleSyncClients(token, true); await handleSyncAppointments(token, true); await handleSyncCosts(token, true); await handleSyncContactLogs(token, true); } catch (e) { console.error("Auto Sync Failed", e); } finally { setIsGlobalLoading(false); } }

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
        if (!token || !SHEET_ID) return; try {
            const rows = await googleService.getSheetValues(token, SHEET_ID, 'Agendamento!A:T'); if (!rows || rows.length < 5) { if (!silent) alert('Aba Agendamento vazia (Linhas 1-4 ignoradas).'); return; } const loadedApps: Appointment[] = []; const newTempClients: Client[] = []; const currentClients = db.getClients(); const existingClientIds = new Set(currentClients.map(c => c.id)); rows.forEach((row: string[], idx: number) => {
                if (idx < 4) return; const petName = row[0]; const clientName = row[1]; const clientPhone = row[2] || ''; const clientAddr = row[3] || ''; const petBreed = row[4]; const datePart = row[11]; const timePart = row[12]; const serviceName = row[7]; const paidAmountStr = row[16]; const paymentMethod = row[17]; const googleEventId = row[19]; if (!clientName || !datePart) return; let isoDate = new Date().toISOString(); try { const [day, month, year] = datePart.split('/'); if (day && month && year) isoDate = `${year}-${month}-${day}T${timePart || '00:00'}`; } catch (e) { } const cleanPhone = clientPhone.replace(/\D/g, '') || `temp_${idx}`; let client = currentClients.find(c => c.id === cleanPhone) || currentClients.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || newTempClients.find(c => c.id === cleanPhone); if (!client) { client = { id: cleanPhone, name: clientName, phone: clientPhone, address: clientAddr, pets: [] }; newTempClients.push(client); } let pet = client.pets.find(p => p.name.toLowerCase() === petName?.toLowerCase()); if (!pet && petName) { pet = { id: `${client.id}_p_${idx}`, name: petName, breed: petBreed || 'SRD', age: '', gender: '', size: row[5] || '', coat: row[6] || '', notes: row[13] || '' }; client.pets.push(pet); } const currentServices = db.getServices(); const service = currentServices.find(s => s.name.toLowerCase() === serviceName?.toLowerCase()) || currentServices[0]; const addServiceIds: string[] = [];[row[8], row[9], row[10]].forEach(name => { if (name) { const foundSvc = currentServices.find(s => s.name.toLowerCase() === name.toLowerCase().trim()); if (foundSvc) addServiceIds.push(foundSvc.id); } }); let paidAmount = 0;
                if (paidAmountStr) { paidAmount = parseFloat(paidAmountStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')); if (isNaN(paidAmount)) paidAmount = 0; }

                // Parse Rating logic
                let rating = 0;
                let ratingTags: string[] = [];
                const notes = row[13] || '';
                const ratingMatch = notes.match(/\[Avaliação: (\d+)\/5\]/);
                if (ratingMatch && ratingMatch[1]) rating = parseInt(ratingMatch[1]);
                const tagsMatch = notes.match(/\[Tags: (.*?)\]/);
                if (tagsMatch && tagsMatch[1]) { ratingTags = tagsMatch[1].split(',').map(t => t.trim()); }

                let status: Appointment['status'] = 'agendado';
                const statusRaw = row[15]?.toLowerCase().trim() || '';
                if (statusRaw === 'não veio' || statusRaw === 'nao_veio') {
                    status = 'nao_veio';
                } else if (statusRaw === 'pago') {
                    status = 'agendado'; // App considers paid via paidAmount, but let's keep status simple
                }

                if (client && pet) { loadedApps.push({ id: `sheet_${idx}`, clientId: client.id, petId: pet.id, serviceId: service?.id || 'unknown', additionalServiceIds: addServiceIds, date: isoDate, status: status, notes: row[13], durationTotal: parseInt(row[14] || '60'), paidAmount: paidAmount > 0 ? paidAmount : undefined, paymentMethod: paymentMethod as any, googleEventId: googleEventId, rating: rating > 0 ? rating : undefined, ratingTags: ratingTags.length > 0 ? ratingTags : undefined }); }
            }); if (newTempClients.length > 0) { const updatedClients = [...currentClients, ...newTempClients.filter(nc => !existingClientIds.has(nc.id))]; setClients(updatedClients); db.saveClients(updatedClients); } if (loadedApps.length > 0) { setAppointments(loadedApps); db.saveAppointments(loadedApps); if (!silent) alert(`${loadedApps.length} agendamentos carregados!`); } else { if (!silent) alert('Nenhum agendamento encontrado.'); }
        } catch (error) { console.error(error); if (!silent) alert('Erro ao sincronizar agendamentos.'); }
    };
    const handleAddAppointment = async (appOrApps: Appointment | Appointment[], client: Client, pet: Pet, appServices: Service[], manualDuration: number) => {
        const appsToAdd = Array.isArray(appOrApps) ? appOrApps : [appOrApps];
        const newAppsWithEvents: Appointment[] = [];

        // 1. Process Google Calendar Creation for each
        for (const app of appsToAdd) {
            let googleEventId = '';
            const totalDuration = manualDuration > 0 ? manualDuration : (appServices[0] ? appServices[0].durationMin : 60) + (appServices.length > 1 ? appServices.slice(1).reduce((acc, s) => acc + (s.durationMin || 0), 0) : 0);

            if (accessToken) {
                const description = appServices.map(s => s.name).join(' + ');
                const googleResponse = await googleService.createEvent(accessToken, { summary: `Banho/Tosa: ${pet.name}`, description: `${description}\nCliente: ${client.name}\nTel: ${client.phone}\nObs: ${app.notes}`, startTime: app.date, durationMin: totalDuration });
                if (googleResponse) googleEventId = googleResponse.id;
            }
            newAppsWithEvents.push({ ...app, googleEventId, durationTotal: totalDuration });
        }

        // 2. Batch Update Local State
        const updatedApps = [...appointments, ...newAppsWithEvents];
        setAppointments(updatedApps);
        db.saveAppointments(updatedApps);

        // 3. Batch Update Google Sheets
        if (accessToken && SHEET_ID) {
            for (const app of newAppsWithEvents) {
                try {
                    const d = new Date(app.date); const dateStr = d.toLocaleDateString('pt-BR'); const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const mainSvc = appServices[0];
                    const rowData = [
                        pet.name, client.name, client.phone, client.address, pet.breed, pet.size, pet.coat, mainSvc.name,
                        appServices[1] ? appServices[1].name : '', appServices[2] ? appServices[2].name : '', appServices[3] ? appServices[3].name : '',
                        dateStr, timeStr, app.notes || '', (app.durationTotal || 60).toString(), 'Pendente', '', '', '', app.googleEventId
                    ];
                    await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:T', rowData);
                } catch (e) { console.error(e); }
            }
            // Silent Sync to update IDs just once after batch? Or maybe just rely on local for now.
            // Let's do a sync to be safe, but it might race if sheets API is slow. 
            // Better to sync.
            handleSyncAppointments(accessToken, true);
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
                const parts = app.id.split('_'); const index = parseInt(parts[1]); const rowNumber = index + 1;
                const d = new Date(app.date); const dateStr = d.toLocaleDateString('pt-BR'); const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const mainSvc = appServices[0];
                const rowData = [
                    pet.name, client.name, client.phone, client.address, pet.breed, pet.size, pet.coat, mainSvc.name,
                    appServices[1] ? appServices[1].name : '', appServices[2] ? appServices[2].name : '', appServices[3] ? appServices[3].name : '',
                    dateStr, timeStr, app.notes || '', totalDuration.toString(), (app.status === 'nao_veio' ? 'Não Veio' : (app.paidAmount ? 'Pago' : 'Pendente')), '', app.paidAmount ? app.paidAmount.toString().replace('.', ',') : '', app.paymentMethod || '', googleEventId
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
                const parts = id.split('_'); const index = parseInt(parts[1]); const rowNumber = index + 1;
                await googleService.clearSheetValues(accessToken, SHEET_ID, `Agendamento!A${rowNumber}:T${rowNumber}`);
            } catch (e) { console.error(e); }
        }
    };

    const handleRemovePayment = async (app: Appointment) => {
        if (!confirm('Tem certeza que deseja remover este pagamento? O status voltará para Pendente.')) return;
        const updatedApps = appointments.map(a => {
            if (a.id === app.id) {
                return { ...a, paidAmount: 0, paymentMethod: '' as any };
            }
            return a;
        });
        setAppointments(updatedApps); db.saveAppointments(updatedApps);
        if (app.id.startsWith('sheet_') && accessToken && SHEET_ID) {
            try {
                const idx = parseInt(app.id.split('_')[1]);
                if (!isNaN(idx)) {
                    const row = idx + 1;
                    await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!P${row}:R${row}`, [['Pendente', '', '']]);
                }
            } catch (e) { console.error("Erro ao limpar pagamento:", e); alert("Erro ao sincronizar cancelamento de pagamento."); }
        }
    };

    const handleNoShow = async (app: Appointment) => {
        if (!confirm('Tem certeza que deseja marcar este agendamento como "Não Compareceu"?')) return;

        const updatedApps = appointments.map((a): Appointment => {
            if (a.id === app.id) {
                return { ...a, status: 'nao_veio' };
            }
            return a;
        });
        setAppointments(updatedApps);
        db.saveAppointments(updatedApps);

        if (app.id.startsWith('sheet_') && accessToken && SHEET_ID) {
            try {
                const idx = parseInt(app.id.split('_')[1]);
                if (!isNaN(idx)) {
                    const row = idx + 1; // Sheet rows are 1-indexed, and we skip header rows
                    // Assuming status is in column P (index 15)
                    await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!P${row}:P${row}`, [['Não Veio']]);
                    // Add Note if needed, logic copied from old handler if notes update is desired
                    const note = `${app.notes || ''} [NÃO VEIO]`.trim();
                    await googleService.updateSheetValues(accessToken, SHEET_ID, `Agendamento!N${row}`, [note]);
                }
            } catch (e) {
                console.error("Erro ao marcar como 'Não Compareceu' na planilha:", e);
                alert("Erro ao sincronizar status 'Não Compareceu' na planilha.");
            }
        }
    };

    const handleUpdateStatus = (id: string, status: Appointment['status']) => {
        const updated = appointments.map(a => a.id === id ? { ...a, status } : a);
        setAppointments(updated);
        db.saveAppointments(updated);
    }

    const handleMarkContacted = async (client: Client, daysInactive: number) => {
        if (!accessToken || !SHEET_ID) {
            alert("Erro: Não conectado ao Google Sheets.");
            return;
        }

        try {
            const pet = client.pets[0];
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR');
            const timeStr = now.toLocaleTimeString('pt-BR');

            // Columns: DATA/hora, Pet, Cliente, TELEFONE, ENDERECO, ANIMAL/RACA, STATUS
            const rowData = [
                `${dateStr} ${timeStr}`,
                pet?.name || '?',
                client.name,
                client.phone,
                client.address,
                `${pet?.name || ''}/${pet?.breed || ''}`,
                'Contactado'
            ];

            // Append to "Painel de inativos" sheet - Try/Catch specific for sheet existence
            await googleService.appendSheetValues(accessToken, SHEET_ID, 'Painel de inativos!A:G', rowData);
            alert(`Cliente ${client.name} registrado como contactado!`);
            // Update local logs immediately so UI refreshes
            setContactLogs(prev => [...prev, { clientId: client.id, date: new Date().toISOString() }]);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar na planilha. Verifique se a aba 'Painel de inativos' existe.");
        }
    };

    // --- PIN LOGIC Handlers ---
    const handlePinUnlock = (input: string) => { if (input === pin) { setIsPinUnlocked(true); return true; } return false; };
    const handleSetPin = (newPin: string) => { localStorage.setItem('petgestor_pin', newPin); setPin(newPin); setIsPinUnlocked(true); };

    if (!isConfigured) return <SetupScreen onSave={handleSaveConfig} />;

    if (!googleUser) return <LoginScreen onLogin={googleService.login} onReset={handleResetConfig} settings={settings} googleLoaded={googleLoaded} />;

    // if (isGlobalLoading) return <div className="min-h-screen flex flex-col items-center justify-center bg-brand-50"><Loader2 size={48} className="text-brand-600 animate-spin mb-4" /><p className="text-brand-700 font-bold animate-pulse">Sincronizando dados...</p></div>;

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
                isLoading={isGlobalLoading}
                onManualRefresh={async () => { if (accessToken) await performFullSync(accessToken); else window.location.reload(); }}
            >
                {currentView === 'home' && <RevenueView appointments={appointments} services={services} clients={clients} costs={costs} defaultTab="daily" onRemovePayment={handleRemovePayment} onNoShow={handleNoShow} onViewPet={(pet, client) => setPetDetailsData({ pet, client })} />}
                {currentView === 'revenue' && <RevenueView appointments={appointments} services={services} clients={clients} costs={costs} defaultTab="monthly" onRemovePayment={handleRemovePayment} onNoShow={handleNoShow} onViewPet={(pet, client) => setPetDetailsData({ pet, client })} />}
                {currentView === 'costs' && <CostsView costs={costs} />}
                {currentView === 'payments' && <PaymentManager appointments={appointments} clients={clients} services={services}
                    onUpdateAppointment={handleUpdateApp}
                    onRemovePayment={handleRemovePayment}
                    onNoShow={handleNoShow}
                    onViewPet={(pet, client) => setPetDetailsData({ pet, client })}
                    accessToken={accessToken}
                    sheetId={SHEET_ID}
                />}
                {currentView === 'clients' && <ClientManager clients={clients} appointments={appointments} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />}
                {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} onSyncServices={(s) => accessToken && handleSyncServices(accessToken, s)} accessToken={accessToken} sheetId={SHEET_ID} />}
                {currentView === 'schedule' && <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onEdit={handleEditAppointment} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteAppointment} googleUser={googleUser} />}
                {currentView === 'menu' && <MenuView setView={setCurrentView} onOpenSettings={() => setIsSettingsOpen(true)} />}
                {currentView === 'inactive_clients' && <InactiveClientsView clients={clients} appointments={appointments} services={services} contactLogs={contactLogs} onMarkContacted={handleMarkContacted} onBack={() => setCurrentView('menu')} onViewPet={(pet, client) => setPetDetailsData({ pet, client })} />}
                {currentView === 'packages' && <PackageControlView clients={clients} appointments={appointments} services={services} onViewPet={(pet, client) => setPetDetailsData({ pet, client })} />}
            </Layout>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={(s) => { setSettings(s); localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s)); }} />
            <PetDetailsModal
                isOpen={!!petDetailsData}
                onClose={() => setPetDetailsData(null)}
                pet={petDetailsData?.pet || null}
                client={petDetailsData?.client || null}
                appointments={appointments}
            />
        </HashRouter>
    );
}

export default App;
