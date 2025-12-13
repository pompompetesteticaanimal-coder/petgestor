import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, Trash2, Phone, Search, Star, MapPin, PawPrint, Check, X,
    Settings, Clock, Activity, Edit2
} from 'lucide-react';
import { Client, Appointment, Pet } from '../types';
import { ClientFormModal } from './ClientFormModal';

interface ClientManagerProps {
    clients: Client[];
    appointments: Appointment[];
    onDeleteClient: (id: string) => void;
    onUpdateClient: (client: Client) => void;
    onAddClient: (client: Client) => void;
    onLog: (action: string, details: string) => void;
}

export const ClientManager: React.FC<ClientManagerProps> = ({ clients, appointments, onDeleteClient, onUpdateClient, onAddClient, onLog }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Client>>({});
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

    // Pet Editing State
    const [editingPetId, setEditingPetId] = useState<string | null>(null);
    const [petEditForm, setPetEditForm] = useState<Partial<Pet>>({});

    const startEditing = () => {
        if (!selectedClient) return;
        setEditForm({
            name: selectedClient.name,
            phone: selectedClient.phone,
            address: selectedClient.address,
            complement: selectedClient.complement
        });
        setIsEditing(true);
        setEditingPetId(null); // Close pet edit if open
    };

    const startEditingPet = (pet: Pet) => {
        setPetEditForm({ ...pet });
        setEditingPetId(pet.id);
        setIsEditing(false); // Close client edit if open
    };

    const handleSavePet = async () => {
        if (!selectedClient || !editingPetId || !petEditForm.name) return;

        // Optimize: Optimistic Update
        const updatedPets = selectedClient.pets.map(p => p.id === editingPetId ? { ...p, ...petEditForm } as Pet : p);
        const updatedClient = { ...selectedClient, pets: updatedPets };

        // 2. Update Local (Supabase handled by parent)
        setSelectedClient(updatedClient);
        onUpdateClient(updatedClient);
        setEditingPetId(null);
        onLog('Editar Pet', `Pet: ${petEditForm.name}, Cliente: ${selectedClient.name}`);
    };

    const handleSaveClient = async () => {
        if (!selectedClient || !editForm.name) return;
        const updatedClient = { ...selectedClient, ...editForm } as Client;

        // 2. Update Local (Supabase handled by parent)
        onUpdateClient(updatedClient);
        setSelectedClient(updatedClient);
        setIsEditing(false);
        onLog('Editar Cliente', `Cliente: ${updatedClient.name}`);
    };

    // Reset visible count when search changes
    useEffect(() => { setVisibleCount(20); }, [searchTerm]);

    const filteredClients = useMemo(() => {
        return clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.pets.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, searchTerm]);

    const visibleClients = useMemo(() => filteredClients.slice(0, visibleCount), [filteredClients, visibleCount]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 300) {
            setVisibleCount(prev => {
                if (prev >= filteredClients.length) return prev;
                return Math.min(prev + 50, filteredClients.length);
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col pt-2">
            <div className="flex flex-col gap-4 flex-shrink-0 bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white/40 shadow-sm">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes & Pets</h2>
                    <button onClick={() => setIsNewClientModalOpen(true)} className="bg-brand-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-brand-700 hover:scale-105 active:scale-95 transition shadow-lg shadow-brand-200 text-xs whitespace-nowrap"><Plus size={16} /> Novo Cadastro</button>
                </div>
                {/* Modal Render */}
                <ClientFormModal
                    isOpen={isNewClientModalOpen}
                    onClose={() => setIsNewClientModalOpen(false)}
                    onSave={(newClient) => {
                        onAddClient(newClient);
                        onLog('Novo Cliente', `Cliente: ${newClient.name}`);
                    }}
                />
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    <input placeholder="Buscar por cliente, telefone ou pet..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white/50 hover:bg-white focus:bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 ring-brand-200 outline-none shadow-inner transition-all placeholder:text-gray-400" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0 px-1" onScroll={handleScroll}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleClients.map((client, index) => (
                        <div key={client.id} onClick={() => setSelectedClient(client)} style={{ animationDelay: `${index * 0.05}s` }} className="cursor-pointer animate-slide-up bg-white/70 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white/50 hover:shadow-glass hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-brand-50/50 rounded-bl-[40px] -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="min-w-0 pr-2">
                                    <h3 className="font-bold text-gray-900 truncate text-lg tracking-tight">{client.name}</h3>

                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-medium bg-white/50 px-2 py-1 rounded-lg w-fit shadow-sm border border-gray-100/50"><Phone size={12} className="text-brand-400" /> {client.phone}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir?')) onDeleteClient(client.id); }} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition shadow-sm bg-white border border-gray-100" title="Excluir Cliente"><Trash2 size={16} /></button>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {client.pets.map(pet => (
                                    <div key={pet.id} className="bg-white p-3 rounded-2xl flex flex-col gap-2 text-sm border border-gray-100 shadow-sm hover:shadow transition group/pet">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs shadow-inner group-hover/pet:scale-110 transition-transform">{pet.name ? pet.name[0] : '?'}</div>
                                            <div className="min-w-0 truncate">
                                                <span className="font-bold text-gray-800 block leading-tight">{pet.name}</span>
                                                <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">{pet.breed}</span>
                                            </div>
                                        </div>
                                        {/* Pet Rating Display */}
                                        {(() => {
                                            const pApps = appointments.filter(a => a.petId === pet.id && a.rating);
                                            if (pApps.length > 0) {
                                                const avg = pApps.reduce((acc, c) => acc + (c.rating || 0), 0) / pApps.length;
                                                const allTags = pApps.flatMap(a => a.ratingTags || []);
                                                const tagCounts: Record<string, number> = {};
                                                allTags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1);
                                                const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

                                                return (
                                                    <div className="pt-2 border-t border-gray-100/50">
                                                        <div className="flex items-center gap-1 mb-1.5">
                                                            <div className="flex text-yellow-400">
                                                                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={10} className={avg >= s ? "fill-current" : "text-gray-200"} />)}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 rounded-full">({pApps.length})</span>
                                                        </div>
                                                        {topTags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {topTags.map(t => <span key={t} className="text-[9px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100 font-bold">{t}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {visibleCount < filteredClients.length && (
                        <div className="col-span-full py-8 text-center pb-32">
                            <button
                                onClick={() => setVisibleCount(prev => Math.min(prev + 50, filteredClients.length))}
                                className="text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-6 py-4 rounded-2xl transition shadow-sm border border-brand-100 hover:shadow-md active:scale-95"
                            >
                                Carregar Mais Clientes ({filteredClients.length - visibleCount} restantes)
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {
                selectedClient && createPortal(
                    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedClient(null)}>
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-scale-up relative ring-1 ring-white/50" onClick={e => e.stopPropagation()}>
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 via-rose-500 to-purple-600" />

                            <div className="p-8">
                                {!isEditing ? (
                                    <>
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">{selectedClient!.name}</h2>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-brand-100">Cliente</span>
                                                    <span className="text-xs text-gray-400 font-medium font-mono">#{selectedClient!.id.slice(-4)}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedClient(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all shadow-sm"><X size={20} /></button>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100/50"><Phone size={22} className="drop-shadow-sm" /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Telefone</p>
                                                    <p className="text-lg font-bold text-gray-800">{selectedClient!.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm border border-purple-100/50"><MapPin size={22} className="drop-shadow-sm" /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Endereço</p>
                                                    <p className="font-bold text-gray-800 leading-tight">{selectedClient!.address || 'Não informado'}</p>
                                                    {selectedClient!.complement && <p className="text-sm text-gray-500 mt-1 font-medium">{selectedClient!.complement}</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 mb-8">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <PawPrint size={14} /> Pets ({selectedClient!.pets.length})
                                            </h3>
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                {selectedClient!.pets.map(pet => (
                                                    <div key={pet.id} className="relative">
                                                        {editingPetId === pet.id ? (
                                                            <div className="bg-white p-4 rounded-2xl border-2 border-brand-200 shadow-md space-y-3 animate-fade-in relative z-20">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <h4 className="font-bold text-gray-800 text-sm">Editar Pet</h4>
                                                                    <button onClick={() => setEditingPetId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="col-span-2">
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Nome</label>
                                                                        <input value={petEditForm.name || ''} onChange={e => setPetEditForm({ ...petEditForm, name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm font-bold text-gray-800" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Raça</label>
                                                                        <input value={petEditForm.breed || ''} onChange={e => setPetEditForm({ ...petEditForm, breed: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Idade</label>
                                                                        <input value={petEditForm.age || ''} onChange={e => setPetEditForm({ ...petEditForm, age: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm" placeholder="Ex: 2 anos" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Porte</label>
                                                                        <select value={petEditForm.size || ''} onChange={e => setPetEditForm({ ...petEditForm, size: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm">
                                                                            <option value="Pequeno">Pequeno</option>
                                                                            <option value="Médio">Médio</option>
                                                                            <option value="Grande">Grande</option>
                                                                            <option value="Gigante">Gigante</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Pelagem</label>
                                                                        <select value={petEditForm.coat || ''} onChange={e => setPetEditForm({ ...petEditForm, coat: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm">
                                                                            <option value="Curta">Curta</option>
                                                                            <option value="Média">Média</option>
                                                                            <option value="Longa">Longa</option>
                                                                            <option value="Dupla">Dupla</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Sexo</label>
                                                                        <select value={petEditForm.gender || ''} onChange={e => setPetEditForm({ ...petEditForm, gender: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm">
                                                                            <option value="">Selecione</option>
                                                                            <option value="Macho">Macho</option>
                                                                            <option value="Fêmea">Fêmea</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Obs</label>
                                                                        <textarea rows={2} value={petEditForm.notes || ''} onChange={e => setPetEditForm({ ...petEditForm, notes: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm resize-none" />
                                                                    </div>
                                                                </div>
                                                                <button onClick={handleSavePet} className="w-full py-2 bg-brand-600 text-white font-bold rounded-xl mt-2 hover:bg-brand-700 shadow-sm flex justify-center items-center gap-2"><Check size={16} /> Salvar Pet</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-start gap-3 p-3 bg-white border border-gray-100/80 rounded-2xl shadow-sm hover:shadow-md transition-all group/item">
                                                                <div className="w-10 h-10 bg-gradient-to-br from-brand-50 to-white text-brand-600 rounded-xl flex items-center justify-center font-black text-base border border-brand-100 shadow-inner flex-shrink-0">{pet.name[0]}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="font-bold text-gray-800 text-base leading-tight">{pet.name}</p>
                                                                        <button onClick={() => startEditingPet(pet)} className="text-gray-300 hover:text-brand-500 transition-colors p-1"><Settings size={16} /></button>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 font-medium">
                                                                        <span>{pet.breed}</span>
                                                                        {pet.age && <span className="flex items-center gap-0.5"><Clock size={10} /> {pet.age}</span>}
                                                                        {pet.size && <span className="flex items-center gap-0.5"><Activity size={10} /> {pet.size}</span>}
                                                                        {pet.coat && <span>Pelagem {pet.coat}</span>}
                                                                        {pet.gender && <span>{pet.gender === 'Macho' ? '♂️' : '♀️'}</span>}
                                                                    </div>
                                                                    {pet.notes && <p className="text-[11px] text-orange-600 bg-orange-50 px-2 py-1 rounded-md mt-2 border border-orange-100/50 italic leading-snug">{pet.notes}</p>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={startEditing}
                                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-gray-200 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Edit2 size={20} /> Editar Cliente
                                        </button>
                                    </>
                                ) : (
                                    <div className="animate-fade-in">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Editar Cadastro</h2>
                                            <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100"><X size={20} /></button>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Nome Completo</label>
                                                <input
                                                    value={editForm.name || ''}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    className="w-full bg-gray-50 border-none p-4 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Telefone (Visualizar)</label>
                                                <input
                                                    value={editForm.phone || ''}
                                                    disabled
                                                    className="w-full bg-gray-100 border-none p-4 rounded-xl text-base font-bold text-gray-500 cursor-not-allowed"
                                                    title="Para alterar o telefone, contate o suporte ou recadastre."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Endereço</label>
                                                <input
                                                    value={editForm.address || ''}
                                                    onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                                    className="w-full bg-gray-50 border-none p-4 rounded-xl text-base font-medium text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Complemento</label>
                                                <input
                                                    value={editForm.complement || ''}
                                                    onChange={e => setEditForm({ ...editForm, complement: e.target.value })}
                                                    className="w-full bg-gray-50 border-none p-4 rounded-xl text-base font-medium text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveClient}
                                            className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-200 hover:bg-brand-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Check size={20} /> Salvar Alterações
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div>
    );
};
