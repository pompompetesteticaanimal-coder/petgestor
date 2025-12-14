import React, { useMemo } from 'react';
import { Pet, Client, Appointment } from '../types';
import { X, Calendar, Star, Info, MessageCircle, Heart, Activity, Ruler, Scissors } from 'lucide-react';

interface PetDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet: Pet | null;
    client: Client | null;
    appointments: Appointment[];
}

export const PetDetailsModal: React.FC<PetDetailsModalProps> = ({ isOpen, onClose, pet, client, appointments }) => {
    if (!isOpen || !pet || !client) return null;

    // Filter appointments for this pet
    const petAppointments = useMemo(() => {
        return appointments
            .filter(a => a.petId === pet.id && a.status !== 'cancelado')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, pet.id]);

    // Calculate Stats
    const totalVisits = petAppointments.length;
    const lastVisit = petAppointments[0];

    // Calculate Average Rating
    const averageRating = useMemo(() => {
        const ratedApps = petAppointments.filter(a => a.rating && a.rating > 0);
        if (ratedApps.length === 0) return 0;
        const total = ratedApps.reduce((sum, a) => sum + (a.rating || 0), 0);
        return (total / ratedApps.length).toFixed(1);
    }, [petAppointments]);

    const getWhatsAppLink = () => {
        const phone = client.phone.replace(/\D/g, '');
        const message = `Olá ${client.name.split(' ')[0]}, falando sobre o ${pet.name}...`;
        return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-brand-500 to-rose-400">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors z-10">
                        <X size={20} />
                    </button>

                    <div className="absolute -bottom-10 left-8 flex items-end gap-4">
                        <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-lg">
                            <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center text-4xl">
                                🐶
                            </div>
                        </div>
                        <div className="pb-2 text-white drop-shadow-md">
                            <h2 className="text-3xl font-bold">{pet.name}</h2>
                            <p className="opacity-90">{pet.breed}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-14 px-8 pb-8 overflow-y-auto custom-scrollbar">

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100 flex flex-col items-center justify-center text-center">
                            <div className="flex items-center gap-1 text-orange-600 font-bold text-xl justify-center">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={16} className={Number(averageRating) >= s ? "fill-orange-500 text-orange-500" : "text-orange-200"} />
                                ))}
                            </div>
                            <span className="text-xs text-orange-400 font-medium uppercase tracking-wide">Avaliação Média</span>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex flex-col items-center justify-center text-center">
                            <div className="text-blue-600 font-bold text-xl">{totalVisits}</div>
                            <span className="text-xs text-blue-400 font-medium uppercase tracking-wide">Visitas Totais</span>
                        </div>
                        <div className="bg-green-50 p-3 rounded-2xl border border-green-100 flex flex-col items-center justify-center text-center">
                            <div className="text-green-600 font-bold text-sm truncate w-full">
                                {lastVisit ? new Date(lastVisit.date).toLocaleDateString('pt-BR') : 'Nunca'}
                            </div>
                            <span className="text-xs text-green-400 font-medium uppercase tracking-wide">Última Visita</span>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 flex flex-col items-center justify-center text-center">
                            <div className="text-purple-600 font-bold text-sm truncate w-full uppercase">
                                {pet.size || '?'} / {pet.coat || '?'}
                            </div>
                            <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">Porte / Pelo</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Info Column */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Info size={16} /> Sobre o Pet
                                </h3>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-500">Idade</span>
                                        <span className="font-medium text-gray-700">{pet.age || 'Não inf.'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-2">
                                        <span className="text-gray-500">Sexo</span>
                                        <span className="font-medium text-gray-700">{pet.gender || 'Não inf.'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Observações</span>
                                        <span className="font-medium text-gray-700 max-w-[150px] truncate text-right" title={pet.notes}>{pet.notes || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Heart size={16} /> Tutor
                                </h3>
                                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-gray-800">{client.name}</div>
                                        <div className="text-xs text-gray-500">{client.phone}</div>
                                    </div>
                                    <a
                                        href={getWhatsAppLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors"
                                    >
                                        <MessageCircle size={20} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* History Column */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Activity size={16} /> Histórico Recente
                            </h3>
                            <div className="space-y-3">
                                {petAppointments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">Nenhuma visita registrada.</div>
                                ) : (
                                    petAppointments.slice(0, 5).map(app => (
                                        <div key={app.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs shrink-0">
                                                {new Date(app.date).getDate()}
                                                <br />
                                                {new Date(app.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800 text-sm truncate">
                                                    {app.additionalServiceIds?.length ? 'Combo Serviços' : 'Banho/Tosa'}
                                                </div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    {app.rating ? (
                                                        <span className="flex text-amber-400">
                                                            {Array.from({ length: app.rating }).map((_, i) => <Star key={i} size={8} fill="currentColor" />)}
                                                        </span>
                                                    ) : 'Sem avaliação'}
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-gray-600">
                                                R$ {app.paidAmount || 0}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
