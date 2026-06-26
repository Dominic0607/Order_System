import re

files = [
    'components/admin/packaging/DesktopPackagingHub.tsx',
    'components/admin/packaging/MobilePackagingHub.tsx',
    'components/admin/packaging/TabletPackagingHub.tsx'
]

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()

    # 1. Add localSentIds state near sendingOrderId
    target1 = "const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);"
    replacement1 = "const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);\n    const [localSentIds, setLocalSentIds] = useState<Set<string>>(new Set());"
    if "localSentIds" not in content:
        content = content.replace(target1, replacement1)

    # 2. Update handleSendToDeliveryTelegram to add to localSentIds
    target2 = """            const data = await res.json();
            if (data.status !== 'success') {
                let errorMsg = data.message || 'មិនស្គាល់បញ្ហា';
                if (data.details && data.details.description) {
                    errorMsg += ` (${data.details.description})`;
                }
                alert('បរាជ័យ: ' + errorMsg);
            }
        } catch (error) {"""
    replacement2 = """            const data = await res.json();
            if (data.status !== 'success') {
                let errorMsg = data.message || 'មិនស្គាល់បញ្ហា';
                if (data.details && data.details.description) {
                    errorMsg += ` (${data.details.description})`;
                }
                alert('បរាជ័យ: ' + errorMsg);
            } else {
                setLocalSentIds(prev => new Set(prev).add(order['Order ID']));
            }
        } catch (error) {"""
    content = content.replace(target2, replacement2)

    # 3. Update handleDeleteFromDeliveryTelegram to remove from localSentIds
    target3 = """            const data = await res.json();
            if (data.status !== 'success') {
                alert('បរាជ័យ: ' + (data.message || 'មិនស្គាល់បញ្ហា'));
            }
        } catch (error) {"""
    replacement3 = """            const data = await res.json();
            if (data.status !== 'success') {
                alert('បរាជ័យ: ' + (data.message || 'មិនស្គាល់បញ្ហា'));
            } else {
                setLocalSentIds(prev => {
                    const next = new Set(prev);
                    next.delete(order['Order ID']);
                    return next;
                });
            }
        } catch (error) {"""
    content = content.replace(target3, replacement3)

    # 4. Find all occurrences of !!(order['Delivery Telegram Message ID']...) and change to include localSentIds
    # Note: in Hubs it is usually written as !!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID'])
    target4 = "!!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID'])"
    replacement4 = "(!!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID']) || localSentIds.has(order['Order ID']))"
    content = content.replace(target4, replacement4)

    # 5. Change "Photo Sent to Driver ✓" to "បញ្ជូនរួចរាល់" disabled button style
    # Desktop format
    target5_desk = """<div className="flex-grow flex items-center justify-center gap-2 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-sm">
                                                                                    <Check size={12} className="text-[#0ECB81]" />
                                                                                    <span className="text-[10px] font-black text-[#0ECB81] uppercase tracking-wider">Photo Sent to Driver ✓</span>
                                                                                </div>"""
    repl5_desk = """<button disabled className="flex-grow flex items-center justify-center gap-2 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-sm text-[10px] font-black text-[#0ECB81] uppercase tracking-wider cursor-default">
                                                                                    <Check size={12} />
                                                                                    បញ្ជូនរួចរាល់
                                                                                </button>"""
    content = content.replace(target5_desk, repl5_desk)

    # Mobile format
    target5_mob = """<div className="flex-grow flex items-center justify-center gap-2 py-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg">
                                                                                <Check size={14} className="text-[#0ECB81]" />
                                                                                <span className="text-[11px] font-black text-[#0ECB81] uppercase tracking-wider">Photo Sent to Driver ✓</span>
                                                                            </div>"""
    repl5_mob = """<button disabled className="flex-grow flex items-center justify-center gap-2 py-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-lg text-[11px] font-black text-[#0ECB81] uppercase tracking-wider cursor-default">
                                                                                <Check size={14} />
                                                                                បញ្ជូនរួចរាល់
                                                                            </button>"""
    content = content.replace(target5_mob, repl5_mob)

    # Tablet format
    target5_tab = """<div className="flex-grow flex items-center justify-center gap-2 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-md">
                                                                                <Check size={12} className="text-[#0ECB81]" />
                                                                                <span className="text-[10px] font-black text-[#0ECB81] uppercase tracking-wider">Photo Sent to Driver ✓</span>
                                                                            </div>"""
    repl5_tab = """<button disabled className="flex-grow flex items-center justify-center gap-2 py-1.5 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-md text-[10px] font-black text-[#0ECB81] uppercase tracking-wider cursor-default">
                                                                                <Check size={12} />
                                                                                បញ្ជូនរួចរាល់
                                                                            </button>"""
    content = content.replace(target5_tab, repl5_tab)

    with open(file_path, 'w') as f:
        f.write(content)

