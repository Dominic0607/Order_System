
import { Product, ParsedOrder } from '../types';

// Format timestamp for datetime-local input
export const formatForInput = (timestamp: string): string => {
    if (!timestamp) return '';
    // Handle "YYYY-MM-DD H:mm" or "YYYY-MM-DD HH:mm" specifically
    const match = timestamp.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s(\d{1,2}):(\d{2})/);
    if (match) {
        const y = match[1];
        const m = match[2].padStart(2, '0');
        const d = match[3].padStart(2, '0');
        const h = match[4].padStart(2, '0');
        const min = match[5].padStart(2, '0');
        return `${y}-${m}-${d}T${h}:${min}`;
    }

    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Recalculate totals based on products and shipping fee
export const recalculateTotals = (products: Product[], shippingFee: number): Partial<ParsedOrder> => {
    const subtotal = products.reduce((sum, p) => sum + (p.total || 0), 0);
    const grandTotal = subtotal + shippingFee;
    const totalProductCost = products.reduce((sum, p) => sum + ((p.cost || 0) * (p.quantity || 0)), 0);
    const totalDiscount = products.reduce((sum, p) => sum + ((p.originalPrice - p.finalPrice) * p.quantity), 0);
    
    return { 
        Subtotal: subtotal, 
        'Grand Total': grandTotal, 
        'Total Product Cost ($)': totalProductCost,
        'Discount ($)': totalDiscount
    };
};

// Define structure for a single change record
export interface ChangeRecord {
    field: string;
    oldValue: string;
    newValue: string;
}

// Compare old and new data to generate structured audit logs
export const generateAuditLog = (oldData: ParsedOrder, newData: ParsedOrder): ChangeRecord[] => {
    const changes: ChangeRecord[] = [];

    // Check specific fields
    const fieldsToCheck: (keyof ParsedOrder)[] = [
        'Customer Name', 'Customer Phone', 'Location', 'Address Details', 
        'Grand Total', 'Payment Status', 'Internal Shipping Method', 
        'Internal Shipping Details', 'Internal Cost', 'Discount ($)',
        'Shipping Fee (Customer)', 'Fulfillment Store'
    ];

    fieldsToCheck.forEach(field => {
        const oldVal = oldData[field];
        const newVal = newData[field];

        // Explicitly handle null/undefined -> empty string to prevent "undefined" string
        const strOld = (oldVal === null || oldVal === undefined) ? '' : String(oldVal);
        const strNew = (newVal === null || newVal === undefined) ? '' : String(newVal);

        // Loose comparison after string conversion to catch "10" vs 10
        if (strOld != strNew) {
            changes.push({
                field: field,
                oldValue: strOld,
                newValue: strNew
            });
        }
    });

    // Check products length or content simply
    // For more detailed product logging, we could expand this, but usually knowing items changed is enough
    const oldProdStr = JSON.stringify(oldData.Products || []);
    const newProdStr = JSON.stringify(newData.Products || []);
    
    if (oldProdStr !== newProdStr) {
        changes.push({
            field: "Products List",
            oldValue: `${oldData.Products?.length || 0} items`,
            newValue: `${newData.Products?.length || 0} items`
        });
    }

    // Check Note
    const oldNote = oldData.Note || '';
    const newNote = newData.Note || '';
    if (oldNote !== newNote) {
        changes.push({
            field: "Note",
            oldValue: oldNote,
            newValue: newNote
        });
    }

    return changes;
};
