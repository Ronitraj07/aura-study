// ============================================================
// Subtopic Suggestions API — AI-powered subtopic generation
// Provides intelligent subtopic suggestions based on main topic
// ============================================================

import { VercelRequest, VercelResponse } from '@vercel/node';

interface SubtopicSuggestion {
  subtopic: string;
  relevance: 'high' | 'medium' | 'low';
  category: 'conceptual' | 'factual' | 'procedural' | 'contextual';
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, exclude = [] } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return res.status(400).json({ error: 'Valid topic is required' });
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

    // Try Groq API first
    try {
      const groqResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // Fast model for suggestions
          messages: [
            { role: 'system', content: 'You are an educational content specialist. Provide precise, academic subtopic suggestions in JSON format only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const content = groqData.choices[0]?.message?.content;
        
        if (content) {
          // Clean and parse JSON response
          const cleanContent = content.replace(/```json\s?|\s?```/g, '').trim();
          const suggestions = JSON.parse(cleanContent) as SubtopicSuggestion[];
          
          // Validate response format
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            const validSuggestions = suggestions.filter(s => 
              s.subtopic && 
              s.relevance && 
              s.category &&
              ['high', 'medium', 'low'].includes(s.relevance) &&
              ['conceptual', 'factual', 'procedural', 'contextual'].includes(s.category)
            );

            if (validSuggestions.length > 0) {
              return res.status(200).json({ suggestions: validSuggestions });
            }
          }
        }
      }
    } catch (groqError) {
      console.warn('Groq API failed:', groqError);
    }

    // Fallback: Generate domain-based suggestions
    const fallbackSuggestions = generateFallbackSuggestions(topic, exclude);
    return res.status(200).json({ suggestions: fallbackSuggestions });

  } catch (error) {
    console.error('Subtopic suggestions error:', error);
    
    // Emergency fallback
    const emergencyFallback = [
      { subtopic: "Key Concepts", relevance: "high" as const, category: "conceptual" as const },
      { subtopic: "Applications", relevance: "medium" as const, category: "procedural" as const },
      { subtopic: "Examples", relevance: "medium" as const, category: "factual" as const }
    ];

    return res.status(200).json({ suggestions: emergencyFallback });
  }
}

function generateFallbackSuggestions(topic: string, exclude: string[] = []): SubtopicSuggestion[] {
  const topicLower = topic.toLowerCase();
  
  let domainSuggestions: SubtopicSuggestion[] = [];

  // Science/Biology
  if (topicLower.includes('biology') || topicLower.includes('anatomy') || topicLower.includes('cell') || topicLower.includes('genetics')) {
    domainSuggestions = [
      { subtopic: "Structure Function", relevance: "high", category: "conceptual" },
      { subtopic: "Evolution", relevance: "high", category: "contextual" },
      { subtopic: "Molecular Basis", relevance: "medium", category: "factual" },
      { subtopic: "Physiological Role", relevance: "medium", category: "procedural" },
      { subtopic: "Clinical Relevance", relevance: "low", category: "contextual" }
    ];
  }
  // Chemistry
  else if (topicLower.includes('chemistry') || topicLower.includes('chemical') || topicLower.includes('molecule') || topicLower.includes('reaction')) {
    domainSuggestions = [
      { subtopic: "Reaction Mechanisms", relevance: "high", category: "procedural" },
      { subtopic: "Molecular Properties", relevance: "high", category: "factual" },
      { subtopic: "Industrial Applications", relevance: "medium", category: "contextual" },
      { subtopic: "Thermodynamics", relevance: "medium", category: "conceptual" },
      { subtopic: "Safety Considerations", relevance: "low", category: "procedural" }
    ];
  }
  // Physics
  else if (topicLower.includes('physics') || topicLower.includes('mechanics') || topicLower.includes('energy') || topicLower.includes('quantum')) {
    domainSuggestions = [
      { subtopic: "Fundamental Principles", relevance: "high", category: "conceptual" },
      { subtopic: "Mathematical Formulation", relevance: "high", category: "procedural" },
      { subtopic: "Experimental Evidence", relevance: "medium", category: "factual" },
      { subtopic: "Real World Applications", relevance: "medium", category: "contextual" },
      { subtopic: "Historical Development", relevance: "low", category: "contextual" }
    ];
  }
  // Mathematics
  else if (topicLower.includes('math') || topicLower.includes('calculus') || topicLower.includes('algebra') || topicLower.includes('theorem')) {
    domainSuggestions = [
      { subtopic: "Core Definitions", relevance: "high", category: "conceptual" },
      { subtopic: "Key Theorems", relevance: "high", category: "factual" },
      { subtopic: "Solution Methods", relevance: "medium", category: "procedural" },
      { subtopic: "Practical Examples", relevance: "medium", category: "contextual" },
      { subtopic: "Proof Techniques", relevance: "low", category: "procedural" }
    ];
  }
  // History
  else if (topicLower.includes('history') || topicLower.includes('war') || topicLower.includes('civilization') || topicLower.includes('empire')) {
    domainSuggestions = [
      { subtopic: "Key Events", relevance: "high", category: "factual" },
      { subtopic: "Important Figures", relevance: "high", category: "factual" },
      { subtopic: "Causes Consequences", relevance: "medium", category: "conceptual" },
      { subtopic: "Cultural Impact", relevance: "medium", category: "contextual" },
      { subtopic: "Modern Relevance", relevance: "low", category: "contextual" }
    ];
  }
  // Literature
  else if (topicLower.includes('literature') || topicLower.includes('novel') || topicLower.includes('poetry') || topicLower.includes('author')) {
    domainSuggestions = [
      { subtopic: "Central Themes", relevance: "high", category: "conceptual" },
      { subtopic: "Character Analysis", relevance: "high", category: "factual" },
      { subtopic: "Literary Techniques", relevance: "medium", category: "procedural" },
      { subtopic: "Historical Context", relevance: "medium", category: "contextual" },
      { subtopic: "Critical Interpretations", relevance: "low", category: "contextual" }
    ];
  }
  // Computer Science/Technology
  else if (topicLower.includes('computer') || topicLower.includes('algorithm') || topicLower.includes('programming') || topicLower.includes('software')) {
    domainSuggestions = [
      { subtopic: "Core Algorithms", relevance: "high", category: "procedural" },
      { subtopic: "Data Structures", relevance: "high", category: "conceptual" },
      { subtopic: "Implementation Details", relevance: "medium", category: "procedural" },
      { subtopic: "Performance Analysis", relevance: "medium", category: "factual" },
      { subtopic: "Real World Usage", relevance: "low", category: "contextual" }
    ];
  }
  // Default/General
  else {
    domainSuggestions = [
      { subtopic: "Key Concepts", relevance: "high", category: "conceptual" },
      { subtopic: "Historical Context", relevance: "medium", category: "contextual" },
      { subtopic: "Practical Applications", relevance: "medium", category: "procedural" },
      { subtopic: "Current Examples", relevance: "medium", category: "factual" },
      { subtopic: "Future Implications", relevance: "low", category: "contextual" }
    ];
  }

  // Filter out excluded subtopics
  return domainSuggestions.filter(suggestion => 
    !exclude.some(excluded => 
      excluded.toLowerCase() === suggestion.subtopic.toLowerCase()
    )
  );
}