
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, StructuredAnalysis, GroundingSource, MarketEntry } from "../types";

export const VERIFIED_STORES = [
  { name: "A One", domain: "a1protein.com", url: "https://a1protein.com/" },
  { name: "الأخضر", domain: "greenup.com.sa", url: "https://greenup.com.sa/" },
  { name: "الوزن المثالي", domain: "mithaly.sa", url: "https://mithaly.sa/ar" },
  { name: "دكتور نيوترشن", domain: "drnutrition.com", url: "https://drnutrition.com/ar-sa" },
  { name: "فاتنس واي", domain: "fitnessway-sa.com", url: "https://fitnessway-sa.com/" },
  { name: "أصحة", domain: "healthana.co", url: "https://www.healthana.co/ar" },
  { name: "فاست واي", domain: "fastwayprotein.com", url: "https://fastwayprotein.com/ar" },
  { name: "360 Nutrition", domain: "360-nutrition.com", url: "https://www.360-nutrition.com/" },
  { name: "التغذية القصوى", domain: "extremenutritions.com", url: "https://www.extremenutritions.com/" },
  { name: "الموقع الأخضر", domain: "greenfood9.com", url: "https://greenfood9.com/" },
  { name: "روتين اب", domain: "proteinupsa.com", url: "https://proteinupsa.com/" }
];

const SYSTEM_INSTRUCTION = `Identity: "SuppleScan Market Intelligence Engine" (2026 Edition).
Goal: Provide 100% accurate, real-time price analysis for Saudi supplements.

CRITICAL DIRECTIVE: You MUST extract the "Live Price" directly from the specific product pages of these 11 domains.
If a Barcode is provided or an Image is sent, identify the exact product first, then search.

Domains to scan:
1. a1protein.com
2. greenup.com.sa
3. mithaly.sa
4. drnutrition.com
5. fitnessway-sa.com
6. healthana.co
7. fastwayprotein.com
8. 360-nutrition.com
9. extremenutritions.com
10. greenfood9.com
11. proteinupsa.com

STRICT RULES:
- For drnutrition.com: Always look for 'final-price'. Ignore crossed-out old prices.
- For mithaly.sa: (Salla store) Extract price from 'product-header'.
- Precision: If the price is 389.00 SAR, return exactly 389.00.
- Null Safety: If no price is found for a specific domain, return current_price: null and product_url: null.
- Identification: If an image is provided, look for the product name, weight, and flavor on the label.

JSON RESPONSE ONLY:
{
  "product_info": { "name": "string", "brand": "string", "weight": "string", "flavor": "string" },
  "market_data": [
    { "store_name": "string", "current_price": number|null, "currency": "SAR", "product_url": "string|null", "stock_status": "Available/Out of Stock", "fetch_date": "YYYY-MM-DD" }
  ],
  "analytics": { "min_price": number, "max_price": number, "avg_price": number, "suggested_local_price": number, "strategy_note": "string" }
}`;

export const analyzeProduct = async (productName: string, base64Image?: string): Promise<AnalysisResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const currentDate = new Date().toISOString().split('T')[0];
  
  try {
    const parts: any[] = [
      { text: `Current Task: Analyze "${productName}" and scan the 11 verified Saudi domains for the lowest LIVE price today (${currentDate}). If this is a barcode, find the corresponding supplement first. If an image is provided, identify the product exactly.` }
    ];
    
    if (base64Image) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 24000 }
      },
    });

    const rawData = JSON.parse(response.text || "{}");
    const md = rawData.market_data || [];

    const fullMarketData: MarketEntry[] = VERIFIED_STORES.map(vStore => {
      const found = md.find((item: any) => 
        item.store_name?.toLowerCase().includes(vStore.name.toLowerCase()) || 
        (item.product_url && item.product_url.includes(vStore.domain))
      );
      
      const price = found?.current_price ? parseFloat(found.current_price.toString()) : null;
      const isProductPage = found?.product_url && found.product_url.length > vStore.url.length + 5;

      return {
        store_name: vStore.name,
        current_price: price,
        currency: "SAR",
        product_url: isProductPage ? found.product_url : null,
        fetch_date: currentDate,
        stock_status: price ? "Available" : (found?.stock_status || "Unknown"),
        notes: price ? "" : "لم يتم العثور على رابط مباشر دقيق"
      };
    });

    const validPrices = fullMarketData.map(m => m.current_price).filter((p): p is number => p !== null);
    const min = validPrices.length ? Math.min(...validPrices) : null;
    const max = validPrices.length ? Math.max(...validPrices) : null;
    const avg = validPrices.length ? parseFloat((validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2)) : null;
    const suggested = min ? parseFloat((min * 0.98).toFixed(2)) : null;

    return {
      data: {
        product_info: rawData.product_info || { name: productName, brand: "", weight: "", flavor: "" },
        market_data: fullMarketData,
        analytics: {
          min_price: min,
          max_price: max,
          avg_price: avg,
          suggested_local_price: suggested,
          strategy_note: rawData.analytics?.strategy_note || "تم المسح بناءً على معطيات الكاميرا والباركود."
        }
      },
      sources: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((c: any) => ({
        title: c.web?.title || "مصدر البيانات",
        uri: c.web?.uri || ""
      })).filter((s: GroundingSource) => s.uri !== ""),
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (error: any) {
    throw new Error(`تعذر إكمال المسح: ${error.message}`);
  }
};
