import re

with open('components/orders/OrderDetailModal.tsx', 'r') as f:
    content = f.read()

# 1. Add state localIsSent
target1 = """    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSendingTelegram, setIsSendingTelegram] = useState(false);"""
replacement1 = """    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSendingTelegram, setIsSendingTelegram] = useState(false);
    const [localIsSent, setLocalIsSent] = useState(false);"""
content = content.replace(target1, replacement1)

# 2. Update isAlreadySent calculation
target2 = """    const hasTelegramGroup = !!deliveryGroup?.TelegramGroupID;
    const isAlreadySent = !!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID']);"""
replacement2 = """    const hasTelegramGroup = !!deliveryGroup?.TelegramGroupID;
    const isAlreadySent = !!(order['Delivery Telegram Message ID'] || (order as any)['Delivery Telegram Message ID']) || localIsSent;"""
content = content.replace(target2, replacement2)

# 3. Update handleSendToDeliveryTelegram to set localIsSent(true)
target3 = """            const data = await res.json();
            if (data.status !== 'success') {
                let errorMsg = data.message || 'មិនស្គាល់បញ្ហា';
                if (data.details && data.details.description) {
                    errorMsg += ` (${data.details.description})`;
                }
                alert('បរាជ័យ: ' + errorMsg);
            }
        } catch (error) {"""
replacement3 = """            const data = await res.json();
            if (data.status !== 'success') {
                let errorMsg = data.message || 'មិនស្គាល់បញ្ហា';
                if (data.details && data.details.description) {
                    errorMsg += ` (${data.details.description})`;
                }
                alert('បរាជ័យ: ' + errorMsg);
            } else {
                setLocalIsSent(true);
            }
        } catch (error) {"""
content = content.replace(target3, replacement3)

# 4. Update handleDeleteFromDeliveryTelegram to set localIsSent(false)
target4 = """            const data = await res.json();
            if (data.status !== 'success') {
                alert('បរាជ័យ: ' + (data.message || 'មិនស្គាល់បញ្ហា'));
            }
        } catch (error) {"""
replacement4 = """            const data = await res.json();
            if (data.status !== 'success') {
                alert('បរាជ័យ: ' + (data.message || 'មិនស្គាល់បញ្ហា'));
            } else {
                setLocalIsSent(false);
            }
        } catch (error) {"""
content = content.replace(target4, replacement4)

with open('components/orders/OrderDetailModal.tsx', 'w') as f:
    f.write(content)
