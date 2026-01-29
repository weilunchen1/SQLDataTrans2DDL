
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

export const analyzeDataWithGemini = async (rawInput: string): Promise<GeminiAnalysisResult | null> => {
  // 檢查 API Key 是否存在
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is not set. Skipping AI analysis.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this SQL result set fragment and provide a suggested table name, identify potential column data types, and any data cleanup suggestions.
      
      Input Data:
      ${rawInput.substring(0, 3000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTableName: { type: Type.STRING },
            dataCleanupSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            columnTypes: {
              type: Type.ARRAY,
              description: "List of columns and their suggested SQL types",
              items: {
                type: Type.OBJECT,
                properties: {
                  columnName: { type: Type.STRING },
                  sqlType: { type: Type.STRING }
                },
                required: ["columnName", "sqlType"]
              }
            }
          },
          required: ["suggestedTableName", "dataCleanupSuggestions", "columnTypes"]
        }
      }
    });

    const responseText = response.text;
    if (responseText) {
      return JSON.parse(responseText.trim());
    }
    return null;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return null;
  }
};
