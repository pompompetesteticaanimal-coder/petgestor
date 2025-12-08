
import React from 'react';
import { ViewState, GoogleUser, AppSettings } from '../types';
import { 
  Users, Calendar, Scissors, LogIn, LogOut, Settings, 
  TrendingUp, TrendingDown, Lock, Menu, Wallet, BarChart2
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  googleUser: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
  settings?: AppSettings;
  onOpenSettings: () => void;
}

const NavItem = ({ 
  view, 
  current, 
  icon: Icon, 
  label, 
  onClick 
}: { 
  view: ViewState; 
  current: ViewState; 
  icon: any; 
  label: string; 
  onClick: (v: ViewState) => void 
}) => {
  const isActive = view === current;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-brand-600 text-white shadow-md' 
          : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

// Bottom Tab Button Component (Instagram Style)
const TabBtn = ({ icon: Icon, label, isActive, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-200 active:scale-95 ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
        <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-50' : ''}`}>
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>{label}</span>
    </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout, settings, onOpenSettings }) => {
  
  // Define menu groups for Desktop Sidebar
  const menuGroups = {
      operacional: (
          <div className="pb-2" key="operacional">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Principal</p>
             <NavItem view="home" current={currentView} icon={BarChart2} label="Resumo Diário" onClick={(v) => setView(v)} />
             <NavItem view="payments" current={currentView} icon={Wallet} label="Pagamentos" onClick={(v) => setView(v)} />
             <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={(v) => setView(v)} />
          </div>
      ),
      cadastros: (
          <div className="border-t border-gray-100 pt-2 pb-2" key="cadastros">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Cadastros e Serviços</p>
             <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={(v) => setView(v)} />
             <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={(v) => setView(v)} />
          </div>
      ),
      gerencial: (
          <div className="border-t border-gray-100 pt-2" key="gerencial">
            <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Lock size={10}/> Gerencial</p>
            <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={(v) => setView(v)} />
            <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custo Mensal" onClick={(v) => setView(v)} />
          </div>
      )
  };

  const order = settings?.sidebarOrder || ['operacional', 'cadastros', 'gerencial'];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      
      {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
      <aside className={`
        hidden md:flex flex-col
        w-64 bg-white border-r border-gray-200 h-full shadow-sm z-50
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px]">
             {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" /> : <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}/>}
            <div className="hidden w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">P</div>
            <h1 className="text-xl font-bold text-gray-800 truncate">{settings?.appName || 'PomPomPet'}</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {order.map(key => menuGroups[key as keyof typeof menuGroups])}
        </nav>
        
        {/* Google Auth Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2">
            <button onClick={onOpenSettings} className="w-full text-xs flex items-center justify-center gap-2 text-gray-500 hover:text-brand-600 hover:bg-gray-100 p-2 rounded transition font-medium border border-gray-200">
                <Settings size={14} /> Configurações
            </button>

            {googleUser ? (
                <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        {googleUser.picture && <img src={googleUser.picture} alt="Profile" className="w-8 h-8 rounded-full ring-2 ring-white" />}
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-800 truncate">{googleUser.name}</p>
                            <p className="text-[10px] text-green-600 flex items-center gap-1 font-medium">● Conectado</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full text-xs flex items-center justify-center gap-1 text-red-500 hover:bg-red-50 p-2 rounded transition font-medium border border-transparent hover:border-red-100">
                        <LogOut size={12} /> Sair
                    </button>
                </div>
            ) : (
                <button onClick={onLogin} className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition shadow-sm">
                    <LogIn size={16} /> Conectar Google
                </button>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full bg-gray-50">
        <div className="flex-1 overflow-auto p-3 md:p-8 pb-24 md:pb-8">
            {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION (Hidden on Desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-[60] flex justify-around items-center h-16 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <TabBtn 
            icon={BarChart2} 
            label="Diário" 
            isActive={currentView === 'home'} 
            onClick={() => setView('home')} 
        />
        <TabBtn 
            icon={Wallet} 
            label="Pagamentos" 
            isActive={currentView === 'payments'} 
            onClick={() => setView('payments')} 
        />
        <TabBtn 
            icon={Calendar} 
            label="Agenda" 
            isActive={currentView === 'schedule'} 
            onClick={() => setView('schedule')} 
        />
        <TabBtn 
            icon={Menu} 
            label="Menu" 
            isActive={currentView === 'menu'} 
            onClick={() => setView('menu')} 
        />
      </div>

    </div>
  );
};
