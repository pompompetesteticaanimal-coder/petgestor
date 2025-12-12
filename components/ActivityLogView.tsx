import React from 'react';
import { ActivityLog } from '../types';
import { ArrowLeft, Clock, Monitor, Smartphone, User, FileText, Search } from 'lucide-react';

interface ActivityLogViewProps {
    logs: ActivityLog[];
    onBack: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ logs, onBack }) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredLogs = logs.filter(log =>
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getDeviceIcon = (device?: string) => {
        if (!device) return <Monitor size={14} />;
        if (device.includes('Mobile') || device.includes('Android') || device.includes('iPhone')) return <Smartphone size={14} />;
        return <Monitor size={14} />;
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="bg-white p-4 shadow-sm border-b border-gray-200 z-10 sticky top-0">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Histórico de Atividades</h1>
                        <p className="text-xs text-gray-500">Registro de ações no sistema</p>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por usuário, ação ou detalhes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-xl focus:ring-2 ring-brand-200 outline-none text-sm"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <FileText size={48} className="mx-auto mb-2 opacity-50" />
                        <p>Nenhum registro encontrado.</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-gray-800 text-sm">{log.action}</span>
                                <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Clock size={10} />
                                    {new Date(log.date).toLocaleString('pt-BR')}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100/50">
                                {log.details}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                                <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                                    <User size={12} />
                                    {log.user}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400" title={log.device}>
                                    {getDeviceIcon(log.device)}
                                    <span className="max-w-[150px] truncate">{log.device || 'Desconhecido'}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
