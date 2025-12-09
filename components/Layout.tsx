
import React from 'react';
import { ViewState, GoogleUser, AppSettings } from '../types';
import { Users, Calendar, Scissors, LogIn, LogOut, Wallet, Settings, Menu, BarChart2, TrendingUp, TrendingDown, Lock } from 'lucide-react';

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

const DEFAULT_LOGO_URL = 'https://photos.app.goo.gl/xs394sFQNYBBocea8';

// Desktop Sidebar Item
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
      className={`flex items-center space-x-3 w-full p-3.5 rounded-2xl transition-all duration-200 group ${
        isActive 
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform group-hover:scale-105" />
      <span className="font-semibold tracking-tight">{label}</span>
    </button>
  );
};

// Mobile Bottom Nav Item (iOS Style)
const BottomNavItem = ({ 
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
      onClick={() => {
        // Haptic feedback simulation
        if (navigator.vibrate) navigator.vibrate(5);
        onClick(view);
      }}
      className={`flex flex-col items-center justify-center w-full pt-3 pb-safe transition-all active:scale-90 duration-200`}
    >
      <div className={`mb-1 transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
        <Icon 
          size={26} 
          strokeWidth={isActive ? 2.5 : 1.5} 
          className={isActive ? 'text-brand-600 drop-shadow-sm' : 'text-gray-400'} 
          fill={isActive ? 'currentColor' : 'none'}
          fillOpacity={isActive ? 0.1 : 0}
        />
      </div>
      <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout, settings, onOpenSettings }) => {
  
  const menuGroups = {
      operacional: (
          <div className="pb-4" key="operacional">
             <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operacional</p>
             <div className="space-y-1">
                <NavItem view="payments" current={currentView} icon={Wallet} label="Pagamentos" onClick={setView} />
                <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={setView} />
             </div>
          </div>
      ),
      cadastros: (
          <div className="pt-4" key="cadastros">
             <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cadastros</p>
             <div className="space-y-1">
                <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={setView} />
                <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={setView} />
             </div>
          </div>
      ),
      gerencial: (
          <div className="pt-4" key="gerencial">
            <p className="px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Lock size={10}/> Gerencial</p>
            <div className="space-y-1">
                <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={setView} />
                <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custo Mensal" onClick={setView} />
            </div>
          </div>
      )
  };

  const order = settings?.sidebarOrder || ['operacional', 'cadastros', 'gerencial'];

  return (
    <div className="flex h-screen bg-[#f2f2f7] overflow-hidden relative selection:bg-brand-100">
      
      {/* Sidebar (Desktop Only) */}
      <aside className={`
        hidden md:flex flex-col
        w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 h-full z-20
      `}>
        <div className="p-6 flex items-center gap-3 h-20">
             <img src={settings?.logoUrl || DEFAULT_LOGO_URL} alt="Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{settings?.appName || 'PomPomPet'}</h1>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto no-scrollbar">
          {order.map(key => menuGroups[key as keyof typeof menuGroups])}
        </nav>
        
        <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-gray-100">
            <button onClick={onOpenSettings} className="w-full mb-3 text-xs flex items-center gap-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 p-3 rounded-xl transition font-medium">
                <Settings size={18} /> Configurações
            </button>

            {googleUser ? (
                <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-ios-card">
                    <div className="flex items-center gap-3 mb-3">
                        {googleUser.picture ? 
                            <img src={googleUser.picture} alt="Profile" className="w-9 h-9 rounded-full ring-2 ring-brand-100" /> :
                            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">U</div>
                        }
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-900 truncate">{googleUser.name}</p>
                            <p className="text-[10px] text-green-600 flex items-center gap-1 font-semibold">● Online</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full text-xs flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-50/50 p-2.5 rounded-xl transition font-semibold">
                        <LogOut size={14} /> Sair da conta
                    </button>
                </div>
            ) : (
                <button onClick={onLogin} className="w-full bg-gray-900 hover:bg-gray-800 text-white p-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition shadow-lg shadow-gray-900/20 active:scale-95">
                    <LogIn size={18} /> Conectar Google
                </button>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 -z-10"></div>
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto w-full">
                {children}
            </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Glassmorphism) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-end z-50 pb-safe">
        <BottomNavItem view="home" current={currentView} icon={BarChart2} label="Diário" onClick={setView} />
        <BottomNavItem view="payments" current={currentView} icon={Wallet} label="Carteira" onClick={setView} />
        <BottomNavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={setView} />
        <BottomNavItem view="menu" current={currentView} icon={Menu} label="Menu" onClick={setView} />
      </div>
    </div>
  );
};
