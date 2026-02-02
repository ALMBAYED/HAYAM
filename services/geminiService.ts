
import { GoogleGenAI, Type } from "@google/genai";
import { UserResponse, ManifestationResult, Language } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateManifestation(responses: UserResponse[], lang: Language): Promise<ManifestationResult> {
    const context = responses.map(r => {
      let text = `Q${r.questionId} (${r.timeTakenMs}ms): ${r.answer}`;
      if (r.elaboration) text += ` (Bawh/Free Expression: "${r.elaboration}")`;
      return text;
    }).join('\n');
    
    const langInstructions = lang === 'ar' 
      ? "IMPORTANT: You MUST write the 'description' and 'report' fields in ARABIC language." 
      : "IMPORTANT: You MUST write the 'description' and 'report' fields in ENGLISH language.";

    const analysisResponse = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are HAYAM, a radical and unfiltered Psychoanalyst specializing in Shadow Work and existential depth. Analyze these responses to mirror the user's true essence back to them:
      ${context}
      
      ANALYSIS PROTOCOL (RADICAL HONESTY):
      1. The Mirror of Truth: Do not be polite. The user demands absolute honesty. If the data suggests negative traits (e.g., narcissism, deep-seated fear, emotional manipulation, self-sabotage, or stagnation), you MUST articulate them clearly. 
      2. The Weight of Silence: Analyze the time taken. Long delays on simple questions suggest a fear of the truth or a carefully constructed mask. Call this out.
      3. Shadow Integration: Identify the "Shadow"—the parts of themselves they try to hide. How does this shadow manifest in their daily life?
      4. Integrity Pivot (Q21): This is the final verdict. 
         - If they admit to being dishonest, analyze the "Honesty of the Liar"—a rare trait where the person is aware of their performance. 
         - If they claim total honesty, look for cracks where their answers contradict this "perfect" self-image.
      5. Personal Resonance: Speak directly to the person. Use "You" (أنت). Make the analysis feel like an intimate, intense session where no mask is allowed.
      6. Depth & Length: Provide a comprehensive, long-form report (minimum 4-5 paragraphs) that peels back layers of personality.

      ${langInstructions}

      Your task:
      1. Quantitative Analysis: Calculate a precise "White (Yang)" vs "Black (Yin)" percentage based on their drive vs. their withdrawal.
      2. Soul Blueprint: Generate a profound, multi-layered report that challenges and reveals.
      
      Output JSON with:
      - description: A short, piercing 2-sentence summary of their core duality.
      - report: The comprehensive, unfiltered Soul Blueprint analysis.
      - yinYangBalance: Integer (0-100) where 100 is pure Yang (Active/Light).
      - stability, creativity, depth: Scores (0-100).
      - visualPrompt: A detailed abstract prompt for a visual manifestation (charcoal/white palette).`,
      config: {
        thinkingConfig: { thinkingBudget: 32000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            report: { type: Type.STRING },
            yinYangBalance: { type: Type.NUMBER },
            stability: { type: Type.NUMBER },
            creativity: { type: Type.NUMBER },
            depth: { type: Type.NUMBER },
            visualPrompt: { type: Type.STRING },
          },
          required: ["description", "report", "yinYangBalance", "stability", "creativity", "depth", "visualPrompt"]
        }
      }
    });

    const analysis = JSON.parse(analysisResponse.text || '{}');

    const imageResult = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Abstract conceptual art of soul's duality. Style: Minimalist, cinematic. Theme: ${analysis.visualPrompt}. Palette: Deep charcoal, obsidian black, and ethereal white.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    let imageUrl = '';
    if (imageResult.candidates?.[0]?.content?.parts) {
      for (const part of imageResult.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    return {
      imageUrl,
      description: analysis.description,
      report: analysis.report,
      yinYangBalance: analysis.yinYangBalance,
      balanceScore: {
        stability: analysis.stability,
        creativity: analysis.creativity,
        depth: analysis.depth
      }
    };
  }
}

export const geminiService = new GeminiService();
