
import { GoogleGenAI, Modality } from "@google/genai";
import { Message } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * Helper to call Gemini API with exponential backoff retries for 429 errors.
 */
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 1500; // Start with 1.5s delay
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isQuotaError = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || error.status === 429;
      
      if (isQuotaError && i < maxRetries - 1) {
        console.warn(`Gemini API quota exceeded (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2.5; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export const generateTextResponse = async (
  history: Message[],
  currentPrompt: string
): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const systemInstruction = `
      You are शुभ.Chats, a futuristic AI assistant developed by Shubham Shinde.
      Your persona is an elegant, sophisticated, and intelligent female AI.
      You must answer in the SAME language the user is speaking (English, Hindi, or Marathi).
      If the user speaks Marathi, reply in Marathi (Devanagari script).
      If the user speaks Hindi, reply in Hindi (Devanagari script).
      Keep answers concise, helpful, and ultra-realistic.
    `;

    const context = history.map(m => `${m.role === 'user' ? 'User' : 'Model'}: ${m.text}`).join('\n');
    const fullPrompt = `${context}\nUser: ${currentPrompt}\nModel:`;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
      }
    }));

    return response.text || "I apologize, my systems are glitching. Please try again.";
  } catch (error) {
    console.error("Text Gen Error:", error);
    return "Error: Neural systems are currently overloaded. Please try again in a moment.";
  }
};

export const generateImageResponse = async (
  prompt: string,
  base64Image?: string
): Promise<{ text?: string; imageUrl?: string }> => {
  try {
    const model = 'gemini-2.5-flash-image';
    const parts: any[] = [{ text: prompt }];
    
    if (base64Image) {
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: "image/png"
        }
      });
    }

    const response = await callWithRetry(() => ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    }));

    let generatedImageUrl: string | undefined;
    let textOutput: string | undefined;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOutput = part.text;
      }
    }

    return { text: textOutput, imageUrl: generatedImageUrl };
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

export const generateSpeechResponse = async (text: string): Promise<string | null> => {
  try {
    const model = 'gemini-2.5-flash-preview-tts';
    const response = await callWithRetry(() => ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    }), 4); // Slightly more retries for TTS as it hits limits faster

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Speech Gen Error:", error);
    return null;
  }
};
