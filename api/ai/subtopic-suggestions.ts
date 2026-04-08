// ============================================================
// Subtopic Suggestions API — AI-powered subtopic generation
// Provides intelligent subtopic suggestions based on main topic
// ============================================================

export const config = { runtime: 'edge' };

declare const process: { env: Record<string, string | undefined> };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.VERCEL_ENV === 'production'
    ? 'https://studyai-ronitraj.vercel.app'
    : 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface SubtopicSuggestion {
  subtopic: string;
  relevance: 'high' | 'medium' | 'low';
  category: 'conceptual' | 'factual' | 'procedural' | 'contextual';
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { topic?: string; exclude?: string[] };
  try {
    body = await req.json() as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { topic, exclude = [] } = body;

  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    return new Response(JSON.stringify({ error: 'Valid topic is required' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const prompt = `Generate intelligent subtopic suggestions for the following academic topic: "${topic}"

Requirements:
1. Provide 6-8 specific, focused subtopics
2. Each subtopic should be 2-4 words long
3. Avoid generic terms like "Introduction", "Overview", "Conclusion"
4. Include diverse perspectives: theoretical, practical, historical, analytical
5. Exclude these existing subtopics: ${exclude.join(', ')}

For each subtopic, classify the relevance (high/medium/low) and category:
- conceptual: Core ideas and theories
- factual: Specific facts and data
- procedural: Methods and processes
- contextual: Background and applications

Return ONLY a JSON array in this exact format:
[
  {
    "subtopic": "Example Subtopic",
    "relevance": "high",
    "category": "conceptual"
  }
]

Topic: ${topic}`;

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are an educational content specialist. Provide precise, academic subtopic suggestions in JSON format only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (groqResponse.ok) {
      const groqData = await groqResponse.json() as { choices: { message: { content: string } }[] };
      const content = groqData.choices[0]?.message?.content;

      if (content) {
        const cleanContent = content.replace(/```json\s?|\s?```/g, '').trim();
        const suggestions = JSON.parse(cleanContent) as SubtopicSuggestion[];

        if (Array.isArray(suggestions) && suggestions.length > 0) {
          const validSuggestions = suggestions.filter(s =>
            s.subtopic &&
            s.relevance &&
            s.category &&
            ['high', 'medium', 'low'].includes(s.relevance) &&
            ['conceptual', 'factual', 'procedural', 'contextual'].includes(s.category)
          );

          if (validSuggestions.length > 0) {
            return new Response(JSON.stringify({ suggestions: validSuggestions }), {
              status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }
  } catch (groqError) {
    console.warn('Groq API failed:', groqError);
  }

  // Fallback: domain-based suggestions
  const fallbackSuggestions = generateFallbackSuggestions(topic, exclude);
  return new Response(JSON.stringify({ suggestions: fallbackSuggestions }), {
    status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function generateFallbackSuggestions(topic: string, exclude: string[] = []): SubtopicSuggestion[] {
  const topicLower = topic.toLowerCase();
  let domainSuggestions: SubtopicSuggestion[] = [];

  if (topicLower.includes('biology') || topicLower.includes('anatomy') || topicLower.includes('cell') || topicLower.includes('genetics')) {
    domainSuggestions = [
      { subtopic: 'Structure Function', relevance: 'high', category: 'conceptual' },
      { subtopic: 'Evolution', relevance: 'high', category: 'contextual' },
      { subtopic: 'Molecular Basis', relevance: 'medium', category: 'factual' },
      { subtopic: 'Physiological Role', relevance: 'medium', category: 'procedural' },
      { subtopic: 'Clinical Relevance', relevance: 'low', category: 'contextual' },
    ];
  } else if (topicLower.includes('chemistry') || topicLower.includes('chemical') || topicLower.includes('molecule') || topicLower.includes('reaction')) {
    domainSuggestions = [
      { subtopic: 'Reaction Mechanisms', relevance: 'high', category: 'procedural' },
      { subtopic: 'Molecular Properties', relevance: 'high', category: 'factual' },
      { subtopic: 'Industrial Applications', relevance: 'medium', category: 'contextual' },
      { subtopic: 'Thermodynamics', relevance: 'medium', category: 'conceptual' },
      { subtopic: 'Safety Considerations', relevance: 'low', category: 'procedural' },
    ];
  } else if (topicLower.includes('physics') || topicLower.includes('mechanics') || topicLower.includes('energy') || topicLower.includes('quantum')) {
    domainSuggestions = [
      { subtopic: 'Fundamental Principles', relevance: 'high', category: 'conceptual' },
      { subtopic: 'Mathematical Formulation', relevance: 'high', category: 'procedural' },
      { subtopic: 'Experimental Evidence', relevance: 'medium', category: 'factual' },
      { subtopic: 'Real World Applications', relevance: 'medium', category: 'contextual' },
      { subtopic: 'Historical Development', relevance: 'low', category: 'contextual' },
    ];
  } else if (topicLower.includes('math') || topicLower.includes('calculus') || topicLower.includes('algebra') || topicLower.includes('theorem')) {
    domainSuggestions = [
      { subtopic: 'Core Definitions', relevance: 'high', category: 'conceptual' },
      { subtopic: 'Key Theorems', relevance: 'high', category: 'factual' },
      { subtopic: 'Solution Methods', relevance: 'medium', category: 'procedural' },
      { subtopic: 'Practical Examples', relevance: 'medium', category: 'contextual' },
      { subtopic: 'Proof Techniques', relevance: 'low', category: 'procedural' },
    ];
  } else if (topicLower.includes('history') || topicLower.includes('war') || topicLower.includes('civilization') || topicLower.includes('empire')) {
    domainSuggestions = [
      { subtopic: 'Key Events', relevance: 'high', category: 'factual' },
      { subtopic: 'Important Figures', relevance: 'high', category: 'factual' },
      { subtopic: 'Causes Consequences', relevance: 'medium', category: 'conceptual' },
      { subtopic: 'Cultural Impact', relevance: 'medium', category: 'contextual' },
      { subtopic: 'Modern Relevance', relevance: 'low', category: 'contextual' },
    ];
  } else if (topicLower.includes('computer') || topicLower.includes('algorithm') || topicLower.includes('programming') || topicLower.includes('software')) {
    domainSuggestions = [
      { subtopic: 'Core Algorithms', relevance: 'high', category: 'procedural' },
      { subtopic: 'Data Structures', relevance: 'high', category: 'conceptual' },
      { subtopic: 'Implementation Details', relevance: 'medium', category: 'procedural' },
      { subtopic: 'Performance Analysis', relevance: 'medium', category: 'factual' },
      { subtopic: 'Real World Usage', relevance: 'low', category: 'contextual' },
    ];
  } else {
    domainSuggestions = [
      { subtopic: 'Key Concepts', relevance: 'high', category: 'conceptual' },
      { subtopic: 'Historical Context', relevance: 'medium', category: 'contextual' },
      { subtopic: 'Practical Applications', relevance: 'medium', category: 'procedural' },
      { subtopic: 'Current Examples', relevance: 'medium', category: 'factual' },
      { subtopic: 'Future Implications', relevance: 'low', category: 'contextual' },
    ];
  }

  return domainSuggestions.filter(suggestion =>
    !exclude.some(excluded => excluded.toLowerCase() === suggestion.subtopic.toLowerCase())
  );
}
