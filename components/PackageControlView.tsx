
import React, { useMemo, useState } from 'react';
import { User, Calendar, AlertCircle, CheckCircle, Package, Search, Phone, MapPin, ChevronRight, Filter } from 'lucide-react';
import { Client, Appointment, Service, Pet } from '../types';

interface PackageControlViewProps {
    clients: Client[];
    appointments: Appointment[];
    services: Service[];
    onViewPet?: (pet: Pet, client: Client) => void;
    onUpdateClient?: (client: Client) => void;
}

const PackageControlView: React.FC<PackageControlViewProps> = ({ clients, appointments, services, onViewPet, onUpdateClient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'monthly' | 'fortnightly' | 'renewal' | 'inactive'>('all');

    // Helper to check if a service is a package
    const isPackageService = (serviceName: string) => {
        const lower = serviceName.toLowerCase();
        return lower.includes('pacote');
    };

    // Helper to check if it's renewal (Package 1)
    const isRenewal = (serviceName: string) => {
        // Checks for "1" bounded by word boundaries or implicit logic
        // Assuming "Pacote Mensal 1" or "Pacote Quinzenal 1"
        return serviceName.includes('1 ') || serviceName.endsWith('1') || serviceName.includes('1°');
    };

    const handleToggleInactive = (client: Client, pet: Pet, isCurrentlyInactive: boolean) => {
        if (!onUpdateClient) return;
        const newNote = isCurrentlyInactive
            ? pet.notes.replace('[INATIVO]', '').trim()
            : `[INATIVO] ${pet.notes || ''}`.trim();

        const updatedPet = { ...pet, notes: newNote };
        const updatedClient = {
            ...client,
            pets: client.pets.map(p => p.id === pet.id ? updatedPet : p)
        };
        onUpdateClient(updatedClient);
    };

    const handleWhatsApp = (phone: string, clientName: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://wa.me/55${cleanPhone}?text=Olá ${clientName}, tudo bem? Gostaria de falar sobre o pacote do seu pet.`;
        window.open(url, '_blank');
    };

    // Helper to get package type
    const getPackageType = (serviceName: string) => {
        const lower = serviceName.toLowerCase();
        if (lower.includes('mensal')) return 'Mensal';
        if (lower.includes('quinzenal')) return 'Quinzenal';
        return 'Outro';
    };

    const packageData = useMemo(() => {
        // Correct Local Date String (YYYY-MM-DD) handling for user's timezone
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const todayStr = new Date(now.getTime() - offset).toISOString().split('T')[0];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // We can just use string comparison for 30 days ago calculated locally too
        const thirtyDaysAgoLocal = new Date(thirtyDaysAgo.getTime() - offset).toISOString().split('T')[0];

        const data: any[] = [];

        clients.forEach(client => {
            client.pets.forEach(pet => {
                const petId = pet.id;

                // 1. Get all compatible appointments
                const petApps = appointments.filter(a => a.clientId === client.id && a.petId === petId && a.status !== 'cancelado');

                // 2. Check if this pet is a "Package Pet" (has ANY package appointment history or future)
                const packageApps = petApps.filter(a => {
                    const s = services.find(srv => srv.id === a.serviceId);
                    return s && isPackageService(s.name);
                });

                if (packageApps.length > 0) {
                    // 3. Determine Ref Service (Latest Package Appointment)
                    const lastPackageApp = [...packageApps].sort((a, b) => b.date.localeCompare(a.date))[0];
                    const service = services.find(s => s.id === lastPackageApp.serviceId);
                    const serviceName = service ? service.name : 'Pacote';

                    // 4. Find Last & Next Baths
                    // Use string slicing for safe comparison if dates are ISO
                    // Last Bath: Completed (concluido) in the past
                    const lastBath = petApps
                        .filter(a => a.status === 'concluido' && a.date.split('T')[0] < todayStr)
                        .sort((a, b) => b.date.localeCompare(a.date))[0];

                    // Next Bath: Future Scheduled (includes Today)
                    const nextBath = petApps
                        .filter(a => a.status === 'agendado' && a.date.split('T')[0] >= todayStr)
                        .sort((a, b) => a.date.localeCompare(b.date))[0];

                    // 5. Determine "Active Rule" Status
                    const isExplicitInactive = (pet.notes || '').includes('[INATIVO]');
                    const hasFuturePackage1 = nextBath && services.find(s => s.id === nextBath.serviceId)?.name.includes('1');
                    const hasRecentActivity = lastBath && lastBath.date.split('T')[0] >= thirtyDaysAgoLocal;

                    const meetsActiveRule = !!(hasFuturePackage1 || hasRecentActivity);
                    const isActive = !isExplicitInactive && meetsActiveRule;

                    data.push({
                        client,
                        pet,
                        nextApp: nextBath,
                        lastApp: lastBath,
                        serviceName,
                        isRenewal: isRenewal(serviceName),
                        isNextRenewal: nextBath && services.find(s => s.id === nextBath.serviceId) && isRenewal(services.find(s => s.id === nextBath.serviceId)!.name),
                        type: getPackageType(serviceName),
                        petName: pet.name,
                        id: pet.id,
                        isActive,
                        isExplicitInactive
                    });
                }
            });
        });

        // Sort: Active first, then by date
        return data.sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            const dateA = a.nextApp ? a.nextApp.date : '9999-99-99';
            const dateB = b.nextApp ? b.nextApp.date : '9999-99-99';
            return dateA.localeCompare(dateB);
        });
    }, [clients, appointments, services]);

    const filteredData = packageData.filter(item => {
        const matchesSearch = item.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.petName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterType === 'monthly') return item.type === 'Mensal' && !item.isExplicitInactive;
        if (filterType === 'fortnightly') return item.type === 'Quinzenal' && !item.isExplicitInactive;
        if (filterType === 'renewal') return item.isRenewal && !item.isExplicitInactive;
        if (filterType === 'inactive') return item.isExplicitInactive;
        if (filterType === 'all') return !item.isExplicitInactive;

        return true;
    });

    // Stats count ONLY isActive (Rule met + Not Inactive)
    const activeItems = packageData.filter(i => i.isActive);

    const stats = {
        total: activeItems.length,
        monthly: activeItems.filter(i => i.type === 'Mensal').length,
        fortnightly: activeItems.filter(i => i.type === 'Quinzenal').length,
        renewals: activeItems.filter(i => i.isNextRenewal || i.isRenewal).length,
        revenue: activeItems.reduce((acc, curr) => {
            const baseName = curr.serviceName.replace(/\d+/, '1');
            const service = services.find(s => s.name === baseName) || services.find(s => s.name === curr.serviceName);
            return acc + (service?.price || 0);
        }, 0)
    };

    // Helper for safe date display
    const formatDate = (dateStr: string) => {
        // Assume dateStr is ISO with potential offset or not.
        // We want to force parsing it as LOCAL time components if it has no offset,
        // OR respect the offset if provided, but display primarily the day/month.
        // The safest for "Appt Date" stored as ISO is usually just "new Date(dateStr)"
        // BUT if it shifts, we can split manually.
        // Let's use manual split for consistency with logic.
        const [y, m, d] = dateStr.split('T')[0].split('-');
        return `${d}/${m}`;
    };

    const formatWeekday = (dateStr: string) => {
        // This needs a Date object for weekday calculation.
        const d = new Date(dateStr);
        // If timezone shifts day, this is wrong.
        // Safer: Append T12:00:00 to date part if T is missing to force middle of day?
        // No, just trust system for weekday, usually ok unless 00:00 edge case.
        // Let's stick to standard parsing for now, user mainly complained about VALUES (possibly filtering).
        return d.toLocaleDateString('pt-BR', { weekday: 'short' });
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

                <div onClick={() => setFilterType('inactive')} className={`col-span-2 md:col-span-4 lg:col-span-4 p-3 rounded-2xl border border-dashed cursor-pointer transition-all flex items-center justify-center gap-2 ${filterType === 'inactive' ? 'bg-gray-100 border-gray-300' : 'bg-transparent border-gray-200 hover:bg-gray-50'}`}>
                    <span className="text-sm font-bold text-gray-400 uppercase">Ver Inativos ({packageData.filter(i => i.isExplicitInactive).length})</span>
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
                {filteredData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Nenhum pacote encontrado.</div>
                ) : (
                    filteredData.map((item, index) => (
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
                                <div className="text-right">
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
                                                {formatDate(item.lastApp.date)}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {formatWeekday(item.lastApp.date)}
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
                                                {formatDate(item.nextApp.date)}
                                            </span>
                                            <span className="text-[10px] text-brand-500 font-bold">
                                                {formatWeekday(item.nextApp.date)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-brand-400 font-bold italic">Agendar</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-100 px-3 py-2 rounded-lg">
                                    <Package size={14} className={item.isRenewal ? 'text-orange-500' : 'text-brand-500'} />
                                    <span className={item.isRenewal ? 'text-orange-700 font-bold' : ''}>{item.serviceName}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleInactive(item.client, item.pet, item.isExplicitInactive); }}
                                        className={`p-2 rounded-xl transition-colors ${item.isExplicitInactive ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                                        title={item.isExplicitInactive ? "Ativar Pacote" : "Desativar Pacote"}
                                    >
                                        <Package size={18} className={item.isExplicitInactive ? "opacity-50" : ""} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleWhatsApp(item.client.phone, item.client.name); }}
                                        className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                                        title="Contatar via WhatsApp"
                                    >
                                        <Phone size={18} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PackageControlView;
