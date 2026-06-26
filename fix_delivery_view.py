import re

with open('components/orders/DeliveryAgentView.tsx', 'r') as f:
    content = f.read()

# 1. Fix data fetching
fetch_target = """        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch(`${WEB_APP_URL}/api/admin/all-orders?days=30`, { headers });
                const result = await res.json();
                if (result.status === 'success') {
                    const allTargetIds = new Set([...orderIds, ...returnOrderIds, ...failedOrderIds]);
                    const found = result.data
                        .filter((o: any) => o && allTargetIds.has(o['Order ID']))
                        .map((o: any) => ({
                            ...o,
                            Products: o['Products (JSON)'] ? JSON.parse(o['Products (JSON)']) : [],
                            'Internal Cost': Number(o['Internal Cost']) || 0
                        }));
                    
                    setOrders(found);
                    const initialCosts: Record<string, number> = {};
                    found.forEach((o: any) => { initialCosts[o['Order ID']] = o['Internal Cost']; });
                    setCosts(initialCosts);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };"""

fetch_replacement = """        const fetchOrders = async () => {
            try {
                const allTargetIds = Array.from(new Set([...orderIds, ...returnOrderIds, ...failedOrderIds]));
                if (allTargetIds.length === 0) {
                    setOrders([]);
                    setLoading(false);
                    return;
                }
                
                const fetchPromises = allTargetIds.map(id => fetch(`${WEB_APP_URL}/api/order-metadata/${id}`).then(res => res.json()).catch(() => null));
                const results = await Promise.all(fetchPromises);
                
                const found = results
                    .filter((r: any) => r && r.status === 'success' && r.data)
                    .map((r: any) => {
                        const o = r.data;
                        return {
                            ...o,
                            Products: o['Products (JSON)'] ? JSON.parse(o['Products (JSON)']) : [],
                            'Internal Cost': Number(o['Internal Cost']) || 0
                        };
                    });
                
                setOrders(found);
                const initialCosts: Record<string, number> = {};
                found.forEach((o: any) => { initialCosts[o['Order ID']] = o['Internal Cost']; });
                setCosts(initialCosts);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };"""
content = content.replace(fetch_target, fetch_replacement)

# 2. Fix Address font size in the list
address_target = """                                                    <div className="flex items-center gap-2 mt-1 min-w-0">
                                                        <span className="text-[10px] font-bold text-gray-300 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B3139] uppercase tracking-widest shrink-0 shadow-inner">{o.Location}</span>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase truncate">
                                                            {o['Customer Name']}
                                                        </span>
                                                    </div>
                                                    
                                                    {o['Address Details'] && (
                                                        <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-gray-400 font-medium italic">
                                                            <span className="shrink-0 pt-0.5">↳</span>
                                                            <span className="truncate">{o['Address Details']}</span>
                                                        </div>
                                                    )}"""

address_replacement = """                                                    <div className="flex items-center gap-2 mt-1 min-w-0">
                                                        <span className="text-xs font-black text-gray-300 bg-[#0B0E11] px-2.5 py-1 rounded-md border border-[#2B3139] uppercase tracking-widest shrink-0 shadow-inner">{o.Location}</span>
                                                        <span className="text-[11px] font-black text-gray-400 uppercase truncate">
                                                            {o['Customer Name']}
                                                        </span>
                                                    </div>
                                                    
                                                    {o['Address Details'] && (
                                                        <div className="flex items-start gap-1.5 mt-1.5 text-xs text-gray-400 font-medium italic">
                                                            <span className="shrink-0 pt-0.5">↳</span>
                                                            <span className="truncate">{o['Address Details']}</span>
                                                        </div>
                                                    )}"""
content = content.replace(address_target, address_replacement)

# 3. Add $ symbol and up/down buttons to input
input_target = """                                                        <div className="w-32 relative group/input">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-black text-xs z-10 transition-colors group-hover/input:text-[#FCD535]">$</span>
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={costs[o['Order ID']] ?? ''} 
                                                                onChange={(e) => handleCostChange(o['Order ID'], e.target.value)} 
                                                                className="relative w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl py-2 pl-7 pr-3 text-right text-[15px] font-mono font-black text-[#FCD535] focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30 transition-all z-0 shadow-inner hover:border-[#2B3139]/80" 
                                                                placeholder="0.00" 
                                                            />
                                                            <div className="absolute -top-2 -right-1 bg-[#181A20] px-1 text-[8px] font-black text-gray-500 uppercase tracking-widest z-10">Ship Cost</div>
                                                        </div>"""

input_replacement = """                                                        <div className="w-32 relative group/input">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FCD535] font-black text-xs z-10 transition-colors pointer-events-none">$</span>
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={costs[o['Order ID']] ?? ''} 
                                                                onChange={(e) => handleCostChange(o['Order ID'], e.target.value)} 
                                                                className="relative w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl py-2 pl-6 pr-7 text-right text-base font-mono font-black text-[#FCD535] focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30 transition-all z-0 shadow-inner hover:border-[#2B3139]/80" 
                                                                placeholder="0.00" 
                                                            />
                                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-10">
                                                                <button onClick={(e) => { e.stopPropagation(); setCosts(prev => ({ ...prev, [o['Order ID']]: Number(((prev[o['Order ID']] || 0) + 0.25).toFixed(2)) })); }} className="text-gray-500 hover:text-[#0ECB81] focus:outline-none p-0.5 bg-[#181A20] rounded hover:bg-[#2B3139] active:scale-95 transition-all"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg></button>
                                                                <button onClick={(e) => { e.stopPropagation(); setCosts(prev => ({ ...prev, [o['Order ID']]: Math.max(0, Number(((prev[o['Order ID']] || 0) - 0.25).toFixed(2))) })); }} className="text-gray-500 hover:text-[#F6465D] focus:outline-none p-0.5 bg-[#181A20] rounded hover:bg-[#2B3139] active:scale-95 transition-all"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
                                                            </div>
                                                            <div className="absolute -top-2 -right-1 bg-[#181A20] px-1 text-[8px] font-black text-gray-500 uppercase tracking-widest z-10">Ship Cost</div>
                                                        </div>"""
content = content.replace(input_target, input_replacement)

# 4. Add Addresses to the Summary Card
summary_target = """                            <div className="flex justify-between items-center text-gray-600 font-bold pt-4 border-t border-[#2B3139]">
                                <span className="text-xs font-bold text-gray-500">❌ ដឹកមិនជោគជ័យ និង Return</span>
                                <span className="text-lg tracking-tighter text-gray-500">${(Number(financialStats.totalFailed) || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>"""

summary_replacement = """                            <div className="flex justify-between items-center text-gray-600 font-bold pt-4 border-t border-[#2B3139]">
                                <span className="text-xs font-bold text-gray-500">❌ ដឹកមិនជោគជ័យ និង Return</span>
                                <span className="text-lg tracking-tighter text-gray-500">${(Number(financialStats.totalFailed) || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* List of Orders with Addresses for Verification Protocol */}
                        <div className="bg-[#0B0E11]/80 p-5 rounded-[2rem] border border-[#2B3139] text-left space-y-3 shadow-inner max-h-[300px] overflow-y-auto mt-4 custom-scrollbar">
                            <h3 className="text-xs font-black text-[#FCD535] uppercase tracking-widest border-b border-[#2B3139] pb-2 mb-3">បញ្ជីទីតាំង & អាសយដ្ឋាន (Verification Protocol)</h3>
                            {orders.map((o, idx) => (
                                <div key={o['Order ID']} className="flex items-start gap-3 py-2 border-b border-[#2B3139]/50 last:border-0">
                                    <div className="w-6 h-6 rounded-lg bg-[#181A20] text-gray-400 font-black text-[9px] flex items-center justify-center shrink-0 border border-[#2B3139]">{idx + 1}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-gray-300 bg-[#181A20] px-2 py-0.5 rounded border border-[#2B3139] mb-1 inline-block uppercase">{o.Location}</span>
                                            {successSet.has(o['Order ID']) ? (
                                                <span className="text-[10px] font-black text-[#0ECB81]">+${(costs[o['Order ID']] || 0).toFixed(2)}</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-500">Failed</span>
                                            )}
                                        </div>
                                        {o['Address Details'] && (
                                            <p className="text-[11px] text-gray-500 italic mt-0.5 truncate">{o['Address Details']}</p>
                                        )}
                                        <p className="text-[10px] font-black text-gray-400 mt-1">{o['Customer Phone']}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>"""
content = content.replace(summary_target, summary_replacement)

with open('components/orders/DeliveryAgentView.tsx', 'w') as f:
    f.write(content)
