
import React, { useState, useRef } from 'react';
import { ViewState, GoogleUser, AppSettings } from '../types';
import { LayoutDashboard, Users, Calendar, Scissors, LogIn, LogOut, Wallet, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Menu, Lock, Home, Settings } from 'lucide-react';

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
  const isActive = view === current || (view === 'home' && (current === 'payments' || current === 'schedule')); // Keep home active logic
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

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout, settings, onOpenSettings }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  // --- SWIPE LOGIC (Only for Closing) ---
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  }

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    
    // Only allow closing via swipe (Left Swipe), never opening
    if (isLeftSwipe && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }

  // Define menu groups
  const menuGroups = {
      operacional: (
          <div className="pb-2" key="operacional">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Página Inicial</p>
             <NavItem view="home" current={currentView} icon={Home} label="Início" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
          </div>
      ),
      cadastros: (
          <div className="border-t border-gray-100 pt-2 pb-2" key="cadastros">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Cadastros e Serviços</p>
             <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
             <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
          </div>
      ),
      gerencial: (
          <div className="border-t border-gray-100 pt-2" key="gerencial">
            <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Lock size={10}/> Gerencial</p>
            <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
            <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custo Mensal" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
          </div>
      )
  };

  const order = settings?.sidebarOrder || ['operacional', 'cadastros', 'gerencial'];

  return (
    <div 
      className="flex h-screen bg-gray-50 overflow-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop: Static | Mobile: Drawer) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 h-full shadow-2xl md:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 h-[72px]">
            <div className="flex items-center space-x-2">
                 {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded" /> : <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}/>}
                <div className="hidden w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">P</div>
                <h1 className="text-xl font-bold text-gray-800 truncate">{settings?.appName || 'PomPomPet'}</h1>
            </div>
            {/* Close button inside sidebar on mobile */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
                <ChevronLeft size={24} />
            </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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

      {/* Floating Toggle Button (Mobile Only) - ARROW ONLY */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`
            md:hidden fixed bottom-6 left-4 z-50 
            w-12 h-12 rounded-full shadow-lg flex items-center justify-center 
            transition-all duration-300 border border-white/20
            ${isSidebarOpen ? 'bg-white text-gray-800' : 'bg-brand-600 text-white'}
        `}
      >
        {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full bg-gray-50">
        <div className="flex-1 overflow-auto p-3 md:p-8 pb-24 md:pb-8">
            {children}
        </div>
      </main>
    </div>
  );
};
