// ============================================================
// Groq AI Service Adapter
// Handles Groq API calls with different models
// ============================================================

declare const process: {
  env: Record<string, string | undefined>;
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqConfig {
  model: 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant' | 'llama3-8b-8192';
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callGroq(
  messages: AIMessage[], 
  config: GroqConfig = { model: 'llama-3.3-70b-versatile' }
): Promise<GroqResponse> {
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.max_tokens ?? 4000,
        stream: config.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Groq API error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No content in Groq response'
      };
    }

    return {
      success: true,
      content,
      usage: data.usage
    };

  } catch (error) {
    return {
      success: false,
      error: `Groq request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper functions for different Groq models
export const groqTechnical = (messages: AIMessage[]) => 
  callGroq(messages, { model: 'llama-3.3-70b-versatile', temperature: 0.4, max_tokens: 4000 });

export const groqCreative = (messages: AIMessage[]) => 
  callGroq(messages, { model: 'llama-3.3-70b-versatile', temperature: 0.8, max_tokens: 4000 });

export const groqFast = (messages: AIMessage[]) => 
  callGroq(messages, { model: 'llama-3.1-8b-instant', temperature: 0.6, max_tokens: 2000 });

export const groqFallback = (messages: AIMessage[]) => 
  callGroq(messages, { model: 'llama3-8b-8192', temperature: 0.7, max_tokens: 2000 });