import React, { useState } from 'react';
import { Icons } from './Icons';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SettingsItem = ({ icon, label, subLabel, onClick, isDestructive }: any) => (
    <button onClick={onClick} className={`w-full py-4 flex items-center justify-between group transition-colors ${isDestructive ? 'text-muji-red hover:bg-red-50/50 rounded-lg px-2 -mx-2' : 'hover:bg-white/60 rounded-lg px-2 -mx-2'}`}>
        <div className="flex items-center gap-4"><div className={`${isDestructive ? 'text-muji-red' : 'text-gray-400 group-hover:text-muji-ink'} transition-colors`}>{icon}</div><div className="text-left"><span className={`block text-sm font-bold ${isDestructive ? 'text-muji-red' : 'text-muji-text'}`}>{label}</span>{subLabel && <span className="text-[10px] text-gray-400 block mt-0.5">{subLabel}</span>}</div></div>
        {!isDestructive && <Icons.ChevronRight size={16} className="text-gray-300"/>}
    </button>
);

// --- DND Components ---

const SortableItem = ({ id, children, onRemove }: { id: string, children: React.ReactNode, onRemove?: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none relative">
             <div className="group flex items-center justify-between bg-white border border-gray-100 px-4 py-3 rounded-xl shadow-sm">
                {children}
             </div>
        </div>
    );
};

const SortableGridItem = ({ id, children, onRemove }: { id: string, children: React.ReactNode, onRemove?: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none relative">
            <div className="group relative bg-white border border-gray-100 px-2 py-3 rounded-xl shadow-sm text-center flex flex-col items-center justify-between min-h-[80px] h-full">
                {children}
            </div>
        </div>
    );
};


const CategorySettings = ({ categories, onAdd, onRemove, setCategories }: any) => {
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [newCat, setNewCat] = useState('');
    
    // Configure sensors for long press drag
    const sensors = useSensors(
        useSensor(PointerSensor, {
             activationConstraint: { delay: 250, tolerance: 5 }, // 250ms long press for mouse/touch
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 }, // 250ms long press for mobile touch
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAdd = () => { if(newCat.trim()) { onAdd(activeTab, newCat.trim()); setNewCat(''); } };
    
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setCategories((prev: any) => {
                const oldIndex = prev[activeTab].indexOf(active.id);
                const newIndex = prev[activeTab].indexOf(over.id);
                return {
                    ...prev,
                    [activeTab]: arrayMove(prev[activeTab], oldIndex, newIndex)
                };
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            <div className="bg-white p-1 rounded-xl flex shadow-inner border border-gray-100">
                <button onClick={()=>setActiveTab('expense')} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all duration-300 ${activeTab==='expense' ? 'bg-muji-ink text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>支出</button>
                <button onClick={()=>setActiveTab('income')} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all duration-300 ${activeTab==='income' ? 'bg-muji-ink text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>收入</button>
            </div>
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                <input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=> e.key === 'Enter' && handleAdd()} placeholder="輸入新類別..." className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-muji-text outline-none placeholder-gray-300"/>
                <button onClick={handleAdd} disabled={!newCat.trim()} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-muji-paper text-muji-ink rounded-lg hover:bg-muji-ink hover:text-white disabled:opacity-50 transition-all"><Icons.Plus size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categories[activeTab]} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-2 content-start">
                            {categories[activeTab].map((cat: string) => (
                                <SortableItem key={cat} id={cat}>
                                    <span className="text-sm text-gray-600 font-medium">{cat}</span>
                                    <div className="flex items-center gap-1">
                                        <div className="p-2 cursor-move text-gray-300"><Icons.List size={14} className="opacity-50"/></div>
                                        <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                                        <button 
                                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on button click
                                            onClick={(e)=> {e.stopPropagation(); onRemove(activeTab, cat);}} 
                                            className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                        >
                                            <Icons.X size={14}/>
                                        </button>
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                {categories[activeTab].length === 0 && <div className="w-full text-center py-10 text-gray-300 space-y-2"><div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-100 mx-auto"><Icons.List size={20} className="opacity-20"/></div><span className="text-xs tracking-widest">暫無類別</span></div>}
            </div>
        </div>
    );
};

const PlayerSettings = ({ players, onAdd, onRemove, setPlayers }: any) => {
    const [newPlayer, setNewPlayer] = useState('');
    
    // Configure sensors for long press drag
    const sensors = useSensors(
        useSensor(PointerSensor, {
             activationConstraint: { delay: 250, tolerance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAdd = () => { if(newPlayer.trim()) { onAdd(newPlayer.trim()); setNewPlayer(''); } };
    
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setPlayers((items: string[]) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                <input value={newPlayer} onChange={e=>setNewPlayer(e.target.value)} onKeyDown={e=> e.key === 'Enter' && handleAdd()} placeholder="輸入麻友名字..." className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-muji-text outline-none placeholder-gray-300"/>
                <button onClick={handleAdd} disabled={!newPlayer.trim()} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-muji-paper text-muji-ink rounded-lg hover:bg-muji-ink hover:text-white disabled:opacity-50 transition-all"><Icons.Plus size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={players}>
                        <div className="grid grid-cols-3 gap-2 content-start">
                            {players.map((p: string) => (
                                <SortableGridItem key={p} id={p}>
                                    <span className="text-sm text-gray-600 font-medium break-all">{p}</span>
                                    <div className="flex items-center justify-center gap-1 mt-2 w-full">
                                        <button 
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e)=>{e.stopPropagation(); onRemove(p);}} 
                                            className="text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                                        >
                                            <Icons.X size={12}/>
                                        </button>
                                    </div>
                                </SortableGridItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                {players.length === 0 && <div className="col-span-3 w-full text-center py-10 text-gray-300 text-xs tracking-widest">暫無麻友</div>}
            </div>
        </div>
    );
};

export { SettingsItem, CategorySettings, PlayerSettings };