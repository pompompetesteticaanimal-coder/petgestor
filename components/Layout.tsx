
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, GoogleUser } from '../types';
import { LayoutDashboard, Users, Calendar, Scissors, LogIn, LogOut, Wallet, ChevronRight, ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';

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
      className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-brand-500 text-white shadow-md shadow-brand-200' 
          : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  // --- SWIPE LOGIC ---
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
    // const isRightSwipe = distance < -minSwipeDistance; // Logic removed requested by user

    // Only allow closing via swipe, not opening
    if (isLeftSwipe && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <div 
      className="flex h-screen bg-[#fffdfd] overflow-hidden relative"
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
        w-64 bg-white border-r border-gray-100 h-full shadow-2xl md:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 h-[80px]">
            <div className="flex items-center space-x-3">
                {/* Logo Image */}
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" onError={(e) => {
                    // Fallback if image not found
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}/>
                {/* Fallback Icon */}
                <div className="hidden w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold shadow-sm">P</div>
                
                <h1 className="text-xl font-bold text-brand-600 tracking-tight">PomPomPet</h1>
            </div>
            {/* Close button inside sidebar on mobile */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-brand-500">
                <ChevronLeft size={24} />
            </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {/* Operacional Group (Moved to Top) */}
          <div className="pb-4">
             <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Operacional</p>
             <NavItem view="payments" current={currentView} icon={Wallet} label="Pagamentos" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
             <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
             <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
             <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
          </div>

          {/* Dashboard Group (Moved to Bottom) */}
          <div className="border-t border-gray-100 pt-4">
            <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Gestão</p>
            <NavItem view="revenue" current={currentView} icon={TrendingUp} label="Faturamento" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
            <NavItem view="costs" current={currentView} icon={TrendingDown} label="Custo Mensal" onClick={(v) => {setView(v); setIsSidebarOpen(false);}} />
          </div>
        </nav>
        
        {/* Google Auth Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/30">
            {googleUser ? (
                <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        {googleUser.picture ? (
                            <img src={googleUser.picture} alt="Profile" className="w-9 h-9 rounded-full ring-2 ring-brand-100" />
                        ) : (
                             <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">{googleUser.name[0]}</div>
                        )}
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-800 truncate">{googleUser.name}</p>
                            <p className="text-[10px] text-green-500 flex items-center gap-1 font-bold">● Conectado</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full text-xs flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 p-2.5 rounded-lg transition font-bold border border-transparent hover:border-red-100">
                        <LogOut size={14} /> Sair
                    </button>
                </div>
            ) : (
                <button onClick={onLogin} className="w-full bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition shadow-sm">
                    <LogIn size={16} /> Conectar Google
                </button>
            )}
        </div>
      </aside>

      {/* Floating Toggle Button (Mobile Only) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`
            md:hidden fixed bottom-6 left-4 z-50 
            w-12 h-12 rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center 
            transition-all duration-300
            ${isSidebarOpen ? 'bg-white text-gray-800' : 'bg-brand-500 text-white'}
        `}
      >
        {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full bg-[#fffdfd]">
        {/* Mobile Header Title */}
        <div className="md:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-center px-4 flex-shrink-0 shadow-sm z-30">
             <h2 className="font-bold text-brand-600 text-lg">
                {currentView === 'revenue' && 'Faturamento'}
                {currentView === 'costs' && 'Custo Mensal'}
                {currentView === 'payments' && 'Pagamentos'}
                {currentView === 'schedule' && 'Agenda'}
                {currentView === 'clients' && 'Clientes'}
                {currentView === 'services' && 'Serviços'}
             </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
            {children}
        </div>
      </main>
    </div>
  );
};
