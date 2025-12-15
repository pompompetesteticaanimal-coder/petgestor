
import React, { useMemo, useState, useEffect } from 'react';
import { User, Calendar, AlertCircle, CheckCircle, Package, Search, Phone, MapPin, ChevronRight, Filter, MessageCircle, Archive, RefreshCw } from 'lucide-react';
import { Client, Appointment, Service, Pet } from '../types';

interface PackageControlViewProps {
    clients: Client[];
    appointments: Appointment[];
    services: Service[];
    onViewPet?: (pet: Pet, client: Client) => void;
}

const PackageControlView: React.FC<PackageControlViewProps> = ({ clients, appointments, services, onViewPet }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'monthly' | 'fortnightly' | 'renewal'>('all');
    const [inactivePetIds, setInactivePetIds] = useState<string[]>([]);
    const [showInactive, setShowInactive] = useState(false);

    // Initialize inactive list from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('inactive_package_pets');
        if (stored) {
            setInactivePetIds(JSON.parse(stored));
        }
    }, []);

    const toggleInactive = (petId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setInactivePetIds(prev => {
            const newVal = prev.includes(petId)
                ? prev.filter(id => id !== petId)
                : [...prev, petId];
            localStorage.setItem('inactive_package_pets', JSON.stringify(newVal));
            return newVal;
        });
    };

    // Helper to check if a service is a package
    const isPackageService = (serviceName: string) => {
        const lower = serviceName.toLowerCase();
        return lower.includes('pacote');
    };

    // Helper to check if it's renewal (Package 1)
    const isRenewal = (serviceName: string) => {
        // Checks for "1" bounded by word boundaries or implicit logic
        // Assuming "Pacote Mensal 1" or "Pacote Quinzenal 1"
        return serviceName.includes('1');
    };

    // Helper to get package type
    const getPackageType = (serviceName: string) => {
        const lower = serviceName.toLowerCase();
        if (lower.includes('mensal')) return 'Mensal';
        if (lower.includes('quinzenal')) return 'Quinzenal';
        return 'Outro';
    };

    const packageData = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const data: any[] = [];
        const processedPetIds = new Set<string>();

        clients.forEach(client => {
            client.pets.forEach(pet => {
                const petId = pet.id;

                if (processedPetIds.has(petId)) return; // Prevent duplicates

                // 1. Get all compatible appointments
                const petApps = appointments.filter(a => a.clientId === client.id && a.petId === petId && a.status !== 'cancelado');

                // 2. Check if this pet is a "Package Pet" (has ANY package appointment history or future)
                const packageApps = petApps.filter(a => {
                    const s = services.find(srv => srv.id === a.serviceId);
                    return s && isPackageService(s.name);
                });

                if (packageApps.length > 0) {
                    processedPetIds.add(petId);

                    // 3. Determine Ref Service (Latest Package Appointment)
                    const lastPackageApp = [...packageApps].sort((a, b) => b.date.localeCompare(a.date))[0];
                    const service = services.find(s => s.id === lastPackageApp.serviceId);
                    const serviceName = service ? service.name : 'Pacote';

                    // 4. Find Last & Next Baths (Any service, not just package)
                    // Last Bath: Completed (concluido) in the past
                    const lastBath = petApps
                        .filter(a => a.status === 'concluido' && a.date < todayStr)
                        .sort((a, b) => b.date.localeCompare(a.date))[0];

                    // Next Bath: Future Scheduled
                    const nextBath = petApps
                        .filter(a => a.status === 'agendado' && a.date >= todayStr)
                        .sort((a, b) => a.date.localeCompare(b.date))[0];

                    data.push({
                        client,
                        pet,
                        nextApp: nextBath, // Can be undefined
                        lastApp: lastBath, // Can be undefined
                        serviceName,
                        isRenewal: isRenewal(serviceName),
                        type: getPackageType(serviceName),
                        petName: pet.name,
                        id: pet.id
                    });
                }
            });
        });

        // Sort by Next Date (nearest first), then those without dates
        return data.sort((a, b) => {
            const dateA = a.nextApp ? a.nextApp.date : '9999-99-99';
            const dateB = b.nextApp ? b.nextApp.date : '9999-99-99';
            return dateA.localeCompare(dateB);
        });
    }, [clients, appointments, services]);

    const allFilteredData = packageData.filter(item => {
        const matchesSearch = item.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.petName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterType === 'monthly') return item.type === 'Mensal';
        if (filterType === 'fortnightly') return item.type === 'Quinzenal';
        if (filterType === 'renewal') return item.isRenewal;

        return true;
    });

    // Active: Not manually inactive AND has future appointment
    const activePackages = allFilteredData.filter(item => !inactivePetIds.includes(item.pet.id) && item.nextApp !== undefined);

    // Inactive: Manually inactive OR no future appointment
    const inactivePackages = allFilteredData.filter(item => inactivePetIds.includes(item.pet.id) || item.nextApp === undefined);

    const stats = {
        total: activePackages.length,
        monthly: activePackages.filter(i => i.type === 'Mensal').length,
        fortnightly: activePackages.filter(i => i.type === 'Quinzenal').length,
        renewals: activePackages.filter(i => i.isRenewal).length,
        revenue: activePackages.reduce((acc, curr) => {
            // Logic: Always sum the price of the FIRST package (e.g. "Pacote Mensal 1") 
            // because subsequent packages might be $0 or pro-rated.
            // Heuristic: Replace the first digit found in the name with '1'.
            const baseName = curr.serviceName.replace(/\d+/, '1');
            const service = services.find(s => s.name === baseName) || services.find(s => s.name === curr.serviceName);
            return acc + (service?.price || 0);
        }, 0)
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header / Summary */}
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pacotes</h1>
                    <p className="text-gray-500 font-medium">Controle de renovações e agendamentos</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div onClick={() => setFilterType('all')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterType === 'all' ? 'bg-brand-600 text-white border-brand-600 shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-brand-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <Package size={20} className={filterType === 'all' ? 'text-white' : 'text-brand-600'} />
                        <span className="text-2xl font-bold">{stats.total}</span>
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${filterType === 'all' ? 'text-brand-100' : 'text-gray-400'}`}>Total Ativos</p>
                </div>

                <div className="p-4 rounded-2xl border bg-white border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full">Est. Receita</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-1">Valor Total</p>
                </div>

                <div onClick={() => setFilterType('renewal')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterType === 'renewal' ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-orange-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <AlertCircle size={20} className={filterType === 'renewal' ? 'text-white' : 'text-orange-500'} />
                        <span className="text-2xl font-bold">{stats.renewals}</span>
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${filterType === 'renewal' ? 'text-orange-100' : 'text-gray-400'}`}>Para Renovar</p>
                </div>

                <div onClick={() => setFilterType('monthly')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterType === 'monthly' ? 'bg-blue-500 text-white border-blue-500 shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <Calendar size={20} className={filterType === 'monthly' ? 'text-white' : 'text-blue-500'} />
                        <span className="text-2xl font-bold">{stats.monthly}</span>
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${filterType === 'monthly' ? 'text-blue-100' : 'text-gray-400'}`}>Mensais</p>
                </div>

                <div onClick={() => setFilterType('fortnightly')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${filterType === 'fortnightly' ? 'bg-purple-500 text-white border-purple-500 shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-purple-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <Calendar size={20} className={filterType === 'fortnightly' ? 'text-white' : 'text-purple-500'} />
                        <span className="text-2xl font-bold">{stats.fortnightly}</span>
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${filterType === 'fortnightly' ? 'text-purple-100' : 'text-gray-400'}`}>Quinzenais</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar cliente ou pet..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 ring-brand-100 transition-all shadow-sm"
                />
            </div>

            {/* List */}
            <div className="space-y-4">
                {activePackages.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Nenhum pacote ativo encontrado.</div>
                ) : (
                    activePackages.map((item, index) => (
                        <div
                            key={item.id}
                            onClick={() => item.pet && onViewPet?.(item.pet, item.client)}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 animate-slide-up cursor-pointer hover:shadow-md hover:border-brand-200 transition-all active:scale-[0.99]"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >

                            {/* Header: Name & Alert */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${item.isRenewal ? 'bg-orange-100 text-orange-600' : 'bg-brand-50 text-brand-600'}`}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{item.petName}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <User size={12} />
                                            <span className="font-medium text-gray-600">{item.client.name}</span>
                                            {item.isRenewal && (
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] uppercase font-bold rounded-full flex items-center gap-1">
                                                    <AlertCircle size={10} /> Renovação
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${item.type === 'Mensal' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {item.type}
                                    </span>
                                </div>
                            </div>

                            {/* Dates Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Last Bath */}
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><CheckCircle size={10} /> Último Banho</p>
                                    {item.lastApp ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800 text-sm">
                                                {new Date(item.lastApp.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(item.lastApp.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">--</span>
                                    )}
                                </div>

                                {/* Next Bath */}
                                <div className={`rounded-xl p-3 border ${item.nextApp ? 'bg-brand-50 border-brand-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase mb-1 flex items-center gap-1 ${item.nextApp ? 'text-brand-600' : 'text-gray-400'}`}><Calendar size={10} /> Próximo Banho</p>
                                    {item.nextApp ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-brand-900 text-sm">
                                                {new Date(item.nextApp.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <span className="text-[10px] text-brand-500 font-bold">
                                                {new Date(item.nextApp.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-brand-400 font-bold italic">Agendar</span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                    <Package size={14} className={item.isRenewal ? 'text-orange-500' : 'text-brand-500'} />
                                    <span className={item.isRenewal ? 'text-orange-700 font-bold' : ''}>{item.serviceName}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${item.client.phone.replace(/\D/g, '')}`, '_blank'); }}
                                        className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 border border-green-100 transition-colors shadow-sm"
                                        title="Contatar no WhatsApp"
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => toggleInactive(item.pet.id, e)}
                                        className="px-3 py-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 border border-gray-200 text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                                    >
                                        <Archive size={14} /> Inativar
                                    </button>
                                </div>
                            </div>

                        </div>
                    ))
                )}
            </div>

            {/* Inactive Section */}
            {inactivePackages.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className="flex items-center gap-2 text-gray-400 font-bold uppercase tracking-widest text-xs hover:text-gray-600 transition-colors mb-6 w-full"
                    >
                        <Archive size={14} />
                        Pacotes Inativos ({inactivePackages.length})
                        <ChevronRight size={14} className={`transition-transform ${showInactive ? 'rotate-90' : ''}`} />
                    </button>

                    {showInactive && (
                        <div className="space-y-4 opacity-75">
                            {inactivePackages.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 text-gray-400 rounded-xl flex items-center justify-center grayscale">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-600 text-base">{item.petName}</h3>
                                            <p className="text-xs text-gray-400">{item.client.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => toggleInactive(item.pet.id, e)}
                                        className="px-3 py-2 bg-white text-brand-600 rounded-xl hover:bg-brand-50 border border-brand-100 text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                                    >
                                        <RefreshCw size={14} /> Reativar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PackageControlView;
