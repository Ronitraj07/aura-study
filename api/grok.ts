// ============================================================
// Grok AI Service Adapter
// Handles xAI Grok API calls for creative content generation
// ============================================================

declare const process: {
  env: Record<string, string | undefined>;
};

const GROK_URL = 'https://api.x.ai/v1/chat/completions';

export interface GrokConfig {
  model: 'grok-2-1212' | 'grok-2-vision-1212' | 'grok-beta';
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GrokResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callGrok(
  messages: AIMessage[], 
  config: GrokConfig = { model: 'grok-2-1212' }
): Promise<GrokResponse> {
  try {
    const response = await fetch(GROK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.8,
        max_tokens: config.max_tokens ?? 4000,
        stream: config.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Grok API error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No content in Grok response'
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
      error: `Grok request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper functions for different creative scenarios
export const grokCreative = (messages: AIMessage[]) => 
  callGrok(messages, { model: 'grok-2-1212', temperature: 0.9, max_tokens: 4000 });

export const grokPresentations = (messages: AIMessage[]) => 
  callGrok(messages, { model: 'grok-2-1212', temperature: 0.8, max_tokens: 4000 });

export const grokEngaging = (messages: AIMessage[]) => 
  callGrok(messages, { model: 'grok-2-1212', temperature: 0.85, max_tokens: 3000 });

export const grokVision = (messages: AIMessage[]) => 
  callGrok(messages, { model: 'grok-2-vision-1212', temperature: 0.7, max_tokens: 3000 });