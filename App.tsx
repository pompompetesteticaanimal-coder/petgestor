import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { googleService, DEFAULT_CLIENT_ID } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser, CostItem, AppSettings, SidebarGroupKey } from './types';
import { 
  Plus, Trash2, Check, X, 
  Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
  ExternalLink, Settings, PawPrint, LogIn, ShieldAlert, Lock, Copy,
  ChevronDown, ChevronRight, Search, AlertTriangle, ChevronLeft, Phone, Clock, FileText,
  Edit2, MoreVertical, Wallet, Filter, CreditCard, AlertCircle, CheckCircle, Loader2,
  Scissors, TrendingUp, AlertOctagon, BarChart2, TrendingDown, Calendar, PieChart as PieChartIcon,
  ShoppingBag, Tag, User, Key, Unlock, Palette, Layout as LayoutIcon, Type, ArrowUp, ArrowDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, CartesianGrid, Legend, ComposedChart, LabelList, PieChart, Pie
} from 'recharts';

// --- THEME PRESETS ---
// Formato RGB para usar no Tailwind com opacidade
const THEMES: Record<string, Record<string, string>> = {
    'Rose': { // PomPomPet Original
        '50': '255 241 242', '100': '255 228 230', '200': '254 205 211', '300': '253 164 175', '400': '251 113 133',
        '500': '244 63 94', '600': '225 29 72', '700': '190 18 60', '800': '159 18 57', '900': '136 19 55'
    },
    'Ocean': { // Azul Moderno
        '50': '239 246 255', '100': '219 234 254', '200': '191 219 254', '300': '147 197 253', '400': '96 165 250',
        '500': '59 130 246', '600': '37 99 235', '700': '29 78 216', '800': '30 64 175', '900': '30 58 138'
    },
    'Nature': { // Verde Suave
        '50': '240 253 244', '100': '220 252 231', '200': '187 247 208', '300': '134 239 172', '400': '74 222 128',
        '500': '34 197 94', '600': '22 163 74', '700': '21 128 61', '800': '22 101 52', '900': '20 83 45'
    },
    'Royal': { // Roxo Elegante
        '50': '250 245 255', '100': '243 232 255', '200': '233 213 255', '300': '216 180 254', '400': '192 132 252',
        '500': '168 85 247', '600': '147 51 234', '700': '126 34 206', '800': '107 33 168', '900': '88 28 135'
    },
    'Slate': { // Cinza Corporativo
        '50': '248 250 252', '100': '241 245 249', '200': '226 232 240', '300': '203 213 225', '400': '148 163 184',
        '500': '100 116 139', '600': '71 85 105', '700': '51 65 85', '800': '30 41 59', '900': '15 23 42'
    }
};

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';

// --- Sub-Components ---

// Settings Modal
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: AppSettings; onSave: (s: AppSettings) => void; }> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<'general'|'theme'|'menu'>('general');

    if (!isOpen) return null;

    const moveGroup = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...localSettings.sidebarOrder];
        if (direction === 'up' && index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        }
        setLocalSettings({...localSettings, sidebarOrder: newOrder});
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[500px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Settings size={20}/> Configurações</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
                </div>
                
                <div className="flex bg-white border-b">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'general' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Geral</button>
                    <button onClick={() => setActiveTab('theme')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'theme' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Aparência</button>
                    <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'menu' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Menu</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Aplicativo</label>
                                <div className="relative">
                                    <Type className="absolute left-3 top-3 text-gray-400" size={16}/>
                                    <input value={localSettings.appName} onChange={e => setLocalSettings({...localSettings, appName: e.target.value})} className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 ring-brand-200" placeholder="Ex: PetShop Top" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL do Logo</label>
                                <div className="flex gap-2">
                                    <input value={localSettings.logoUrl} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 ring-brand-200 text-sm" placeholder="/logo.png ou https://..." />
                                    <div className="w-10 h-10 border rounded-lg bg-white flex items-center justify-center overflow-hidden">
                                        <img src={localSettings.logoUrl} alt="Preview" className="w-full h-full object-contain" onError={(e) => (e.target as HTMLElement).style.display='none'}/>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Recomendado: Imagem quadrada transparente.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'theme' && (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tema de Cores</label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.keys(THEMES).map(themeName => (
                                    <button 
                                        key={themeName}
                                        onClick={() => setLocalSettings({...localSettings, theme: themeName})}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${localSettings.theme === themeName ? 'border-brand-500 bg-white ring-2 ring-brand-100 shadow-sm' : 'border-gray-200 hover:bg-white'}`}
                                    >
                                        <div 
                                            className="w-8 h-8 rounded-full shadow-sm border border-black/10"
                                            style={{ backgroundColor: `rgb(${THEMES[themeName]['500']})` }}
                                        />
                                        <span className="font-bold text-sm text-gray-700">{themeName}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'menu' && (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ordem dos Grupos</label>
                            <div className="space-y-2">
                                {localSettings.sidebarOrder.map((group, index) => (
                                    <div key={group} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                                        <span className="font-medium text-gray-700 capitalize">
                                            {group === 'operacional' ? 'Operacional' : group === 'gerencial' ? 'Gerencial' : 'Cadastros e Serviços'}
                                        </span>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => moveGroup(index, 'up')} 
                                                disabled={index === 0}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30"
                                            >
                                                <ArrowUp size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => moveGroup(index, 'down')} 
                                                disabled={index === localSettings.sidebarOrder.length - 1}
                                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30"
                                            >
                                                <ArrowDown size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400">Use as setas para reorganizar a barra lateral.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl text-sm transition">Cancelar</button>
                    <button onClick={() => onSave(localSettings)} className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 active:scale-95 transition">Aplicar</button>
                </div>
            </div>
        </div>
    );
};

const SetupScreen: React.FC<{ onSave: (id: string) => void }> = ({ onSave }) => {
    const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
    return ( <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"> <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 text-center"> <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">P</div> <h1 className="text-2xl font-bold text-gray-800 mb-2">Configuração Inicial</h1> <p className="text-gray-500 mb-6">ID do Cliente Google (OAuth 2.0)</p> <div className="text-left mb-6"> <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Ex: 1234...apps.googleusercontent.com" className="w-full border p-3 rounded-lg focus:ring-2 ring-brand-500 outline-none font-mono text-sm" /> </div> <button onClick={() => { if(clientId.trim().length > 10) onSave(clientId); else alert("ID inválido"); }} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition" > Salvar e Continuar </button> </div> </div> );
};

const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void; settings: AppSettings }> = ({ onLogin, onReset, settings }) => {
    const currentOrigin = window.location.origin;
    const isTemporaryLink = currentOrigin.includes('vercel.app') && (currentOrigin.split('-').length > 2);
    return ( <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4"> <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"> <div className="w-full flex justify-center mb-6"> <img src={settings.logoUrl} alt={settings.appName} className="w-48 h-auto object-contain" onError={(e) => (e.target as HTMLImageElement).src = '/logo.png'} /> </div> <h1 className="text-3xl font-bold text-gray-800 mb-2">{settings.appName}</h1> <p className="text-gray-500 mb-8">Faça login para acessar sua agenda e clientes.</p> <button onClick={onLogin} className="w-full bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all group mb-6" > <div className="bg-white p-1 rounded-full"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" /></div> Entrar com Google </button> {isTemporaryLink && ( <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-left text-xs text-orange-800 mb-4"> <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Atenção: Link Temporário</p> <p>Você está acessando por um link temporário. Recomenda-se usar o link principal do projeto para evitar erros de login.</p> </div> )} <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-red-500 underline"> Alterar ID do Cliente </button> </div> </div> );
};

// --- IMPLEMENTED SUB-COMPONENTS ---

const CustomXAxisTick = ({ x, y, payload }: any) => {
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)" fontSize={10}>
                {payload.value}
            </text>
        </g>
    );
};

const PinGuard: React.FC<{ isUnlocked: boolean; onUnlock: (pin: string) => boolean; onSetPin: (pin: string) => void; hasPin: boolean; onReset: () => void }> = ({ isUnlocked, onUnlock, onSetPin, hasPin, onReset }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    if (isUnlocked) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hasPin) {
            if (!onUnlock(input)) {
                setError(true);
                setInput('');
            }
        } else {
            if (input.length >= 4) {
                onSetPin(input);
            } else {
                setError(true);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-gray-900/90 backdrop-blur flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
                <div className="mx-auto w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-4">
                    <Lock size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {hasPin ? 'Área Restrita' : 'Definir Senha'}
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                    {hasPin ? 'Digite sua senha para acessar dados financeiros.' : 'Crie uma senha para proteger o faturamento.'}
                </p>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="password" 
                        inputMode="numeric"
                        value={input}
                        onChange={(e) => { setInput(e.target.value); setError(false); }}
                        className={`w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border-b-2 outline-none transition-colors mb-2 ${error ? 'border-red-500 text-red-500' : 'border-gray-200 focus:border-brand-500'}`}
                        placeholder="••••"
                        maxLength={6}
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-xs mb-4">{hasPin ? 'Senha incorreta' : 'Mínimo 4 dígitos'}</p>}
                    <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition mt-4">
                        {hasPin ? 'Desbloquear' : 'Salvar Senha'}
                    </button>
                </form>
                {hasPin && (
                    <button onClick={onReset} className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline">
                        Esqueci minha senha
                    </button>
                )}
            </div>
        </div>
    );
};

const RevenueView: React.FC<{ appointments: Appointment[], services: Service[], clients: Client[] }> = ({ appointments }) => {
    const data = appointments.reduce((acc: any[], app) => {
        if (app.status !== 'concluido' && app.status !== 'agendado') return acc;
        const date = new Date(app.date);
        const month = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        const existing = acc.find(i => i.month === month);
        const amount = app.paidAmount || 0; 
        if (existing) {
            existing.total += amount;
            if (app.status === 'concluido') existing.realized += amount;
        } else {
            acc.push({ month, total: amount, realized: app.status === 'concluido' ? amount : 0 });
        }
        return acc;
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><TrendingUp/> Faturamento</h2>
            <div className="h-64 bg-white p-4 rounded-xl shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={<CustomXAxisTick />} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="var(--color-brand-300)" name="Previsto" />
                        <Bar dataKey="realized" fill="var(--color-brand-600)" name="Realizado" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const CostsView: React.FC<{ costs: CostItem[] }> = ({ costs }) => {
     return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><TrendingDown/> Custos</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {costs.map(c => (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 whitespace-nowrap">{new Date(c.date).toLocaleDateString()}</td>
                                    <td className="p-4 whitespace-nowrap">{c.category}</td>
                                    <td className="p-4 text-right whitespace-nowrap">R$ {c.amount.toFixed(2)}</td>
                                    <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status || 'Pendente'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
     );
};

const ClientManager: React.FC<{ clients: Client[], onDeleteClient: (id: string) => void, googleUser: any, accessToken: any }> = ({ clients, onDeleteClient }) => {
    const [search, setSearch] = useState('');
    const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><User/> Clientes</h2>
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou telefone..." className="pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 ring-brand-200"/>
                 </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(client => (
                    <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-gray-800">{client.name}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={12}/> {client.phone}</p>
                            </div>
                            <button onClick={() => onDeleteClient(client.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                        <div className="space-y-2 mt-3">
                            {client.pets.map(pet => (
                                <div key={pet.id} className="text-xs bg-gray-50 p-2 rounded flex items-center gap-2">
                                    <PawPrint size={12} className="text-brand-400"/>
                                    <span className="font-medium">{pet.name}</span>
                                    <span className="text-gray-400">({pet.breed})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ServiceManager: React.FC<{ services: Service[], onAddService: (s: Service) => void, onDeleteService: (id: string) => void, onSyncServices: (s: any) => void, accessToken: any, sheetId: string }> = ({ services, onDeleteService, onSyncServices }) => {
    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Scissors/> Serviços</h2>
                 <button onClick={() => onSyncServices(null)} className="flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-xl font-bold hover:bg-brand-100 transition text-sm">
                    <Sparkles size={18}/> Sincronizar
                 </button>
            </div>
             <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4 text-right">Preço</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(s => (
                            <tr key={s.id} className="border-b last:border-0">
                                <td className="p-4 font-medium">{s.name}</td>
                                <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs border ${s.category === 'principal' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>{s.category}</span></td>
                                <td className="p-4 text-right">R$ {s.price.toFixed(2)}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => onDeleteService(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const ScheduleManager: React.FC<{ appointments: Appointment[], clients: Client[], services: Service[], onAdd: any, onEdit: any, onUpdateStatus: any, onDelete: any, googleUser: any }> = ({ appointments, onUpdateStatus, onDelete }) => {
     const sorted = [...appointments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarIcon/> Agenda</h2>
            <div className="space-y-3">
                {sorted.map(app => (
                    <div key={app.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-500 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-gray-800">{new Date(app.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                <span className="text-sm text-gray-500">{new Date(app.date).toLocaleDateString('pt-BR')}</span>
                             </div>
                             <p className="font-medium text-gray-700">{app.serviceId}</p> 
                        </div>
                        <div className="flex gap-2">
                             {app.status !== 'concluido' && (
                                <button onClick={() => onUpdateStatus(app.id, 'concluido')} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Concluir"><Check size={20}/></button>
                             )}
                             <button onClick={() => onDelete(app.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Cancelar"><X size={20}/></button>
                        </div>
                    </div>
                ))}
                {sorted.length === 0 && <div className="text-center text-gray-400 py-10">Nenhum agendamento.</div>}
            </div>
        </div>
     );
};

const PaymentManager: React.FC<{ appointments: Appointment[], clients: Client[], services: Service[], onUpdateAppointment: any, accessToken: any, sheetId: string }> = ({ appointments, onUpdateAppointment }) => {
    const unpaid = appointments.filter(a => a.status === 'concluido' && (!a.paidAmount || a.paidAmount === 0));

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Wallet/> Pagamentos Pendentes</h2>
            <div className="space-y-3">
                {unpaid.map(app => (
                    <div key={app.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">Agendamento em {new Date(app.date).toLocaleDateString()}</p>
                            <p className="text-sm text-red-500 font-medium">Pagamento Pendente</p>
                        </div>
                        <button 
                            onClick={() => onUpdateAppointment({...app, paidAmount: 50, paymentMethod: 'Dinheiro'})} 
                            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700"
                        >
                            Receber
                        </button>
                    </div>
                ))}
                {unpaid.length === 0 && <div className="bg-green-50 text-green-700 p-6 rounded-xl text-center font-medium">Tudo pago! Nenhuma pendência.</div>}
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- APP SETTINGS STATE ---
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('petgestor_settings');
      return saved ? JSON.parse(saved) : {
          appName: 'PomPomPet',
          logoUrl: '/logo.png',
          theme: 'Rose',
          sidebarOrder: ['operacional', 'cadastros', 'gerencial']
      };
  });

  // --- PIN SECURITY STATE ---
  const [pin, setPin] = useState(localStorage.getItem('petgestor_pin') || '');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);

  const SHEET_ID = localStorage.getItem('petgestor_sheet_id') || PREDEFINED_SHEET_ID;
  const STORAGE_KEY_TOKEN = 'petgestor_access_token';
  const STORAGE_KEY_EXPIRY = 'petgestor_token_expiry';
  const STORAGE_KEY_USER = 'petgestor_user_profile';

  // Apply Theme Effect
  useEffect(() => {
      const colors = THEMES[settings.theme] || THEMES['Rose'];
      const root = document.documentElement;
      Object.keys(colors).forEach(shade => {
          root.style.setProperty(`--color-brand-${shade}`, colors[shade]);
      });
  }, [settings.theme]);

  // Save Settings Effect
  useEffect(() => {
      localStorage.setItem('petgestor_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setClients(db.getClients());
    setServices(db.getServices());
    setAppointments(db.getAppointments());
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
          if(!rows || rows.length < 2) { if(!silent) alert('Aba Agendamento vazia ou não encontrada.'); return; }
          const loadedApps: Appointment[] = []; const newTempClients: Client[] = []; const currentClients = db.getClients(); const existingClientIds = new Set(currentClients.map(c => c.id));
          rows.slice(1).forEach((row: string[], idx: number) => {
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
              if(client && pet) { loadedApps.push({ id: `sheet_${idx}`, clientId: client.id, petId: pet.id, serviceId: service?.id || 'unknown', additionalServiceIds: addServiceIds, date: isoDate, status: 'agendado', notes: row[13], durationTotal: parseInt(row[14] || '0'), paidAmount: paidAmount > 0 ? paidAmount : undefined, paymentMethod: paymentMethod as any, googleEventId: undefined }); }
          });
          if (newTempClients.length > 0) { const updatedClients = [...currentClients, ...newTempClients.filter(nc => !existingClientIds.has(nc.id))]; setClients(updatedClients); db.saveClients(updatedClients); }
          if(loadedApps.length > 0) { setAppointments(loadedApps); db.saveAppointments(loadedApps); if(!silent) alert(`${loadedApps.length} agendamentos carregados!`); } else { if(!silent) alert('Nenhum agendamento válido encontrado.'); }
      } catch (error) { console.error(error); if(!silent) alert('Erro ao sincronizar agendamentos. Verifique se a data está em DD/MM/AAAA.'); }
  };
  const handleAddAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[]) => {
    let googleEventId = '';
    if (accessToken) {
        const mainService = appServices[0]; let totalDuration = mainService.durationMin; const description = appServices.map(s => s.name).join(' + ');
        if(appServices.length > 1) { appServices.slice(1).forEach(s => totalDuration += (s.durationMin || 0)); }
        const googleResponse = await googleService.createEvent(accessToken, { summary: `Banho/Tosa: ${pet.name} - ${client.name}`, description: `Serviços: ${description}\nObs: ${pet.notes}`, startTime: app.date, durationMin: totalDuration });
        if (googleResponse && googleResponse.id) { googleEventId = googleResponse.id; }
        const dateObj = new Date(app.date); const dateStr = dateObj.toLocaleDateString('pt-BR'); const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const rowData = [ pet.name, client.name, client.phone, `${client.address} ${client.complement || ''}`.trim(), pet.breed, pet.size, pet.coat, appServices[0]?.name || '', appServices[1]?.name || '', appServices[2]?.name || '', appServices[3]?.name || '', dateStr, timeStr, pet.notes, totalDuration ];
        try { await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:O', rowData); alert('Agendamento salvo no Calendar e na Planilha!'); } catch (e) { alert('Erro ao salvar na planilha (verifique permissões). Salvo apenas localmente e no Calendar.'); }
    }
    const newApp = { ...app, googleEventId }; const updated = [...appointments, newApp]; setAppointments(updated); db.saveAppointments(updated);
  }
  const handleEditAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[]) => {
    let googleEventId = app.googleEventId;
    if (accessToken && googleEventId) {
         const description = appServices.map(s => s.name).join(' + ');
         let totalDuration = 0; appServices.forEach(s => totalDuration += (s.durationMin || 0));
         await googleService.updateEvent(accessToken, googleEventId, { summary: `Banho/Tosa: ${pet.name} - ${client.name}`, description: `Serviços: ${description}\nObs: ${pet.notes}`, startTime: app.date, durationMin: totalDuration });
    }
    if (accessToken && app.id.startsWith('sheet_')) {
        const parts = app.id.split('_'); const index = parseInt(parts[1]); const rowNumber = index + 2; const range = `Agendamento!A${rowNumber}:O${rowNumber}`; const dateObj = new Date(app.date); const dateStr = dateObj.toLocaleDateString('pt-BR'); const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); let totalDuration = 0; appServices.forEach(s => totalDuration += (s.durationMin || 0)); const rowData = [ pet.name, client.name, client.phone, `${client.address} ${client.complement || ''}`.trim(), pet.breed, pet.size, pet.coat, appServices[0]?.name || '', appServices[1]?.name || '', appServices[2]?.name || '', appServices[3]?.name || '', dateStr, timeStr, pet.notes, totalDuration ];
        try { await googleService.updateSheetValues(accessToken, SHEET_ID, range, rowData); } catch(e) { console.error("Update sheet failed", e); }
    }
    const updated = appointments.map(a => a.id === app.id ? app : a); setAppointments(updated); db.saveAppointments(updated); alert('Agendamento atualizado!');
  }
  const handleUpdateAppStatus = (id: string, status: Appointment['status']) => { const updated = appointments.map(a => a.id === id ? { ...a, status } : a); setAppointments(updated); db.saveAppointments(updated); }
  const handleDeleteApp = async (id: string) => {
     const appToDelete = appointments.find(a => a.id === id);
     if (appToDelete && appToDelete.googleEventId && accessToken) { try { await googleService.deleteEvent(accessToken, appToDelete.googleEventId); } catch (e) { console.error("Failed to delete from Google Calendar", e); alert("Atenção: Não foi possível excluir do Google Calendar (pode já ter sido removido). Removendo apenas do App."); } }
     const updated = appointments.filter(a => a.id !== id); setAppointments(updated); db.saveAppointments(updated);
  }

  // --- PIN LOGIC HANDLERS ---
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
  if (!googleUser) return <LoginScreen onLogin={() => googleService.login()} onReset={handleResetConfig} settings={settings} />;

  return (
    <HashRouter>
      <Layout 
        currentView={currentView} 
        setView={setCurrentView} 
        googleUser={googleUser} 
        onLogin={() => googleService.login()} 
        onLogout={handleLogout}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        {isGlobalLoading && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Sincronizando dados...</h3>
                <p className="text-gray-500">Buscando Clientes, Serviços, Agendamentos e Custos.</p>
            </div>
        )}
        
        {/* Settings Modal */}
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            settings={settings} 
            onSave={(newSettings) => { setSettings(newSettings); setIsSettingsOpen(false); }} 
        />
        
        {/* PIN GUARD OVERLAY */}
        {showPinModal && (
            <PinGuard 
                isUnlocked={isPinUnlocked} 
                onUnlock={handleUnlockPin} 
                onSetPin={handleSetPin} 
                hasPin={!!pin} 
                onReset={handleResetPin}
            />
        )}

        {/* Conditional Rendering based on PIN */}
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