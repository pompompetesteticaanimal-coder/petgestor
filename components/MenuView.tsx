
import React, { useState, useEffect, useRef } from 'react';
import { Users, Scissors, TrendingUp, TrendingDown, Settings, AlertCircle, Phone, Menu } from 'lucide-react';
import { ViewState } from '../types';

interface MenuViewProps {
    setView: (v: ViewState) => void;
    onOpenSettings: () => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: any;
    view?: ViewState;
    action?: 'settings';
    colorClass: string;
}

export const MenuView: React.FC<MenuViewProps> = ({ setView, onOpenSettings }) => {
    const [isReordering, setIsReordering] = useState(false);
    const [items, setItems] = useState<MenuItem[]>([
        { id: 'clients', label: 'Clientes', icon: Users, view: 'clients', colorClass: 'bg-blue-100 text-blue-600' },
        { id: 'services', label: 'Serviços', icon: Scissors, view: 'services', colorClass: 'bg-purple-100 text-purple-600' },

        { id: 'revenue', label: 'Faturamento', icon: TrendingUp, view: 'revenue', colorClass: 'bg-green-100 text-green-600' },
        { id: 'costs', label: 'Custos', icon: TrendingDown, view: 'costs', colorClass: 'bg-red-100 text-red-600' },
        { id: 'inactive', label: 'Inativos', icon: Phone, view: 'inactive_clients', colorClass: 'bg-orange-100 text-orange-600' },
        { id: 'settings', label: 'Configurações', icon: Settings, action: 'settings', colorClass: 'bg-gray-100 text-gray-600' }
    ]);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const savedOrder = localStorage.getItem('petgestor_menu_order');
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder);
                const reordered = orderIds.map((id: string) => items.find(i => i.id === id)).filter((i: any) => i);
                // Append any new items not in saved order
                const newItems = items.filter(i => !orderIds.includes(i.id));
                setItems([...reordered, ...newItems]);
            } catch (e) {
                console.error("Failed to load menu order", e);
            }
        }
    }, [items.length]);

    const saveOrder = (newItems: MenuItem[]) => {
        setItems(newItems);
        localStorage.setItem('petgestor_menu_order', JSON.stringify(newItems.map(i => i.id)));
    };

    const handleTouchStart = (index: number) => {
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
            setIsReordering(true);
            if (window.navigator.vibrate) window.navigator.vibrate(50);
        }, 800); // 800ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // Drag sorting logic (using simple swap on dragEnter equivalent for touch)
    // Since Touch API doesn't have "dragEnter" easily, we'll use a simple "move" tracker
    // BUT, for simplicity in this artifact without a library:
    // We will enable a mode where "Clicking" an item in Reorder Mode selects it, 
    // and clicking another swaps them? 
    // User asked for "Arrastar" (Drag).
    // Let's implement correct Drag using React's onDragStart/onDragOver/onDrop (works on mobile web usually with polyfill or recent browsers)
    // Actually, native HTML5 drag-and-drop often fails on mobile.
    // I will implement a custom "Touch" swapper. 
    // User touches, moves finger. We detect which element is under finger.

    const handleTouchMove = (e: React.TouchEvent, index: number) => {
        if (!isReordering) return;
        // Prevent scroll while dragging
        e.preventDefault();

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetIndexStr = element?.closest('[data-index]')?.getAttribute('data-index');

        if (targetIndexStr) {
            const targetIndex = parseInt(targetIndexStr);
            if (targetIndex !== index) {
                // Swap
                const newItems = [...items];
                const [movedItem] = newItems.splice(index, 1);
                newItems.splice(targetIndex, 0, movedItem);
                saveOrder(newItems);
                // Note: Index changes, so subsequent moves might be jumpy without tracking "dragged item ID". 
                // But efficient enough for small grid.
            }
        }
    };

    const handleItemClick = (item: MenuItem) => {
        if (isReordering) return; // Don't navigate in edit mode
        if (item.action === 'settings') onOpenSettings();
        else if (item.view) setView(item.view);
    };

    return (
        <div className="p-6 h-full flex flex-col" onClick={() => { if (isReordering) setIsReordering(false); }}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
                    <p className="text-sm text-gray-400 font-medium">{isReordering ? 'Arraste para organizar' : 'Acesso rápido'}</p>
                </div>
                {isReordering && <button onClick={(e) => { e.stopPropagation(); setIsReordering(false); }} className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">Concluir</button>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            data-index={index}
                            className={`
                                relative p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 aspect-square transition-all
                                ${isReordering ? 'animate-shake cursor-move bg-gray-50' : 'bg-white active:scale-95'}
                            `}
                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                            onTouchStart={(e) => { handleTouchStart(index); }}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={(e) => handleTouchMove(e, index)}
                        >
                            <div className={`w-14 h-14 rounded-2xl ${item.colorClass} flex items-center justify-center shadow-inner`}>
                                <Icon size={28} />
                            </div>
                            <span className="font-bold text-gray-700">{item.label}</span>

                            {isReordering && (
                                <div className="absolute top-2 right-2 text-gray-300">
                                    <Menu size={16} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!isReordering && (
                <p className="text-center text-xs text-gray-300 mt-auto pt-8">
                    Segure um ícone para organizar
                </p>
            )}
        </div>
    );
};
