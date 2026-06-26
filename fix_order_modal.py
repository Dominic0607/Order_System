import re

with open('components/orders/OrderDetailModal.tsx', 'r') as f:
    content = f.read()

# Fix canSendToDriver condition
target1 = """        const isReadyForDispatch = fs === 'Ready to Ship';

        // Global rule: Only allowed in "Ready to Ship" status
        if (!isReadyForDispatch) return false;"""
replacement1 = """        const isReadyForDispatch = fs === 'Ready to Ship' || fs === 'Shipped';

        // Global rule: Only allowed in "Ready to Ship" or "Shipped" status
        if (!isReadyForDispatch) return false;"""
content = content.replace(target1, replacement1)

# Fix the render condition
target2 = """                                                                ) : String(fs).trim() === 'Ready to Ship' ? (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleSendToDeliveryTelegram(); }}
                                                                        disabled={isSendingTelegram || !canSendToDriver}
                                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 ${!canSendToDriver ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 'bg-blue-600 hover:bg-blue-500 text-white'} rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                                                                        title={!canSendToDriver ? "អាចផ្ញើបានតែក្នុងស្ថានភាព Ready for Dispatch និងដោយអ្នកបើកវេនប៉ុណ្ណោះ" : "បញ្ជូនរូបភាពកញ្ចប់ទៅ Telegram"}
                                                                    >
                                                                        <ImageIcon size={12} className={canSendToDriver ? "text-white" : "text-gray-600"} />
                                                                        {isSendingTelegram ? 'Processing...' : 'បញ្ជូនរូបភាពកញ្ចប់'}
                                                                    </button>
                                                                ) : null}"""
replacement2 = """                                                                ) : (String(fs).trim() === 'Ready to Ship' || String(fs).trim() === 'Shipped') ? (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleSendToDeliveryTelegram(); }}
                                                                        disabled={isSendingTelegram || !canSendToDriver}
                                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 ${!canSendToDriver ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700' : 'bg-blue-600 hover:bg-blue-500 text-white'} rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                                                                        title={!canSendToDriver ? "អាចផ្ញើបានតែក្នុងស្ថានភាព Ready for Dispatch/Shipped និងដោយអ្នកបើកវេនប៉ុណ្ណោះ" : "បញ្ជូនរូបភាពកញ្ចប់ទៅ Telegram"}
                                                                    >
                                                                        <ImageIcon size={12} className={canSendToDriver ? "text-white" : "text-gray-600"} />
                                                                        {isSendingTelegram ? 'Processing...' : 'បញ្ជូនរូបភាពកញ្ចប់'}
                                                                    </button>
                                                                ) : null}"""
content = content.replace(target2, replacement2)

with open('components/orders/OrderDetailModal.tsx', 'w') as f:
    f.write(content)
