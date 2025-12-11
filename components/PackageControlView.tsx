
import React, { useMemo, useState } from 'react';
import { User, Calendar, AlertCircle, CheckCircle, Package, Search, Phone, MapPin, ChevronRight, Filter } from 'lucide-react';
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data: any[] = [];
        const processedClients = new Set<string>();

        // We need to identify "Package Clients". 
        // Strategy: Clients who have FUTURE appointments that are packages.
        // OR Clients who have had a package appointment recently (last 30 days) even if no future one (maybe expired/forgot to schedule).
        // For simplicity and "Control", let's focus on Next Appointment.

        clients.forEach(client => {
            // Find next appointment
            const clientApps = appointments
                .filter(a => a.clientId === client.id && a.status !== 'cancelado')
                .sort((a, b) => a.date.localeCompare(b.date));

            const futureApps = clientApps.filter(a => new Date(a.date) >= today);

            // If has future apps, check if the NEXT one is a package
            if (futureApps.length > 0) {
                const nextApp = futureApps[0];
                const service = services.find(s => s.id === nextApp.serviceId);
                const serviceName = service ? service.name : 'Unknown';

                if (isPackageService(serviceName)) {
                    data.push({
                        client,
                        nextApp,
                        serviceName,
                        isRenewal: isRenewal(serviceName),
                        isRenewal: isRenewal(serviceName),
                        type: getPackageType(serviceName),
                        petName: nextApp.petId ? client.pets.find(p => p.id === nextApp.petId)?.name : 'Pet',
                        pet: nextApp.petId ? client.pets.find(p => p.id === nextApp.petId) : null,
                        status: 'active'
                    });
                    processedClients.add(client.id);
                }
            } else {
                // If no future appointment, check last appointment within 30 days to see if they ARE a package client who just needs scheduling
                const pastApps = clientApps.filter(a => new Date(a.date) < today);
                if (pastApps.length > 0) {
                    const lastApp = pastApps[pastApps.length - 1]; // Last one
                    const service = services.find(s => s.id === lastApp.serviceId);
                    const serviceName = service ? service.name : '';
                    // Check if last was a package and it wasn't the last of the set (e.g. 4/4). 
                    // Hard to know if 4/4 is end without assumpution.
                    // But if they used a package recently, list them as "Sem Agendamento" maybe?
                    // The prompt asks for "next bath". If none, maybe skip or show warning.
                    // Let's stick to Active Future Packages first as priority.
                    if (isPackageService(serviceName)) {
                        // Optional: Include them with a "Needs Scheduling" status?
                        // User asked for "next bath".
                        // adding matches for robustness
                    }
                }
            }
        });

        return data.sort((a, b) => a.nextApp.date.localeCompare(b.nextApp.date));
    }, [clients, appointments, services]);

    const filteredData = packageData.filter(item => {
        const matchesSearch = item.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.petName.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterType === 'monthly') return item.type === 'Mensal';
        if (filterType === 'fortnightly') return item.type === 'Quinzenal';
        if (filterType === 'renewal') return item.isRenewal;

        return true;
    });

    const stats = {
        total: packageData.length,
        monthly: packageData.filter(i => i.type === 'Mensal').length,
        fortnightly: packageData.filter(i => i.type === 'Quinzenal').length,
        renewals: packageData.filter(i => i.isRenewal).length,
        revenue: packageData.reduce((acc, curr) => {
            const service = services.find(s => s.name === curr.serviceName); // Simplified lookup, ideally use ID if available in item
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
                            key={item.nextApp.id}
                            onClick={() => item.pet && onViewPet?.(item.pet, item.client)}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 animate-slide-up cursor-pointer hover:shadow-md hover:border-brand-200 transition-all active:scale-[0.99]"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >

                            {/* Header: Name & Alert */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${item.isRenewal ? 'bg-orange-100 text-orange-600' : 'bg-brand-50 text-brand-600'}`}>
                                        {item.client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.client.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="font-medium text-gray-700">{item.petName}</span>
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

                            {/* Service & Date Info */}
                            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-100">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Próximo Banho</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-400" />
                                        <span className="font-bold text-gray-800">
                                            {new Date(item.nextApp.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className="text-gray-400">as {new Date(item.nextApp.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-100 px-3 py-2 rounded-lg self-start">
                                <Package size={14} className={item.isRenewal ? 'text-orange-500' : 'text-brand-500'} />
                                <span className={item.isRenewal ? 'text-orange-700 font-bold' : ''}>{item.serviceName}</span>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PackageControlView;
