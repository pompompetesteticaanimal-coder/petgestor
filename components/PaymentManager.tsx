import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Eye, EyeOff, Download, ChevronLeft, ChevronRight, ChevronDown,
    Search, Edit2, X, Loader2, Calendar, DollarSign, Trash2,
    Clock, CheckCircle, Star
} from 'lucide-react';
import { Appointment, Client, Service, Pet } from '../types';
import { parseDateLocal, formatDateWithWeek } from '../utils/dateHelpers';
import { EvaluationModal } from './EvaluationModal';

interface PaymentManagerProps {
    appointments: Appointment[];
    clients: Client[];
    services: Service[];
    onUpdateAppointment: (app: Appointment) => void;
    onRemovePayment: (app: Appointment) => void;
    onNoShow: (app: Appointment) => void;
    onViewPet?: (pet: Pet, client: Client) => void;
    onLog: (action: string, details: string) => void;
    onReschedule: (app: Appointment, date: string) => void;

    // New Props for Integration
    selectedDate?: string; // Controlled date (ISO YYYY-MM-DD)
    onDateChange?: (date: string) => void; // Callback when date changes
    hideHeader?: boolean; // Hide the main header/date picker if parent handles it
    hidePrivacyToggle?: boolean; // Optional control
    hideCsvExport?: boolean; // Optional control
}

// Helper duplicated from App.tsx - ideally should be in a shared util
const calculateTotal = (app: Appointment, services: Service[]) => {
    const mainSvc = services.find(s => s.id === app.serviceId);
    const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter((x): x is Service => !!x) || [];
    return (mainSvc?.price || 0) + addSvcs.reduce((acc, s) => acc + (s.price || 0), 0);
};

export const PaymentManager: React.FC<PaymentManagerProps> = ({
    appointments, clients, services,
    onUpdateAppointment, onRemovePayment, onNoShow,
    onViewPet, onLog, onReschedule,
    selectedDate: controlledDate,
    onDateChange,
    hideHeader = false,
    hidePrivacyToggle = false,
    hideCsvExport = false
}) => {
    // Local State
    const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(() => {
        return localStorage.getItem('payment_privacy_enabled') === 'true';
    });

    const getLocalISODate = (d: Date = new Date()) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Use controlled date if provided, otherwise local state
    const [internalDate, setInternalDate] = useState(getLocalISODate());
    const selectedDate = controlledDate ?? internalDate;

    // Helper to update date
    const handleDateChange = (newDate: string) => {
        if (onDateChange) {
            onDateChange(newDate);
        } else {
            setInternalDate(newDate);
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'toReceive' | 'pending' | 'paid' | 'noShow'>('toReceive');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, app: Appointment } | null>(null);
    const [showEvaluationModal, setShowEvaluationModal] = useState(false);
    const [evaluatingApp, setEvaluatingApp] = useState<Appointment | null>(null);
    const [reschedulingId, setReschedulingId] = useState<string | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const touchStart = useRef<number | null>(null);

    const verifyBiometrics = async (): Promise<boolean> => {
        try {
            if (!window.PublicKeyCredential) {
                console.warn('WebAuthn not supported');
                return true;
            }
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const options: CredentialCreationOptions = {
                publicKey: {
                    challenge,
                    rp: { name: "PetGestor" },
                    user: {
                        id: new Uint8Array(16),
                        name: "user@petgestor",
                        displayName: "User"
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            };
            await navigator.credentials.create(options);
            return true;
        } catch (err) {
            console.error('Biometric verification failed:', err);
            return false;
        }
    };

    const togglePrivacy = async () => {
        if (isPrivacyEnabled) {
            const success = await verifyBiometrics();
            if (success) {
                setIsPrivacyEnabled(false);
                localStorage.setItem('payment_privacy_enabled', 'false');
            }
        } else {
            setIsPrivacyEnabled(true);
            localStorage.setItem('payment_privacy_enabled', 'true');
        }
    };

    const exportToCSV = () => {
        if (!dailyApps || dailyApps.length === 0) {
            alert("Não há dados para exportar nesta data.");
            return;
        }

        const headers = ["Data", "Cliente", "Pet", "Serviço", "Valor Esperado", "Valor Pago", "Método", "Status", "Observações"];
        const rows = dailyApps.map(app => {
            const client = clients.find(c => c.id === app.clientId);
            const pet = client?.pets.find(p => p.id === app.petId);
            const mainSvc = services.find(s => s.id === app.serviceId);
            const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).map(s => s?.name).join(', ') || '';
            const serviceName = mainSvc?.name + (addSvcs ? ` + ${addSvcs}` : '');

            const expected = calculateExpected(app).toFixed(2).replace('.', ',');
            const paid = app.paidAmount ? app.paidAmount.toFixed(2).replace('.', ',') : '0,00';
            const status = app.status === 'nao_veio' ? 'Não Veio' : (app.paidAmount ? 'Pago' : 'Pendente');

            return [
                parseDateLocal(app.date).toLocaleDateString('pt-BR'),
                client?.name || 'N/A',
                pet?.name || 'N/A',
                serviceName,
                expected,
                paid,
                app.paymentMethod || '',
                status,
                `"${(app.notes || '').replace(/"/g, '""')}"`
            ].join(';');
        });

        const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pagamentos_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filters
    const dailyApps = useMemo(() => appointments.filter(a => {
        if (!a.date || a.status === 'cancelado') return false;
        const appDate = parseDateLocal(a.date);
        const selDate = parseDateLocal(selectedDate);
        return appDate.getFullYear() === selDate.getFullYear() &&
            appDate.getMonth() === selDate.getMonth() &&
            appDate.getDate() === selDate.getDate();
    }), [appointments, selectedDate]);

    const noShowApps = useMemo(() => dailyApps.filter(a => a.status === 'nao_veio'), [dailyApps]);
    const toReceiveApps = useMemo(() => dailyApps.filter(a => (!a.paymentMethod || a.paymentMethod.trim() === '') && a.status !== 'nao_veio'), [dailyApps]);
    const paidApps = useMemo(() => dailyApps.filter(a => a.paymentMethod && a.paymentMethod.trim() !== ''), [dailyApps]);
    const pendingApps = useMemo(() => appointments.filter(a => {
        if (!a.date || a.status === 'cancelado' || a.status === 'nao_veio') return false;
        const appDate = parseDateLocal(a.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = appDate < today;
        const isUnpaid = (!a.paymentMethod || a.paymentMethod.trim() === '');
        return isPast && isUnpaid;
    }).sort((a, b) => b.date.localeCompare(a.date)), [appointments]);

    const navigateDate = (days: number) => {
        setSlideDirection(days > 0 ? 'right' : 'left');
        const [year, month, day] = selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + days);
        handleDateChange(getLocalISODate(date));
    };

    const goToToday = () => {
        setSlideDirection(null);
        handleDateChange(getLocalISODate());
    };

    const calculateExpected = (app: Appointment) => calculateTotal(app, services);

    const handleStartEdit = (app: Appointment) => {
        setEditingId(app.id);
        const expected = calculateExpected(app);
        setAmount(app.paidAmount ? app.paidAmount.toString() : expected.toString());
        setMethod(app.paymentMethod || 'Credito');
        setContextMenu(null);
    };

    const handleSave = async (app: Appointment) => {
        setIsSaving(true);
        const finalAmount = parseFloat(amount);
        const updatedApp: Appointment = {
            ...app,
            paidAmount: finalAmount,
            paymentMethod: method as any,
            paymentStatus: (finalAmount > 0 || method) ? 'paid' : 'pending'
        };

        onUpdateAppointment(updatedApp);
        setEditingId(null);
        setIsSaving(false);
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        onLog('Registrar Pagamento', `Valor: ${finalAmount}, Método: ${method}, Pet: ${pet?.name}`);

        setEvaluatingApp(updatedApp);
        setShowEvaluationModal(true);
    };

    const handleEvaluationSave = async (rating: number, tags: string[], extraNotes: string) => {
        if (!evaluatingApp) return;
        const ratingString = `[Avaliação: ${rating}/5]`;
        const tagString = tags.length > 0 ? `[Tags: ${tags.join(', ')}]` : '';
        const noteString = extraNotes ? `[Obs: ${extraNotes}]` : '';
        const fullNote = `${evaluatingApp.notes || ''} ${ratingString} ${tagString} ${noteString}`.trim();

        const finalApp = { ...evaluatingApp, rating, ratingTags: tags, notes: fullNote };
        onUpdateAppointment(finalApp);

        setEvaluatingApp(null);
        setShowEvaluationModal(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => touchStart.current = e.touches[0].clientX;
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 100) navigateDate(diff > 0 ? 1 : -1);
        touchStart.current = null;
    };

    const animationClass = slideDirection === 'right' ? 'animate-slide-right' : slideDirection === 'left' ? 'animate-slide-left' : '';

    const handleStartReschedule = (app: Appointment) => {
        setReschedulingId(app.id);
        setRescheduleDate(new Date().toISOString().substring(0, 16));
    };

    const confirmReschedule = () => {
        if (!reschedulingId || !rescheduleDate) return;
        const app = appointments.find(a => a.id === reschedulingId);
        if (app) {
            onReschedule(app, rescheduleDate);
            setReschedulingId(null);
        }
    };

    const renderPaymentRow = (app: Appointment, statusColor: string, index: number) => {
        const client = clients.find(c => c.id === app.clientId);
        const pet = client?.pets.find(p => p.id === app.petId);
        const mainSvc = services.find(srv => srv.id === app.serviceId);
        const addSvcs = app.additionalServiceIds?.map(id => services.find(s => s.id === id)).filter((x): x is Service => !!x) || [];
        const expected = calculateExpected(app);
        const isPaid = (!!app.paidAmount && !!app.paidAmount) || (!!app.paymentMethod && app.paymentStatus === 'paid');
        const isNoShow = app.status === 'nao_veio';
        const allServiceNames = [mainSvc?.name, ...addSvcs.map(s => s.name)].filter(n => n).join(' ').toLowerCase();
        let serviceBorderColor = 'border-l-sky-400';
        if (allServiceNames.includes('tesoura')) serviceBorderColor = 'border-l-pink-500';
        else if (allServiceNames.includes('tosa normal')) serviceBorderColor = 'border-l-orange-500';
        else if (allServiceNames.includes('higi')) serviceBorderColor = 'border-l-yellow-500';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('mensal')) serviceBorderColor = 'border-l-purple-500';
        else if (allServiceNames.includes('pacote') && allServiceNames.includes('quinzenal')) serviceBorderColor = 'border-l-indigo-500';


        return (
            <div key={app.id} style={{ animationDelay: `${index * 0.05}s` }} className={`animate-slide-up p-5 rounded-3xl shadow-sm hover:shadow-glass hover:-translate-y-0.5 transition-all duration-300 border border-white/60 bg-white/60 backdrop-blur-md mb-3 relative overflow-hidden group ${statusColor}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${serviceBorderColor.replace('border-l-', 'bg-')} opacity-80 rounded-l-3xl`} />
                <div className="flex justify-between items-start mb-3 pl-3">
                    <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                            <div
                                className="text-lg font-bold text-gray-900 truncate tracking-tight cursor-pointer hover:text-brand-600 transition-colors flex items-center gap-2"
                                onClick={() => pet && client && onViewPet?.(pet, client)}
                            >
                                {pet?.name}
                                {(() => {
                                    const pApps = appointments.filter(a => a.petId === pet?.id && a.rating);
                                    if (pApps.length > 0) {
                                        const avg = pApps.reduce((acc, c) => acc + (c.rating || 0), 0) / pApps.length;
                                        return (
                                            <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                                                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                                <span className="text-[9px] font-bold text-yellow-700">{avg.toFixed(1)}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            {isPaid && <div className="bg-green-100 text-green-700 p-1 rounded-full"><CheckCircle size={12} /></div>}
                        </div>
                        <div className="text-xs font-medium text-gray-500 truncate mt-0.5">{client?.name}</div>
                        <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1.5 font-mono bg-white/50 w-fit px-2 py-1 rounded-lg"> <Clock size={12} className="text-brand-400" /> {app.date.split('T')[1].substring(0, 5)} </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-gray-800 tracking-tight">
                            {isPrivacyEnabled ? 'R$ ••••' : `R$ ${expected.toFixed(2)}`}
                        </div>
                        {isPaid ? (<div className="inline-flex items-center gap-1 mt-1 bg-white/80 text-green-700 border border-green-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shadow-sm"> {app.paymentMethod} </div>) :
                            isNoShow ? (<div className="inline-flex items-center gap-1 mt-1 bg-white/80 text-gray-500 border border-gray-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shadow-sm"> Não Veio </div>) :
                                (<div className="inline-flex items-center gap-1 mt-1 bg-white/80 text-red-500 border border-red-100 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shadow-sm"> Pendente </div>)}
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4 pl-3 opacity-80 group-hover:opacity-100 transition-opacity">
                    {mainSvc && <span className="text-[10px] bg-white border border-gray-200/60 px-2 py-1 rounded-lg text-gray-600 font-medium shadow-sm">{mainSvc.name}</span>}
                    {addSvcs.map((s, idx) => (<span key={idx} className="text-[10px] bg-white border border-gray-200/60 px-2 py-1 rounded-lg text-gray-600 font-medium shadow-sm">{s.name}</span>))}
                </div>
                <div className="flex gap-2 ml-1">
                    {isNoShow ? (
                        <button onClick={() => handleStartReschedule(app)} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-md active:scale-95"> <Calendar size={14} /> Reagendar </button>
                    ) : (
                        <>
                            <button onClick={() => handleStartEdit(app)} className="flex-1 bg-white hover:bg-gray-50 text-gray-600 hover:text-brand-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all border border-gray-100 shadow-sm group-hover:shadow-md active:scale-95"> <DollarSign size={14} /> {isPaid ? 'Editar Detalhes' : 'Registrar Pagamento'} </button>
                            {isPaid && (
                                <button onClick={() => onRemovePayment(app)} className="px-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center font-bold text-xs transition-all border border-red-100 active:scale-95 whitespace-nowrap gap-2" title="Desfazer Pagamento">
                                    <Trash2 size={16} /> Desfazer
                                </button>
                            )}
                            {!isPaid && statusColor !== 'bg-gray-100 opacity-75' && (
                                <button onClick={() => onNoShow(app)} className="px-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center font-bold text-xs transition-all border border-red-100 active:scale-95 whitespace-nowrap">Não Veio</button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (<div className="space-y-4 h-full flex flex-col pt-2" onClick={() => setContextMenu(null)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {!hideHeader && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pagamentos</h2>
                    {!hidePrivacyToggle && (
                        <button
                            onClick={togglePrivacy}
                            className={`p-2 rounded-xl transition-all duration-300 ${isPrivacyEnabled ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                            title={isPrivacyEnabled ? "Mostrar valores" : "Ocultar valores"}
                        >
                            {isPrivacyEnabled ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    )}
                    {!hideCsvExport && (
                        <button
                            onClick={exportToCSV}
                            className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-all duration-300"
                            title="Exportar CSV do dia"
                        >
                            <Download size={20} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100 flex-shrink-0">
                    <button onClick={() => navigateDate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-500 transition-all"><ChevronLeft size={18} /></button>
                    <button onClick={goToToday} className="flex-1 px-4 py-2 bg-white text-brand-600 font-bold rounded-xl text-xs shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">Hoje</button>
                    <button onClick={() => navigateDate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-500 transition-all"><ChevronRight size={18} /></button>
                    <div className="relative text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors cursor-pointer min-w-[130px] text-center uppercase tracking-wide border border-transparent hover:border-gray-200 z-50 select-none flex items-center justify-center gap-1" onClick={() => (document.getElementById('payments-date-picker') as HTMLInputElement)?.showPicker()}>
                        <span className="pointer-events-none">{formatDateWithWeek(selectedDate)}</span>
                        <ChevronDown size={12} className="opacity-50 pointer-events-none" />
                        <input
                            id="payments-date-picker"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => { if (e.target.value) handleDateChange(e.target.value); }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-50 appearance-none"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* If header is hidden, we might still want the toolbar buttons (Privacy, Export) somewhere. 
            For now, if hidden, we assume parent handles everything or they are not shown. 
            Let's add a condition: if hideHeader but NOT hidePrivacyToggle/Export, show a mini toolbar? 
            User request says "substituir resumo diario pela pagina de pagamentos". 
            The Payments Page has these buttons in the header. 
            If I integrate into "Resumo", I should probably keep these buttons accessible.
            Let's render a mini-toolbar if hideHeader is true but buttons are enabled.
        */}
        {hideHeader && (!hidePrivacyToggle || !hideCsvExport) && (
            <div className="flex justify-end gap-2 mb-2">
                {!hidePrivacyToggle && (
                    <button
                        onClick={togglePrivacy}
                        className={`p-2 rounded-xl transition-all duration-300 ${isPrivacyEnabled ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                        title={isPrivacyEnabled ? "Mostrar valores" : "Ocultar valores"}
                    >
                        {isPrivacyEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
                {!hideCsvExport && (
                    <button
                        onClick={exportToCSV}
                        className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-all duration-300"
                        title="Exportar CSV do dia"
                    >
                        <Download size={16} />
                    </button>
                )}
            </div>
        )}

        <div className="flex p-1.5 bg-gray-200/50 rounded-2xl overflow-x-auto gap-1">
            <button onClick={() => setActiveTab('toReceive')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'toReceive' ? 'bg-white shadow-md text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">A Receber</span> <span className="text-lg">{toReceiveApps.length}</span> </button>
            <button onClick={() => setActiveTab('pending')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'pending' ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pendentes</span> <span className="text-lg">{pendingApps.length}</span> </button>
            <button onClick={() => setActiveTab('paid')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'paid' ? 'bg-white shadow-md text-green-600' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Pagos</span> <span className="text-lg">{paidApps.length}</span> </button>
            <button onClick={() => setActiveTab('noShow')} className={`flex-1 min-w-[80px] py-3 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'noShow' ? 'bg-white shadow-md text-gray-500' : 'text-gray-500 hover:text-gray-700'}`}> <span className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Não Veio</span> <span className="text-lg">{noShowApps.length}</span> </button>
        </div>

        <div key={selectedDate} className={`flex-1 overflow-y-auto min-h-0 bg-transparent p-1 ${animationClass}`}>
            {activeTab === 'toReceive' && toReceiveApps.map((app, i) => renderPaymentRow(app, "bg-gradient-to-br from-yellow-50 to-white", i))}
            {activeTab === 'pending' && pendingApps.map((app, i) => renderPaymentRow(app, "bg-gradient-to-br from-red-50 to-white", i))}
            {activeTab === 'paid' && paidApps.map((app, i) => renderPaymentRow(app, "bg-gradient-to-br from-green-50 to-white border-green-100", i))}
            {activeTab === 'noShow' && noShowApps.map((app, i) => renderPaymentRow(app, "bg-gray-100 opacity-75", i))}
        </div>

        {contextMenu && (<div className="fixed bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl z-[100] py-2 min-w-[180px] animate-scale-up glass-card" style={{ top: contextMenu.y, left: contextMenu.x }}> <button onClick={() => handleStartEdit(contextMenu.app)} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-gray-700 text-sm flex items-center gap-3 font-medium transition-colors"><Edit2 size={16} className="text-gray-400" /> Editar Valor</button> </div>)}

        {editingId && createPortal((() => { const app = appointments.find(a => a.id === editingId); if (!app) return null; const client = clients.find(c => c.id === app.clientId); const pet = client?.pets.find(p => p.id === app.petId); return (<div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditingId(null)}> <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-up select-none" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center mb-6"> <div><h3 className="text-2xl font-bold text-gray-900">{pet?.name}</h3><span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Pagamento</span></div><button onClick={() => setEditingId(null)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={20} /></button></div> <div className="space-y-4"> <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Valor R$</label><input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-2xl font-black text-gray-800 focus:ring-2 ring-brand-500 outline-none transition-all placeholder:text-gray-300" autoFocus /></div> <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Método</label><div className="grid grid-cols-2 gap-2"> {['Credito', 'Debito', 'Pix', 'Dinheiro'].map(m => (<button key={m} onClick={() => setMethod(m)} className={`p-3 rounded-xl font-bold text-sm transition-all border ${method === m ? 'bg-brand-600 text-white border-brand-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{m}</button>))} </div></div> <button onClick={() => handleSave(app)} disabled={isSaving} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-brand-200 transition-all active:scale-95 mt-2 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : 'Confirmar Pagamento'}</button> </div> </div> </div>) })(), document.body)}

        {showEvaluationModal && evaluatingApp && (
            <EvaluationModal
                isOpen={showEvaluationModal}
                onClose={() => setShowEvaluationModal(false)}
                onSave={handleEvaluationSave}
                clientName={clients.find(c => c.id === evaluatingApp.clientId)?.name}
                petName={clients.find(c => c.id === evaluatingApp.clientId)?.pets.find(p => p.id === evaluatingApp.petId)?.name}
            />
        )}

        {reschedulingId && createPortal(
            <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setReschedulingId(null)}>
                <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Reagendar Pet</h3>
                    <p className="text-sm text-gray-500 mb-4">O agendamento anterior permanecerá como "Não Veio". Selecione a nova data:</p>
                    <input
                        type="datetime-local"
                        value={rescheduleDate}
                        onChange={e => setRescheduleDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl mb-6 focus:ring-2 ring-brand-500 outline-none"
                    />
                    <button onClick={confirmReschedule} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                        Confirmar Reagendamento
                    </button>
                </div>
            </div>,
            document.body
        )}
    </div>)
};
