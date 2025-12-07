
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './services/db';
import { googleService, DEFAULT_CLIENT_ID } from './services/googleCalendar';
import { Client, Service, Appointment, ViewState, Pet, GoogleUser } from './types';
import { 
  Plus, Trash2, Check, X, 
  Sparkles, DollarSign, Calendar as CalendarIcon, MapPin,
  ExternalLink, Settings, PawPrint, LogIn, ShieldAlert, Lock, Copy,
  ChevronDown, ChevronRight, Search, AlertTriangle, ChevronLeft, Phone, Clock, FileText,
  Edit2, MoreVertical, Wallet, Filter, CreditCard, AlertCircle, CheckCircle, Loader2,
  Scissors, TrendingUp, AlertOctagon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, CartesianGrid, Legend 
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
                        <p>Você está acessando por um link temporário. Recomenda-se usar o link principal do projeto para evitar erros de login.</p>
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-left text-xs text-blue-800 mb-4">
                     <p className="font-bold mb-1">Dica:</p>
                     <p>Certifique-se que o link <span className="font-mono bg-blue-100 px-1 rounded">{currentOrigin}</span> está autorizado no Google Cloud Console.</p>
                </div>

                <button onClick={onReset} className="mt-8 text-xs text-gray-400 hover:text-red-500 underline">
                    Alterar ID do Cliente
                </button>
            </div>
        </div>
    );
};

// 3. Dashboard Component (REFORMULADO)
const Dashboard: React.FC<{ 
  appointments: Appointment[]; 
  services: Service[];
  clients: Client[];
}> = ({ appointments, services, clients }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // --- Helper Calculadora ---
  const calculateRevenue = (app: Appointment) => {
      // Retorna o valor TOTAL (Pago + Pendente) deste agendamento para fins de gráfico
      if (app.status === 'cancelado') return 0;
      
      // Se tiver valor pago explícito, usa ele (assumindo que cobre tudo ou é o valor final acordado)
      if (app.paymentMethod && app.paidAmount) return app.paidAmount;

      // Se não, calcula o esperado
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
          if (app.status === 'cancelado') return; // Ignora cancelados

          totalPets++;

          // 1. Calcular se tem Tosa (Apenas Normal e Tesoura)
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

          // 2. Calcular Financeiro
          // Regra: Se tem paymentMethod (Coluna S), é PAGO. Se não tem, é PENDENTE.
          const isPaid = app.paymentMethod && app.paymentMethod.trim() !== '';

          if (isPaid) {
              paidRevenue += (app.paidAmount || 0);
              if (!app.paidAmount || app.paidAmount === 0) {
                   let val = mainSvc?.price || 0;
                   app.additionalServiceIds?.forEach(id => {
                       const s = services.find(srv => srv.id === id);
                       if (s) val += s.price;
                   });
                   paidRevenue += val;
              }
          } else {
              let expected = mainSvc?.price || 0;
              app.additionalServiceIds?.forEach(id => {
                  const s = services.find(srv => srv.id === id);
                  if (s) expected += s.price;
              });
              pendingRevenue += expected;
          }
      });

      return { totalPets, totalTosas, paidRevenue, pendingRevenue };
  };

  // --- Dados para Gráficos ---

  // Gráfico Semanal (baseado na data selecionada)
  const getWeeklyChartData = () => {
      const date = new Date(selectedDate);
      const day = date.getDay(); // 0 (Domingo) - 6 (Sábado)
      const diff = date.getDate() - day; // Ajusta para o Domingo da semana
      const startOfWeek = new Date(date);
      startOfWeek.setDate(diff);

      const data = [];
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 0; i < 7; i++) {
          const current = new Date(startOfWeek);
          current.setDate(startOfWeek.getDate() + i);
          const dateStr = current.toISOString().split('T')[0];
          
          const dailyApps = appointments.filter(a => a.date.startsWith(dateStr));
          const totalRevenue = dailyApps.reduce((acc, app) => acc + calculateRevenue(app), 0);

          data.push({
              name: weekDays[i],
              faturamento: totalRevenue,
              date: dateStr
          });
      }
      return data;
  };

  // Gráfico Mensal (Semanas do Mês)
  const getMonthlyChartData = () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Agrupar por semana (1 a 5)
      const weeksData = [
          { name: 'Sem 1', faturamento: 0 },
          { name: 'Sem 2', faturamento: 0 },
          { name: 'Sem 3', faturamento: 0 },
          { name: 'Sem 4', faturamento: 0 },
          { name: 'Sem 5', faturamento: 0 },
      ];

      appointments.forEach(app => {
          if (!app.date.startsWith(selectedMonth)) return;
          
          const day = parseInt(app.date.split('T')[0].split('-')[2]);
          const weekIndex = Math.ceil(day / 7) - 1; // 1-7 -> 0, 8-14 -> 1, etc.
          
          if (weekIndex >= 0 && weekIndex < 5) {
              weeksData[weekIndex].faturamento += calculateRevenue(app);
          }
      });

      return weeksData.filter(w => w.faturamento > 0 || w.name === 'Sem 1'); // Mostra pelo menos a sem 1 ou as que tem valor
  };

  // --- Filtros ---
  const dailyApps = appointments.filter(a => a.date.startsWith(selectedDate));
  const monthlyApps = appointments.filter(a => a.date.startsWith(selectedMonth));

  const dailyStats = calculateStats(dailyApps);
  const monthlyStats = calculateStats(monthlyApps);
  
  const weeklyChartData = getWeeklyChartData();
  const monthlyChartData = getMonthlyChartData();

  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
              {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
          </div>
          <div className="p-3 rounded-full bg-opacity-20" style={{backgroundColor: colorClass ? '' : '#f3f4f6'}}>
               <div className={`p-1 rounded-full ${colorClass}`}>
                  <Icon size={24} />
               </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SEÇÃO DIA */}
      <section>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarIcon className="text-brand-600"/> Visão Diária
              </h2>
              <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-white border p-2 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 ring-brand-200 outline-none shadow-sm"
              />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard 
                  title="Total de Pets" 
                  value={dailyStats.totalPets} 
                  icon={PawPrint} 
                  colorClass="bg-blue-100 text-blue-600" 
              />
              <StatCard 
                  title="Total de Tosas" 
                  value={dailyStats.totalTosas} 
                  icon={Scissors} 
                  colorClass="bg-orange-100 text-orange-600" 
                  subValue="Normal e Tesoura"
              />
              <StatCard 
                  title="Faturamento Pago" 
                  value={`R$ ${dailyStats.paidRevenue.toFixed(2)}`} 
                  icon={CheckCircle} 
                  colorClass="bg-green-100 text-green-600" 
                  subValue="Com baixa na planilha"
              />
              <StatCard 
                  title="Faturamento Pendente" 
                  value={`R$ ${dailyStats.pendingRevenue.toFixed(2)}`} 
                  icon={AlertCircle} 
                  colorClass="bg-red-100 text-red-600" 
                  subValue="Sem forma de pagamento"
              />
          </div>
          
          {/* GRÁFICO DIÁRIO (SEMANAL) */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-64">
              <h3 className="text-sm font-bold text-gray-500 mb-4">Faturamento da Semana (Total)</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']} />
                      <Line type="monotone" dataKey="faturamento" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
              </ResponsiveContainer>
          </div>
      </section>

      <div className="border-t border-gray-200"></div>

      {/* SEÇÃO MÊS */}
      <section>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="text-purple-600"/> Visão Mensal
              </h2>
              <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-white border p-2 rounded-lg text-sm font-bold text-gray-700 focus:ring-2 ring-purple-200 outline-none shadow-sm"
              />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard 
                  title="Total de Pets (Mês)" 
                  value={monthlyStats.totalPets} 
                  icon={PawPrint} 
                  colorClass="bg-purple-100 text-purple-600" 
              />
              <StatCard 
                  title="Total de Tosas (Mês)" 
                  value={monthlyStats.totalTosas} 
                  icon={Scissors} 
                  colorClass="bg-pink-100 text-pink-600"
                  subValue="Normal e Tesoura"
              />
              <StatCard 
                  title="Receita Total Paga" 
                  value={`R$ ${monthlyStats.paidRevenue.toFixed(2)}`} 
                  icon={Wallet} 
                  colorClass="bg-emerald-100 text-emerald-600" 
                  subValue="Caixa confirmado"
              />
              <StatCard 
                  title="Estimativa Pendente" 
                  value={`R$ ${monthlyStats.pendingRevenue.toFixed(2)}`} 
                  icon={AlertOctagon} 
                  colorClass="bg-red-100 text-red-600" 
                  subValue="Ainda não pago"
              />
          </div>

           {/* GRÁFICO MENSAL (SEMANAS) */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-64">
              <h3 className="text-sm font-bold text-gray-500 mb-4">Performance por Semana</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']} />
                      <Line type="monotone" dataKey="faturamento" stroke="#9333ea" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
              </ResponsiveContainer>
          </div>
      </section>
    </div>
  );
};

// 3.5 Payment Manager (TABS LAYOUT)
const PaymentManager: React.FC<{
    appointments: Appointment[];
    clients: Client[];
    services: Service[];
    onUpdateAppointment: (app: Appointment) => void;
    accessToken: string | null;
    sheetId: string;
}> = ({ appointments, clients, services, onUpdateAppointment, accessToken, sheetId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Tab State: 'toReceive' | 'pending' | 'paid'
    const [activeTab, setActiveTab] = useState<'toReceive' | 'pending' | 'paid'>('toReceive');

    // Swipe Refs
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);
    const minSwipeDistance = 50;

    // Filter Logic
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Pending (Past & Unpaid)
    // Pendente = Data passada E sem método de pagamento
    const pendingApps = appointments.filter(a => {
        const appDate = a.date.split('T')[0];
        const isPast = appDate < todayStr;
        const isUnpaid = !a.paymentMethod || a.paymentMethod.trim() === ''; 
        return isPast && isUnpaid;
    }).sort((a,b) => b.date.localeCompare(a.date));

    // Daily Apps
    const dailyApps = appointments.filter(a => a.date.startsWith(selectedDate));
    
    // 2. To Receive (Selected Date & Unpaid)
    const toReceiveApps = dailyApps.filter(a => !a.paymentMethod || a.paymentMethod.trim() === '');

    // 3. Paid (Selected Date & Paid)
    const paidApps = dailyApps.filter(a => a.paymentMethod && a.paymentMethod.trim() !== '');

    const navigateDate = (days: number) => {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + days);
        const newDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        setSelectedDate(newDate);
    };

    const goToToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) navigateDate(1); // Swipe Left -> Next Day
        if (isRightSwipe) navigateDate(-1); // Swipe Right -> Prev Day
    };

    const calculateExpected = (app: Appointment) => {
        const main = services.find(s => s.id === app.serviceId);
        let total = main?.price || 0;
        app.additionalServiceIds?.forEach(id => {
            const s = services.find(srv => srv.id === id);
            if(s) total += s.price;
        });
        return total;
    };

    const handleStartEdit = (app: Appointment) => {
        setEditingId(app.id);
        const expected = calculateExpected(app);
        setAmount(app.paidAmount ? app.paidAmount.toString() : expected.toString());
        setMethod(app.paymentMethod || 'Credito');
    };

    const handleSave = async (app: Appointment) => {
        setIsSaving(true);
        const finalAmount = parseFloat(amount);
        const updatedApp = { ...app, paidAmount: finalAmount, paymentMethod: method as any };

        // 1. Update Sheet if applicable
        if (app.id.startsWith('sheet_') && accessToken && sheetId) {
            try {
                const parts = app.id.split('_');
                const index = parseInt(parts[1]);
                const rowNumber = index + 2;
                
                const range = `Agendamento!R${rowNumber}:S${rowNumber}`;
                const values = [finalAmount.toString().replace('.', ','), method];
                
                await googleService.updateSheetValues(accessToken, sheetId, range, values);
            } catch (e) {
                console.error("Failed to update sheet payments", e);
                alert("Erro ao salvar na planilha. Salvo apenas localmente.");
            }
        }

        // 2. Update Local
        onUpdateAppointment(updatedApp);
        setEditingId(null);
        setIsSaving(false);
    };

    const PaymentRow = ({ app, colorClass }: {app: Appointment, colorClass?: string}) => {
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const mainSvc = services.find(s => s.id === app.serviceId);
        const expected = calculateExpected(app);
        const isPaid = !!app.paidAmount && !!app.paymentMethod;
        const isEditing = editingId === app.id;

        if(isEditing) {
            return (
                <div className="bg-brand-50 border border-brand-200 p-4 rounded-lg mb-4 shadow-sm animate-fade-in">
                    <div className="flex flex-col gap-3">
                         <div className="flex justify-between items-center">
                             <span className="font-bold text-gray-800">{pet?.name} <span className="text-gray-500 font-normal">({client?.name})</span></span>
                             <span className="text-xs text-gray-500">Editando...</span>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <div>
                                 <label className="text-[10px] font-bold text-gray-500 uppercase">Valor R$</label>
                                 <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded bg-white" />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-gray-500 uppercase">Método</label>
                                 <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border p-2 rounded bg-white">
                                     <option value="Credito">Crédito</option>
                                     <option value="Debito">Débito</option>
                                     <option value="Pix">Pix</option>
                                     <option value="Dinheiro">Dinheiro</option>
                                 </select>
                             </div>
                         </div>
                         <div className="flex gap-2 mt-2">
                             <button onClick={() => handleSave(app)} disabled={isSaving} className="flex-1 bg-green-600 text-white p-2 rounded text-sm font-bold">
                                 {isSaving ? 'Salvando...' : 'Confirmar'}
                             </button>
                             <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-200 text-gray-700 p-2 rounded text-sm">Cancelar</button>
                         </div>
                    </div>
                </div>
            )
        }

        return (
            <div className={`p-4 bg-white rounded-lg shadow-sm border border-gray-100 mb-2 ${colorClass}`}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="text-lg font-bold text-gray-800">{pet?.name}</div>
                        <div className="text-sm text-gray-500">{client?.name}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock size={12}/> {new Date(app.date).toLocaleDateString('pt-BR')} - {new Date(app.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-brand-700">R$ {expected.toFixed(2)}</div>
                        {isPaid ? (
                            <div className="inline-block bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                {app.paymentMethod}
                            </div>
                        ) : (
                            <div className="inline-block bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Pendente
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3">
                     <span className="font-bold">{mainSvc?.name}</span>
                     {app.additionalServiceIds?.length ? ` + ${app.additionalServiceIds.map(id => services.find(s=>s.id===id)?.name).join(', ')}` : ''}
                </div>

                <button onClick={() => handleStartEdit(app)} className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 p-2 rounded flex items-center justify-center gap-2 font-bold text-sm transition">
                    <DollarSign size={16}/> {isPaid ? 'Editar Pagamento' : 'Receber Agora'}
                </button>
            </div>
        )
    };

    return (
        <div 
            className="space-y-4 h-full flex flex-col"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">Pagamentos</h2>
                
                {/* Date Navigation */}
                <div className="flex items-center gap-2 w-full md:w-auto bg-white p-1 rounded-lg border shadow-sm flex-shrink-0">
                    <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <ChevronLeft size={20} />
                    </button>
                    
                    <button onClick={goToToday} className="px-4 py-2 bg-brand-50 text-brand-700 font-bold rounded-lg text-sm hover:bg-brand-100">
                        Hoje
                    </button>
                    
                    <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <ChevronRight size={20} />
                    </button>

                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)}
                        className="border-l pl-2 ml-2 outline-none text-sm text-gray-700 font-medium bg-transparent"
                    />
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                    onClick={() => setActiveTab('toReceive')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'toReceive' ? 'bg-white shadow text-yellow-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    A Receber <span className="ml-1 text-[10px] bg-yellow-100 px-1.5 py-0.5 rounded-full text-yellow-800">{toReceiveApps.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('pending')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pendentes <span className="ml-1 text-[10px] bg-red-100 px-1.5 py-0.5 rounded-full text-red-800">{pendingApps.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('paid')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'paid' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Pagos <span className="ml-1 text-[10px] bg-green-100 px-1.5 py-0.5 rounded-full text-green-800">{paidApps.length}</span>
                </button>
            </div>

            {/* CONTENT LIST */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 rounded-xl border border-gray-100 p-2">
                
                {/* 1. A Receber */}
                {activeTab === 'toReceive' && (
                    <div className="space-y-2 animate-fade-in">
                        {toReceiveApps.length === 0 && <div className="text-center text-gray-400 py-10">Nada a receber neste dia.</div>}
                        {toReceiveApps.map(app => <PaymentRow key={app.id} app={app} colorClass="border-l-4 border-l-yellow-400" />)}
                    </div>
                )}

                {/* 2. Pendentes */}
                {activeTab === 'pending' && (
                    <div className="space-y-2 animate-fade-in">
                         {pendingApps.length === 0 && <div className="text-center text-gray-400 py-10">Nenhuma pendência atrasada.</div>}
                        {pendingApps.map(app => <PaymentRow key={app.id} app={app} colorClass="border-l-4 border-l-red-500 bg-red-50/30" />)}
                    </div>
                )}

                {/* 3. Pagos */}
                {activeTab === 'paid' && (
                    <div className="space-y-2 animate-fade-in">
                        {paidApps.length === 0 && <div className="text-center text-gray-400 py-10">Nenhum pagamento registrado hoje.</div>}
                        {paidApps.map(app => <PaymentRow key={app.id} app={app} colorClass="border-l-4 border-l-green-500 opacity-90" />)}
                    </div>
                )}

            </div>
        </div>
    )
};

// 4. Client Manager (RESPONSIVE CARDS)
const ClientManager: React.FC<{
  clients: Client[];
  onDeleteClient: (id: string) => void;
  googleUser: GoogleUser | null;
  accessToken: string | null;
}> = ({ clients, onDeleteClient, googleUser, accessToken }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [sheetId, setSheetId] = useState(localStorage.getItem('petgestor_sheet_id') || PREDEFINED_SHEET_ID);
  const [formUrl, setFormUrl] = useState(localStorage.getItem('petgestor_form_url') || PREDEFINED_FORM_URL);
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

  const ClientCard = ({ client }: { client: Client }) => (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="flex justify-between items-start mb-2">
              <div>
                  <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
                  <div className="text-sm text-gray-500">{client.phone}</div>
              </div>
              <div className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">
                  {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '-'}
              </div>
          </div>
          <div className="text-xs text-gray-600 mb-3 flex items-start gap-1">
              <MapPin size={12} className="mt-0.5" />
              <span>{client.address} {client.complement ? ` - ${client.complement}` : ''}</span>
          </div>
          <div className="space-y-2">
              {client.pets.map((pet, idx) => (
                  <div key={idx} className="bg-brand-50 border border-brand-100 rounded-lg p-2 text-xs">
                      <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-brand-800 flex items-center gap-1"><PawPrint size={10}/> {pet.name}</span>
                          <span className="bg-white px-2 py-0.5 rounded-full text-brand-600 font-bold border border-brand-100">{pet.breed}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                          <div><span className="font-bold">Porte:</span> {pet.size}</div>
                          <div><span className="font-bold">Pelo:</span> {pet.coat}</div>
                          {pet.age && <div><span className="font-bold">Idade:</span> {pet.age}</div>}
                          {pet.gender && <div><span className="font-bold">Sexo:</span> {pet.gender}</div>}
                      </div>
                      {pet.notes && <div className="mt-1 pt-1 border-t border-brand-100 text-gray-500 italic">Obs: {pet.notes}</div>}
                  </div>
              ))}
          </div>
      </div>
  );

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
              <p className="text-sm text-gray-400">Os dados serão sincronizados automaticamente.</p>
          </div>
      ) : (
        <>
            {/* Mobile Cards */}
            <div className="md:hidden">
                {filteredClients.map(client => <ClientCard key={client.id} client={client} />)}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
        </>
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

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, id: string} | null>(null);
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editService, setEditService] = useState<Service | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

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
            setIsSavingEdit(true);
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
            setIsSavingEdit(false);
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
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Catálogo de Serviços</h2>
                {/* Sync Button Removed - Auto Sync */}
             </div>

             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hidden md:block">
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
                            <button onClick={handleSaveEdit} disabled={isSavingEdit} className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-bold disabled:opacity-50">
                                {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
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
  googleUser: GoogleUser | null;
}> = ({ appointments, clients, services, onAdd, onUpdateStatus, onDelete, googleUser }) => {
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
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                 <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
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
                 {/* Refresh Button Removed */}
                 <button onClick={() => openNewModal()} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2 font-bold shrink-0">
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
        for(let i=0; i<startDay; i++) days.push(<div key={`empty-${i}`} className="bg-gray-50 min-h-[100px] border-b border-r hidden md:block"></div>);
        
        // Days
        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const daysApps = filteredAppointments.filter(a => a.date.startsWith(dateStr));

            days.push(
                <div key={d} className={`min-h-[80px] md:min-h-[100px] border-b border-r p-1 md:p-2 hover:bg-gray-50 transition cursor-pointer ${isToday ? 'bg-blue-50/50' : ''}`} onClick={() => { setCurrentDate(new Date(year, month, d)); setView('day'); }}>
                    <div className={`text-sm font-bold mb-1 ${isToday ? 'text-brand-600' : 'text-gray-700'}`}>{d}</div>
                    <div className="space-y-1">
                        {daysApps.slice(0, 3).map(app => {
                            const client = clients.find(c => c.id === app.clientId);
                            const pet = client?.pets.find(p => p.id === app.petId);
                            const time = app.date.split('T')[1].substring(0, 5);
                            return (
                                <div 
                                    key={app.id} 
                                    className={`text-[9px] md:text-[10px] p-1 rounded truncate border cursor-pointer ${getAppointmentStyle(app)}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedApp(app);
                                    }}
                                >
                                    <span className="font-bold hidden md:inline">{time}</span> {pet?.name}
                                </div>
                            )
                        })}
                        {daysApps.length > 3 && <div className="text-[9px] text-gray-500 font-bold">+{daysApps.length - 3}</div>}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b bg-gray-50">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
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
        // On mobile, force "Day" view effectively if "Week" is selected but screen is small? 
        // Or just let it scroll horizontally. Let's let it scroll.
        const hours = Array.from({length: 12}, (_, i) => i + 8); // 08:00 to 19:00

        const daysHeader = [];
        for(let i=0; i<daysToShow; i++) {
            const d = addDays(start, i);
            const isToday = new Date().toISOString().split('T')[0] === d.toISOString().split('T')[0];
            daysHeader.push(
                <div key={i} className={`min-w-[100px] flex-1 text-center p-2 border-r border-b font-bold ${isToday ? 'bg-brand-50 text-brand-700' : 'bg-white'}`}>
                    <div className="text-xs uppercase text-gray-500">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                    <div className="text-lg">{d.getDate()}</div>
                </div>
            );
        }

        const grid = hours.map(h => {
            const timeLabel = `${String(h).padStart(2, '0')}:00`;
            return (
                <div key={h} className="flex min-h-[80px]">
                    <div className="w-12 md:w-16 flex-shrink-0 text-xs text-gray-400 text-right pr-2 pt-2 border-r border-b -mt-2.5 bg-white relative z-10 sticky left-0">{timeLabel}</div>
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
                                className="min-w-[100px] flex-1 border-r border-b p-1 relative hover:bg-gray-50 transition group"
                                onClick={() => {
                                    if(slotApps.length === 0) openNewModal(dateStr, String(h).padStart(2, '0') + ':00');
                                }}
                            >
                                {slotApps.map(app => {
                                    const client = clients.find(c => c.id === app.clientId);
                                    const pet = client?.pets.find(p => p.id === app.petId);
                                    const service = services.find(s => s.id === app.serviceId);
                                    const addSvc1 = app.additionalServiceIds?.[0] ? services.find(s => s.id === app.additionalServiceIds[0]) : null;
                                    
                                    return (
                                        <div 
                                            key={app.id} 
                                            className={`relative z-10 mb-1 p-1 md:p-2 rounded text-xs border shadow-sm cursor-pointer ${getAppointmentStyle(app)}`}
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
                                            <div className="font-bold text-[10px] uppercase truncate">{pet?.name}</div>
                                            <div className="truncate text-[10px] font-medium hidden md:block">{client?.name}</div>
                                            <div className="mt-1 pt-1 border-t border-black/10 text-[9px] leading-tight opacity-90 hidden md:block">
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
                <div className="flex pl-12 md:pl-16 bg-gray-50 border-b overflow-x-auto">
                    {daysHeader}
                </div>
                <div className="flex-1 overflow-auto">
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

            <div className="flex-1 overflow-hidden">
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
          // 1. Sync Services First (needed for appointment pricing)
          await handleSyncServices(token, true);
          // 2. Sync Clients (needed for linking appointments)
          await handleSyncClients(token, true);
          // 3. Sync Appointments
          await handleSyncAppointments(token, true);
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

                // Trigger Auto Sync on Login
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

  // Sync APPOINTMENTS (Read from Sheet)
  const handleSyncAppointments = async (token: string, silent = false) => {
      const tokenToUse = token;
      if (!tokenToUse || !SHEET_ID) return;
      
      try {
          // A:O was original, now need to read up to S (Paid Amount = R/17, Method = S/18)
          const rows = await googleService.getSheetValues(tokenToUse, SHEET_ID, 'Agendamento!A:S');
          if(!rows || rows.length < 2) {
              if(!silent) alert('Aba Agendamento vazia ou não encontrada.');
              return;
          }

          const loadedApps: Appointment[] = [];
          const newTempClients: Client[] = [];
          // Get clients from state, but since state might not be updated inside this closure during full sync, 
          // we should trust db.getClients if this runs standalone, 
          // BUT during performFullSync, we await handleSyncClients just before, so state update might be pending.
          // Best practice: Read from DB to be safe if sequential sync just updated DB.
          const currentClients = db.getClients(); 
          
          const existingClientIds = new Set(currentClients.map(c => c.id));
          
          rows.slice(1).forEach((row: string[], idx: number) => {
              const petName = row[0];
              const clientName = row[1];
              const clientPhone = row[2] || '';
              const clientAddr = row[3] || '';
              const petBreed = row[4];
              const datePart = row[11]; // DD/MM/YYYY
              const timePart = row[12]; // HH:MM
              const serviceName = row[7];
              
              const paidAmountStr = row[17];
              const paymentMethod = row[18];
              
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
              const cleanPhone = clientPhone.replace(/\D/g, '') || `temp_${idx}`;
              let client = currentClients.find(c => c.id === cleanPhone) || currentClients.find(c => c.name.toLowerCase() === clientName.toLowerCase()) || newTempClients.find(c => c.id === cleanPhone);

              if (!client) {
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

              // Find Service (Using services from DB to ensure up-to-date)
              const currentServices = db.getServices();
              const service = currentServices.find(s => s.name.toLowerCase() === serviceName?.toLowerCase()) || currentServices[0];
              
              // Find Additional Services
              const addServiceIds: string[] = [];
              const addSvcNames = [row[8], row[9], row[10]];
              
              addSvcNames.forEach(name => {
                  if (name) {
                      const foundSvc = currentServices.find(s => s.name.toLowerCase() === name.toLowerCase().trim());
                      if (foundSvc) addServiceIds.push(foundSvc.id);
                  }
              });
              
              // Parse Payment
              let paidAmount = 0;
              if (paidAmountStr) {
                  paidAmount = parseFloat(paidAmountStr.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'));
                  if(isNaN(paidAmount)) paidAmount = 0;
              }

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
                      durationTotal: parseInt(row[14] || '0'),
                      paidAmount: paidAmount > 0 ? paidAmount : undefined,
                      paymentMethod: paymentMethod as any
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
        {/* GLOBAL LOADING OVERLAY */}
        {isGlobalLoading && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Sincronizando dados...</h3>
                <p className="text-gray-500">Buscando Clientes, Serviços e Agendamentos atualizados.</p>
            </div>
        )}

        {currentView === 'dashboard' && <Dashboard appointments={appointments} services={services} clients={clients} />}
        {currentView === 'payments' && <PaymentManager appointments={appointments} clients={clients} services={services} onUpdateAppointment={handleUpdateApp} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'clients' && <ClientManager clients={clients} onDeleteClient={handleDeleteClient} googleUser={googleUser} accessToken={accessToken} />}
        {currentView === 'services' && <ServiceManager services={services} onAddService={handleAddService} onDeleteService={handleDeleteService} onSyncServices={(s) => handleSyncServices(accessToken!, false)} accessToken={accessToken} sheetId={SHEET_ID} />}
        {currentView === 'schedule' && <ScheduleManager appointments={appointments} clients={clients} services={services} onAdd={handleAddAppointment} onUpdateStatus={handleUpdateAppStatus} onDelete={handleDeleteApp} googleUser={googleUser} />}
      </Layout>
    </HashRouter>
  );
};

export default App;
