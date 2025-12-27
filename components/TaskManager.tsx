
import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Loader2, ArrowRight, Circle, CheckCircle, X, LayoutList, Calendar } from 'lucide-react';
import { Task, CostItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { MonthlyExpensesView } from './MonthlyExpensesView';

interface TaskManagerProps {
    onAddCostFromTask?: (task: Task) => void;
    costs?: CostItem[];
    onAddCost?: (cost: CostItem) => void;
    onUpdateCost?: (cost: CostItem) => void;
    onDeleteCost?: (id: string) => void;
    onNavigateToRecords?: (task: Task) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
    onAddCostFromTask,
    costs = [],
    onAddCost = () => { },
    onUpdateCost = () => { },
    onDeleteCost = () => { },
    onNavigateToRecords
}) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'expenses'>('tasks');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>('Outros');
    const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Média');

    // Cost Confirmation Popup State
    const [costConfirmationTask, setCostConfirmationTask] = useState<Task | null>(null);

    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    // Load from Supabase on Mount
    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setIsLoading(true);
        if (supabase) {
            const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                const mapped = data.map((d: any) => ({
                    ...d,
                    createdAt: d.created_at || d.createdAt,
                    // Map new fields if they exist in DB, otherwise undefined
                    amount: d.amount,
                    dueDate: d.due_date || d.dueDate,
                    isBill: d.is_bill || d.isBill,
                    recurrence: d.recurrence
                }));
                setTasks(mapped);
            }
        }
        setIsLoading(false);
    };

    const handleAddTask = async (taskOverride?: Task) => {
        // If taskOverride is provided (from MonthlyExpensesView), use it.
        // Otherwise use the local state (Regular Task)

        let newTask: Task;

        if (taskOverride) {
            newTask = taskOverride;
        } else {
            if (!newTaskTitle.trim()) return;
            newTask = {
                id: `task_${Date.now()}`,
                title: newTaskTitle,
                category: newTaskCategory,
                priority: newTaskPriority,
                completed: false,
                createdAt: new Date().toISOString(),
                isBill: false
            };
        }

        setTasks([newTask, ...tasks]);

        // Reset local form if used
        if (!taskOverride) {
            setNewTaskTitle('');
            setIsModalOpen(false);
        }

        if (supabase) {
            const dbTask = {
                title: newTask.title,
                category: newTask.category,
                priority: newTask.priority,
                completed: false,
                amount: newTask.amount,
                due_date: newTask.dueDate,
                is_bill: newTask.isBill,
                recurrence: newTask.recurrence
            };
            await supabase.from('tasks').insert([dbTask]);
            loadTasks(); // Reload to get IDs/consistent state
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean, task: Task) => {
        const newStatus = !currentStatus;
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));

        if (supabase) {
            await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
        }

        // Only ask to register cost if it's a regular task and being completed
        if (newStatus === true && !task.isBill) {
            const isPurchase = task.category === 'Estoque' || task.category === 'Manutenção' || task.title.toLowerCase().includes('comprar') || task.title.toLowerCase().includes('pagar');

            if (isPurchase) {
                setCostConfirmationTask(task);
            }
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        setTasks(tasks.filter(t => t.id !== id));
        if (supabase) {
            await supabase.from('tasks').delete().eq('id', id);
        }
    };

    // Filter Logic for Regular Tasks
    const relevantCategories = ['Administrativo', 'Estoque', 'Manutenção', 'Equipe', 'Outros', 'Limpeza'];
    // IMPORTANT: Exclude bills from the regular task list
    const regularTasks = tasks.filter(t => !t.isBill);

    const filteredTasks = regularTasks.filter(t => {
        if (!relevantCategories.includes(t.category)) return false;
        if (filter === 'pending') return !t.completed;
        if (filter === 'completed') return t.completed;
        return true;
    });

    const completionRate = regularTasks.length > 0 ? (regularTasks.filter(t => t.completed).length / regularTasks.length) * 100 : 0;

    const priorityColor = {
        'Baixa': 'bg-blue-100 text-blue-700',
        'Média': 'bg-yellow-100 text-yellow-700',
        'Alta': 'bg-red-100 text-red-700'
    };

    const categoryIcon: Record<string, string> = {
        'Banho & Tosa': '🛁',
        'Limpeza': '🧹',
        'Administrativo': '📝',
        'Estoque': '📦',
        'Manutenção': '🔧',
        'Equipe': '👥',
        'Outros': '📌'
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-24 animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-20 px-4 py-4 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestão</h1>
                        <p className="text-xs text-gray-500 font-medium">Controle de Tarefas & Contas</p>
                    </div>
                </div>
                {/* Tabs */}
                <div className="bg-gray-100/80 p-1 rounded-2xl flex gap-1">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'tasks' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutList size={16} /> Tarefas
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'expenses' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Calendar size={16} /> Gastos Mensais
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4 max-w-3xl mx-auto space-y-6 w-full">

                {activeTab === 'tasks' ? (
                    <>
                        {/* Task Header with Add Button */}
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl"><CheckSquare size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Minhas Tarefas</h3>
                                    <p className="text-xs text-gray-400 font-medium">{regularTasks.filter(t => !t.completed).length} pendentes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-brand-600 text-white w-10 h-10 rounded-full shadow-lg shadow-brand-200 active:scale-90 transition-transform flex items-center justify-center"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        {/* Progress Card */}
                        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-gray-800">Progresso Geral</h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">{regularTasks.filter(t => t.completed).length} concluídas de {regularTasks.length}</p>
                            </div>
                            <div className="w-12 h-12 relative flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="24" cy="24" r="20" stroke="#f3f4f6" strokeWidth="4" fill="transparent" />
                                    <circle cx="24" cy="24" r="20" stroke="#10b981" strokeWidth="4" fill="transparent" strokeDasharray={`${(completionRate / 100) * 125} 125`} strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-[10px] font-bold text-green-600">{completionRate.toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-gray-200/50 p-1 rounded-xl flex gap-1">
                            {(['all', 'pending', 'completed'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
                                >
                                    {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Concluídas'}
                                </button>
                            ))}
                        </div>

                        {/* Task List */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-600" /></div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                        <CheckSquare size={32} />
                                    </div>
                                    <p className="text-gray-400 font-medium text-sm">Nenhuma tarefa encontrada</p>
                                </div>
                            ) : (
                                filteredTasks.map(task => (
                                    <div key={task.id} className={`bg-white p-4 rounded-[15px] shadow-sm border border-gray-100/50 flex flex-col gap-3 transition-all active:scale-[0.98] ${task.completed ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => toggleTask(task.id, task.completed, task)}
                                                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-brand-400'}`}
                                            >
                                                {task.completed && <CheckCircle size={14} className="text-white" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold text-gray-900 leading-snug ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold">
                                                        {categoryIcon[task.category]} {task.category}
                                                    </span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${priorityColor[task.priority]}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                            </div>

                                            <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-2 -mr-2">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <MonthlyExpensesView
                        tasks={tasks}
                        costs={costs}
                        onAddTask={handleAddTask}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                        onDeleteCost={onDeleteCost}
                    />
                )}
            </div>

            {/* Add Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 relative animate-scale-up shadow-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Nova Tarefa</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Título</label>
                                <input
                                    autoFocus
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 focus:ring-2 ring-brand-200 outline-none"
                                    placeholder="Ex: Comprar Shampoo"
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Categoria</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none"
                                        value={newTaskCategory}
                                        onChange={e => setNewTaskCategory(e.target.value as any)}
                                    >
                                        {relevantCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Prioridade</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none"
                                        value={newTaskPriority}
                                        onChange={e => setNewTaskPriority(e.target.value as any)}
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Média">Média</option>
                                        <option value="Alta">Alta</option>
                                    </select>
                                </div>
                            </div>

                            <button onClick={() => handleAddTask()} className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-brand-700 shadow-lg shadow-brand-200 active:scale-95 transition-all">
                                Adicionar Tarefa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cost Confirmation Popup */}
            {costConfirmationTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-bounce-soft text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Circle size={32} />
                            <span className="font-bold text-2xl">$</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Registrar Custo?</h3>
                        <p className="text-gray-500 text-sm mb-6">Esta tarefa parece ser uma compra.<br />Deseja adicionar aos custos agora?</p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setCostConfirmationTask(null)}
                                className="py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Agora Não
                            </button>
                            <button
                                onClick={() => {
                                    if (onNavigateToRecords) onNavigateToRecords(costConfirmationTask);
                                    setCostConfirmationTask(null);
                                }}
                                className="py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2"
                            >
                                Sim, Adicionar <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
