import re

with open('components/orders/DeliveryListGeneratorModal.tsx', 'r') as f:
    content = f.read()

# 1. Update Header to include Stepper
header_old = """                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 flex justify-between items-center border-b border-[#2B3139] bg-[#181A20] z-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-[#2B3139] flex items-center justify-center text-[#FCD535]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-widest text-gray-200">
                                {step === STEPS.FILTER ? 'Generate Dispatch List' : step === STEPS.VERIFY ? 'Verify Deliveries' : 'Execution Summary'}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81]"></span>
                                <span className="text-[9px] font-bold text-[#0ECB81] uppercase tracking-widest">Secure Logistics Core</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-sm bg-[#0B0E11] border border-[#2B3139] hover:bg-[#2B3139] text-gray-500 hover:text-white transition-colors flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>"""

header_new = """                {/* Header with Stepper */}
                <div className="flex-shrink-0 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#2B3139]/50 bg-[#181A20]/80 backdrop-blur-md z-50 sticky top-0 gap-4 sm:gap-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-[#2B3139] to-[#1E2329] shadow-[0_0_10px_rgba(43,49,57,0.3)] flex items-center justify-center text-[#FCD535] border border-[#2B3139]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold uppercase tracking-widest text-gray-200">
                                Dispatch Generator
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] shadow-[0_0_5px_rgba(14,203,129,0.5)]"></span>
                                <span className="text-[9px] font-bold text-[#0ECB81] uppercase tracking-widest">Secure Logistics Core</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                        <div className={`flex items-center gap-2 ${step >= STEPS.FILTER ? 'opacity-100' : 'opacity-40'} transition-all`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > STEPS.FILTER ? 'bg-[#0ECB81] text-black shadow-[0_0_10px_rgba(14,203,129,0.3)]' : step === STEPS.FILTER ? 'bg-[#FCD535] text-black shadow-[0_0_10px_rgba(252,213,53,0.3)]' : 'bg-[#2B3139] text-gray-400'}`}>{step > STEPS.FILTER ? '✓' : '1'}</div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-all ${step === STEPS.FILTER ? 'text-[#FCD535]' : step > STEPS.FILTER ? 'text-[#0ECB81]' : 'text-gray-500'}`}>Select</span>
                        </div>
                        <div className={`w-6 sm:w-10 h-[2px] transition-all ${step >= STEPS.VERIFY ? 'bg-[#0ECB81] shadow-[0_0_5px_rgba(14,203,129,0.5)]' : 'bg-[#2B3139]'}`}></div>
                        <div className={`flex items-center gap-2 ${step >= STEPS.VERIFY ? 'opacity-100' : 'opacity-40'} transition-all`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > STEPS.VERIFY ? 'bg-[#0ECB81] text-black shadow-[0_0_10px_rgba(14,203,129,0.3)]' : step === STEPS.VERIFY ? 'bg-[#FCD535] text-black shadow-[0_0_10px_rgba(252,213,53,0.3)]' : 'bg-[#2B3139] text-gray-400'}`}>{step > STEPS.VERIFY ? '✓' : '2'}</div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-all ${step === STEPS.VERIFY ? 'text-[#FCD535]' : step > STEPS.VERIFY ? 'text-[#0ECB81]' : 'text-gray-500'}`}>Verify</span>
                        </div>
                        <div className={`w-6 sm:w-10 h-[2px] transition-all ${step >= STEPS.SUMMARY ? 'bg-[#0ECB81] shadow-[0_0_5px_rgba(14,203,129,0.5)]' : 'bg-[#2B3139]'}`}></div>
                        <div className={`flex items-center gap-2 ${step >= STEPS.SUMMARY ? 'opacity-100' : 'opacity-40'} transition-all`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === STEPS.SUMMARY ? 'bg-[#0ECB81] text-black shadow-[0_0_10px_rgba(14,203,129,0.5)]' : 'bg-[#2B3139] text-gray-400'}`}>3</div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-all ${step === STEPS.SUMMARY ? 'text-[#0ECB81]' : 'text-gray-500'}`}>Summary</span>
                        </div>
                    </div>

                    <button onClick={onClose} className="absolute right-6 top-6 sm:static sm:top-auto sm:right-auto w-10 h-10 rounded-sm bg-[#0B0E11]/80 backdrop-blur-sm border border-[#2B3139] hover:bg-[#F6465D] hover:border-[#F6465D] hover:text-white text-gray-500 transition-all flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>"""

content = content.replace(header_old, header_new)

# 2. Control Panel
control_old = """                                {/* Control Panel */}
                                <div className="bg-[#181A20] border border-[#2B3139] rounded-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date Selection</label>
                                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-sm py-2.5 px-3 text-white text-xs font-mono focus:border-[#FCD535] outline-none transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Logistics Partner</label>
                                        <select value={selectedShipping} onChange={(e) => setSelectedShipping(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-sm py-2.5 px-3 text-white text-xs font-bold focus:border-[#FCD535] outline-none transition-colors">
                                            {appData.shippingMethods?.map(m => <option key={m.MethodName} value={m.MethodName}>{m.MethodName}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fulfillment Node</label>
                                        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-sm py-2.5 px-3 text-white text-xs font-bold focus:border-[#FCD535] outline-none transition-colors">
                                            {appData.stores?.map(s => <option key={s.StoreName} value={s.StoreName}>{s.StoreName}</option>)}
                                        </select>
                                    </div>
                                </div>"""

control_new = """                                {/* Control Panel */}
                                <div className="bg-gradient-to-r from-[#181A20] to-[#1E2329] border border-[#2B3139]/70 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-5 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FCD535] to-[#FCD535]/10"></div>
                                    <div className="space-y-2 pl-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#FCD535]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Date Selection</label>
                                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2.5 px-3 text-white text-xs font-mono focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30 outline-none transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#0ECB81]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Logistics Partner</label>
                                        <select value={selectedShipping} onChange={(e) => setSelectedShipping(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2.5 px-3 text-white text-xs font-bold focus:border-[#0ECB81] focus:ring-1 focus:ring-[#0ECB81]/30 outline-none transition-all shadow-inner">
                                            {appData.shippingMethods?.map(m => <option key={m.MethodName} value={m.MethodName}>{m.MethodName}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> Fulfillment Node</label>
                                        <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2.5 px-3 text-white text-xs font-bold focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30 outline-none transition-all shadow-inner">
                                            {appData.stores?.map(s => <option key={s.StoreName} value={s.StoreName}>{s.StoreName}</option>)}
                                        </select>
                                    </div>
                                </div>"""

content = content.replace(control_old, control_new)

# 3. Order Grid Step 1
grid_old = """                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {filteredOrders.map((order, idx) => {
                                            const isSelected = step1SelectedIds.has(order['Order ID']);
                                            const isReturn = step1ReturnIds.has(order['Order ID']);
                                            return (
                                                <div key={order['Order ID']} className={`p-4 rounded-sm border transition-colors ${isSelected ? 'bg-[#FCD535]/5 border-[#FCD535]/30' : isReturn ? 'bg-[#F6465D]/5 border-[#F6465D]/30' : 'bg-[#181A20] border-[#2B3139]'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex gap-3">
                                                            <div className="w-6 h-6 rounded-sm bg-[#0B0E11] flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0 border border-[#2B3139]">{idx + 1}</div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-sm font-bold text-gray-200 uppercase truncate">{order['Customer Name']}</h4>
                                                                <p className="text-[10px] font-bold text-gray-500 font-mono mt-0.5">{order['Customer Phone']}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-[#0ECB81]">${(order['Grand Total'] || 0).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => { const s = new Set(step1SelectedIds), r = new Set(step1ReturnIds); if (s.has(order['Order ID'])) s.delete(order['Order ID']); else { s.add(order['Order ID']); r.delete(order['Order ID']); }; setStep1SelectedIds(s); setStep1ReturnIds(r); }} 
                                                            className={`flex-1 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border transition-colors ${isSelected ? 'bg-[#0ECB81] border-[#0ECB81] text-black' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 hover:text-[#0ECB81]'}`}
                                                        >
                                                            Success
                                                        </button>
                                                        <button 
                                                            onClick={() => { const s = new Set(step1SelectedIds), r = new Set(step1ReturnIds); if (r.has(order['Order ID'])) r.delete(order['Order ID']); else { r.add(order['Order ID']); s.delete(order['Order ID']); }; setStep1SelectedIds(s); setStep1ReturnIds(r); }} 
                                                            className={`flex-1 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border transition-colors ${isReturn ? 'bg-[#F6465D] border-[#F6465D] text-white' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 hover:text-[#F6465D]'}`}
                                                        >
                                                            Return
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>"""

grid_new = """                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredOrders.map((order, idx) => {
                                            const isSelected = step1SelectedIds.has(order['Order ID']);
                                            const isReturn = step1ReturnIds.has(order['Order ID']);
                                            
                                            // Dynamic styling based on selection
                                            let cardClasses = 'bg-[#181A20] border-[#2B3139] opacity-80 hover:opacity-100 hover:border-[#FCD535]/30 hover:bg-[#1E2329]';
                                            let glowDiv = null;
                                            
                                            if (isSelected) {
                                                cardClasses = 'bg-[#FCD535]/5 border-[#FCD535]/40 shadow-[0_0_15px_rgba(252,213,53,0.1)] opacity-100 scale-[1.01]';
                                                glowDiv = <div className="absolute top-0 right-0 w-24 h-24 bg-[#FCD535]/15 rounded-full blur-[24px] -mr-12 -mt-12 pointer-events-none"></div>;
                                            } else if (isReturn) {
                                                cardClasses = 'bg-[#F6465D]/5 border-[#F6465D]/40 shadow-[0_0_15px_rgba(246,70,93,0.1)] opacity-100 scale-[1.01]';
                                                glowDiv = <div className="absolute top-0 right-0 w-24 h-24 bg-[#F6465D]/15 rounded-full blur-[24px] -mr-12 -mt-12 pointer-events-none"></div>;
                                            }

                                            return (
                                                <div key={order['Order ID']} className={`p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col ${cardClasses}`}>
                                                    {glowDiv}
                                                    <div className="flex justify-between items-start mb-4 relative z-10 flex-grow">
                                                        <div className="flex gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border shadow-sm transition-colors ${isSelected ? 'bg-[#FCD535] text-black border-[#FCD535]' : isReturn ? 'bg-[#F6465D] text-white border-[#F6465D]' : 'bg-[#0B0E11] text-gray-500 border-[#2B3139]'}`}>{idx + 1}</div>
                                                            <div className="min-w-0 pr-2">
                                                                <h4 className={`text-sm font-bold uppercase truncate transition-colors ${isSelected ? 'text-[#FCD535]' : isReturn ? 'text-[#F6465D]' : 'text-gray-200'}`}>{order['Customer Name']}</h4>
                                                                <p className="text-[10px] font-bold text-gray-400 font-mono mt-0.5">{order['Customer Phone']} • <span className="text-gray-500">{order['Order ID'].slice(-5)}</span></p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-xs font-black shrink-0 ${isSelected ? 'text-[#FCD535]' : isReturn ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>${(order['Grand Total'] || 0).toFixed(2)}</span>
                                                    </div>
                                                    
                                                    {/* Location indicator */}
                                                    <div className="mb-4 text-[10px] font-medium text-gray-400 bg-[#0B0E11]/80 p-2 rounded-lg border border-[#2B3139]/50 truncate relative z-10 flex items-center gap-1.5 shadow-inner">
                                                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        {order.Location || 'No location'} {order['Address Details'] ? `- ${order['Address Details']}` : ''}
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2 mt-auto relative z-10">
                                                        <button 
                                                            onClick={() => { const s = new Set(step1SelectedIds), r = new Set(step1ReturnIds); if (s.has(order['Order ID'])) s.delete(order['Order ID']); else { s.add(order['Order ID']); r.delete(order['Order ID']); }; setStep1SelectedIds(s); setStep1ReturnIds(r); }} 
                                                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 flex justify-center items-center gap-1.5 ${isSelected ? 'bg-gradient-to-r from-[#FCD535] to-[#fde047] border-[#FCD535] text-black shadow-[0_0_15px_rgba(252,213,53,0.3)]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 hover:text-[#FCD535] hover:border-[#FCD535]/50'}`}
                                                        >
                                                            {isSelected && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                            Success
                                                        </button>
                                                        <button 
                                                            onClick={() => { const s = new Set(step1SelectedIds), r = new Set(step1ReturnIds); if (r.has(order['Order ID'])) r.delete(order['Order ID']); else { r.add(order['Order ID']); s.delete(order['Order ID']); }; setStep1SelectedIds(s); setStep1ReturnIds(r); }} 
                                                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 flex justify-center items-center gap-1.5 ${isReturn ? 'bg-gradient-to-r from-[#F6465D] to-[#fb7185] border-[#F6465D] text-white shadow-[0_0_15px_rgba(246,70,93,0.3)]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-400 hover:text-[#F6465D] hover:border-[#F6465D]/50'}`}
                                                        >
                                                            {isReturn && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
                                                            Return
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>"""

content = content.replace(grid_old, grid_new)

# 4. Verify Grid (Step 2)
verify_old = """                                <div className="space-y-3">
                                    {pendingOrders.map((order, idx) => {
                                        const isChecked = verifiedIds.has(order['Order ID']);
                                        const isPaid = order['Payment Status'] === 'Paid';
                                        return (
                                            <div key={order['Order ID']} className={`p-4 rounded-sm border transition-colors ${isChecked ? 'bg-[#181A20] border-[#2B3139]' : 'bg-[#0B0E11] border-[#2B3139] opacity-50'}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex gap-4 min-w-0 flex-1">
                                                        <div className="w-8 h-8 rounded-sm bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">{idx + 1}</div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-bold text-gray-200 uppercase truncate">{order['Customer Name']}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-bold text-gray-400 font-mono">{order['Customer Phone']}</span>
                                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[150px]">{order.Location}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-4">
                                                        <div className="text-right flex flex-col items-end">
                                                            <p className="text-sm font-bold text-white">${(order['Grand Total'] || 0).toFixed(2)}</p>
                                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 mt-0.5 rounded-sm ${isPaid ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20'}`}>{order['Payment Status']}</span>
                                                        </div>
                                                        <div className="w-24">
                                                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1 text-right">Fee ($)</p>
                                                            <input type="number" step="0.01" value={shippingAdjustments[order['Order ID']] ?? 0} onChange={(e) => handleShippingChange(order['Order ID'], e.target.value)} className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-sm py-1.5 px-2 text-right text-xs font-mono text-[#FCD535] focus:border-[#FCD535] outline-none transition-colors" disabled={!isChecked} />
                                                        </div>
                                                        <button onClick={() => toggleVerify(order['Order ID'])} className={`w-10 h-10 mt-4 sm:mt-0 rounded-sm flex items-center justify-center border transition-colors ${isChecked ? 'bg-[#FCD535] border-[#FCD535] text-black' : 'bg-[#0B0E11] border-[#2B3139] text-gray-500 hover:text-white'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>"""

verify_new = """                                <div className="space-y-4">
                                    {pendingOrders.map((order, idx) => {
                                        const isChecked = verifiedIds.has(order['Order ID']);
                                        const isPaid = order['Payment Status'] === 'Paid';
                                        return (
                                            <div key={order['Order ID']} className={`p-5 rounded-xl border transition-all duration-300 relative overflow-hidden ${isChecked ? 'bg-gradient-to-r from-[#181A20] to-[#1E2329] border-[#FCD535]/30 shadow-[0_0_15px_rgba(252,213,53,0.05)]' : 'bg-[#0B0E11] border-[#2B3139] opacity-40 hover:opacity-70'}`}>
                                                {isChecked && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FCD535] to-[#FCD535]/10"></div>}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10 pl-2">
                                                    <div className="flex gap-4 min-w-0 flex-1 items-center">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 border shadow-sm transition-colors ${isChecked ? 'bg-[#FCD535] text-black border-[#FCD535]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-500'}`}>{idx + 1}</div>
                                                        <div className="min-w-0">
                                                            <h4 className={`text-sm font-bold uppercase truncate transition-colors ${isChecked ? 'text-gray-200' : 'text-gray-500'}`}>{order['Customer Name']}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-bold text-gray-500 font-mono">{order['Customer Phone']}</span>
                                                                <span className="text-[9px] font-bold text-gray-400 bg-[#0B0E11] px-2 py-0.5 rounded-md border border-[#2B3139] uppercase tracking-widest truncate max-w-[150px] shadow-inner">{order.Location}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-5">
                                                        <div className="text-right flex flex-col items-end">
                                                            <p className={`text-base font-black ${isChecked ? 'text-[#0ECB81]' : 'text-gray-500'}`}>${(order['Grand Total'] || 0).toFixed(2)}</p>
                                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 mt-1 rounded-md shadow-sm ${isPaid ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20' : 'bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20'}`}>{order['Payment Status']}</span>
                                                        </div>
                                                        <div className="w-28 relative">
                                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-right">Delivery Fee</p>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                                <input type="number" step="0.01" value={shippingAdjustments[order['Order ID']] ?? 0} onChange={(e) => handleShippingChange(order['Order ID'], e.target.value)} className={`w-full bg-[#0B0E11] border rounded-lg py-2 pl-6 pr-3 text-right text-sm font-mono font-bold outline-none transition-all shadow-inner ${isChecked ? 'border-[#FCD535]/50 text-[#FCD535] focus:border-[#FCD535] focus:ring-1 focus:ring-[#FCD535]/30' : 'border-[#2B3139] text-gray-600'}`} disabled={!isChecked} />
                                                            </div>
                                                        </div>
                                                        <button onClick={() => toggleVerify(order['Order ID'])} className={`w-12 h-12 mt-4 sm:mt-0 rounded-lg flex items-center justify-center border transition-all duration-300 shadow-sm ${isChecked ? 'bg-gradient-to-br from-[#FCD535] to-[#fde047] border-[#FCD535] text-black shadow-[0_0_15px_rgba(252,213,53,0.3)]' : 'bg-[#0B0E11] border-[#2B3139] text-gray-500 hover:text-white'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>"""

content = content.replace(verify_old, verify_new)

# 5. Summary Ticket (Step 3)
summary_old = """                                <div id="summary-card" className="bg-[#181A20] border border-[#0ECB81]/30 rounded-sm p-8 relative flex flex-col items-center shadow-lg">
                                    <div className="w-16 h-16 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-sm flex items-center justify-center mb-6"><svg className="w-8 h-8 text-[#0ECB81]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>
                                    <h3 className="text-xl font-bold text-gray-200 uppercase tracking-widest mb-6">Execution Success</h3>
                                    
                                    <div className="w-full grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-[#0B0E11] p-4 rounded-sm border border-[#2B3139] text-center">
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Packets</p>
                                            <p className="text-2xl font-mono text-white leading-none">{summaryResult.count}</p>
                                        </div>
                                        <div className="bg-[#0B0E11] p-4 rounded-sm border border-[#2B3139] text-center">
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Fee</p>
                                            <p className="text-2xl font-mono text-[#FCD535] leading-none">${summaryResult.shipCost.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="w-full bg-[#0B0E11] p-5 rounded-sm border border-[#2B3139] space-y-3">
                                        <div className="flex justify-between items-center border-b border-[#2B3139] pb-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gross Target</span>
                                            <span className="text-lg font-mono text-[#0ECB81]">${summaryResult.totalUSD.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">├─ Already Paid</span>
                                            <span className="text-xs font-mono text-gray-300">${summaryResult.alreadyPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">└─ Handled Today</span>
                                            <span className="text-xs font-mono text-[#FCD535]">${summaryResult.newlyPaid.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-[8px] font-bold text-gray-600 uppercase tracking-widest">Authorized by {summaryResult.user}</p>
                                </div>"""

summary_new = """                                <div id="summary-card" className="bg-gradient-to-b from-[#181A20] to-[#1E2329] border-2 border-dashed border-[#0ECB81]/40 rounded-2xl p-10 relative flex flex-col items-center shadow-[0_10px_40px_rgba(14,203,129,0.1)] overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0ECB81] via-[#34d399] to-[#0ECB81]"></div>
                                    <div className="w-20 h-20 bg-gradient-to-br from-[#0ECB81]/20 to-[#0ECB81]/5 border border-[#0ECB81]/40 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,203,129,0.2)]">
                                        <svg className="w-10 h-10 text-[#0ECB81]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-8">Dispatch Complete</h3>
                                    
                                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-[#0B0E11]/80 p-5 rounded-xl border border-[#2B3139] text-center shadow-inner">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> Packets</p>
                                            <p className="text-3xl font-black text-white leading-none">{summaryResult.count}</p>
                                        </div>
                                        <div className="bg-[#0B0E11]/80 p-5 rounded-xl border border-[#2B3139] text-center shadow-inner">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Total Fee</p>
                                            <p className="text-3xl font-black text-[#FCD535] leading-none">${summaryResult.shipCost.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="w-full bg-[#0B0E11]/80 p-6 rounded-xl border border-[#2B3139] space-y-4 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#0ECB81]/5 rounded-full blur-[20px] -mr-10 -mt-10 pointer-events-none"></div>
                                        <div className="flex justify-between items-center border-b border-[#2B3139] pb-4">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Gross Target</span>
                                            <span className="text-2xl font-black text-[#0ECB81]">${summaryResult.totalUSD.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Already Paid</span>
                                            <span className="text-sm font-mono font-bold text-gray-300">${summaryResult.alreadyPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-[#FCD535]/10 p-2.5 rounded-lg border border-[#FCD535]/20 mt-2">
                                            <span className="text-[10px] font-bold text-[#FCD535] uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FCD535] animate-pulse"></div> Handled Today</span>
                                            <span className="text-sm font-mono font-black text-[#FCD535]">${summaryResult.newlyPaid.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#2B3139] flex items-center justify-center text-xs font-bold text-white border border-gray-600">{(summaryResult.user || 'U')[0]}</div>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Authorized By</p>
                                            <p className="text-xs font-bold text-gray-300 leading-none">{summaryResult.user}</p>
                                        </div>
                                    </div>
                                </div>"""

content = content.replace(summary_old, summary_new)

with open('components/orders/DeliveryListGeneratorModal.tsx', 'w') as f:
    f.write(content)
