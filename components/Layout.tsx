
import React, { useState } from 'react';
import { ViewState, GoogleUser, AppSettings } from '../types';
import { LayoutDashboard, Users, Calendar, Scissors, LogIn, LogOut, Wallet, ChevronLeft, TrendingUp, TrendingDown, Lock, Settings, Home, Menu, BarChart2 } from 'lucide-react';

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
  // home mapeia para revenue (diario) neste contexto especifico se desejar, mas vamos usar view direta
  const isActive = view === current;
  return (
    <button 
      onClick={() => onClick(view)} 
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400'}`}
    >
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout, settings, onOpenSettings }) => {
  // Mobile: Sidebar is always hidden, Desktop: Sidebar is always visible
  // No more drawer logic

  // Define menu groups for Desktop Sidebar
  const menuGroups = {
      operacional: (
          <div className="pb-2" key="operacional">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Operacional</p>
             <NavItem view="payments" current={currentView} icon={Wallet} label="Pagamentos" onClick={setView} />
             <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={setView} />
          </div>
      ),
      cadastros: (
          <div className="border-t border-gray-100 pt-2 pb-2" key="cadastros">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Cadastros e Serviços</p>
             <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={setView} />
             <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={setView} />
          </div>
      ),
      gerencial: (
          <div className="border-t border-gray-100 pt-2" key="gerencial">
            <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Lock size={10}/> Gerencial</p>
            <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={setView} />
            <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custo Mensal" onClick={setView} />
          </div>
      )
  };

  const order = settings?.sidebarOrder || ['operacional', 'cadastros', 'gerencial'];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      
      {/* Sidebar (Desktop Only - Hidden on Mobile) */}
      <aside className={`
        hidden md:block
        w-64 bg-white border-r border-gray-200 h-full
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 h-[72px]">
            <div className="flex items-center space-x-2">
                 <img src={settings?.logoUrl || DEFAULT_LOGO_URL} alt="Logo" className="w-10 h-10 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                <h1 className="text-xl font-bold text-gray-800 truncate">{settings?.appName || 'PomPomPet'}</h1>
            </div>
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full bg-gray-50">
        <div className="flex-1 overflow-auto p-3 md:p-8 pb-20 md:pb-8 custom-scrollbar">
            {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {/* 1. Resumo Diário (Mapeado para 'home' que renderiza o RevenueView Daily) */}
        <BottomNavItem view="home" current={currentView} icon={BarChart2} label="Diário" onClick={setView} />
        
        {/* 2. Pagamentos */}
        <BottomNavItem view="payments" current={currentView} icon={Wallet} label="Pagamentos" onClick={setView} />
        
        {/* 3. Agenda */}
        <BottomNavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={setView} />
        
        {/* 4. Menu (Substitui barra lateral) */}
        <BottomNavItem view="menu" current={currentView} icon={Menu} label="Menu" onClick={setView} />
      </div>
    </div>
  );
};
