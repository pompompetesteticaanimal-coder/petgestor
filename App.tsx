
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { generateMessage, analyzeDay } from './services/gemini';
import { googleService } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser } from './types';
import { 
  Plus, Trash2, Edit2, Search, Check, X, 
  MessageCircle, Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
  RefreshCw, ExternalLink, Settings, PawPrint, Ruler, Scissors as ScissorsIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COMMON_BREEDS = [
  "SRD (Vira-lata)", "Akita", "Basset Hound", "Beagle", "Bernese Mountain Dog", 
  "Bichon Frisé", "Boiadeiro Australiano", "Border Collie", "Boston Terrier", 
  "Boxer", "Buldogue Francês", "Buldogue Inglês", "Bull Terrier", "Cane Corso", 
  "Cavalier King Charles Spaniel", "Chihuahua", "Chow Chow", "Cocker Spaniel", 
  "Dachshund (Salsicha)", "Dálmata", "Doberman", "Dogo Argentino", "Fila Brasileiro", 
  "Fox Paulistinha", "Golden Retriever", "Husky Siberiano", "Jack Russell Terrier", 
  "Labrador Retriever", "Lhasa Apso", "Maltês", "Mastiff", "Papillon", 
  "Pastor Alemão", "Pastor Belga", "Pastor de Shetland", "Pequinês", "Pinscher", 
  "Pit Bull", "Pointer Inglês", "Poodle", "Pug", "Rottweiler", "Samoieda", 
  "São Bernardo", "Schnauzer", "Shar Pei", "Shiba Inu", "Shih Tzu", 
  "Spitz Alemão (Lulu)", "Staffordshire Bull Terrier", "Weimaraner", "Yorkshire Terrier",
  "Gato"
].sort();

// --- Sub-Components ---

// 1. Dashboard Component
const Dashboard: React.FC<{ 
  appointments: Appointment[]; 
  services: Service[];
  clients: Client[];
}> = ({ appointments, services, clients }) => {
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter(a => a.date.startsWith(today));
  
  const totalRevenue = todaysAppointments.reduce((acc, curr) => {
    const s = services.find(srv => srv.id === curr.serviceId);
    return acc + (s?.price || 0);
  }, 0);

  const pending = todaysAppointments.filter(a => a.status === 'agendado').length;
  const completed = todaysAppointments.filter(a => a.status === 'concluido').length;

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const enrichedApps = todaysAppointments.map(a => ({
        ...a,
        serviceName: services.find(s => s.id === a.serviceId)?.name
    }));
    const summary = await analyzeDay(enrichedApps, totalRevenue);
    setAiSummary(summary);
    setLoadingAi(false);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Chart Section */}
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

         {/* AI Assistant Section */}
         <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles className="text-yellow-300" />
                    Assistente Gemini
                </h3>
                <button 
                    onClick={handleAiAnalysis}
                    disabled={loadingAi}
                    className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm transition"
                >
                    {loadingAi ? 'Analisando...' : 'Analisar Dia'}
                </button>
            </div>
            <div className="bg-white/10 rounded-lg p-4 min-h-[120px] backdrop-blur-md border border-white/10">
                {aiSummary ? (
                    <p className="text-sm leading-relaxed text-brand-50">{aiSummary}</p>
                ) : (
                    <p className="text-sm text-brand-100 italic">Clique em "Analisar Dia" para obter insights sobre o desempenho de hoje e dicas de gestão.</p>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

// 2. Client Manager (UPDATED for Sheets Integration)
const ClientManager: React.FC<{
  clients: Client[];
  onSyncClients: (newClients: Client[]) => void;
  onDeleteClient: (id: string) => void;
  googleUser: GoogleUser | null;
  accessToken: string | null;
}> = ({ clients, onSyncClients, onDeleteClient, googleUser, accessToken }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [sheetId, setSheetId] = useState(localStorage.getItem('petgestor_sheet_id') || '');
  const [formUrl, setFormUrl] = useState(localStorage.getItem('petgestor_form_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);

  const saveConfig = () => {
    localStorage.setItem('petgestor_sheet_id', sheetId);
    localStorage.setItem('petgestor_form_url', formUrl);
    setShowConfig(false);
  };

  const handleSync = async () => {
    if (!accessToken) {
      alert("Por favor, conecte sua conta Google no menu lateral primeiro.");
      return;
    }
    if (!sheetId) {
      alert("Configure o ID da Planilha primeiro.");
      setShowConfig(true);
      return;
    }

    setIsSyncing(true);
    try {
      // Fetch all data from Sheet1, extended range for new fields
      const rows = await googleService.getSheetValues(accessToken, sheetId, 'Página1!A:M'); 
      
      if (!rows || rows.length < 2) {
        alert("Planilha vazia ou formato inválido.");
        setIsSyncing(false);
        return;
      }

      // Expected Order based on Form:
      // 0: Timestamp
      // 1: Nome Cliente
      // 2: Telefone
      // 3: Endereço
      // 4: Complemento
      // 5: Nome Pet
      // 6: Idade
      // 7: Sexo
      // 8: Raça
      // 9: Porte
      // 10: Pelagem
      // 11: Obs
      const clientsMap = new Map<string, Client>();

      // Skip header row
      rows.slice(1).forEach((row: string[], index: number) => {
        const [
          timestamp, 
          name, 
          phone, 
          address, 
          complement, 
          petName, 
          petAge, 
          petGender,
          petBreed, 
          petSize,
          petCoat,
          notes
        ] = row;
        
        if (!name || !phone) return; // Skip invalid rows

        const cleanPhone = phone.replace(/\D/g, ''); // Use numbers only as ID base
        
        if (!clientsMap.has(cleanPhone)) {
          clientsMap.set(cleanPhone, {
            id: cleanPhone,
            name: name,
            phone: phone,
            address: address || '',
            complement: complement || '',
            pets: []
          });
        }

        const client = clientsMap.get(cleanPhone)!;
        
        // Add pet if exists
        if (petName) {
          client.pets.push({
            id: `${cleanPhone}_p_${index}`,
            name: petName,
            breed: petBreed || 'SRD',
            age: petAge || '',
            gender: petGender || '',
            size: petSize || '',
            coat: petCoat || '',
            notes: notes || ''
          });
        }
      });

      const newClientList = Array.from(clientsMap.values());
      onSyncClients(newClientList);
      alert(`${newClientList.length} clientes sincronizados com sucesso!`);

    } catch (error) {
      console.error(error);
      alert("Erro ao sincronizar. Verifique se o ID da planilha está correto e se você tem permissão de acesso.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Clientes e Pets</h2>
        
        <div className="flex gap-2 w-full md:w-auto">
             {formUrl && (
                <a 
                  href={formUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition text-sm flex-1 md:flex-none justify-center"
                >
                  <ExternalLink size={16} /> Abrir Formulário
                </a>
             )}
             
             <button 
                onClick={handleSync} 
                disabled={isSyncing}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition text-sm flex-1 md:flex-none justify-center disabled:opacity-70"
             >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Planilha'}
             </button>

             <button 
                onClick={() => setShowConfig(!showConfig)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg"
             >
                <Settings size={20} />
             </button>
        </div>
      </div>

      {showConfig && (
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm animate-fade-in-down">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800 flex items-center gap-2">
            <Settings size={18} /> Configuração de Integração
          </h3>
          
          <div className="bg-white p-4 rounded border border-yellow-100 mb-4 text-sm text-gray-700">
             <p className="font-bold mb-2">Para usar o cadastro via Google Forms, crie as perguntas EXATAMENTE nesta ordem:</p>
             <ol className="list-decimal list-inside space-y-1 ml-2 text-xs md:text-sm">
                <li>Nome do cliente (Nome e sobrenome)</li>
                <li>Telefone</li>
                <li>Endereço</li>
                <li>Complemento</li>
                <li>---------------- (Seção Pet)</li>
                <li>Nome do Pet</li>
                <li>Idade</li>
                <li>Sexo (Macho/Fêmea)</li>
                <li>Raça</li>
                <li>Porte (Pequeno/Médio/Grande)</li>
                <li>Pelagem (Curto/Longo)</li>
                <li>Obs (Doenças/Cuidados)</li>
             </ol>
             <p className="mt-2 text-xs text-gray-500">* As perguntas de 1 a 4 são sobre o dono. De 5 a 11 são sobre o Pet.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">ID da Planilha Google</label>
                <input 
                    placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZj..." 
                    className="w-full border p-2 rounded focus:ring-2 ring-yellow-400 outline-none" 
                    value={sheetId} 
                    onChange={e => setSheetId(e.target.value)} 
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Link do Formulário (Para abrir)</label>
                <input 
                    placeholder="Ex: https://forms.gle/..." 
                    className="w-full border p-2 rounded focus:ring-2 ring-yellow-400 outline-none" 
                    value={formUrl} 
                    onChange={e => setFormUrl(e.target.value)} 
                />
             </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Fechar</button>
            <button onClick={saveConfig} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Salvar Configurações</button>
          </div>
        </div>
      )}

      {clients.length === 0 && !showConfig ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 mb-2">Nenhum cliente encontrado.</p>
              <p className="text-sm text-gray-400">Configure a planilha e clique em Sincronizar.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => (
            <div key={client.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-gray-800">{client.name}</h3>
                        <p className="text-sm text-gray-500">{client.phone}</p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin size={12} />
                        {client.address} {client.complement && ` - ${client.complement}`}
                        </p>
                    </div>
                    {/* Deleting locally only removes from app cache, not sheet */}
                    <button onClick={() => onDeleteClient(client.id)} className="text-red-400 hover:text-red-600" title="Remover da visualização (não apaga da planilha)"><Trash2 size={16} /></button>
                </div>
                <div className="space-y-2">
                    {client.pets.map(pet => (
                        <div key={pet.id} className="bg-brand-50 p-3 rounded-lg text-sm space-y-1">
                            <div className="flex justify-between items-center border-b border-brand-100 pb-1 mb-1">
                                <span className="font-bold text-brand-800 flex items-center gap-1">
                                    <PawPrint size={12} /> {pet.name}
                                </span>
                                <span className="text-xs bg-white px-2 py-0.5 rounded text-brand-600 border border-brand-100">{pet.breed}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-2 text-xs text-gray-600">
                                {pet.gender && <div>Sexo: {pet.gender}</div>}
                                {pet.age && <div>Idade: {pet.age}</div>}
                                {pet.size && <div>Porte: {pet.size}</div>}
                                {pet.coat && <div>Pelo: {pet.coat}</div>}
                            </div>
                            
                            {pet.notes && (
                                <div className="text-xs italic text-red-500 mt-1 bg-red-50 p-1 rounded border border-red-100">
                                    Obs: {pet.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};

// 3. Service Manager
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

// 4. Schedule Manager
const ScheduleManager: React.FC<{
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  onAdd: (a: Appointment) => void;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
  onDelete: (id: string) => void;
  googleUser: GoogleUser | null;
}> = ({ appointments, clients, services, onAdd, onUpdateStatus, onDelete, googleUser }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showModal, setShowModal] = useState(false);
    
    // Form State
    const [selClient, setSelClient] = useState('');
    const [selPet, setSelPet] = useState('');
    const [selService, setSelService] = useState('');
    const [selTime, setSelTime] = useState('09:00');

    // AI Message State
    const [generatingMsg, setGeneratingMsg] = useState<string | null>(null);
    const [generatedText, setGeneratedText] = useState<string | null>(null);

    const filteredApps = appointments.filter(a => a.date.startsWith(selectedDate)).sort((a,b) => a.date.localeCompare(b.date));

    const handleCreate = () => {
        if(selClient && selPet && selService) {
            onAdd({
                id: Date.now().toString(),
                clientId: selClient,
                petId: selPet,
                serviceId: selService,
                date: `${selectedDate}T${selTime}`,
                status: 'agendado'
            });
            setShowModal(false);
        }
    };

    const handleAiMessage = async (app: Appointment, type: 'reminder' | 'completion') => {
        setGeneratingMsg(app.id);
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const service = services.find(s => s.id === app.serviceId);

        if(client && pet && service) {
            const msg = await generateMessage(type, {
                clientName: client.name,
                petName: pet.name,
                serviceName: service.name,
                price: service.price,
                date: app.date
            });
            setGeneratedText(msg);
        }
        setGeneratingMsg(null);
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6">
            {/* Left: Calendar Picker & Form */}
            <div className="md:w-1/3 space-y-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-700 mb-4">Selecione a Data</h3>
                    <input 
                        type="date" 
                        className="w-full p-3 border rounded-lg text-lg focus:ring-2 ring-brand-200 outline-none"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
                
                <button onClick={() => setShowModal(true)} className="w-full bg-brand-600 text-white py-4 rounded-xl shadow-lg hover:bg-brand-700 transition flex items-center justify-center gap-2 font-bold text-lg">
                    <Plus /> Novo Agendamento
                </button>

                {googleUser && (
                   <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-2 text-xs text-blue-800">
                     <CalendarIcon size={14} />
                     Sincronização com Google Calendar ativa.
                   </div>
                )}

                {generatedText && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl animate-fade-in relative">
                        <h4 className="text-green-800 font-bold mb-2 text-sm flex items-center gap-2"><Sparkles size={14}/> Mensagem Gerada:</h4>
                        <textarea readOnly className="w-full bg-white p-2 text-sm text-gray-700 rounded border border-green-100 h-32 focus:outline-none" value={generatedText}></textarea>
                        <button onClick={() => setGeneratedText(null)} className="absolute top-2 right-2 text-green-400 hover:text-green-600"><X size={16}/></button>
                        <button onClick={() => {navigator.clipboard.writeText(generatedText); alert('Copiado!');}} className="mt-2 w-full bg-green-600 text-white text-xs py-2 rounded hover:bg-green-700">Copiar para WhatsApp</button>
                    </div>
                )}
            </div>

            {/* Right: Timeline */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <CalendarIcon size={18}/> 
                        Agenda: {new Date(selectedDate).toLocaleDateString('pt-BR')}
                    </h3>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-3">
                    {filteredApps.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            <p>Nenhum agendamento para este dia.</p>
                        </div>
                    ) : (
                        filteredApps.map(app => {
                            const client = clients.find(c => c.id === app.clientId);
                            const pet = client?.pets.find(p => p.id === app.petId);
                            const service = services.find(s => s.id === app.serviceId);
                            const time = app.date.split('T')[1];

                            return (
                                <div key={app.id} className={`p-4 rounded-lg border-l-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all
                                    ${app.status === 'concluido' ? 'border-green-500 bg-green-50/50' : 
                                      app.status === 'cancelado' ? 'border-red-500 bg-red-50/50' : 'border-brand-500 bg-white'}`}>
                                    
                                    <div className="flex items-start gap-4">
                                        <div className="text-xl font-bold text-gray-400">{time}</div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{pet?.name} <span className="text-gray-500 font-normal">({client?.name})</span></h4>
                                            <p className="text-sm text-brand-600 font-medium">{service?.name}</p>
                                            <p className="text-xs text-gray-400">{service?.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {app.status === 'agendado' && (
                                            <>
                                                <button onClick={() => handleAiMessage(app, 'reminder')} title="Gerar Lembrete" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full">
                                                    {generatingMsg === app.id ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <MessageCircle size={18} />}
                                                </button>
                                                <button onClick={() => onUpdateStatus(app.id, 'concluido')} title="Concluir" className="p-2 text-green-500 hover:bg-green-50 rounded-full"><Check size={18} /></button>
                                                <button onClick={() => onUpdateStatus(app.id, 'cancelado')} title="Cancelar" className="p-2 text-red-500 hover:bg-red-50 rounded-full"><X size={18} /></button>
                                            </>
                                        )}
                                        {app.status === 'concluido' && (
                                            <button onClick={() => handleAiMessage(app, 'completion')} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1 hover:bg-green-200">
                                                <Sparkles size={12}/> Avisar Cliente
                                            </button>
                                        )}
                                        {app.status === 'cancelado' && <span className="text-red-500 text-sm font-medium">Cancelado</span>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Novo Agendamento</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Horário</label>
                                <input type="time" value={selTime} onChange={e => setSelTime(e.target.value)} className="w-full border p-2 rounded mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                <select value={selClient} onChange={e => {setSelClient(e.target.value); setSelPet('');}} className="w-full border p-2 rounded mt-1">
                                    <option value="">Selecione...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{c.name} - {c.phone}</option>)}
                                </select>
                                {clients.length === 0 && <p className="text-xs text-red-500 mt-1">Sincronize a planilha de clientes primeiro.</p>}
                            </div>

                            {selClient && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pet</label>
                                    <select value={selPet} onChange={e => setSelPet(e.target.value)} className="w-full border p-2 rounded mt-1">
                                        <option value="">Selecione...</option>
                                        {clients.find(c => c.name === selClient)?.pets.map(p => (
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

                        <div className="flex justify-end gap-3 mt-6">
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);

  // Init Data
  useEffect(() => {
    setClients(db.getClients());
    setServices(db.getServices());
    setAppointments(db.getAppointments());

    // Init Google Auth
    const initAuth = () => {
        googleService.init(async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                setAccessToken(tokenResponse.access_token);
                // Fetch User Profile
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
    };
    
    // Check if script is loaded, otherwise wait a bit
    if ((window as any).google) {
        initAuth();
    } else {
        setTimeout(initAuth, 1000);
    }
  }, []);

  // Handlers
  const handleSyncClients = (newClients: Client[]) => {
      // Overwrite local clients with Sheet data
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

    // Google Calendar Sync
    if (accessToken) {
        // Find client by ID (or name if sync logic changed ID strategy)
        // Note: In handleSync, we used Phone as ID.
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
