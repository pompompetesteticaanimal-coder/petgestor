
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit2, PawPrint } from 'lucide-react';
import { Service } from '../types';
import { supabaseService } from '../services/supabaseService';
import { db } from '../services/db';

interface ServiceManagerProps {
    services: Service[];
    onAddService: (s: Service) => void;
    onDeleteService: (id: string) => void;
    onSyncServices: (silent: boolean) => void; // Kept for interface compatibility but can be ignored
}

export const ServiceManager: React.FC<ServiceManagerProps> = ({ services, onAddService, onDeleteService }) => {
    console.log("ServiceManager Rendering", { servicesCount: services?.length });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, service: Service } | null>(null);
    const [viewService, setViewService] = useState<Service | null>(null);

    const resetForm = () => {
        setFormData({ name: '', price: '', category: 'principal', size: 'Todos', coat: 'Todos' });
        setEditingService(null);
        setIsModalOpen(false);
    };

    const handleEditStart = (s: Service) => {
        setEditingService(s);
        setFormData({
            name: s.name || '',
            price: (s.price || 0).toString(),
            category: s.category || 'principal',
            size: s.targetSize || 'Todos',
            coat: s.targetCoat || 'Todos'
        });
        setIsModalOpen(true);
        setContextMenu(null);
    };

    const handleSave = async () => {
        // Safe parsing
        const priceString = formData.price.replace(',', '.');
        const priceNum = parseFloat(priceString) || 0;

        const newService: Service = {
            id: editingService ? editingService.id : crypto.randomUUID(),
            name: formData.name || 'Novo Serviço', // Default name
            price: priceNum,
            category: (formData.category as 'principal' | 'adicional') || 'principal',
            targetSize: formData.size || 'Todos',
            targetCoat: formData.coat || 'Todos',
            description: editingService?.description || '',
            durationMin: editingService?.durationMin || 30
        };

        // Optimistic Update via props (Parent updates local state)
        onAddService(newService);

        // Explicit Database Save
        try {
            await supabaseService.upsertService(newService);
        } catch (error) {
            console.error("Failed to save service to Supabase:", error);
            // Optionally revert local state here if strict consistency is needed
        }

        resetForm();
    };

    const handleDelete = async (service: Service) => {
        if (!confirm(`Excluir ${service.name}?`)) return;
        setContextMenu(null);

        // Optimistic Delete
        onDeleteService(service.id);

        try {
            await supabaseService.deleteService(service.id);
        } catch (error) {
            console.error("Failed to delete service:", error);
        }
    };

    const handleCleanupDuplicates = async () => {
        const uniqueNames = new Set<string>();
        const duplicates: Service[] = [];

        (services || []).forEach(s => {
            if (!s || !s.name) return;
            const normalized = String(s.name).trim().toLowerCase();
            if (uniqueNames.has(normalized)) {
                duplicates.push(s);
            } else {
                uniqueNames.add(normalized);
            }
        });

        if (duplicates.length === 0) return alert("Nenhum serviço duplicado encontrado.");
        if (!confirm(`Encontrei ${duplicates.length} serviços duplicados. Deseja excluir as cópias extras automaticamente?`)) return;

        let deletedCount = 0;
        for (const service of duplicates) {
            // Sequential delete to handle potential race conditions or errors
            onDeleteService(service.id); // Local
            await supabaseService.deleteService(service.id); // Remote
            deletedCount++;
        }
        alert(`${deletedCount} serviços duplicados foram removidos.`);
    };

    return (
        <div className="space-y-6 animate-fade-in relative pt-2" onClick={() => setContextMenu(null)}>
            <div className="sticky top-0 z-20 flex justify-between items-center bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white/40 shadow-sm flex-shrink-0 mb-4 transition-all">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Serviços</h2>
                <div className="flex gap-3">
                    <button onClick={handleCleanupDuplicates} className="bg-white text-red-500 border border-red-100 px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs hover:bg-red-50 shadow-sm transition">
                        <Trash2 size={14} /> <span className="hidden md:inline">Remover Duplicados</span>
                    </button>
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-xs hover:bg-brand-700 shadow-lg shadow-brand-200 hover:scale-105 active:scale-95 transition">
                        <Plus size={16} /> Adicionar
                    </button>
                </div>
            </div>

            <div className="px-1">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="animate-slide-up bg-white/80 backdrop-blur p-5 rounded-[2rem] shadow-sm border border-white/60 flex flex-col justify-center items-center cursor-pointer btn-spring hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden min-h-[160px]">
                        <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-2 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <Plus size={24} />
                        </div>
                        <span className="font-bold text-gray-700 group-hover:text-brand-600 transition-colors">Novo Serviço</span>
                    </button>

                    {(services || []).filter(s => s && s.id).map((service, index) => (
                        <div
                            key={service.id}
                            onClick={() => setViewService(service)}
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, service }); }}
                            className="animate-slide-up bg-white/80 backdrop-blur p-5 rounded-[2rem] shadow-sm border border-white/60 flex flex-col justify-between cursor-pointer btn-spring hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden min-h-[160px]"
                        >
                            <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 text-brand-500">
                                <PawPrint size={80} />
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-brand-500 btn-spring" title="Editar Rápido">
                                    <Edit2 size={12} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-base truncate pr-6 tracking-tight">{service.name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`text-[9px] px-2 py-1 rounded-lg uppercase font-bold tracking-wide ${service.category === 'principal' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {service.category === 'principal' ? 'PRINC' : 'ADIC'}
                                    </span>
                                    <span className="text-[9px] bg-gray-100 px-2 py-1 rounded-lg text-gray-500 font-medium border border-gray-100">{service.targetSize}</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-100/50 pt-3 flex justify-between items-end">
                                <span className="text-xl font-black text-gray-900 tracking-tight">R$ {(Number(service.price) || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Service Details Modal */}
            {viewService && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setViewService(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{viewService.name}</h2>
                            <p className="text-gray-500 text-sm mb-4">{viewService.description || 'Sem descrição.'}</p>

                            <div className="flex gap-2 mb-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewService.category === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{viewService.category}</span>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 uppercase">{viewService.targetSize}</span>
                            </div>

                            <div className="flex justify-between items-center mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <span className="block text-xs uppercase font-bold text-gray-400">Preço</span>
                                    <span className="text-xl font-black text-gray-900">R$ {(Number(viewService.price) || 0).toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs uppercase font-bold text-gray-400">Tempo</span>
                                    <span className="text-xl font-black text-gray-900">{viewService.durationMin} min</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setViewService(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-transform">Fechar</button>
                                <button onClick={() => {
                                    handleDelete(viewService);
                                    setViewService(null);
                                }} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Trash2 size={16} /> Excluir
                                </button>
                                <button onClick={() => {
                                    handleEditStart(viewService);
                                    setViewService(null);
                                }} className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                                    <Edit2 size={16} /> Editar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {contextMenu && (
                <div className="fixed bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl z-[100] py-2 min-w-[170px] animate-scale-up glass-card" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => handleEditStart(contextMenu.service)} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-gray-700 text-sm flex items-center gap-3 font-medium transition-colors"><Edit2 size={16} className="text-gray-400" /> Editar</button>
                    <button onClick={() => handleDelete(contextMenu.service)} className="w-full text-left px-5 py-3 hover:bg-red-50 text-red-600 text-sm flex items-center gap-3 font-medium"><Trash2 size={16} /> Excluir</button>
                </div>
            )}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl space-y-6 animate-scale-up relative overflow-hidden ring-1 ring-white/50">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-400 to-purple-500" />
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Gerenciar Serviço</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Nome do Serviço</label><input placeholder="Ex: Banho Premium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 border-none p-4 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all placeholder:font-normal" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Preço (R$)</label><input placeholder="0,00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-gray-50 border-none p-4 rounded-xl text-lg font-bold text-gray-800 focus:ring-2 ring-brand-200 outline-none transition-all" /></div>
                                <div><label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Categoria</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-gray-50 border-none p-4 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 ring-brand-200 outline-none transition-all appearance-none"><option value="principal">Principal</option><option value="adicional">Adicional</option></select></div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100">
                            <button onClick={resetForm} className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-200 hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all">Salvar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
