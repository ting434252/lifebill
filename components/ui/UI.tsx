import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { AppRecord, CategoryType } from '../../types';

// Helper
const formatMoney = (amount: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// DatePicker
export const FormDatePicker = ({ value, onChange }: { value: string, onChange: (e: { target: { value: string } }) => void }) => {
    const [show, setShow] = useState(false);
    const [viewDate, setViewDate] = useState(new Date(value || new Date()));

    useEffect(() => { if (show) setViewDate(new Date(value || new Date())); }, [show, value]);

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const offset = startDay === 0 ? 6 : startDay - 1; 
    
    const handleDayClick = (day: number) => {
        const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        onChange({ target: { value: dateStr } });
        setShow(false);
    };
    const changeMonth = (delta: number) => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + delta)));
    const jumpToToday = () => { setViewDate(new Date()); onChange({ target: { value: getTodayString() } }); setShow(false); };
    const displayDate = value ? value.replace(/-/g, ' . ') : '選擇日期';

    return (
        <div className="relative w-full">
            <button onClick={() => setShow(!show)} className="w-full bg-transparent font-sans text-muji-text text-sm outline-none border-b border-gray-200 py-2 text-left flex justify-between items-center">
                <span>{displayDate}</span><Icons.Calendar size={16} className="text-gray-400" />
            </button>
            {show && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setShow(false)}></div>
                    <div className="absolute top-full left-0 mt-2 bg-white p-4 rounded-xl shadow-xl z-50 w-64 border border-gray-100 animate-pop">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center">
                                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full"><Icons.ChevronLeft size={16}/></button>
                                <span className="font-bold text-muji-ink text-sm mx-1">{viewDate.getFullYear()} . {String(viewDate.getMonth()+1).padStart(2,'0')}</span>
                                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full"><Icons.ChevronRight size={16}/></button>
                            </div>
                            <button onClick={jumpToToday} className="p-1.5 rounded-full bg-muji-paper text-muji-ink hover:bg-muji-ink hover:text-white transition-colors" title="回到今天"><Icons.Target size={14}/></button>
                        </div>
                        <div className="grid grid-cols-7 text-center text-[10px] text-gray-400 mb-1"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({length: offset}).map((_,i)=><div key={`empty-${i}`}/>)}
                            {Array.from({length: daysInMonth}).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                                return ( <button key={day} onClick={() => handleDayClick(day)} className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors ${value === dateStr ? 'bg-muji-ink text-white shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}>{day}</button> );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Rating Input
export const RatingInput = ({ value = 0, onChange }: { value: number, onChange: (v: number) => void }) => {
    const handleStarClick = (index: number) => onChange(value === index ? index - 0.5 : value === index - 0.5 ? index : index - 0.5);
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => handleStarClick(star)} className="focus:outline-none transition-transform active:scale-90">
                    <Icons.Star size={20} fill={value >= star - 0.5} half={value === star - 0.5} />
                </button>
            ))}
            <span className="text-xs text-gray-400 ml-1 font-mono w-6 text-right">{value > 0 ? value : ''}</span>
        </div>
    );
};

// Confirm Modal
export const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, isDestructive }: { isOpen: boolean, message: string, onConfirm: () => void, onCancel: () => void, isDestructive?: boolean }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onCancel}></div>
            <div className="bg-white rounded-2xl shadow-modal w-full max-w-xs relative z-10 p-6 animate-pop flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-muji-red' : 'bg-gray-50 text-muji-ink'}`}>
                    {isDestructive ? <Icons.AlertCircle size={24}/> : <Icons.AlertCircle size={24}/>}
                </div>
                <h3 className="text-lg font-bold text-muji-text mb-2">確認提示</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition">取消</button>
                    <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition ${isDestructive ? 'bg-muji-red hover:bg-red-600' : 'bg-muji-ink hover:opacity-90'}`}>確定</button>
                </div>
            </div>
        </div>
    );
};

// Summary Card
export const SummaryCard = ({ category, records }: { category: CategoryType, records: AppRecord[] }) => {
    const currentMonth = new Date().getMonth();
    const monthly = records.filter(r => new Date(r.date).getMonth() === currentMonth);
    const cardClass = "bg-muji-ink text-white p-4 rounded-2xl shadow-float relative overflow-hidden transition-colors duration-300";
    const Decor = () => <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 pointer-events-none"/>;

    if (category === 'daily') {
        const inc = monthly.filter(r => r.category === 'daily' && r.type === 'income').reduce((a, c) => a + Number(c.amount), 0);
        const exp = monthly.filter(r => r.category === 'daily' && r.type === 'expense').reduce((a, c) => a + Number(c.amount), 0);
        return (
            <div className={cardClass}>
                <Decor/>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-[9px] uppercase tracking-widest opacity-80 mb-0.5">本月結餘</p>
                        <p className="text-2xl font-bold font-sans drop-shadow-sm">{formatMoney(inc-exp)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-[1px] h-6 bg-white/20"></div>
                        <div className="text-center"><p className="text-[9px] opacity-70 mb-0.5">收</p><p className="text-base font-bold font-sans">{formatMoney(inc)}</p></div>
                        <div className="text-center"><p className="text-[9px] opacity-70 mb-0.5">支</p><p className="text-base font-bold font-sans">{formatMoney(exp)}</p></div>
                    </div>
                </div>
            </div>
        );
    }
    if (category === 'tea') {
        const tea = monthly.filter(r=>r.category==='tea');
        return (
                <div className={cardClass}>
                <Decor/>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-[9px] uppercase tracking-widest opacity-80 mb-0.5">本月總花費</p>
                        <p className="text-2xl font-bold font-sans drop-shadow-sm">{formatMoney(tea.reduce((a,c)=>a+c.amount,0))}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-[1px] h-6 bg-white/20"></div>
                        <div className="text-center"><p className="text-[9px] opacity-70 mb-0.5">累積杯數</p><p className="text-base font-bold font-sans">{tea.length} 杯</p></div>
                    </div>
                </div>
            </div>
        );
    }
    if (category === 'mahjong') {
        const mj = monthly.filter(r => r.category === 'mahjong') as any[];
        const wins = mj.filter(r => r.isWin).length;
        const losses = mj.length - wins;
        const net = mj.reduce((a,c) => a + (c.isWin ? c.amount : -c.amount), 0);
        const rate = mj.length ? Math.round((wins/mj.length)*100) : 0;
        return (
            <div className={cardClass}>
                <Decor/>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-[9px] uppercase tracking-widest opacity-80 mb-0.5">本月淨利</p>
                        <p className="text-2xl font-bold font-sans drop-shadow-sm">{formatMoney(net)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-[1px] h-6 bg-white/20"></div>
                        <div className="text-center"><p className="text-[9px] opacity-70 mb-0.5">勝率</p><p className="text-base font-bold font-sans">{rate}%</p></div>
                        <div className="text-center"><p className="text-[9px] opacity-70 mb-0.5">勝</p><p className="text-base font-bold font-sans">{wins}</p></div>
                        <div className="text-center"><p className="text-[9px] opacity-70 mb-0.5">敗</p><p className="text-base font-bold font-sans">{losses}</p></div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};
