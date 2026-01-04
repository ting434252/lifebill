import React, { useState, useMemo } from 'react';
import { AppRecord, CategoryType, CategoryConfig, DailyRecord, TeaRecord, MahjongRecord } from '../../types';
import { Icons } from '../Icons';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, CartesianGrid, XAxis } from 'recharts';

const formatMoney = (amount: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(amount);
const COLORS = ['#748E78', '#C85A5A', '#D3C4A5', '#BBADA2', '#999999'];

interface StatsViewProps {
    records: AppRecord[];
    category: CategoryType;
    categories: CategoryConfig;
}

export const StatsView: React.FC<StatsViewProps> = ({ records, category, categories }) => {
    const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
    const [dailyType, setDailyType] = useState<'income' | 'expense'>('expense');
    
    // Tea Filter States
    const [showTeaList, setShowTeaList] = useState(false);
    const [teaFilter, setTeaFilter] = useState({ shop: 'all', month: 'all', rating: 'all' });

    // Filter records based on time range
    const filteredRecords = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return records.filter(r => {
            if (r.category !== category) return false;
            const d = new Date(r.date);
            if (timeRange === 'month') {
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }
            return d.getFullYear() === currentYear;
        });
    }, [records, category, timeRange]);

    // Daily Stats
    const dailyStats = useMemo(() => {
        if (category !== 'daily') return null;
        
        const relevantRecords = filteredRecords.filter(r => (r as DailyRecord).type === dailyType) as DailyRecord[];
        const grp = relevantRecords.reduce((a,c) => { a[c.subCategory] = (a[c.subCategory]||0) + Number(c.amount); return a; }, {} as Record<string, number>);
        
        const totalAmount = Object.values(grp).reduce((a, b) => a + b, 0);
        const chartData = Object.keys(grp).map(k => ({ 
            name: k, 
            value: grp[k],
            percent: totalAmount ? Math.round((grp[k] / totalAmount) * 100) : 0
        })).sort((a, b) => b.value - a.value);
        
        const categoryTotals = Object.keys(grp)
            .map(k => ({ subCategory: k, amount: grp[k] }))
            .sort((a, b) => b.amount - a.amount);

        let trendData: any[] = [];
        if (timeRange === 'year') {
            const monthly = Array(12).fill(0).map((_, i) => ({ name: `${i+1}月`, income: 0, expense: 0 }));
            records.filter(r => r.category === 'daily' && new Date(r.date).getFullYear() === new Date().getFullYear()).forEach(r => {
                const m = new Date(r.date).getMonth();
                if ((r as DailyRecord).type === 'income') monthly[m].income += Number(r.amount);
                else monthly[m].expense += Number(r.amount);
            });
            trendData = monthly;
        } else {
            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            const daily = Array(daysInMonth).fill(0).map((_, i) => ({ name: `${i+1}`, value: 0 }));
            filteredRecords.filter(r => (r as DailyRecord).type === dailyType).forEach(r => {
                const d = new Date(r.date).getDate() - 1;
                if (daily[d]) daily[d].value += Number(r.amount);
            });
            trendData = daily;
        }

        return { chartData, categoryTotals, trendData };
    }, [filteredRecords, category, timeRange, records, dailyType]);

    // Tea Stats
    const teaStats = useMemo(() => {
        if (category !== 'tea') return null;
        const ts = filteredRecords as TeaRecord[];
        
        if (!ts.length) return { shop: '-', item: '-', cups: 0, filteredList: [], options: { shops: [], months: [] } };
        const sc: Record<string, number> = {}, ic: Record<string, number> = {};
        
        const shopsSet = new Set<string>();
        const monthsSet = new Set<number>();

        ts.forEach(t => { 
            sc[t.shop] = (sc[t.shop]||0)+1; 
            ic[t.item] = (ic[t.item]||0)+1;
            shopsSet.add(t.shop);
            monthsSet.add(new Date(t.date).getMonth() + 1);
        });
        
        const filteredList = ts.filter(t => {
            if (teaFilter.shop !== 'all' && t.shop !== teaFilter.shop) return false;
            // Apply month filter only if viewing 'Year' (since 'Month' view is already filtered to current month)
            if (timeRange === 'year' && teaFilter.month !== 'all' && (new Date(t.date).getMonth() + 1).toString() !== teaFilter.month) return false;
            if (teaFilter.rating !== 'all' && t.rating < Number(teaFilter.rating)) return false;
            return true;
        });

        return { 
            shop: Object.keys(sc).reduce((a,b)=>sc[a]>sc[b]?a:b, '-'), 
            item: Object.keys(ic).reduce((a,b)=>ic[a]>ic[b]?a:b, '-'), 
            cups: ts.length,
            filteredList,
            options: { shops: Array.from(shopsSet), months: Array.from(monthsSet).sort((a,b)=>a-b) }
        };
    }, [filteredRecords, category, teaFilter, timeRange]);

    // Mahjong Stats
    const mahjongStats = useMemo(() => {
        if (category !== 'mahjong') return null;
        const mj = filteredRecords as MahjongRecord[];
        
        const wins = mj.filter(r => r.isWin).length;
        const losses = mj.length - wins;
        const winRate = mj.length ? Math.round((wins / mj.length) * 100) : 0;
        
        const yearlyRecords = records.filter(r => r.category === 'mahjong' && new Date(r.date).getFullYear() === new Date().getFullYear()) as MahjongRecord[];
        const monthlyNet = Array(12).fill(0);
        yearlyRecords.forEach(r => {
            const m = new Date(r.date).getMonth();
            monthlyNet[m] += r.isWin ? Number(r.amount) : -Number(r.amount);
        });
        
        const activeMonths = monthlyNet.filter(v => v !== 0);
        const maxWinMonthVal = activeMonths.length ? Math.max(...activeMonths) : 0;
        const maxLossMonthVal = activeMonths.length ? Math.min(...activeMonths) : 0;
        const maxWinMonth = maxWinMonthVal > 0 ? maxWinMonthVal : 0;
        const maxLossMonth = maxLossMonthVal < 0 ? maxLossMonthVal : 0;

        const playerStats: Record<string, { games: number, wins: number }> = {};
        mj.forEach(game => {
            if (game.players) {
                game.players.forEach(player => {
                    if (!playerStats[player]) playerStats[player] = { games: 0, wins: 0 };
                    playerStats[player].games += 1;
                    if (game.isWin) playerStats[player].wins += 1;
                });
            }
        });
        const playerList = Object.keys(playerStats).map(p => ({
            name: p,
            games: playerStats[p].games,
            winRate: Math.round((playerStats[p].wins / playerStats[p].games) * 100)
        })).sort((a,b) => b.winRate - a.winRate);

        return { wins, losses, winRate, maxWinMonth, maxLossMonth, playerList };
    }, [filteredRecords, category, records]);

    return (
        <div className="px-6 animate-fade-in mb-6 space-y-4">
            
            {/* Header Controls Container */}
            <div className="relative flex justify-center items-center mb-4 min-h-[40px]">
                
                {/* Time Filter - Centered and Original Size */}
                <div className="bg-white p-1 rounded-xl flex shadow-sm border border-gray-100 w-[180px] relative z-10">
                    <button onClick={() => setTimeRange('month')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${timeRange === 'month' ? 'bg-muji-ink text-white shadow-sm' : 'text-gray-400'}`}>本月</button>
                    <button onClick={() => setTimeRange('year')} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${timeRange === 'year' ? 'bg-muji-ink text-white shadow-sm' : 'text-gray-400'}`}>全年</button>
                </div>

                {/* Type Filter - Absolute Right & Smaller */}
                {category === 'daily' && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
                         <div className="bg-gray-100 p-0.5 rounded-lg flex shadow-inner">
                            <button onClick={() => setDailyType('expense')} className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${dailyType === 'expense' ? 'bg-white shadow text-muji-green font-bold' : 'text-gray-400'}`}>支出</button>
                            <button onClick={() => setDailyType('income')} className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${dailyType === 'income' ? 'bg-white shadow text-muji-red font-bold' : 'text-gray-400'}`}>收入</button>
                        </div>
                    </div>
                )}
            </div>

            {category === 'daily' && dailyStats && (
                <>
                    {/* Trend Chart (LineChart) */}
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-center text-xs tracking-widest uppercase mb-4 text-gray-400">{timeRange === 'year' ? '年度收支走勢' : (dailyType === 'expense' ? '本月支出走勢' : '本月收入走勢')}</h3>
                        <div className="h-40">
                            <ResponsiveContainer>
                                <LineChart data={dailyStats.trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} interval={timeRange === 'year' ? 0 : 4} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                        formatter={(val: any) => formatMoney(val)}
                                        cursor={{ stroke: '#eee', strokeWidth: 1 }}
                                    />
                                    {timeRange === 'year' ? (
                                        <>
                                            <Line type="monotone" dataKey="income" stroke="#C85A5A" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="expense" stroke="#748E78" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        </>
                                    ) : (
                                        <Line 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke={dailyType === 'income' ? "#C85A5A" : "#748E78"} 
                                            strokeWidth={3} 
                                            dot={false}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-muji-white p-6 rounded-3xl shadow-card border border-muji-border">
                        <h3 className="text-center text-xs tracking-widest uppercase mb-4 text-gray-400">{dailyType === 'expense' ? '支出' : '收入'}類別佔比</h3>
                        {dailyStats.chartData.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <div className="h-48 w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={dailyStats.chartData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                {dailyStats.chartData.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                                            </Pie>
                                            <Tooltip formatter={(v: any)=>formatMoney(v)}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full space-y-2 mt-2">
                                    {dailyStats.chartData.map((entry, index) => (
                                        <div key={index} className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                                <span className="text-gray-600">{entry.name}</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="font-medium text-muji-text">{formatMoney(entry.value)}</span>
                                                <span className="text-gray-400 w-8 text-right">{entry.percent}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : <div className="text-center py-10 text-gray-300">無數據</div>}
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-xs tracking-widest uppercase mb-3 text-gray-400">{dailyType === 'expense' ? '支出' : '收入'}類別總計</h3>
                        {dailyStats.categoryTotals.map((e, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-muji-ink w-4">{i+1}</span>
                                    <div>
                                        <p className="text-sm text-muji-text">{e.subCategory}</p>
                                    </div>
                                </div>
                                <span className={`text-sm font-medium ${dailyType === 'income' ? 'text-muji-red' : 'text-muji-green'}`}>{formatMoney(e.amount)}</span>
                            </div>
                        ))}
                        {dailyStats.categoryTotals.length === 0 && <div className="text-center py-4 text-gray-300 text-xs">無紀錄</div>}
                    </div>
                </>
            )}

            {category === 'tea' && teaStats && (
                <>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="text-center flex-1 border-r border-gray-100 last:border-0">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">最常去</p>
                            <p className="text-sm font-medium text-muji-text truncate px-1">{teaStats.shop}</p>
                        </div>
                        <div className="text-center flex-1 border-r border-gray-100 last:border-0">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">必點</p>
                            <p className="text-sm font-medium text-muji-text truncate px-1">{teaStats.item}</p>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">總杯數</p>
                            <p className="text-lg font-bold text-muji-text">{teaStats.cups}</p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
                            <select 
                                value={teaFilter.shop} 
                                onChange={(e) => setTeaFilter({...teaFilter, shop: e.target.value})}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 outline-none min-w-[80px]"
                            >
                                <option value="all">所有店家</option>
                                {teaStats.options.shops.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            
                            {/* Hide month filter if viewing 'Month' range, as it's redundant */}
                            {timeRange === 'year' && (
                                <select 
                                    value={teaFilter.month} 
                                    onChange={(e) => setTeaFilter({...teaFilter, month: e.target.value})}
                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 outline-none min-w-[70px]"
                                >
                                    <option value="all">所有月份</option>
                                    {teaStats.options.months.map(m => <option key={m} value={m.toString()}>{m}月</option>)}
                                </select>
                            )}

                            <select 
                                value={teaFilter.rating} 
                                onChange={(e) => setTeaFilter({...teaFilter, rating: e.target.value})}
                                className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 outline-none min-w-[80px]"
                            >
                                <option value="all">所有評分</option>
                                <option value="5">5 星好評</option>
                                <option value="4">4 星以上</option>
                                <option value="3">3 星以上</option>
                            </select>
                        </div>

                        <button 
                            onClick={() => setShowTeaList(!showTeaList)} 
                            className="w-full py-2 mb-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition"
                        >
                            {showTeaList ? '收起清單' : '查看符合條件清單'}
                            <Icons.ChevronDown size={14} className={`transition-transform ${showTeaList ? 'rotate-180' : ''}`} />
                        </button>

                        {showTeaList && (
                            <div className="animate-slide-up space-y-3">
                                {teaStats.filteredList.length > 0 ? (
                                    teaStats.filteredList.map(item => (
                                        <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-muji-text">{item.shop}</span>
                                                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{item.date}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                    <span>{item.item}</span>
                                                    <span className="w-[1px] h-3 bg-gray-200"></span>
                                                    <span>{item.sugar}/{item.ice}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-muji-ink flex items-center">
                                                    {item.rating}<Icons.Star size={10} fill={true} className="ml-0.5"/>
                                                </span>
                                                <span className="text-xs text-gray-400 mt-1">${item.amount}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-300 text-xs">沒有符合條件的紀錄</div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {category === 'mahjong' && mahjongStats && (
                <>
                    <div className="bg-muji-ink text-white p-4 rounded-3xl shadow-float text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-[10px] tracking-widest uppercase opacity-80 mb-2">戰績總覽</h3>
                            <div className="flex justify-around items-end">
                                <div>
                                    <p className="text-xl font-bold font-sans text-white/90">{mahjongStats.wins}</p>
                                    <p className="text-[9px] uppercase mt-0.5 opacity-80">勝場</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold font-sans text-white/90">{mahjongStats.losses}</p>
                                    <p className="text-[9px] uppercase mt-0.5 opacity-80">敗場</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold font-sans text-white/90">{mahjongStats.winRate}%</p>
                                    <p className="text-[9px] uppercase mt-0.5 opacity-80">勝率</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <p className="text-[10px] text-gray-400 mb-1">{timeRange === 'year' ? '全年大賺' : '這個月贏了'}</p>
                            <p className="text-lg font-bold text-muji-red">{formatMoney(mahjongStats.maxWinMonth)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <p className="text-[10px] text-gray-400 mb-1">{timeRange === 'year' ? '全年小輸' : '這個月小小輸了'}</p>
                            <p className="text-lg font-bold text-muji-green">{formatMoney(mahjongStats.maxLossMonth)}</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-xs tracking-widest uppercase mb-4 text-gray-400">麻友對戰數據</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                                        <th className="pb-2 font-medium">麻友</th>
                                        <th className="pb-2 font-medium text-right">場數</th>
                                        <th className="pb-2 font-medium text-right">勝率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mahjongStats.playerList.map((p, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0 group">
                                            <td className="py-3 font-medium text-muji-text">{p.name}</td>
                                            <td className="py-3 text-right text-gray-500">{p.games}</td>
                                            <td className={`py-3 text-right font-bold ${p.winRate >= 50 ? 'text-muji-red' : 'text-muji-green'}`}>
                                                {p.winRate}%
                                            </td>
                                        </tr>
                                    ))}
                                    {mahjongStats.playerList.length === 0 && (
                                        <tr><td colSpan={3} className="py-4 text-center text-gray-300">無數據</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};