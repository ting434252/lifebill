import React, { useState, useEffect, useMemo } from 'react';
import { Icons, AppLogo } from './components/Icons';
import { DailyForm, TeaForm, MahjongForm } from './components/Forms';
import { CalendarView } from './components/views/CalendarView';
import { StatsView } from './components/views/StatsView';
import { ConfirmModal } from './components/ui/UI';
import { CategorySettings, PlayerSettings, SettingsItem } from './components/Settings';
import { AppRecord, CategoryConfig, CategoryType, ConfirmDialogState, NotificationState, DailyRecord } from './types';

// Helper for currency formatting
const formatMoney = (amount: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

const App = () => {
    const [currentTab, setCurrentTab] = useState<'add' | 'calendar' | 'stats'>('add');
    const [currentCategory, setCurrentCategory] = useState<CategoryType>('daily');
    const [showSettings, setShowSettings] = useState(false);
    const [settingsPage, setSettingsPage] = useState<'menu' | 'categories' | 'players'>('menu');
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [year] = useState(new Date().getFullYear());
    const [notification, setNotification] = useState<NotificationState | null>(null); 
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ isOpen: false, message: '', onConfirm: null, isDestructive: false });
    const [editingRecord, setEditingRecord] = useState<AppRecord | null>(null);
    
    // NOTE: Keep internal storage keys as 'tina_journal' to preserve user data
    const [categories, setCategories] = useState<CategoryConfig>({
        expense: ['餐飲','交通','購物','娛樂','居家'],
        income: ['薪水','獎金','投資']
    });

    const [mahjongPlayers, setMahjongPlayers] = useState<string[]>(['阿明', '小華', '美美']);

    // --- Persist Data ---
    useEffect(() => {
        const savedCats = localStorage.getItem('tina_journal_categories');
        if (savedCats) { try { setCategories(JSON.parse(savedCats)); } catch(e) {} }
        const savedPlayers = localStorage.getItem('tina_journal_players');
        if (savedPlayers) { try { setMahjongPlayers(JSON.parse(savedPlayers)); } catch(e) {} }
    }, []);

    useEffect(() => {
        localStorage.setItem('tina_journal_categories', JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        localStorage.setItem('tina_journal_players', JSON.stringify(mahjongPlayers));
    }, [mahjongPlayers]);

    useEffect(() => {
        const localData = localStorage.getItem(`tina_journal_${year}`);
        if(localData) try { setRecords(JSON.parse(localData)); } catch(e) {}
    }, [year]);

    useEffect(() => {
        localStorage.setItem(`tina_journal_${year}`, JSON.stringify(records));
    }, [records, year]);

    // --- Computed ---
    const totalBalance = useMemo(() => records.reduce((acc, curr) => {
        if (curr.category !== 'daily') return acc;
        if ((curr as DailyRecord).type === 'income') return acc + Number(curr.amount);
        if ((curr as DailyRecord).type === 'expense') return acc - Number(curr.amount);
        return acc;
    }, 0), [records]);

    // --- Actions ---
    const showNotification = (msg: string, type: 'success' | 'error' | 'add' | 'delete' | 'edit' = 'success') => { 
        // Use 'toast' style for errors, 'modal' for everything else
        const style = type === 'error' ? 'toast' : 'modal';
        setNotification({ msg, type, style }); 
        setTimeout(() => setNotification(null), 1500);
    };

    const closeConfirm = () => setConfirmDialog({ ...confirmDialog, isOpen: false });

    const handleAddRecord = async (newRecord: any) => {
        const recordWithMeta: AppRecord = { ...newRecord, id: Date.now().toString(), createdAt: new Date().toISOString(), year: year };
        setRecords(prev => [...prev, recordWithMeta]);
        showNotification("新增成功！", 'add');
    };

    const handleUpdateRecord = async (updatedData: any) => {
        if (!editingRecord) return;
        const updatedRecord = { ...editingRecord, ...updatedData };
        setRecords(prev => prev.map(r => r.id === editingRecord.id ? updatedRecord : r));
        setEditingRecord(null);
        showNotification("修改成功！", 'edit');
    };

    const handleDelete = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            message: "確定要刪除此筆紀錄嗎？",
            isDestructive: true,
            onConfirm: () => {
                setRecords(prev => prev.filter(r => r.id !== id));
                closeConfirm();
                showNotification("刪除成功！", 'delete');
            }
        });
    };

    const handleClearAllData = () => {
        setConfirmDialog({
            isOpen: true,
            message: "⚠️ 警告：確定要刪除當年度所有資料嗎？此動作無法復原！",
            isDestructive: true,
            onConfirm: () => {
                setRecords([]);
                localStorage.removeItem(`tina_journal_${year}`);
                showNotification("資料已全部清除", "delete");
                setShowSettings(false);
                closeConfirm();
            }
        });
    };

    const exportToExcel = () => {
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + "日期,類別,項目,金額,評分\n" + records.map(e => {
            const item = e.category === 'daily' ? (e as DailyRecord).subCategory : e.category === 'tea' ? (e as any).shop : '麻將';
            return `${e.date},${e.category},${item},${e.amount},${(e as any).rating || ''}`;
        }).join("\n");
        const link = document.createElement("a"); 
        link.setAttribute("href", encodeURI(csvContent)); 
        link.setAttribute("download", `life_journal_${year}.csv`);
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
    };

    const addCategory = (type: 'expense'|'income', name: string) => {
        if (!name.trim()) return;
        if (categories[type].includes(name)) { showNotification("⚠️ 類別已存在", "error"); return; }
        setCategories(prev => ({ ...prev, [type]: [...prev[type], name] }));
        showNotification("已新增類別", 'add');
    };

    const removeCategory = (type: 'expense'|'income', name: string) => {
        if (categories[type].length <= 1) { showNotification("⚠️ 至少保留一個", "error"); return; }
        
        setConfirmDialog({
            isOpen: true,
            message: `確定要刪除類別「${name}」嗎？`,
            isDestructive: true,
            onConfirm: () => {
                setCategories(prev => ({ ...prev, [type]: prev[type].filter(c => c !== name) }));
                showNotification("已刪除類別", 'delete');
                closeConfirm();
            }
        });
    };

    const addPlayer = (name: string) => {
        if (!name.trim()) return;
        if (mahjongPlayers.includes(name)) { showNotification("⚠️ 麻友已存在", "error"); return; }
        setMahjongPlayers(prev => [...prev, name]);
        showNotification("已新增麻友", 'add');
    };

    const removePlayer = (name: string) => {
        setConfirmDialog({
            isOpen: true,
            message: `確定要刪除麻友「${name}」嗎？`,
            isDestructive: true,
            onConfirm: () => {
                setMahjongPlayers(prev => prev.filter(p => p !== name));
                showNotification("已刪除麻友", 'delete');
                closeConfirm();
            }
        });
    };

    const getNotificationIcon = (type: string) => {
        switch(type) {
            case 'add': return <Icons.Check size={32} />;
            case 'edit': return <Icons.Edit size={32} />;
            case 'delete': return <Icons.Trash size={32} />;
            case 'error': return <Icons.AlertCircle size={32} />;
            default: return <Icons.Check size={32} />;
        }
    };

    const CategoryTabs = ({ current, set }: any) => (
        <div className="flex justify-center space-x-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-lg border border-white/50">
            <button onClick={()=>set('daily')} className={`flex-1 py-2 rounded-xl text-xs tracking-wider transition-all ${current==='daily' ? 'bg-muji-ink text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>日常</button>
            <button onClick={()=>set('tea')} className={`flex-1 py-2 rounded-xl text-xs tracking-wider transition-all ${current==='tea' ? 'bg-muji-ink text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>手搖</button>
            <button onClick={()=>set('mahjong')} className={`flex-1 py-2 rounded-xl text-xs tracking-wider transition-all ${current==='mahjong' ? 'bg-muji-ink text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>麻將</button>
        </div>
    );

    const NavBtn = ({ active, onClick, icon, label }: any) => (
        <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 group`}><div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'text-muji-ink bg-muji-ink/10' : 'text-gray-400 group-hover:text-muji-ink'}`}>{icon}</div><span className={`text-[10px] tracking-widest font-sans font-medium mt-1 ${active ? 'text-muji-ink' : 'text-gray-400'}`}>{label}</span></button>
    );

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-muji-paper shadow-2xl relative text-muji-text overflow-hidden">
            {/* Header */}
            <header className="px-6 py-3 bg-muji-ink text-white flex justify-between items-center shadow-md relative z-10 transition-colors duration-300 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-1.5 rounded-xl shadow-inner backdrop-blur-sm border border-white/20">
                        <AppLogo className="text-white w-8 h-8 drop-shadow-sm" />
                    </div>
                    <div>
                        <h1 className="font-sans font-bold text-3xl tracking-widest text-white leading-none drop-shadow-sm">LIFE</h1>
                        <p className="text-[10px] tracking-[0.3em] text-white/80 mt-1 uppercase border-l-2 border-white/50 pl-2 font-sans">Journal</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <p className="text-[10px] text-white/80 uppercase tracking-widest mb-0.5 font-sans">總資產</p>
                        <span className={`font-sans text-lg font-medium tracking-tight drop-shadow-sm leading-none ${totalBalance >= 0 ? 'text-white' : 'text-muji-green'}`}>
                            {formatMoney(totalBalance)}
                        </span>
                    </div>
                    <button onClick={()=>{setShowSettings(!showSettings); setSettingsPage('menu');}} className="text-white/70 hover:text-white transition p-1"><Icons.Settings size={22} /></button>
                </div>
            </header>

            {/* Notification - Modal Style (Success/Add/Edit/Delete) */}
            {notification && notification.style === 'modal' && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
                    <div className="relative z-10 bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 animate-pop min-w-[180px]">
                        <div className={`p-3 rounded-full ${
                            notification.type === 'add' ? 'bg-[#748E78]/10 text-muji-green' :
                            (notification.type === 'delete') ? 'bg-[#C85A5A]/10 text-muji-red' :
                            'bg-muji-ink/10 text-muji-ink'
                        }`}>
                            {getNotificationIcon(notification.type)}
                        </div>
                        <span className="font-bold tracking-widest text-muji-text text-base">{notification.msg}</span>
                    </div>
                </div>
            )}

            {/* Notification - Toast Style (Error) */}
            {notification && notification.style === 'toast' && (
                 <div className="absolute top-20 left-0 right-0 z-[110] flex justify-center pointer-events-none">
                    <div className="bg-white px-6 py-3 rounded-2xl shadow-float border border-red-100 flex items-center gap-3 animate-pop pointer-events-auto min-w-[200px] justify-center">
                        <div className="text-muji-red bg-red-50 p-1 rounded-full flex-shrink-0">
                            <Icons.AlertCircle size={20} />
                        </div>
                        <span className="font-bold text-sm text-muji-text tracking-wide">{notification.msg}</span>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal 
                isOpen={confirmDialog.isOpen} 
                message={confirmDialog.message} 
                onConfirm={confirmDialog.onConfirm!} 
                onCancel={closeConfirm} 
                isDestructive={confirmDialog.isDestructive} 
            />

            {/* Edit Modal */}
            {editingRecord && (
                <div className="absolute inset-0 z-[80] flex justify-center items-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={()=>setEditingRecord(null)}></div>
                    <div className="bg-muji-paper w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-pop relative z-10">
                        <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-muji-ink">修改紀錄</h3>
                            <button onClick={()=>setEditingRecord(null)} className="p-2 text-gray-400 hover:text-gray-600"><Icons.X size={20}/></button>
                        </div>
                        <div className="p-6">
                            {editingRecord.category === 'daily' && <DailyForm initialData={editingRecord} onSubmit={handleUpdateRecord} categories={categories} isEditing showNotification={showNotification} />}
                            {editingRecord.category === 'tea' && <TeaForm initialData={editingRecord} onSubmit={handleUpdateRecord} records={records} isEditing showNotification={showNotification} />}
                            {editingRecord.category === 'mahjong' && <MahjongForm initialData={editingRecord} onSubmit={handleUpdateRecord} records={records} isEditing showNotification={showNotification} players={mahjongPlayers} />}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={()=>setShowSettings(false)}></div>
                    <div className="bg-muji-paper w-full max-w-sm rounded-3xl shadow-2xl flex flex-col animate-pop relative z-10 max-h-[85%] overflow-hidden">
                        <div className="p-6 flex items-center justify-between bg-muji-paper border-b border-white/50">
                            {settingsPage === 'menu' ? (
                                <h2 className="text-xl font-bold text-muji-text font-sans tracking-wider">設定</h2>
                            ) : (
                                <button onClick={()=>setSettingsPage('menu')} className="flex items-center text-muji-text hover:text-muji-ink transition group">
                                    <Icons.ArrowLeft size={18} className="mr-2"/>
                                    <span className="font-bold tracking-wide text-sm">返回</span>
                                </button>
                            )}
                            <button onClick={()=>setShowSettings(false)} className="p-2 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition"><Icons.X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-2">
                            {settingsPage === 'menu' ? (
                                <div className="space-y-6">
                                    <div>
                                        <div className="space-y-1">
                                            <SettingsItem icon={<Icons.List size={18}/>} label="類別管理" onClick={()=>setSettingsPage('categories')} subLabel="自訂收支項目"/>
                                            <SettingsItem icon={<Icons.Users size={18}/>} label="麻友管理" onClick={()=>setSettingsPage('players')} subLabel="設定牌咖名單"/>
                                            <div className="h-[1px] bg-gray-200 ml-10 my-1"></div>
                                            <SettingsItem icon={<Icons.Download size={18}/>} label="匯出資料" onClick={exportToExcel} subLabel="下載 CSV 報表"/>
                                        </div>
                                    </div>
                                    <div className="pt-8"><SettingsItem icon={<Icons.Trash size={18}/>} label="清除所有資料" onClick={handleClearAllData} isDestructive/></div>
                                </div>
                            ) : settingsPage === 'categories' ? (
                                <CategorySettings categories={categories} onAdd={addCategory} onRemove={removeCategory} setCategories={setCategories} showNotification={showNotification} />
                            ) : (
                                <PlayerSettings players={mahjongPlayers} onAdd={addPlayer} onRemove={removePlayer} setPlayers={setMahjongPlayers} showNotification={showNotification} />
                            )}
                        </div>
                        <div className="p-6 text-center border-t border-white/50">
                            <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase">
                                Life Journal {year} • V1.0 <br/> Local Storage
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-double-nav hide-scrollbar">
                <div className="pt-2">
                    {currentTab === 'add' && (
                        <div className="px-6 animate-fade-in">
                            <div className="bg-muji-white p-6 rounded-3xl shadow-card border border-muji-border animate-slide-up mb-2">
                                {currentCategory === 'daily' && <DailyForm onAdd={handleAddRecord} categories={categories} showNotification={showNotification} />}
                                {currentCategory === 'tea' && <TeaForm onAdd={handleAddRecord} records={records} showNotification={showNotification} />}
                                {currentCategory === 'mahjong' && <MahjongForm onAdd={handleAddRecord} records={records} showNotification={showNotification} players={mahjongPlayers} />}
                            </div>
                        </div>
                    )}
                    {currentTab === 'calendar' && <CalendarView records={records} onDelete={handleDelete} onEdit={setEditingRecord} category={currentCategory} />}
                    {currentTab === 'stats' && <StatsView records={records} category={currentCategory} categories={categories} />}
                </div>
            </main>

            {/* Footer Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
                <div className="px-4 pb-2"><CategoryTabs current={currentCategory} set={setCurrentCategory} /></div>
                <nav className="bg-white shadow-nav flex justify-around items-center pb-safe pt-2 border-t border-gray-100">
                    <NavBtn active={currentTab === 'calendar'} onClick={() => setCurrentTab('calendar')} icon={<Icons.Calendar size={22} />} label="日曆" />
                    <NavBtn active={currentTab === 'add'} onClick={() => setCurrentTab('add')} icon={<Icons.Plus size={24} />} label="新增" />
                    <NavBtn active={currentTab === 'stats'} onClick={() => setCurrentTab('stats')} icon={<Icons.PieChart size={22} />} label="數據" />
                </nav>
            </div>
        </div>
    );
};

export default App;