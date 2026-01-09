
import React from 'react';
import { ParsedOrder, User, AppData } from '../../types';
import SearchableProductDropdown from '../common/SearchableProductDropdown';

export type DateRangePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

export interface FilterState {
    datePreset: DateRangePreset;
    startDate: string;
    endDate: string;
    team: string;
    user: string;
    paymentStatus: string;
    shippingService: string;
    product: string;
    bank: string;
    fulfillmentStore: string;
    page: string;
    location: string;
    internalCost: string;
}

interface OrderFiltersProps {
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    orders: ParsedOrder[];
    usersList: User[];
    appData: AppData;
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

const OrderFilters: React.FC<OrderFiltersProps> = ({ 
    filters, setFilters, orders, usersList, appData, calculatedRange 
}) => {
    
    // ទាញយក Unique Values ពីទិន្នន័យដែលមានស្រាប់
    const uniqueValues = React.useMemo(() => {
        const pages = new Set<string>();
        const locations = new Set<string>();
        const shippingMethods = new Set<string>();
        const fulfillmentStores = new Set<string>();
        const banks = new Set<string>();
        const costs = new Set<string>();
        const teams = new Set<string>();

        orders.forEach(o => {
            if (o.Page) pages.add(o.Page);
            if (o.Location) locations.add(o.Location);
            if (o['Internal Shipping Method']) shippingMethods.add(o['Internal Shipping Method']);
            if (o['Fulfillment Store']) fulfillmentStores.add(o['Fulfillment Store']);
            if (o['Payment Info']) banks.add(o['Payment Info']);
            if (o['Internal Cost'] !== undefined) costs.add(String(o['Internal Cost']));
            if (o.Team) teams.add(o.Team);
        });

        return {
            pages: Array.from(pages).sort(),
            locations: Array.from(locations).sort(),
            shippingMethods: Array.from(shippingMethods).sort(),
            fulfillmentStores: Array.from(fulfillmentStores).sort(),
            banks: Array.from(banks).sort(),
            costs: Array.from(costs).sort((a, b) => Number(a) - Number(b)),
            teams: Array.from(teams).sort()
        };
    }, [orders]);

    const handleReset = () => {
        setFilters({
            datePreset: 'this_month', startDate: '', endDate: '', team: '', user: '',
            paymentStatus: '', shippingService: '', product: '', bank: '',
            fulfillmentStore: '', page: '', location: '', internalCost: ''
        });
    };

    return (
        <div className="space-y-8">
            {/* Temporal Window Filter */}
            <div className="bg-white/5 p-5 rounded-[1.8rem] border border-white/5 shadow-inner">
                <label className="text-[10px] font-black text-blue-500 mb-3 block uppercase tracking-[0.2em] ml-2">Temporal Window</label>
                <select 
                    value={filters.datePreset} 
                    onChange={e => setFilters({...filters, datePreset: e.target.value as any})} 
                    className="form-select !bg-gray-900 border-gray-800 !py-3.5 !px-5 rounded-2xl font-bold text-gray-200 focus:border-blue-500/50"
                >
                    {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <div className="mt-3 bg-black/40 p-3 rounded-xl text-center text-[10px] font-mono text-gray-500 border border-white/5 uppercase tracking-widest">
                    {calculatedRange}
                </div>
            </div>

            {filters.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in px-1">
                    <div>
                        <label className="text-[9px] font-black text-gray-600 mb-1.5 ml-2 uppercase">From</label>
                        <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="form-input !bg-gray-900 border-gray-800 rounded-xl !py-3" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-gray-600 mb-1.5 ml-2 uppercase">To</label>
                        <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="form-input !bg-gray-900 border-gray-800 rounded-xl !py-3" />
                    </div>
                </div>
            )}

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 px-1">
                {/* 1. Team Allocation */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Team Allocation</label>
                    <select value={filters.team} onChange={e => setFilters({...filters, team: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Operational Teams</option>
                        {uniqueValues.teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* 2. Source Page */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Source Page</label>
                    <select value={filters.page} onChange={e => setFilters({...filters, page: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Pages</option>
                        {uniqueValues.pages.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                {/* 3. Geography (Location) */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Geography (Location)</label>
                    <select value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Regions</option>
                        {uniqueValues.locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                {/* 4. Logistics Method */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Logistics Method</label>
                    <select value={filters.shippingService} onChange={e => setFilters({...filters, shippingService: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Shipping Methods</option>
                        {uniqueValues.shippingMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* 5. Exp. Cost (Internal) */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Exp. Cost (Internal)</label>
                    <select value={filters.internalCost} onChange={e => setFilters({...filters, internalCost: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Costs</option>
                        {uniqueValues.costs.map(c => <option key={c} value={c}>${c}</option>)}
                    </select>
                </div>

                {/* 6. Bank Account */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">គណនីធនាគារ (Bank)</label>
                    <select value={filters.bank} onChange={e => setFilters({...filters, bank: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Bank Accounts</option>
                        {uniqueValues.banks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

                {/* 7. Fulfillment Store */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Fulfillment Store</label>
                    <select value={filters.fulfillmentStore} onChange={e => setFilters({...filters, fulfillmentStore: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Stores</option>
                        {uniqueValues.fulfillmentStores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* 8. Merchant Node */}
                <div>
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Merchant Node (User)</label>
                    <select value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})} className="form-select !bg-gray-900 border-gray-800 !py-3.5 rounded-2xl font-bold">
                        <option value="">All Registered Users</option>
                        {usersList.map(u => <option key={u.UserName} value={u.UserName}>{u.FullName}</option>)}
                    </select>
                </div>

                {/* 9. Product Asset */}
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 mb-2 block uppercase tracking-widest ml-2">Asset Selection (Product)</label>
                    <SearchableProductDropdown 
                        products={appData.products} 
                        selectedProductName={filters.product} 
                        onSelect={val => setFilters({...filters, product: val})} 
                        showTagEditor={false} 
                    />
                </div>
            </div>

            {/* Reset Action */}
            <div className="pt-4">
                <button 
                    onClick={handleReset}
                    className="w-full py-4 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:text-white border border-dashed border-gray-800 rounded-2xl transition-all active:scale-95"
                >
                    Reset All Configurations
                </button>
            </div>
        </div>
    );
};

export default OrderFilters;
