import React from 'react';
import { ViewState, GoogleUser } from '../types';
import { LayoutDashboard, Users, Calendar, Scissors, Menu, X, LogIn, LogOut } from 'lucide-react';

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
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-brand-600 text-white' 
          : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, googleUser, onLogin, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
        <div className="p-6 flex items-center space-x-2 border-b border-gray-100">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
            <h1 className="text-xl font-bold text-gray-800">PetGestor</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="dashboard" current={currentView} icon={LayoutDashboard} label="Dashboard" onClick={setView} />
          <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={setView} />
          <NavItem view="clients" current={currentView} icon={Users} label="Clientes & Pets" onClick={setView} />
          <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={setView} />
        </nav>
        
        {/* Google Auth Section */}
        <div className="p-4 border-t border-gray-100">
            {googleUser ? (
                <div className="bg-white border border-gray-200 p-3 rounded-lg mb-2 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        {googleUser.picture && <img src={googleUser.picture} alt="Profile" className="w-8 h-8 rounded-full" />}
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-gray-800 truncate">{googleUser.name}</p>
                            <p className="text-[10px] text-green-600 flex items-center gap-1">● Conectado</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full text-xs flex items-center justify-center gap-1 text-red-500 hover:bg-red-50 p-1 rounded transition">
                        <LogOut size={12} /> Sair
                    </button>
                </div>
            ) : (
                <button onClick={onLogin} className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition mb-2 shadow-sm">
                    <LogIn size={16} /> Conectar Google
                </button>
            )}
        </div>
      </aside>

      {/* Mobile Header & Overlay */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-20">
            <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                <h1 className="text-lg font-bold text-gray-800">PetGestor</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600">
                {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-lg z-30 border-b border-gray-200 p-4 space-y-2">
                <NavItem view="dashboard" current={currentView} icon={LayoutDashboard} label="Dashboard" onClick={(v) => { setView(v); setIsMobileMenuOpen(false); }} />
                <NavItem view="schedule" current={currentView} icon={Calendar} label="Agenda" onClick={(v) => { setView(v); setIsMobileMenuOpen(false); }} />
                <NavItem view="clients" current={currentView} icon={Users} label="Clientes" onClick={(v) => { setView(v); setIsMobileMenuOpen(false); }} />
                <NavItem view="services" current={currentView} icon={Scissors} label="Serviços" onClick={(v) => { setView(v); setIsMobileMenuOpen(false); }} />
                <div className="border-t pt-2 mt-2">
                     {googleUser ? (
                        <button onClick={onLogout} className="flex items-center gap-2 text-red-500 w-full p-2">
                            <LogOut size={16} /> Sair ({googleUser.name})
                        </button>
                     ) : (
                        <button onClick={onLogin} className="flex items-center gap-2 text-blue-600 w-full p-2">
                            <LogIn size={16} /> Conectar Google Agenda
                        </button>
                     )}
                </div>
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};