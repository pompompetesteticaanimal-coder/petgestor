
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { googleService, DEFAULT_CLIENT_ID } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser } from './types';
import { 
  Plus, Trash2, Check, X, 
  Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
  RefreshCw, ExternalLink, Settings, PawPrint, LogIn, ShieldAlert, Lock, Copy,
  ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- CONSTANTS ---
const PREDEFINED_SHEET_ID = '1qbb0RoKxFfrdyTCyHd5rJRbLNBPcOEk4Y_ctyy-ujLw';
const PREDEFINED_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfnUDOsMjn6iho8msiRw9ulfIEghwB1kEU_mrzz4PcSW97V-A/viewform';

// --- Sub-Components ---

// 1. Setup Screen (Hidden by default now, accessible via reset)
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

// 2. Login Screen (Gatekeeper)
const LoginScreen: React.FC<{ onLogin: () => void; onReset: () => void }> = ({ onLogin, onReset }) => {
    const currentOrigin = window.location.origin;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(currentOrigin);
        alert('Link copiado! Cole nas "Origens JavaScript autorizadas" no Google Cloud Console.');
    };

    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6 shadow-lg shadow-brand-200">P</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo</h1>
                <p className="text-gray-500 mb-8">Faça login para acessar sua agenda e clientes.</p>

                <button 
                    onClick={onLogin}
                    className="w-full bg-white border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-gray-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all group mb-6"
                >
                    <div className="bg-white p-1 rounded-full"><LogIn className="text-brand-600 group-hover:scale-110 transition-transform" /></div>
                    Entrar com Google
                </button>

                {/* Área de Ajuda para Erro 400 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left text-xs text-yellow-800">
                    <p className="font-bold mb-2 flex items-center gap-1"><ShieldAlert size={14}/> Deu erro 400?</p>
                    <p className="mb-2">Você precisa autorizar este site no Google:</p>
                    <div className="flex items-center gap-2 bg-white border border-yellow-300 rounded p-2 mb-2">
                        <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-gray-600">{currentOrigin}</code>
                        <button onClick={copyToClipboard} className="text-brand-600 font-bold hover:text-brand-800"><Copy size={14}/></button>
                    </div>
                    <p>Adicione este link em <strong>"Origens JavaScript autorizadas"</strong> no seu projeto do Google Cloud.</p>
                </div>

                <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-red-500 underline">
                    Alterar ID do Cliente
                </button>
            </div>
        </div>
    );
};

// 3. Dashboard Component
const Dashboard: React.FC<{ 
  appointments: Appointment[]; 
  services: Service[];
  clients: Client[];
}> = ({ appointments, services, clients }) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter(a => a.date.startsWith(today));
  
  const totalRevenue = todaysAppointments.reduce((acc, curr) => {
    const s = services.find(srv => srv.id === curr.serviceId);
    return acc + (s?.price || 0);
  }, 0);

  const pending = todaysAppointments.filter(a => a.status === 'agendado').length;
  const completed = todaysAppointments.filter(a => a.status === 'concluido').length;

  const chartData = [
    { name: 'Agendados', value: pending },
    { name: 'Concluídos', value: completed },
    { name: 'Cancelados', value: todaysAppointments.filter(a => a.status === 'cancelado').length }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Faturamento Hoje</p>
              <h3 className="text-2xl font-bold text-gray-800">R$ {totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Agendamentos Hoje</p>
              <h3 className="text-2xl font-bold text-gray-800">{todaysAppointments.length}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <CalendarIcon size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
             <div>
              <p className="text-sm text-gray-500">Clientes Ativos</p>
              <h3 className="text-2xl font-bold text-gray-800">{clients.length}</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
              <Sparkles size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col">
        <h3 className="font-semibold text-gray-700 mb-4">Status dos Agendamentos (Hoje)</h3>
        <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#22c55e' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// 4. Client Manager
const ClientManager: React.FC<{
  clients: Client[];
  onSyncClients: (newClients: Client[]) => void;
  onDeleteClient: (id: string) => void;
  googleUser: GoogleUser | null;
  accessToken: string | null;
}> = ({ clients, onSyncClients, onDeleteClient, googleUser, accessToken }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [sheetId, setSheetId] = useState(localStorage.getItem('petgestor_sheet_id') || PREDEFINED_SHEET_ID);
  const [formUrl, setFormUrl] = useState(localStorage.getItem('petgestor_form_url') || PREDEFINED_FORM_URL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Ordena clientes por data de criação (se existir) ou nome
  const sortedClients = [...clients].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
        // Data mais recente primeiro
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); 
    }
    return a.name.localeCompare(b.name);
  });

  const filteredClients = sortedClients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const saveConfig = () => {
    localStorage.setItem('petgestor_sheet_id', sheetId);
    localStorage.setItem('petgestor_form_url', formUrl);
    setShowConfig(false);
  };

  const handleSync = async () => {
    if (!accessToken) {
      alert("Sessão expirada. Recarregue a página.");
      return;
    }
    if (!sheetId) {
      alert("ID da Planilha não configurado.");
      setShowConfig(true);
      return;
    }

    setIsSyncing(true);
    try {
      // Leitura expandida até a coluna O (índice 14)
      const rows = await googleService.getSheetValues(accessToken, sheetId, 'CADASTRO!A:O'); 
      
      if (!rows || rows.length < 2) {
        alert("Planilha vazia ou aba 'CADASTRO' não encontrada.");
        setIsSyncing(false);
        return;
      }

      const clientsMap = new Map<string, Client>();

      rows.slice(1).forEach((row: string[], index: number) => {
        // Mapeamento baseado na lista fornecida pelo usuário:
        // 0: Nome/pet (Ignorar ou usar como ref)
        // 1: Carimbo (Timestamp)
        // 2: Email
        // 3: Nome Cliente
        // 4: Telefone
        // 5: Endereço
        // 6: Nome Pet
        // 7: Raça
        // 8: Porte
        // 9: Pelagem
        // 10: Obs
        // 11: Complemento
        // 12: Idade
        // 13: Sexo
        
        const timestamp = row[1];
        const clientName = row[3];
        const phone = row[4];
        const address = row[5];
        const complement = row[11]; // Complemento está na coluna L (index 11)
        
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
          // Converter data do sheets (ex: 12/06/2025 15:30:00) para ISO se possível
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
      onSyncClients(newClientList);
      alert(`${newClientList.length} clientes sincronizados com sucesso da aba CADASTRO!`);

    } catch (error) {
      console.error(error);
      alert("Erro ao sincronizar. Verifique se o ID da planilha está correto, se a aba 'CADASTRO' existe e se você tem permissão de acesso.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Clientes e Pets</h2>
            <p className="text-sm text-gray-500">Ordenado por data de cadastro (mais recentes no topo)</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
             {formUrl && (
                <a 
                  href={formUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition text-sm flex-1 md:flex-none justify-center"
                >
                  <ExternalLink size={16} /> Formulário
                </a>
             )}
             
             <button 
                onClick={handleSync} 
                disabled={isSyncing}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition text-sm flex-1 md:flex-none justify-center disabled:opacity-70"
             >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
             </button>

             <button 
                onClick={() => setShowConfig(!showConfig)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg"
             >
                <Settings size={20} />
             </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input 
            className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 ring-brand-200 outline-none"
            placeholder="Buscar por nome do cliente, pet ou telefone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {showConfig && (
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center gap-2">
            <Settings size={18} /> Configurações do Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">ID da Planilha Google</label>
                <input 
                    className="w-full border p-2 rounded focus:ring-2 ring-yellow-400 outline-none" 
                    value={sheetId} 
                    onChange={e => setSheetId(e.target.value)} 
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Link do Formulário</label>
                <input 
                    className="w-full border p-2 rounded focus:ring-2 ring-yellow-400 outline-none" 
                    value={formUrl} 
                    onChange={e => setFormUrl(e.target.value)} 
                />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Fechar</button>
            <button onClick={saveConfig} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Salvar</button>
          </div>
        </div>
      )}

      {clients.length === 0 && !showConfig ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 mb-2">Nenhum cliente encontrado.</p>
              <p className="text-sm text-gray-400">Clique em "Sincronizar" para carregar.</p>
          </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadastro</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato / Endereço</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet(s)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClients.map(client => (
                            <tr key={client.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                    {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '-'}
                                    <div className="text-[10px] text-gray-400">
                                        {client.createdAt ? new Date(client.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{client.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{client.phone}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin size={10} /> {client.address} {client.complement ? `, ${client.complement}` : ''}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        {client.pets.map((pet, idx) => (
                                            <div key={idx} className="bg-brand-50 rounded p-2 text-xs border border-brand-100">
                                                <div className="flex items-center justify-between font-bold text-brand-800">
                                                    <span className="flex items-center gap-1"><PawPrint size={10} /> {pet.name}</span>
                                                    <span>{pet.breed}</span>
                                                </div>
                                                <div className="text-gray-600 mt-1 grid grid-cols-2 gap-1">
                                                    <span>{pet.gender}</span>
                                                    <span>{pet.age}</span>
                                                    <span>{pet.size}</span>
                                                    <span>{pet.coat}</span>
                                                </div>
                                                {pet.notes && (
                                                    <div className="mt-1 text-red-500 italic bg-white px-1 rounded border border-red-100">
                                                        Obs: {pet.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <button onClick={() => onDeleteClient(client.id)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

// 5. Service Manager
const ServiceManager: React.FC<{
  services: Service[];
  onAddService: (s: Service) => void;
  onDeleteService: (id: string) => void;
}> = ({ services, onAddService, onDeleteService }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [desc, setDesc] = useState('');

    const handleAdd = () => {
        if(name && price) {
            onAddService({
                id: Date.now().toString(),
                name,
                price: parseFloat(price),
                description: desc,
                durationMin: 60
            });
            setName(''); setPrice(''); setDesc('');
        }
    }

    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-gray-800">Catálogo de Serviços</h2>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-gray-500">Nome do Serviço</label>
                    <input className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Banho Premium" />
                </div>
                <div className="w-full md:w-32">
                    <label className="text-xs font-semibold text-gray-500">Valor (R$)</label>
                    <input type="number" className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-gray-500">Descrição</label>
                    <input className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalhes do serviço" />
                </div>
                <button onClick={handleAdd} className="bg-brand-600 text-white px-6 py-2 rounded hover:bg-brand-700 h-[42px]">Adicionar</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group">
                        <div>
                            <h4 className="font-bold text-gray-800">{s.name}</h4>
                            <p className="text-sm text-gray-500">{s.description}</p>
                            <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">R$ {s.price.toFixed(2)}</span>
                        </div>
                        <button onClick={() => onDeleteService(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 p-2 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                    </div>
                ))}
             </div>
        </div>
    )
}

// 6. Schedule Manager - NEW STRUCTURE
const ScheduleManager: React.FC<{
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  onAdd: (a: Appointment) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
  onDelete: (id: string) => void;
  googleUser: GoogleUser | null;
}> = ({ appointments, clients, services, onAdd, onUpdateStatus, onDelete, googleUser }) => {
    // Estado para controle de dias expandidos
    const todayStr = new Date().toISOString().split('T')[0];
    const [expandedDays, setExpandedDays] = useState<string[]>([todayStr]);
    const [showModal, setShowModal] = useState(false);
    
    // Estado de Busca na Agenda
    const [searchTerm, setSearchTerm] = useState('');

    // Form State (Agora inclui data)
    const [selDate, setSelDate] = useState(todayStr);
    const [selTime, setSelTime] = useState('09:00');
    const [selClient, setSelClient] = useState('');
    const [selPet, setSelPet] = useState('');
    const [selService, setSelService] = useState('');
    const [searchClientModal, setSearchClientModal] = useState('');

    // Filtrar agendamentos ANTES de agrupar
    const filteredAppointments = appointments.filter(app => {
        if (!searchTerm) return true;
        
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const service = services.find(s => s.id === app.serviceId);
        const term = searchTerm.toLowerCase();

        return (
            client?.name.toLowerCase().includes(term) ||
            pet?.name.toLowerCase().includes(term) ||
            service?.name.toLowerCase().includes(term)
        );
    });

    // Agrupa agendamentos (filtrados) por dia
    const groupedApps = filteredAppointments.reduce((acc, app) => {
        const date = app.date.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(app);
        return acc;
    }, {} as Record<string, Appointment[]>);

    // Ordena as chaves (datas) cronologicamente
    const sortedDates = Object.keys(groupedApps).sort();

    // Expande automaticamente dias encontrados na busca
    useEffect(() => {
        if(searchTerm) {
            setExpandedDays(sortedDates);
        }
    }, [searchTerm, sortedDates.length]);

    const toggleDay = (date: string) => {
        if (expandedDays.includes(date)) {
            setExpandedDays(expandedDays.filter(d => d !== date));
        } else {
            setExpandedDays([...expandedDays, date]);
        }
    };

    const handleCreate = () => {
        if(selClient && selPet && selService && selDate) {
            onAdd({
                id: Date.now().toString(),
                clientId: selClient,
                petId: selPet,
                serviceId: selService,
                date: `${selDate}T${selTime}`,
                status: 'agendado'
            });
            setShowModal(false);
            setSearchClientModal('');
            // Auto expande o dia onde o agendamento foi criado
            if (!expandedDays.includes(selDate)) {
                setExpandedDays(prev => [...prev, selDate]);
            }
        }
    };

    // Filtro para busca de cliente no MODAL
    const filteredClientsForModal = clients.filter(c => 
        c.name.toLowerCase().includes(searchClientModal.toLowerCase()) || 
        c.phone.includes(searchClientModal)
    );

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h2 className="text-2xl font-bold text-gray-800">Agenda</h2>
                     {googleUser && (
                        <div className="text-xs text-blue-600 flex items-center gap-1">
                            <CalendarIcon size={12} /> Sincronizado com Google Calendar
                        </div>
                     )}
                </div>
                <button 
                    onClick={() => {
                        setSelDate(todayStr); 
                        setShowModal(true);
                    }} 
                    className="bg-brand-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-brand-700 transition flex items-center justify-center gap-2 font-bold w-full md:w-auto"
                >
                    <Plus /> Novo Agendamento
                </button>
            </div>

            {/* Barra de Pesquisa da Agenda */}
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 ring-brand-200 outline-none bg-white shadow-sm"
                    placeholder="Buscar na agenda (cliente, pet ou serviço)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Timeline agrupada por dias */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {sortedDates.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            <CalendarIcon size={48} className="mx-auto mb-2 opacity-20"/>
                            <p>{searchTerm ? 'Nenhum agendamento encontrado para esta busca.' : 'Nenhum agendamento encontrado.'}</p>
                        </div>
                    ) : (
                        sortedDates.map(date => {
                            const apps = groupedApps[date].sort((a,b) => a.date.localeCompare(b.date));
                            const isExpanded = expandedDays.includes(date);
                            const isToday = date === todayStr;

                            return (
                                <div key={date} className="border border-gray-100 rounded-lg overflow-hidden">
                                    {/* Header do Dia */}
                                    <button 
                                        onClick={() => toggleDay(date)}
                                        className={`w-full flex items-center justify-between p-3 ${isToday ? 'bg-brand-50' : 'bg-gray-50'} hover:bg-gray-100 transition`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? <ChevronDown size={18} className="text-gray-500"/> : <ChevronRight size={18} className="text-gray-500"/>}
                                            <span className={`font-bold ${isToday ? 'text-brand-700' : 'text-gray-700'}`}>
                                                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                                {isToday && <span className="ml-2 text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full">Hoje</span>}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                            {apps.length} agendamentos
                                        </span>
                                    </button>

                                    {/* Lista de Agendamentos (Colapsável) */}
                                    {isExpanded && (
                                        <div className="p-3 space-y-3 bg-white">
                                            {apps.map(app => {
                                                const client = clients.find(c => c.id === app.clientId);
                                                const pet = client?.pets.find(p => p.id === app.petId);
                                                const service = services.find(s => s.id === app.serviceId);
                                                const time = app.date.split('T')[1];

                                                return (
                                                    <div key={app.id} className={`p-4 rounded-lg border-l-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all
                                                        ${app.status === 'concluido' ? 'border-green-500 bg-green-50/30' : 
                                                          app.status === 'cancelado' ? 'border-red-500 bg-red-50/30' : 'border-brand-500 bg-white'}`}>
                                                        
                                                        <div className="flex items-start gap-4">
                                                            <div className="text-xl font-bold text-gray-400">{time}</div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800">{pet?.name} <span className="text-gray-500 font-normal">({client?.name})</span></h4>
                                                                <p className="text-sm text-brand-600 font-medium">{service?.name}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {app.status === 'agendado' && (
                                                                <>
                                                                    <button onClick={() => onUpdateStatus(app.id, 'concluido')} title="Concluir" className="p-2 text-green-500 hover:bg-green-50 rounded-full"><Check size={18} /></button>
                                                                    <button onClick={() => onUpdateStatus(app.id, 'cancelado')} title="Cancelar" className="p-2 text-red-500 hover:bg-red-50 rounded-full"><X size={18} /></button>
                                                                </>
                                                            )}
                                                            {app.status === 'concluido' && (
                                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">
                                                                    Concluído
                                                                </span>
                                                            )}
                                                            {app.status === 'cancelado' && <span className="text-red-500 text-sm font-medium">Cancelado</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal Novo Agendamento */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in-down max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">Novo Agendamento</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Data e Hora */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Data</label>
                                    <input 
                                        type="date" 
                                        value={selDate} 
                                        onChange={e => setSelDate(e.target.value)} 
                                        className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Horário</label>
                                    <input type="time" value={selTime} onChange={e => setSelTime(e.target.value)} className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" />
                                </div>
                            </div>

                            {/* Busca Inteligente de Cliente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                {!selClient ? (
                                    <div className="mt-1 relative">
                                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input 
                                            className="w-full pl-9 p-2 border rounded focus:ring-2 ring-brand-200 outline-none"
                                            placeholder="Buscar cliente..."
                                            value={searchClientModal}
                                            onChange={e => setSearchClientModal(e.target.value)}
                                            autoFocus
                                        />
                                        {searchClientModal.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border shadow-lg rounded mt-1 max-h-40 overflow-y-auto z-10">
                                                {filteredClientsForModal.length === 0 ? (
                                                    <div className="p-2 text-xs text-gray-500">Nenhum cliente encontrado.</div>
                                                ) : (
                                                    filteredClientsForModal.map(c => (
                                                        <button 
                                                            key={c.id} 
                                                            onClick={() => { setSelClient(c.id); setSelPet(''); setSearchClientModal(''); }}
                                                            className="w-full text-left p-2 hover:bg-brand-50 text-sm border-b last:border-0"
                                                        >
                                                            <div className="font-bold">{c.name}</div>
                                                            <div className="text-xs text-gray-500">{c.phone}</div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                        {clients.length === 0 && <p className="text-xs text-red-500 mt-1">Sincronize a planilha primeiro.</p>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded mt-1">
                                        <span className="font-bold text-brand-800 text-sm">
                                            {clients.find(c => c.id === selClient)?.name}
                                        </span>
                                        <button onClick={() => { setSelClient(''); setSelPet(''); }} className="text-red-500 hover:text-red-700 text-xs font-bold">Trocar</button>
                                    </div>
                                )}
                            </div>

                            {selClient && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pet</label>
                                    <select value={selPet} onChange={e => setSelPet(e.target.value)} className="w-full border p-2 rounded mt-1">
                                        <option value="">Selecione...</option>
                                        {clients.find(c => c.id === selClient)?.pets.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Serviço</label>
                                <select value={selService} onChange={e => setSelService(e.target.value)} className="w-full border p-2 rounded mt-1">
                                    <option value="">Selecione...</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                            <button onClick={handleCreate} disabled={!selClient || !selPet || !selService} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Auth State
  const [isConfigured, setIsConfigured] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);

  // Initial Load and Auth Check
  useEffect(() => {
    // 1. Load Local Data
    setClients(db.getClients());
    setServices(db.getServices());
    setAppointments(db.getAppointments());

    // 2. Garante que o ID padrão está no localStorage para o serviço funcionar
    if (!localStorage.getItem('petgestor_client_id')) {
        localStorage.setItem('petgestor_client_id', DEFAULT_CLIENT_ID);
    }
    
    // Inicia a lógica de autenticação imediatamente
    initAuthLogic();
  }, []);

  const initAuthLogic = () => {
    if ((window as any).google) {
        googleService.init(async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                setAccessToken(tokenResponse.access_token);
                const profile = await googleService.getUserProfile(tokenResponse.access_token);
                if (profile) {
                    setGoogleUser({
                        id: profile.id,
                        name: profile.name,
                        email: profile.email,
                        picture: profile.picture
                    });
                }
            }
        });
    } else {
        setTimeout(initAuthLogic, 1000);
    }
  };

  const handleSaveConfig = (id: string) => {
      localStorage.setItem('petgestor_client_id', id);
      setIsConfigured(true);
      window.location.reload(); // Reload to ensure clean init
  };

  const handleResetConfig = () => {
      localStorage.removeItem('petgestor_client_id');
      setIsConfigured(false);
      setGoogleUser(null);
  };

  // Handlers
  const handleSyncClients = (newClients: Client[]) => {
      setClients(newClients);
      db.saveClients(newClients);
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

  const handleAddAppointment = async (app: Appointment) => {
    const updated = [...appointments, app];
    setAppointments(updated);
    db.saveAppointments(updated);

    if (accessToken) {
        const client = clients.find(c => c.id === app.clientId || c.name === app.clientId); 
        const pet = client?.pets.find(p => p.id === app.petId);
        const service = services.find(s => s.id === app.serviceId);

        if (client && pet && service) {
            await googleService.createEvent(accessToken, {
                summary: `Banho e Tosa: ${pet.name} (${client.name})`,
                description: `Serviço: ${service.name}\nCliente: ${client.name}\nTelefone: ${client.phone}\nObs: ${pet.notes}`,
                startTime: app.date,
                durationMin: service.durationMin
            });
            alert('Agendamento sincronizado com Google Agenda!');
        }
    }
  }
  const handleUpdateAppStatus = (id: string, status: Appointment['status']) => {
    const updated = appointments.map(a => a.id === id ? { ...a, status } : a);
    setAppointments(updated);
    db.saveAppointments(updated);
  }
  const handleDeleteApp = (id: string) => {
     const updated = appointments.filter(a => a.id !== id);
     setAppointments(updated);
     db.saveAppointments(updated);
  }

  // --- RENDER LOGIC ---

  if (!isConfigured) {
      return <SetupScreen onSave={handleSaveConfig} />;
  }

  if (!googleUser) {
      return <LoginScreen onLogin={() => googleService.login()} onReset={handleResetConfig} />;
  }

  return (
    <HashRouter>
      <Layout 
        currentView={currentView} 
        setView={setCurrentView}
        googleUser={googleUser}
        onLogin={() => googleService.login()}
        onLogout={() => { setAccessToken(null); setGoogleUser(null); }}
      >
        {currentView === 'dashboard' && <Dashboard appointments={appointments} services={services} clients={clients} />}
        
        {currentView === 'clients' && (
            <ClientManager 
                clients={clients} 
                onSyncClients={handleSyncClients} 
                onDeleteClient={handleDeleteClient}
                googleUser={googleUser}
                accessToken={accessToken}
            />
        )}

        {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} />}
        {currentView === 'schedule' && (
            <ScheduleManager 
                appointments={appointments} 
                clients={clients} 
                services={services}
                onAdd={handleAddAppointment}
                onUpdateStatus={handleUpdateAppStatus}
                onDelete={handleDeleteApp}
                googleUser={googleUser}
            />
        )}
      </Layout>
    </HashRouter>
  );
};

export default App;
