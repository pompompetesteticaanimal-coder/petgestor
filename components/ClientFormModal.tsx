import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, Trash2, PawPrint } from 'lucide-react';
import { Client, Pet } from '../types';

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Client) => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({ isOpen, onClose, onSave }) => {
    // Client State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [complement, setComplement] = useState('');

    // Pet State (Array)
    const [pets, setPets] = useState<Partial<Pet>[]>([{ id: `temp_${Date.now()}`, name: '', breed: '', size: 'Pequeno', coat: 'Curta' }]);

    const handleAddPet = () => {
        setPets([...pets, { id: `temp_${Date.now()}_${Math.random()}`, name: '', breed: '', size: 'Pequeno', coat: 'Curta' }]);
    };

    const handleRemovePet = (index: number) => {
        if (pets.length === 1) return alert("É necessário cadastrar pelo menos um pet.");
        const newPets = [...pets];
        newPets.splice(index, 1);
        setPets(newPets);
    };

    const updatePet = (index: number, field: keyof Pet, value: string) => {
        const newPets = [...pets];
        newPets[index] = { ...newPets[index], [field]: value };
        setPets(newPets);
    };

    const handleSave = () => {
        if (!name || !phone) return alert("Nome e Telefone são obrigatórios.");
        if (pets.some(p => !p.name)) return alert("Todos os pets precisam de um nome.");

        const newClient: Client = {
            id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name,
            phone,
            address,
            complement,
            createdAt: new Date().toISOString(),
            pets: pets.map(p => ({
                id: p.id!.startsWith('temp_') ? `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : p.id!,
                name: p.name!,
                breed: p.breed || 'SRD',
                age: p.age || '',
                gender: p.gender || 'Macho',
                size: p.size || 'Pequeno',
                coat: p.coat || 'Curta',
                notes: p.notes || ''
            }))
        };

        onSave(newClient);
        onClose();
        // Reset form
        setName(''); setPhone(''); setAddress(''); setComplement('');
        setPets([{ id: `temp_${Date.now()}`, name: '', breed: '', size: 'Pequeno', coat: 'Curta' }]);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up ring-1 ring-white/50" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Novo Cliente</h2>
                        <p className="text-sm text-gray-400 font-medium mt-0.5">Preencha os dados do tutor e seus pets</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 space-y-8 custom-scrollbar">

                    {/* Client Section */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100/80">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-black">1</span>
                            Dados do Tutor
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Nome Completo *</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" placeholder="Ex: Maria Silva" />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Telefone / WhatsApp *</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" placeholder="(00) 00000-0000" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Endereço</label>
                                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" placeholder="Rua, Número, Bairro" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Complemento</label>
                                <input value={complement} onChange={e => setComplement(e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" placeholder="Apto 102, Bloco C..." />
                            </div>
                        </div>
                    </div>

                    {/* Pets Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-black">2</span>
                                Pets ({pets.length})
                            </h3>
                            <button onClick={handleAddPet} className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                <Plus size={14} /> Adicionar Pet
                            </button>
                        </div>

                        <div className="space-y-4">
                            {pets.map((pet, index) => (
                                <div key={pet.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100/80 relative group animate-fade-in">
                                    {pets.length > 1 && (
                                        <button onClick={() => handleRemovePet(index)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Nome do Pet *</label>
                                            <div className="relative">
                                                <PawPrint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                                <input value={pet.name} onChange={e => updatePet(index, 'name', e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-none rounded-xl font-bold text-gray-800 focus:ring-2 ring-purple-200 outline-none transition-all" placeholder="Nome do Pet" />
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Raça</label>
                                            <input value={pet.breed} onChange={e => updatePet(index, 'breed', e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-800 focus:ring-2 ring-purple-200 outline-none transition-all" placeholder="Ex: Shih-tzu" />
                                        </div>

                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Porte</label>
                                            <select value={pet.size} onChange={e => updatePet(index, 'size', e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-700 outline-none focus:ring-2 ring-purple-200 cursor-pointer">
                                                <option value="Pequeno">Pequeno</option>
                                                <option value="Médio">Médio</option>
                                                <option value="Grande">Grande</option>
                                                <option value="Gigante">Gigante</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Pelagem</label>
                                            <select value={pet.coat} onChange={e => updatePet(index, 'coat', e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-700 outline-none focus:ring-2 ring-purple-200 cursor-pointer">
                                                <option value="Curta">Curta</option>
                                                <option value="Média">Média</option>
                                                <option value="Longa">Longa</option>
                                                <option value="Dupla">Dupla</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Sexo</label>
                                            <select value={pet.gender} onChange={e => updatePet(index, 'gender', e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-700 outline-none focus:ring-2 ring-purple-200 cursor-pointer">
                                                <option value="Macho">Macho</option>
                                                <option value="Fêmea">Fêmea</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Idade</label>
                                            <input value={pet.age} onChange={e => updatePet(index, 'age', e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-800 focus:ring-2 ring-purple-200 outline-none transition-all" placeholder="Ex: 2 anos" />
                                        </div>

                                        <div className="col-span-2 md:col-span-4">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 ml-1 mb-1 block">Observações (Alergias, Comportamento...)</label>
                                            <textarea rows={2} value={pet.notes} onChange={e => updatePet(index, 'notes', e.target.value)} className="w-full bg-gray-50 border-none p-3.5 rounded-xl font-medium text-gray-800 focus:ring-2 ring-purple-200 outline-none transition-all resize-none" placeholder="Opcional" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
                    <button onClick={onClose} className="px-8 py-4 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-xl shadow-brand-200 hover:shadow-brand-300 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                        <Check size={20} strokeWidth={3} /> Salvar Cadastro
                    </button>
                </div>
            </div>
        </div>
    );
};
