
import React from 'react';
import { DateRangePreset } from '../OrderFilters';

interface DateWindowFilterProps {
    datePreset: DateRangePreset;
    setDatePreset: (preset: DateRangePreset) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    calculatedRange: string;
}

const datePresets: { label: string, value: DateRangePreset }[] = [
    { label: 'ទាំងអស់ (All Time)', value: 'all' },
    { label: 'ថ្ងៃនេះ (Today)', value: 'today' },
    { label: 'ម្សិលមិញ (Yesterday)', value: 'yesterday' },
    { label: 'សប្តាហ៍នេះ (This Week)', value: 'this_week' },
    { label: 'សប្តាហ៍មុន (Last Week)', value: 'last_week' },
    { label: 'ខែនេះ (This Month)', value: 'this_month' },
    { label: 'ខែមុន (Last Month)', value: 'last_month' },
    { label: 'ឆ្នាំនេះ (This Year)', value: 'this_year' },
    { label: 'ឆ្នាំមុន (Last Year)', value: 'last_year' },
    { label: 'កំណត់ខ្លួនឯង (Custom)', value: 'custom' },
];

const DateWindowFilter: React.FC<DateWindowFilterProps> = ({
    datePreset, setDatePreset, startDate, setStartDate, endDate, setEndDate, calculatedRange
}) => {
    return (
        <>
            <div className="bg-white/5 p-5 rounded-[1.8rem] border border-white/5 shadow-inner">
                <label className="text-[10px] font-black text-blue-500 mb-3 block uppercase tracking-[0.2em] ml-2">Temporal Window</label>
                <select 
                    value={datePreset} 
                    onChange={e => setDatePreset(e.target.value as any)} 
                    className="form-select !bg-gray-900 border-gray-800 !py-3.5 !px-5 rounded-2xl font-bold text-gray-200 focus:border-blue-500/50"
                >
                    {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <div className="mt-3 bg-black/40 p-3 rounded-xl text-center text-[10px] font-mono text-gray-500 border border-white/5 uppercase tracking-widest">
                    {calculatedRange}
                </div>
            </div>

            {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in px-1">
                    <div>
                        <label className="text-[9px] font-black text-gray-600 mb-1.5 ml-2 uppercase">From</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input !bg-gray-900 border-gray-800 rounded-xl !py-3" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-gray-600 mb-1.5 ml-2 uppercase">To</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input !bg-gray-900 border-gray-800 rounded-xl !py-3" />
                    </div>
                </div>
            )}
        </>
    );
};

export default DateWindowFilter;
