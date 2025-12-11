
import React, { useMemo } from 'react';
import { ArrowLeft, MessageCircle, Calendar, AlertTriangle, Search, Filter, Phone, Check } from 'lucide-react';
import { Client, Appointment, Service, Pet } from '../types';

interface InactiveClientsViewProps {
    clients: Client[];
    appointments: Appointment[];
    onBack: () => void;
    onAddAppointment: (app: Appointment, client: Client, pet: Pet, appServices: Service[], manualDuration: number) => Promise<void>;
}

export const InactiveClientsView: React.FC<InactiveClientsViewProps> = ({ clients, appointments, onBack, onAddAppointment }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [minDays, setMinDays] = React.useState(15);


    const inactiveClients = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return clients.map(client => {
            // Find last completed appointment
            // We consider 'concluido' or distinct past appointments that were not cancelled/no-show
            const clientApps = appointments.filter(a =>
                a.clientId === client.id &&
                a.status !== 'cancelado' &&
                a.status !== 'nao_veio' &&
                new Date(a.date) < new Date() // Past only
            );

            if (clientApps.length === 0) return null;

            // Sort descending
            const sorted = clientApps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastApp = sorted[0];
            const lastDate = new Date(lastApp.date);

            // Calculate days absent
            const diffTime = Math.abs(today.getTime() - lastDate.getTime());
            const daysAbsent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                ...client,
                lastVisitDate: lastDate,
                daysAbsent,
                lastPetName: client.pets.find(p => p.id === lastApp.petId)?.name || 'Pet'
            };
        })
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .filter(c => c.daysAbsent >= minDays) // Filter > minDays
            .sort((a, b) => b.daysAbsent - a.daysAbsent); // Sort mostly absent first

    }, [clients, appointments, minDays]);

    const filteredList = inactiveClients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastPetName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTrafficLight = (days: number) => {
        if (days >= 30) return 'bg-red-100 text-red-600 border-red-200';
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    };

    const handleWhatsApp = (client: typeof inactiveClients[0]) => {
        const phone = client.phone.replace(/\D/g, ''); // Remove non-digits
        const message = `Olá ${client.name.split(' ')[0]}, o ${client.lastPetName} está com saudades! Já faz ${client.daysAbsent} dias que não o vemos. Vamos agendar um banho? 🐶💙`;
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleMarkContacted = async (client: typeof inactiveClients[0]) => {
        if (!confirm(`Marcar que entrou em contato com ${client.name}? Isso resetará a contagem de dias.`)) return;

        const dummyService: Service = {
            id: 'contact_svc',
            name: 'Contato Realizado',
            price: 0,
            durationMin: 15,
            description: 'Registro de contato',
            category: 'principal'
        };

        const newApp: Appointment = {
            id: `contact_${Date.now()}`,
            clientId: client.id,
            petId: client.pets[0]?.id || 'unknown',
            serviceId: dummyService.id,
            date: new Date().toISOString(),
            status: 'contato',
            notes: 'Contato registrado via painel de inativos',
            durationTotal: 15
        };

        const pet = client.pets[0] || { id: 'unknown', name: 'Pet', breed: 'SRD', size: 'Pequeno', coat: 'Curto' };

        await onAddAppointment(newApp, client, pet as Pet, [dummyService], 15);
        alert('Contato registrado! O cliente sairá da lista em instantes.');
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-12 pb-4 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft size={24} className="text-gray-600" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Clientes Inativos</h1>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nome ou pet..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl font-medium outline-none focus:ring-2 ring-brand-500 transition text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            value={minDays}
                            onChange={(e) => setMinDays(Number(e.target.value))}
                            className="pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 ring-brand-500 appearance-none shadow-sm text-sm"
                        >
                            <option value={15}>15+ dias</option>
                            <option value={30}>30+ dias</option>
                            <option value={45}>45+ dias</option>
                            <option value={60}>60+ dias</option>
                            <option value={90}>90+ dias</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-4 flex flex-col gap-3">
                {filteredList.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-lg font-medium">Nenhum cliente inativo encontrado!</p>
                        <p className="text-xs mt-1">Isso é ótimo, todos estão voltando. 🎉</p>
                    </div>
                ) : (
                    filteredList.map(client => (
                        <div key={client.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">Pet: {client.lastPetName}</p>
                                </div>
                                <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${getTrafficLight(client.daysAbsent)}`}>
                                    <AlertTriangle size={12} />
                                    {client.daysAbsent} dias sumido
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Calendar size={12} />
                                Última visita: {client.lastVisitDate.toLocaleDateString('pt-BR')}
                            </div>

                            <button
                                onClick={() => handleWhatsApp(client)}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-green-200"
                            >
                                <MessageCircle size={18} />
                                Chamar no WhatsApp
                            </button>
                            <button
                                onClick={() => handleMarkContacted(client)}
                                className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 hover:bg-gray-50"
                            >
                                <Check size={18} />
                                Já entrei em contato
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
