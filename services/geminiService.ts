
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ParsedOrder } from "../types";
import { WEB_APP_URL } from "../constants";

// Cached dynamic key fetched from backend (used when VITE_GEMINI_API_KEY env is absent)
let _cachedDynamicKey: string | null = null;
let _keyFetchedAt = 0;
const KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getGeminiAPIKey(): Promise<string> {
    // 1. Prefer env variable (build-time)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;

    // 2. Use cached dynamic key if still fresh
    if (_cachedDynamicKey && Date.now() - _keyFetchedAt < KEY_CACHE_TTL) {
        return _cachedDynamicKey;
    }

    // 3. Fetch from backend (admin-only endpoint returns the actual key)
    try {
        const token = localStorage.getItem('token');
        if (!token) return '';
        const res = await fetch(`${WEB_APP_URL}/api/admin/gemini-key/value`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            _cachedDynamicKey = data.apiKey || '';
            _keyFetchedAt = Date.now();
            return _cachedDynamicKey;
        }
    } catch (e) {
        console.warn('[geminiService] Could not fetch dynamic key:', e);
    }
    return '';
}

// simplified text extraction as per Gemini SDK guidelines: .text is a property, not a method
const extractText = (response: GenerateContentResponse): string => {
    return response.text || "";
};

export const summarizeText = async (text: string): Promise<string> => {
    if (!text) return "No text provided to summarize.";
    const apiKey = await getGeminiAPIKey();
    if (!apiKey) return "Gemini API Key មិនទាន់កំណត់។ សូមកំណត់ API Key ក្នុង Admin → Settings → Gemini AI API Key";
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Summarize the following note concisely for an order overview: "${text}"`,
        });
        return extractText(response) || "Could not generate summary.";
    } catch (error) {
        console.error("Gemini summarization error:", error);
        return "Could not generate summary.";
    }
};

export const generateProductDescription = async (productName: string): Promise<string> => {
    if (!productName) return "";
    const apiKey = await getGeminiAPIKey();
    if (!apiKey) return "Gemini API Key មិនទាន់កំណត់";
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a short, appealing product description in Khmer for a product named "${productName}".`,
        });
        return extractText(response);
    } catch (error) {
        console.error("Gemini description generation error:", error);
        return "";
    }
};

export const analyzeReportData = async (reportData: any, filters: any): Promise<string> => {
    const apiKey = await getGeminiAPIKey();
    if (!apiKey) return "Gemini API Key មិនទាន់កំណត់។ សូមកំណត់ API Key ក្នុង Admin → Settings → Gemini AI API Key";
    const ai = new GoogleGenAI({ apiKey });
    try {
        const filtersSummary = [
            `Date Range: ${filters.datePreset === 'all' ? 'All Time' : `${filters.startDate} to ${filters.endDate}`}`,
            `Team: ${filters.team || 'All'}`,
            `User: ${filters.user || 'All'}`,
            `Payment Status: ${filters.paymentStatus || 'All'}`
        ].join('; ');

        const prompt = `
            As a business data analyst, review the following sales data for an online business in Cambodia. Provide a concise summary of key insights and actionable recommendations, **written in clear Khmer language**.

            **Filters Applied for this Report:** ${filtersSummary}

            **Key Metrics Summary:**
            - Total Revenue: $${reportData.revenue?.toFixed(2) || 0}
            - Total Orders: ${reportData.totalOrders || 0}

            **Your analysis should be a bulleted list covering:**
            1.  An overall summary of business performance.
            2.  Identify potential areas of concern or opportunities for growth.
            3.  Provide one strategic recommendation to improve sales.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
        });
        
        return extractText(response) || "Could not generate analysis from Gemini.";
    } catch (error) {
        console.error("Gemini report analysis error:", error);
        return "Could not generate analysis from Gemini.";
    }
};

export const generateSalesForecast = async (orders: ParsedOrder[]): Promise<string> => {
    if (orders.length < 5) {
        return "ត្រូវការទិន្នន័យប្រតិបត្តិការណ៍យ៉ាងតិច ៥ ដើម្បីបង្កើតការព្យាករណ៍។";
    }

    const apiKey = await getGeminiAPIKey();
    if (!apiKey) return "Gemini API Key មិនទាន់កំណត់។ សូមកំណត់ API Key ក្នុង Admin → Settings → Gemini AI API Key";
    const ai = new GoogleGenAI({ apiKey });

    const monthlyData = orders.reduce((acc, order) => {
        const month = new Date(order.Timestamp).toISOString().slice(0, 7);
        if (!acc[month]) acc[month] = { revenue: 0, orders: 0 };
        acc[month].revenue += order['Grand Total'];
        acc[month].orders += 1;
        return acc;
    }, {} as Record<string, { revenue: number, orders: number }>);

    const formattedData = Object.entries(monthlyData)
        .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
        .map(([month, data]) => `${month}: Revenue $${data.revenue.toFixed(2)} from ${data.orders} orders`)
        .join('\n');

    const prompt = `
        Based on the following historical monthly sales data, provide a sales forecast for the next month in Khmer.
        
        Historical Data:
        ${formattedData}

        Your analysis should include:
        1. A prediction for next month's total revenue.
        2. A brief explanation of the trend.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
        });
        return extractText(response) || "Could not generate sales forecast from Gemini.";
    } catch (error) {
        console.error("Gemini forecast generation error:", error);
        return "Could not generate sales forecast from Gemini.";
    }
};
