
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
  ChevronDown, ChevronRight, Search, AlertTriangle, ChevronLeft, Phone, Clock, FileText,
  Edit2, MoreVertical
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(currentOrigin);
        alert('Link copiado!');
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

                {isTemporaryLink && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-left text-xs text-orange-800 mb-4">
                        <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Atenção: Link Temporário</p>
                        <p>Você está acessando por um link temporário. Recomenda-se usar o link principal do projeto.</p>
                    </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left text-xs text-yellow-800">
                    <p className="font-bold mb-2 flex items-center gap-1"><ShieldAlert size={14}/> Erro de Login?</p>
                    <p className="mb-2">Autorize este link no Google Cloud:</p>
                    <div className="flex items-center gap-2 bg-white border border-yellow-300 rounded p-2 mb-2">
                        <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-gray-600">{currentOrigin}</code>
                        <button onClick={copyToClipboard} className="text-brand-600 font-bold hover:text-brand-800"><Copy size={14}/></button>
                    </div>
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
    // Main Service
    const s = services.find(srv => srv.id === curr.serviceId);
    let total = s?.price || 0;
    // Additional Services
    if (curr.additionalServiceIds) {
        curr.additionalServiceIds.forEach(addId => {
            const addS = services.find(srv => srv.id === addId);
            if (addS) total += addS.price;
        });
    }
    return acc + total;
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

  const sortedClients = [...clients].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
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
      const rows = await googleService.getSheetValues(accessToken, sheetId, 'CADASTRO!A:O'); 
      
      if (!rows || rows.length < 2) {
        alert("Planilha vazia ou aba 'CADASTRO' não encontrada.");
        setIsSyncing(false);
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
      onSyncClients(newClientList);
      alert(`${newClientList.length} clientes sincronizados com sucesso da aba CADASTRO!`);

    } catch (error) {
      console.error(error);
      alert("Erro ao sincronizar. Verifique se o ID da planilha está correto e permissões.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Clientes e Pets</h2>
            <p className="text-sm text-gray-500">Ordenado por data de cadastro</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
             {formUrl && (
                <a href={formUrl} target="_blank" rel="noreferrer" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition text-sm flex-1 md:flex-none justify-center">
                  <ExternalLink size={16} /> Formulário
                </a>
             )}
             <button onClick={handleSync} disabled={isSyncing} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition text-sm flex-1 md:flex-none justify-center disabled:opacity-70">
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
             </button>
             <button onClick={() => setShowConfig(!showConfig)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg">
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
                <input className="w-full border p-2 rounded focus:ring-2 ring-yellow-400 outline-none" value={sheetId} onChange={e => setSheetId(e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Link do Formulário</label>
                <input className="w-full border p-2 rounded focus:ring-2 ring-yellow-400 outline-none" value={formUrl} onChange={e => setFormUrl(e.target.value)} />
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
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClients.map(client => (
                            <tr key={client.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                    {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="px-6 py-4"><div className="text-sm font-bold text-gray-900">{client.name}</div></td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{client.phone}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin size={10} /> {client.address}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        {client.pets.map((pet, idx) => (
                                            <div key={idx} className="bg-brand-50 rounded p-2 text-xs border border-brand-100">
                                                <div className="flex items-center justify-between font-bold text-brand-800">
                                                    <span className="flex items-center gap-1"><PawPrint size={10} /> {pet.name}</span>
                                                    <span>{pet.size}/{pet.coat}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
  onSyncServices: (s: Service[]) => void;
  accessToken: string | null;
  sheetId: string;
}> = ({ services, onAddService, onDeleteService, onSyncServices, accessToken, sheetId }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [desc, setDesc] = useState('');
    const [category, setCategory] = useState<'principal' | 'adicional'>('principal');
    const [size, setSize] = useState('Todos');
    const [coat, setCoat] = useState('Todos');
    const [isSyncing, setIsSyncing] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, id: string} | null>(null);
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editService, setEditService] = useState<Service | null>(null);

    const handleAdd = () => {
        if(name && price) {
            onAddService({ 
                id: Date.now().toString(), 
                name, 
                price: parseFloat(price), 
                description: desc, 
                durationMin: 60,
                category,
                targetSize: size,
                targetCoat: coat
            });
            setName(''); setPrice(''); setDesc('');
        }
    }

    const handleSync = async () => {
        if (!accessToken || !sheetId) {
            alert("Erro: Faça login e configure a planilha primeiro.");
            return;
        }

        setIsSyncing(true);
        try {
            // Lendo a aba "Serviço" colunas A até E
            const rows = await googleService.getSheetValues(accessToken, sheetId, 'Serviço!A:E');
            
            if(!rows || rows.length < 2) {
                alert("Aba 'Serviço' vazia ou não encontrada. Verifique se o nome da aba está correto (sem 's' no final).");
                return;
            }

            const newServices: Service[] = [];
            
            rows.slice(1).forEach((row: string[], idx: number) => {
                const sName = row[0];
                const sCat = (row[1] || 'principal').toLowerCase().includes('adicional') ? 'adicional' : 'principal';
                // Regra: Se estiver vazio, considera "Todos"
                const sSize = row[2] && row[2].trim() !== '' ? row[2] : 'Todos';
                const sCoat = row[3] && row[3].trim() !== '' ? row[3] : 'Todos';
                
                // --- FIX FOR NAN PRICE ---
                let rawPrice = row[4] || '0';
                // Remove 'R$', spaces, and treat comma as dot for JS parsing
                // E.g. "R$ 50,00" -> "50.00"
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
                onSyncServices(newServices);
                alert(`${newServices.length} serviços importados com sucesso! Preços atualizados.`);
            } else {
                alert("Nenhum serviço válido encontrado na planilha.");
            }

        } catch (e) {
            console.error(e);
            alert("Erro ao sincronizar serviços. Verifique a aba 'Serviço' na planilha.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteSheetService = async (serviceId: string) => {
        if (!serviceId.includes('sheet_svc_')) {
            alert("Este serviço foi criado manualmente, não está na planilha.");
            onDeleteService(serviceId);
            return;
        }

        if(!window.confirm("Isso apagará o conteúdo da linha na Planilha Google. Confirmar?")) return;

        try {
            // Extract index from ID format: sheet_svc_{index}_{timestamp}
            const parts = serviceId.split('_');
            const index = parseInt(parts[2]);
            const rowNumber = index + 2; // Data starts at row 2 (index 0)

            const range = `Serviço!A${rowNumber}:E${rowNumber}`;
            
            await googleService.clearSheetValues(accessToken!, sheetId, range);
            onDeleteService(serviceId);
            alert("Serviço excluído da planilha com sucesso.");
        } catch (e) {
            console.error(e);
            alert("Erro ao excluir da planilha. Verifique permissões.");
        }
    };

    const handleOpenEdit = (service: Service) => {
        setEditService({...service});
        setIsEditModalOpen(true);
        setContextMenu(null);
    }

    const handleSaveEdit = async () => {
        if (!editService) return;

        if (!editService.id.includes('sheet_svc_')) {
            alert("A edição de serviços manuais não salva na planilha, apenas localmente.");
            // Update local
            const newServices = services.map(s => s.id === editService.id ? editService : s);
            onSyncServices(newServices);
            setIsEditModalOpen(false);
            return;
        }

        try {
            setIsSyncing(true);
            const parts = editService.id.split('_');
            const index = parseInt(parts[2]);
            const rowNumber = index + 2;
            const range = `Serviço!A${rowNumber}:E${rowNumber}`;

            const rowData = [
                editService.name,
                editService.category,
                editService.targetSize,
                editService.targetCoat,
                editService.price.toString().replace('.', ',') // Convert back to BR format for sheets
            ];

            await googleService.updateSheetValues(accessToken!, sheetId, range, rowData);
            
            // Update local state to reflect changes immediately
            const newServices = services.map(s => s.id === editService.id ? editService : s);
            onSyncServices(newServices);
            
            alert("Serviço atualizado na planilha!");
            setIsEditModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Erro ao atualizar planilha.");
        } finally {
            setIsSyncing(false);
        }
    }

    // Group services for display
    const groupedServices = services.reduce((acc, curr) => {
        const key = curr.category === 'principal' ? 'Principais' : 'Adicionais';
        if(!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
    }, {} as Record<string, Service[]>);

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Catálogo de Serviços</h2>
                <button 
                    onClick={handleSync} 
                    disabled={isSyncing}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition disabled:opacity-70"
                >
                    <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? 'Importando...' : 'Sincronizar da Planilha'}
                </button>
             </div>

             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Adicionar Novo Serviço Manualmente</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-gray-500">Nome do Serviço</label>
                        <input className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Banho Premium" />
                    </div>
                    <div>
                         <label className="text-xs font-semibold text-gray-500">Categoria</label>
                         <select className="w-full border p-2 rounded mt-1 bg-white" value={category} onChange={e => setCategory(e.target.value as any)}>
                             <option value="principal">Principal</option>
                             <option value="adicional">Adicional</option>
                         </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500">Valor (R$)</label>
                        <input type="number" className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                     <div>
                         <label className="text-xs font-semibold text-gray-500">Porte Alvo</label>
                         <select className="w-full border p-2 rounded mt-1 bg-white" value={size} onChange={e => setSize(e.target.value)}>
                             <option value="Todos">Todos</option>
                             <option value="Pequeno">Pequeno</option>
                             <option value="Médio">Médio</option>
                             <option value="Grande">Grande</option>
                         </select>
                     </div>
                     <div>
                         <label className="text-xs font-semibold text-gray-500">Pelagem Alvo</label>
                         <select className="w-full border p-2 rounded mt-1 bg-white" value={coat} onChange={e => setCoat(e.target.value)}>
                             <option value="Todos">Todos</option>
                             <option value="Curto">Curto</option>
                             <option value="Longo">Longo</option>
                         </select>
                     </div>
                     <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500">Descrição</label>
                        <input className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Detalhes" />
                     </div>
                     <button onClick={handleAdd} className="bg-brand-600 text-white px-6 py-2 rounded hover:bg-brand-700 h-[42px] font-bold">Adicionar</button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                {Object.entries(groupedServices).map(([cat, svcs]) => (
                    <div key={cat} className="space-y-3">
                        <h3 className="font-bold text-lg text-gray-700 border-b pb-2">{cat}</h3>
                        {svcs.sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(s => {
                            const displayPrice = (s.price === null || s.price === undefined || isNaN(s.price)) ? 0 : s.price;
                            const sizeLabel = (s.targetSize || 'Todos').substring(0,3);
                            const coatLabel = (s.targetCoat || 'Todos').substring(0,3);
                            
                            return (
                                <div 
                                    key={s.id} 
                                    className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group relative cursor-pointer hover:border-brand-300 transition"
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({ x: e.pageX, y: e.pageY, id: s.id });
                                    }}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800">{s.name}</h4>
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">{sizeLabel}/{coatLabel}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{s.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-bold px-2 py-1 rounded-full ${displayPrice === 0 ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                            {displayPrice === 0 ? 'Grátis' : `R$ ${displayPrice.toFixed(2)}`}
                                        </span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setContextMenu({ x: e.pageX, y: e.pageY, id: s.id });
                                            }}
                                            className="text-gray-400 p-2 hover:bg-gray-100 rounded-full"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}
             </div>

             {/* Context Menu */}
             {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
                    <div 
                        className="fixed z-50 bg-white shadow-xl border rounded-lg overflow-hidden py-1 w-48 animate-fade-in"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button 
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenEdit(services.find(s => s.id === contextMenu.id)!)}
                        >
                            <Edit2 size={16} /> Editar Serviço
                        </button>
                        <button 
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                            onClick={() => {
                                handleDeleteSheetService(contextMenu.id);
                                setContextMenu(null);
                            }}
                        >
                            <Trash2 size={16} /> Excluir da Planilha
                        </button>
                    </div>
                </>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editService && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in-down">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Editar Serviço</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                                <input className="w-full border p-2 rounded" value={editService.name} onChange={e => setEditService({...editService, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Preço (R$)</label>
                                    <input type="number" className="w-full border p-2 rounded" value={editService.price} onChange={e => setEditService({...editService, price: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                     <label className="block text-xs font-bold text-gray-500 mb-1">Categoria</label>
                                     <select className="w-full border p-2 rounded bg-white" value={editService.category} onChange={e => setEditService({...editService, category: e.target.value as any})}>
                                         <option value="principal">Principal</option>
                                         <option value="adicional">Adicional</option>
                                     </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                     <label className="block text-xs font-bold text-gray-500 mb-1">Porte</label>
                                     <select className="w-full border p-2 rounded bg-white" value={editService.targetSize || 'Todos'} onChange={e => setEditService({...editService, targetSize: e.target.value})}>
                                         <option value="Todos">Todos</option>
                                         <option value="Pequeno">Pequeno</option>
                                         <option value="Médio">Médio</option>
                                         <option value="Grande">Grande</option>
                                     </select>
                                </div>
                                <div>
                                     <label className="block text-xs font-bold text-gray-500 mb-1">Pelagem</label>
                                     <select className="w-full border p-2 rounded bg-white" value={editService.targetCoat || 'Todos'} onChange={e => setEditService({...editService, targetCoat: e.target.value})}>
                                         <option value="Todos">Todos</option>
                                         <option value="Curto">Curto</option>
                                         <option value="Longo">Longo</option>
                                     </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                            <button onClick={handleSaveEdit} disabled={isSyncing} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-bold disabled:opacity-50">
                                {isSyncing ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 6. Schedule Manager (CALENDAR VIEW REWRITE)
type CalendarViewType = 'month' | 'week' | 'day';

const ScheduleManager: React.FC<{
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  onAdd: (a: Appointment, client: Client, pet: Pet, services: Service[]) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
  onDelete: (id: string) => void;
  onSync: () => void;
  googleUser: GoogleUser | null;
  isSyncing: boolean;
}> = ({ appointments, clients, services, onAdd, onUpdateStatus, onDelete, onSync, googleUser, isSyncing }) => {
    const [view, setView] = useState<CalendarViewType>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // States for Details and Context Menu
    const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, id: string} | null>(null);

    // Form State
    const [selDate, setSelDate] = useState('');
    const [selTime, setSelTime] = useState('09:00');
    const [selClient, setSelClient] = useState('');
    const [selPet, setSelPet] = useState('');
    const [selService, setSelService] = useState('');
    const [selAdd1, setSelAdd1] = useState('');
    const [selAdd2, setSelAdd2] = useState('');
    const [selAdd3, setSelAdd3] = useState('');
    const [searchClientModal, setSearchClientModal] = useState('');

    // --- Helpers ---
    const getStartOfWeek = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
    };

    const addDays = (d: Date, days: number) => {
        const date = new Date(d);
        date.setDate(date.getDate() + days);
        return date;
    };

    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        else if (view === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        else newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate);
    };

    const getAppointmentStyle = (app: Appointment) => {
        const mainSvc = services.find(s => s.id === app.serviceId);
        const addSvcs = (app.additionalServiceIds || []).map(id => services.find(s => s.id === id)).filter(Boolean);
        
        // Verifica todos os nomes de serviços envolvidos
        const allServiceNames = [mainSvc?.name || '', ...addSvcs.map(s => s?.name || '')].join(' ').toLowerCase();

        // Regra de prioridade: Se tiver QUALQUER Tosa (Normal, Tesoura, Higiênica), fica Laranja
        if (allServiceNames.includes('tosa')) return 'bg-orange-100 text-orange-800 border-orange-200 border-l-4 border-l-orange-500';
        
        // Regra: Pacotes ficam Roxos
        if (mainSvc?.name.toLowerCase().includes('pacote')) return 'bg-purple-100 text-purple-800 border-purple-200 border-l-4 border-l-purple-500';
        
        // Regra: Banhos ficam Azuis
        if (mainSvc?.name.toLowerCase().includes('banho')) return 'bg-blue-100 text-blue-800 border-blue-200 border-l-4 border-l-blue-500';
        
        // Padrão
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }

    const filteredAppointments = appointments.filter(app => {
        if (!searchTerm) return true;
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        return (client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || pet?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    const openNewModal = (dateStr?: string, timeStr?: string) => {
        setSelDate(dateStr || new Date().toISOString().split('T')[0]);
        setSelTime(timeStr || '09:00');
        setSelClient(''); setSelPet(''); setSelService(''); setSelAdd1(''); setSelAdd2(''); setSelAdd3(''); setSearchClientModal('');
        setShowModal(true);
    };

    const handleCreate = () => {
        if(selClient && selPet && selService && selDate) {
            const client = clients.find(c => c.id === selClient)!;
            const pet = client.pets.find(p => p.id === selPet)!;
            
            const mainService = services.find(s => s.id === selService)!;
            const addServices = [selAdd1, selAdd2, selAdd3]
                .filter(id => id)
                .map(id => services.find(s => s.id === id)!);

            onAdd({
                id: Date.now().toString(),
                clientId: selClient,
                petId: selPet,
                serviceId: selService,
                additionalServiceIds: [selAdd1, selAdd2, selAdd3].filter(id => id),
                date: `${selDate}T${selTime}`,
                status: 'agendado'
            }, client, pet, [mainService, ...addServices]);

            setShowModal(false);
        }
    };

    const filteredClientsForModal = clients.filter(c => c.name.toLowerCase().includes(searchClientModal.toLowerCase()) || c.phone.includes(searchClientModal));
    
    // Filter Services based on Selected Pet
    const selectedPetObj = clients.find(c => c.id === selClient)?.pets.find(p => p.id === selPet);
    
    const availableMainServices = services.filter(s => {
        if(s.category !== 'principal') return false;
        if(!selectedPetObj) return true; // Show all if no pet selected
        
        // Relaxed matching logic (Case Insensitive)
        const sSize = (s.targetSize || 'Todos').toLowerCase();
        const sCoat = (s.targetCoat || 'Todos').toLowerCase();
        const pSize = (selectedPetObj.size || '').toLowerCase();
        const pCoat = (selectedPetObj.coat || '').toLowerCase();

        // If pet data is incomplete, show options so user isn't blocked
        if (!pSize && !pCoat) return true;

        const sizeMatch = sSize === 'todos' || !pSize || sSize === pSize;
        const coatMatch = sCoat === 'todos' || !pCoat || sCoat === pCoat;

        return sizeMatch && coatMatch;
    });

    const availableAddServices = services.filter(s => {
        if(s.category !== 'adicional') return false;
        if(!selectedPetObj) return true;

        const sSize = (s.targetSize || 'Todos').toLowerCase();
        const sCoat = (s.targetCoat || 'Todos').toLowerCase();
        const pSize = (selectedPetObj.size || '').toLowerCase();
        const pCoat = (selectedPetObj.coat || '').toLowerCase();

        if (!pSize && !pCoat) return true;

        const sizeMatch = sSize === 'todos' || !pSize || sSize === pSize;
        const coatMatch = sCoat === 'todos' || !pCoat || sCoat === pCoat;
        return sizeMatch && coatMatch;
    });

    // --- Renderers ---

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button onClick={() => navigate('prev')} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeft size={20}/></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 text-sm font-bold">Hoje</button>
                    <button onClick={() => navigate('next')} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRight size={20}/></button>
                </div>
            </div>
            
            <div className="flex gap-2">
                 <div className="bg-gray-100 p-1 rounded-lg flex">
                    {(['month', 'week', 'day'] as const).map(v => (
                        <button 
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-3 py-1 text-sm rounded-md capitalize ${view === v ? 'bg-white shadow text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                        </button>
                    ))}
                 </div>
                 <button onClick={onSync} disabled={isSyncing} className="bg-white border border-brand-200 text-brand-600 p-2 rounded-lg hover:bg-brand-50 disabled:opacity-50">
                     <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                 </button>
                 <button onClick={() => openNewModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2 font-bold">
                    <Plus size={18} /> Novo
                 </button>
            </div>
        </div>
    );

    const renderMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay(); // 0-6
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        // Empty slots
        for(let i=0; i<startDay; i++) days.push(<div key={`empty-${i}`} className="bg-gray-50 min-h-[100px] border-b border-r"></div>);
        
        // Days
        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const daysApps = filteredAppointments.filter(a => a.date.startsWith(dateStr));

            days.push(
                <div key={d} className={`min-h-[100px] border-b border-r p-2 hover:bg-gray-50 transition cursor-pointer ${isToday ? 'bg-blue-50/50' : ''}`} onClick={() => { setCurrentDate(new Date(year, month, d)); setView('day'); }}>
                    <div className={`text-sm font-bold mb-1 ${isToday ? 'text-brand-600' : 'text-gray-700'}`}>{d}</div>
                    <div className="space-y-1">
                        {daysApps.slice(0, 3).map(app => {
                            const client = clients.find(c => c.id === app.clientId);
                            const pet = client?.pets.find(p => p.id === app.petId);
                            const service = services.find(s => s.id === app.serviceId);
                            const addSvc1 = app.additionalServiceIds?.[0] ? services.find(s => s.id === app.additionalServiceIds[0]) : null;
                            const time = app.date.split('T')[1].substring(0, 5);
                            return (
                                <div 
                                    key={app.id} 
                                    className={`text-[10px] p-1 rounded truncate border cursor-pointer ${getAppointmentStyle(app)}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedApp(app);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setContextMenu({ x: e.pageX, y: e.pageY, id: app.id });
                                    }}
                                >
                                    <span className="font-bold">{time}</span> {pet?.name}
                                    {addSvc1 && <span className="block opacity-75">+ {addSvc1.name}</span>}
                                </div>
                            )
                        })}
                        {daysApps.length > 3 && <div className="text-[10px] text-gray-500 font-bold">+{daysApps.length - 3} mais</div>}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b bg-gray-50">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="p-2 text-center text-xs font-bold text-gray-500 uppercase">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {days}
                </div>
            </div>
        );
    };

    const renderWeekOrDay = () => {
        const start = view === 'week' ? getStartOfWeek(currentDate) : currentDate;
        const daysToShow = view === 'week' ? 7 : 1;
        const hours = Array.from({length: 12}, (_, i) => i + 8); // 08:00 to 19:00

        const daysHeader = [];
        for(let i=0; i<daysToShow; i++) {
            const d = addDays(start, i);
            const isToday = new Date().toISOString().split('T')[0] === d.toISOString().split('T')[0];
            daysHeader.push(
                <div key={i} className={`flex-1 text-center p-2 border-r border-b font-bold ${isToday ? 'bg-brand-50 text-brand-700' : 'bg-white'}`}>
                    <div className="text-xs uppercase text-gray-500">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                    <div className="text-lg">{d.getDate()}</div>
                </div>
            );
        }

        const grid = hours.map(h => {
            const timeLabel = `${String(h).padStart(2, '0')}:00`;
            return (
                <div key={h} className="flex min-h-[80px]">
                    <div className="w-16 flex-shrink-0 text-xs text-gray-400 text-right pr-2 pt-2 border-r border-b -mt-2.5 bg-white relative z-10">{timeLabel}</div>
                    {Array.from({length: daysToShow}).map((_, i) => {
                        const d = addDays(start, i);
                        const dateStr = d.toISOString().split('T')[0];
                        
                        // Find appointments for this hour slot
                        const slotApps = filteredAppointments.filter(app => {
                            const appDate = app.date.split('T')[0];
                            const appHour = parseInt(app.date.split('T')[1].split(':')[0]);
                            return appDate === dateStr && appHour === h;
                        });

                        return (
                            <div 
                                key={`${dateStr}-${h}`} 
                                className="flex-1 border-r border-b p-1 relative hover:bg-gray-50 transition group"
                                onClick={() => {
                                    // Only open if clicking empty space
                                    if(slotApps.length === 0) openNewModal(dateStr, String(h).padStart(2, '0') + ':00');
                                }}
                            >
                                {/* Invisible "add" button on hover */}
                                <button className="hidden group-hover:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-0">
                                    <Plus className="text-gray-300" />
                                </button>

                                {slotApps.map(app => {
                                    const client = clients.find(c => c.id === app.clientId);
                                    const pet = client?.pets.find(p => p.id === app.petId);
                                    const service = services.find(s => s.id === app.serviceId);
                                    const addSvc1 = app.additionalServiceIds?.[0] ? services.find(s => s.id === app.additionalServiceIds[0]) : null;
                                    
                                    return (
                                        <div 
                                            key={app.id} 
                                            className={`relative z-10 mb-1 p-2 rounded text-xs border shadow-sm cursor-pointer ${getAppointmentStyle(app)}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedApp(app);
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setContextMenu({ x: e.pageX, y: e.pageY, id: app.id });
                                            }}
                                        >
                                            <div className="font-bold text-[10px] uppercase">{pet?.name}</div>
                                            <div className="truncate text-[10px] font-medium">{client?.name}</div>
                                            <div className="mt-1 pt-1 border-t border-black/10 text-[9px] leading-tight opacity-90">
                                                {service?.name}
                                                {addSvc1 && <div className="font-bold text-[9px]">+ {addSvc1.name}</div>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        );
                    })}
                </div>
            )
        });

        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="flex pl-16 bg-gray-50 border-b">
                    {daysHeader}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {grid}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {renderHeader()}

            <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    className="w-full pl-10 p-2 border rounded-lg focus:ring-2 ring-brand-200 outline-none bg-white shadow-sm"
                    placeholder="Filtrar agenda por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-auto">
                {view === 'month' ? renderMonth() : renderWeekOrDay()}
            </div>

            {/* Context Menu for Delete */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}></div>
                    <div 
                        className="fixed z-50 bg-white shadow-xl border rounded-lg overflow-hidden py-1 w-48 animate-fade-in"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button 
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                            onClick={() => {
                                if(window.confirm("Excluir agendamento? Esta ação não pode ser desfeita.")) {
                                    onDelete(contextMenu.id);
                                }
                                setContextMenu(null);
                            }}
                        >
                            <Trash2 size={16} /> Excluir Agendamento
                        </button>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in-down overflow-hidden">
                        <div className="bg-brand-50 p-6 border-b border-brand-100 flex justify-between items-start">
                             <div>
                                {(() => {
                                    const client = clients.find(c => c.id === selectedApp.clientId);
                                    const pet = client?.pets.find(p => p.id === selectedApp.petId);
                                    return (
                                        <>
                                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                                <PawPrint className="text-brand-600"/> {pet?.name}
                                            </h3>
                                            <p className="text-gray-500 font-medium">{client?.name}</p>
                                        </>
                                    )
                                })()}
                             </div>
                             <button onClick={() => setSelectedApp(null)} className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-600 shadow-sm"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {(() => {
                                const client = clients.find(c => c.id === selectedApp.clientId);
                                const pet = client?.pets.find(p => p.id === selectedApp.petId);
                                const mainService = services.find(s => s.id === selectedApp.serviceId);
                                
                                return (
                                    <>
                                        {/* Contact Info */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <Phone size={18} className="text-brand-500" />
                                                <span className="font-mono">{client?.phone}</span>
                                            </div>
                                            <div className="flex items-start gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <MapPin size={18} className="text-brand-500 mt-0.5" />
                                                <span>{client?.address} {client?.complement ? `- ${client.complement}` : ''}</span>
                                            </div>
                                        </div>

                                        {/* Services */}
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Sparkles size={12}/> Serviços Contratados</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {mainService && (
                                                    <span className="px-3 py-1.5 rounded-lg text-sm font-bold border bg-blue-50 text-blue-800 border-blue-200">
                                                        {mainService.name}
                                                    </span>
                                                )}
                                                {selectedApp.additionalServiceIds?.map(id => {
                                                    const s = services.find(sv => sv.id === id);
                                                    if(!s) return null;
                                                    return (
                                                        <span key={id} className="px-3 py-1.5 rounded-lg text-sm font-medium border bg-gray-100 text-gray-600 border-gray-200">
                                                            + {s.name}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {selectedApp.notes && (
                                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                                <h4 className="text-xs font-bold text-yellow-800 uppercase mb-1 flex items-center gap-1"><FileText size={12}/> Observações</h4>
                                                <p className="text-sm text-yellow-900 italic">"{selectedApp.notes}"</p>
                                            </div>
                                        )}
                                        
                                        {/* Time */}
                                        <div className="pt-4 border-t flex justify-between items-center text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock size={16}/> {new Date(selectedApp.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                            </span>
                                            <span className="font-bold text-brand-600">
                                                {new Date(selectedApp.date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Agendamento */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in-down max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">Novo Agendamento</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700">Data</label><input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" /></div>
                                <div><label className="block text-sm font-medium text-gray-700">Horário</label><input type="time" value={selTime} onChange={e => setSelTime(e.target.value)} className="w-full border p-2 rounded mt-1 focus:ring-2 ring-brand-200 outline-none" /></div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                {!selClient ? (
                                    <div className="mt-1 relative">
                                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input className="w-full pl-9 p-2 border rounded focus:ring-2 ring-brand-200 outline-none" placeholder="Buscar cliente..." value={searchClientModal} onChange={e => setSearchClientModal(e.target.value)} autoFocus />
                                        {searchClientModal.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border shadow-lg rounded mt-1 max-h-40 overflow-y-auto z-10">
                                                {filteredClientsForModal.map(c => (
                                                    <button key={c.id} onClick={() => { setSelClient(c.id); setSelPet(''); setSearchClientModal(''); }} className="w-full text-left p-2 hover:bg-brand-50 text-sm border-b last:border-0"><div className="font-bold">{c.name}</div><div className="text-xs text-gray-500">{c.phone}</div></button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded mt-1">
                                        <span className="font-bold text-brand-800 text-sm">{clients.find(c => c.id === selClient)?.name}</span>
                                        <button onClick={() => { setSelClient(''); setSelPet(''); }} className="text-red-500 hover:text-red-700 text-xs font-bold">Trocar</button>
                                    </div>
                                )}
                            </div>

                            {selClient && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pet</label>
                                    <select value={selPet} onChange={e => setSelPet(e.target.value)} className="w-full border p-2 rounded mt-1">
                                        <option value="">Selecione...</option>
                                        {clients.find(c => c.id === selClient)?.pets.map(p => <option key={p.id} value={p.id}>{p.name} - {p.size}/{p.coat}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Serviço Principal</label>
                                <select value={selService} onChange={e => setSelService(e.target.value)} className="w-full border p-2 rounded mt-1 bg-blue-50" disabled={!selPet}>
                                    <option value="">Selecione...</option>
                                    {availableMainServices.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                </select>
                                {selPet && availableMainServices.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum serviço encontrado para este porte/pelagem.</p>}
                            </div>

                            <div className="border-t pt-2">
                                <p className="text-xs font-bold text-gray-500 mb-2">Serviços Adicionais (Opcional)</p>
                                <select value={selAdd1} onChange={e => setSelAdd1(e.target.value)} className="w-full border p-2 rounded mb-2 text-sm" disabled={!selPet}>
                                    <option value="">Adicional 1...</option>
                                    {availableAddServices.map(s => <option key={s.id} value={s.id}>{s.name} (+R$ {s.price})</option>)}
                                </select>
                                <select value={selAdd2} onChange={e => setSelAdd2(e.target.value)} className="w-full border p-2 rounded mb-2 text-sm" disabled={!selPet}>
                                    <option value="">Adicional 2...</option>
                                    {availableAddServices.map(s => <option key={s.id} value={s.id}>{s.name} (+R$ {s.price})</option>)}
                                </select>
                                <select value={selAdd3} onChange={e => setSelAdd3(e.target.value)} className="w-full border p-2 rounded text-sm" disabled={!selPet}>
                                    <option value="">Adicional 3...</option>
                                    {availableAddServices.map(s => <option key={s.id} value={s.id}>{s.name} (+R$ {s.price})</option>)}
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
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isConfigured, setIsConfigured] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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
        } else {
            // Expired: Clear storage
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_EXPIRY);
            localStorage.removeItem(STORAGE_KEY_USER);
        }
    }

    initAuthLogic();
  }, []);

  const initAuthLogic = () => {
    if ((window as any).google) {
        googleService.init(async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                const token = tokenResponse.access_token;
                const expiresIn = tokenResponse.expires_in || 3599; // Default 1 hour
                
                // Save Session
                localStorage.setItem(STORAGE_KEY_TOKEN, token);
                localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + (expiresIn * 1000)).toString());
                
                setAccessToken(token);
                
                const profile = await googleService.getUserProfile(token);
                if (profile) {
                    const user = { id: profile.id, name: profile.name, email: profile.email, picture: profile.picture };
                    setGoogleUser(user);
                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
                }
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

  const handleSyncServices = (newServices: Service[]) => {
      setServices(newServices);
      db.saveServices(newServices);
  }

  // Sync APPOINTMENTS (Read from Sheet)
  const handleSyncAppointments = async () => {
      if (!accessToken || !SHEET_ID) return;
      setIsSyncing(true);
      try {
          const rows = await googleService.getSheetValues(accessToken, SHEET_ID, 'Agendamento!A:O');
          if(!rows || rows.length < 2) {
              alert('Aba Agendamento vazia ou não encontrada.');
              setIsSyncing(false);
              return;
          }

          const loadedApps: Appointment[] = [];
          const newTempClients: Client[] = [];
          const existingClientIds = new Set(clients.map(c => c.id));
          
          rows.slice(1).forEach((row: string[], idx: number) => {
              // COLUMNS:
              // 0: Pet, 1: Client, 2: Phone, 3: Address, 4: Breed, 5: Size, 6: Coat
              // 7: Service, 8: Add1, 9: Add2, 10: Add3, 11: Date, 12: Time, 13: Obs, 14: Duration

              const petName = row[0];
              const clientName = row[1];
              const clientPhone = row[2] || '';
              const clientAddr = row[3] || '';
              const petBreed = row[4];
              const datePart = row[11]; // DD/MM/YYYY
              const timePart = row[12]; // HH:MM
              const serviceName = row[7];
              
              if(!clientName || !datePart) return;

              // Parse Date
              let isoDate = new Date().toISOString();
              try {
                  const [day, month, year] = datePart.split('/');
                  if(day && month && year) {
                     isoDate = `${year}-${month}-${day}T${timePart || '00:00'}`;
                  }
              } catch(e) {}

              // Find or Create Client
              // Priority: Match by ID (Phone) -> Match by Name -> Create Temp
              const cleanPhone = clientPhone.replace(/\D/g, '') || `temp_${idx}`;
              let client = clients.find(c => c.id === cleanPhone) || clients.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || newTempClients.find(c => c.id === cleanPhone);

              if (!client) {
                  // Create Temp Client if not found to ensure appointment shows up
                  client = {
                      id: cleanPhone,
                      name: clientName,
                      phone: clientPhone,
                      address: clientAddr,
                      pets: []
                  };
                  newTempClients.push(client);
              }

              // Find or Create Pet
              let pet = client.pets.find(p => p.name.toLowerCase() === petName?.toLowerCase());
              if (!pet && petName) {
                  pet = {
                    id: `${client.id}_p_${idx}`,
                    name: petName,
                    breed: petBreed || 'SRD',
                    age: '',
                    gender: '',
                    size: row[5] || '',
                    coat: row[6] || '',
                    notes: row[13] || ''
                  };
                  client.pets.push(pet);
              }

              // Find Service
              const service = services.find(s => s.name.toLowerCase() === serviceName?.toLowerCase()) || services[0];
              
              // Find Additional Services
              const addServiceIds: string[] = [];
              const addSvcNames = [row[8], row[9], row[10]];
              
              addSvcNames.forEach(name => {
                  if (name) {
                      const foundSvc = services.find(s => s.name.toLowerCase() === name.toLowerCase().trim());
                      if (foundSvc) addServiceIds.push(foundSvc.id);
                  }
              });

              if(client && pet) {
                  loadedApps.push({
                      id: `sheet_${idx}`,
                      clientId: client.id,
                      petId: pet.id,
                      serviceId: service?.id || 'unknown',
                      additionalServiceIds: addServiceIds, 
                      date: isoDate,
                      status: 'agendado', 
                      notes: row[13],
                      durationTotal: parseInt(row[14] || '0')
                  });
              }
          });
          
          if (newTempClients.length > 0) {
              const updatedClients = [...clients, ...newTempClients.filter(nc => !existingClientIds.has(nc.id))];
              setClients(updatedClients);
              db.saveClients(updatedClients);
          }
          
          if(loadedApps.length > 0) {
              setAppointments(loadedApps);
              db.saveAppointments(loadedApps);
              alert(`${loadedApps.length} agendamentos carregados!`);
          } else {
              alert('Nenhum agendamento válido encontrado.');
          }

      } catch (error) {
          console.error(error);
          alert('Erro ao sincronizar agendamentos. Verifique se a data está em DD/MM/AAAA.');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleAddAppointment = async (app: Appointment, client: Client, pet: Pet, appServices: Service[]) => {
    
    let googleEventId = '';

    if (accessToken) {
        // 1. Save to Google Calendar
        const mainService = appServices[0];
        let totalDuration = mainService.durationMin;
        const description = appServices.map(s => s.name).join(' + ');
        
        // Sum durations
        if(appServices.length > 1) {
             appServices.slice(1).forEach(s => totalDuration += (s.durationMin || 0));
        }

        const googleResponse = await googleService.createEvent(accessToken, {
            summary: `Banho/Tosa: ${pet.name} - ${client.name}`,
            description: `Serviços: ${description}\nObs: ${pet.notes}`,
            startTime: app.date,
            durationMin: totalDuration
        });
        
        if (googleResponse && googleResponse.id) {
            googleEventId = googleResponse.id;
        }

        // 2. Save to Google Sheets (Append Row)
        const dateObj = new Date(app.date);
        const dateStr = dateObj.toLocaleDateString('pt-BR'); // DD/MM/YYYY
        const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); // HH:MM
        
        const rowData = [
            pet.name,                                     // Col A: Pet
            client.name,                                  // Col B: Cliente
            client.phone,                                 // Col C: Telefone
            `${client.address} ${client.complement || ''}`.trim(), // Col D: Endereco
            pet.breed,                                    // Col E: Raca
            pet.size,                                     // Col F: Porte
            pet.coat,                                     // Col G: Pelagem
            appServices[0]?.name || '',                   // Col H: Servico Principal
            appServices[1]?.name || '',                   // Col I: Adicional 1
            appServices[2]?.name || '',                   // Col J: Adicional 2
            appServices[3]?.name || '',                   // Col K: Adicional 3
            dateStr,                                      // Col L: Data
            timeStr,                                      // Col M: Hora
            pet.notes,                                    // Col N: Obs
            totalDuration                                 // Col O: Duracao
        ];

        try {
            await googleService.appendSheetValues(accessToken, SHEET_ID, 'Agendamento!A:O', rowData);
            alert('Agendamento salvo no Calendar e na Planilha!');
        } catch (e) {
            alert('Erro ao salvar na planilha (verifique permissões). Salvo apenas localmente e no Calendar.');
        }
    }
    
    // 3. Save Local (including Google Event ID)
    const newApp = { ...app, googleEventId };
    const updated = [...appointments, newApp];
    setAppointments(updated);
    db.saveAppointments(updated);
  }

  const handleUpdateAppStatus = (id: string, status: Appointment['status']) => {
    const updated = appointments.map(a => a.id === id ? { ...a, status } : a);
    setAppointments(updated);
    db.saveAppointments(updated);
  }
  
  const handleDeleteApp = async (id: string) => {
     // Check if it has a Google Event ID to delete
     const appToDelete = appointments.find(a => a.id === id);
     
     if (appToDelete && appToDelete.googleEventId && accessToken) {
         try {
             await googleService.deleteEvent(accessToken, appToDelete.googleEventId);
             // Note: We don't block local delete if API fails, just warn or log
         } catch (e) {
             console.error("Failed to delete from Google Calendar", e);
             alert("Atenção: Não foi possível excluir do Google Calendar (pode já ter sido removido). Removendo apenas do App.");
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
        {currentView === 'dashboard' && <Dashboard appointments={appointments} services={services} clients={clients} />}
        {currentView === 'clients' && <ClientManager clients={clients} onSyncClients={handleSyncClients} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />}
        {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} onSyncServices={handleSyncServices} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'schedule' && <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onUpdateStatus={handleUpdateAppStatus} onDelete={handleDeleteApp} onSync={handleSyncAppointments} googleUser={googleUser} isSyncing={isSyncing} />}
      </Layout>
    </HashRouter>
  );
};

export default App;
