
import { GoogleGenAI, Type } from "@google/genai";
import { OrderFormData, OrderLineItem } from "../types";

// Initialize Gemini Client safely
// Note: process.env.API_KEY is injected by the environment
let ai: GoogleGenAI | null = null;

try {
  // Only initialize if the key exists to prevent startup crashes in environments without env vars
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.warn("Gemini API Key is missing from environment. AI features will be disabled.");
  }
} catch (error) {
  console.error("Error initializing Gemini client:", error);
}

/**
 * Uses Gemini to parse unstructured text into structured order data.
 * This simulates a "Smart Import" feature.
 */
export const smartParseOrder = async (rawText: string): Promise<{
  customerData?: Partial<OrderFormData>;
  items?: Partial<OrderLineItem>[];
}> => {
  if (!ai) {
    throw new Error("AI features are not available because the API Key is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract order details from the following text. 
      Return a JSON object with 'customer' and 'items'. 
      Infer branch if mentioned (Mumbai, Surat, etc).
      Map items to categories (WARP, CKU, EMB, ELASTIC, etc) if possible.
      Text: "${rawText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customer: {
              type: Type.OBJECT,
              properties: {
                customerName: { type: Type.STRING },
                customerContactNo: { type: Type.STRING },
                billingAddress: { type: Type.STRING },
                branch: { type: Type.STRING },
              }
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "WARP, CKU, EMB, etc." },
                  itemName: { type: Type.STRING },
                  manualItemName: { type: Type.STRING },
                  color: { type: Type.STRING },
                  width: { type: Type.STRING },
                  rate: { type: Type.NUMBER },
                  quantity: { type: Type.STRING, description: "Numeric amount" },
                  uom: { type: Type.STRING, description: "Kg, Mtr, Pcs, etc." },
                  remark: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      
      // Map the AI response to our application types
      const customerData: Partial<OrderFormData> = {
        customerName: parsed.customer?.customerName || "",
        customerContactNo: parsed.customer?.customerContactNo || "",
        billingAddress: parsed.customer?.billingAddress || "",
        branch: parsed.customer?.branch || "",
      };

      const items: Partial<OrderLineItem>[] = Array.isArray(parsed.items) 
        ? parsed.items.map((item: any) => ({
            category: item.category || "",
            itemName: item.itemName || "",
            manualItemName: item.manualItemName || "",
            color: item.color || "",
            width: item.width || "",
            rate: item.rate,
            quantity: item.quantity,
            uom: item.uom,
            remark: item.remark
          }))
        : [];

      return { customerData, items };
    }
    
    return {};

  } catch (error) {
    console.error("Gemini parsing error:", error);
    throw new Error("Failed to parse text with AI.");
  }
};
