import re

with open('components/admin/packaging/DesktopPackagingHub.tsx', 'r') as f:
    content = f.read()

target = """                                                        ) : (
                                                            <div className={`grid ${activeTab === 'Cancelled' || activeTab === 'Shipped' ? 'grid-cols-[80px_1fr]' : 'grid-cols-2'} gap-2`}>
                                                                <button onClick={(e) => { e.stopPropagation(); onView(order); }} className={`w-full py-1.5 bg-[#2B3139] hover:bg-[#3B424A] ${B_TEXT_PRIMARY} text-xs font-medium transition-colors rounded-sm`}>Details</button>"""

replacement = """                                                        ) : (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                {activeTab === 'Shipped' && (
                                                                    <div className="w-full">
                                                                        {!!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID']) ? (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="flex-grow flex items-center justify-center gap-2 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-sm">
                                                                                    <Check size={12} className="text-[#0ECB81]" />
                                                                                    <span className="text-[10px] font-black text-[#0ECB81] uppercase tracking-wider">Photo Sent to Driver ✓</span>
                                                                                </div>
                                                                                {getCanSendToDriver(order) && (
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteFromDeliveryTelegram(order); }}
                                                                                        disabled={sendingOrderId === order['Order ID']}
                                                                                        className="w-9 h-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-sm border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                                                                        title="Delete from Telegram"
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
                                                                                    className={`w-full flex items-center justify-center gap-2 py-1.5 ${!getCanSendToDriver(order) ? 'bg-[#2B3139] text-gray-500 cursor-not-allowed border-[#363C44]' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'} rounded-sm text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50`}
                                                                                >
                                                                                    {sendingOrderId === order['Order ID'] ? <Spinner size="xs" /> : <ImageIcon size={14} />}
                                                                                    {sendingOrderId === order['Order ID'] ? 'Processing...' : 'បញ្ជូនរូបភាពកញ្ចប់'}
                                                                                </button>
                                                                            ) : null
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className={`grid ${activeTab === 'Cancelled' || activeTab === 'Shipped' ? 'grid-cols-[80px_1fr]' : 'grid-cols-2'} gap-2 w-full`}>
                                                                    <button onClick={(e) => { e.stopPropagation(); onView(order); }} className={`w-full py-1.5 bg-[#2B3139] hover:bg-[#3B424A] ${B_TEXT_PRIMARY} text-xs font-medium transition-colors rounded-sm`}>Details</button>"""

content = content.replace(target, replacement)

with open('components/admin/packaging/DesktopPackagingHub.tsx', 'w') as f:
    f.write(content)
