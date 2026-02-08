
import { GoogleGenAI, Type } from "@google/genai";

export const getBusinessInsights = async (products: any[], stats: any[]) => {
  try {
    // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `بناءً على البيانات التالية لمتجر B2B، قدم 3 نصائح استراتيجية للنمو. المنتجات: ${JSON.stringify(products)}. المبيعات الأخيرة: ${JSON.stringify(stats)}. يجب أن تكون النصائح مختصرة ومهنية وباللغة العربية.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING, description: "One of: growth, warning, info" }
            },
            required: ["title", "content", "type"]
          }
        }
      }
    });

    // response.text is a property, not a method.
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error fetching insights:", error);
    return [
      {
        title: "نصيحة افتراضية: تنويع الموردين",
        content: "يُنصح دائمًا بتنويع الموردين لضمان استمرارية سلاسل الإمداد وتجنب الانقطاعات المفاجئة.",
        type: "info"
      }
    ];
  }
};
