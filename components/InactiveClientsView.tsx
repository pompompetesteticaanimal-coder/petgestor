import React, { useState, useMemo } from 'react';
import { Client, Appointment, Service } from '../types';
import { Phone, CheckCircle, MessageCircle, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';

interface InactiveClientsViewProps {
    clients: Client[];
    appointments: Appointment[];
    services: Service[];
    onMarkContacted: (client: Client, daysInactive: number) => void;
    onBack: () => void;
}

export const InactiveClientsView: React.FC<InactiveClientsViewProps> = ({ clients, appointments, services, onMarkContacted, onBack }) => {
    // 1. Calculate filtering logic
    const inactiveClients = useMemo(() => {
        const now = new Date();
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(now.getDate() - 15);

        return clients.map(client => {
            // Find last completed/scheduled appointment (ignore canceled)
            const clientApps = appointments
                .filter(a => a.clientId === client.id && a.status !== 'cancelado')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastApp = clientApps[0];

            if (!lastApp) return null; // New client with no appointments? Or just no history.

            const lastDate = new Date(lastApp.date);
            if (lastDate > fifteenDaysAgo) return null; // Visited recently

            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return {
                client,
                lastApp,
                daysInactive: diffDays
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.daysInactive - a.daysInactive); // Most inactive first
    }, [clients, appointments]);

    const getWhatsAppLink = (client: Client, petName: string, days: number) => {
        const phone = client.phone.replace(/\D/g, '');
        const message = `Olá ${client.name.split(' ')[0]}, o ${petName} está com saudades! Já faz ${days} dias que não o vemos. Vamos agendar um banho?`;
        return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Painel de Inativos</h1>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold tracking-wider">
                                <th className="p-4">Data/Hora</th>
                                <th className="p-4">Pet</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Telefone</th>
                                <th className="p-4 hidden md:table-cell">Endereço</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {inactiveClients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        Nenhum cliente inativo há mais de 15 dias.
                                    </td>
                                </tr>
                            ) : (
                                inactiveClients.map(({ client, lastApp, daysInactive }) => {
                                    const pet = client.pets.find(p => p.id === lastApp.petId) || client.pets[0];
                                    const dateObj = new Date(lastApp.date);

                                    return (
                                        <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="p-4 font-medium text-gray-700">
                                                <div className="flex flex-col">
                                                    <span>{dateObj.toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-xs text-gray-400">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{pet?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{pet?.breed}</div>
                                            </td>
                                            <td className="p-4 font-medium text-gray-700">{client.name}</td>
                                            <td className="p-4 text-gray-600 font-mono text-xs">{client.phone}</td>
                                            <td className="p-4 hidden md:table-cell text-gray-500 truncate max-w-[150px]" title={client.address}>{client.address}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100">
                                                    {daysInactive} dias off
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <a
                                                        href={getWhatsAppLink(client, pet?.name || 'Seu Pet', daysInactive)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors btn-spring"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <MessageCircle size={18} />
                                                    </a>
                                                    <button
                                                        onClick={() => onMarkContacted(client, daysInactive)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors btn-spring"
                                                        title="Marcar como Contatado"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
