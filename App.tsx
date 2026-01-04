import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icons, AppLogo } from './components/Icons';
import { DailyForm, TeaForm, MahjongForm } from './components/Forms';
import { CalendarView } from './components/views/CalendarView';
import { StatsView } from './components/views/StatsView';
import { ConfirmModal } from './components/ui/UI';
import { CategorySettings, PlayerSettings, TemplateSettings, SettingsItem } from './components/Settings';
import { AppRecord, CategoryConfig, CategoryType, ConfirmDialogState, NotificationState, DailyRecord, Template } from './types';
import { LoginView } from './components/LoginView';
import { auth, db } from './firebase'; // Import Firebase
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Helper for currency formatting
const formatMoney = (amount: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);

const App = () => {
    const [currentTab, setCurrentTab] = useState<'add' | 'calendar' | 'stats'>('add');
    const [currentCategory, setCurrentCategory] = useState<CategoryType>('daily');
    const [showSettings, setShowSettings] = useState(false);
    const [settingsPage, setSettingsPage] = useState<'menu' | 'categories' | 'players' | 'templates'>('menu');
    
    // --- Data States ---
    const [records, setRecords] = useState<AppRecord[]>([]);
    const [year] = useState(new Date().getFullYear());
    const [categories, setCategories] = useState<CategoryConfig>({
        expense: ['餐飲','交通','購物','娛樂','居家'],
        income: ['薪水','獎金','投資']
    });
    const [mahjongPlayers, setMahjongPlayers] = useState<string[]>(['阿明', '小華', '美美']);
    const [templates, setTemplates] = useState<Template[]>([]);

    // --- UI/System States ---
    const [notification, setNotification] = useState<NotificationState | null>(null); 
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ isOpen: false, message: '', onConfirm: null, isDestructive: false });
    const [editingRecord, setEditingRecord] = useState<AppRecord | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSearchMode, setIsSearchMode] = useState(false);

    // --- Auth & Cloud States ---
    const [user, setUser] = useState<User | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false); // Visual indicator for cloud ops

    // --- Auth Listener ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                showNotification(`歡迎回來, ${currentUser.displayName || currentUser.email}`, 'success');
                // Switch to cloud data source is handled in the Data Subscription effect
            }
        });
        return () => unsubscribe();
    }, []);

    // --- Data Persistence Logic (The Core Change) ---
    // Rule: 
    // If User is NULL -> Read/Write LocalStorage
    // If User is SET -> Read/Write Firestore (Realtime)

    // 1. Load Data (Subscription)
    useEffect(() => {
        let unsubscribeFirestore: (() => void) | undefined;

        if (user) {
            // --- CLOUD MODE: Subscribe to Firestore ---
            setIsSyncing(true);
            const userDocRef = doc(db, 'users', user.uid, 'years', year.toString());
            
            unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.records) setRecords(data.records);
                    if (data.categories) setCategories(data.categories);
                    if (data.players) setMahjongPlayers(data.players);
                    if (data.templates) setTemplates(data.templates);
                } else {
                    // New cloud user or new year: Initialize with defaults or empty
                    // Optional: could ask to merge local data here, but keeping it simple: start fresh or empty
                    setRecords([]); 
                    // Keep default categories/players if doc doesn't exist yet
                }
                setIsSyncing(false);
            }, (error) => {
                console.error("Sync error:", error);
                showNotification("雲端同步失敗", "error");
                setIsSyncing(false);
            });

        } else {
            // --- LOCAL MODE: Load from LocalStorage ---
            const savedCats = localStorage.getItem('tina_journal_categories');
            if (savedCats) { try { setCategories(JSON.parse(savedCats)); } catch(e) {} }
            
            const savedPlayers = localStorage.getItem('tina_journal_players');
            if (savedPlayers) { try { setMahjongPlayers(JSON.parse(savedPlayers)); } catch(e) {} }
            
            const savedTemplates = localStorage.getItem('tina_journal_templates');
            if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch(e) {} }

            const localData = localStorage.getItem(`tina_journal_${year}`);
            if(localData) try { setRecords(JSON.parse(localData)); } catch(e) {}
            
            setIsSyncing(false);
        }

        return () => {
            if (unsubscribeFirestore) unsubscribeFirestore();
        };
    }, [user, year]);

    // 2. Save Data (Triggered when data changes)
    // We use a debounce or direct save. For simplicity in React flow, we'll save whenever state changes.
    // OPTIMIZATION: In a real app, we might want to batch this or use useReducer, 
    // but for this scale, saving the whole JSON object for the year is acceptable.
    const saveData = async (
        newRecords: AppRecord[], 
        newCats: CategoryConfig, 
        newPlayers: string[], 
        newTemplates: Template[]
    ) => {
        if (user) {
            // --- CLOUD MODE: Save to Firestore ---
            // We don't need to do anything here IF the state change came from the snapshot listener.
            // However, distinguishing that is hard. 
            // Better approach: create specific actions for add/update/delete that call Firestore directly.
            // BUT, to minimize code refactoring of the existing App structure (which relies on setRecords),
            // we will effectively "sync back" state changes to Firestore.
            // To avoid infinite loops with onSnapshot, we usually compare, but setDoc merges.
            
            try {
                // Note: Writing to Firestore will trigger onSnapshot locally immediately (latency compensation),
                // so the UI updates fast.
                await setDoc(doc(db, 'users', user.uid, 'years', year.toString()), {
                    records: newRecords,
                    categories: newCats,
                    players: newPlayers,
                    templates: newTemplates,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.error("Save to cloud failed", e);
                showNotification("雲端儲存失敗", "error");
            }
        } else {
            // --- LOCAL MODE: Save to LocalStorage ---
            localStorage.setItem(`tina_journal_${year}`, JSON.stringify(newRecords));
            localStorage.setItem('tina_journal_categories', JSON.stringify(newCats));
            localStorage.setItem('tina_journal_players', JSON.stringify(newPlayers));
            localStorage.setItem('tina_journal_templates', JSON.stringify(newTemplates));
        }
    };

    // Use Effect to trigger save when any data state changes
    // Skip the very first render to avoid overwriting cloud with empty local state before sync
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        // Only save if we are not currently receiving a sync update (approximated)
        if (!isSyncing) {
            saveData(records, categories, mahjongPlayers, templates);
        }
    }, [records, categories, mahjongPlayers, templates]);


    // --- Computed ---
    const totalBalance = useMemo(() => records.reduce((acc, curr) => {
        if (curr.category !== 'daily') return acc;
        if ((curr as DailyRecord).type === 'income') return acc + Number(curr.amount);
        if ((curr as DailyRecord).type === 'expense') return acc - Number(curr.amount);
        return acc;
    }, 0), [records]);

    // --- Actions ---
    const showNotification = (msg: string, type: 'success' | 'error' | 'add' | 'delete' | 'edit' | 'backup' = 'success') => { 
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

    const handleDuplicateRecord = (id: string) => {
        const record = records.find(r => r.id === id);
        if (record) {
            const newRecord = { ...record, id: Date.now().toString(), createdAt: new Date().toISOString() };
            setRecords(prev => [...prev, newRecord]);
            showNotification("已複製紀錄", 'add');
        }
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
    
    // --- Template Actions ---
    const handleDeleteTemplate = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            message: "確定要刪除此樣板嗎？",
            isDestructive: true,
            onConfirm: () => {
                setTemplates(prev => prev.filter(t => t.id !== id));
                closeConfirm();
                showNotification("已刪除樣板", "delete");
            }
        });
    };

    const handleRenameTemplate = (id: string, newName: string) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
        showNotification("已更新樣板", "edit");
    };

    const handleClearAllData = () => {
        setConfirmDialog({
            isOpen: true,
            message: "⚠️ 警告：確定要刪除當年度所有資料嗎？此動作無法復原！",
            isDestructive: true,
            onConfirm: () => {
                setRecords([]);
                if (!user) localStorage.removeItem(`tina_journal_${year}`);
                showNotification("資料已全部清除", "delete");
                setShowSettings(false);
                closeConfirm();
            }
        });
    };

    // --- JSON Backup & Restore ---
    const handleExportJSON = async () => {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            year: year,
            categories,
            players: mahjongPlayers,
            records,
            templates
        };
        const fileName = `life_journal_backup_${year}_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/json' })] })) {
            try {
                await navigator.share({
                    files: [new File([blob], fileName, { type: 'application/json' })],
                    title: 'Life Journal Backup',
                });
                return;
            } catch (e) {}
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("備份檔案已下載", 'backup');
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!data.version || !data.records) throw new Error("無效的備份檔案格式");
                
                setConfirmDialog({
                    isOpen: true,
                    message: `確定要還原 ${data.records.length} 筆資料嗎？目前的資料將會被覆蓋！`,
                    isDestructive: true,
                    onConfirm: () => {
                        if (data.categories) setCategories(data.categories);
                        if (data.players) setMahjongPlayers(data.players);
                        if (data.records) setRecords(data.records);
                        if (data.templates) setTemplates(data.templates);
                        
                        showNotification("資料還原成功！", 'success');
                        closeConfirm();
                        setShowSettings(false);
                    }
                });
            } catch (err) {
                showNotification("檔案讀取失敗", 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const exportToExcel = async () => {
        const csvContent = "\uFEFF" + "日期,類別,項目,金額,評分\n" + records.map(e => {
            const item = e.category === 'daily' ? (e as DailyRecord).subCategory : e.category === 'tea' ? (e as any).shop : '麻將';
            return `${e.date},${e.category},${item},${e.amount},${(e as any).rating || ''}`;
        }).join("\n");
        const fileName = `life_journal_${year}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

         if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'text/csv' })] })) {
            try {
                await navigator.share({
                    files: [new File([blob], fileName, { type: 'text/csv' })],
                    title: 'Life Journal Report',
                });
                return;
            } catch (e) {}
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); 
        link.href = url;
        link.download = fileName;
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
            case 'backup': return <Icons.DownloadCloud size={32} />;
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

    const NavBtn = ({ active, onClick, icon }: any) => (
        <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center py-4 transition-all duration-300 group`}>
            <div className={`p-2 rounded-xl transition-all duration-300 ${active ? 'text-muji-ink bg-muji-ink/10' : 'text-gray-400 group-hover:text-muji-ink'}`}>
                {React.cloneElement(icon, { size: 26 })}
            </div>
        </button>
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
                        <p className="text-[10px] tracking-[0.3em] text-white/80 mt-1 uppercase border-l-2 border-white/50 pl-2 font-sans">
                            {user ? 'Cloud Sync' : 'Local Mode'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end mr-2">
                        <p className="text-[10px] text-white/80 uppercase tracking-widest mb-0.5 font-sans">總資產</p>
                        <span className={`font-sans text-lg font-medium tracking-tight drop-shadow-sm leading-none ${totalBalance >= 0 ? 'text-white' : 'text-muji-green'}`}>
                            {formatMoney(totalBalance)}
                        </span>
                    </div>
                    {/* Cloud Login Toggle Button */}
                    <button 
                        onClick={() => {
                            if (!user) setShowLogin(true);
                            else { setShowSettings(true); setSettingsPage('menu'); }
                        }}
                        className={`p-2 rounded-full transition ${user ? 'bg-white/20 text-white shadow-inner' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        title={user ? "已登入" : "點此登入雲端"}
                    >
                        <Icons.User size={22} fill={!!user} />
                    </button>
                    {/* Settings Button */}
                    <button onClick={()=>{setShowSettings(!showSettings); setSettingsPage('menu');}} className="text-white/70 hover:text-white transition p-2 hover:bg-white/10 rounded-full"><Icons.Settings size={22} /></button>
                </div>
            </header>

            {/* Login View Modal */}
            {showLogin && (
                <LoginView onClose={() => setShowLogin(false)} showNotification={showNotification} />
            )}

            {/* Notification - Modal Style (Success/Add/Edit/Delete) */}
            {notification && notification.style === 'modal' && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
                    <div className="relative z-10 bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-4 animate-pop min-w-[180px]">
                        <div className={`p-3 rounded-full ${
                            notification.type === 'add' ? 'bg-[#748E78]/10 text-muji-green' :
                            (notification.type === 'delete') ? 'bg-[#C85A5A]/10 text-muji-red' :
                            (notification.type === 'backup') ? 'bg-blue-50 text-blue-500' :
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
                            {editingRecord.category === 'daily' && <DailyForm initialData={editingRecord} onSubmit={handleUpdateRecord} categories={categories} isEditing showNotification={showNotification} templates={templates} setTemplates={setTemplates} onDeleteTemplate={handleDeleteTemplate} />}
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
                                    
                                    {/* Auth Section */}
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                        {user ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-muji-ink text-white flex items-center justify-center font-bold text-sm">
                                                        {user.email ? user.email[0].toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400">目前登入</p>
                                                        <p className="text-sm font-bold text-muji-text truncate max-w-[120px]">{user.displayName || user.email}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => { signOut(auth); showNotification("已登出", "success"); }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">登出</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setShowLogin(true)} className="w-full py-2 bg-muji-ink text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition">
                                                登入 / 註冊雲端帳號
                                            </button>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-2 text-center">
                                            {user ? "資料已自動同步至雲端" : "目前使用本機儲存，登入後可跨裝置同步"}
                                        </p>
                                    </div>

                                    <div>
                                        <div className="space-y-1">
                                            <SettingsItem icon={<Icons.List size={18}/>} label="類別管理" onClick={()=>setSettingsPage('categories')} subLabel="自訂收支項目"/>
                                            <SettingsItem icon={<Icons.Users size={18}/>} label="麻友管理" onClick={()=>setSettingsPage('players')} subLabel="設定牌咖名單"/>
                                            <SettingsItem icon={<Icons.Bookmark size={18}/>} label="樣板管理" onClick={()=>setSettingsPage('templates')} subLabel="管理快速記帳樣板"/>
                                            <div className="h-[1px] bg-gray-200 ml-10 my-1"></div>
                                            <SettingsItem icon={<Icons.DownloadCloud size={18}/>} label="備份資料 (JSON)" onClick={handleExportJSON} subLabel="下載完整備份檔"/>
                                            <SettingsItem icon={<Icons.UploadCloud size={18}/>} label="還原資料" onClick={handleImportClick} subLabel="匯入備份檔"/>
                                            <div className="h-[1px] bg-gray-200 ml-10 my-1"></div>
                                            <SettingsItem icon={<Icons.Download size={18}/>} label="匯出報表" onClick={exportToExcel} subLabel="下載 CSV Excel"/>
                                        </div>
                                        {/* Hidden File Input for Restore */}
                                        <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                                    </div>
                                    <div className="pt-8"><SettingsItem icon={<Icons.Trash size={18}/>} label="清除所有資料" onClick={handleClearAllData} isDestructive/></div>
                                </div>
                            ) : settingsPage === 'categories' ? (
                                <CategorySettings categories={categories} onAdd={addCategory} onRemove={removeCategory} setCategories={setCategories} showNotification={showNotification} />
                            ) : settingsPage === 'players' ? (
                                <PlayerSettings players={mahjongPlayers} onAdd={addPlayer} onRemove={removePlayer} setPlayers={setMahjongPlayers} showNotification={showNotification} />
                            ) : (
                                <TemplateSettings templates={templates} onDelete={handleDeleteTemplate} onRename={handleRenameTemplate} showNotification={showNotification} />
                            )}
                        </div>
                        <div className="p-6 text-center border-t border-white/50">
                            <p className="text-[10px] text-gray-400 font-sans tracking-widest uppercase">
                                Life Journal {year} • V2.0 <br/> {user ? 'Cloud Mode' : 'Local Mode'}
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
                                {currentCategory === 'daily' && <DailyForm onAdd={handleAddRecord} categories={categories} showNotification={showNotification} templates={templates} setTemplates={setTemplates} onDeleteTemplate={handleDeleteTemplate} />}
                                {currentCategory === 'tea' && <TeaForm onAdd={handleAddRecord} records={records} showNotification={showNotification} />}
                                {currentCategory === 'mahjong' && <MahjongForm onAdd={handleAddRecord} records={records} showNotification={showNotification} players={mahjongPlayers} />}
                            </div>
                        </div>
                    )}
                    {currentTab === 'calendar' && <CalendarView records={records} onDelete={handleDelete} onEdit={setEditingRecord} onDuplicate={handleDuplicateRecord} category={currentCategory} isSearchMode={isSearchMode} setIsSearchMode={setIsSearchMode} />}
                    {currentTab === 'stats' && <StatsView records={records} category={currentCategory} categories={categories} />}
                </div>
            </main>

            {/* Footer Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
                <div className="px-4 pb-2"><CategoryTabs current={currentCategory} set={setCurrentCategory} /></div>
                <nav className="bg-white shadow-nav flex justify-around items-center pb-safe pt-2 border-t border-gray-100">
                    <NavBtn active={currentTab === 'calendar'} onClick={() => { setCurrentTab('calendar'); setIsSearchMode(false); }} icon={<Icons.Calendar />} />
                    <NavBtn active={currentTab === 'add'} onClick={() => { setCurrentTab('add'); setIsSearchMode(false); }} icon={<Icons.Plus />} />
                    <NavBtn active={currentTab === 'stats'} onClick={() => { setCurrentTab('stats'); setIsSearchMode(false); }} icon={<Icons.PieChart />} />
                </nav>
            </div>
        </div>
    );
};

export default App;