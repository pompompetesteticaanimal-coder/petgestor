
import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Filter, AlertCircle, Circle, CheckCircle, X, Loader2 } from 'lucide-react';
import { Task } from '../types';
import { supabase } from '../services/supabaseClient';

export const TaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>('Outros');
    const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Média');

    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    // Load from Supabase on Mount
    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setIsLoading(true);
        try {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) {
                const mappedTasks = data.map(d => ({
                    id: d.id,
                    title: d.title,
                    completed: d.completed,
                    category: d.category,
                    priority: d.priority,
                    createdAt: d.created_at
                } as Task));
                setTasks(mappedTasks);
            }
            if (error) throw error;
        } catch (error) {
            console.error('Error loading tasks:', error);
            // Fallback to local storage if needed, or just show empty for now
            const stored = localStorage.getItem('pet_tasks');
            if (stored) setTasks(JSON.parse(stored));
        } finally {
            setIsLoading(false);
        }
    };

    const addTask = async () => {
        if (!newTaskTitle.trim()) return;

        const newTask: Task = {
            id: crypto.randomUUID(), // Optimistic ID
            title: newTaskTitle,
            completed: false,
            category: newTaskCategory,
            priority: newTaskPriority,
            createdAt: new Date().toISOString()
        };

        // Optimistic Update
        setTasks([newTask, ...tasks]);
        setIsModalOpen(false);
        setNewTaskTitle('');

        if (supabase) {
            const { error } = await supabase.from('tasks').insert([{
                id: newTask.id,
                title: newTask.title,
                completed: newTask.completed,
                category: newTask.category,
                priority: newTask.priority,
                created_at: newTask.createdAt
            }]);
            if (error) {
                console.error("Error saving task:", error);
                alert("Erro ao salvar tarefa no banco.");
            }
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean) => {
        // Optimistic
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));

        if (supabase) {
            await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', id);
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

        setTasks(tasks.filter(t => t.id !== id));

        if (supabase) {
            await supabase.from('tasks').delete().eq('id', id);
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'pending') return !t.completed;
        if (filter === 'completed') return t.completed;
        return true;
    });

    const completionRate = tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0;

    const priorityColor = {
        'Baixa': 'bg-blue-100 text-blue-700',
        'Média': 'bg-yellow-100 text-yellow-700',
        'Alta': 'bg-red-100 text-red-700'
    };

    const categoryIcon = {
        'Banho & Tosa': '🛁',
        'Limpeza': '🧹',
        'Administrativo': '📝',
        'Outros': '📌'
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 relative min-h-screen">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tarefas</h1>
                    <p className="text-gray-500 font-medium">Gerencie sua rotina diária</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-600 text-white p-3 rounded-2xl shadow-lg shadow-brand-200 active:scale-95 transition-transform flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span className="font-bold text-sm hidden sm:inline">Nova Tarefa</span>
                </button>
            </div>

            {/* Stats / Progress */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Progresso do Dia</h3>
                    <p className="text-sm text-gray-500">{tasks.filter(t => t.completed).length} de {tasks.length} tarefas concluídas</p>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="6" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray={`${(completionRate / 100) * 175} 175`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xs font-bold text-green-600">{completionRate.toFixed(0)}%</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl">
                <button onClick={() => setFilter('all')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>Todas</button>
                <button onClick={() => setFilter('pending')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${filter === 'pending' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>Pendentes</button>
                <button onClick={() => setFilter('completed')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${filter === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}>Concluídas</button>
            </div>

            {/* List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-600" /></div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        Nenhuma tarefa encontrada.
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all ${task.completed ? 'opacity-60 border-gray-100 bg-gray-50' : 'border-gray-200 hover:border-brand-200'}`}>
                            <button
                                onClick={() => toggleTask(task.id, task.completed)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-brand-400'}`}
                            >
                                <CheckCircle size={14} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold text-gray-800 truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-600 flex items-center gap-1">{categoryIcon[task.category]} {task.category}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide ${priorityColor[task.priority]}`}>{task.priority}</span>
                                </div>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-2xl animate-bounce-soft relative mx-auto flex flex-col gap-4">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-lg font-extrabold text-gray-900 mt-1">Nova Tarefa</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Título</label>
                                <input
                                    type="text"
                                    placeholder="O que precisa ser feito?"
                                    autoFocus
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 ring-brand-200 transition-all placeholder:font-normal"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Categoria</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['Banho & Tosa', 'Limpeza', 'Administrativo', 'Outros'] as const).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setNewTaskCategory(cat)}
                                            className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1.5 ${newTaskCategory === cat ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            {categoryIcon[cat]} {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Prioridade</label>
                                <div className="flex gap-2">
                                    {(['Baixa', 'Média', 'Alta'] as const).map(prio => (
                                        <button
                                            key={prio}
                                            onClick={() => setNewTaskPriority(prio)}
                                            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all border ${newTaskPriority === prio ?
                                                (prio === 'Alta' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : prio === 'Média' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 shadow-sm' : 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm')
                                                : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            {prio}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={addTask}
                                disabled={!newTaskTitle.trim()}
                                className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
                            >
                                Adicionar Tarefa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
