import re

with open('components/admin/packaging/DesktopPackagingHub.tsx', 'r') as f:
    content = f.read()

target = """                                                    <div className="col-span-3 flex justify-end items-center gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); onView(order); }} className={`px-3 py-1 bg-[#2B3139] hover:bg-[#3B424A] ${B_TEXT_PRIMARY} text-xs font-medium rounded-sm transition-colors`}>View</button>"""

replacement = """                                                    <div className="col-span-3 flex justify-end items-center gap-2">
                                                        {/* Telegram Block for Shipped tab */}
                                                        {activeTab === 'Shipped' && (
                                                            <div className="flex items-center gap-1.5 mr-1">
                                                                {!!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID']) ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-sm">
                                                                            <Check size={8} className="text-[#0ECB81]" />
                                                                            <span className="text-[8px] font-black text-[#0ECB81] uppercase">Sent</span>
                                                                        </div>
                                                                        {getCanSendToDriver(order) && (
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteFromDeliveryTelegram(order); }}
                                                                                disabled={sendingOrderId === order['Order ID']}
                                                                                className={`p-1 text-red-500 hover:bg-red-500/10 rounded-sm transition-all disabled:opacity-50`}
                                                                                title="Delete from Telegram"
                                                                            >
                                                                                {sendingOrderId === order['Order ID'] ? <Spinner size="xs" /> : <Trash size={10} />}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    getDeliveryGroup(order)?.TelegramGroupID ? (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); handleSendToDeliveryTelegram(order); }}
                                                                            disabled={sendingOrderId === order['Order ID'] || !getCanSendToDriver(order)}
                                                                            className={`px-2 py-1 ${!getCanSendToDriver(order) ? 'bg-[#2B3139] text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'} rounded-sm text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1`}
                                                                            title="Send Package Photo"
                                                                        >
                                                                            {sendingOrderId === order['Order ID'] ? <Spinner size="xs" /> : <ImageIcon size={10} />}
                                                                            {sendingOrderId === order['Order ID'] ? 'Processing...' : 'Send'}
                                                                        </button>
                                                                    ) : null
                                                                )}
                                                            </div>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); onView(order); }} className={`px-3 py-1 bg-[#2B3139] hover:bg-[#3B424A] ${B_TEXT_PRIMARY} text-xs font-medium rounded-sm transition-colors`}>View</button>"""

content = content.replace(target, replacement)

with open('components/admin/packaging/DesktopPackagingHub.tsx', 'w') as f:
    f.write(content)
