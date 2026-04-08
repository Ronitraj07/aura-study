// Quick test to list available Gemini models
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ 
        error: `Gemini API error ${response.status}: ${error}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const models = data.models?.map((model: any) => ({
      name: model.name,
      displayName: model.displayName,
      supportedMethods: model.supportedGenerationMethods
    })) || [];

    return new Response(JSON.stringify({ 
      models,
      count: models.length,
      generateContentModels: models.filter((m: any) => 
        m.supportedMethods?.includes('generateContent')
      )
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: `Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}