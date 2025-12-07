import React, { useState, useRef } from 'react';
import { ViewState, GoogleUser } from '../types';
import { LayoutDashboard, Users, Calendar, Scissors, LogIn, LogOut, Wallet, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  googleUser: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
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
      className={`group flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100 font-semibold' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={20} className={`transition-colors ${isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
      <span className="text-sm">{label}</span>
      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
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
    if (isLeftSwipe && isSidebarOpen) setIsSidebarOpen(false);
  }

  return (
    <div 
      className="flex h-screen bg-gray-50 overflow-hidden relative font-sans"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-gray-900/20 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 bg-white border-r border-gray-100 h-full shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] md:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between h-[88px]">
            <div className="flex items-center space-x-3">
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-10 h-10 object-contain drop-shadow-sm" 
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <div className="hidden w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30 text-lg">P</div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">PomPomPet</h1>
                    <p className="text-[10px] font-medium text-brand-600 uppercase tracking-widest mt-1">Banho & Tosa</p>
                </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 p-1">
                <ChevronLeft size={24} />
            </button>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto custom-scrollbar">
          <div>
             <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Operacional</p>
             <div className="space-y-1">
                 <NavItem view="payments" current={currentView} icon={Wallet} label="Pagamentos" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
                 <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
             </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Gerencial</p>
            <div className="space-y-1">
                <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
                <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custo Mensal" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
            </div>
          </div>

          <div>
             <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Cadastros</p>
             <div className="space-y-1">
                 <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
                 <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
             </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-50 bg-gray-50/30">
            {googleUser ? (
                <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        {googleUser.picture ? 
                            <img src={googleUser.picture} alt="Profile" className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm" /> :
                            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">{googleUser.name[0]}</div>
                        }
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-gray-800 truncate">{googleUser.name}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <p className="text-[10px] text-gray-500 font-medium">Online</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full text-xs flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-colors font-semibold">
                        <LogOut size={14} /> Desconectar
                    </button>
                </div>
            ) : (
                <button onClick={onLogin} className="w-full bg-white border border-gray-200 hover:border-brand-300 hover:text-brand-700 text-gray-600 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-sm hover:shadow">
                    <LogIn size={16} /> Conectar Google
                </button>
            )}
        </div>
      </aside>

      {/* Floating Toggle Button (Mobile) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`
            md:hidden fixed bottom-6 left-4 z-50 
            w-12 h-12 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center 
            transition-all duration-300 border border-white/20
            ${isSidebarOpen ? 'bg-white text-gray-800' : 'bg-brand-600 text-white hover:bg-brand-700'}
        `}
      >
        {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full bg-gray-50/50">
        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
            {children}
        </div>
      </main>
    </div>
  );
};