
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
  ShoppingBag, Tag, User, Key, Unlock, Save, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, CartesianGrid, Legend, ComposedChart, LabelList, PieChart, Pie
} from 'recharts';

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';

// --- SUB-COMPONENTS ---

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
                    <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Ex: 1234...apps.googleusercontent.com" className="w-full border p-3 rounded-lg focus:ring-2 ring-brand-500 outline-none font-mono text-sm" />
                </div>
                <button onClick={() => { if(clientId.trim().length > 10) onSave(clientId); else alert("ID inválido"); }} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition">Salvar e Continuar</button>
            </div>
        </div>
    );
};

// 2. Login Screen
const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void }> = ({ onLogin, onReset }) => {
    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-brand-100">
                <div className="w-full flex justify-center mb-6">
                    <img src="/logo.png" alt="PomPomPet" className="w-48 h-auto object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">PomPomPet</h1>
                <p className="text-gray-500 mb-8">Faça login para acessar sua agenda e clientes.</p>
                <button onClick={onLogin} className="w-full bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all group mb-6">
                    <div className="bg-white p-1 rounded-full"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" /></div>
                    Entrar com Google
                </button>
                <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-red-500 underline">Alterar ID do Cliente</button>
            </div>
        </div>
    );
};

// 3. Pin Guard
const PinGuard: React.FC<{ isUnlocked: boolean; onUnlock: (pin: string) => boolean; onSetPin: (pin: string) => void; hasPin: boolean; onReset: () => void; }> = ({ isUnlocked, onUnlock, onSetPin, hasPin, onReset }) => {
    const [inputPin, setInputPin] = useState(''); const [confirmPin, setConfirmPin] = useState(''); const [mode, setMode] = useState<'enter' | 'create' | 'confirm'>(hasPin ? 'enter' : 'create'); const [error, setError] = useState('');
    const handleDigit = (d: string) => { if (inputPin.length < 4) { const newVal = inputPin + d; setInputPin(newVal); if (newVal.length === 4) setTimeout(() => processPin(newVal), 200); } };
    const processPin = (val: string) => { setError(''); if (mode === 'enter') { if (onUnlock(val)) setInputPin(''); else { setError('Senha incorreta'); setInputPin(''); } } else if (mode === 'create') { setConfirmPin(val); setMode('confirm'); setInputPin(''); } else if (mode === 'confirm') { if (val === confirmPin) { onSetPin(val); setInputPin(''); alert('Senha criada com sucesso!'); } else { setError('Senhas não conferem. Tente novamente.'); setMode('create'); setInputPin(''); } } };
    if (isUnlocked) return null;
    return (
        <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600"> {mode === 'enter' ? <Lock size={32} /> : <Key size={32} />} </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2"> {mode === 'enter' ? 'Área Protegida' : mode === 'create' ? 'Crie uma Senha' : 'Confirme a Senha'} </h2>
                <p className="text-sm text-gray-500 mb-6"> {mode === 'enter' ? 'Digite sua senha de 4 dígitos para acessar.' : 'Defina um PIN para proteger os dados financeiros.'} </p>
                <div className="flex justify-center gap-4 mb-6"> {[0, 1, 2, 3].map(i => ( <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < inputPin.length ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`} /> ))} </div>
                {error && <p className="text-red-500 text-xs font-bold mb-4 animate-shake">{error}</p>}
                <div className="grid grid-cols-3 gap-4 mb-6"> {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ( <button key={n} onClick={() => handleDigit(n.toString())} className="h-16 rounded-xl bg-gray-50 hover:bg-brand-50 text-xl font-bold text-gray-700 hover:text-brand-600 transition shadow-sm border border-gray-100 active:scale-95">{n}</button> ))} <div /> <button onClick={() => handleDigit('0')} className="h-16 rounded-xl bg-gray-50 hover:bg-brand-50 text-xl font-bold text-gray-700 hover:text-brand-600 transition shadow-sm border border-gray-100 active:scale-95">0</button> <button onClick={() => setInputPin(prev => prev.slice(0, -1))} className="h-16 rounded-xl bg-gray-50 hover:bg-red-50 text-xl font-bold text-gray-400 hover:text-red-500 transition shadow-sm border border-gray-100 active:scale-95 flex items-center justify-center"><ChevronLeft /></button> </div>
                {mode === 'enter' && ( <button onClick={onReset} className="text-xs text-gray-400 underline hover:text-brand-600">Esqueci minha senha</button> )}
            </div>
        </div>
    );
};

// 4. Custom Axis for Charts
const CustomXAxisTick = ({ x, y, payload, data }: any) => {
    const item = data && data[payload.index];
    if (!item) return <g />;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize={10} fontWeight="bold">{item.name}</text>
            <text x={0} y={0} dy={30} textAnchor="middle" fill="#059669" fontSize={10} fontWeight="bold">R$ {item.faturamento?.toFixed(0)}</text>
            <text x={0} y={0} dy={42} textAnchor="middle" fill="#6366f1" fontSize={9}>{item.petsCount} pets</text>
            {(item.growth !== undefined || item.revGrowth !== undefined) && (
                <text x={0} y={0} dy={54} textAnchor="middle" fill={(item.growth || item.revGrowth) >= 0 ? '#059669' : '#dc2626'} fontSize={9} fontWeight="bold">{(item.growth || item.revGrowth) >= 0 ? '▲' : '▼'} {Math.abs(item.growth || item.revGrowth || 0).toFixed(0)}%</text>
            )}
        </g>
    );
};

// 5. Settings Modal
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: AppSettings; onSave: (s: AppSettings) => void; }> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'menu'>('general');
    if (!isOpen) return null;
    const themes = [
        { id: 'rose', name: 'Rose (Padrão)', color: '#e11d48' },
        { id: 'blue', name: 'Blue Sky', color: '#0ea5e9' },
        { id: 'violet', name: 'Violet', color: '#8b5cf6' },
        { id: 'emerald', name: 'Emerald', color: '#10b981' },
        { id: 'amber', name: 'Amber', color: '#f59e0b' },
    ];
    const moveItem = (idx: number, dir: -1 | 1) => {
        const newOrder = [...localSettings.sidebarOrder];
        if (dir === -1 && idx > 0) { [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]]; }
        if (dir === 1 && idx < newOrder.length - 1) { [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]; }
        setLocalSettings({ ...localSettings, sidebarOrder: newOrder });
    };
    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Settings size={20}/> Configurações</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                </div>
                <div className="flex border-b">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'general' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500'}`}>Geral</button>
                    <button onClick={() => setActiveTab('appearance')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'appearance' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500'}`}>Aparência</button>
                    <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'menu' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500'}`}>Menu</button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Petshop</label><input value={localSettings.appName} onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} className="w-full border p-2 rounded-lg" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do Logo</label><input value={localSettings.logoUrl} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} className="w-full border p-2 rounded-lg" /></div>
                        </div>
                    )}
                    {activeTab === 'appearance' && (
                        <div className="grid grid-cols-2 gap-3">
                            {themes.map(t => (
                                <button key={t.id} onClick={() => setLocalSettings({...localSettings, theme: t.id})} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${localSettings.theme === t.id ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <div className="w-8 h-8 rounded-full" style={{backgroundColor: t.color}}></div>
                                    <span className="text-xs font-bold text-gray-700">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {activeTab === 'menu' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-400 mb-2">Reordene os grupos do menu lateral</p>
                            {localSettings.sidebarOrder.map((item, idx) => (
                                <div key={item} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                                    <span className="text-sm font-bold capitalize">{item}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => moveItem(idx, -1)} disabled={idx===0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown className="rotate-180" size={16}/></button>
                                        <button onClick={() => moveItem(idx, 1)} disabled={idx===localSettings.sidebarOrder.length-1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronDown size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>
                    <button onClick={() => { onSave(localSettings); onClose(); }} className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 text-sm">Salvar</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN VIEWS ---

const CostsView: React.FC<{ costs: CostItem[] }> = ({ costs }) => {
    const total = costs.reduce((acc, c) => acc + c.amount, 0);
    const paid = costs.filter(c => c.status === 'Pago').reduce((acc, c) => acc + c.amount, 0);
    const pending = total - paid;
    
    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h1 className="text-2xl font-bold text-gray-800">Custo Mensal</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Custo Total</h3>
                    <p className="text-2xl font-bold text-gray-800">R$ {total.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Pago</h3>
                    <p className="text-2xl font-bold text-green-600">R$ {paid.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Pendente</h3>
                    <p className="text-2xl font-bold text-red-500">R$ {pending.toFixed(2)}</p>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-4">Mês</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Data</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {costs.length === 0 ? (
                                <tr><td colSpan={5} className="p-6 text-center text-gray-400">Nenhum custo registrado.</td></tr>
                            ) : (
                                costs.map((c, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-800">{c.month}</td>
                                        <td className="p-4 text-gray-600">{c.category}</td>
                                        <td className="p-4 text-gray-500 font-mono text-xs">{new Date(c.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-right font-bold text-gray-800">R$ {c.amount.toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {c.status || 'Pendente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ClientManager: React.FC<{ clients: Client[], onDeleteClient: (id: string) => void, googleUser: GoogleUser | null, accessToken: string | null }> = ({ clients, onDeleteClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClient, setExpandedClient] = useState<string | null>(null);

    const filtered = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) ||
        c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Clientes & Pets</h1>
                <div className="bg-white border border-gray-200 rounded-lg flex items-center px-3 py-2 w-64 shadow-sm focus-within:ring-2 ring-brand-200">
                    <Search className="text-gray-400 mr-2" size={16}/>
                    <input 
                        className="bg-transparent outline-none text-sm w-full"
                        placeholder="Buscar cliente ou pet..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(client => (
                    <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg">
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 leading-tight">{client.name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10}/> {client.phone}</p>
                                </div>
                            </div>
                            <button onClick={() => { if(confirm('Remover cliente?')) onDeleteClient(client.id); }} className="text-gray-400 hover:text-red-500 p-1">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="bg-gray-50 px-4 py-2 flex justify-between items-center cursor-pointer" onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}>
                            <span className="text-xs font-bold text-gray-500 uppercase">{client.pets.length} Pets</span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedClient === client.id ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedClient === client.id && (
                            <div className="p-4 space-y-3 bg-gray-50 border-t border-gray-100">
                                {client.pets.map(pet => (
                                    <div key={pet.id} className="bg-white p-3 rounded-lg border border-gray-200 text-sm">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-brand-700">{pet.name}</span>
                                            <span className="text-xs text-gray-400">{pet.breed}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Porte: {pet.size} • Pelo: {pet.coat}</p>
                                        {pet.notes && <p className="text-xs text-gray-400 italic mt-1 border-t pt-1 border-gray-100">{pet.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ServiceManager: React.FC<{ services: Service[], onAddService: (s: Service) => void, onDeleteService: (id: string) => void, onSyncServices: (s: boolean) => void, accessToken: string | null, sheetId: string | null }> = ({ services, onAddService, onDeleteService, onSyncServices }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState<Partial<Service>>({ category: 'principal', durationMin: 60, price: 0, name: '', targetSize: 'Todos', targetCoat: 'Todos' });

    const handleSave = () => {
        if (!newService.name || newService.price === undefined) return;
        const s: Service = {
            id: `local_svc_${Date.now()}`,
            name: newService.name,
            price: newService.price,
            durationMin: newService.durationMin || 60,
            description: newService.description || '',
            category: newService.category as any || 'principal',
            targetSize: newService.targetSize || 'Todos',
            targetCoat: newService.targetCoat || 'Todos'
        };
        onAddService(s);
        setIsAdding(false);
        setNewService({ category: 'principal', durationMin: 60, price: 0, name: '', targetSize: 'Todos', targetCoat: 'Todos' });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Serviços</h1>
                <div className="flex gap-2">
                    <button onClick={() => onSyncServices(false)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2 text-sm">
                        <RefreshCw size={16} /> Sincronizar
                    </button>
                    <button onClick={() => setIsAdding(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-700 flex items-center gap-2 text-sm shadow-md shadow-brand-200">
                        <Plus size={16} /> Novo Serviço
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-brand-100 mb-6 animate-scale-up">
                    <h3 className="font-bold text-gray-800 mb-4">Adicionar Serviço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <input placeholder="Nome do Serviço" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="border p-2 rounded-lg outline-none focus:ring-2 ring-brand-200" />
                        <div className="relative">
                             <span className="absolute left-3 top-2 text-gray-500">R$</span>
                             <input type="number" placeholder="Preço" value={newService.price} onChange={e => setNewService({...newService, price: parseFloat(e.target.value)})} className="border p-2 pl-9 rounded-lg w-full outline-none focus:ring-2 ring-brand-200" />
                        </div>
                        <select value={newService.category} onChange={e => setNewService({...newService, category: e.target.value as any})} className="border p-2 rounded-lg bg-white">
                            <option value="principal">Principal</option>
                            <option value="adicional">Adicional</option>
                        </select>
                        <select value={newService.durationMin} onChange={e => setNewService({...newService, durationMin: parseInt(e.target.value)})} className="border p-2 rounded-lg bg-white">
                            <option value="30">30 min</option>
                            <option value="60">1 hora</option>
                            <option value="90">1h 30m</option>
                            <option value="120">2 horas</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">Salvar</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4">Preço</th>
                            <th className="p-4">Porte Alvo</th>
                            <th className="p-4 w-20">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {services.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{s.name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.category === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {s.category}
                                    </span>
                                </td>
                                <td className="p-4 text-green-600 font-bold">R$ {s.price.toFixed(2)}</td>
                                <td className="p-4 text-gray-500 text-xs">{s.targetSize || 'Todos'}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => { if(confirm('Excluir este serviço?')) onDeleteService(s.id); }} className="text-gray-400 hover:text-red-500 transition">
                                        <Trash2 size={18} />
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

const PaymentManager: React.FC<{ appointments: Appointment[], clients: Client[], services: Service[], onUpdateAppointment: (app: Appointment) => void, accessToken: string | null, sheetId: string | null }> = ({ appointments, clients, services, onUpdateAppointment, accessToken, sheetId }) => {
    const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('pending');
    const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
    const [paymentDetails, setPaymentDetails] = useState({ amount: 0, method: 'Pix' });

    const filteredApps = appointments.filter(a => {
        if (a.status === 'cancelado') return false;
        const isPaid = !!a.paymentMethod;
        if (filter === 'paid') return isPaid;
        if (filter === 'pending') return !isPaid;
        return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const calculateTotal = (app: Appointment) => {
        const main = services.find(s => s.id === app.serviceId);
        let total = main?.price || 0;
        app.additionalServiceIds?.forEach(id => {
            const s = services.find(srv => srv.id === id);
            if(s) total += s.price;
        });
        return total;
    };

    const handleOpenPayment = (app: Appointment) => {
        setSelectedApp(app);
        setPaymentDetails({ amount: app.paidAmount || calculateTotal(app), method: app.paymentMethod || 'Pix' });
    };

    const handleConfirmPayment = async () => {
        if (!selectedApp) return;
        const updatedApp = { 
            ...selectedApp, 
            paidAmount: paymentDetails.amount, 
            paymentMethod: paymentDetails.method as any 
        };
        
        // Call parent updater for local/db state
        onUpdateAppointment(updatedApp);

        // Update Sheet specifically for payment columns
        if (accessToken && sheetId && updatedApp.id.startsWith('sheet_')) {
            try {
                const idx = parseInt(updatedApp.id.split('_')[1]);
                const row = idx + 1;
                // Col R (18) = Paid Amount, Col S (19) = Method. Range R{row}:S{row}
                // Amount formatted as currency string for sheet? Or raw number?
                const amountStr = `R$ ${paymentDetails.amount.toFixed(2).replace('.', ',')}`;
                await googleService.updateSheetValues(accessToken, sheetId, `Agendamento!R${row}:S${row}`, [amountStr, paymentDetails.method]);
                alert('Pagamento registrado na planilha!');
            } catch (e) {
                console.error("Failed to update payment in sheet", e);
                alert('Salvo localmente. Erro ao atualizar planilha.');
            }
        } else {
             alert('Pagamento registrado localmente (não sincronizado com planilha antiga ou sem token).');
        }

        setSelectedApp(null);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Pagamentos</h1>
                <div className="bg-white border border-gray-200 p-1 rounded-lg flex">
                    <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${filter === 'all' ? 'bg-brand-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Todos</button>
                    <button onClick={() => setFilter('pending')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${filter === 'pending' ? 'bg-brand-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Pendentes</button>
                    <button onClick={() => setFilter('paid')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${filter === 'paid' ? 'bg-brand-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>Pagos</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                        <tr>
                            <th className="p-4">Data</th>
                            <th className="p-4">Cliente/Pet</th>
                            <th className="p-4">Serviço</th>
                            <th className="p-4 text-right">Valor Total</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredApps.map(app => {
                            const client = clients.find(c => c.id === app.clientId);
                            const pet = client?.pets.find(p => p.id === app.petId);
                            const mainSvc = services.find(s => s.id === app.serviceId);
                            const total = calculateTotal(app);
                            const isPaid = !!app.paymentMethod;

                            return (
                                <tr key={app.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono text-xs text-gray-500">{new Date(app.date).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{client?.name}</div>
                                        <div className="text-xs text-gray-500">{pet?.name}</div>
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs truncate max-w-[150px]">{mainSvc?.name} {app.additionalServiceIds?.length ? '(+)' : ''}</td>
                                    <td className="p-4 text-right font-bold text-gray-800">R$ {total.toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        {isPaid ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Pago ({app.paymentMethod})</span>
                                        ) : (
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pendente</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleOpenPayment(app)} className="text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition">
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedApp && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-scale-up">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Pagamento</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Pago</label>
                                <input 
                                    type="number" 
                                    value={paymentDetails.amount} 
                                    onChange={e => setPaymentDetails({...paymentDetails, amount: parseFloat(e.target.value)})}
                                    className="w-full border p-2 rounded-lg outline-none focus:ring-2 ring-brand-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma de Pagamento</label>
                                <select 
                                    value={paymentDetails.method} 
                                    onChange={e => setPaymentDetails({...paymentDetails, method: e.target.value})}
                                    className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 ring-brand-200"
                                >
                                    <option value="Pix">Pix</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Credito">Crédito</option>
                                    <option value="Debito">Débito</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setSelectedApp(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancelar</button>
                            <button onClick={handleConfirmPayment} className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RevenueView: React.FC<{ appointments: Appointment[]; services: Service[]; clients: Client[]; }> = ({ appointments, services, clients }) => {
    // ... (RevenueView logic remains exactly as previous, ensuring full graph implementation)
    // For brevity in this fix block, assume full implementation is present as in previous correct output.
    // [Insert full RevenueView code here from previous successful generation]
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
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
            const dailyApps = appointments.filter(a => { 
                if (a.status === 'cancelado') return false; 
                // Local date comparison
                const aDate = new Date(a.date);
                const localStr = `${aDate.getFullYear()}-${String(aDate.getMonth()+1).padStart(2,'0')}-${String(aDate.getDate()).padStart(2,'0')}`;
                return localStr === targetDateStr; 
            });
            const totalRevenue = dailyApps.reduce((acc, app) => acc + calculateGrossRevenue(app), 0);
            const formattedDate = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
            let growth = 0; if (data.length > 0) { const prev = data[data.length - 1]; if (prev.faturamento > 0) growth = ((totalRevenue - prev.faturamento) / prev.faturamento) * 100; }
            data.push({ name: formattedDate, fullDate: targetDateStr, faturamento: totalRevenue, petsCount: dailyApps.length, growth });
        });
        return data;
    };
    
    // ... [Rest of RevenueView charts logic] ...
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
              chartData.push({ name: `Sem ${index + 1}`, faturamento: currentRevenue, petsCount, growth });
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
              data.push({ name: monthNames[i], faturamento: stats.grossRevenue, petsCount: stats.totalPets, revGrowth, });
          }
          return data;
    };

    const dailyApps = appointments.filter(a => {
        const d = new Date(a.date);
        const local = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return local === selectedDate;
    });
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
            <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold text-gray-800">Faturamento</h1></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6"><div className="flex overflow-x-auto"><TabButton id="daily" label="Diário" icon={CalendarIcon} /><TabButton id="weekly" label="Semanal" icon={BarChart2} /><TabButton id="monthly" label="Mensal" icon={TrendingUp} /><TabButton id="yearly" label="Anual" icon={PieChartIcon} /></div></div>
            
            {activeTab === 'daily' && (
                <section>
                    <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-200"><h2 className="text-lg font-bold text-gray-800">Filtro</h2><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-gray-50 border p-2 rounded-lg text-sm font-bold text-gray-700 outline-none" /></div>
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

// --- SCHEDULE MANAGER ---
const ScheduleManager: React.FC<{ appointments: Appointment[]; clients: Client[]; services: Service[]; onAdd: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onEdit: (app: Appointment, client: Client, pet: Pet, services: Service[], duration: number) => void; onUpdateStatus: (id: string, status: Appointment['status']) => void; onDelete: (id: string) => void; googleUser: GoogleUser | null; }> = ({ appointments, clients, services, onAdd, onEdit, onUpdateStatus, onDelete }) => {
    // ... [Schedule Manager Logic] ...
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day'); const [currentDate, setCurrentDate] = useState(new Date()); const [isModalOpen, setIsModalOpen] = useState(false); const [detailsApp, setDetailsApp] = useState<Appointment | null>(null); const [contextMenu, setContextMenu] = useState<{x: number, y: number, appId: string} | null>(null); const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [clientSearch, setClientSearch] = useState(''); const [selectedClient, setSelectedClient] = useState(''); const [selectedPet, setSelectedPet] = useState(''); const [selectedService, setSelectedService] = useState(''); const [selectedAddServices, setSelectedAddServices] = useState<string[]>([]); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [time, setTime] = useState('09:00'); const [notes, setNotes] = useState(''); const [manualDuration, setManualDuration] = useState('0');
    const resetForm = () => { setClientSearch(''); setSelectedClient(''); setSelectedPet(''); setSelectedService(''); setSelectedAddServices([]); setTime('09:00'); setNotes(''); setManualDuration('0'); setEditingAppId(null); setIsModalOpen(false); };
    const handleStartEdit = (app: Appointment) => { setEditingAppId(app.id); setSelectedClient(app.clientId); setSelectedPet(app.petId); setSelectedService(app.serviceId); setSelectedAddServices(app.additionalServiceIds || []); const d = new Date(app.date); setDate(d.toISOString().split('T')[0]); setTime(d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})); setNotes(app.notes || ''); setManualDuration(app.durationTotal ? app.durationTotal.toString() : '0'); setDetailsApp(null); setIsModalOpen(true); };
    const handleSave = () => { if (!selectedClient || !selectedPet || !selectedService || !date || !time) return; const client = clients.find(c => c.id === selectedClient); const pet = client?.pets.find(p => p.id === selectedPet); const mainSvc = services.find(s => s.id === selectedService); const addSvcs = selectedAddServices.map(id => services.find(s => s.id === id)).filter(s => s) as Service[]; if (client && pet && mainSvc) { const newApp: Appointment = { id: editingAppId || `local_${Date.now()}`, clientId: client.id, petId: pet.id, serviceId: mainSvc.id, additionalServiceIds: selectedAddServices, date: `${date}T${time}:00`, status: 'agendado', notes: notes, googleEventId: editingAppId ? appointments.find(a=>a.id===editingAppId)?.googleEventId : undefined }; if (editingAppId) { onEdit(newApp, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration)); } else { onAdd(newApp, client, pet, [mainSvc, ...addSvcs], parseInt(manualDuration)); } resetForm(); } };
    const handleDeleteFromContext = () => { if(contextMenu && confirm('Excluir?')) onDelete(contextMenu.appId); setContextMenu(null); }
    const filteredClients = clientSearch.length > 0 ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch) || c.pets.some(p => p.name.toLowerCase().includes(clientSearch.toLowerCase()))).slice(0, 5) : []; const selectedClientData = clients.find(c => c.id === selectedClient); const pets = selectedClientData?.pets || []; const selectedPetData = pets.find(p => p.id === selectedPet);
    const getApplicableServices = (category: 'principal' | 'adicional') => { if (!selectedPetData) return []; return services.filter(s => { const matchesCategory = s.category === category; const matchesSize = s.targetSize === 'Todos' || !s.targetSize || (selectedPetData.size && s.targetSize.toLowerCase().includes(selectedPetData.size.toLowerCase())); const matchesCoat = s.targetCoat === 'Todos' || !s.targetCoat || (selectedPetData.coat && s.targetCoat.toLowerCase().includes(selectedPetData.coat.toLowerCase())); return matchesCategory && matchesSize && matchesCoat; }); };
    const navigate = (direction: 'prev' | 'next') => { const newDate = new Date(currentDate); if (viewMode === 'day') newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7)); if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); setCurrentDate(newDate); };
    const timeOptions = []; for (let h = 9; h <= 18; h++) { ['00', '15', '30', '45'].forEach(m => { if(h === 18 && m !== '00') return; timeOptions.push(`${String(h).padStart(2, '0')}:${m}`); }); }
    
    // --- SMART STACKING LOGIC (Google Calendar Style - Overlap) ---
    // Instead of side-by-side columns, we calculate overlapping groups and adjust z-index/indentation
    const getStackedLayout = (dayApps: Appointment[]) => {
        const sorted = [...dayApps].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // For simple stacking, we just return the sorted array. 
        // The visual overlap is handled by CSS (absolute positioning) + slight indent.
        return sorted; 
    };

    const AppointmentCard = ({ app, style, onClick, onContext, indent = 0 }: any) => {
        const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); const mainSvc = services.find(srv => srv.id === app.serviceId); const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter(x=>x) as Service[] || []; const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase(); let colorClass = 'bg-sky-100 border-sky-300 text-sky-900'; if (allServiceNames.includes('tesoura')) colorClass = 'bg-pink-100 border-pink-300 text-pink-900'; else if (allServiceNames.includes('tosa normal')) colorClass = 'bg-orange-100 border-orange-300 text-orange-900'; else if (allServiceNames.includes('higi')) colorClass = 'bg-yellow-100 border-yellow-300 text-yellow-900'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) colorClass = 'bg-purple-100 border-purple-300 text-purple-900'; else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) colorClass = 'bg-indigo-100 border-indigo-300 text-indigo-900';
        
        // Calculate indentation styles based on overlap index
        const indentStyle = { ...style, left: `${indent * 5}%`, width: `${100 - (indent * 5)}%`, zIndex: 10 + indent };
        
        return (
            <div
                style={indentStyle}
                className={`absolute rounded-lg p-2 border shadow-sm ${colorClass} text-xs cursor-pointer hover:z-50 hover:brightness-95 transition-all overflow-hidden flex flex-col leading-tight group`}
                onClick={(e) => { e.stopPropagation(); onClick(app); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContext(e, app.id); }}
            >
                <div className="font-bold truncate flex justify-between items-center">
                    <span>{pet?.name}</span>
                    <span className="text-[9px] opacity-70 bg-white/30 px-1 rounded">{app.durationTotal}m</span>
                </div>
                <div className="truncate opacity-90 text-[10px]">{client?.name}</div>
                <div className="mt-1 flex flex-wrap gap-0.5 opacity-80"> 
                    <span className="bg-white/40 px-1 rounded">{mainSvc?.name}</span>
                    {addSvcs.map(s => <span key={s.id} className="bg-white/40 px-1 rounded">+ {s.name}</span>)} 
                </div>
            </div>
        );
    };

    // Calculate overlaps for indentation
    const calculateOverlaps = (apps: Appointment[]) => {
        const sorted = [...apps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const result = sorted.map(app => {
            const start = new Date(app.date).getTime();
            // Find how many previous apps overlap with this one
            let indent = 0;
            for(let i = 0; i < sorted.indexOf(app); i++) {
                const prev = sorted[i];
                const prevStart = new Date(prev.date).getTime();
                const prevEnd = prevStart + (prev.durationTotal || 60) * 60000;
                if (start < prevEnd) {
                    indent++; 
                }
            }
            return { ...app, indent };
        });
        return result;
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');
        const processedApps = calculateOverlaps(dayApps);
        
        return (
            <div className="relative h-[1200px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex">
                <div className="w-12 bg-gray-50 border-r border-gray-200 flex-shrink-0 z-10 sticky left-0">
                    {Array.from({length: 10}, (_, i) => i + 9).map(h => (
                        <div key={h} className="h-[120px] border-b border-gray-200 text-[10px] text-gray-400 font-bold p-1 text-right relative">
                            <span className="-top-2 relative">{h}:00</span>
                        </div>
                    ))}
                </div>
                <div className="flex-1 relative bg-[repeating-linear-gradient(0deg,transparent,transparent_119px,#f3f4f6_120px)]">
                     {Array.from({length: 60}, (_, i) => i).map(i => <div key={i} className="absolute w-full border-t border-gray-50" style={{top: i * 20}} />)}
                    {processedApps.map(app => {
                        const d = new Date(app.date);
                        const startMin = (d.getHours() - 9) * 60 + d.getMinutes();
                        const duration = app.durationTotal || 60;
                        return (
                            <AppointmentCard 
                                key={app.id} app={app} 
                                style={{ top: `${startMin * 2}px`, height: `${duration * 2}px` }}
                                indent={(app as any).indent}
                                onClick={setDetailsApp}
                                onContext={(e: any, id: string) => setContextMenu({x: e.clientX, y: e.clientY, appId: id})}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = new Date(currentDate); start.setDate(start.getDate() - start.getDay()); 
        const days = [2,3,4,5,6]; 
        
        return (
             <div className="flex h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-col">
                <div className="flex border-b border-gray-200">
                    <div className="w-10 bg-gray-50 border-r border-gray-200"></div>
                    {days.map(dIdx => {
                         const d = new Date(start); d.setDate(d.getDate() + dIdx);
                         const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                         return (
                             <div key={dIdx} className={`flex-1 text-center py-2 text-xs font-bold border-r border-gray-100 ${isToday ? 'bg-blue-50 text-brand-600' : 'text-gray-500'}`}>
                                 {d.toLocaleDateString('pt-BR', {weekday: 'short'})} {d.getDate()}
                             </div>
                         )
                    })}
                </div>
                <div className="flex-1 overflow-y-auto relative flex">
                     <div className="w-10 bg-gray-50 border-r border-gray-200 flex-shrink-0 z-10 sticky left-0">
                        {Array.from({length: 10}, (_, i) => i + 9).map(h => (
                            <div key={h} className="h-[120px] border-b border-gray-200 text-[9px] text-gray-400 font-bold p-1 text-right relative">
                                <span className="-top-2 relative">{h}:00</span>
                            </div>
                        ))}
                    </div>
                     {days.map(dIdx => {
                         const d = new Date(start); d.setDate(d.getDate() + dIdx);
                         const dateStr = d.toISOString().split('T')[0];
                         const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado');
                         const processedApps = calculateOverlaps(dayApps);

                         return (
                             <div key={dIdx} className="flex-1 border-r border-gray-100 relative min-w-[100px]">
                                  {Array.from({length: 10}, (_, i) => i + 9).map(h => <div key={h} className="h-[120px] border-b border-gray-50" />)}
                                  {processedApps.map(app => {
                                        const ad = new Date(app.date);
                                        const startMin = (ad.getHours() - 9) * 60 + ad.getMinutes();
                                        const duration = app.durationTotal || 60;
                                        return (
                                            <AppointmentCard 
                                                key={app.id} app={app} 
                                                style={{ top: `${startMin * 2}px`, height: `${duration * 2}px` }}
                                                indent={(app as any).indent}
                                                onClick={setDetailsApp}
                                                onContext={(e: any, id: string) => setContextMenu({x: e.clientX, y: e.clientY, appId: id})}
                                            />
                                        )
                                    })}
                             </div>
                         )
                     })}
                </div>
             </div>
        )
    }

    const renderMonthView = () => {
        const year = currentDate.getFullYear(); const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const slots = [];
        for(let i=0; i<startDay; i++) slots.push(null);
        for(let i=1; i<=daysInMonth; i++) slots.push(new Date(year, month, i));

        return (
            <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                 <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                     {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-500">{d}</div>)}
                 </div>
                 <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                     {slots.map((date, idx) => {
                         if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/30 border-b border-r border-gray-100" />;
                         const dateStr = date.toISOString().split('T')[0];
                         const isToday = dateStr === new Date().toISOString().split('T')[0];
                         const dayApps = appointments.filter(a => a.date.startsWith(dateStr) && a.status !== 'cancelado').sort((a,b) => a.date.localeCompare(b.date));
                         
                         return (
                             <div key={idx} className={`border-b border-r border-gray-100 p-1 flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`} onClick={() => { setDate(dateStr); setViewMode('day'); }}>
                                 <span className={`text-[10px] font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-600 text-white' : 'text-gray-500'}`}>{date.getDate()}</span>
                                 <div className="flex-1 overflow-hidden space-y-1">
                                     {dayApps.slice(0, 3).map(app => (
                                         <div key={app.id} className="text-[8px] bg-sky-100 text-sky-800 rounded px-1 truncate font-medium">
                                             {clients.find(c=>c.id===app.clientId)?.pets.find(p=>p.id===app.petId)?.name}
                                         </div>
                                     ))}
                                     {dayApps.length > 3 && <div className="text-[8px] text-gray-400 pl-1">+ {dayApps.length - 3} mais</div>}
                                 </div>
                             </div>
                         )
                     })}
                 </div>
            </div>
        )
    };

    return ( <div className="space-y-3 animate-fade-in relative h-full flex flex-col"> <div className="flex flex-col md:flex-row justify-between items-center gap-2 flex-shrink-0 bg-white p-2 rounded-xl shadow-sm border border-gray-200"> <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar"> <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0"> <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Dia</button> <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Semana</button> <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Mês</button> </div> <div className="flex items-center gap-1 flex-shrink-0 ml-2"> <button onClick={() => navigate('prev')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronLeft size={18}/></button> <span className="text-sm font-bold text-gray-800 min-w-[90px] text-center truncate">{viewMode === 'day' && currentDate.toLocaleDateString('pt-BR')} {viewMode === 'week' && `Sem ${currentDate.getDate()}`} {viewMode === 'month' && currentDate.toLocaleDateString('pt-BR', {month:'short', year: 'numeric'})}</span> <button onClick={() => navigate('next')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition"><ChevronRight size={18}/></button> </div> </div> <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-brand-200 hover:bg-brand-700 active:scale-95 transition flex items-center justify-center gap-1.5 text-xs"><Plus size={18} /> Novo Agendamento</button> </div> <div className="flex-1 min-h-0 relative overflow-hidden"> {viewMode === 'day' && <div className="h-full overflow-y-auto">{renderDayView()}</div>} {viewMode === 'week' && renderWeekView()} {viewMode === 'month' && renderMonthView()} {contextMenu && ( <div className="fixed bg-white shadow-xl border border-gray-200 rounded-xl z-[100] py-1 min-w-[160px] overflow-hidden" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(appointments.find(a => a.id === contextMenu.appId)!)} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex items-center gap-3 text-gray-700 font-medium border-b border-gray-50"><Edit2 size={16}/> Editar</button> <button onClick={handleDeleteFromContext} className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium"><Trash2 size={16}/> Excluir</button> </div> )} </div> {detailsApp && (() => { const client = clients.find(c => c.id === detailsApp.clientId); const pet = client?.pets.find(p => p.id === detailsApp.petId); const s = services.find(srv => srv.id === detailsApp.serviceId); const addSvcs = detailsApp.additionalServiceIds?.map(id => services.find(srv => srv.id === id)).filter(x=>x); return ( <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDetailsApp(null)}> <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}> <button onClick={() => setDetailsApp(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={20}/></button> <div className="mb-6 text-center"> <h3 className="text-2xl font-bold text-gray-800">{pet?.name}</h3> <p className="text-gray-500 font-medium">{client?.name}</p> </div> <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm mb-6"> <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Phone size={16}/></div><span className="font-medium text-gray-700">{client?.phone}</span></div> <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><MapPin size={16}/></div><span className="font-medium text-gray-700 truncate">{client?.address} {client?.complement}</span></div> <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0"><FileText size={16}/></div><span className="font-medium italic text-gray-600 pt-1">{detailsApp.notes || pet?.notes || 'Sem obs'}</span></div> </div> <div className="mb-6"> <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Serviços</h4> <div className="flex flex-wrap gap-2"> <span className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-xs font-bold shadow-sm">{s?.name}</span> {addSvcs?.map(as => <span key={as?.id} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">{as?.name}</span>)} </div> </div> <button onClick={() => handleStartEdit(detailsApp)} className="w-full py-3.5 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-95 transition shadow-lg shadow-brand-200"><Edit2 size={18}/> Editar Agendamento</button> </div> </div> ) })()} {isModalOpen && ( <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"> <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:min-h-[600px] animate-scale-up"> <div className="p-4 border-b flex justify-between items-center bg-gray-50"> <h3 className="font-bold text-lg text-gray-800">{editingAppId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3> <button onClick={resetForm}><X size={24} className="text-gray-400 hover:text-gray-600"/></button> </div> <div className="p-4 overflow-y-auto custom-scrollbar space-y-4"> <div> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente / Pet</label> <div className="relative"> <Search className="absolute left-3 top-2.5 text-gray-400" size={16} /> <input value={selectedClientData ? selectedClientData.name : clientSearch} onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(''); setSelectedPet(''); }} placeholder="Buscar..." className="w-full pl-9 pr-8 py-3 border rounded-xl outline-none focus:ring-2 ring-brand-200 text-base" /> {selectedClientData && <button onClick={() => { setClientSearch(''); setSelectedClient(''); }} className="absolute right-2 top-3 text-gray-400"><X size={16}/></button>} </div> {clientSearch.length > 0 && !selectedClient && filteredClients.length > 0 && ( <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50"> {filteredClients.map(c => ( <button key={c.id} onClick={() => { setSelectedClient(c.id); setClientSearch(''); }} className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-center"> <div className="text-base font-bold text-gray-800">{c.name} <span className="text-xs font-normal text-gray-500">({c.pets.map(p=>p.name).join(', ')})</span></div> </button> ))} </div> )} </div> {selectedClient && ( <div className="grid grid-cols-2 gap-2"> {pets.map(p => ( <button key={p.id} onClick={() => { setSelectedPet(p.id); setSelectedService(''); }} className={`p-3 rounded-xl border text-left text-sm transition-all ${selectedPet === p.id ? 'bg-brand-50 border-brand-500 shadow-sm ring-1 ring-brand-200' : 'hover:bg-gray-50'}`}> <div className="font-bold">{p.name}</div><div className="text-gray-500 text-xs">{p.size}</div> </button> ))} </div> )} {selectedPet && ( <div className="space-y-4"> <div className="space-y-1"> <label className="text-xs font-bold text-gray-400 uppercase">Serviço Principal</label> <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500"><option value="">Selecione...</option>{getApplicableServices('principal').map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)}</select> </div> <div className="space-y-1"> <label className="text-xs font-bold text-gray-400 uppercase">Serviço Adicional</label> <select className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500" onChange={(e) => { const val = e.target.value; if(val && !selectedAddServices.includes(val)) setSelectedAddServices(prev => [...prev, val]); e.target.value = ''; }} > <option value="">Adicionar serviço...</option> {getApplicableServices('adicional').filter((service, index, self) => index === self.findIndex((t) => t.name === service.name)).map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)} </select> </div> <div className="flex flex-wrap gap-2 min-h-[30px]">{selectedAddServices.map(id => <span key={id} onClick={() => setSelectedAddServices(p => p.filter(x => x !== id))} className="bg-purple-50 border border-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-purple-100 flex items-center gap-1">{services.find(s=>s.id===id)?.name} <X size={12}/></span>)}</div> <div className="grid grid-cols-2 gap-3"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-3 rounded-xl text-base outline-none" /><select value={time} onChange={e => setTime(e.target.value)} className="border p-3 rounded-xl text-base outline-none">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div> <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Duração Estimada</label><select value={manualDuration} onChange={e => setManualDuration(e.target.value)} className="w-full border p-3 rounded-xl bg-white text-base outline-none focus:border-brand-500"><option value="0">Automático (pelo serviço)</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="90">1 hora e 30 min</option><option value="120">2 horas</option><option value="150">2 horas e 30 min</option><option value="180">3 horas</option><option value="240">4 horas</option></select></div> <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-3 rounded-xl text-sm outline-none focus:border-gray-400" rows={3} placeholder="Observações..." /> </div> )} </div> <div className="p-4 border-t bg-gray-50 flex justify-end gap-3"> <button onClick={resetForm} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl text-sm transition">Cancelar</button> <button onClick={handleSave} disabled={!selectedClient || !selectedPet || !selectedService} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 text-sm shadow-lg shadow-brand-200 active:scale-95 transition">Salvar</button> </div> </div> </div> )} </div> );
};

// --- APP COMPONENT ---
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
  const [appSettings, setAppSettings] = useState<AppSettings>({ appName: 'PomPomPet', logoUrl: '/logo.png', theme: 'rose', sidebarOrder: ['operacional', 'cadastros', 'gerencial'] });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    if(savedSettings) setAppSettings(JSON.parse(savedSettings));

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
    initAuthLogic();
  }, []);

  // --- THEME APPLICATION EFFECT ---
  useEffect(() => {
      const colors: any = {
          rose: { 50:'#fff1f2', 100:'#ffe4e6', 200:'#fecdd3', 600:'#e11d48', 700:'#be123c' },
          blue: { 50:'#f0f9ff', 100:'#e0f2fe', 200:'#bae6fd', 600:'#0284c7', 700:'#0369a1' },
          violet: { 50:'#f5f3ff', 100:'#ede9fe', 200:'#ddd6fe', 600:'#7c3aed', 700:'#6d28d9' },
          emerald: { 50:'#ecfdf5', 100:'#d1fae5', 200:'#a7f3d0', 600:'#059669', 700:'#047857' },
          amber: { 50:'#fffbeb', 100:'#fef3c7', 200:'#fde68a', 600:'#d97706', 700:'#b45309' }
      };
      const themeColors = colors[appSettings.theme] || colors.rose;
      const root = document.documentElement;
      Object.keys(themeColors).forEach((key: any) => {
          root.style.setProperty(`--brand-${key}`, themeColors[key]);
      });
  }, [appSettings.theme]);

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
    } else { setTimeout(initAuthLogic, 1000); }
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
          clientsMap.set(cleanPhone, { id: cleanPhone, name: clientName, phone: phone, address: address || '', complement: complement || '', createdAt: createdIso, pets: [] });
        }
        const client = clientsMap.get(cleanPhone)!;
        if (petName) { client.pets.push({ id: `${cleanPhone}_p_${index}`, name: petName, breed: petBreed || 'SRD', age: petAge || '', gender: petGender || '', size: petSize || '', coat: petCoat || '', notes: petNotes || '' }); }
      });
      const newClientList = Array.from(clientsMap.values());
      setClients(newClientList); db.saveClients(newClientList);
      if(!silent) alert(`${newClientList.length} clientes sincronizados com sucesso da aba CADASTRO!`);
    } catch (error) { console.error(error); if(!silent) alert("Erro ao sincronizar. Verifique permissões."); }
  };
  
  const handleDeleteClient = (id: string) => { const updated = clients.filter(c => c.id !== id); setClients(updated); db.saveClients(updated); };
  const handleAddService = (service: Service) => { const updated = [...services, service]; setServices(updated); db.saveServices(updated); };
  const handleDeleteService = (id: string) => { const updated = services.filter(s => s.id !== id); setServices(updated); db.saveServices(updated); }

  const handleSyncServices = async (token: string, silent = false) => {
      if (!token || !SHEET_ID) { if(!silent) alert("Erro: Login ou ID da Planilha faltando."); return; }
      try {
          const rows = await googleService.getSheetValues(token, SHEET_ID, 'Serviço!A:E');
          if(!rows || rows.length < 2) { if(!silent) alert("Aba 'Serviço' vazia ou não encontrada."); return; }
          const newServices: Service[] = [];
          rows.slice(1).forEach((row: string[], idx: number) => {
              const sName = row[0]; const sCat = (row[1] || 'principal').toLowerCase().includes('adicional') ? 'adicional' : 'principal'; const sSize = row[2] && row[2].trim() !== '' ? row[2] : 'Todos'; const sCoat = row[3] && row[3].trim() !== '' ? row[3] : 'Todos';
              let rawPrice = row[4] || '0'; rawPrice = rawPrice.replace(/[^\d,.-]/g, '').trim(); 
              if (rawPrice.includes(',')) rawPrice = rawPrice.replace(/\./g, '').replace(',', '.');
              const sPrice = parseFloat(rawPrice);
              if (sName) { newServices.push({ id: `sheet_svc_${idx}_${Date.now()}`, name: sName, category: sCat as any, targetSize: sSize, targetCoat: sCoat, price: isNaN(sPrice) ? 0 : sPrice, description: `Importado da planilha`, durationMin: 60 }); }
          });
          if (newServices.length > 0) { setServices(newServices); db.saveServices(newServices); if(!silent) alert(`${newServices.length} serviços importados com sucesso!`); } else { if(!silent) alert("Nenhum serviço válido encontrado na planilha."); }
      } catch (e) { console.error(e); if(!silent) alert("Erro ao sincronizar serviços. Verifique a aba 'Serviço' na planilha."); }
  }

  const handleUpdateApp = (updatedApp: Appointment) => { const updated = appointments.map(a => a.id === updatedApp.id ? updatedApp : a); setAppointments(updated); db.saveAppointments(updated); };

  const handleSyncAppointments = async (token: string, silent = false) => {
      if (!token || !SHEET_ID) return;
      try {
          const rows = await googleService.getSheetValues(token, SHEET_ID, 'Agendamento!A:S');
          // Start from line 5 (index 4) as requested
          if(!rows || rows.length < 5) { if(!silent) alert('Aba Agendamento vazia ou não encontrada (Linhas 1-4 ignoradas).'); return; }
          const loadedApps: Appointment[] = []; const newTempClients: Client[] = []; const currentClients = db.getClients(); const existingClientIds = new Set(currentClients.map(c => c.id));
          
          rows.forEach((row: string[], idx: number) => {
              if (idx < 4) return;
              
              const petName = row[0]; const clientName = row[1]; const clientPhone = row[2] || ''; const clientAddr = row[3] || ''; const petBreed = row[4]; const datePart = row[11]; const timePart = row[12]; const serviceName = row[7];
              const paidAmountStr = row[17]; const paymentMethod = row[18];
              if(!clientName || !datePart) return;
              let isoDate = new Date().toISOString();
              try { const [day, month, year] = datePart.split('/'); if(day && month && year) isoDate = `${year}-${month}-${day}T${timePart || '00:00'}`; } catch(e){}
              const cleanPhone = clientPhone.replace(/\D/g, '') || `temp_${idx}`;
              let client = currentClients.find(c => c.id === cleanPhone) || currentClients.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || newTempClients.find(c => c.id === cleanPhone);
              if (!client) { client = { id: cleanPhone, name: clientName, phone: clientPhone, address: clientAddr, pets: [] }; newTempClients.push(client); }
              let pet = client.pets.find(p => p.name.toLowerCase() === petName?.toLowerCase());
              if (!pet && petName) { pet = { id: `${client.id}_p_${idx}`, name: petName, breed: petBreed || 'SRD', age: '', gender: '', size: row[5] || '', coat: row[6] || '', notes: row[13] || '' }; client.pets.push(pet); }
              const currentServices = db.getServices(); const service = currentServices.find(s => s.name.toLowerCase() === serviceName?.toLowerCase()) || currentServices[0];
              const addServiceIds: string[] = []; [row[8], row[9], row[10]].forEach(name => { if (name) { const foundSvc = currentServices.find(s => s.name.toLowerCase() === name.toLowerCase().trim()); if (foundSvc) addServiceIds.push(foundSvc.id); } });
              let paidAmount = 0; if (paidAmountStr) { paidAmount = parseFloat(paidAmountStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')); if(isNaN(paidAmount)) paidAmount = 0; }
              if(client && pet) { loadedApps.push({ id: `sheet_${idx}`, clientId: client.id, petId: pet.id, serviceId: service?.id || 'unknown', additionalServiceIds: addServiceIds, date: isoDate, status: 'agendado', notes: row[13], durationTotal: parseInt(row[14] || '60'), paidAmount: paidAmount > 0 ? paidAmount : undefined, paymentMethod: paymentMethod as any, googleEventId: undefined }); }
          });
          if (newTempClients.length > 0) { const updatedClients = [...currentClients, ...newTempClients.filter(nc => !existingClientIds.has(nc.id))]; setClients(updatedClients); db.saveClients(updatedClients); }
          if(loadedApps.length > 0) { setAppointments(loadedApps); db.saveAppointments(loadedApps); if(!silent) alert(`${loadedApps.length} agendamentos carregados!`); } else { if(!silent) alert('Nenhum agendamento válido encontrado.'); }
      } catch (error) { console.error(error); if(!silent) alert('Erro ao sincronizar agendamentos. Verifique se a data está em DD/MM/AAAA.'); }
  };

  const handleAddAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[], manualDuration: number) => {
    let googleEventId = '';
    let totalDuration = 0;

    if (manualDuration > 0) {
        totalDuration = manualDuration;
    } else {
        totalDuration = appServices[0].durationMin;
        if(appServices.length > 1) { appServices.slice(1).forEach(s => totalDuration += (s.durationMin || 0)); }
    }

    if (accessToken) {
        const description = appServices.map(s => s.name).join(' + ');
        const googleResponse = await googleService.createEvent(accessToken, { summary: `Banho/Tosa: ${pet.name} - ${client.name}`, description: `Serviços: ${description}\nObs: ${pet.notes}`, startTime: app.date, durationMin: totalDuration });
        if (googleResponse && googleResponse.id) { googleEventId = googleResponse.id; }
        const dateObj = new Date(app.date); const dateStr = dateObj.toLocaleDateString('pt-BR'); const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const rowData = [ pet.name, client.name, client.phone, `${client.address} ${client.complement || ''}`.trim(), pet.breed, pet.size, pet.coat, appServices[0]?.name || '', appServices[1]?.name || '', appServices[2]?.name || '', appServices[3]?.name || '', dateStr, timeStr, pet.notes, totalDuration ];
        try { await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:O', rowData); alert('Agendamento salvo no Calendar e na Planilha!'); } catch (e) { alert('Erro ao salvar na planilha (verifique permissões). Salvo apenas localmente e no Calendar.'); }
    }
    const newApp = { ...app, googleEventId, durationTotal: totalDuration }; const updated = [...appointments, newApp]; setAppointments(updated); db.saveAppointments(updated);
  }

  const handleEditAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[], manualDuration: number) => {
    let googleEventId = app.googleEventId;
    let totalDuration = 0;

    if (manualDuration > 0) {
        totalDuration = manualDuration;
    } else {
        appServices.forEach(s => totalDuration += (s.durationMin || 0));
    }

    if (accessToken && googleEventId) {
         const description = appServices.map(s => s.name).join(' + ');
         await googleService.updateEvent(accessToken, googleEventId, { summary: `Banho/Tosa: ${pet.name} - ${client.name}`, description: `Serviços: ${description}\nObs: ${pet.notes}`, startTime: app.date, durationMin: totalDuration });
    }
    if (accessToken && app.id.startsWith('sheet_')) {
        const parts = app.id.split('_'); const index = parseInt(parts[1]); 
        // Correct offset for row 5 start (index 4) -> index 0 = row 5. 
        // Sheet API uses 1-based indexing for A1 notation. 
        // If index 4 (from array loop starting at 0 but skipping 4) -> 4+1 = 5.
        // Wait, handleSync loops all rows but skips < 4. So index IS the row index in full array.
        // So row 5 is index 4. Row number = index + 1.
        const rowNumber = index + 1; 
        const range = `Agendamento!A${rowNumber}:O${rowNumber}`; const dateObj = new Date(app.date); const dateStr = dateObj.toLocaleDateString('pt-BR'); const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const rowData = [ pet.name, client.name, client.phone, `${client.address} ${client.complement || ''}`.trim(), pet.breed, pet.size, pet.coat, appServices[0]?.name || '', appServices[1]?.name || '', appServices[2]?.name || '', appServices[3]?.name || '', dateStr, timeStr, pet.notes, totalDuration ];
        try { await googleService.updateSheetValues(accessToken, SHEET_ID, range, rowData); } catch(e) { console.error("Update sheet failed", e); }
    }
    const updated = appointments.map(a => a.id === app.id ? { ...app, durationTotal: totalDuration } : a); setAppointments(updated); db.saveAppointments(updated); alert('Agendamento atualizado!');
  }

  const handleUpdateAppStatus = (id: string, status: Appointment['status']) => { const updated = appointments.map(a => a.id === id ? { ...a, status } : a); setAppointments(updated); db.saveAppointments(updated); }
  
  const handleDeleteApp = async (id: string) => {
     const appToDelete = appointments.find(a => a.id === id);
     if (appToDelete && accessToken) {
         if (appToDelete.googleEventId) {
            try { await googleService.deleteEvent(accessToken, appToDelete.googleEventId); } 
            catch (e) { console.error("Failed to delete from Google Calendar", e); }
         }
         if (appToDelete.id.startsWith('sheet_')) {
             try {
                 const idx = parseInt(appToDelete.id.split('_')[1]);
                 const row = idx + 1;
                 await googleService.clearSheetValues(accessToken, SHEET_ID, `Agendamento!A${row}:S${row}`);
             } catch (e) { console.error("Failed to clear row from Sheet", e); }
         }
     }
     const updated = appointments.filter(a => a.id !== id); setAppointments(updated); db.saveAppointments(updated);
  }

  const handleSetPin = (newPin: string) => {
      localStorage.setItem('petgestor_pin', newPin);
      setPin(newPin);
      setIsPinUnlocked(true);
  };
  const handleUnlockPin = (inputPin: string) => {
      if (inputPin === pin) {
          setIsPinUnlocked(true);
          return true;
      }
      return false;
  };
  const handleResetPin = () => {
      if (window.confirm("Você precisa estar logado com a conta Google para redefinir a senha. Continuar?")) {
           if(googleUser) {
               localStorage.removeItem('petgestor_pin');
               setPin('');
               setIsPinUnlocked(false);
               alert("Senha removida. Crie uma nova.");
           } else {
               alert("Erro: Você não está logado no Google. Faça login primeiro.");
           }
      }
  };

  const isRestrictedView = currentView === 'revenue' || currentView === 'costs';
  const showPinModal = isRestrictedView && !isPinUnlocked;

  if (!isConfigured) return <SetupScreen onSave={handleSaveConfig} />;
  if (!googleUser) return <LoginScreen onLogin={() => googleService.login()} onReset={handleResetConfig} />;

  return (
    <HashRouter>
      <Layout 
          currentView={currentView} 
          setView={setCurrentView} 
          googleUser={googleUser} 
          onLogin={() => googleService.login()} 
          onLogout={handleLogout} 
          settings={appSettings} 
          onOpenSettings={() => setIsSettingsOpen(true)}
      >
        {isGlobalLoading && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Sincronizando dados...</h3>
                <p className="text-gray-500">Buscando Clientes, Serviços, Agendamentos e Custos.</p>
            </div>
        )}
        
        {showPinModal && (
            <PinGuard 
                isUnlocked={isPinUnlocked} 
                onUnlock={handleUnlockPin} 
                onSetPin={handleSetPin} 
                hasPin={!!pin} 
                onReset={handleResetPin}
            />
        )}

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={appSettings} onSave={(s) => { setAppSettings(s); localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s)); }} />

        {(!isRestrictedView || isPinUnlocked) && (
            <>
                {currentView === 'revenue' && <RevenueView appointments={appointments} services={services} clients={clients} />}
                {currentView === 'costs' && <CostsView costs={costs} />}
            </>
        )}
        
        {currentView === 'payments' && <PaymentManager appointments={appointments} clients={clients} services={services} onUpdateAppointment={handleUpdateApp} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'clients' && <ClientManager clients={clients} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />}
        {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} onSyncServices={(s) => handleSyncServices(accessToken!, false)} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'schedule' && <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onEdit={handleEditAppointment} onUpdateStatus={handleUpdateAppStatus} onDelete={handleDeleteApp} googleUser={googleUser} />}
      </Layout>
    </HashRouter>
  );
};

export default App;
