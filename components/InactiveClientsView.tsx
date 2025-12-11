import React, { useMemo, useState } from 'react';
import { Client, Appointment, Service, Pet } from '../types';
import { Phone, CheckCircle, MessageCircle, Calendar as CalendarIcon, ArrowLeft, MapPin, Dog, Clock, AlertCircle, Search, Filter, ArrowUpDown, ArrowDownUp } from 'lucide-react';

interface InactiveClientsViewProps {
    clients: Client[];
    appointments: Appointment[];
    services: Service[];
    contactLogs: { clientId: string, date: string }[];
    onMarkContacted: (client: Client, daysInactive: number) => void;
    onBack: () => void;
    onViewPet?: (pet: Pet, client: Client) => void;
}

export const InactiveClientsView: React.FC<InactiveClientsViewProps> = ({ clients, appointments, services, contactLogs, onMarkContacted, onBack, onViewPet }) => {
    // State for Search, Filter, Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [minDays, setMinDays] = useState(15);
    const [sortAsc, setSortAsc] = useState(true);

    // 1. Calculate filtering logic
    const inactiveClients = useMemo(() => {
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - minDays);

        return clients.map(client => {
            // Find last completed/scheduled appointment (ignore canceled)
            const clientApps = appointments
                .filter(a => a.clientId === client.id && a.status !== 'cancelado')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastApp = clientApps[0];

            if (!lastApp) return null; // No history

            // Get last contact date
            const clientContacts = contactLogs
                .filter(l => l.clientId === client.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastContact = clientContacts[0];

            // Determine effective "Last Activity" date (Visit OR Contact)
            const lastAppDate = new Date(lastApp.date);
            const lastContactDate = lastContact ? new Date(lastContact.date) : new Date(0);

            const effectiveLastDate = lastAppDate > lastContactDate ? lastAppDate : lastContactDate;

            // Filter if activity is recent (based on dynamic minDays)
            if (effectiveLastDate > cutoffDate) return null;

            const diffTime = Math.abs(now.getTime() - effectiveLastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                client,
                lastApp,
                daysInactive: diffDays,
                lastActivityType: effectiveLastDate === lastAppDate ? 'visit' : 'contact'
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);
    }, [clients, appointments, contactLogs, minDays]);

    // 2. Search and Sort
    const processedList = useMemo(() => {
        let result = [...inactiveClients];

        // Search
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item => {
                const pet = item.client.pets.find(p => p.id === item.lastApp.petId);
                return (
                    item.client.name.toLowerCase().includes(lowerTerm) ||
                    (pet?.name || '').toLowerCase().includes(lowerTerm)
                );
            });
        }

        // Sort
        result.sort((a, b) => {
            if (sortAsc) {
                return a.daysInactive - b.daysInactive; // Crescent: 16, 17, 18...
            } else {
                return b.daysInactive - a.daysInactive; // Decrescent: 100, 99...
            }
        });

        return result;
    }, [inactiveClients, searchTerm, sortAsc]);

    const getWhatsAppLink = (client: Client, petName: string, days: number) => {
        const phone = client.phone.replace(/\D/g, '');
        const message = `Boa tarde *${client.name.split(' ')[0]}*! ☀️\nJá faz muito tempo que não os vemos aqui no PomPomPet. 🐶💔\nVamos agendar um banho para deixá-lo lindo e cheiroso? 🛁✂️✨`;
        return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 bg-gray-50/50 min-h-full">
            {/* Header + Controls */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm flex flex-col gap-4 p-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Painel de Inativos</h1>
                        <p className="text-xs text-gray-500 font-medium">Gerenciamento de retorno de clientes</p>
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col md:flex-row gap-2">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente ou pet..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl transition-all outline-none text-sm font-medium"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                        {/* Days Filter */}
                        {/* Days Filter Dropdown */}
                        <div className="relative shrink-0">
                            <select
                                value={minDays}
                                onChange={(e) => setMinDays(Number(e.target.value))}
                                className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl pl-4 pr-9 py-3 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-brand-500/20"
                            >
                                <option value={15}>15+ Dias</option>
                                <option value={30}>30+ Dias</option>
                                <option value={45}>45+ Dias</option>
                                <option value={60}>60+ Dias</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>

                        {/* Sort Toggle */}
                        <button
                            onClick={() => setSortAsc(!sortAsc)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shrink-0"
                        >
                            {sortAsc ? <ArrowDownUp size={16} /> : <ArrowUpDown size={16} />}
                            {sortAsc ? 'Crescente' : 'Decrescente'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedList.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search size={40} className="text-gray-300" />
                        </div>
                        <p className="font-bold text-lg">Nenhum resultado</p>
                        <p className="text-sm">Tente ajustar os filtros ou busca.</p>
                    </div>
                ) : (
                    processedList.map(({ client, lastApp, daysInactive }, index) => {
                        const pet = client.pets.find(p => p.id === lastApp.petId) || client.pets[0];
                        const dateObj = new Date(lastApp.date);

                        return (
                            <div
                                key={client.id}
                                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group animate-slide-up relative overflow-hidden"
                                style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
                            >
                                {/* Inactivity Badge */}
                                <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl border-l border-b ${daysInactive >= 60 ? 'bg-red-50 border-red-100' : daysInactive >= 30 ? 'bg-orange-50 border-orange-100' : 'bg-rose-50 border-rose-100'}`}>
                                    <span className={`text-xs font-black uppercase flex items-center gap-1 ${daysInactive >= 60 ? 'text-red-600' : daysInactive >= 30 ? 'text-orange-600' : 'text-rose-600'}`}>
                                        <Clock size={12} /> {daysInactive} dias off
                                    </span>
                                </div>

                                <div
                                    className="cursor-pointer hover:bg-gray-50 -mx-5 px-5 pt-5 pb-2 transition-colors"
                                    onClick={() => onViewPet?.(pet, client)}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-brand-600 shadow-inner shrink-0">
                                            <Dog size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-brand-600 transition-colors">{pet?.name || 'Pet'}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{pet?.breed || 'Raça não inf.'}</p>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg w-fit">
                                                <CalendarIcon size={10} />
                                                Última vez: {dateObj.toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                            </div>
                                            <span className="font-bold">{client.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                                <Phone size={12} />
                                            </div>
                                            <span className="font-mono">{client.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <a
                                        href={getWhatsAppLink(client, pet?.name || 'Seu Pet', daysInactive)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors border border-green-100 active:scale-95"
                                    >
                                        <MessageCircle size={18} />
                                        WhatsApp
                                    </a>
                                    <button
                                        onClick={() => onMarkContacted(client, daysInactive)}
                                        className="flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 active:scale-95"
                                    >
                                        <CheckCircle size={18} />
                                        Já Falei
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
