import React, { useState, useMemo } from 'react';
import { AppRecord, CategoryType, TeaRecord, MahjongRecord, DailyRecord } from '../../types';
import { Icons } from '../Icons';
import { SummaryCard } from '../ui/UI';

const formatMoney = (amount: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface CalendarViewProps {
    records: AppRecord[];
    onDelete: (id: string) => void;
    onEdit: (record: AppRecord) => void;
    category: CategoryType;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ records, onDelete, onEdit, category }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [selDate, setSelDate] = useState(getTodayString());
    const [showPicker, setShowPicker] = useState(false);
    
    const filteredRecords = useMemo(() => records.filter(r => r.category === category), [records, category]);
    
    const getDayInfo = (d: number) => {
        const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const rs = filteredRecords.filter(r => r.date === dateStr);
        const hasData = rs.length > 0;
        
        // For Daily
        let incCount = 0;
        let expCount = 0;
        // For Tea/Mahjong
        let count = 0;
        let total = 0;

        rs.forEach(c => {
            let val = Number(c.amount);
            
            if (c.category === 'daily') {
                if ((c as DailyRecord).type === 'income') {
                    incCount++;
                    total += val;
                } else {
                    expCount++;
                    total -= val;
                }
            } else if (c.category === 'mahjong') {
                count++; // Count number of games (jiang)
                if ((c as MahjongRecord).isWin) {
                     total += val;
                } else {
                     total -= val;
                }
            } else if (c.category === 'tea') {
                count++; // Count number of cups
                total -= val;
            }
        });

        return { dateStr, hasData, total, incCount, expCount, count };
    };

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const selRecords = filteredRecords.filter(r => r.date === selDate);
    
    const jumpToToday = () => { const now = new Date(); setViewDate(now); setSelDate(getTodayString()); setShowPicker(false); };
    const changeMonth = (m: number) => { const newDate = new Date(viewDate.getFullYear(), m, 1); setViewDate(newDate); setShowPicker(false); };
    const changeYear = (y: number) => { const newDate = new Date(y, viewDate.getMonth(), 1); setViewDate(newDate); setShowPicker(false); };

    return (
        <div className="px-6 animate-fade-in mb-6 relative">
            <div className="mb-2"><SummaryCard category={category} records={records} /></div>
            {showPicker && (
                <div className="absolute top-16 left-6 right-6 bg-white p-4 shadow-xl rounded-2xl z-20 border border-gray-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={() => changeYear(viewDate.getFullYear() - 1)} className="p-2 hover:bg-gray-100 rounded-full text-muji-ink"><Icons.ChevronLeft size={20}/></button>
                        <span className="font-bold text-xl text-muji-ink font-sans">{viewDate.getFullYear()}</span>
                        <button onClick={() => changeYear(viewDate.getFullYear() + 1)} className="p-2 hover:bg-gray-100 rounded-full text-muji-ink"><Icons.ChevronRight size={20}/></button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">{Array.from({length: 12}).map((_, i) => (<button key={i} onClick={() => changeMonth(i)} className={`p-2 rounded-lg text-sm font-sans font-medium transition-colors ${viewDate.getMonth() === i ? 'bg-muji-ink text-white' : 'hover:bg-gray-50 text-gray-600'}`}>{i + 1}月</button>))}</div>
                </div>
            )}
            <div className="bg-muji-white p-4 rounded-3xl shadow-card border border-muji-border relative z-10">
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="w-8"></div>
                    <button onClick={() => setShowPicker(!showPicker)} className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                        <h2 className="text-xl font-bold font-sans text-muji-ink tracking-widest">{viewDate.getFullYear()} . {String(viewDate.getMonth()+1).padStart(2,'0')}</h2>
                        <Icons.ChevronDown size={16} className={`text-muji-ink transition-transform duration-300 ${showPicker ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={jumpToToday} className="w-8 h-8 flex items-center justify-center rounded-full bg-muji-paper text-muji-ink hover:bg-muji-ink hover:text-white transition-colors" title="回到今天"><Icons.Target size={18} /></button>
                </div>
                <div className="grid grid-cols-7 text-center mb-2">{['一','二','三','四','五','六','日'].map((d,i)=><div key={d} className={`text-[10px] uppercase tracking-wider ${i>=5?'text-muji-red opacity-60':'text-gray-300'}`}>{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: offset}).map((_,i)=><div key={`empty-${i}`}/>)}
                    {Array.from({length: daysInMonth}).map((_,i)=> {
                        const day = i+1; const info = getDayInfo(day); const isSel = info.dateStr === selDate;
                        return ( 
                            <div key={day} onClick={()=>setSelDate(info.dateStr)} className={`flex flex-col items-center justify-start pt-1 cursor-pointer h-14 w-full mx-auto rounded-lg relative border transition-all duration-200 ${isSel ? 'border-muji-ink bg-muji-ink/5' : 'border-transparent hover:border-gray-100'}`}>
                                <span className={`relative z-10 text-[10px] font-medium leading-none ${isSel?'text-muji-ink font-bold':'text-gray-400'}`}>{day}</span>
                                {info.hasData && (
                                    <div className="flex flex-col items-center mt-1 w-full px-0.5">
                                        {/* Display logic based on Category */}
                                        {category === 'daily' && (
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                {info.incCount > 0 && <span className="flex items-center text-[8px] text-muji-red font-bold"><span className="w-1 h-1 rounded-full bg-muji-red mr-0.5"></span>{info.incCount}</span>}
                                                {info.expCount > 0 && <span className="flex items-center text-[8px] text-muji-green font-bold"><span className="w-1 h-1 rounded-full bg-muji-green mr-0.5"></span>{info.expCount}</span>}
                                            </div>
                                        )}
                                        {category === 'tea' && info.count > 0 && (
                                            <div className="mb-0.5">
                                                <span className="inline-block px-1.5 py-0.5 rounded-full bg-muji-kraft text-white text-[8px] leading-none font-medium scale-90">{info.count}杯</span>
                                            </div>
                                        )}
                                        {category === 'mahjong' && info.count > 0 && (
                                             <div className="mb-0.5">
                                                <span className="inline-block px-1.5 py-0.5 rounded-full bg-muji-ink text-white text-[8px] leading-none font-medium scale-90">{info.count}將</span>
                                            </div>
                                        )}

                                        <span className={`text-[9px] font-bold tracking-tight leading-none ${info.total >= 0 ? 'text-muji-red' : 'text-muji-green'}`}>
                                            {Math.abs(info.total)}
                                        </span>
                                    </div>
                                )}
                            </div> 
                        );
                    })}
                </div>
            </div>
            <div className="mt-6 space-y-3">
                <h3 className="text-xs text-gray-400 uppercase tracking-widest pl-2 mb-2 font-sans">{selDate} • {category==='daily'?'日常':category==='tea'?'手搖':'麻將'}</h3>
                {selRecords.length === 0 && <div className="text-center py-8 text-gray-300 text-sm italic">本日無紀錄</div>}
                {selRecords.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between animate-slide-up border border-transparent hover:border-gray-200 group">
                        <div className="flex items-center gap-4">
                            <div className={`w-1 h-10 rounded-full ${r.category==='tea'?'bg-muji-kraft':((r as DailyRecord).type==='income'||(r as MahjongRecord).isWin)?'bg-muji-red':'bg-muji-green'}`}></div>
                            <div>
                                <p className="font-medium text-muji-text text-sm">{r.category==='daily'?(r as DailyRecord).subCategory:r.category==='tea'?(r as TeaRecord).shop:'麻將'}</p>
                                <p className="text-xs text-gray-400">
                                    {r.category==='tea' ? 
                                        <span className="flex items-center gap-1">{(r as TeaRecord).item} <span className="flex">{[...Array(5)].map((_,i) => <Icons.Star key={i} size={8} fill={(r as TeaRecord).rating >= i+1} half={(r as TeaRecord).rating === i+0.5} />)}</span></span> 
                                        : r.category==='mahjong' ? ((r as MahjongRecord).players ? (r as MahjongRecord).players.join(' / ') : r.note) 
                                        : r.note
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                            <p className={`font-sans font-medium ${(r.category==='daily'&&(r as DailyRecord).type==='income')||(r.category==='mahjong'&&(r as MahjongRecord).isWin)?'text-muji-red':'text-muji-green'}`}>{formatMoney(r.amount)}</p>
                            <div className="flex gap-1">
                                <button onClick={()=>onEdit(r)} className="text-gray-300 hover:text-muji-ink p-1"><Icons.Edit size={14}/></button>
                                <button onClick={()=>onDelete(r.id)} className="text-gray-300 hover:text-red-400 p-1"><Icons.Trash size={14}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};