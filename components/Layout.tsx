
import React, { useState } from 'react';
import { ViewState, AppSettings } from '../types';
import { LayoutDashboard, Users, Calendar, Scissors, LogIn, LogOut, Wallet, ChevronLeft, TrendingUp, TrendingDown, Lock, Settings, Home, Menu, BarChart2, Package, CalendarPlus, ClipboardList } from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  settings?: AppSettings;
  onOpenSettings: () => void;
  isLoading?: boolean;
  onManualRefresh?: () => Promise<void>;
  onAddAppointment?: () => void;
}

const DEFAULT_LOGO_URL = 'https://photos.app.goo.gl/xs394sFQNYBBocea8';

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
      className={`group flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 outline-none ${isActive
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-200 scale-100'
        : 'text-gray-500 hover:bg-white hover:text-brand-600 hover:shadow-ios'
        }`}
    >
      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'group-hover:bg-brand-50'}`}>
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className="font-semibold text-sm tracking-wide">{label}</span>
    </button>
  );
};

// Componente da Barra Inferior (Mobile)
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
      onClick={() => onClick(view)}
      className={`flex flex-col items-center justify-center w-full py-1 transition-all duration-300 relative ios-touch ${isActive ? 'text-brand-600 -translate-y-1' : 'text-gray-400 opacity-70'}`}
    >
      <div className={`p-1.5 rounded-xl mb-0.5 transition-all ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className="text-[10px] font-bold">{label}</span>
      {isActive && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-brand-600" />}
    </button>
  );
};

const GreetingBar = () => {
  const [phase, setPhase] = React.useState<'greeting' | 'transition' | 'logo'>('greeting');
  const hour = new Date().getHours();

  React.useEffect(() => {
    // 1. Show Greeting for 4 seconds
    const t1 = setTimeout(() => {
      setPhase('transition'); // Slide out
    }, 4000);

    // 2. Wait for slide out (500ms) then show Logo
    const t2 = setTimeout(() => {
      setPhase('logo'); // Slide in
    }, 4500);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  let greeting = 'Bom dia';
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
  if (hour >= 18) greeting = 'Boa noite';

  return (
    <div className="relative z-30 flex flex-col items-center w-full">
      {/* Greeting Bar (Slides Up to vanish) */}
      <div
        className={`bg-gray-800 text-white w-full py-1.5 px-4 text-[10px] font-medium tracking-wide flex justify-center items-center shadow-sm absolute top-0 transition-all duration-700 ease-in-out ${phase === 'greeting' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
      >
        <span>{greeting}, <span className="font-bold text-brand-200">Deise</span>! ✨ Tenha um excelente trabalho.</span>
      </div>

      {/* Logo Bar (Slides Down to appear) */}
      <div
        className={`bg-gradient-to-r from-pink-50/95 to-rose-50/95 backdrop-blur-md border-b border-pink-100 rounded-b-[2rem] w-full py-3 px-4 flex justify-start pl-6 items-center gap-2 shadow-sm absolute top-0 transition-all duration-700 ease-out z-20 ${phase === 'logo' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
      >
        <div className="flex items-center -space-x-1">
          <span className="text-xl animate-bounce-slow" style={{ animationDelay: '0.1s' }}>🐶</span>
          <span className="text-xl animate-bounce-slow" style={{ animationDelay: '0.3s' }}>🐱</span>
        </div>
        <span className="font-black text-2xl text-pink-500 tracking-tight drop-shadow-sm" style={{ fontFamily: '"Varela Round", "Nunito", "Segoe UI", sans-serif' }}>PomPomPet</span>
      </div>

      {/* Spacer */}
      <div className={`transition-all duration-700 w-full ${phase === 'greeting' ? 'h-[28px]' : phase === 'logo' ? 'h-[60px]' : 'h-0'}`} />
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, onLogout, settings, onOpenSettings, isLoading, onManualRefresh, onAddAppointment }) => {
  const menuGroups = {
    operacional: (
      <div className="pb-4" key="operacional">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operacional</p>
        <div className="space-y-1">
          <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={setView} />
          <NavItem view="tasks" current={currentView} icon={ClipboardList} label="Tarefas" onClick={setView} />
        </div>
      </div>
    ),
    cadastros: (
      <div className="pt-4 pb-4" key="cadastros">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Cadastros</p>
        <div className="space-y-1">
          <NavItem view="packages" current={currentView} icon={Package} label="Pacotes" onClick={setView} />
          <NavItem view="clients" current={currentView} icon={Users} label="Clientes" onClick={setView} />
          <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={setView} />
        </div>
      </div>
    ),
    gerencial: (
      <div className="pt-4" key="gerencial">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Lock size={10} /> Gerencial</p>
        <div className="space-y-1">
          <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={setView} />
          <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custos" onClick={setView} />
        </div>
      </div>
    )
  };

  const order = settings?.sidebarOrder || ['operacional', 'cadastros', 'gerencial'];

  const handleRefresh = async () => {
    // Call manual refresh handler provided by parent
    if (onManualRefresh) {
      await onManualRefresh();
    } else {
      // Simulate a short delay for visual feedback before reloading
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-ios-bg overflow-hidden relative selection:bg-brand-100 selection:text-brand-900">

      {/* Sidebar (Desktop) - MacGlass Style */}
      <aside className={`
        hidden md:flex flex-col
        w-72 h-full z-20
        bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-glass
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={onOpenSettings}>
            <div className="absolute inset-0 bg-brand-400 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-xl"></div>
            <img src={settings?.logoUrl || DEFAULT_LOGO_URL} alt="Logo" className="w-12 h-12 object-contain rounded-xl relative shadow-sm transition-transform group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">{settings?.appName || 'PomPomPet'}</h1>
            <p className="text-xs text-brand-600 font-medium mt-0.5">Gestão Inteligente</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 overflow-y-auto no-scrollbar mask-gradient-b">
          {order.map(key => menuGroups[key as keyof typeof menuGroups])}
        </nav>

        {/* User Profile / Auth */}
        {/* User Profile / Auth */}
        <div className="p-4 m-4 bg-white/50 rounded-2xl border border-white/40 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">A</div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-800 truncate">Administrador</p>
                <button onClick={onLogout} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 mt-0.5 hover:underline decoration-red-200">
                  Sair da conta
                </button>
              </div>
            </div>
          </div>
          <button onClick={onOpenSettings} className="w-full mt-3 text-xs flex items-center justify-center gap-1 text-gray-400 hover:text-brand-600 transition p-1">
            <Settings size={12} /> Configurações do Sistema
          </button>
        </div>
      </aside>

      {/* Sync Indicator (Absolute for both Desktop/Mobile) */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-[60] bg-white/90 backdrop-blur-xl shadow-lg border border-brand-100 rounded-full p-2 flex items-center justify-center animate-slide-in-right">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <GreetingBar />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 pointer-events-none" />
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8 scroll-smooth">
          <div key={currentView} className="max-w-7xl mx-auto w-full animate-slide-in-right">
            {children}
          </div>
        </PullToRefresh>
      </main>

      {/* Mobile Floating Tab Bar */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 h-20 bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl glass-card flex justify-around items-center px-2 z-50 animate-slide-up">
        <BottomNavItem view="home" current={currentView} icon={BarChart2} label="Resumo" onClick={setView} />
        <BottomNavItem view="tasks" current={currentView} icon={ClipboardList} label="Tarefas" onClick={setView} />
        <div className="relative -top-6">
          <button
            onClick={() => currentView === 'schedule' && onAddAppointment ? onAddAppointment() : setView('schedule')}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-brand-200 transition-all active:scale-95 ${currentView === 'schedule' ? 'bg-brand-600 text-white ring-4 ring-white' : 'bg-gray-900 text-white'}`}
          >
            {currentView === 'schedule' ? <CalendarPlus size={28} /> : <Calendar size={28} />}
          </button>
        </div>
        {/* REPLACED Clients with Packages */}
        <BottomNavItem view="packages" current={currentView} icon={Package} label="Pacotes" onClick={setView} />
        <BottomNavItem view="menu" current={currentView} icon={Menu} label="Menu" onClick={setView} />
      </div>
    </div>
  );
};
