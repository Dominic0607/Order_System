import re

with open('components/orders/OrderDetailModal.tsx', 'r') as f:
    content = f.read()

target = """                                                                {isAlreadySent ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-grow flex items-center gap-2 px-3 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg">
                                                                            <Check size={10} className="text-[#0ECB81]" />
                                                                            <span className="text-[8px] font-black text-[#0ECB81] uppercase tracking-widest">បញ្ជូនរូបរួចរាល់ (Sent)</span>
                                                                        </div>"""

replacement = """                                                                {isAlreadySent ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <button disabled className="flex-grow flex items-center justify-center gap-2 px-3 py-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#0ECB81] shadow-lg cursor-default">
                                                                            <Check size={12} />
                                                                            បញ្ជូនរួចរាល់
                                                                        </button>"""

content = content.replace(target, replacement)

with open('components/orders/OrderDetailModal.tsx', 'w') as f:
    f.write(content)
