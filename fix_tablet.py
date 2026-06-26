import re

with open('components/admin/packaging/TabletPackagingHub.tsx', 'r') as f:
    content = f.read()

target = """                                                        ) : (
                                                            <div className="flex gap-1 justify-end">
                                                                <button onClick={(e) => { e.stopPropagation(); onView(order); }} className={`px-2 py-1 bg-[#2B3139] text-[#EAECEF] rounded-sm text-xs`}>View</button>"""

replacement = """                                                        ) : (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                {activeTab === 'Shipped' && (
                                                                    <div className="w-full">
                                                                        {!!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID']) ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-sm">
                                                                                    <Check size={10} className="text-[#0ECB81]" />
                                                                                    <span className="text-[9px] font-black text-[#0ECB81] uppercase tracking-tighter">Sent to Driver ✓</span>
                                                                                </div>
                                                                                {getCanSendToDriver(order) && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteFromDeliveryTelegram(order); }}
                                                                                        disabled={sendingOrderId === order['Order ID']}
                                                                                        className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-sm border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                                                                    >
                                                                                        {sendingOrderId === order['Order ID'] ? <Spinner size="xs" /> : <Trash size={12} />}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            getDeliveryGroup(order)?.TelegramGroupID ? (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleSendToDeliveryTelegram(order); }}
                                                                                    disabled={sendingOrderId === order['Order ID'] || !getCanSendToDriver(order)}
                                                                                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 ${!getCanSendToDriver(order) ? 'bg-[#2B3139] text-gray-500 cursor-not-allowed border-[#363C44]' : 'bg-blue-600 hover:bg-blue-500 text-white'} rounded-sm text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 disabled:opacity-50`}
                                                                                >
                                                                                    {sendingOrderId === order['Order ID'] ? <Spinner size="xs" /> : <ImageIcon size={14} />}
                                                                                    {sendingOrderId === order['Order ID'] ? 'Processing...' : 'បញ្ជូនរូបភាពកញ្ចប់'}
                                                                                </button>
                                                                            ) : null
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-1 justify-end w-full">
                                                                    <button onClick={(e) => { e.stopPropagation(); onView(order); }} className={`px-2 py-1 bg-[#2B3139] text-[#EAECEF] rounded-sm text-xs flex-1`}>View</button>"""

content = content.replace(target, replacement)

with open('components/admin/packaging/TabletPackagingHub.tsx', 'w') as f:
    f.write(content)
