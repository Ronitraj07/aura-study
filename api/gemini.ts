// ============================================================
// Gemini AI Service Adapter
// Handles Google Gemini API calls with different models
// ============================================================

declare const process: {
  env: Record<string, string | undefined>;
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiConfig {
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-flash-latest' | 'gemini-pro-latest';
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Convert OpenAI-style messages to Gemini format
function convertMessagesToGemini(messages: AIMessage[]): any {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const contents = userMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  return {
    contents,
    systemInstruction: systemMessage ? {
      parts: [{ text: systemMessage.content }]
    } : undefined
  };
}

export async function callGemini(
  messages: AIMessage[], 
  config: GeminiConfig = { model: 'gemini-2.5-flash' }
): Promise<GeminiResponse> {
  try {
    const url = `${GEMINI_BASE_URL}/${config.model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const geminiPayload = convertMessagesToGemini(messages);
    
    const requestBody = {
      ...geminiPayload,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxOutputTokens ?? 4000,
        topP: config.topP ?? 0.95,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Gemini API error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        error: `Gemini API error: ${data.error.message}`
      };
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return {
        success: false,
        error: 'No content in Gemini response'
      };
    }

    // Clean up Gemini response - handle markdown code blocks
    let cleanedContent = content.trim();
    
    // Remove markdown JSON code blocks if present
    if (cleanedContent.startsWith('```json') && cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    } else if (cleanedContent.startsWith('```') && cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    }

    // Validate that it's valid JSON
    try {
      JSON.parse(cleanedContent);
    } catch (parseError) {
      return {
        success: false,
        error: `Invalid JSON from Gemini: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
      };
    }

    return {
      success: true,
      content: cleanedContent,
      usage: data.usageMetadata
    };

  } catch (error) {
    return {
      success: false,
      error: `Gemini request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper functions for different Gemini models and use cases
export const geminiFast = (messages: AIMessage[]) => 
  callGemini(messages, { model: 'gemini-2.5-flash', temperature: 0.6, maxOutputTokens: 2000 });

export const geminiPro = (messages: AIMessage[]) => 
  callGemini(messages, { model: 'gemini-2.5-pro', temperature: 0.5, maxOutputTokens: 4000 });

export const geminiExam = (messages: AIMessage[]) => 
  callGemini(messages, { model: 'gemini-2.5-pro', temperature: 0.4, maxOutputTokens: 3000 });

export const geminiResearch = (messages: AIMessage[]) => 
  callGemini(messages, { model: 'gemini-2.5-flash', temperature: 0.3, maxOutputTokens: 2000 });