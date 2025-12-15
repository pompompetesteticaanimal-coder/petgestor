
import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Filter, AlertCircle, Circle, CheckCircle } from 'lucide-react';
import { Task } from '../types';

export const TaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState<Task['category']>('Outros');
    const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Média');
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    useEffect(() => {
        const stored = localStorage.getItem('pet_tasks');
        if (stored) setTasks(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem('pet_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = () => {
        if (!newTaskTitle.trim()) return;
        const task: Task = {
            id: crypto.randomUUID(),
            title: newTaskTitle,
            completed: false,
            category: newTaskCategory,
            priority: newTaskPriority,
            createdAt: new Date().toISOString()
        };
        setTasks([task, ...tasks]);
        setNewTaskTitle('');
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
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
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tarefas</h1>
                    <p className="text-gray-500 font-medium">Gerencie sua rotina diária</p>
                </div>
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

            {/* Input Form */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <input
                    type="text"
                    placeholder="Nova tarefa..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-brand-100"
                />
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(['Banho & Tosa', 'Limpeza', 'Administrativo', 'Outros'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setNewTaskCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${newTaskCategory === cat ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        {(['Baixa', 'Média', 'Alta'] as const).map(prio => (
                            <button
                                key={prio}
                                onClick={() => setNewTaskPriority(prio)}
                                className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border ${newTaskPriority === prio ? (prio === 'Alta' ? 'bg-red-50 border-red-200 text-red-600' : prio === 'Média' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-blue-50 border-blue-200 text-blue-600') : 'bg-white border-gray-200 text-gray-400'}`}
                            >
                                {prio}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={addTask}
                        className="bg-brand-600 text-white p-2 rounded-xl shadow-lg shadow-brand-200 active:scale-95 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <button onClick={() => setFilter('all')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>Todas</button>
                <button onClick={() => setFilter('pending')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${filter === 'pending' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Pendentes</button>
                <button onClick={() => setFilter('completed')} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${filter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Concluídas</button>
            </div>

            {/* List */}
            <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 font-medium">Nenhuma tarefa encontrada.</div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all ${task.completed ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
                            <button
                                onClick={() => toggleTask(task.id)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-brand-400'}`}
                            >
                                <CheckCircle size={14} />
                            </button>
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold text-gray-800 ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs">{categoryIcon[task.category]} {task.category}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${priorityColor[task.priority]}`}>{task.priority}</span>
                                </div>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
